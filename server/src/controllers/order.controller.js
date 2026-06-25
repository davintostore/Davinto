const crypto = require("crypto");
const mongoose = require("mongoose");

const Counter = require("../models/Counter");
const Order = require("../models/Order");
const SiteSettings = require("../models/SiteSettings");

const { calculateQuote } = require("../services/quote.service");
const { sendOrderNotifications } = require("../services/orderNotification.service");
const {
  isPaymobConfigured,
  createPaymobCardPayment,
} = require("../services/paymob.service");

const asyncHandler = require("../utils/asyncHandler");

const ORDER_COUNTER_NAME = "orderNumber";
const ORDER_NUMBER_START = 1000;
const CUSTOMER_ORDER_STATUSES = [
  "pending_confirmation",
  "pending_payment",
  "pending_payment_verification",
  "confirmed",
  "processing",
  "ready_to_ship",
  "out_for_delivery",
  "delivered",
  "cancelled",
];
const CUSTOMER_PAYMENT_STATUSES = [
  "unpaid",
  "pending",
  "pending_verification",
  "paid",
  "failed",
  "expired",
  "refunded",
];

const createHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeText = (value = "") => {
  return String(value || "").trim();
};

const createPaymobMerchantOrderId = (orderNumber, mode = "PAY") => {
  return `${orderNumber}-${mode}-${Date.now()}`;
};

const getNextOrderNumber = async (session) => {
  const counter = await Counter.findOneAndUpdate(
    { name: ORDER_COUNTER_NAME },
    { $inc: { value: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      session,
    }
  );

  const number = ORDER_NUMBER_START + counter.value;

  return `DV-${number}`;
};

const createLookupToken = () => {
  return crypto.randomBytes(18).toString("hex");
};

const hashLookupToken = (lookupToken) => {
  return crypto
    .createHash("sha256")
    .update(String(lookupToken || ""))
    .digest("hex");
};

const safeTokenCompare = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");

  if (leftBuffer.length !== rightBuffer.length) return false;

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const matchesOrderLookupToken = (order, submittedToken) => {
  if (order.lookupTokenHash) {
    return safeTokenCompare(
      order.lookupTokenHash,
      hashLookupToken(submittedToken)
    );
  }

  return safeTokenCompare(order.lookupToken, submittedToken);
};

const validateCustomerInfo = (customerInfo = {}) => {
  const fullName = normalizeText(customerInfo.fullName);
  const phone = normalizeText(customerInfo.phone);
  const secondPhone = normalizeText(customerInfo.secondPhone);
  const email = normalizeText(customerInfo.email).toLowerCase();
  const city = normalizeText(customerInfo.city);
  const address = normalizeText(customerInfo.address);
  const notes = normalizeText(customerInfo.notes);

  if (!fullName) {
    throw createHttpError("Full name is required.");
  }

  if (!phone) {
    throw createHttpError("Phone number is required.");
  }

  if (!city) {
    throw createHttpError("City is required.");
  }

  if (!address) {
    throw createHttpError("Address is required.");
  }

  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    throw createHttpError("Please enter a valid email address.");
  }

  return {
    fullName,
    phone,
    secondPhone,
    email,
    city,
    address,
    notes,
  };
};

const getPaymentSetup = (settings, paymentMethod) => {
  const payment = settings.payments?.[paymentMethod];

  if (!payment || !payment.enabled) {
    throw createHttpError("Selected payment method is currently unavailable.");
  }

  return payment;
};

const getInitialStatuses = (paymentMethod) => {
  if (paymentMethod === "cod") {
    return {
      orderStatus: "pending_confirmation",
      paymentStatus: "unpaid",
    };
  }

  if (paymentMethod === "instapay" || paymentMethod === "vodafoneCash") {
    return {
      orderStatus: "pending_payment_verification",
      paymentStatus: "pending_verification",
    };
  }

  if (paymentMethod === "paymobCard") {
    return {
      orderStatus: "pending_payment",
      paymentStatus: "pending",
    };
  }

  throw createHttpError("Invalid payment method.");
};

const setPrivateResponseHeaders = (res) => {
  res.set("Cache-Control", "no-store, private");
  res.set("Pragma", "no-cache");
};

const buildPublicOrderPayload = (order, options = {}) => {
  const payload = {
    id: order._id,
    orderNumber: order.orderNumber,
    checkoutMode: order.checkoutMode || "guest",
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    subtotal: order.subtotal,
    productSavings: order.productSavings,
    bundleDiscountTotal: order.bundleDiscountTotal,
    offerDiscountTotal: order.offerDiscountTotal,
    discountTotal: order.discountTotal,
    totalDiscount: order.totalDiscount,
    deliveryFee: order.deliveryFee,
    discountCode: order.discountCode,
    appliedOffers: order.appliedOffers,
    appliedBundles: order.appliedBundles,
    total: order.total,
    items: order.items,
    customerInfo: order.customerInfo,
    paymentSnapshot: order.paymentSnapshot,
    deliverySnapshot: order.deliverySnapshot,
    paymentGateway: {
      provider: order.paymentGateway?.provider || "",
      paymobOrderId: order.paymentGateway?.paymobOrderId || "",
      paymobTransactionId: order.paymentGateway?.paymobTransactionId || "",
      paymobMerchantOrderId:
        order.paymentGateway?.paymobMerchantOrderId || "",
      paymobIframeUrl: order.paymentGateway?.paymobIframeUrl || "",
    },
    createdAt: order.createdAt,
  };

  if (options.includeLookupToken) {
    payload.lookupToken = order.lookupToken;
  }

  return payload;
};

const buildCustomerOrderPreviewItem = (item) => ({
  name: item.name,
  image: item.image || "",
  color: {
    name: item.color?.name || "",
    hex: item.color?.hex || "",
  },
  size: {
    label: item.size?.label || "",
  },
  quantity: Number(item.quantity || 0),
});

const buildCustomerOrderListItem = (order) => ({
  id: order._id,
  orderNumber: order.orderNumber,
  checkoutMode: order.checkoutMode || "customer",
  orderStatus: order.orderStatus,
  paymentStatus: order.paymentStatus,
  paymentMethod: order.paymentMethod,
  total: order.total,
  totalDiscount: order.totalDiscount,
  deliveryFee: order.deliveryFee,
  itemCount: Array.isArray(order.items)
    ? order.items.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
      )
    : 0,
  previewItems: Array.isArray(order.items)
    ? order.items.slice(0, 3).map(buildCustomerOrderPreviewItem)
    : [],
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const buildCustomerSafeStatusHistory = (statusHistory = []) => {
  if (!Array.isArray(statusHistory)) return [];

  return statusHistory.map((entry) => ({
    status: entry.status,
    note: entry.changedBy === "system" ? entry.note || "" : "",
    changedAt: entry.changedAt,
  }));
};

const buildCustomerSafeOrderDetail = (order) => ({
  id: order._id,
  orderNumber: order.orderNumber,
  checkoutMode: order.checkoutMode || "customer",
  orderStatus: order.orderStatus,
  paymentStatus: order.paymentStatus,
  paymentMethod: order.paymentMethod,
  customerInfo: order.customerInfo,
  items: Array.isArray(order.items)
    ? order.items.map((item) => ({
        id: item._id,
        product: item.product,
        name: item.name,
        slug: item.slug,
        category: item.category,
        color: item.color,
        size: item.size,
        image: item.image || "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        compareAtPrice: item.compareAtPrice,
        lineSubtotal: item.lineSubtotal,
        lineSavings: item.lineSavings,
      }))
    : [],
  subtotal: order.subtotal,
  productSavings: order.productSavings,
  bundleDiscountTotal: order.bundleDiscountTotal,
  offerDiscountTotal: order.offerDiscountTotal,
  discountTotal: order.discountTotal,
  totalDiscount: order.totalDiscount,
  deliveryFee: order.deliveryFee,
  total: order.total,
  appliedBundles: order.appliedBundles,
  appliedOffers: order.appliedOffers,
  discountCode: order.discountCode,
  deliverySnapshot: order.deliverySnapshot,
  paymentSnapshot: {
    label: order.paymentSnapshot?.label || "",
    instructions: order.paymentSnapshot?.instructions || "",
  },
  statusHistory: buildCustomerSafeStatusHistory(order.statusHistory),
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const initializePaymobPaymentForOrder = async (order, mode = "PAY") => {
  const merchantOrderId = createPaymobMerchantOrderId(order.orderNumber, mode);

  const paymobPayment = await createPaymobCardPayment(order, {
    merchantOrderId,
  });

  order.paymentGateway = {
    provider: "paymob",
    paymobOrderId: paymobPayment.paymobOrderId,
    paymobMerchantOrderId: paymobPayment.merchantOrderId,
    paymobIframeUrl: paymobPayment.iframeUrl,
    paymobTransactionId: order.paymentGateway?.paymobTransactionId || "",
    paymobRawResponse: paymobPayment.rawOrderResponse,
  };

  return {
    order,
    payment: {
      provider: "paymob",
      redirectUrl: paymobPayment.iframeUrl,
      initialized: true,
    },
  };
};

const createOrder = asyncHandler(async (req, res) => {
  const {
    customerInfo,
    items,
    paymentMethod,
    paymentReference,
    discountCode,
  } = req.body;

  const verifiedCustomerId = req.customer?._id || null;
  const checkoutMode = verifiedCustomerId ? "customer" : "guest";

  if (
    !["cod", "instapay", "vodafoneCash", "paymobCard"].includes(paymentMethod)
  ) {
    res.status(400);
    throw new Error("Invalid payment method.");
  }

  if (paymentMethod === "paymobCard" && !isPaymobConfigured()) {
    res.status(400);
    throw new Error(
      "Visa / Mastercard payment is not configured yet. Please choose another payment method."
    );
  }

  let validatedCustomer;

  try {
    validatedCustomer = validateCustomerInfo(customerInfo);
  } catch (error) {
    res.status(error.statusCode || 400);
    throw error;
  }

  const settings = await SiteSettings.getSingleton();

  let paymentSetup;

  try {
    paymentSetup = getPaymentSetup(settings, paymentMethod);
  } catch (error) {
    res.status(error.statusCode || 400);
    throw error;
  }

  if (
    ["instapay", "vodafoneCash"].includes(paymentMethod) &&
    settings.manualPayment?.requireTransactionReference &&
    !normalizeText(paymentReference)
  ) {
    res.status(400);
    throw new Error("Transaction reference is required for this payment method.");
  }

  const session = await mongoose.startSession();

  let createdOrder;

  try {
    await session.withTransaction(async () => {
      const quote = await calculateQuote({
        cartItems: items,
        discountCode,
        session,
        deductStock: true,
        incrementUsage: true,
      });

      const orderNumber = await getNextOrderNumber(session);
      const lookupToken = createLookupToken();
      const lookupTokenHash = hashLookupToken(lookupToken);
      const lookupTokenLast4 = lookupToken.slice(-4);

      const { orderStatus, paymentStatus } = getInitialStatuses(paymentMethod);

      const [order] = await Order.create(
        [
          {
            orderNumber,
            lookupToken,
            lookupTokenHash,
            lookupTokenLast4,
            customer: verifiedCustomerId,
            checkoutMode,
            customerInfo: validatedCustomer,
            items: quote.items,
            subtotal: quote.subtotal,
            productSavings: quote.productSavings,
            bundleDiscountTotal: quote.bundleDiscountTotal,
            offerDiscountTotal: quote.offerDiscountTotal,
            discountTotal: quote.discountTotal,
            totalDiscount: quote.totalDiscount,
            deliveryFee: quote.deliveryFee,
            discountCode: quote.appliedDiscountCode,
            appliedOffers: quote.appliedOffers,
            appliedBundles: quote.appliedBundles,
            total: quote.total,
            paymentMethod,
            paymentStatus,
            paymentReference: normalizeText(paymentReference),
            orderStatus,
            paymentSnapshot: {
              label: paymentSetup.label,
              instructions: paymentSetup.instructions,
            },
            deliverySnapshot: quote.deliverySnapshot,
            statusHistory: [
              {
                status: orderStatus,
                note: "Order created.",
                changedBy: "system",
                changedAt: new Date(),
              },
            ],
          },
        ],
        { session }
      );

      createdOrder = order;
    });
  } catch (error) {
    if (res.statusCode === 200) {
      res.status(error.statusCode || 500);
    }

    throw error;
  } finally {
    session.endSession();
  }

  let order = await Order.findById(createdOrder._id).select("+lookupToken");

  let payment = {
    provider: "",
    redirectUrl: "",
    initialized: false,
  };

  if (paymentMethod === "paymobCard") {
    try {
      const result = await initializePaymobPaymentForOrder(order, "PAY");

      order = result.order;
      payment = result.payment;

      await order.save();
    } catch (error) {
      console.error("Paymob initialization failed:", error);

      payment = {
        provider: "paymob",
        redirectUrl: "",
        initialized: false,
        error:
          error.message ||
          "Order was created, but Paymob payment could not be initialized.",
      };
    }
  }

  try {
    await sendOrderNotifications(order);
  } catch (error) {
    console.error("Order notification failed:", error);
  }

  order = await Order.findById(createdOrder._id).select("+lookupToken");

  setPrivateResponseHeaders(res);
  res.status(201).json({
    success: true,
    message: "Order created successfully.",
    order: buildPublicOrderPayload(order, { includeLookupToken: true }),
    payment,
  });
});

const findOrderForGuestTracking = async ({ orderNumber, lookupToken }) => {
  const normalizedOrderNumber = normalizeText(orderNumber).toUpperCase();
  const normalizedLookupToken = normalizeText(lookupToken);

  if (!normalizedOrderNumber || !normalizedLookupToken) {
    throw createHttpError(
      "Order number and lookup token are required.",
      400
    );
  }

  const order = await Order.findOne({
    orderNumber: normalizedOrderNumber,
  }).select("+lookupToken +lookupTokenHash");

  if (!order || !matchesOrderLookupToken(order, normalizedLookupToken)) {
    throw createHttpError("Order not found.", 404);
  }

  return order;
};

const sendGuestTrackingResponse = (res, order) => {
  setPrivateResponseHeaders(res);
  res.status(200).json({
    success: true,
    order: buildCustomerSafeOrderDetail(order),
  });
};

const trackOrder = asyncHandler(async (req, res) => {
  // TODO(Security): Add dedicated rate limiting for repeated guest tracking
  // attempts before production traffic increases.
  const order = await findOrderForGuestTracking(req.body || {});
  sendGuestTrackingResponse(res, order);
});

const trackOrderLegacy = asyncHandler(async (req, res) => {
  // TODO(Phase 3C migration): Remove legacy GET /orders/track after old email
  // links and Paymob redirects no longer carry guest tokens in URLs.
  const order = await findOrderForGuestTracking(req.query || {});
  sendGuestTrackingResponse(res, order);
});

const retryCustomerPaymobPayment = asyncHandler(async (req, res) => {
  const { orderNumber, lookupToken } = req.body;

  if (!orderNumber || !lookupToken) {
    res.status(400);
    throw new Error("Order number and lookup token are required.");
  }

  if (!isPaymobConfigured()) {
    res.status(400);
    throw new Error(
      "Visa / Mastercard payment is not configured yet. Please contact the store."
    );
  }

  const order = await Order.findOne({
    orderNumber: normalizeText(orderNumber).toUpperCase(),
  }).select("+lookupToken +lookupTokenHash");

  if (!order || !matchesOrderLookupToken(order, normalizeText(lookupToken))) {
    res.status(404);
    throw new Error("Order not found.");
  }

  if (order.paymentMethod !== "paymobCard") {
    res.status(400);
    throw new Error("This order was not created with card payment.");
  }

  if (order.paymentStatus === "paid") {
    res.status(400);
    throw new Error("This order is already paid.");
  }

  if (order.orderStatus === "cancelled") {
    res.status(400);
    throw new Error("This order is cancelled.");
  }

  const result = await initializePaymobPaymentForOrder(order, "CUSTOMER-RETRY");

  order.paymentStatus = "pending";

  if (order.orderStatus !== "delivered") {
    order.orderStatus = "pending_payment";
  }

  order.statusHistory.push({
    status: order.orderStatus,
    note: "Paymob payment link regenerated by customer.",
    changedBy: "system",
    changedAt: new Date(),
  });

  await order.save();

  setPrivateResponseHeaders(res);
  res.status(200).json({
    success: true,
    message: "Payment link generated successfully.",
    order: {
      ...buildCustomerSafeOrderDetail(order),
    },
    payment: result.payment,
  });
});

const getMyOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 12,
    status,
    orderStatus,
    paymentStatus,
  } = req.query;

  const requestedOrderStatus = normalizeText(orderStatus || status);
  const requestedPaymentStatus = normalizeText(paymentStatus);

  if (
    requestedOrderStatus &&
    !CUSTOMER_ORDER_STATUSES.includes(requestedOrderStatus)
  ) {
    res.status(400);
    throw new Error("Invalid order status filter.");
  }

  if (
    requestedPaymentStatus &&
    !CUSTOMER_PAYMENT_STATUSES.includes(requestedPaymentStatus)
  ) {
    res.status(400);
    throw new Error("Invalid payment status filter.");
  }

  const parsedLimit = Number.parseInt(limit, 10);
  const parsedPage = Number.parseInt(page, 10);
  const numericLimit = Math.min(
    Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 12, 1),
    50
  );
  const numericPage = Math.max(
    Number.isFinite(parsedPage) ? parsedPage : 1,
    1
  );
  const skip = (numericPage - 1) * numericLimit;

  const query = {
    customer: req.customer._id,
  };

  if (requestedOrderStatus) query.orderStatus = requestedOrderStatus;
  if (requestedPaymentStatus) query.paymentStatus = requestedPaymentStatus;

  const [orders, total] = await Promise.all([
    Order.find(query)
      .select(
        "orderNumber checkoutMode orderStatus paymentStatus paymentMethod total totalDiscount deliveryFee items createdAt updatedAt"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(numericLimit),
    Order.countDocuments(query),
  ]);

  setPrivateResponseHeaders(res);
  res.status(200).json({
    success: true,
    count: orders.length,
    total,
    page: numericPage,
    pages: Math.ceil(total / numericLimit),
    orders: orders.map(buildCustomerOrderListItem),
  });
});

const getMyOrderById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404);
    throw new Error("Order not found.");
  }

  const order = await Order.findOne({
    _id: req.params.id,
    customer: req.customer._id,
  }).select("-customer -adminNotes -paymentGateway -lookupToken");

  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  setPrivateResponseHeaders(res);
  res.status(200).json({
    success: true,
    order: buildCustomerSafeOrderDetail(order),
  });
});

const getAdminOrders = asyncHandler(async (req, res) => {
  const {
    orderStatus,
    paymentStatus,
    paymentMethod,
    search,
    limit = 50,
    page = 1,
  } = req.query;

  const query = {};

  if (orderStatus) query.orderStatus = orderStatus;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (paymentMethod) query.paymentMethod = paymentMethod;

  if (search) {
    const safeSearch = normalizeText(search).replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    query.$or = [
      { orderNumber: { $regex: safeSearch, $options: "i" } },
      { "customerInfo.fullName": { $regex: safeSearch, $options: "i" } },
      { "customerInfo.phone": { $regex: safeSearch, $options: "i" } },
      { "customerInfo.email": { $regex: safeSearch, $options: "i" } },
    ];
  }

  const numericLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const numericPage = Math.max(Number(page) || 1, 1);
  const skip = (numericPage - 1) * numericLimit;

  const [orders, total] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(numericLimit),
    Order.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: orders.length,
    total,
    page: numericPage,
    pages: Math.ceil(total / numericLimit),
    orders,
  });
});

const getAdminOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  res.status(200).json({
    success: true,
    order,
  });
});

const updateAdminOrderStatus = asyncHandler(async (req, res) => {
  const { orderStatus, note = "" } = req.body;

  const allowedStatuses = [
    "pending_confirmation",
    "pending_payment",
    "pending_payment_verification",
    "confirmed",
    "processing",
    "ready_to_ship",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ];

  if (!allowedStatuses.includes(orderStatus)) {
    res.status(400);
    throw new Error("Invalid order status.");
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  order.orderStatus = orderStatus;
  order.statusHistory.push({
    status: orderStatus,
    note: normalizeText(note),
    changedBy: "admin",
    changedAt: new Date(),
  });

  await order.save();

  res.status(200).json({
    success: true,
    message: "Order status updated successfully.",
    order,
  });
});

const updateAdminPaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body;

  const allowedStatuses = [
    "unpaid",
    "pending",
    "pending_verification",
    "paid",
    "failed",
    "expired",
    "refunded",
  ];

  if (!allowedStatuses.includes(paymentStatus)) {
    res.status(400);
    throw new Error("Invalid payment status.");
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  order.paymentStatus = paymentStatus;

  await order.save();

  res.status(200).json({
    success: true,
    message: "Payment status updated successfully.",
    order,
  });
});

const retryAdminPaymobPayment = asyncHandler(async (req, res) => {
  if (!isPaymobConfigured()) {
    res.status(400);
    throw new Error(
      "Paymob is not configured yet. Add Paymob keys before generating a card payment link."
    );
  }

  const order = await Order.findById(req.params.id).select("+lookupToken");

  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  if (order.paymentMethod !== "paymobCard") {
    res.status(400);
    throw new Error("This order was not created with Visa / Mastercard payment.");
  }

  if (order.paymentStatus === "paid") {
    res.status(400);
    throw new Error("This order is already paid.");
  }

  if (order.orderStatus === "cancelled") {
    res.status(400);
    throw new Error("Cannot create a payment link for a cancelled order.");
  }

  const result = await initializePaymobPaymentForOrder(order, "ADMIN-RETRY");

  order.paymentStatus = "pending";

  if (order.orderStatus !== "delivered") {
    order.orderStatus = "pending_payment";
  }

  order.statusHistory.push({
    status: order.orderStatus,
    note: "Paymob payment link regenerated by admin.",
    changedBy: "admin",
    changedAt: new Date(),
  });

  await order.save();

  res.status(200).json({
    success: true,
    message: "Paymob payment link generated successfully.",
    order: buildPublicOrderPayload(order),
    payment: result.payment,
  });
});

module.exports = {
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
  retryAdminPaymobPayment,
};
