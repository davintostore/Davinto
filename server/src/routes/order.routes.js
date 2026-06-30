const express = require("express");

const {
  createOrder,
  trackOrder,
  trackOrderLegacy,
  retryCustomerPaymobPayment,
  getMyOrders,
  getMyOrderById,
  getAdminOrders,
  getAdminOrderById,
  updateAdminOrderStatus,
  updateAdminPaymentStatus,
  cancelAdminOrder,
  deleteAdminOrder,
  retryAdminPaymobPayment,
} = require("../controllers/order.controller");

const {
  protectAdmin,
  requireOwnerOrAdmin,
} = require("../middleware/authMiddleware");
const {
  protectCustomer,
  optionalCustomer,
} = require("../middleware/customerAuthMiddleware");
const {
  trackingLimiter,
  orderCreateLimiter,
  paymentRetryLimiter,
} = require("../middleware/rateLimitMiddleware");
const {
  uploadImage,
  handleMulterError,
} = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post(
  "/",
  orderCreateLimiter,
  optionalCustomer,
  uploadImage.single("paymentProof"),
  handleMulterError,
  createOrder
);

router.post("/track", trackingLimiter, trackOrder);

// TODO(Phase 3C migration): Remove this legacy GET route after old links and
// Paymob redirects have moved away from lookup tokens in query parameters.
router.get("/track", trackingLimiter, trackOrderLegacy);

router.post("/paymob/retry", paymentRetryLimiter, retryCustomerPaymobPayment);

router.get("/mine", protectCustomer, getMyOrders);

router.get("/mine/:id", protectCustomer, getMyOrderById);

router.get("/admin", protectAdmin, getAdminOrders);

router.get("/admin/:id", protectAdmin, getAdminOrderById);

router.patch(
  "/admin/:id/status",
  protectAdmin,
  requireOwnerOrAdmin,
  updateAdminOrderStatus
);

router.patch(
  "/admin/:id/payment",
  protectAdmin,
  requireOwnerOrAdmin,
  updateAdminPaymentStatus
);

router.post(
  "/admin/:id/cancel",
  protectAdmin,
  requireOwnerOrAdmin,
  cancelAdminOrder
);

router.delete(
  "/admin/:id",
  protectAdmin,
  requireOwnerOrAdmin,
  deleteAdminOrder
);

router.post(
  "/admin/:id/paymob/retry",
  protectAdmin,
  requireOwnerOrAdmin,
  paymentRetryLimiter,
  retryAdminPaymobPayment
);

module.exports = router;
