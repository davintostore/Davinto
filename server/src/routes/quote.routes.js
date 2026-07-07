const express = require("express");

const { createQuote } = require("../controllers/quote.controller");
const { quoteLimiter } = require("../middleware/rateLimitMiddleware");

const router = express.Router();

router.post("/", quoteLimiter, createQuote);

module.exports = router;
