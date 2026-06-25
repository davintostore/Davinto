const express = require("express");

const { createQuote } = require("../controllers/quote.controller");

const router = express.Router();

router.post("/", createQuote);

module.exports = router;