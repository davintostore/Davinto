const fs = require("fs");
const path = require("path");

const PUBLIC_IMAGE_ROOT = path.resolve(
  __dirname,
  "../../../client/public/images"
);
const PUBLIC_IMAGE_PREFIX = "/images/";

const blankProducts = {
  "black-t-shirt": {
    colorSlug: "black",
    folder: "black",
    basenames: ["1", "2", "3", "4"],
  },
  "white-t-shirt": {
    colorSlug: "white",
    folder: "white",
    basenames: ["1", "2", "3", "4"],
  },
  "beige-t-shirt": {
    colorSlug: "beige",
    folder: "beige",
    basenames: ["1", "2", "3", "4"],
  },
  "pink-t-shirt": {
    colorSlug: "pink",
    folder: "pink",
    basenames: ["1", "2", "3", "4"],
  },
};

const artProductCount = 18;
const artFolder = "art-and-history";
const blanksCategoryImageBasename = "3";

const toPublicUrl = (filePath) => {
  const relativePath = path.relative(PUBLIC_IMAGE_ROOT, filePath);

  return `${PUBLIC_IMAGE_PREFIX}${relativePath.replace(/\\/g, "/")}`;
};

const getImageByBasename = (folderSegments, basename, options = {}) => {
  const { required = true } = options;
  const folderPath = path.join(PUBLIC_IMAGE_ROOT, ...folderSegments);

  if (!fs.existsSync(folderPath)) {
    if (!required) return "";
    throw new Error(`Missing image folder: ${folderPath}`);
  }

  const matches = fs
    .readdirSync(folderPath)
    .filter((file) => path.parse(file).name === String(basename))
    .sort();

  if (matches.length === 0) {
    if (!required) return "";
    throw new Error(`Missing image ${basename} in ${folderPath}`);
  }

  if (matches.length > 1) {
    throw new Error(
      `Ambiguous image ${basename} in ${folderPath}: ${matches.join(", ")}`
    );
  }

  return toPublicUrl(path.join(folderPath, matches[0]));
};

const getBlankProductImageUrls = (productSlug, options = {}) => {
  const config = blankProducts[productSlug];

  if (!config) {
    if (options.required === false) return [];
    throw new Error(`Unknown blank product image mapping: ${productSlug}`);
  }

  return config.basenames.map((basename) =>
    getImageByBasename(["blanks", config.folder], basename, options)
  );
};

const getArtProductImageUrl = (index, options = {}) => {
  return getImageByBasename([artFolder], String(index), options);
};

const buildLaunchProductImageMap = (options = {}) => {
  const productMap = {};

  Object.entries(blankProducts).forEach(([slug, config]) => {
    productMap[slug] = {
      colorSlug: config.colorSlug,
      images: getBlankProductImageUrls(slug, options),
    };
  });

  for (let index = 1; index <= artProductCount; index += 1) {
    productMap[`art-piece-${index}`] = {
      colorSlug: "white",
      images: [getArtProductImageUrl(index, options)],
    };
  }

  return productMap;
};

const getCategoryImageUrl = (categorySlug, options = {}) => {
  if (categorySlug === "blanks") {
    return getImageByBasename(
      ["blanks", blankProducts["black-t-shirt"].folder],
      blanksCategoryImageBasename,
      options
    );
  }

  if (categorySlug === "art-and-history") {
    return getArtProductImageUrl(1, options);
  }

  if (options.required === false) return "";
  throw new Error(`Unknown category image mapping: ${categorySlug}`);
};

const buildLaunchCategoryImageMap = (options = {}) => ({
  blanks: getCategoryImageUrl("blanks", options),
  "art-and-history": getCategoryImageUrl("art-and-history", options),
});

const listLocalImageFiles = () => {
  const files = [];

  const walk = (folderPath) => {
    if (!fs.existsSync(folderPath)) return;

    fs.readdirSync(folderPath, { withFileTypes: true }).forEach((entry) => {
      const entryPath = path.join(folderPath, entry.name);

      if (entry.isDirectory()) {
        walk(entryPath);
        return;
      }

      if (entry.isFile()) {
        files.push(toPublicUrl(entryPath));
      }
    });
  };

  walk(PUBLIC_IMAGE_ROOT);
  return files.sort();
};

module.exports = {
  PUBLIC_IMAGE_ROOT,
  artFolder,
  artProductCount,
  blankProducts,
  blanksCategoryImageBasename,
  buildLaunchCategoryImageMap,
  buildLaunchProductImageMap,
  getArtProductImageUrl,
  getBlankProductImageUrls,
  getCategoryImageUrl,
  listLocalImageFiles,
};
