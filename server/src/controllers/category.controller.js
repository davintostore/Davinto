const Category = require("../models/Category");
const Product = require("../models/Product");
const asyncHandler = require("../utils/asyncHandler");
const generateSlug = require("../utils/generateSlug");

const createUniqueCategorySlug = async (baseValue, excludedId = null) => {
  const baseSlug = generateSlug(baseValue || "category");
  let slug = baseSlug || "category";
  let counter = 2;

  while (true) {
    const query = { slug };

    if (excludedId) {
      query._id = { $ne: excludedId };
    }

    const existingCategory = await Category.findOne(query).select("_id");

    if (!existingCategory) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
};

const normalizeCategoryTranslations = (translations = {}) => {
  return {
    ar: {
      name: String(translations.ar?.name || "").trim(),
      description: String(translations.ar?.description || "").trim(),
      seo: {
        title: String(translations.ar?.seo?.title || "").trim(),
        description: String(
          translations.ar?.seo?.description || ""
        ).trim(),
      },
    },
  };
};

const normalizeCategoryImage = (image = {}, fallbackAlt = "") => {
  const source = image && typeof image === "object" ? image : {};
  const url = String(source.url || "").trim();

  return {
    url,
    publicId: url ? String(source.publicId || "").trim() : "",
    alt: url
      ? String(source.alt || fallbackAlt || "Davinto category").trim()
      : "",
  };
};

const normalizeCategoryPayload = (body = {}) => {
  const payload = {
    name: body.name?.trim(),
    description: body.description?.trim() || "",
    status: body.status || "active",
    sortOrder: Number.isFinite(Number(body.sortOrder))
      ? Number(body.sortOrder)
      : 0,
    seo: {
      title: body.seo?.title?.trim() || "",
      description: body.seo?.description?.trim() || "",
    },
  };

  if (body.translations !== undefined) {
    payload.translations = normalizeCategoryTranslations(body.translations);
  }

  if (body.image !== undefined) {
    payload.image = normalizeCategoryImage(body.image, payload.name);
  }

  return payload;
};

const getPublicCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ status: "active" }).sort({
    sortOrder: 1,
    createdAt: -1,
  });

  res.status(200).json({
    success: true,
    count: categories.length,
    categories,
  });
});

const getPublicCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    slug: req.params.slug,
    status: "active",
  });

  if (!category) {
    res.status(404);
    throw new Error("Category not found.");
  }

  res.status(200).json({
    success: true,
    category,
  });
});

const getAdminCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({
    sortOrder: 1,
    createdAt: -1,
  });

  res.status(200).json({
    success: true,
    count: categories.length,
    categories,
  });
});

const createCategory = asyncHandler(async (req, res) => {
  const payload = normalizeCategoryPayload(req.body);

  if (!payload.name) {
    res.status(400);
    throw new Error("Category name is required.");
  }

  const rawSlug = req.body.slug?.trim() || payload.name;
  const slug = await createUniqueCategorySlug(rawSlug);

  const category = await Category.create({
    ...payload,
    slug,
  });

  res.status(201).json({
    success: true,
    message: "Category created successfully.",
    category,
  });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error("Category not found.");
  }

  const payload = normalizeCategoryPayload(req.body);

  if (!payload.name) {
    res.status(400);
    throw new Error("Category name is required.");
  }

  category.name = payload.name;
  category.description = payload.description;
  category.status = payload.status;
  category.sortOrder = payload.sortOrder;
  category.seo = payload.seo;

  if (payload.image !== undefined) {
    category.image = payload.image;
  }

  if (payload.translations !== undefined) {
    category.translations = payload.translations;
  }

  if (req.body.slug !== undefined) {
    const nextSlug = await createUniqueCategorySlug(
      req.body.slug?.trim() || payload.name,
      category._id
    );

    category.slug = nextSlug;
  }

  await category.save();

  res.status(200).json({
    success: true,
    message: "Category updated successfully.",
    category,
  });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error("Category not found.");
  }

  const linkedProductsCount = await Product.countDocuments({
    category: category._id,
  });

  if (linkedProductsCount > 0) {
    category.status = "archived";
    await category.save();

    return res.status(200).json({
      success: true,
      message:
        "Category has linked products, so it was archived instead of deleted.",
      category,
    });
  }

  await category.deleteOne();

  res.status(200).json({
    success: true,
    message: "Category deleted successfully.",
  });
});

module.exports = {
  getPublicCategories,
  getPublicCategoryBySlug,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
