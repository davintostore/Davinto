const Product = require("../models/Product");
const Category = require("../models/Category");
const {
  cloudinary,
  configureCloudinary,
  isCloudinaryConfigured,
} = require("../config/cloudinary");

const normalizePublicId = (publicId = "") => String(publicId || "").trim();

const uniquePublicIds = (publicIds = []) => {
  return [
    ...new Set(
      publicIds.map(normalizePublicId).filter((publicId) => publicId)
    ),
  ];
};

const isPublicIdReferenced = async (
  publicId,
  { excludeProductId = null, excludeCategoryId = null } = {}
) => {
  const productQuery = {
    "colors.images.publicId": publicId,
  };
  const categoryQuery = {
    "image.publicId": publicId,
  };

  if (excludeProductId) {
    productQuery._id = { $ne: excludeProductId };
  }

  if (excludeCategoryId) {
    categoryQuery._id = { $ne: excludeCategoryId };
  }

  const [productReference, categoryReference] = await Promise.all([
    Product.exists(productQuery),
    Category.exists(categoryQuery),
  ]);

  return Boolean(productReference || categoryReference);
};

const deleteCloudinaryImageIfUnreferenced = async (publicId, options = {}) => {
  const safePublicId = normalizePublicId(publicId);

  if (!safePublicId) {
    return { deleted: false, skipped: true, reason: "missing-public-id" };
  }

  try {
    const stillReferenced = await isPublicIdReferenced(safePublicId, options);

    if (stillReferenced) {
      console.warn(
        `Cloudinary cleanup skipped: ${safePublicId} is still referenced.`
      );

      return { deleted: false, skipped: true, reason: "still-referenced" };
    }

    configureCloudinary();

    if (!isCloudinaryConfigured()) {
      console.warn(
        `Cloudinary cleanup skipped: Cloudinary is not configured for ${safePublicId}.`
      );

      return { deleted: false, skipped: true, reason: "not-configured" };
    }

    await cloudinary.uploader.destroy(safePublicId, {
      resource_type: "image",
    });

    return { deleted: true, skipped: false, reason: "" };
  } catch (error) {
    console.warn(
      `Cloudinary cleanup failed for ${safePublicId}: ${error.message}`
    );

    return { deleted: false, skipped: true, reason: "delete-failed" };
  }
};

const deleteCloudinaryImagesIfUnreferenced = async (
  publicIds = [],
  options = {}
) => {
  const results = [];

  for (const publicId of uniquePublicIds(publicIds)) {
    results.push(
      await deleteCloudinaryImageIfUnreferenced(publicId, options)
    );
  }

  return results;
};

module.exports = {
  deleteCloudinaryImageIfUnreferenced,
  deleteCloudinaryImagesIfUnreferenced,
  uniquePublicIds,
};
