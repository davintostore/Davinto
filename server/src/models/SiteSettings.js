const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },

    label: {
      type: String,
      trim: true,
      default: "",
    },

    instructions: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const translatedPaymentMethodSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      default: "",
    },

    instructions: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const siteSettingsSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      trim: true,
      default: "Davinto",
    },

    storeEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    storePhone: {
      type: String,
      trim: true,
      default: "",
    },

    whatsappNumber: {
      type: String,
      trim: true,
      default: "",
    },

    storeAddress: {
      type: String,
      trim: true,
      default: "",
    },

    instagramUrl: {
      type: String,
      trim: true,
      default: "",
    },

    facebookUrl: {
      type: String,
      trim: true,
      default: "",
    },

    tiktokUrl: {
      type: String,
      trim: true,
      default: "",
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "EGP",
    },

    currencySymbol: {
      type: String,
      trim: true,
      default: "EGP",
    },

    delivery: {
      baseFee: {
        type: Number,
        default: 0,
        min: 0,
      },

      freeDeliveryThreshold: {
        type: Number,
        default: 0,
        min: 0,
      },

      notes: {
        type: String,
        trim: true,
        default: "",
      },
    },

    payments: {
      cod: {
        type: paymentMethodSchema,
        default: () => ({
          enabled: true,
          label: "Cash on Delivery",
          instructions: "Pay when your order arrives.",
        }),
      },

      instapay: {
        type: paymentMethodSchema,
        default: () => ({
          enabled: true,
          label: "Instapay",
          instructions: "",
        }),
      },

      vodafoneCash: {
        type: paymentMethodSchema,
        default: () => ({
          enabled: true,
          label: "Vodafone Cash",
          instructions: "",
        }),
      },

      paymobCard: {
        type: paymentMethodSchema,
        default: () => ({
          enabled: false,
          label: "Visa / Mastercard",
          instructions: "Pay securely online by card.",
        }),
      },
    },

    manualPayment: {
      instapayHandle: {
        type: String,
        trim: true,
        default: "",
      },

      instapayQrImage: {
        type: String,
        trim: true,
        default: "",
      },

      vodafoneCashNumber: {
        type: String,
        trim: true,
        default: "",
      },

      vodafoneCashQrImage: {
        type: String,
        trim: true,
        default: "",
      },

      requireTransactionReference: {
        type: Boolean,
        default: true,
      },

      requireProofImage: {
        type: Boolean,
        default: false,
      },
    },

    translations: {
      ar: {
        store: {
          name: {
            type: String,
            trim: true,
            default: "",
          },

          address: {
            type: String,
            trim: true,
            default: "",
          },
        },

        delivery: {
          notes: {
            type: String,
            trim: true,
            default: "",
          },
        },

        payments: {
          cod: {
            type: translatedPaymentMethodSchema,
            default: () => ({}),
          },

          instapay: {
            type: translatedPaymentMethodSchema,
            default: () => ({}),
          },

          vodafoneCash: {
            type: translatedPaymentMethodSchema,
            default: () => ({}),
          },

          paymobCard: {
            type: translatedPaymentMethodSchema,
            default: () => ({}),
          },
        },

        manualPayment: {
          instapayLabel: {
            type: String,
            trim: true,
            default: "",
          },

          instapayInstructions: {
            type: String,
            trim: true,
            default: "",
          },

          vodafoneCashLabel: {
            type: String,
            trim: true,
            default: "",
          },

          vodafoneCashInstructions: {
            type: String,
            trim: true,
            default: "",
          },
        },
      },
    },

    tracking: {
      metaPixelId: {
        type: String,
        trim: true,
        default: "",
      },

      enableMetaPixel: {
        type: Boolean,
        default: false,
      },
    },

    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

siteSettingsSchema.statics.getSingleton = async function () {
  let settings = await this.findOne();

  if (!settings) {
    settings = await this.create({});
  }

  return settings;
};

module.exports = mongoose.model("SiteSettings", siteSettingsSchema);
