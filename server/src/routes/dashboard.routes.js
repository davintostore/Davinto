const express = require("express");

const {
  getAdminDashboardStats,
} = require("../controllers/dashboard.controller");

const { protectAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/admin", protectAdmin, getAdminDashboardStats);

module.exports = router;