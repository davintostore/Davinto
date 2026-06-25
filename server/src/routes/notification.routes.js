const express = require("express");

const { testEmail } = require("../controllers/notification.controller");

const {
  protectAdmin,
  requireOwnerOrAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/admin/test-email", protectAdmin, requireOwnerOrAdmin, testEmail);

module.exports = router;