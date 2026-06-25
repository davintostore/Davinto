const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Offer title is required."],
      trim: true,
      maxlength: [120, "Offer title cannot exceed 120 characters."],
    },

    slug: {
      type: String,
      required: [true, "Offer slug is required."],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [140, "Offer slug cannot exceed 140 characters."],
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Offer description cannot exceed 1000 characters."],
    },

    translations: {
      ar: {
        title: {
          type: String,
          trim: true,
          default: "",
          maxlength: [120, "Arabic offer title cannot exceed 120 characters."],
        },

        description: {
          type: String,
          trim: true,
          default: "",
          maxlength: [
            1000,
            "Arabic offer description cannot exceed 1000 characters.",
          ],
        },
      },
    },

    discountType: {
      type: String,
      enum: ["percentage", "fixed", "freeDelivery"],
      required: true,
      default: "percentage",
    },

    discountValue: {
      type: Number,
      default: 0,
      min: [0, "Discount value cannot be negative."],
    },

    maxDiscountAmount: {
      type: Number,
      default: 0,
      min: [0, "Maximum discount amount cannot be negative."],
    },

    scope: {
      type: String,
      enum: ["all", "categories", "products"],
      default: "all",
      index: true,
    },

    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],

    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    minSubtotal: {
      type: Number,
      default: 0,
      min: [0, "Minimum subtotal cannot be negative."],
    },

    minQuantity: {
      type: Number,
      default: 0,
      min: [0, "Minimum quantity cannot be negative."],
    },

    priority: {
      type: Number,
      default: 0,
    },

    stackable: {
      type: Boolean,
      default: false,
    },

    startsAt: {
      type: Date,
      default: null,
    },

    endsAt: {
      type: Date,
      default: null,
    },

    usageLimit: {
      type: Number,
      default: 0,
      min: [0, "Usage limit cannot be negative."],
    },

    usedCount: {
      type: Number,
      default: 0,
      min: [0, "Used count cannot be negative."],
    },

    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "draft",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

offerSchema.pre("validate", function validateOffer() {
  if (this.discountType === "freeDelivery") {
    this.discountValue = 0;
    this.maxDiscountAmount = 0;
  }

  if (this.discountType === "percentage" && this.discountValue > 100) {
    this.invalidate(
      "discountValue",
      "Percentage offer cannot be greater than 100%."
    );
  }

  if (this.scope === "all") {
    this.categories = [];
    this.products = [];
  }

  if (this.scope === "categories") {
    this.products = [];
  }

  if (this.scope === "products") {
    this.categories = [];
  }

  if (this.startsAt && this.endsAt && this.startsAt > this.endsAt) {
    this.invalidate("endsAt", "End date cannot be before start date.");
  }

});

offerSchema.virtual("remainingUses").get(function getRemainingUses() {
  if (!this.usageLimit) return null;
  return Math.max(this.usageLimit - this.usedCount, 0);
});

offerSchema.set("toJSON", { virtuals: true });
offerSchema.set("toObject", { virtuals: true });

offerSchema.index({ slug: 1 }, { unique: true });
offerSchema.index({ status: 1, startsAt: 1, endsAt: 1 });
offerSchema.index({ scope: 1, priority: -1 });

module.exports = mongoose.model("Offer", offerSchema);
