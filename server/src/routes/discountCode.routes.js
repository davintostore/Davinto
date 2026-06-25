const express = require("express");

const {
  getAdminDiscountCodes,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  validateDiscountCode,
} = require("../controllers/discountCode.controller");

const {
  protectAdmin,
  requireOwnerOrAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/validate", validateDiscountCode);

router.get("/admin", protectAdmin, getAdminDiscountCodes);
router.post("/admin", protectAdmin, requireOwnerOrAdmin, createDiscountCode);
router.patch(
  "/admin/:id",
  protectAdmin,
  requireOwnerOrAdmin,
  updateDiscountCode
);
router.delete(
  "/admin/:id",
  protectAdmin,
  requireOwnerOrAdmin,
  deleteDiscountCode
);

module.exports = router;