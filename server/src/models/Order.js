const mongoose = require("mongoose");

const customerInfoSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required."],
      trim: true,
      maxlength: [120, "Full name cannot exceed 120 characters."],
    },

    phone: {
      type: String,
      required: [true, "Phone number is required."],
      trim: true,
      maxlength: [30, "Phone number cannot exceed 30 characters."],
    },

    secondPhone: {
      type: String,
      trim: true,
      maxlength: [30, "Second phone cannot exceed 30 characters."],
      default: "",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    city: {
      type: String,
      required: [true, "City is required."],
      trim: true,
      maxlength: [80, "City cannot exceed 80 characters."],
    },

    address: {
      type: String,
      required: [true, "Address is required."],
      trim: true,
      maxlength: [600, "Address cannot exceed 600 characters."],
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters."],
      default: "",
    },
  },
  {
    _id: false,
  }
);

const orderItemArabicTranslationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },

    colorName: {
      type: String,
      trim: true,
      default: "",
    },

    imageAlt: {
      type: String,
      trim: true,
      default: "",
    },

    shortDescription: {
      type: String,
      trim: true,
      default: "",
    },

    badges: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
  }
);

const titleDescriptionArabicTranslationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const discountCodeArabicTranslationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const paymentArabicTranslationSchema = new mongoose.Schema(
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

const deliveryArabicTranslationSchema = new mongoose.Schema(
  {
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },

      name: {
        type: String,
        trim: true,
        default: "",
      },

      slug: {
        type: String,
        trim: true,
        default: "",
      },
    },

    color: {
      id: {
        type: String,
        trim: true,
        default: "",
      },

      key: {
        type: String,
        trim: true,
        default: "",
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },

      slug: {
        type: String,
        trim: true,
        default: "",
      },

      hex: {
        type: String,
        trim: true,
        default: "",
      },
    },

    size: {
      id: {
        type: String,
        trim: true,
        default: "",
      },

      label: {
        type: String,
        required: true,
        trim: true,
      },

      sku: {
        type: String,
        trim: true,
        default: "",
      },
    },

    image: {
      type: String,
      trim: true,
      default: "",
    },

    imageAlt: {
      type: String,
      trim: true,
      default: "",
    },

    shortDescription: {
      type: String,
      trim: true,
      default: "",
    },

    badges: {
      type: [String],
      default: [],
    },

    translations: {
      ar: {
        type: orderItemArabicTranslationSchema,
        default: () => ({}),
      },
    },

    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1."],
    },

    unitPrice: {
      type: Number,
      required: true,
      min: [0, "Unit price cannot be negative."],
    },

    compareAtPrice: {
      type: Number,
      default: 0,
      min: [0, "Compare-at price cannot be negative."],
    },

    lineSubtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    lineSavings: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: true,
  }
);

const appliedOfferSchema = new mongoose.Schema(
  {
    offer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
    },

    title: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    slug: {
      type: String,
      trim: true,
      default: "",
    },

    translations: {
      ar: {
        type: titleDescriptionArabicTranslationSchema,
        default: () => ({}),
      },
    },

    discountType: {
      type: String,
      trim: true,
      default: "",
    },

    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    freeDeliveryApplied: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  }
);

const appliedBundleSchema = new mongoose.Schema(
  {
    bundle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bundle",
    },

    title: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    slug: {
      type: String,
      trim: true,
      default: "",
    },

    translations: {
      ar: {
        type: discountCodeArabicTranslationSchema,
        default: () => ({}),
      },
    },

    bundleMode: {
      type: String,
      trim: true,
      default: "",
    },

    pricingType: {
      type: String,
      trim: true,
      default: "",
    },

    requiredQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    applications: {
      type: Number,
      default: 1,
      min: 1,
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const discountCodeSnapshotSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      trim: true,
      default: "",
    },

    name: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    translations: {
      ar: {
        type: titleDescriptionArabicTranslationSchema,
        default: () => ({}),
      },
    },

    type: {
      type: String,
      enum: ["percentage", "fixed", ""],
      default: "",
    },

    value: {
      type: Number,
      default: 0,
      min: 0,
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
    },

    note: {
      type: String,
      trim: true,
      default: "",
    },

    changedBy: {
      type: String,
      enum: ["system", "admin"],
      default: "system",
    },

    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const adminActionBySchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    name: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const paymentGatewaySchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      trim: true,
      default: "",
    },

    paymobOrderId: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    paymobMerchantOrderId: {
      type: String,
      trim: true,
      default: "",
    },

    paymobTransactionId: {
      type: String,
      trim: true,
      default: "",
    },

    paymobIframeUrl: {
      type: String,
      trim: true,
      default: "",
    },

    paymobRawResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const paymentProofSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      trim: true,
      default: "",
    },

    publicId: {
      type: String,
      trim: true,
      default: "",
    },

    filename: {
      type: String,
      trim: true,
      default: "",
    },

    mimeType: {
      type: String,
      trim: true,
      default: "",
    },

    size: {
      type: Number,
      default: 0,
      min: 0,
    },

    width: {
      type: Number,
      default: 0,
      min: 0,
    },

    height: {
      type: Number,
      default: 0,
      min: 0,
    },

    format: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    lookupToken: {
      type: String,
      required: true,
      index: true,
      select: false,
    },

    // TODO(Phase 3C migration): Remove plaintext lookupToken after all
    // existing orders and external tracking links have migrated to hashes.
    // A later phase can replace permanent guest secrets with one-time or
    // rotating guest access grants if the support workflow needs them.
    lookupTokenHash: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },

    lookupTokenLast4: {
      type: String,
      trim: true,
      default: "",
      select: false,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },

    checkoutMode: {
      type: String,
      enum: ["guest", "customer"],
      default: "guest",
    },

    locale: {
      type: String,
      enum: ["en", "ar"],
      default: "en",
    },

    customerInfo: {
      type: customerInfoSchema,
      required: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator(items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "Order must contain at least one item.",
      },
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    productSavings: {
      type: Number,
      default: 0,
      min: 0,
    },

    bundleDiscountTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    offerDiscountTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    discountTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    deliveryFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    discountCode: {
      type: discountCodeSnapshotSchema,
      default: () => ({}),
    },

    appliedOffers: {
      type: [appliedOfferSchema],
      default: [],
    },

    appliedBundles: {
      type: [appliedBundleSchema],
      default: [],
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["cod", "instapay", "vodafoneCash", "paymobCard"],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: [
        "unpaid",
        "pending",
        "pending_verification",
        "paid",
        "failed",
        "expired",
        "refunded",
      ],
      default: "unpaid",
      index: true,
    },

    paymentReference: {
      type: String,
      trim: true,
      default: "",
    },

    paymentProof: {
      type: paymentProofSchema,
      default: () => ({}),
    },

    orderStatus: {
      type: String,
      enum: [
        "pending_confirmation",
        "pending_payment",
        "pending_payment_verification",
        "confirmed",
        "processing",
        "ready_to_ship",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "pending_confirmation",
      index: true,
    },

    paymentSnapshot: {
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

      translations: {
        ar: {
          type: paymentArabicTranslationSchema,
          default: () => ({}),
        },
      },
    },

    paymentGateway: {
      type: paymentGatewaySchema,
      default: () => ({}),
    },

    deliverySnapshot: {
      notes: {
        type: String,
        trim: true,
        default: "",
      },

      freeDeliveryApplied: {
        type: Boolean,
        default: false,
      },

      freeDeliveryByOffer: {
        type: Boolean,
        default: false,
      },

      freeDeliveryByThreshold: {
        type: Boolean,
        default: false,
      },

      translations: {
        ar: {
          type: deliveryArabicTranslationSchema,
          default: () => ({}),
        },
      },
    },

    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },

    adminNotes: {
      type: String,
      trim: true,
      default: "",
    },

    stockRestoredAt: {
      type: Date,
      default: null,
      index: true,
    },

    stockRestoredBy: {
      type: adminActionBySchema,
      default: () => ({}),
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [1000, "Cancellation reason cannot exceed 1000 characters."],
      default: "",
    },

    cancelledBy: {
      type: adminActionBySchema,
      default: () => ({}),
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },

    deletedBy: {
      type: adminActionBySchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.pre("validate", function () {
  this.checkoutMode = this.customer ? "customer" : "guest";
});

orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderStatus: 1, paymentStatus: 1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ deletedAt: 1, createdAt: -1 });
orderSchema.index({
  "customerInfo.phone": 1,
  "customerInfo.email": 1,
});

module.exports = mongoose.model("Order", orderSchema);
