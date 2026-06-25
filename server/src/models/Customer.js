const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const normalizePhone = (value) => {
  if (value === null || value === undefined) return undefined;

  const cleanValue = String(value).trim();

  if (!cleanValue) return undefined;

  const normalized = cleanValue
    .replace(/[()\s.-]/g, "")
    .replace(/^00/, "+");

  return normalized;
};

const addressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      maxlength: [40, "Address label cannot exceed 40 characters."],
      default: "Address",
    },

    fullName: {
      type: String,
      trim: true,
      maxlength: [100, "Address full name cannot exceed 100 characters."],
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      set: normalizePhone,
      default: "",
    },

    secondPhone: {
      type: String,
      trim: true,
      set: normalizePhone,
      default: "",
    },

    city: {
      type: String,
      trim: true,
      maxlength: [100, "City cannot exceed 100 characters."],
      default: "",
    },

    address: {
      type: String,
      trim: true,
      maxlength: [500, "Address cannot exceed 500 characters."],
      default: "",
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Address notes cannot exceed 500 characters."],
      default: "",
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Customer name is required."],
      trim: true,
      minlength: [2, "Customer name must be at least 2 characters."],
      maxlength: [100, "Customer name cannot exceed 100 characters."],
    },

    email: {
      type: String,
      required: [true, "Customer email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address."],
    },

    phone: {
      type: String,
      trim: true,
      set: normalizePhone,
      unique: true,
      sparse: true,
      default: undefined,
    },

    password: {
      type: String,
      required: [true, "Customer password is required."],
      minlength: [8, "Password must be at least 8 characters."],
      select: false,
    },

    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
      index: true,
    },

    preferredLocale: {
      type: String,
      enum: ["en", "ar"],
      default: "en",
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    phoneVerified: {
      type: Boolean,
      default: false,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    sessionVersion: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },

    addresses: {
      type: [addressSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

customerSchema.index({ createdAt: -1 });
customerSchema.index({ status: 1, createdAt: -1 });

customerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);

  if (!this.isNew) {
    this.passwordChangedAt = new Date();
    this.sessionVersion = Number(this.sessionVersion || 0) + 1;
  }

  next();
});

customerSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

customerSchema.methods.toJSON = function () {
  const customer = this.toObject();
  delete customer.password;
  delete customer.sessionVersion;
  return customer;
};

customerSchema.statics.normalizePhone = normalizePhone;

module.exports = mongoose.model("Customer", customerSchema);
