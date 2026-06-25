const express = require("express");

const {
  getPublicCategories,
  getPublicCategoryBySlug,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/category.controller");

const {
  protectAdmin,
  requireOwnerOrAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getPublicCategories);
router.get("/admin", protectAdmin, getAdminCategories);
router.post("/admin", protectAdmin, requireOwnerOrAdmin, createCategory);
router.patch("/admin/:id", protectAdmin, requireOwnerOrAdmin, updateCategory);
router.delete("/admin/:id", protectAdmin, requireOwnerOrAdmin, deleteCategory);

router.get("/:slug", getPublicCategoryBySlug);

module.exports = router;