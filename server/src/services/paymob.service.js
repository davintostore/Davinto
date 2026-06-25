const crypto = require("crypto");

const normalizeText = (value = "") => {
  return String(value || "").trim();
};

const getPaymobBaseUrl = () => {
  return (
    normalizeText(process.env.PAYMOB_BASE_URL) || "https://accept.paymob.com"
  );
};

const isPaymobConfigured = () => {
  return Boolean(
    normalizeText(process.env.PAYMOB_API_KEY) &&
      normalizeText(process.env.PAYMOB_INTEGRATION_ID) &&
      normalizeText(process.env.PAYMOB_IFRAME_ID) &&
      normalizeText(process.env.PAYMOB_HMAC_SECRET)
  );
};

const createPaymobError = (message, statusCode = 502, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
};

const postJson = async (url, payload) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw createPaymobError(
      data?.detail ||
        data?.message ||
        data?.error ||
        "Paymob request failed.",
      response.status,
      data
    );
  }

  return data;
};

const getAmountCents = (amount) => {
  return Math.round(Number(amount || 0) * 100);
};

const splitName = (fullName = "") => {
  const cleanName = normalizeText(fullName);
  const parts = cleanName.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return {
      firstName: "Davinto",
      lastName: "Customer",
    };
  }

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: "Customer",
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
};

const getBillingData = (order) => {
  const customer = order.customerInfo || {};
  const { firstName, lastName } = splitName(customer.fullName);

  return {
    apartment: "NA",
    email: normalizeText(customer.email) || "customer@davinto.local",
    floor: "NA",
    first_name: firstName,
    street: normalizeText(customer.address) || "NA",
    building: "NA",
    phone_number: normalizeText(customer.phone) || "01000000000",
    shipping_method: "NA",
    postal_code: "NA",
    city: normalizeText(customer.city) || "Cairo",
    country: "EG",
    last_name: lastName,
    state: normalizeText(customer.city) || "Cairo",
  };
};

const authenticatePaymob = async () => {
  if (!isPaymobConfigured()) {
    throw createPaymobError(
      "Paymob is not configured yet. Add PAYMOB_API_KEY, PAYMOB_INTEGRATION_ID, PAYMOB_IFRAME_ID, and PAYMOB_HMAC_SECRET.",
      500
    );
  }

  const url = `${getPaymobBaseUrl()}/api/auth/tokens`;

  const data = await postJson(url, {
    api_key: normalizeText(process.env.PAYMOB_API_KEY),
  });

  if (!data?.token) {
    throw createPaymobError("Paymob auth token was not returned.", 502, data);
  }

  return data.token;
};

const createPaymobOrder = async ({ authToken, order, merchantOrderId }) => {
  const amountCents = getAmountCents(order.total);
  const url = `${getPaymobBaseUrl()}/api/ecommerce/orders`;

  const data = await postJson(url, {
    auth_token: authToken,
    delivery_needed: false,
    amount_cents: amountCents,
    currency: normalizeText(process.env.PAYMOB_CURRENCY) || "EGP",
    merchant_order_id: merchantOrderId,
    items: [],
  });

  if (!data?.id) {
    throw createPaymobError("Paymob order ID was not returned.", 502, data);
  }

  return data;
};

const createPaymobPaymentKey = async ({ authToken, order, paymobOrderId }) => {
  const amountCents = getAmountCents(order.total);
  const url = `${getPaymobBaseUrl()}/api/acceptance/payment_keys`;

  const data = await postJson(url, {
    auth_token: authToken,
    amount_cents: amountCents,
    expiration: 3600,
    order_id: paymobOrderId,
    billing_data: getBillingData(order),
    currency: normalizeText(process.env.PAYMOB_CURRENCY) || "EGP",
    integration_id: Number(process.env.PAYMOB_INTEGRATION_ID),
    lock_order_when_paid: true,
  });

  if (!data?.token) {
    throw createPaymobError("Paymob payment key was not returned.", 502, data);
  }

  return data.token;
};

const buildPaymobIframeUrl = (paymentToken) => {
  const iframeId = normalizeText(process.env.PAYMOB_IFRAME_ID);

  return `${getPaymobBaseUrl()}/api/acceptance/iframes/${iframeId}?payment_token=${paymentToken}`;
};

const createPaymobCardPayment = async (order, options = {}) => {
  const merchantOrderId =
    normalizeText(options.merchantOrderId) || normalizeText(order.orderNumber);

  const authToken = await authenticatePaymob();

  const paymobOrder = await createPaymobOrder({
    authToken,
    order,
    merchantOrderId,
  });

  const paymentKey = await createPaymobPaymentKey({
    authToken,
    order,
    paymobOrderId: paymobOrder.id,
  });

  const iframeUrl = buildPaymobIframeUrl(paymentKey);

  return {
    provider: "paymob",
    paymobOrderId: String(paymobOrder.id),
    merchantOrderId,
    paymentKey,
    iframeUrl,
    rawOrderResponse: paymobOrder,
  };
};

const getPaymobOrderIdFromCallback = (payload = {}) => {
  const order = payload.order;

  if (!order) return "";

  if (typeof order === "string" || typeof order === "number") {
    return String(order);
  }

  return String(order.id || "");
};

const getPaymobMerchantOrderIdFromCallback = (payload = {}) => {
  const order = payload.order;

  if (!order || typeof order !== "object") {
    return normalizeText(payload.merchant_order_id);
  }

  return normalizeText(order.merchant_order_id || payload.merchant_order_id);
};

const getHmacFieldValue = (payload, field) => {
  if (field === "order") {
    return getPaymobOrderIdFromCallback(payload);
  }

  if (field === "source_data.pan") {
    return normalizeText(payload.source_data?.pan || payload.source_data_pan);
  }

  if (field === "source_data.sub_type") {
    return normalizeText(
      payload.source_data?.sub_type || payload.source_data_sub_type
    );
  }

  if (field === "source_data.type") {
    return normalizeText(payload.source_data?.type || payload.source_data_type);
  }

  const value = payload[field];

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
};

const buildPaymobHmacString = (payload = {}) => {
  const fields = [
    "amount_cents",
    "created_at",
    "currency",
    "error_occured",
    "has_parent_transaction",
    "id",
    "integration_id",
    "is_3d_secure",
    "is_auth",
    "is_capture",
    "is_refunded",
    "is_standalone_payment",
    "is_voided",
    "order",
    "owner",
    "pending",
    "source_data.pan",
    "source_data.sub_type",
    "source_data.type",
    "success",
  ];

  return fields.map((field) => getHmacFieldValue(payload, field)).join("");
};

const verifyPaymobHmac = (payload = {}) => {
  const hmacSecret = normalizeText(process.env.PAYMOB_HMAC_SECRET);

  if (!hmacSecret) {
    return {
      verified: false,
      skipped: false,
      reason: "PAYMOB_HMAC_SECRET is not configured.",
    };
  }

  const receivedHmac = normalizeText(payload.hmac);

  if (!receivedHmac) {
    return {
      verified: false,
      skipped: false,
      reason: "Paymob HMAC is missing.",
    };
  }

  const calculatedHmac = crypto
    .createHmac("sha512", hmacSecret)
    .update(buildPaymobHmacString(payload))
    .digest("hex");

  const receivedBuffer = Buffer.from(receivedHmac, "hex");
  const calculatedBuffer = Buffer.from(calculatedHmac, "hex");

  if (receivedBuffer.length !== calculatedBuffer.length) {
    return {
      verified: false,
      skipped: false,
      reason: "Paymob HMAC length mismatch.",
    };
  }

  const verified = crypto.timingSafeEqual(receivedBuffer, calculatedBuffer);

  return {
    verified,
    skipped: false,
    reason: verified ? "" : "Invalid Paymob HMAC.",
  };
};

const isPaymobCallbackSuccess = (payload = {}) => {
  const success =
    payload.success === true ||
    payload.success === "true" ||
    payload.success === "True";

  const pending =
    payload.pending === true ||
    payload.pending === "true" ||
    payload.pending === "True";

  const errorOccurred =
    payload.error_occured === true ||
    payload.error_occured === "true" ||
    payload.error_occured === "True";

  return success && !pending && !errorOccurred;
};

module.exports = {
  isPaymobConfigured,
  createPaymobCardPayment,
  verifyPaymobHmac,
  isPaymobCallbackSuccess,
  getPaymobOrderIdFromCallback,
  getPaymobMerchantOrderIdFromCallback,
};
