const express = require("express");

const {
  getPublicBundles,
  getAdminBundles,
  createBundle,
  updateBundle,
  deleteBundle,
} = require("../controllers/bundle.controller");

const {
  protectAdmin,
  requireOwnerOrAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getPublicBundles);

router.get("/admin", protectAdmin, getAdminBundles);
router.post("/admin", protectAdmin, requireOwnerOrAdmin, createBundle);
router.patch("/admin/:id", protectAdmin, requireOwnerOrAdmin, updateBundle);
router.delete("/admin/:id", protectAdmin, requireOwnerOrAdmin, deleteBundle);

module.exports = router;