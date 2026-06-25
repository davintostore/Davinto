const express = require("express");

const {
  getPublicProducts,
  getPublicProductBySlug,
  getAdminProducts,
  getAdminProductById,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
} = require("../controllers/product.controller");

const {
  protectAdmin,
  requireOwnerOrAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getPublicProducts);

router.get("/admin", protectAdmin, getAdminProducts);
router.post("/admin", protectAdmin, requireOwnerOrAdmin, createProduct);
router.get("/admin/:id", protectAdmin, getAdminProductById);
router.patch("/admin/:id", protectAdmin, requireOwnerOrAdmin, updateProduct);
router.patch(
  "/admin/:id/status",
  protectAdmin,
  requireOwnerOrAdmin,
  updateProductStatus
);
router.delete("/admin/:id", protectAdmin, requireOwnerOrAdmin, deleteProduct);

router.get("/:slug", getPublicProductBySlug);

module.exports = router;