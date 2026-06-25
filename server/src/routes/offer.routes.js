const express = require("express");

const {
  getPublicOffers,
  getAdminOffers,
  createOffer,
  updateOffer,
  deleteOffer,
} = require("../controllers/offer.controller");

const {
  protectAdmin,
  requireOwnerOrAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getPublicOffers);

router.get("/admin", protectAdmin, getAdminOffers);
router.post("/admin", protectAdmin, requireOwnerOrAdmin, createOffer);
router.patch("/admin/:id", protectAdmin, requireOwnerOrAdmin, updateOffer);
router.delete("/admin/:id", protectAdmin, requireOwnerOrAdmin, deleteOffer);

module.exports = router;