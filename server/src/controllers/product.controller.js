const Product = require("../models/Product");
const Category = require("../models/Category");
const Offer = require("../models/Offer");
const asyncHandler = require("../utils/asyncHandler");
const generateSlug = require("../utils/generateSlug");

const createUniqueProductSlug = async (baseValue, excludedId = null) => {
  const baseSlug = generateSlug(baseValue || "product");
  let slug = baseSlug || "product";
  let counter = 2;

  while (true) {
    const query = { slug };

    if (excludedId) {
      query._id = { $ne: excludedId };
    }

    const existingProduct = await Product.findOne(query).select("_id");

    if (!existingProduct) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
};

const normalizeProductTranslations = (translations = {}) => {
  return {
    ar: {
      name: String(translations.ar?.name || "").trim(),
      shortDescription: String(
        translations.ar?.shortDescription || ""
      ).trim(),
      description: String(translations.ar?.description || "").trim(),
      fabric: String(translations.ar?.fabric || "").trim(),
      fit: String(translations.ar?.fit || "").trim(),
      care: String(translations.ar?.care || "").trim(),
      badges: Array.isArray(translations.ar?.badges)
        ? translations.ar.badges
            .map((badge) => String(badge || "").trim())
            .filter(Boolean)
        : [],
      seo: {
        title: String(translations.ar?.seo?.title || "").trim(),
        description: String(
          translations.ar?.seo?.description || ""
        ).trim(),
      },
    },
  };
};

const findExistingImage = (image, existingImages = []) => {
  return (
    existingImages.find(
      (existingImage) =>
        image?._id &&
        String(existingImage._id || "") === String(image._id)
    ) ||
    existingImages.find(
      (existingImage) =>
        image?.publicId &&
        existingImage.publicId &&
        existingImage.publicId === image.publicId
    ) ||
    existingImages.find(
      (existingImage) =>
        image?.url && existingImage.url === String(image.url).trim()
    )
  );
};

const normalizeImages = (images = [], existingImages = []) => {
  if (!Array.isArray(images)) return [];

  return images
    .filter((image) => image?.url)
    .map((image, index) => {
      const existingImage = findExistingImage(image, existingImages);
      const hasTranslations = image.translations !== undefined;

      return {
        url: String(image.url).trim(),
        publicId: image.publicId ? String(image.publicId).trim() : "",
        alt: image.alt ? String(image.alt).trim() : "",
        translations: hasTranslations
          ? {
              ar: {
                alt: String(image.translations?.ar?.alt || "").trim(),
              },
            }
          : {
              ar: {
                alt: String(
                  existingImage?.translations?.ar?.alt || ""
                ).trim(),
              },
            },
        role: ["primary", "hover", "gallery"].includes(image.role)
          ? image.role
          : index === 0
            ? "primary"
            : index === 1
              ? "hover"
              : "gallery",
        position: Number.isFinite(Number(image.position))
          ? Number(image.position)
          : index,
      };
    })
    .sort((a, b) => a.position - b.position);
};

const normalizeSizes = (sizes = []) => {
  if (!Array.isArray(sizes)) return [];

  const seen = new Set();

  return sizes
    .filter((size) => size?.label)
    .map((size) => ({
      label: String(size.label).trim().toUpperCase(),
      sku: size.sku ? String(size.sku).trim() : "",
      stock: Math.max(0, Number(size.stock || 0)),
      isActive: size.isActive !== false,
    }))
    .filter((size) => {
      const key = size.label.toLowerCase();

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
};

const findExistingColor = (color, existingColors = []) => {
  return (
    existingColors.find(
      (existingColor) =>
        color?._id &&
        String(existingColor._id || "") === String(color._id)
    ) ||
    existingColors.find(
      (existingColor) =>
        color?.slug &&
        existingColor.slug === generateSlug(String(color.slug))
    ) ||
    existingColors.find(
      (existingColor) =>
        color?.name &&
        existingColor.name.toLowerCase() ===
          String(color.name).trim().toLowerCase()
    )
  );
};

const normalizeColors = (colors = [], existingColors = []) => {
  if (!Array.isArray(colors)) return [];

  const seen = new Set();

  return colors
    .filter((color) => color?.name)
    .map((color) => {
      const name = String(color.name).trim();
      const existingColor = findExistingColor(color, existingColors);
      const hasTranslations = color.translations !== undefined;

      return {
        name,
        translations: hasTranslations
          ? {
              ar: {
                name: String(color.translations?.ar?.name || "").trim(),
              },
            }
          : {
              ar: {
                name: String(
                  existingColor?.translations?.ar?.name || ""
                ).trim(),
              },
            },
        slug: color.slug ? generateSlug(color.slug) : generateSlug(name),
        hex: color.hex ? String(color.hex).trim() : "",
        images: normalizeImages(color.images, existingColor?.images || []),
        sizes: normalizeSizes(color.sizes),
        isActive: color.isActive !== false,
      };
    })
    .filter((color) => {
      const key = color.name.toLowerCase();

      if (seen.has(key)) return false;
      if (!color.sizes.length) return false;

      seen.add(key);
      return true;
    });
};

const normalizeProductPayload = (body = {}, existingProduct = null) => {
  const payload = {
    name: body.name?.trim(),
    category: body.category,
    price: Number(body.price || 0),
    compareAtPrice: Number(body.compareAtPrice || 0),
    shortDescription: body.shortDescription?.trim() || "",
    description: body.description?.trim() || "",
    fabric: body.fabric?.trim() || "",
    fit: body.fit?.trim() || "",
    careInstructions:
      body.careInstructions?.trim() || body.care?.trim() || "",
    colors: normalizeColors(body.colors, existingProduct?.colors || []),
    badges: Array.isArray(body.badges)
      ? body.badges
          .filter(Boolean)
          .map((badge) => String(badge).trim())
          .filter(Boolean)
      : [],
    isFeatured: Boolean(body.isFeatured),
    status: ["draft", "active", "archived"].includes(body.status)
      ? body.status
      : "draft",
    seo: {
      title: body.seo?.title?.trim() || "",
      description: body.seo?.description?.trim() || "",
    },
  };

  if (body.translations !== undefined) {
    payload.translations = normalizeProductTranslations(body.translations);
  }

  return payload;
};

const ensureCategoryExists = async (categoryId) => {
  if (!categoryId) {
    return null;
  }

  const category = await Category.findById(categoryId);

  return category;
};

const parseColorFilter = (color = "") => {
  return String(color || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 20);
};

const escapeRegex = (value = "") => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const buildColorQuery = (color) => {
  const colorValues = parseColorFilter(color);

  if (!colorValues.length) return null;

  const slugValues = colorValues.map((value) => generateSlug(value));
  const nameMatchers = colorValues.map(
    (value) => new RegExp(`^${escapeRegex(value)}$`, "i")
  );

  return {
    colors: {
      $elemMatch: {
        isActive: true,
        $or: [
          {
            slug: {
              $in: slugValues,
            },
          },
          {
            name: {
              $in: nameMatchers,
            },
          },
        ],
      },
    },
  };
};

const buildStockQuery = () => ({
  colors: {
    $elemMatch: {
      isActive: true,
      sizes: {
        $elemMatch: {
          isActive: true,
          stock: {
            $gt: 0,
          },
        },
      },
    },
  },
});

const toIdString = (value) => {
  if (!value) return "";
  return value._id ? value._id.toString() : value.toString();
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

const isProductEligibleForOffer = (offer, product) => {
  if (offer.scope === "all") return true;

  if (offer.scope === "categories") {
    const productCategoryId = toIdString(product.category);
    return (offer.categories || [])
      .map(toIdString)
      .includes(productCategoryId);
  }

  if (offer.scope === "products") {
    const productId = toIdString(product._id);
    return (offer.products || []).map(toIdString).includes(productId);
  }

  return false;
};

const calculateSingleUnitOfferPreview = (offer, product) => {
  const price = Number(product.price || 0);

  if (price <= 0) return null;
  if (Number(offer.minQuantity || 0) > 1) return null;
  if (Number(offer.minSubtotal || 0) > price) return null;

  let discountAmount = 0;

  if (offer.discountType === "percentage") {
    discountAmount = price * (Number(offer.discountValue || 0) / 100);
  }

  if (offer.discountType === "fixedPerItem") {
    discountAmount = Number(offer.discountValue || 0);
  }

  if (Number(offer.maxDiscountAmount || 0) > 0) {
    discountAmount = Math.min(
      discountAmount,
      Number(offer.maxDiscountAmount || 0)
    );
  }

  discountAmount = Math.round(Math.min(discountAmount, price));

  if (discountAmount <= 0) return null;

  return {
    title: offer.title,
    slug: offer.slug,
    discountType: offer.discountType,
    discountValue: offer.discountValue,
    discountAmount,
    priceAfterOffer: Math.max(price - discountAmount, 0),
    translations: offer.translations,
  };
};

const attachActiveOfferPreviews = async (products = []) => {
  if (!products.length) return [];

  const offers = await Offer.find(getActiveRuleQuery())
    .select(
      "title slug translations discountType discountValue maxDiscountAmount scope categories products minSubtotal minQuantity priority createdAt"
    )
    .sort({ priority: -1, createdAt: -1 });

  if (!offers.length) {
    return products.map((product) => product.toObject());
  }

  return products.map((product) => {
    const productObject = product.toObject();
    const previews = offers
      .filter((offer) =>
        ["percentage", "fixedPerItem"].includes(offer.discountType)
      )
      .filter((offer) => isProductEligibleForOffer(offer, product))
      .map((offer) => calculateSingleUnitOfferPreview(offer, product))
      .filter(Boolean);

    return {
      ...productObject,
      activeOfferPreview: previews[0] || null,
    };
  });
};

const parsePrice = (value) => {
  if (value === undefined || value === null || value === "") return null;

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) return null;

  return number;
};

const buildPublicFilterMetadata = async (baseQuery) => {
  const [colors, priceRange] = await Promise.all([
    Product.aggregate([
      {
        $match: baseQuery,
      },
      {
        $unwind: "$colors",
      },
      {
        $match: {
          "colors.isActive": true,
        },
      },
      {
        $project: {
          slug: {
            $ifNull: ["$colors.slug", ""],
          },
          name: "$colors.name",
          translations: "$colors.translations",
          hex: "$colors.hex",
        },
      },
      {
        $group: {
          _id: {
            slug: "$slug",
            name: "$name",
          },
          name: {
            $first: "$name",
          },
          translations: {
            $first: "$translations",
          },
          hex: {
            $first: "$hex",
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          name: 1,
        },
      },
    ]),
    Product.aggregate([
      {
        $match: baseQuery,
      },
      {
        $group: {
          _id: null,
          min: {
            $min: "$price",
          },
          max: {
            $max: "$price",
          },
        },
      },
    ]),
  ]);

  return {
    colors: colors
      .map((color) => ({
        slug: color._id.slug || generateSlug(color.name),
        name: color.name,
        translations: color.translations || {},
        hex: color.hex || "",
        count: color.count,
      }))
      .filter((color) => color.slug && color.name),
    price: {
      min: priceRange[0]?.min || 0,
      max: priceRange[0]?.max || 0,
    },
  };
};

const getPublicProducts = asyncHandler(async (req, res) => {
  const {
    category,
    search,
    featured,
    color,
    minPrice,
    maxPrice,
    availability = "all",
    limit = 24,
    page = 1,
    sort = "newest",
  } = req.query;

  const baseQuery = {
    status: "active",
  };

  if (featured === "true") {
    baseQuery.isFeatured = true;
  }

  if (category) {
    const categoryDoc = await Category.findOne({
      slug: category,
      status: "active",
    }).select("_id");

    if (!categoryDoc) {
      return res.status(200).json({
        success: true,
        count: 0,
        page: Number(page),
        pages: 0,
        products: [],
        filters: {
          colors: [],
          price: {
            min: 0,
            max: 0,
          },
        },
      });
    }

    baseQuery.category = categoryDoc._id;
  }

  if (search) {
    baseQuery.$text = {
      $search: search,
    };
  }

  const query = {
    ...baseQuery,
  };
  const andFilters = [];
  const colorQuery = buildColorQuery(color);

  if (colorQuery) {
    andFilters.push(colorQuery);
  }

  const numericMinPrice = parsePrice(minPrice);
  const numericMaxPrice = parsePrice(maxPrice);

  if (numericMinPrice !== null || numericMaxPrice !== null) {
    query.price = {};

    if (numericMinPrice !== null) {
      query.price.$gte = numericMinPrice;
    }

    if (numericMaxPrice !== null) {
      query.price.$lte = numericMaxPrice;
    }
  }

  const stockQuery = buildStockQuery();

  if (availability === "inStock") {
    andFilters.push(stockQuery);
  }

  if (availability === "outOfStock") {
    query.$nor = [stockQuery];
  }

  if (andFilters.length > 0) {
    query.$and = andFilters;
  }

  const numericLimit = Math.min(Math.max(Number(limit) || 24, 1), 60);
  const numericPage = Math.max(Number(page) || 1, 1);
  const skip = (numericPage - 1) * numericLimit;

  const sortMap = {
    newest: { createdAt: -1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    name_asc: { name: 1 },
    name_desc: { name: -1 },
  };

  const sortOption = sortMap[sort] || sortMap.newest;

  const [products, total, filters] = await Promise.all([
    Product.find(query)
      .populate("category", "name slug translations")
      .sort(sortOption)
      .skip(skip)
      .limit(numericLimit),
    Product.countDocuments(query),
    buildPublicFilterMetadata(baseQuery),
  ]);

  const productsWithOfferPreviews = await attachActiveOfferPreviews(products);

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    page: numericPage,
    pages: Math.ceil(total / numericLimit),
    filters,
    products: productsWithOfferPreviews,
  });
});

const getPublicProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    slug: req.params.slug,
    status: "active",
  }).populate("category", "name slug description translations");

  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  const [productWithOfferPreview] = await attachActiveOfferPreviews([product]);

  res.status(200).json({
    success: true,
    product: productWithOfferPreview,
  });
});

const getAdminProducts = asyncHandler(async (req, res) => {
  const {
    status,
    category,
    search,
    limit = 50,
    page = 1,
    sort = "newest",
  } = req.query;

  const query = {};

  if (status && ["draft", "active", "archived"].includes(status)) {
    query.status = status;
  }

  if (category) {
    query.category = category;
  }

  if (search) {
    query.$text = {
      $search: search,
    };
  }

  const numericLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const numericPage = Math.max(Number(page) || 1, 1);
  const skip = (numericPage - 1) * numericLimit;

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    stock_asc: { createdAt: -1 },
  };

  const sortOption = sortMap[sort] || sortMap.newest;

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate("category", "name slug status translations")
      .sort(sortOption)
      .skip(skip)
      .limit(numericLimit),
    Product.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    page: numericPage,
    pages: Math.ceil(total / numericLimit),
    products,
  });
});

const getAdminProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate(
    "category",
    "name slug status translations"
  );

  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  res.status(200).json({
    success: true,
    product,
  });
});

const createProduct = asyncHandler(async (req, res) => {
  const payload = normalizeProductPayload(req.body);

  if (!payload.name) {
    res.status(400);
    throw new Error("Product name is required.");
  }

  if (!payload.category) {
    res.status(400);
    throw new Error("Product category is required.");
  }

  if (!Number.isFinite(payload.price) || payload.price <= 0) {
    res.status(400);
    throw new Error("Product price must be greater than 0.");
  }

  if (!payload.colors.length) {
    res.status(400);
    throw new Error("Product must have at least one color with sizes.");
  }

  const category = await ensureCategoryExists(payload.category);

  if (!category) {
    res.status(400);
    throw new Error("Selected category does not exist.");
  }

  const rawSlug = req.body.slug?.trim() || payload.name;
  const slug = await createUniqueProductSlug(rawSlug);

  const product = await Product.create({
    ...payload,
    slug,
  });

  const populatedProduct = await Product.findById(product._id).populate(
    "category",
    "name slug status translations"
  );

  res.status(201).json({
    success: true,
    message: "Product created successfully.",
    product: populatedProduct,
  });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  const payload = normalizeProductPayload(req.body, product);

  if (!payload.name) {
    res.status(400);
    throw new Error("Product name is required.");
  }

  if (!payload.category) {
    res.status(400);
    throw new Error("Product category is required.");
  }

  if (!Number.isFinite(payload.price) || payload.price <= 0) {
    res.status(400);
    throw new Error("Product price must be greater than 0.");
  }

  if (!payload.colors.length) {
    res.status(400);
    throw new Error("Product must have at least one color with sizes.");
  }

  const category = await ensureCategoryExists(payload.category);

  if (!category) {
    res.status(400);
    throw new Error("Selected category does not exist.");
  }

  product.name = payload.name;
  product.category = payload.category;
  product.price = payload.price;
  product.compareAtPrice = payload.compareAtPrice;
  product.shortDescription = payload.shortDescription;
  product.description = payload.description;
  product.fabric = payload.fabric;
  product.fit = payload.fit;
  product.careInstructions = payload.careInstructions;
  product.colors = payload.colors;
  product.badges = payload.badges;
  product.isFeatured = payload.isFeatured;
  product.status = payload.status;
  product.seo = payload.seo;

  if (payload.translations !== undefined) {
    product.translations = payload.translations;
  }

  if (req.body.slug !== undefined) {
    product.slug = await createUniqueProductSlug(
      req.body.slug?.trim() || payload.name,
      product._id
    );
  }

  await product.save();

  const populatedProduct = await Product.findById(product._id).populate(
    "category",
    "name slug status translations"
  );

  res.status(200).json({
    success: true,
    message: "Product updated successfully.",
    product: populatedProduct,
  });
});

const updateProductStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!["draft", "active", "archived"].includes(status)) {
    res.status(400);
    throw new Error("Invalid product status.");
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  product.status = status;

  await product.save();

  res.status(200).json({
    success: true,
    message: "Product status updated successfully.",
    product,
  });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  product.status = "archived";
  await product.save();

  res.status(200).json({
    success: true,
    message: "Product archived successfully.",
    product,
  });
});

module.exports = {
  getPublicProducts,
  getPublicProductBySlug,
  getAdminProducts,
  getAdminProductById,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
};
