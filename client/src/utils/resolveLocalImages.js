import {
  categoryImageOverrides,
  productImageOverrides,
} from "./localImageManifest";

const normalizeKey = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getProductSlug = (productOrItem = {}) => {
  if (typeof productOrItem === "string") {
    return normalizeKey(productOrItem);
  }

  return normalizeKey(
    productOrItem.slug ||
      productOrItem.productSlug ||
      productOrItem.product?.slug ||
      productOrItem.name ||
      productOrItem.productName ||
      ""
  );
};

const getColorKeys = (color = {}) => {
  if (!color) return [];

  if (typeof color === "string") {
    return [normalizeKey(color)].filter(Boolean);
  }

  return [color.slug, color.name, color.key, color.id]
    .map(normalizeKey)
    .filter(Boolean);
};

const getFirstOverrideColorImages = (override = {}) => {
  const firstColorKey = Object.keys(override)[0];
  return firstColorKey ? override[firstColorKey] || [] : [];
};

const getOverrideImagesForColor = (productOrItem, selectedColor) => {
  const productSlug = getProductSlug(productOrItem);
  const override = productImageOverrides[productSlug];

  if (!override) return [];

  const colorKeys = getColorKeys(selectedColor || productOrItem.color);
  const matchedColorKey = Object.keys(override).find((colorKey) =>
    colorKeys.includes(normalizeKey(colorKey))
  );

  return matchedColorKey
    ? override[matchedColorKey] || []
    : getFirstOverrideColorImages(override);
};

const normalizeImageObjects = (urls = [], fallbackAlt = "") =>
  urls
    .filter(Boolean)
    .map((url, index) => ({
      url,
      alt:
        index === 0
          ? fallbackAlt || "Davinto product"
          : `${fallbackAlt || "Davinto product"} view ${index + 1}`,
      publicId: "",
      role: index === 0 ? "primary" : index === 1 ? "hover" : "gallery",
      position: index + 1,
    }));

const sortImages = (images = []) =>
  [...images]
    .filter((image) => image?.url)
    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0));

const getFallbackProductImages = (product = {}, selectedColor) => {
  if (Array.isArray(selectedColor?.images) && selectedColor.images.length) {
    return sortImages(selectedColor.images);
  }

  return [product.primaryImage, product.hoverImage]
    .filter(Boolean)
    .map((url, index) => ({
      url,
      alt:
        index === 0
          ? product.name || "Davinto product"
          : `${product.name || "Davinto product"} view ${index + 1}`,
      role: index === 0 ? "primary" : "hover",
      position: index + 1,
    }));
};

export const getProductImageOverrides = (product) => {
  const productSlug = getProductSlug(product);
  return productImageOverrides[productSlug] || null;
};

export const getProductGalleryImages = (product = {}, selectedColor) => {
  const overrideUrls = getOverrideImagesForColor(product, selectedColor);

  if (overrideUrls.length) {
    return normalizeImageObjects(overrideUrls, product?.name);
  }

  return getFallbackProductImages(product, selectedColor);
};

export const getProductPrimaryImage = (product = {}, selectedColor) => {
  return getProductGalleryImages(product, selectedColor)[0]?.url || "";
};

export const getCategoryImage = (category = {}) => {
  const slug = normalizeKey(category?.slug);
  return categoryImageOverrides[slug] || category?.image?.url || "";
};

export const getCartItemImage = (item = {}) => {
  return getOverrideImagesForColor(item, item.color)[0] || item.image || "";
};

export const getOrderItemImage = (item = {}) => {
  return getOverrideImagesForColor(item, item.color)[0] || item.image || "";
};
