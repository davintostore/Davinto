const express = require("express");

const {
  signupCustomer,
  signinCustomer,
  signoutCustomer,
  getCustomerMe,
  updateCustomerMe,
  changeCustomerPassword,
  refreshCustomerToken,
} = require("../controllers/customerAuth.controller");
const {
  protectCustomer,
} = require("../middleware/customerAuthMiddleware");
const {
  authLimiter,
  refreshLimiter,
  passwordChangeLimiter,
} = require("../middleware/rateLimitMiddleware");

const router = express.Router();

router.post("/signup", authLimiter, signupCustomer);
router.post("/signin", authLimiter, signinCustomer);
router.post("/refresh", refreshLimiter, refreshCustomerToken);
router.post("/signout", protectCustomer, signoutCustomer);
router.get("/me", protectCustomer, getCustomerMe);
router.patch("/me", protectCustomer, updateCustomerMe);
router.patch(
  "/me/password",
  passwordChangeLimiter,
  protectCustomer,
  changeCustomerPassword
);

module.exports = router;
