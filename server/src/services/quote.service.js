const DiscountCode = require("../models/DiscountCode");
const Bundle = require("../models/Bundle");
const Offer = require("../models/Offer");
const Product = require("../models/Product");
const SiteSettings = require("../models/SiteSettings");
const {
  normalizeGovernorateSlug,
  getDefaultDeliveryFeeForSlug,
} = require("../utils/egyptGovernorates");

const {
  calculateDiscountAmount,
  validateDiscountCodeRules,
} = require("../controllers/discountCode.controller");

const withSession = (query, session) => {
  return session ? query.session(session) : query;
};

const normalizeText = (value = "") => {
  return String(value || "").trim();
};

const normalizeStringArray = (values = []) => {
  if (!Array.isArray(values)) return [];

  return values.map((value) => normalizeText(value)).filter(Boolean);
};

const normalizeLower = (value = "") => {
  return normalizeText(value).toLowerCase();
};

const normalizeDeliveryZone = (value = "") => {
  return normalizeGovernorateSlug(value);
};

const toIdString = (value) => {
  if (!value) return "";
  return value._id ? value._id.toString() : value.toString();
};

const createQuoteError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getActiveRuleQuery = () => {
  const now = new Date();

  return {
    status: "active",
    $and: [
      {
        $or: [{ startsAt: null }, { startsAt: { $lte: now } }],
      },
      {
        $or: [{ endsAt: null }, { endsAt: { $gte: now } }],
      },
    ],
  };
};

const isWithinUsageLimit = (rule) => {
  if (!Number(rule.usageLimit || 0)) return true;
  return Number(rule.usedCount || 0) < Number(rule.usageLimit || 0);
};

const findSelectedColor = (product, cartItem) => {
  const colorId = normalizeText(cartItem.color?.id || cartItem.colorId);
  const colorKey = normalizeLower(cartItem.color?.key);
  const colorSlug = normalizeLower(cartItem.color?.slug || cartItem.colorSlug);
  const colorName = normalizeLower(cartItem.color?.name || cartItem.color);

  return product.colors.find((color) => {
    const currentId = color._id?.toString();
    const currentSlug = normalizeLower(color.slug);
    const currentName = normalizeLower(color.name);

    return (
      (colorId && currentId === colorId) ||
      (colorKey &&
        (currentId === colorKey ||
          currentSlug === colorKey ||
          currentName === colorKey)) ||
      (colorSlug && currentSlug === colorSlug) ||
      (colorName && currentName === colorName)
    );
  });
};

const findSelectedSize = (color, cartItem) => {
  const sizeId = normalizeText(cartItem.size?.id || cartItem.sizeId);
  const sizeLabel = normalizeLower(cartItem.size?.label || cartItem.size);

  return color.sizes.find((size) => {
    const currentId = size._id?.toString();
    const currentLabel = normalizeLower(size.label);

    return (
      (sizeId && currentId === sizeId) ||
      (sizeLabel && currentLabel === sizeLabel)
    );
  });
};

const getColorPrimaryImageSnapshot = (color) => {
  const images = Array.isArray(color.images) ? color.images : [];

  const primaryImage =
    images.find((image) => image.role === "primary" && image.url) ||
    images.find((image) => image.url);

  return {
    url: primaryImage?.url || "",
    alt: primaryImage?.alt || "",
    translations: {
      ar: {
        alt: primaryImage?.translations?.ar?.alt || "",
      },
    },
  };
};

const buildOrderItemTranslations = ({ product, selectedColor, image }) => {
  return {
    ar: {
      name: product.translations?.ar?.name || "",
      colorName: selectedColor.translations?.ar?.name || "",
      imageAlt: image.translations?.ar?.alt || "",
      shortDescription: product.translations?.ar?.shortDescription || "",
      badges: normalizeStringArray(product.translations?.ar?.badges),
    },
  };
};

const buildTitleDescriptionTranslations = (source) => {
  return {
    ar: {
      title: source.translations?.ar?.title || "",
      description: source.translations?.ar?.description || "",
    },
  };
};

const buildDeliveryTranslations = (settings) => {
  return {
    ar: {
      notes: settings.translations?.ar?.delivery?.notes || "",
    },
  };
};

const buildValidatedOrderItems = async ({
  cartItems,
  session = null,
  deductStock = false,
}) => {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw createQuoteError("Cart is empty.");
  }

  const orderItems = [];
  let subtotal = 0;
  let productSavings = 0;
  let cartQuantity = 0;

  for (const cartItem of cartItems) {
    const productId = cartItem.productId || cartItem.product;

    if (!productId) {
      throw createQuoteError("A cart item is missing product ID.");
    }

    const quantity = Math.max(1, Number(cartItem.quantity || 1));

    const productQuery = Product.findById(productId).populate(
      "category",
      "name slug"
    );

    const product = await withSession(productQuery, session);

    if (!product || product.status !== "active") {
      throw createQuoteError(
        "One of the selected products is no longer available."
      );
    }

    const selectedColor = findSelectedColor(product, cartItem);

    if (!selectedColor || selectedColor.isActive === false) {
      throw createQuoteError(`${product.name}: selected color is unavailable.`);
    }

    const selectedSize = findSelectedSize(selectedColor, cartItem);

    if (!selectedSize || selectedSize.isActive === false) {
      throw createQuoteError(`${product.name}: selected size is unavailable.`);
    }

    const stock = Number(selectedSize.stock || 0);

    if (stock < quantity) {
      throw createQuoteError(
        `${product.name} - ${selectedColor.name} / ${selectedSize.label}: only ${stock} left in stock.`
      );
    }

    if (deductStock) {
      selectedSize.stock = stock - quantity;
      await product.save({ session });
    }

    const unitPrice = Number(product.price || 0);
    const compareAtPrice =
      Number(product.compareAtPrice || 0) > unitPrice
        ? Number(product.compareAtPrice || 0)
        : unitPrice;

    const lineSubtotal = unitPrice * quantity;
    const lineSavings = Math.max(compareAtPrice - unitPrice, 0) * quantity;

    subtotal += lineSubtotal;
    productSavings += lineSavings;
    cartQuantity += quantity;

    const image = getColorPrimaryImageSnapshot(selectedColor);

    orderItems.push({
      product: product._id,
      name: product.name,
      slug: product.slug,
      category: {
        id: product.category?._id,
        name: product.category?.name || "",
        slug: product.category?.slug || "",
      },
      color: {
        id: selectedColor._id?.toString() || "",
        key:
          selectedColor._id?.toString() ||
          selectedColor.slug ||
          selectedColor.name,
        name: selectedColor.name,
        slug: selectedColor.slug || "",
        hex: selectedColor.hex || "",
      },
      size: {
        id: selectedSize._id?.toString() || "",
        label: selectedSize.label,
        sku: selectedSize.sku || "",
      },
      image: image.url,
      imageAlt: image.alt,
      shortDescription: product.shortDescription || "",
      badges: normalizeStringArray(product.badges),
      translations: buildOrderItemTranslations({
        product,
        selectedColor,
        image,
      }),
      quantity,
      unitPrice,
      compareAtPrice,
      lineSubtotal,
      lineSavings,
    });
  }

  return {
    orderItems,
    subtotal,
    productSavings,
    cartQuantity,
  };
};

const getEligibleItemsForOffer = (offer, orderItems) => {
  if (offer.scope === "all") return orderItems;

  if (offer.scope === "categories") {
    const categoryIds = new Set((offer.categories || []).map(toIdString));

    return orderItems.filter((item) => {
      const categoryId = toIdString(item.category?.id);
      return categoryId && categoryIds.has(categoryId);
    });
  }

  if (offer.scope === "products") {
    const productIds = new Set((offer.products || []).map(toIdString));

    return orderItems.filter((item) => {
      const productId = toIdString(item.product);
      return productId && productIds.has(productId);
    });
  }

  return [];
};

const calculateOfferDiscount = (offer, eligibleSubtotal) => {
  if (offer.discountType === "freeDelivery") {
    return 0;
  }

  let discountAmount = 0;

  if (offer.discountType === "percentage") {
    discountAmount =
      eligibleSubtotal * (Number(offer.discountValue || 0) / 100);
  }

  if (offer.discountType === "fixed") {
    discountAmount = Number(offer.discountValue || 0);
  }

  if (Number(offer.maxDiscountAmount || 0) > 0) {
    discountAmount = Math.min(
      discountAmount,
      Number(offer.maxDiscountAmount || 0)
    );
  }

  discountAmount = Math.min(discountAmount, eligibleSubtotal);

  return Math.round(discountAmount);
};

const calculateAutomaticOffers = async ({
  orderItems,
  subtotal,
  cartQuantity,
  session = null,
}) => {
  const offersQuery = Offer.find(getActiveRuleQuery())
    .populate("categories", "_id name slug")
    .populate("products", "_id name slug")
    .sort({ priority: -1, createdAt: -1 });

  const offers = await withSession(offersQuery, session);

  const appliedOffers = [];
  let offerDiscountTotal = 0;
  let freeDeliveryByOffer = false;

  for (const offer of offers) {
    if (!isWithinUsageLimit(offer)) continue;

    const eligibleItems = getEligibleItemsForOffer(offer, orderItems);
    const eligibleSubtotal = eligibleItems.reduce(
      (total, item) => total + Number(item.lineSubtotal || 0),
      0
    );
    const eligibleQuantity = eligibleItems.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    );

    if (eligibleItems.length === 0) continue;
    if (eligibleSubtotal <= 0) continue;
    if (eligibleSubtotal < Number(offer.minSubtotal || 0)) continue;
    if (eligibleQuantity < Number(offer.minQuantity || 0)) continue;

    const discountAmount = calculateOfferDiscount(offer, eligibleSubtotal);
    const freeDeliveryApplied = offer.discountType === "freeDelivery";

    if (discountAmount <= 0 && !freeDeliveryApplied) continue;

    appliedOffers.push({
      offer: offer._id,
      title: offer.title,
      description: offer.description || "",
      slug: offer.slug,
      translations: buildTitleDescriptionTranslations(offer),
      discountType: offer.discountType,
      discountValue: offer.discountValue,
      discountAmount,
      freeDeliveryApplied,
    });

    offerDiscountTotal += discountAmount;

    if (freeDeliveryApplied) {
      freeDeliveryByOffer = true;
    }

    if (!offer.stackable) {
      break;
    }
  }

  offerDiscountTotal = Math.min(offerDiscountTotal, subtotal);

  return {
    appliedOffers,
    offerDiscountTotal,
    freeDeliveryByOffer,
  };
};

const getEligibleUnitPricesForBundle = (bundle, orderItems) => {
  let eligibleItems = [];

  if (bundle.bundleMode === "specificProducts") {
    const productIds = new Set((bundle.products || []).map(toIdString));

    eligibleItems = orderItems.filter((item) => {
      const productId = toIdString(item.product);
      return productId && productIds.has(productId);
    });
  }

  if (bundle.bundleMode === "anyProducts") {
    if (bundle.eligibleScope === "all") {
      eligibleItems = orderItems;
    }

    if (bundle.eligibleScope === "categories") {
      const categoryIds = new Set((bundle.categories || []).map(toIdString));

      eligibleItems = orderItems.filter((item) => {
        const categoryId = toIdString(item.category?.id);
        return categoryId && categoryIds.has(categoryId);
      });
    }

    if (bundle.eligibleScope === "products") {
      const productIds = new Set((bundle.products || []).map(toIdString));

      eligibleItems = orderItems.filter((item) => {
        const productId = toIdString(item.product);
        return productId && productIds.has(productId);
      });
    }
  }

  const unitPrices = [];

  eligibleItems.forEach((item) => {
    for (let index = 0; index < Number(item.quantity || 0); index += 1) {
      unitPrices.push(Number(item.unitPrice || 0));
    }
  });

  return unitPrices.sort((a, b) => b - a);
};

const calculateBundleDiscount = (bundle, groupSubtotal) => {
  if (bundle.pricingType === "fixedBundlePrice") {
    return Math.max(groupSubtotal - Number(bundle.bundlePrice || 0), 0);
  }

  if (bundle.pricingType === "percentageOff") {
    let discountAmount =
      groupSubtotal * (Number(bundle.discountValue || 0) / 100);

    if (Number(bundle.maxDiscountAmount || 0) > 0) {
      discountAmount = Math.min(
        discountAmount,
        Number(bundle.maxDiscountAmount || 0)
      );
    }

    return Math.max(discountAmount, 0);
  }

  if (bundle.pricingType === "fixedDiscount") {
    let discountAmount = Number(bundle.discountValue || 0);

    if (Number(bundle.maxDiscountAmount || 0) > 0) {
      discountAmount = Math.min(
        discountAmount,
        Number(bundle.maxDiscountAmount || 0)
      );
    }

    return Math.max(discountAmount, 0);
  }

  return 0;
};

const calculateBundles = async ({ orderItems, subtotal, session = null }) => {
  const bundlesQuery = Bundle.find(getActiveRuleQuery())
    .populate("categories", "_id name slug")
    .populate("products", "_id name slug")
    .sort({ priority: -1, createdAt: -1 });

  const bundles = await withSession(bundlesQuery, session);

  const appliedBundles = [];
  let bundleDiscountTotal = 0;

  for (const bundle of bundles) {
    if (!isWithinUsageLimit(bundle)) continue;

    const requiredQuantity = Number(bundle.requiredQuantity || 2);
    const unitPrices = getEligibleUnitPricesForBundle(bundle, orderItems);

    if (unitPrices.length < requiredQuantity) continue;

    const possibleApplications = Math.floor(unitPrices.length / requiredQuantity);
    const applications = bundle.allowMultipleApplications
      ? possibleApplications
      : Math.min(possibleApplications, 1);

    if (applications <= 0) continue;

    let bundleDiscountAmount = 0;

    for (let appIndex = 0; appIndex < applications; appIndex += 1) {
      const startIndex = appIndex * requiredQuantity;
      const groupPrices = unitPrices.slice(
        startIndex,
        startIndex + requiredQuantity
      );
      const groupSubtotal = groupPrices.reduce((total, price) => total + price, 0);

      bundleDiscountAmount += calculateBundleDiscount(bundle, groupSubtotal);
    }

    bundleDiscountAmount = Math.round(bundleDiscountAmount);
    bundleDiscountAmount = Math.min(bundleDiscountAmount, subtotal);

    if (bundleDiscountAmount <= 0) continue;

    appliedBundles.push({
      bundle: bundle._id,
      title: bundle.title,
      description: bundle.description || "",
      slug: bundle.slug,
      translations: buildTitleDescriptionTranslations(bundle),
      bundleMode: bundle.bundleMode,
      pricingType: bundle.pricingType,
      requiredQuantity: bundle.requiredQuantity,
      applications,
      discountAmount: bundleDiscountAmount,
    });

    bundleDiscountTotal += bundleDiscountAmount;

    if (!bundle.stackable) {
      break;
    }
  }

  bundleDiscountTotal = Math.min(bundleDiscountTotal, subtotal);

  return {
    appliedBundles,
    bundleDiscountTotal,
  };
};

const buildDiscountSnapshot = (discountCode, discountAmount) => {
  if (!discountCode || discountAmount <= 0) {
    return {
      code: "",
      name: "",
      description: "",
      type: "",
      value: 0,
      discountAmount: 0,
    };
  }

  return {
    code: discountCode.code,
    name: discountCode.name || "",
    description: discountCode.description || "",
    type: discountCode.type,
    value: discountCode.value,
    discountAmount,
  };
};

const calculateDiscountCode = async ({
  rawCode,
  discountBase,
  session = null,
}) => {
  const code = normalizeText(rawCode).toUpperCase().replace(/\s+/g, "");

  if (!code) {
    return {
      discountTotal: 0,
      appliedDiscountCode: buildDiscountSnapshot(null, 0),
      discountDoc: null,
    };
  }

  const discountQuery = DiscountCode.findOne({ code });
  const discountDoc = await withSession(discountQuery, session);

  const validationError = validateDiscountCodeRules(discountDoc, discountBase);

  if (validationError) {
    throw createQuoteError(validationError);
  }

  const discountTotal = calculateDiscountAmount(discountDoc, discountBase);

  return {
    discountTotal,
    appliedDiscountCode: buildDiscountSnapshot(discountDoc, discountTotal),
    discountDoc,
  };
};

const calculateDelivery = ({
  settings,
  subtotal,
  freeDeliveryByOffer = false,
  deliveryZone = "",
}) => {
  const normalizedZone = normalizeDeliveryZone(deliveryZone);
  const zoneFees = settings.delivery?.zones || {};
  const zoneFee = normalizedZone ? zoneFees[normalizedZone] : undefined;
  const baseFee = Number(
    zoneFee ??
      (normalizedZone
        ? getDefaultDeliveryFeeForSlug(normalizedZone)
        : settings.delivery?.baseFee ?? 0)
  );
  const freeDeliveryThreshold = Number(
    settings.delivery?.freeDeliveryThreshold || 0
  );

  const freeDeliveryByThreshold =
    freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold;

  const freeDeliveryApplied = freeDeliveryByOffer || freeDeliveryByThreshold;

  return {
    deliveryFee: freeDeliveryApplied ? 0 : baseFee,
    freeDeliveryApplied,
    freeDeliveryByOffer,
    freeDeliveryByThreshold,
  };
};

const incrementAppliedUsage = async ({
  appliedOffers,
  appliedBundles,
  discountDoc,
  session = null,
}) => {
  for (const appliedOffer of appliedOffers) {
    const offerQuery = Offer.findById(appliedOffer.offer);
    const offer = await withSession(offerQuery, session);

    if (offer) {
      offer.usedCount = Number(offer.usedCount || 0) + 1;
      await offer.save({ session });
    }
  }

  for (const appliedBundle of appliedBundles) {
    const bundleQuery = Bundle.findById(appliedBundle.bundle);
    const bundle = await withSession(bundleQuery, session);

    if (bundle) {
      bundle.usedCount =
        Number(bundle.usedCount || 0) + Number(appliedBundle.applications || 1);
      await bundle.save({ session });
    }
  }

  if (discountDoc) {
    discountDoc.usedCount = Number(discountDoc.usedCount || 0) + 1;
    await discountDoc.save({ session });
  }
};

const calculateQuote = async ({
  cartItems,
  discountCode = "",
  deliveryZone = "",
  session = null,
  deductStock = false,
  incrementUsage = false,
}) => {
  const settings = await SiteSettings.getSingleton();

  const { orderItems, subtotal, productSavings, cartQuantity } =
    await buildValidatedOrderItems({
      cartItems,
      session,
      deductStock,
    });

  const { appliedBundles, bundleDiscountTotal } = await calculateBundles({
    orderItems,
    subtotal,
    session,
  });

  const subtotalAfterBundles = Math.max(subtotal - bundleDiscountTotal, 0);

  const { appliedOffers, offerDiscountTotal, freeDeliveryByOffer } =
    await calculateAutomaticOffers({
      orderItems,
      subtotal: subtotalAfterBundles,
      cartQuantity,
      session,
    });

  const discountBase = Math.max(
    subtotal - bundleDiscountTotal - offerDiscountTotal,
    0
  );

  const { discountTotal, appliedDiscountCode, discountDoc } =
    await calculateDiscountCode({
      rawCode: discountCode,
      discountBase,
      session,
    });

  const { deliveryFee, freeDeliveryApplied, freeDeliveryByThreshold } =
    calculateDelivery({
      settings,
      subtotal,
      freeDeliveryByOffer,
      deliveryZone,
    });

  const totalDiscount =
    Number(bundleDiscountTotal || 0) +
    Number(offerDiscountTotal || 0) +
    Number(discountTotal || 0);

  const total = Math.max(subtotal + deliveryFee - totalDiscount, 0);

  if (incrementUsage) {
    await incrementAppliedUsage({
      appliedOffers,
      appliedBundles,
      discountDoc,
      session,
    });
  }

  return {
    items: orderItems,
    cartQuantity,
    subtotal,
    productSavings,
    bundleDiscountTotal,
    offerDiscountTotal,
    discountTotal,
    totalDiscount,
    deliveryFee,
    total,
    appliedBundles,
    appliedOffers,
    appliedDiscountCode,
    deliverySnapshot: {
      notes: settings.delivery?.notes || "",
      freeDeliveryApplied,
      freeDeliveryByOffer,
      freeDeliveryByThreshold,
      translations: buildDeliveryTranslations(settings),
    },
  };
};

module.exports = {
  calculateQuote,
};
