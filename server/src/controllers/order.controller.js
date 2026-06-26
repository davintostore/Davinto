const crypto = require("crypto");
const mongoose = require("mongoose");

const Counter = require("../models/Counter");
const Order = require("../models/Order");
const Product = require("../models/Product");
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

const normalizeEmail = (value = "") => normalizeText(value).toLowerCase();

const normalizeLocale = (value = "") => {
  return String(value || "").trim().toLowerCase().startsWith("ar")
    ? "ar"
    : "en";
};

const createPaymobMerchantOrderId = (orderNumber, mode = "PAY") => {
  return `${orderNumber}-${mode}-${Date.now()}`;
};

const buildAdminActionBy = (admin) => ({
  id: admin?._id || null,
  name: admin?.name || "",
  email: admin?.email || "",
});

const getNextOrderNumber = async (session) => {
  const counter = await Counter.findOneAndUpdate(
    { name: ORDER_COUNTER_NAME },
    { $inc: { value: 1 } },
    {
      returnDocument: "after",
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
  const email = normalizeEmail(customerInfo.email);
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

const buildPaymentSnapshot = (settings, paymentMethod, paymentSetup) => {
  const arabicPayment = settings.translations?.ar?.payments?.[paymentMethod];

  return {
    label: paymentSetup.label || "",
    instructions: paymentSetup.instructions || "",
    translations: {
      ar: {
        label: arabicPayment?.label || "",
        instructions: arabicPayment?.instructions || "",
      },
    },
  };
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
    locale: order.locale || "en",
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
    },
    createdAt: order.createdAt,
  };

  return payload;
};

const buildCustomerOrderPreviewItem = (item) => ({
  name: item.name,
  image: item.image || "",
  imageAlt: item.imageAlt || "",
  translations: item.translations,
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
  locale: order.locale || "en",
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
  locale: order.locale || "en",
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
        imageAlt: item.imageAlt || "",
        shortDescription: item.shortDescription || "",
        badges: Array.isArray(item.badges) ? item.badges : [],
        translations: item.translations,
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
    translations: order.paymentSnapshot?.translations,
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
    locale,
  } = req.body;
  const orderLocale = normalizeLocale(locale);

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
        deliveryZone: validatedCustomer.city,
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
            locale: orderLocale,
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
            paymentSnapshot: buildPaymentSnapshot(
              settings,
              paymentMethod,
              paymentSetup
            ),
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
    const notificationResult = await sendOrderNotifications(order);

    if (notificationResult?.skipped) {
      console.warn(
        `Order notification skipped for ${order.orderNumber}: ${
          notificationResult.reason || "No reason provided."
        }`
      );
    }

  } catch (error) {
    console.error(
      `Order notification failed for ${order.orderNumber}: ${
        error?.message || "Unknown email error."
      }`
    );
  }

  order = await Order.findById(createdOrder._id).select("+lookupToken");

  setPrivateResponseHeaders(res);
  res.status(201).json({
    success: true,
    message: "Order created successfully.",
    order: buildPublicOrderPayload(order),
    payment,
  });
});

const findOrderForEmailTracking = async ({ orderNumber, email }) => {
  const normalizedOrderNumber = normalizeText(orderNumber).toUpperCase();
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedOrderNumber || !normalizedEmail) {
    throw createHttpError("Order number and email are required.", 400);
  }

  const order = await Order.findOne({
    orderNumber: normalizedOrderNumber,
    "customerInfo.email": normalizedEmail,
    deletedAt: null,
  });

  if (!order) {
    throw createHttpError("Order not found.", 404);
  }

  return order;
};

const findOrderForGuestTracking = async ({ orderNumber, lookupToken }) => {
  const normalizedOrderNumber = normalizeText(orderNumber).toUpperCase();
  const normalizedLookupToken = normalizeText(lookupToken);

  if (!normalizedOrderNumber || !normalizedLookupToken) {
    throw createHttpError("Order number and lookup token are required.", 400);
  }

  const order = await Order.findOne({
    orderNumber: normalizedOrderNumber,
    deletedAt: null,
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
  const order = await findOrderForEmailTracking(req.body || {});
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
    deletedAt: null,
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
    deletedAt: null,
  };

  if (requestedOrderStatus) query.orderStatus = requestedOrderStatus;
  if (requestedPaymentStatus) query.paymentStatus = requestedPaymentStatus;

  const [orders, total] = await Promise.all([
    Order.find(query)
      .select(
        "orderNumber checkoutMode locale orderStatus paymentStatus paymentMethod total totalDiscount deliveryFee items createdAt updatedAt"
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
    deletedAt: null,
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

  const query = {
    deletedAt: null,
  };

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
  const order = await Order.findOne({
    _id: req.params.id,
    deletedAt: null,
  });

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

  if (orderStatus === "cancelled") {
    res.status(400);
    throw new Error("Use the cancel order action so stock is restored safely.");
  }

  const order = await Order.findOne({
    _id: req.params.id,
    deletedAt: null,
  });

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

  const order = await Order.findOne({
    _id: req.params.id,
    deletedAt: null,
  });

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

  const order = await Order.findOne({
    _id: req.params.id,
    deletedAt: null,
  }).select("+lookupToken");

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

const findMatchingColor = (product, orderItem) => {
  const colorId = normalizeText(orderItem.color?.id);
  const colorKey = normalizeText(orderItem.color?.key).toLowerCase();
  const colorSlug = normalizeText(orderItem.color?.slug).toLowerCase();
  const colorName = normalizeText(orderItem.color?.name).toLowerCase();

  return product.colors.find((color) => {
    const currentId = color._id?.toString();
    const currentSlug = normalizeText(color.slug).toLowerCase();
    const currentName = normalizeText(color.name).toLowerCase();

    return (
      (colorId && currentId === colorId) ||
      (colorKey &&
        (currentId === colorKey ||
          currentSlug === colorKey ||
          currentName === colorKey)) ||
      (colorSlug && currentSlug === colorSlug) ||
      (colorName && currentName === colorName)
    );
  });
};

const findMatchingSize = (color, orderItem) => {
  const sizeId = normalizeText(orderItem.size?.id);
  const sizeLabel = normalizeText(orderItem.size?.label).toLowerCase();
  const sizeSku = normalizeText(orderItem.size?.sku).toLowerCase();

  return color.sizes.find((size) => {
    const currentId = size._id?.toString();
    const currentLabel = normalizeText(size.label).toLowerCase();
    const currentSku = normalizeText(size.sku).toLowerCase();

    return (
      (sizeId && currentId === sizeId) ||
      (sizeLabel && currentLabel === sizeLabel) ||
      (sizeSku && currentSku === sizeSku)
    );
  });
};

const restoreOrderStock = async (order, session) => {
  for (const item of order.items || []) {
    const product = await Product.findById(item.product).session(session);

    if (!product) {
      console.warn(
        `Stock restore skipped for ${order.orderNumber}: product ${item.product} not found.`
      );
      continue;
    }

    const color = findMatchingColor(product, item);

    if (!color) {
      console.warn(
        `Stock restore skipped for ${order.orderNumber}: color not found on ${product._id}.`
      );
      continue;
    }

    const size = findMatchingSize(color, item);

    if (!size) {
      console.warn(
        `Stock restore skipped for ${order.orderNumber}: size not found on ${product._id}.`
      );
      continue;
    }

    size.stock = Number(size.stock || 0) + Number(item.quantity || 0);
    await product.save({ session });
  }
};

const cancelAdminOrder = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404);
    throw new Error("Order not found.");
  }

  const reason = normalizeText(req.body.reason || req.body.note);
  const adminSnapshot = buildAdminActionBy(req.admin);
  const session = await mongoose.startSession();
  let order;
  let restoredStock = false;

  try {
    await session.withTransaction(async () => {
      order = await Order.findOne({
        _id: req.params.id,
        deletedAt: null,
      }).session(session);

      if (!order) {
        throw createHttpError("Order not found.", 404);
      }

      if (order.orderStatus === "cancelled") {
        return;
      }

      if (order.orderStatus === "delivered") {
        throw createHttpError("Delivered orders cannot be cancelled.", 400);
      }

      if (!order.stockRestoredAt) {
        await restoreOrderStock(order, session);
        order.stockRestoredAt = new Date();
        order.stockRestoredBy = adminSnapshot;
        restoredStock = true;
      }

      order.orderStatus = "cancelled";
      order.cancelledAt = order.cancelledAt || new Date();
      order.cancellationReason = reason || order.cancellationReason || "";
      order.cancelledBy = adminSnapshot;
      order.statusHistory.push({
        status: "cancelled",
        note: reason || "Order cancelled by admin.",
        changedBy: "admin",
        changedAt: new Date(),
      });

      await order.save({ session });
    });
  } catch (error) {
    if (res.statusCode === 200) {
      res.status(error.statusCode || 500);
    }

    throw error;
  } finally {
    session.endSession();
  }

  res.status(200).json({
    success: true,
    message: restoredStock
      ? "Order cancelled and stock restored."
      : "Order is already cancelled.",
    order,
  });
});

const deleteAdminOrder = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404);
    throw new Error("Order not found.");
  }

  const order = await Order.findOne({
    _id: req.params.id,
    deletedAt: null,
  });

  if (!order) {
    res.status(404);
    throw new Error("Order not found.");
  }

  if (order.orderStatus !== "cancelled") {
    res.status(400);
    throw new Error("Cancel the order before deleting it.");
  }

  order.deletedAt = new Date();
  order.deletedBy = buildAdminActionBy(req.admin);
  order.statusHistory.push({
    status: "cancelled",
    note: "Order deleted from admin dashboard.",
    changedBy: "admin",
    changedAt: new Date(),
  });

  await order.save();

  res.status(200).json({
    success: true,
    message: "Order deleted from active order lists.",
    order,
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
  cancelAdminOrder,
  deleteAdminOrder,
  retryAdminPaymobPayment,
};
