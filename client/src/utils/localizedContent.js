const isArabic = (language) =>
  String(language || "")
    .toLowerCase()
    .startsWith("ar");

const hasText = (value) => Boolean(String(value || "").trim());

export const getLocalizedImageAlt = (
  image,
  fallback = "",
  language = "en"
) => {
  if (isArabic(language) && hasText(image?.translations?.ar?.alt)) {
    return image.translations.ar.alt;
  }

  return image?.alt || fallback || "";
};

export const getLocalizedColor = (color, language = "en") => {
  if (!color) return color;

  const localizedName =
    isArabic(language) && hasText(color.translations?.ar?.name)
      ? color.translations.ar.name
      : color.name;

  return {
    ...color,
    name: localizedName,
    images: Array.isArray(color.images)
      ? color.images.map((image) => ({
          ...image,
          alt: getLocalizedImageAlt(image, localizedName, language),
        }))
      : [],
  };
};

export const getLocalizedBadges = (product, language = "en") => {
  const arabicBadges = product?.translations?.ar?.badges;

  if (
    isArabic(language) &&
    Array.isArray(arabicBadges) &&
    arabicBadges.some(hasText)
  ) {
    return arabicBadges.map((badge) => String(badge).trim()).filter(Boolean);
  }

  return Array.isArray(product?.badges) ? [...product.badges] : [];
};

export const getLocalizedCategory = (category, language = "en") => {
  if (!category) return category;

  const arabic = category.translations?.ar;

  return {
    ...category,
    name:
      isArabic(language) && hasText(arabic?.name)
        ? arabic.name
        : category.name,
    description:
      isArabic(language) && hasText(arabic?.description)
        ? arabic.description
        : category.description,
    seo: {
      ...(category.seo || {}),
      title:
        isArabic(language) && hasText(arabic?.seo?.title)
          ? arabic.seo.title
          : category.seo?.title || "",
      description:
        isArabic(language) && hasText(arabic?.seo?.description)
          ? arabic.seo.description
          : category.seo?.description || "",
    },
  };
};

export const getLocalizedProduct = (product, language = "en") => {
  if (!product) return product;

  const arabic = product.translations?.ar;
  const localizedCare =
    isArabic(language) && hasText(arabic?.care)
      ? arabic.care
      : product.careInstructions || product.care || "";

  return {
    ...product,
    name:
      isArabic(language) && hasText(arabic?.name)
        ? arabic.name
        : product.name,
    shortDescription:
      isArabic(language) && hasText(arabic?.shortDescription)
        ? arabic.shortDescription
        : product.shortDescription,
    description:
      isArabic(language) && hasText(arabic?.description)
        ? arabic.description
        : product.description,
    fabric:
      isArabic(language) && hasText(arabic?.fabric)
        ? arabic.fabric
        : product.fabric,
    fit:
      isArabic(language) && hasText(arabic?.fit)
        ? arabic.fit
        : product.fit,
    care: localizedCare,
    careInstructions: localizedCare,
    badges: getLocalizedBadges(product, language),
    seo: {
      ...(product.seo || {}),
      title:
        isArabic(language) && hasText(arabic?.seo?.title)
          ? arabic.seo.title
          : product.seo?.title || "",
      description:
        isArabic(language) && hasText(arabic?.seo?.description)
          ? arabic.seo.description
          : product.seo?.description || "",
    },
    category: getLocalizedCategory(product.category, language),
    colors: Array.isArray(product.colors)
      ? product.colors.map((color) => getLocalizedColor(color, language))
      : [],
  };
};

export const getLocalizedPaymentMethod = (
  settings,
  method,
  language = "en"
) => {
  const payment = settings?.payments?.[method];
  if (!payment) return payment;

  const arabicPayment = settings?.translations?.ar?.payments?.[method];

  return {
    ...payment,
    label:
      isArabic(language) && hasText(arabicPayment?.label)
        ? arabicPayment.label
        : payment.label,
    instructions:
      isArabic(language) && hasText(arabicPayment?.instructions)
        ? arabicPayment.instructions
        : payment.instructions,
  };
};

export const getLocalizedDelivery = (settings, language = "en") => {
  const delivery = settings?.delivery;
  if (!delivery) return delivery;

  const arabicDelivery = settings?.translations?.ar?.delivery;

  return {
    ...delivery,
    notes:
      isArabic(language) && hasText(arabicDelivery?.notes)
        ? arabicDelivery.notes
        : delivery.notes,
  };
};

export const getLocalizedSettings = (settings, language = "en") => {
  if (!settings) return settings;

  const arabic = settings.translations?.ar;
  const payments = Object.fromEntries(
    ["cod", "instapay", "vodafoneCash", "paymobCard"].map((method) => [
      method,
      getLocalizedPaymentMethod(settings, method, language),
    ])
  );

  return {
    ...settings,
    store: {
      ...(settings.store || {}),
      name:
        isArabic(language) && hasText(arabic?.store?.name)
          ? arabic.store.name
          : settings.store?.name || settings.storeName || "",
      address:
        isArabic(language) && hasText(arabic?.store?.address)
          ? arabic.store.address
          : settings.store?.address || settings.storeAddress || "",
    },
    delivery: getLocalizedDelivery(settings, language),
    payments,
    manualPayment: {
      ...(settings.manualPayment || {}),
      detailLabels: {
        instapay:
          isArabic(language) && hasText(arabic?.manualPayment?.instapayLabel)
            ? arabic.manualPayment.instapayLabel
            : "",
        vodafoneCash:
          isArabic(language) &&
          hasText(arabic?.manualPayment?.vodafoneCashLabel)
            ? arabic.manualPayment.vodafoneCashLabel
            : "",
      },
      detailInstructions: {
        instapay:
          isArabic(language) &&
          hasText(arabic?.manualPayment?.instapayInstructions)
            ? arabic.manualPayment.instapayInstructions
            : "",
        vodafoneCash:
          isArabic(language) &&
          hasText(arabic?.manualPayment?.vodafoneCashInstructions)
            ? arabic.manualPayment.vodafoneCashInstructions
            : "",
      },
    },
  };
};

export const getLocalizedOffer = (offer, language = "en") => {
  if (!offer) return offer;

  const arabic = offer.translations?.ar;

  return {
    ...offer,
    title:
      isArabic(language) && hasText(arabic?.title)
        ? arabic.title
        : offer.title,
    description:
      isArabic(language) && hasText(arabic?.description)
        ? arabic.description
        : offer.description,
  };
};

export const getLocalizedBundle = (bundle, language = "en") => {
  if (!bundle) return bundle;

  const arabic = bundle.translations?.ar;

  return {
    ...bundle,
    title:
      isArabic(language) && hasText(arabic?.title)
        ? arabic.title
        : bundle.title,
    description:
      isArabic(language) && hasText(arabic?.description)
        ? arabic.description
        : bundle.description,
  };
};

export const getLocalizedOrderItem = (item, language = "en") => {
  if (!item) return item;

  const arabic = item.translations?.ar;
  const localizedName =
    isArabic(language) && hasText(arabic?.name) ? arabic.name : item.name;
  const localizedColorName =
    isArabic(language) && hasText(arabic?.colorName)
      ? arabic.colorName
      : item.color?.name || "";
  const localizedImageAlt =
    isArabic(language) && hasText(arabic?.imageAlt)
      ? arabic.imageAlt
      : item.imageAlt || localizedName || item.name || "";
  const localizedBadges =
    isArabic(language) &&
    Array.isArray(arabic?.badges) &&
    arabic.badges.some(hasText)
      ? arabic.badges.map((badge) => String(badge).trim()).filter(Boolean)
      : Array.isArray(item.badges)
        ? [...item.badges]
        : [];

  return {
    ...item,
    name: localizedName,
    imageAlt: localizedImageAlt,
    shortDescription:
      isArabic(language) && hasText(arabic?.shortDescription)
        ? arabic.shortDescription
        : item.shortDescription || "",
    badges: localizedBadges,
    color: {
      ...(item.color || {}),
      name: localizedColorName,
    },
  };
};

export const getLocalizedAppliedOffer = (offer, language = "en") =>
  getLocalizedOffer(offer, language);

export const getLocalizedAppliedBundle = (bundle, language = "en") =>
  getLocalizedBundle(bundle, language);

export const getLocalizedPaymentSnapshot = (snapshot, language = "en") => {
  if (!snapshot) return snapshot;

  const arabic = snapshot.translations?.ar;

  return {
    ...snapshot,
    label:
      isArabic(language) && hasText(arabic?.label)
        ? arabic.label
        : snapshot.label || "",
    instructions:
      isArabic(language) && hasText(arabic?.instructions)
        ? arabic.instructions
        : snapshot.instructions || "",
  };
};

export const getLocalizedDeliverySnapshot = (snapshot, language = "en") => {
  if (!snapshot) return snapshot;

  const arabic = snapshot.translations?.ar;

  return {
    ...snapshot,
    notes:
      isArabic(language) && hasText(arabic?.notes)
        ? arabic.notes
        : snapshot.notes || "",
  };
};
