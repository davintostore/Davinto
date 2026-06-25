const express = require("express");

const {
  getPublicSettings,
  getAdminSettings,
  updateAdminSettings,
} = require("../controllers/settings.controller");

const {
  protectAdmin,
  requireOwnerOrAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/public", getPublicSettings);
router.get("/admin", protectAdmin, getAdminSettings);
router.patch("/admin", protectAdmin, requireOwnerOrAdmin, updateAdminSettings);

module.exports = router;