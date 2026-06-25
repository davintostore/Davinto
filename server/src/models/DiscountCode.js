const mongoose = require("mongoose");

const discountCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Discount code is required."],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [40, "Discount code cannot exceed 40 characters."],
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

    type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
      default: "percentage",
    },

    value: {
      type: Number,
      required: true,
      min: [0, "Discount value cannot be negative."],
    },

    maxDiscountAmount: {
      type: Number,
      default: 0,
      min: [0, "Maximum discount cannot be negative."],
    },

    minSubtotal: {
      type: Number,
      default: 0,
      min: [0, "Minimum subtotal cannot be negative."],
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

    startsAt: {
      type: Date,
      default: null,
    },

    endsAt: {
      type: Date,
      default: null,
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

discountCodeSchema.pre("validate", function normalizeCode(next) {
  if (this.code) {
    this.code = String(this.code).trim().toUpperCase().replace(/\s+/g, "");
  }

  next();
});

discountCodeSchema.virtual("remainingUses").get(function getRemainingUses() {
  if (!this.usageLimit) return null;
  return Math.max(this.usageLimit - this.usedCount, 0);
});

discountCodeSchema.set("toJSON", { virtuals: true });
discountCodeSchema.set("toObject", { virtuals: true });

discountCodeSchema.index({ code: 1 }, { unique: true });
discountCodeSchema.index({ status: 1, startsAt: 1, endsAt: 1 });

module.exports = mongoose.model("DiscountCode", discountCodeSchema);