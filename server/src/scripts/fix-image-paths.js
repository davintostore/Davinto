require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const Category = require("../models/Category");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { getCategoryImageUrl } = require("../config/launchImageMap");

const PUBLIC_IMAGE_ROOT = path.resolve(
  __dirname,
  "../../../client/public/images"
);
const PUBLIC_IMAGE_PREFIX = "/images/";
const IMAGE_EXTENSIONS = [".webp", ".jpg", ".jpeg", ".png", ".avif"];
const STALE_IMAGE_PATTERN =
  /(t-shirts|tshirts|t_shirts|art(?:%20|[ _-])and(?:%20|[ _-])design|art\/design|art(?:%20|[ _-])and(?:%20|[ _-])history|\.jpe?g)/i;

const normalizeText = (value = "") => String(value || "").trim();

const getExistingAssetFolder = (folders) => {
  return (
    folders.find((folder) =>
      fs.existsSync(path.join(PUBLIC_IMAGE_ROOT, folder))
    ) || ""
  );
};

const ART_ASSET_FOLDER = getExistingAssetFolder([
  "art-and-design",
  "art-and-history",
]);

const getPublicFilePath = (publicUrl = "") => {
  const cleanUrl = normalizeText(publicUrl).split(/[?#]/)[0];

  if (!cleanUrl.startsWith(PUBLIC_IMAGE_PREFIX)) return "";

  const relativePath = cleanUrl.slice(PUBLIC_IMAGE_PREFIX.length);
  const resolvedPath = path.resolve(PUBLIC_IMAGE_ROOT, relativePath);
  const rootWithSeparator = `${PUBLIC_IMAGE_ROOT}${path.sep}`.toLowerCase();

  if (!resolvedPath.toLowerCase().startsWith(rootWithSeparator)) return "";

  return resolvedPath;
};

const publicFileExists = (publicUrl = "") => {
  const filePath = getPublicFilePath(publicUrl);

  return Boolean(filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile());
};

const resolveExistingPublicUrl = (publicUrl = "") => {
  const cleanUrl = normalizeText(publicUrl).split(/[?#]/)[0].replace(/\\/g, "/");

  if (!cleanUrl.startsWith(PUBLIC_IMAGE_PREFIX)) return "";
  if (publicFileExists(cleanUrl)) return cleanUrl;

  const parsed = path.posix.parse(cleanUrl);

  for (const extension of IMAGE_EXTENSIONS) {
    const candidate = `${parsed.dir}/${parsed.name}${extension}`;

    if (publicFileExists(candidate)) {
      return candidate;
    }
  }

  return "";
};

const replaceFolderSegments = (publicUrl = "") => {
  let candidate = normalizeText(publicUrl).split(/[?#]/)[0].replace(/\\/g, "/");

  candidate = candidate
    .replace(/^\/images\/products\/(?:t-shirts|tshirts|t_shirts)\//i, "/images/blanks/")
    .replace(/^\/images\/(?:t-shirts|tshirts|t_shirts)\//i, "/images/blanks/");

  if (ART_ASSET_FOLDER) {
    const artPrefix = `/images/${ART_ASSET_FOLDER}/`;

    candidate = candidate
      .replace(
        /^\/images\/categories\/art(?:%20|[ _-])and(?:%20|[ _-])design\//i,
        artPrefix
      )
      .replace(
        /^\/images\/art(?:%20|[ _-])and(?:%20|[ _-])design\//i,
        artPrefix
      )
      .replace(/^\/images\/art\/design\//i, artPrefix)
      .replace(
        /^\/images\/categories\/art(?:%20|[ _-])and(?:%20|[ _-])history\//i,
        artPrefix
      )
      .replace(
        /^\/images\/art(?:%20|[ _-])and(?:%20|[ _-])history\//i,
        artPrefix
      );
  }

  return candidate;
};

const getFixedImageUrl = (url = "") => {
  const originalUrl = normalizeText(url);

  if (!originalUrl.startsWith(PUBLIC_IMAGE_PREFIX)) return originalUrl;
  if (!STALE_IMAGE_PATTERN.test(originalUrl)) return originalUrl;

  const candidate = replaceFolderSegments(originalUrl);
  const resolvedUrl = resolveExistingPublicUrl(candidate);

  if (resolvedUrl && resolvedUrl !== originalUrl) {
    return resolvedUrl;
  }

  return originalUrl;
};

const logUpdate = ({ type, identifier, fieldPath, before, after }) => {
  console.log(`${type} ${identifier}: ${fieldPath}`);
  console.log(`  ${before}`);
  console.log(`  -> ${after}`);
};

const fixProducts = async () => {
  const products = await Product.find({
    "colors.images.url": { $regex: STALE_IMAGE_PATTERN },
  })
    .select("name slug colors")
    .lean();
  let updatedCount = 0;

  for (const product of products) {
    const setUpdates = {};

    (product.colors || []).forEach((color, colorIndex) => {
      (color.images || []).forEach((image, imageIndex) => {
        const nextUrl = getFixedImageUrl(image.url);

        if (nextUrl !== image.url) {
          const fieldPath = `colors.${colorIndex}.images.${imageIndex}.url`;
          setUpdates[fieldPath] = nextUrl;
          logUpdate({
            type: "Product",
            identifier: product.slug || product.name || product._id,
            fieldPath,
            before: image.url,
            after: nextUrl,
          });
        }
      });
    });

    if (Object.keys(setUpdates).length > 0) {
      await Product.updateOne({ _id: product._id }, { $set: setUpdates });
      updatedCount += 1;
    }
  }

  return updatedCount;
};

const fixCategories = async () => {
  const categories = await Category.find({
    "image.url": { $regex: STALE_IMAGE_PATTERN },
  })
    .select("name slug image")
    .lean();
  let updatedCount = 0;

  for (const category of categories) {
    const nextUrl =
      category.slug === "blanks"
        ? getCategoryImageUrl("blanks")
        : getFixedImageUrl(category.image?.url);

    if (nextUrl !== category.image?.url) {
      await Category.updateOne(
        { _id: category._id },
        { $set: { "image.url": nextUrl } }
      );
      updatedCount += 1;
      logUpdate({
        type: "Category",
        identifier: category.slug || category.name || category._id,
        fieldPath: "image.url",
        before: category.image?.url,
        after: nextUrl,
      });
    }
  }

  return updatedCount;
};

const fixOrders = async () => {
  const orders = await Order.find({
    "items.image": { $regex: STALE_IMAGE_PATTERN },
  })
    .select("orderNumber items")
    .lean();
  let updatedCount = 0;

  for (const order of orders) {
    const setUpdates = {};

    (order.items || []).forEach((item, itemIndex) => {
      const nextUrl = getFixedImageUrl(item.image);

      if (nextUrl !== item.image) {
        const fieldPath = `items.${itemIndex}.image`;
        setUpdates[fieldPath] = nextUrl;
        logUpdate({
          type: "Order",
          identifier: order.orderNumber || order._id,
          fieldPath,
          before: item.image,
          after: nextUrl,
        });
      }
    });

    if (Object.keys(setUpdates).length > 0) {
      await Order.updateOne({ _id: order._id }, { $set: setUpdates });
      updatedCount += 1;
    }
  }

  return updatedCount;
};

const connectToDatabase = async () => {
  const mongoUri = normalizeText(process.env.MONGO_URI);

  if (!mongoUri) {
    throw new Error("MONGO_URI is required to fix image paths.");
  }

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected.");
};

const run = async () => {
  try {
    console.log("");
    console.log("Davinto Image Path Fix");
    console.log("======================");
    console.log(`Public image root: ${PUBLIC_IMAGE_ROOT}`);
    console.log(`Art asset folder: ${ART_ASSET_FOLDER || "not found"}`);
    console.log("");

    await connectToDatabase();

    const productCount = await fixProducts();
    const categoryCount = await fixCategories();
    const orderCount = await fixOrders();

    console.log("");
    console.log(
      `Updated documents: products=${productCount}, categories=${categoryCount}, orders=${orderCount}`
    );
    console.log("Image path fix completed.");
    console.log("");
  } catch (error) {
    console.error("");
    console.error("Image path fix failed:");
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
  getFixedImageUrl,
  run,
};
