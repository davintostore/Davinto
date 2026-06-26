const { calculateQuote } = require("../services/quote.service");
const asyncHandler = require("../utils/asyncHandler");

const createQuote = asyncHandler(async (req, res) => {
  const { items, discountCode, deliveryZone, customerInfo } = req.body;

  const quote = await calculateQuote({
    cartItems: items,
    discountCode,
    deliveryZone: deliveryZone || customerInfo?.city || "",
    deductStock: false,
    incrementUsage: false,
  });

  res.status(200).json({
    success: true,
    quote,
  });
});

module.exports = {
  createQuote,
};
