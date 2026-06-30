const Order = require("../models/Order");

const {
  isPaymobConfigured,
  verifyPaymobHmac,
  isPaymobCallbackSuccess,
  getPaymobOrderIdFromCallback,
  getPaymobMerchantOrderIdFromCallback,
} = require("../services/paymob.service");

const asyncHandler = require("../utils/asyncHandler");

const normalizeText = (value = "") => {
  return String(value || "").trim();
};

const getClientUrl = () => {
  return normalizeText(process.env.CLIENT_URL || "http://localhost:5173");
};

const getPublicPaymobConfig = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    configured: isPaymobConfigured(),
  });
});

const findOrderFromPaymobPayload = async (payload = {}) => {
  const paymobOrderId = getPaymobOrderIdFromCallback(payload);
  const merchantOrderId = getPaymobMerchantOrderIdFromCallback(payload);

  const query = {
    $or: [],
  };

  if (paymobOrderId) {
    query.$or.push({
      "paymentGateway.paymobOrderId": String(paymobOrderId),
    });
  }

  if (merchantOrderId) {
    query.$or.push({
      orderNumber: merchantOrderId,
    });

    query.$or.push({
      "paymentGateway.paymobMerchantOrderId": merchantOrderId,
    });
  }

  if (query.$or.length === 0) {
    return null;
  }

  return Order.findOne(query);
};

const applyPaymobResultToOrder = async ({ order, payload }) => {
  const success = isPaymobCallbackSuccess(payload);

  order.paymentGateway = {
    ...(order.paymentGateway?.toObject?.() || order.paymentGateway || {}),
    provider: "paymob",
    paymobOrderId:
      order.paymentGateway?.paymobOrderId ||
      getPaymobOrderIdFromCallback(payload),
    paymobTransactionId: payload.id ? String(payload.id) : "",
    paymobMerchantOrderId:
      order.paymentGateway?.paymobMerchantOrderId ||
      getPaymobMerchantOrderIdFromCallback(payload),
    paymobRawResponse: payload,
  };

  if (success) {
    order.paymentStatus = "paid";
    order.orderStatus =
      order.orderStatus === "delivered" ? "delivered" : "confirmed";

    const alreadyHasPaidHistory = order.statusHistory?.some(
      (entry) =>
        entry.status === "confirmed" &&
        entry.note === "Paymob payment confirmed."
    );

    if (!alreadyHasPaidHistory) {
      order.statusHistory.push({
        status: order.orderStatus,
        note: "Paymob payment confirmed.",
        changedBy: "system",
        changedAt: new Date(),
      });
    }
  } else {
    order.paymentStatus = payload.pending ? "pending" : "failed";

    if (!payload.pending) {
      order.statusHistory.push({
        status: order.orderStatus,
        note: "Paymob payment failed or was not completed.",
        changedBy: "system",
        changedAt: new Date(),
      });
    }
  }

  await order.save();

  return order;
};

const handlePaymobProcessedCallback = asyncHandler(async (req, res) => {
  const payload = req.body || {};

  const hmacResult = verifyPaymobHmac(payload);

  if (!hmacResult.verified) {
    res.status(401);
    throw new Error(hmacResult.reason || "Invalid Paymob HMAC.");
  }

  const order = await findOrderFromPaymobPayload(payload);

  if (!order) {
    res.status(404);
    throw new Error("Order not found for Paymob callback.");
  }

  await applyPaymobResultToOrder({
    order,
    payload,
  });

  res.status(200).json({
    success: true,
    message: "Paymob callback processed successfully.",
  });
});

const handlePaymobResponseCallback = asyncHandler(async (req, res) => {
  const payload = req.query || {};

  const hmacResult = verifyPaymobHmac(payload);

  if (!hmacResult.verified) {
    return res.redirect(`${getClientUrl()}/track-order?payment=invalid`);
  }

  const order = await findOrderFromPaymobPayload(payload);

  if (!order) {
    return res.redirect(`${getClientUrl()}/track-order?payment=missing`);
  }

  const updatedOrder = await applyPaymobResultToOrder({
    order,
    payload,
  });

  const status = isPaymobCallbackSuccess(payload) ? "success" : "failed";

  const params = new URLSearchParams({
    orderNumber: updatedOrder.orderNumber,
    payment: status,
  });

  return res.redirect(`${getClientUrl()}/order-success?${params.toString()}`);
});

module.exports = {
  getPublicPaymobConfig,
  handlePaymobProcessedCallback,
  handlePaymobResponseCallback,
};
