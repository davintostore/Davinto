const mongoose = require("mongoose");

const bundleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Bundle title is required."],
      trim: true,
      maxlength: [120, "Bundle title cannot exceed 120 characters."],
    },

    slug: {
      type: String,
      required: [true, "Bundle slug is required."],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [140, "Bundle slug cannot exceed 140 characters."],
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Bundle description cannot exceed 1000 characters."],
    },

    translations: {
      ar: {
        title: {
          type: String,
          trim: true,
          default: "",
          maxlength: [120, "Arabic bundle title cannot exceed 120 characters."],
        },

        description: {
          type: String,
          trim: true,
          default: "",
          maxlength: [
            1000,
            "Arabic bundle description cannot exceed 1000 characters.",
          ],
        },
      },
    },

    bundleMode: {
      type: String,
      enum: ["anyProducts", "specificProducts"],
      default: "anyProducts",
      index: true,
    },

    eligibleScope: {
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

    requiredQuantity: {
      type: Number,
      required: true,
      default: 2,
      min: [2, "Bundle required quantity must be at least 2."],
    },

    pricingType: {
      type: String,
      enum: ["fixedBundlePrice", "percentageOff", "fixedDiscount"],
      required: true,
      default: "fixedBundlePrice",
    },

    bundlePrice: {
      type: Number,
      default: 0,
      min: [0, "Bundle price cannot be negative."],
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

    allowMultipleApplications: {
      type: Boolean,
      default: true,
    },

    stackable: {
      type: Boolean,
      default: false,
    },

    priority: {
      type: Number,
      default: 0,
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

bundleSchema.pre("validate", function validateBundle() {
  if (this.bundleMode === "specificProducts") {
    this.eligibleScope = "products";
    this.categories = [];
  }

  if (this.bundleMode === "anyProducts") {
    if (this.eligibleScope === "all") {
      this.categories = [];
      this.products = [];
    }

    if (this.eligibleScope === "categories") {
      this.products = [];
    }

    if (this.eligibleScope === "products") {
      this.categories = [];
    }
  }

  if (this.pricingType === "fixedBundlePrice") {
    this.discountValue = 0;
    this.maxDiscountAmount = 0;
  }

  if (this.pricingType !== "fixedBundlePrice") {
    this.bundlePrice = 0;
  }

  if (this.pricingType === "percentageOff" && this.discountValue > 100) {
    this.invalidate(
      "discountValue",
      "Percentage bundle discount cannot be greater than 100%."
    );
  }

  if (this.startsAt && this.endsAt && this.startsAt > this.endsAt) {
    this.invalidate("endsAt", "End date cannot be before start date.");
  }

});

bundleSchema.virtual("remainingUses").get(function getRemainingUses() {
  if (!this.usageLimit) return null;
  return Math.max(this.usageLimit - this.usedCount, 0);
});

bundleSchema.set("toJSON", { virtuals: true });
bundleSchema.set("toObject", { virtuals: true });

bundleSchema.index({ status: 1, startsAt: 1, endsAt: 1 });
bundleSchema.index({ bundleMode: 1, eligibleScope: 1, priority: -1 });

module.exports = mongoose.model("Bundle", bundleSchema);
