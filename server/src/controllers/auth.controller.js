const Admin = require("../models/Admin");
const asyncHandler = require("../utils/asyncHandler");
const generateToken = require("../utils/generateToken");

const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required.");
  }

  const admin = await Admin.findOne({
    email: String(email).toLowerCase().trim(),
  }).select("+password");

  if (!admin || !admin.isActive) {
    res.status(401);
    throw new Error("Invalid email or password.");
  }

  const isMatch = await admin.comparePassword(password);

  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid email or password.");
  }

  admin.lastLoginAt = new Date();
  await admin.save();

  const token = generateToken(admin._id);

  res.status(200).json({
    success: true,
    message: "Admin logged in successfully.",
    token,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
    },
  });
});

const getAdminProfile = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    admin: {
      id: req.admin._id,
      name: req.admin.name,
      email: req.admin.email,
      role: req.admin.role,
      isActive: req.admin.isActive,
      lastLoginAt: req.admin.lastLoginAt,
      createdAt: req.admin.createdAt,
    },
  });
});

module.exports = {
  loginAdmin,
  getAdminProfile,
};