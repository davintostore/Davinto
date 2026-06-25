const mongoose = require("mongoose");

const Bundle = require("../models/Bundle");
const Category = require("../models/Category");
const Product = require("../models/Product");

const asyncHandler = require("../utils/asyncHandler");
const generateSlug = require("../utils/generateSlug");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const cleanObjectIdArray = (value = []) => {
  if (!Array.isArray(value)) return [];

  return [...new Set(value.map(String))]
    .map((id) => id.trim())
    .filter((id) => id && isValidObjectId(id));
};

const normalizeDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date;
};

const createUniqueBundleSlug = async (baseValue, excludedId = null) => {
  const baseSlug = generateSlug(baseValue || "bundle");
  let slug = baseSlug || "bundle";
  let counter = 2;

  while (true) {
    const query = { slug };

    if (excludedId) {
      query._id = { $ne: excludedId };
    }

    const existingBundle = await Bundle.findOne(query).select("_id");

    if (!existingBundle) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
};

const normalizeTranslations = (translations = {}, fallback = {}) => {
  const source =
    translations && typeof translations === "object" ? translations : {};
  const fallbackSource =
    fallback && typeof fallback === "object" ? fallback : {};
  const arabic = source.ar || {};
  const fallbackArabic = fallbackSource.ar || {};

  return {
    ar: {
      title: String(arabic.title ?? fallbackArabic.title ?? "").trim(),
      description: String(
        arabic.description ?? fallbackArabic.description ?? ""
      ).trim(),
    },
  };
};

const normalizePayload = (body = {}, currentBundle = null) => {
  const bundleMode = ["anyProducts", "specificProducts"].includes(
    body.bundleMode
  )
    ? body.bundleMode
    : "anyProducts";

  const eligibleScope = ["all", "categories", "products"].includes(
    body.eligibleScope
  )
    ? body.eligibleScope
    : "all";

  const pricingType = [
    "fixedBundlePrice",
    "percentageOff",
    "fixedDiscount",
  ].includes(body.pricingType)
    ? body.pricingType
    : "fixedBundlePrice";

  const finalEligibleScope =
    bundleMode === "specificProducts" ? "products" : eligibleScope;

  return {
    title: body.title?.trim() || "",
    slug: body.slug?.trim() || "",
    description: body.description?.trim() || "",
    translations: normalizeTranslations(
      body.translations,
      currentBundle?.translations
    ),
    bundleMode,
    eligibleScope: finalEligibleScope,
    categories:
      bundleMode === "anyProducts" && finalEligibleScope === "categories"
        ? cleanObjectIdArray(body.categories)
        : [],
    products:
      finalEligibleScope === "products" ? cleanObjectIdArray(body.products) : [],
    requiredQuantity: Math.max(2, Number(body.requiredQuantity || 2)),
    pricingType,
    bundlePrice:
      pricingType === "fixedBundlePrice"
        ? Math.max(0, Number(body.bundlePrice || 0))
        : 0,
    discountValue:
      pricingType !== "fixedBundlePrice"
        ? Math.max(0, Number(body.discountValue || 0))
        : 0,
    maxDiscountAmount:
      pricingType !== "fixedBundlePrice"
        ? Math.max(0, Number(body.maxDiscountAmount || 0))
        : 0,
    allowMultipleApplications: body.allowMultipleApplications !== false,
    stackable: Boolean(body.stackable),
    priority: Number(body.priority || 0),
    startsAt: normalizeDate(body.startsAt),
    endsAt: normalizeDate(body.endsAt),
    usageLimit: Math.max(0, Number(body.usageLimit || 0)),
    status: ["draft", "active", "archived"].includes(body.status)
      ? body.status
      : "draft",
  };
};

const validatePayload = async (payload) => {
  if (!payload.title) {
    throw new Error("Bundle title is required.");
  }

  if (payload.requiredQuantity < 2) {
    throw new Error("Bundle required quantity must be at least 2.");
  }

  if (payload.pricingType === "fixedBundlePrice" && payload.bundlePrice <= 0) {
    throw new Error("Fixed bundle price must be greater than 0.");
  }

  if (
    payload.pricingType !== "fixedBundlePrice" &&
    payload.discountValue <= 0
  ) {
    throw new Error("Bundle discount value must be greater than 0.");
  }

  if (payload.pricingType === "percentageOff" && payload.discountValue > 100) {
    throw new Error("Percentage bundle discount cannot be greater than 100%.");
  }

  if (payload.startsAt && payload.endsAt && payload.startsAt > payload.endsAt) {
    throw new Error("Start date cannot be after end date.");
  }

  if (
    payload.bundleMode === "specificProducts" &&
    payload.products.length < 2
  ) {
    throw new Error("Specific products bundle needs at least two products.");
  }

  if (
    payload.bundleMode === "specificProducts" &&
    payload.requiredQuantity > payload.products.length
  ) {
    throw new Error(
      "Required quantity cannot be greater than selected products count."
    );
  }

  if (
    payload.bundleMode === "anyProducts" &&
    payload.eligibleScope === "categories" &&
    payload.categories.length === 0
  ) {
    throw new Error("Choose at least one category for this bundle.");
  }

  if (
    payload.bundleMode === "anyProducts" &&
    payload.eligibleScope === "products" &&
    payload.products.length === 0
  ) {
    throw new Error("Choose at least one product for this bundle.");
  }

  if (payload.categories.length > 0) {
    const foundCategories = await Category.countDocuments({
      _id: { $in: payload.categories },
    });

    if (foundCategories !== payload.categories.length) {
      throw new Error("One or more selected categories do not exist.");
    }
  }

  if (payload.products.length > 0) {
    const foundProducts = await Product.countDocuments({
      _id: { $in: payload.products },
    });

    if (foundProducts !== payload.products.length) {
      throw new Error("One or more selected products do not exist.");
    }
  }
};

const getPublicBundles = asyncHandler(async (req, res) => {
  const now = new Date();

  const bundles = await Bundle.find({
    status: "active",
    $and: [
      {
        $or: [{ startsAt: null }, { startsAt: { $lte: now } }],
      },
      {
        $or: [{ endsAt: null }, { endsAt: { $gte: now } }],
      },
    ],
  })
    .populate("categories", "name slug")
    .populate("products", "name slug price compareAtPrice primaryImage")
    .sort({ priority: -1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: bundles.length,
    bundles,
  });
});

const getAdminBundles = asyncHandler(async (req, res) => {
  const { status, bundleMode, eligibleScope, search } = req.query;

  const query = {};

  if (status && ["draft", "active", "archived"].includes(status)) {
    query.status = status;
  }

  if (bundleMode && ["anyProducts", "specificProducts"].includes(bundleMode)) {
    query.bundleMode = bundleMode;
  }

  if (
    eligibleScope &&
    ["all", "categories", "products"].includes(eligibleScope)
  ) {
    query.eligibleScope = eligibleScope;
  }

  if (search) {
    const safeSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    query.$or = [
      { title: { $regex: safeSearch, $options: "i" } },
      { slug: { $regex: safeSearch, $options: "i" } },
      { description: { $regex: safeSearch, $options: "i" } },
    ];
  }

  const bundles = await Bundle.find(query)
    .populate("categories", "name slug status")
    .populate("products", "name slug price status")
    .sort({ priority: -1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: bundles.length,
    bundles,
  });
});

const createBundle = asyncHandler(async (req, res) => {
  const payload = normalizePayload(req.body);

  try {
    await validatePayload(payload);
  } catch (error) {
    res.status(400);
    throw error;
  }

  const slug = await createUniqueBundleSlug(payload.slug || payload.title);

  const bundle = await Bundle.create({
    ...payload,
    slug,
  });

  const populatedBundle = await Bundle.findById(bundle._id)
    .populate("categories", "name slug status")
    .populate("products", "name slug price status");

  res.status(201).json({
    success: true,
    message: "Bundle created successfully.",
    bundle: populatedBundle,
  });
});

const updateBundle = asyncHandler(async (req, res) => {
  const bundle = await Bundle.findById(req.params.id);

  if (!bundle) {
    res.status(404);
    throw new Error("Bundle not found.");
  }

  const payload = normalizePayload(req.body, bundle);

  try {
    await validatePayload(payload);
  } catch (error) {
    res.status(400);
    throw error;
  }

  const slug = await createUniqueBundleSlug(
    payload.slug || payload.title,
    bundle._id
  );

  bundle.title = payload.title;
  bundle.slug = slug;
  bundle.description = payload.description;
  bundle.translations = payload.translations;
  bundle.bundleMode = payload.bundleMode;
  bundle.eligibleScope = payload.eligibleScope;
  bundle.categories = payload.categories;
  bundle.products = payload.products;
  bundle.requiredQuantity = payload.requiredQuantity;
  bundle.pricingType = payload.pricingType;
  bundle.bundlePrice = payload.bundlePrice;
  bundle.discountValue = payload.discountValue;
  bundle.maxDiscountAmount = payload.maxDiscountAmount;
  bundle.allowMultipleApplications = payload.allowMultipleApplications;
  bundle.stackable = payload.stackable;
  bundle.priority = payload.priority;
  bundle.startsAt = payload.startsAt;
  bundle.endsAt = payload.endsAt;
  bundle.usageLimit = payload.usageLimit;
  bundle.status = payload.status;

  await bundle.save();

  const populatedBundle = await Bundle.findById(bundle._id)
    .populate("categories", "name slug status")
    .populate("products", "name slug price status");

  res.status(200).json({
    success: true,
    message: "Bundle updated successfully.",
    bundle: populatedBundle,
  });
});

const deleteBundle = asyncHandler(async (req, res) => {
  const bundle = await Bundle.findById(req.params.id);

  if (!bundle) {
    res.status(404);
    throw new Error("Bundle not found.");
  }

  if (bundle.usedCount > 0) {
    bundle.status = "archived";
    await bundle.save();

    return res.status(200).json({
      success: true,
      message:
        "Bundle has usage history, so it was archived instead of deleted.",
      bundle,
    });
  }

  await bundle.deleteOne();

  res.status(200).json({
    success: true,
    message: "Bundle deleted successfully.",
  });
});

module.exports = {
  getPublicBundles,
  getAdminBundles,
  createBundle,
  updateBundle,
  deleteBundle,
};
