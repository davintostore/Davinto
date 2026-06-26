const mongoose = require("mongoose");

const Offer = require("../models/Offer");
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

const createUniqueOfferSlug = async (baseValue, excludedId = null) => {
  const baseSlug = generateSlug(baseValue || "offer");
  let slug = baseSlug || "offer";
  let counter = 2;

  while (true) {
    const query = { slug };

    if (excludedId) {
      query._id = { $ne: excludedId };
    }

    const existingOffer = await Offer.findOne(query).select("_id");

    if (!existingOffer) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
};

const normalizeDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date;
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

const normalizePayload = (body = {}, currentOffer = null) => {
  const scope = ["all", "categories", "products"].includes(body.scope)
    ? body.scope
    : "all";

  const discountType = [
    "percentage",
    "fixed",
    "fixedPerItem",
    "freeDelivery",
  ].includes(body.discountType)
    ? body.discountType
    : "percentage";

  return {
    title: body.title?.trim() || "",
    slug: body.slug?.trim() || "",
    description: body.description?.trim() || "",
    translations: normalizeTranslations(
      body.translations,
      currentOffer?.translations
    ),
    discountType,
    discountValue:
      discountType === "freeDelivery" ? 0 : Math.max(0, Number(body.discountValue || 0)),
    maxDiscountAmount:
      discountType === "freeDelivery"
        ? 0
        : Math.max(0, Number(body.maxDiscountAmount || 0)),
    scope,
    categories: scope === "categories" ? cleanObjectIdArray(body.categories) : [],
    products: scope === "products" ? cleanObjectIdArray(body.products) : [],
    minSubtotal: Math.max(0, Number(body.minSubtotal || 0)),
    minQuantity: Math.max(0, Number(body.minQuantity || 0)),
    priority: Number(body.priority || 0),
    stackable: Boolean(body.stackable),
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
    throw new Error("Offer title is required.");
  }

  if (payload.discountType !== "freeDelivery" && payload.discountValue <= 0) {
    throw new Error("Offer discount value must be greater than 0.");
  }

  if (payload.discountType === "percentage" && payload.discountValue > 100) {
    throw new Error("Percentage offer cannot be greater than 100%.");
  }

  if (payload.startsAt && payload.endsAt && payload.startsAt > payload.endsAt) {
    throw new Error("Start date cannot be after end date.");
  }

  if (payload.scope === "categories" && payload.categories.length === 0) {
    throw new Error("Choose at least one category for this offer.");
  }

  if (payload.scope === "products" && payload.products.length === 0) {
    throw new Error("Choose at least one product for this offer.");
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

const getPublicOffers = asyncHandler(async (req, res) => {
  const now = new Date();

  const offers = await Offer.find({
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
    .populate("products", "name slug price compareAtPrice")
    .sort({ priority: -1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: offers.length,
    offers,
  });
});

const getAdminOffers = asyncHandler(async (req, res) => {
  const { status, scope, search } = req.query;

  const query = {};

  if (status && ["draft", "active", "archived"].includes(status)) {
    query.status = status;
  }

  if (scope && ["all", "categories", "products"].includes(scope)) {
    query.scope = scope;
  }

  if (search) {
    const safeSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    query.$or = [
      { title: { $regex: safeSearch, $options: "i" } },
      { slug: { $regex: safeSearch, $options: "i" } },
      { description: { $regex: safeSearch, $options: "i" } },
    ];
  }

  const offers = await Offer.find(query)
    .populate("categories", "name slug status")
    .populate("products", "name slug price status")
    .sort({ priority: -1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: offers.length,
    offers,
  });
});

const createOffer = asyncHandler(async (req, res) => {
  const payload = normalizePayload(req.body);

  try {
    await validatePayload(payload);
  } catch (error) {
    res.status(400);
    throw error;
  }

  const slug = await createUniqueOfferSlug(payload.slug || payload.title);

  const offer = await Offer.create({
    ...payload,
    slug,
  });

  const populatedOffer = await Offer.findById(offer._id)
    .populate("categories", "name slug status")
    .populate("products", "name slug price status");

  res.status(201).json({
    success: true,
    message: "Offer created successfully.",
    offer: populatedOffer,
  });
});

const updateOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id);

  if (!offer) {
    res.status(404);
    throw new Error("Offer not found.");
  }

  const payload = normalizePayload(req.body, offer);

  try {
    await validatePayload(payload);
  } catch (error) {
    res.status(400);
    throw error;
  }

  const slug = await createUniqueOfferSlug(payload.slug || payload.title, offer._id);

  offer.title = payload.title;
  offer.slug = slug;
  offer.description = payload.description;
  offer.translations = payload.translations;
  offer.discountType = payload.discountType;
  offer.discountValue = payload.discountValue;
  offer.maxDiscountAmount = payload.maxDiscountAmount;
  offer.scope = payload.scope;
  offer.categories = payload.categories;
  offer.products = payload.products;
  offer.minSubtotal = payload.minSubtotal;
  offer.minQuantity = payload.minQuantity;
  offer.priority = payload.priority;
  offer.stackable = payload.stackable;
  offer.startsAt = payload.startsAt;
  offer.endsAt = payload.endsAt;
  offer.usageLimit = payload.usageLimit;
  offer.status = payload.status;

  await offer.save();

  const populatedOffer = await Offer.findById(offer._id)
    .populate("categories", "name slug status")
    .populate("products", "name slug price status");

  res.status(200).json({
    success: true,
    message: "Offer updated successfully.",
    offer: populatedOffer,
  });
});

const deleteOffer = asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id);

  if (!offer) {
    res.status(404);
    throw new Error("Offer not found.");
  }

  if (offer.usedCount > 0) {
    offer.status = "archived";
    await offer.save();

    return res.status(200).json({
      success: true,
      message: "Offer has usage history, so it was archived instead of deleted.",
      offer,
    });
  }

  await offer.deleteOne();

  res.status(200).json({
    success: true,
    message: "Offer deleted successfully.",
  });
});

module.exports = {
  getPublicOffers,
  getAdminOffers,
  createOffer,
  updateOffer,
  deleteOffer,
};
