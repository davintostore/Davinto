const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const asyncHandler = require("../utils/asyncHandler");

const protectAdmin = asyncHandler(async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized. No token provided.");
  }

  if (!process.env.JWT_SECRET) {
    res.status(500);
    throw new Error("JWT_SECRET is missing.");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const admin = await Admin.findById(decoded.id);

  if (!admin || !admin.isActive) {
    res.status(401);
    throw new Error("Not authorized. Admin account is inactive or does not exist.");
  }

  req.admin = admin;

  next();
});

const requireOwnerOrAdmin = (req, res, next) => {
  if (!req.admin || !["owner", "admin"].includes(req.admin.role)) {
    res.status(403);
    throw new Error("Forbidden. Owner or admin access required.");
  }

  next();
};

module.exports = {
  protectAdmin,
  requireOwnerOrAdmin,
};