const SiteSettings = require("../models/SiteSettings");
const asyncHandler = require("../utils/asyncHandler");

const normalizeText = (value = "") => {
  return String(value ?? "").trim();
};

const firstDefined = (...values) => {
  return values.find((value) => value !== undefined && value !== null);
};

const normalizePaymentMethod = (method = {}, fallback = {}) => {
  return {
    enabled:
      method.enabled === undefined
        ? Boolean(fallback.enabled)
        : Boolean(method.enabled),
    label:
      normalizeText(firstDefined(method.label, fallback.label)) ||
      normalizeText(fallback.label),
    instructions: normalizeText(
      firstDefined(method.instructions, fallback.instructions)
    ),
  };
};

const serializePaymentMethod = (method = {}) => {
  return {
    enabled: Boolean(method.enabled),
    label: normalizeText(method.label),
    instructions: normalizeText(method.instructions),
  };
};

const serializeTranslatedPaymentMethod = (method = {}) => {
  return {
    label: normalizeText(method.label),
    instructions: normalizeText(method.instructions),
  };
};

const serializeTranslations = (translations = {}) => {
  const source =
    translations && typeof translations === "object" ? translations : {};
  const arabic = source.ar || {};

  return {
    ar: {
      store: {
        name: normalizeText(arabic.store?.name),
        address: normalizeText(arabic.store?.address),
      },
      delivery: {
        notes: normalizeText(arabic.delivery?.notes),
      },
      payments: {
        cod: serializeTranslatedPaymentMethod(arabic.payments?.cod),
        instapay: serializeTranslatedPaymentMethod(arabic.payments?.instapay),
        vodafoneCash: serializeTranslatedPaymentMethod(
          arabic.payments?.vodafoneCash
        ),
        paymobCard: serializeTranslatedPaymentMethod(
          arabic.payments?.paymobCard
        ),
      },
      manualPayment: {
        instapayLabel: normalizeText(arabic.manualPayment?.instapayLabel),
        instapayInstructions: normalizeText(
          arabic.manualPayment?.instapayInstructions
        ),
        vodafoneCashLabel: normalizeText(
          arabic.manualPayment?.vodafoneCashLabel
        ),
        vodafoneCashInstructions: normalizeText(
          arabic.manualPayment?.vodafoneCashInstructions
        ),
      },
    },
  };
};

const serializeSettings = (settings) => {
  const currencyCode = normalizeText(settings.currency).toUpperCase() || "EGP";
  const currencySymbol =
    normalizeText(settings.currencySymbol) || currencyCode;

  const contract = {
    store: {
      name: normalizeText(settings.storeName) || "Davinto",
      email: normalizeText(settings.storeEmail).toLowerCase(),
      phone: normalizeText(settings.storePhone),
      whatsapp: normalizeText(settings.whatsappNumber),
      address: normalizeText(settings.storeAddress),
    },
    socials: {
      instagram: normalizeText(settings.instagramUrl),
      facebook: normalizeText(settings.facebookUrl),
      tiktok: normalizeText(settings.tiktokUrl),
    },
    currency: {
      code: currencyCode,
      symbol: currencySymbol,
    },
    delivery: {
      baseFee: Number(settings.delivery?.baseFee || 0),
      freeDeliveryThreshold: Number(
        settings.delivery?.freeDeliveryThreshold || 0
      ),
      notes: normalizeText(settings.delivery?.notes),
    },
    payments: {
      cod: serializePaymentMethod(settings.payments?.cod),
      instapay: serializePaymentMethod(settings.payments?.instapay),
      vodafoneCash: serializePaymentMethod(settings.payments?.vodafoneCash),
      paymobCard: serializePaymentMethod(settings.payments?.paymobCard),
    },
    manualPayment: {
      instapayHandle: normalizeText(settings.manualPayment?.instapayHandle),
      instapayQrImage: normalizeText(settings.manualPayment?.instapayQrImage),
      vodafoneCashNumber: normalizeText(
        settings.manualPayment?.vodafoneCashNumber
      ),
      vodafoneCashQrImage: normalizeText(
        settings.manualPayment?.vodafoneCashQrImage
      ),
      requireTransactionReference:
        settings.manualPayment?.requireTransactionReference !== false,
      requireProofImage: Boolean(
        settings.manualPayment?.requireProofImage
      ),
    },
    translations: serializeTranslations(settings.translations),
    tracking: {
      metaPixelId: normalizeText(settings.tracking?.metaPixelId),
      enableMetaPixel: Boolean(settings.tracking?.enableMetaPixel),
    },
    lowStockThreshold: Number(settings.lowStockThreshold || 0),
  };

  // Legacy flat aliases remain during the transition so existing consumers do
  // not lose settings while the nested admin/public contract becomes canonical.
  return {
    ...contract,
    storeName: contract.store.name,
    storeEmail: contract.store.email,
    storePhone: contract.store.phone,
    whatsappNumber: contract.store.whatsapp,
    storeAddress: contract.store.address,
    instagramUrl: contract.socials.instagram,
    facebookUrl: contract.socials.facebook,
    tiktokUrl: contract.socials.tiktok,
    currencyCode: contract.currency.code,
    currencySymbol: contract.currency.symbol,
  };
};

const normalizeSettingsPayload = (body = {}, settings) => {
  const current = serializeSettings(settings);
  const store = body.store || {};
  const socials = body.socials || {};
  const currency =
    typeof body.currency === "string"
      ? { code: body.currency }
      : body.currency || {};
  const currentTranslations = current.translations;
  const arabic = body.translations?.ar;
  const currentArabic = currentTranslations.ar;

  return {
    storeName:
      normalizeText(
        firstDefined(store.name, body.storeName, current.store.name)
      ) || "Davinto",
    storeEmail: normalizeText(
      firstDefined(store.email, body.storeEmail, current.store.email)
    ).toLowerCase(),
    storePhone: normalizeText(
      firstDefined(store.phone, body.storePhone, current.store.phone)
    ),
    whatsappNumber: normalizeText(
      firstDefined(
        store.whatsapp,
        body.whatsappNumber,
        current.store.whatsapp
      )
    ),
    storeAddress: normalizeText(
      firstDefined(store.address, body.storeAddress, current.store.address)
    ),
    instagramUrl: normalizeText(
      firstDefined(
        socials.instagram,
        body.instagramUrl,
        current.socials.instagram
      )
    ),
    facebookUrl: normalizeText(
      firstDefined(
        socials.facebook,
        body.facebookUrl,
        current.socials.facebook
      )
    ),
    tiktokUrl: normalizeText(
      firstDefined(socials.tiktok, body.tiktokUrl, current.socials.tiktok)
    ),
    currency:
      normalizeText(
        firstDefined(currency.code, body.currencyCode, current.currency.code)
      ).toUpperCase() || "EGP",
    currencySymbol:
      normalizeText(
        firstDefined(
          currency.symbol,
          body.currencySymbol,
          current.currency.symbol
        )
      ) || "EGP",
    delivery: {
      baseFee: Math.max(
        0,
        Number(
          firstDefined(
            body.delivery?.baseFee,
            current.delivery.baseFee,
            0
          )
        )
      ),
      freeDeliveryThreshold: Math.max(
        0,
        Number(
          firstDefined(
            body.delivery?.freeDeliveryThreshold,
            current.delivery.freeDeliveryThreshold,
            0
          )
        )
      ),
      notes: normalizeText(
        firstDefined(body.delivery?.notes, current.delivery.notes)
      ),
    },
    payments: {
      cod: normalizePaymentMethod(body.payments?.cod, current.payments.cod),
      instapay: normalizePaymentMethod(
        body.payments?.instapay,
        current.payments.instapay
      ),
      vodafoneCash: normalizePaymentMethod(
        body.payments?.vodafoneCash,
        current.payments.vodafoneCash
      ),
      paymobCard: normalizePaymentMethod(
        body.payments?.paymobCard,
        current.payments.paymobCard
      ),
    },
    manualPayment: {
      instapayHandle: normalizeText(
        firstDefined(
          body.manualPayment?.instapayHandle,
          current.manualPayment.instapayHandle
        )
      ),
      instapayQrImage: normalizeText(
        firstDefined(
          body.manualPayment?.instapayQrImage,
          current.manualPayment.instapayQrImage
        )
      ),
      vodafoneCashNumber: normalizeText(
        firstDefined(
          body.manualPayment?.vodafoneCashNumber,
          current.manualPayment.vodafoneCashNumber
        )
      ),
      vodafoneCashQrImage: normalizeText(
        firstDefined(
          body.manualPayment?.vodafoneCashQrImage,
          current.manualPayment.vodafoneCashQrImage
        )
      ),
      requireTransactionReference:
        body.manualPayment?.requireTransactionReference === undefined
          ? current.manualPayment.requireTransactionReference
          : body.manualPayment.requireTransactionReference !== false,
      requireProofImage:
        body.manualPayment?.requireProofImage === undefined
          ? current.manualPayment.requireProofImage
          : Boolean(body.manualPayment.requireProofImage),
    },
    translations: {
      ar: {
        store: {
          name: normalizeText(
            firstDefined(arabic?.store?.name, currentArabic.store.name)
          ),
          address: normalizeText(
            firstDefined(arabic?.store?.address, currentArabic.store.address)
          ),
        },
        delivery: {
          notes: normalizeText(
            firstDefined(
              arabic?.delivery?.notes,
              currentArabic.delivery.notes
            )
          ),
        },
        payments: {
          cod: {
            label: normalizeText(
              firstDefined(
                arabic?.payments?.cod?.label,
                currentArabic.payments.cod.label
              )
            ),
            instructions: normalizeText(
              firstDefined(
                arabic?.payments?.cod?.instructions,
                currentArabic.payments.cod.instructions
              )
            ),
          },
          instapay: {
            label: normalizeText(
              firstDefined(
                arabic?.payments?.instapay?.label,
                currentArabic.payments.instapay.label
              )
            ),
            instructions: normalizeText(
              firstDefined(
                arabic?.payments?.instapay?.instructions,
                currentArabic.payments.instapay.instructions
              )
            ),
          },
          vodafoneCash: {
            label: normalizeText(
              firstDefined(
                arabic?.payments?.vodafoneCash?.label,
                currentArabic.payments.vodafoneCash.label
              )
            ),
            instructions: normalizeText(
              firstDefined(
                arabic?.payments?.vodafoneCash?.instructions,
                currentArabic.payments.vodafoneCash.instructions
              )
            ),
          },
          paymobCard: {
            label: normalizeText(
              firstDefined(
                arabic?.payments?.paymobCard?.label,
                currentArabic.payments.paymobCard.label
              )
            ),
            instructions: normalizeText(
              firstDefined(
                arabic?.payments?.paymobCard?.instructions,
                currentArabic.payments.paymobCard.instructions
              )
            ),
          },
        },
        manualPayment: {
          instapayLabel: normalizeText(
            firstDefined(
              arabic?.manualPayment?.instapayLabel,
              currentArabic.manualPayment.instapayLabel
            )
          ),
          instapayInstructions: normalizeText(
            firstDefined(
              arabic?.manualPayment?.instapayInstructions,
              currentArabic.manualPayment.instapayInstructions
            )
          ),
          vodafoneCashLabel: normalizeText(
            firstDefined(
              arabic?.manualPayment?.vodafoneCashLabel,
              currentArabic.manualPayment.vodafoneCashLabel
            )
          ),
          vodafoneCashInstructions: normalizeText(
            firstDefined(
              arabic?.manualPayment?.vodafoneCashInstructions,
              currentArabic.manualPayment.vodafoneCashInstructions
            )
          ),
        },
      },
    },
    tracking: {
      metaPixelId: normalizeText(
        firstDefined(
          body.tracking?.metaPixelId,
          current.tracking.metaPixelId
        )
      ),
      enableMetaPixel:
        body.tracking?.enableMetaPixel === undefined
          ? current.tracking.enableMetaPixel
          : Boolean(body.tracking.enableMetaPixel),
    },
    lowStockThreshold: Math.max(
      0,
      Number(
        firstDefined(
          body.lowStockThreshold,
          current.lowStockThreshold,
          0
        )
      )
    ),
  };
};

const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await SiteSettings.getSingleton();

  res.status(200).json({
    success: true,
    settings: serializeSettings(settings),
  });
});

const getAdminSettings = asyncHandler(async (req, res) => {
  const settings = await SiteSettings.getSingleton();

  res.status(200).json({
    success: true,
    settings: serializeSettings(settings),
  });
});

const updateAdminSettings = asyncHandler(async (req, res) => {
  const settings = await SiteSettings.getSingleton();
  const payload = normalizeSettingsPayload(req.body, settings);

  settings.storeName = payload.storeName;
  settings.storeEmail = payload.storeEmail;
  settings.storePhone = payload.storePhone;
  settings.whatsappNumber = payload.whatsappNumber;
  settings.storeAddress = payload.storeAddress;
  settings.instagramUrl = payload.instagramUrl;
  settings.facebookUrl = payload.facebookUrl;
  settings.tiktokUrl = payload.tiktokUrl;
  settings.currency = payload.currency;
  settings.currencySymbol = payload.currencySymbol;
  settings.delivery = payload.delivery;
  settings.payments = payload.payments;
  settings.manualPayment = payload.manualPayment;
  settings.translations = payload.translations;
  settings.tracking = payload.tracking;
  settings.lowStockThreshold = payload.lowStockThreshold;

  await settings.save();

  res.status(200).json({
    success: true,
    message: "Settings updated successfully.",
    settings: serializeSettings(settings),
  });
});

module.exports = {
  getPublicSettings,
  getAdminSettings,
  updateAdminSettings,
};
