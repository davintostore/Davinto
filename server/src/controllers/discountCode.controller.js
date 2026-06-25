const DiscountCode = require("../models/DiscountCode");
const asyncHandler = require("../utils/asyncHandler");

const normalizeCode = (value = "") => {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
};

const calculateDiscountAmount = (discountCode, subtotal) => {
  const safeSubtotal = Math.max(0, Number(subtotal || 0));
  let discountAmount = 0;

  if (discountCode.type === "percentage") {
    discountAmount = safeSubtotal * (Number(discountCode.value || 0) / 100);
  }

  if (discountCode.type === "fixed") {
    discountAmount = Number(discountCode.value || 0);
  }

  if (Number(discountCode.maxDiscountAmount || 0) > 0) {
    discountAmount = Math.min(
      discountAmount,
      Number(discountCode.maxDiscountAmount || 0)
    );
  }

  discountAmount = Math.min(discountAmount, safeSubtotal);

  return Math.round(discountAmount);
};

const validateDiscountCodeRules = (discountCode, subtotal) => {
  const now = new Date();
  const safeSubtotal = Math.max(0, Number(subtotal || 0));

  if (!discountCode || discountCode.status !== "active") {
    return "Discount code is not active.";
  }

  if (discountCode.startsAt && discountCode.startsAt > now) {
    return "Discount code is not active yet.";
  }

  if (discountCode.endsAt && discountCode.endsAt < now) {
    return "Discount code has expired.";
  }

  if (
    Number(discountCode.usageLimit || 0) > 0 &&
    Number(discountCode.usedCount || 0) >= Number(discountCode.usageLimit || 0)
  ) {
    return "Discount code usage limit has been reached.";
  }

  if (safeSubtotal < Number(discountCode.minSubtotal || 0)) {
    return `Minimum order subtotal for this code is ${discountCode.minSubtotal}.`;
  }

  return "";
};

const normalizePayload = (body = {}) => {
  return {
    code: normalizeCode(body.code),
    name: body.name?.trim() || "",
    description: body.description?.trim() || "",
    type: ["percentage", "fixed"].includes(body.type)
      ? body.type
      : "percentage",
    value: Math.max(0, Number(body.value || 0)),
    maxDiscountAmount: Math.max(0, Number(body.maxDiscountAmount || 0)),
    minSubtotal: Math.max(0, Number(body.minSubtotal || 0)),
    usageLimit: Math.max(0, Number(body.usageLimit || 0)),
    startsAt: body.startsAt ? new Date(body.startsAt) : null,
    endsAt: body.endsAt ? new Date(body.endsAt) : null,
    status: ["draft", "active", "archived"].includes(body.status)
      ? body.status
      : "draft",
  };
};

const getAdminDiscountCodes = asyncHandler(async (req, res) => {
  const { status, search } = req.query;

  const query = {};

  if (status && ["draft", "active", "archived"].includes(status)) {
    query.status = status;
  }

  if (search) {
    const safeSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    query.$or = [
      { code: { $regex: safeSearch, $options: "i" } },
      { name: { $regex: safeSearch, $options: "i" } },
      { description: { $regex: safeSearch, $options: "i" } },
    ];
  }

  const discountCodes = await DiscountCode.find(query).sort({
    createdAt: -1,
  });

  res.status(200).json({
    success: true,
    count: discountCodes.length,
    discountCodes,
  });
});

const createDiscountCode = asyncHandler(async (req, res) => {
  const payload = normalizePayload(req.body);

  if (!payload.code) {
    res.status(400);
    throw new Error("Discount code is required.");
  }

  if (payload.value <= 0) {
    res.status(400);
    throw new Error("Discount value must be greater than 0.");
  }

  if (payload.type === "percentage" && payload.value > 100) {
    res.status(400);
    throw new Error("Percentage discount cannot be greater than 100%.");
  }

  if (payload.startsAt && payload.endsAt && payload.startsAt > payload.endsAt) {
    res.status(400);
    throw new Error("Start date cannot be after end date.");
  }

  const existingCode = await DiscountCode.findOne({ code: payload.code });

  if (existingCode) {
    res.status(409);
    throw new Error("A discount code with this code already exists.");
  }

  const discountCode = await DiscountCode.create(payload);

  res.status(201).json({
    success: true,
    message: "Discount code created successfully.",
    discountCode,
  });
});

const updateDiscountCode = asyncHandler(async (req, res) => {
  const discountCode = await DiscountCode.findById(req.params.id);

  if (!discountCode) {
    res.status(404);
    throw new Error("Discount code not found.");
  }

  const payload = normalizePayload(req.body);

  if (!payload.code) {
    res.status(400);
    throw new Error("Discount code is required.");
  }

  if (payload.value <= 0) {
    res.status(400);
    throw new Error("Discount value must be greater than 0.");
  }

  if (payload.type === "percentage" && payload.value > 100) {
    res.status(400);
    throw new Error("Percentage discount cannot be greater than 100%.");
  }

  if (payload.startsAt && payload.endsAt && payload.startsAt > payload.endsAt) {
    res.status(400);
    throw new Error("Start date cannot be after end date.");
  }

  const existingCode = await DiscountCode.findOne({
    code: payload.code,
    _id: { $ne: discountCode._id },
  });

  if (existingCode) {
    res.status(409);
    throw new Error("A discount code with this code already exists.");
  }

  discountCode.code = payload.code;
  discountCode.name = payload.name;
  discountCode.description = payload.description;
  discountCode.type = payload.type;
  discountCode.value = payload.value;
  discountCode.maxDiscountAmount = payload.maxDiscountAmount;
  discountCode.minSubtotal = payload.minSubtotal;
  discountCode.usageLimit = payload.usageLimit;
  discountCode.startsAt = payload.startsAt;
  discountCode.endsAt = payload.endsAt;
  discountCode.status = payload.status;

  await discountCode.save();

  res.status(200).json({
    success: true,
    message: "Discount code updated successfully.",
    discountCode,
  });
});

const deleteDiscountCode = asyncHandler(async (req, res) => {
  const discountCode = await DiscountCode.findById(req.params.id);

  if (!discountCode) {
    res.status(404);
    throw new Error("Discount code not found.");
  }

  if (discountCode.usedCount > 0) {
    discountCode.status = "archived";
    await discountCode.save();

    return res.status(200).json({
      success: true,
      message:
        "Discount code has usage history, so it was archived instead of deleted.",
      discountCode,
    });
  }

  await discountCode.deleteOne();

  res.status(200).json({
    success: true,
    message: "Discount code deleted successfully.",
  });
});

const validateDiscountCode = asyncHandler(async (req, res) => {
  const code = normalizeCode(req.body.code);
  const subtotal = Math.max(0, Number(req.body.subtotal || 0));

  if (!code) {
    res.status(400);
    throw new Error("Discount code is required.");
  }

  if (subtotal <= 0) {
    res.status(400);
    throw new Error("Subtotal must be greater than 0.");
  }

  const discountCode = await DiscountCode.findOne({ code });

  const validationError = validateDiscountCodeRules(discountCode, subtotal);

  if (validationError) {
    res.status(400);
    throw new Error(validationError);
  }

  const discountAmount = calculateDiscountAmount(discountCode, subtotal);

  res.status(200).json({
    success: true,
    message: "Discount code applied successfully.",
    discount: {
      id: discountCode._id,
      code: discountCode.code,
      name: discountCode.name,
      type: discountCode.type,
      value: discountCode.value,
      discountAmount,
      subtotalAfterDiscount: Math.max(subtotal - discountAmount, 0),
    },
  });
});

module.exports = {
  getAdminDiscountCodes,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  validateDiscountCode,
  calculateDiscountAmount,
  validateDiscountCodeRules,
};