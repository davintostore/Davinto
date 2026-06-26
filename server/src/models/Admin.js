const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Admin name is required."],
      trim: true,
      minlength: [2, "Admin name must be at least 2 characters."],
      maxlength: [80, "Admin name cannot exceed 80 characters."],
    },

    email: {
      type: String,
      required: [true, "Admin email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address."],
    },

    password: {
      type: String,
      required: [true, "Admin password is required."],
      minlength: [8, "Password must be at least 8 characters."],
      select: false,
    },

    role: {
      type: String,
      enum: ["owner", "admin", "staff"],
      default: "owner",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

adminSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

adminSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

adminSchema.methods.toJSON = function () {
  const admin = this.toObject();
  delete admin.password;
  return admin;
};

module.exports = mongoose.model("Admin", adminSchema);
