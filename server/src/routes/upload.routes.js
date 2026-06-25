const express = require("express");

const {
  uploadImageToCloudinary,
  deleteImageFromCloudinary,
} = require("../controllers/upload.controller");

const {
  uploadImage,
  handleMulterError,
} = require("../middleware/uploadMiddleware");

const {
  protectAdmin,
  requireOwnerOrAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/image",
  protectAdmin,
  requireOwnerOrAdmin,
  uploadImage.single("image"),
  handleMulterError,
  uploadImageToCloudinary
);

router.delete(
  "/image",
  protectAdmin,
  requireOwnerOrAdmin,
  deleteImageFromCloudinary
);

module.exports = router;