const express = require("express");

const {
  loginAdmin,
  getAdminProfile,
} = require("../controllers/auth.controller");

const { protectAdmin } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimitMiddleware");

const router = express.Router();

router.post("/admin/login", authLimiter, loginAdmin);
router.get("/admin/me", protectAdmin, getAdminProfile);

module.exports = router;
