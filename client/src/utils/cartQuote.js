export const buildQuoteItems = (items = []) => {
  return items.map((item) => ({
    productId: item.productId,
    color: {
      id: item.color?.id || "",
      key: item.color?.key || "",
      name: item.color?.name || "",
      slug: item.color?.slug || "",
    },
    size: {
      id: item.size?.id || "",
      label: item.size?.label || "",
      sku: item.size?.sku || "",
    },
    quantity: Number(item.quantity || 1),
  }));
};

export const buildQuoteItemKey = (item = {}) => {
  return `${item.product || item.productId}__${
    item.color?.key || item.color?.name
  }__${item.size?.label}`;
};

export const buildQuoteItemsByKey = (quote) => {
  const entries = quote?.items || [];

  return new Map(entries.map((item) => [buildQuoteItemKey(item), item]));
};

export const buildCartQuoteSignature = ({
  items = [],
  discountCode = "",
  deliveryZone = "",
} = {}) => {
  const normalizedItems = items
    .map((item) => ({
      productId: String(item.productId || item.product || ""),
      colorId: String(item.color?.id || ""),
      colorKey: String(item.color?.key || ""),
      colorName: String(item.color?.name || ""),
      colorSlug: String(item.color?.slug || ""),
      sizeId: String(item.size?.id || ""),
      sizeLabel: String(item.size?.label || ""),
      sizeSku: String(item.size?.sku || ""),
      quantity: Number(item.quantity || 0),
    }))
    .sort((a, b) =>
      [
        "productId",
        "colorId",
        "colorKey",
        "colorName",
        "colorSlug",
        "sizeId",
        "sizeLabel",
        "sizeSku",
      ].reduce((result, key) => {
        if (result !== 0) return result;
        return a[key].localeCompare(b[key], "en");
      }, 0)
    );

  return JSON.stringify({
    items: normalizedItems,
    discountCode: String(discountCode || "").trim().toUpperCase(),
    deliveryZone: String(deliveryZone || "").trim(),
  });
};
