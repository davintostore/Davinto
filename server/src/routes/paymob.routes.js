const express = require("express");

const {
  getPublicPaymobConfig,
  handlePaymobProcessedCallback,
  handlePaymobResponseCallback,
} = require("../controllers/paymob.controller");

const router = express.Router();

router.get("/config", getPublicPaymobConfig);

router.post("/webhook", handlePaymobProcessedCallback);

router.get("/response", handlePaymobResponseCallback);

module.exports = router;