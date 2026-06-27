require("dotenv").config();

const mongoose = require("mongoose");

const Category = require("../models/Category");
const Product = require("../models/Product");
const {
  PUBLIC_IMAGE_ROOT,
  buildLaunchCategoryImageMap,
  buildLaunchProductImageMap,
  listLocalImageFiles,
} = require("../config/launchImageMap");

const normalizeText = (value = "") => String(value || "").trim();

const findTargetColorIndex = (product, expectedColorSlug) => {
  const colors = Array.isArray(product.colors) ? product.colors : [];

  if (!colors.length) return -1;

  const exactIndex = colors.findIndex(
    (color) => normalizeText(color.slug) === expectedColorSlug
  );

  if (exactIndex >= 0) return exactIndex;
  if (colors.length === 1) return 0;

  return -1;
};

const logUpdate = ({ type, identifier, fieldPath, before, after }) => {
  console.log(`${type} ${identifier}: ${fieldPath}`);
  console.log(`  ${before || "(empty)"}`);
  console.log(`  -> ${after}`);
};

const syncProducts = async (productImageMap) => {
  let updatedDocuments = 0;
  let updatedFields = 0;
  let skippedDocuments = 0;

  for (const [slug, expected] of Object.entries(productImageMap)) {
    const product = await Product.findOne({ slug }).select("name slug colors").lean();

    if (!product) {
      skippedDocuments += 1;
      console.log(`Product ${slug}: skipped, product not found.`);
      continue;
    }

    const colorIndex = findTargetColorIndex(product, expected.colorSlug);

    if (colorIndex < 0) {
      skippedDocuments += 1;
      console.log(
        `Product ${slug}: skipped, color ${expected.colorSlug} was not found safely.`
      );
      continue;
    }

    const color = product.colors[colorIndex];
    const images = Array.isArray(color.images) ? color.images : [];

    if (!images.length) {
      skippedDocuments += 1;
      console.log(`Product ${slug}: skipped, no existing image entries.`);
      continue;
    }

    const setUpdates = {};
    const syncCount = Math.min(images.length, expected.images.length);

    for (let imageIndex = 0; imageIndex < syncCount; imageIndex += 1) {
      const currentUrl = normalizeText(images[imageIndex]?.url);
      const nextUrl = expected.images[imageIndex];

      if (currentUrl !== nextUrl) {
        const fieldPath = `colors.${colorIndex}.images.${imageIndex}.url`;
        setUpdates[fieldPath] = nextUrl;
        logUpdate({
          type: "Product",
          identifier: slug,
          fieldPath,
          before: currentUrl,
          after: nextUrl,
        });
      }
    }

    if (images.length < expected.images.length) {
      console.log(
        `Product ${slug}: ${expected.images.length - images.length} local image path(s) not applied because the DB has fewer image entries.`
      );
    }

    if (Object.keys(setUpdates).length > 0) {
      await Product.updateOne({ _id: product._id }, { $set: setUpdates });
      updatedDocuments += 1;
      updatedFields += Object.keys(setUpdates).length;
    }
  }

  return { updatedDocuments, updatedFields, skippedDocuments };
};

const syncCategories = async (categoryImageMap) => {
  let updatedDocuments = 0;
  let updatedFields = 0;
  let skippedDocuments = 0;

  for (const [slug, nextUrl] of Object.entries(categoryImageMap)) {
    const category = await Category.findOne({ slug }).select("name slug image").lean();

    if (!category) {
      skippedDocuments += 1;
      console.log(`Category ${slug}: skipped, category not found.`);
      continue;
    }

    const currentUrl = normalizeText(category.image?.url);

    if (currentUrl === nextUrl) {
      continue;
    }

    await Category.updateOne(
      { _id: category._id },
      { $set: { "image.url": nextUrl } }
    );
    updatedDocuments += 1;
    updatedFields += 1;

    logUpdate({
      type: "Category",
      identifier: slug,
      fieldPath: "image.url",
      before: currentUrl,
      after: nextUrl,
    });
  }

  return { updatedDocuments, updatedFields, skippedDocuments };
};

const connectToDatabase = async () => {
  const mongoUri = normalizeText(process.env.MONGO_URI);

  if (!mongoUri) {
    throw new Error("MONGO_URI is required to sync image paths.");
  }

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected.");
};

const run = async () => {
  try {
    console.log("");
    console.log("Davinto Launch Image Sync");
    console.log("=========================");
    console.log(`Public image root: ${PUBLIC_IMAGE_ROOT}`);

    const localImages = listLocalImageFiles();
    console.log(`Detected local image files: ${localImages.length}`);

    const productImageMap = buildLaunchProductImageMap();
    const categoryImageMap = buildLaunchCategoryImageMap();

    console.log(`Mapped products: ${Object.keys(productImageMap).length}`);
    console.log(`Mapped categories: ${Object.keys(categoryImageMap).length}`);
    console.log("");

    await connectToDatabase();

    const productResult = await syncProducts(productImageMap);
    const categoryResult = await syncCategories(categoryImageMap);
    const totalUpdatedFields =
      productResult.updatedFields + categoryResult.updatedFields;

    console.log("");
    console.log(
      `Updated product documents: ${productResult.updatedDocuments} (${productResult.updatedFields} image URL field(s))`
    );
    console.log(
      `Updated category documents: ${categoryResult.updatedDocuments} (${categoryResult.updatedFields} image URL field(s))`
    );
    console.log(
      `Skipped documents: products=${productResult.skippedDocuments}, categories=${categoryResult.skippedDocuments}`
    );

    if (totalUpdatedFields === 0) {
      console.log("No image URL changes were needed.");
    }

    console.log("Image sync completed. No products were recreated.");
    console.log("");
  } catch (error) {
    console.error("");
    console.error("Image sync failed:");
    console.error(error.message);
    console.error("");
    process.exitCode = 1;
    throw error;
  } finally {
    await mongoose.connection.close().catch(() => {});
  }
};

if (require.main === module) {
  run().catch(() => {});
}

module.exports = {
  run,
};
