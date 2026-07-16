const Customer = require("../models/Customer");
const asyncHandler = require("../utils/asyncHandler");
const {
  generateCustomerTokenPair,
  verifyCustomerRefreshToken,
  wasTokenIssuedBeforePasswordChange,
} = require("../services/customerToken.service");

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
const ALLOWED_PROFILE_FIELDS = new Set([
  "name",
  "phone",
  "preferredLocale",
  "addresses",
]);

const createHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeText = (value = "") => String(value || "").trim();
const normalizeEmail = (value = "") => normalizeText(value).toLowerCase();

const normalizePhone = (value) => Customer.normalizePhone(value);

const validatePhone = (phone, fieldLabel = "Phone number") => {
  if (!phone || !PHONE_PATTERN.test(phone)) {
    throw createHttpError(
      `${fieldLabel} must contain 7 to 15 digits and may start with +.`
    );
  }

  return phone;
};

const mapAddress = (address) => {
  const source = address?.toObject?.() || address || {};

  return {
    id: source._id,
    label: source.label || "Address",
    fullName: source.fullName || "",
    phone: source.phone || "",
    secondPhone: source.secondPhone || "",
    city: source.city || "",
    address: source.address || "",
    notes: source.notes || "",
    isDefault: Boolean(source.isDefault),
  };
};

const serializeCustomer = (customer) => ({
  id: customer._id,
  name: customer.name,
  email: customer.email,
  phone: customer.phone || null,
  status: customer.status,
  preferredLocale: customer.preferredLocale,
  emailVerified: Boolean(customer.emailVerified),
  phoneVerified: Boolean(customer.phoneVerified),
  addresses: Array.isArray(customer.addresses)
    ? customer.addresses.map(mapAddress)
    : [],
  createdAt: customer.createdAt,
});

const sendCustomerAuthResponse = (
  res,
  statusCode,
  customer,
  tokens = {}
) => {
  res.status(statusCode).json({
    success: true,
    customer: serializeCustomer(customer),
    accessToken: tokens.accessToken || null,
    refreshToken: tokens.refreshToken || null,
  });
};

const getDuplicateField = (error) => {
  if (error?.code !== 11000) return "";

  if (error.keyPattern?.email || error.keyValue?.email) return "email";
  if (error.keyPattern?.phone || error.keyValue?.phone) return "phone";

  return "account";
};

const throwDuplicateError = (field) => {
  if (field === "email") {
    throw createHttpError(
      "A customer account already exists with this email.",
      409
    );
  }

  if (field === "phone") {
    throw createHttpError(
      "A customer account already exists with this phone number.",
      409
    );
  }

  throw createHttpError("Customer account already exists.", 409);
};

const rethrowCustomerPersistenceError = (error) => {
  const duplicateField = getDuplicateField(error);

  if (duplicateField) {
    throwDuplicateError(duplicateField);
  }

  if (error?.name === "ValidationError") {
    const firstValidationMessage = Object.values(error.errors || {}).find(
      (entry) => entry?.message
    )?.message;

    throw createHttpError(
      firstValidationMessage || "Customer data is invalid.",
      400
    );
  }

  throw error;
};

const normalizeAddresses = (addresses) => {
  if (!Array.isArray(addresses)) {
    throw createHttpError("Addresses must be an array.");
  }

  if (addresses.length > 10) {
    throw createHttpError("A maximum of 10 addresses is allowed.");
  }

  let defaultCount = 0;

  const normalizedAddresses = addresses.map((address, index) => {
    if (!address || typeof address !== "object" || Array.isArray(address)) {
      throw createHttpError(`Address ${index + 1} is invalid.`);
    }

    const label = normalizeText(address.label || "Address");
    const fullName = normalizeText(address.fullName);
    const phone = validatePhone(
      normalizePhone(address.phone),
      `Address ${index + 1} phone`
    );
    const secondPhoneInput =
      address.secondPhone === null || address.secondPhone === undefined
        ? ""
        : normalizeText(address.secondPhone);
    const secondPhone = secondPhoneInput
      ? validatePhone(
          normalizePhone(secondPhoneInput),
          `Address ${index + 1} second phone`
        )
      : "";
    const city = normalizeText(address.city);
    const fullAddress = normalizeText(address.address);
    const notes =
      address.notes === null || address.notes === undefined
        ? ""
        : normalizeText(address.notes);
    const isDefault = Boolean(address.isDefault);

    if (!label || !fullName || !city || !fullAddress) {
      throw createHttpError(
        `Address ${index + 1} requires label, full name, phone, city, and address.`
      );
    }

    if (isDefault) defaultCount += 1;

    return {
      label,
      fullName,
      phone,
      secondPhone,
      city,
      address: fullAddress,
      notes,
      isDefault,
    };
  });

  if (defaultCount > 1) {
    throw createHttpError("Only one address can be marked as default.");
  }

  return normalizedAddresses;
};

const signupCustomer = asyncHandler(async (req, res) => {
  const name = normalizeText(req.body?.name);
  const email = normalizeEmail(req.body?.email);
  const password =
    typeof req.body?.password === "string" ? req.body.password : "";
  const hasPhone = Object.prototype.hasOwnProperty.call(req.body || {}, "phone");
  const rawPhone = hasPhone ? req.body.phone : undefined;

  if (!name || !email || !password) {
    throw createHttpError("Name, email, and password are required.");
  }

  if (name.length < 2 || name.length > 100) {
    throw createHttpError("Name must be between 2 and 100 characters.");
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw createHttpError("Please enter a valid email address.");
  }

  if (password.length < 8) {
    throw createHttpError("Password must be at least 8 characters.");
  }

  if (password.length > 128) {
    throw createHttpError("Password cannot exceed 128 characters.");
  }

  let phone;

  if (hasPhone && rawPhone !== null && rawPhone !== undefined) {
    if (!normalizeText(rawPhone)) {
      throw createHttpError("Phone number cannot be empty.");
    }

    phone = validatePhone(normalizePhone(rawPhone));
  }

  const duplicateConditions = [{ email }];
  if (phone) duplicateConditions.push({ phone });

  const existingCustomer = await Customer.findOne({
    $or: duplicateConditions,
  });

  if (existingCustomer?.email === email) {
    throwDuplicateError("email");
  }

  if (phone && existingCustomer?.phone === phone) {
    throwDuplicateError("phone");
  }

  let customer;

  try {
    customer = await Customer.create({
      name,
      email,
      phone,
      password,
      status: "active",
      preferredLocale: "en",
    });
  } catch (error) {
    rethrowCustomerPersistenceError(error);
  }

  const tokens = generateCustomerTokenPair(customer);
  sendCustomerAuthResponse(res, 201, customer, tokens);
});

const signinCustomer = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password =
    typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !password) {
    throw createHttpError("Email and password are required.");
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw createHttpError("Please enter a valid email address.");
  }

  const customer = await Customer.findOne({ email }).select(
    "+password +sessionVersion"
  );

  if (!customer || !(await customer.matchPassword(password))) {
    throw createHttpError("Invalid email or password.", 401);
  }

  if (customer.status === "blocked") {
    throw createHttpError("Customer account is blocked.", 403);
  }

  customer.lastLoginAt = new Date();
  await customer.save();

  const tokens = generateCustomerTokenPair(customer);
  sendCustomerAuthResponse(res, 200, customer, tokens);
});

const signoutCustomer = asyncHandler(async (req, res) => {
  req.customer.sessionVersion =
    Number(req.customer.sessionVersion || 0) + 1;
  await req.customer.save();

  sendCustomerAuthResponse(res, 200, req.customer);
});

const getCustomerMe = asyncHandler(async (req, res) => {
  sendCustomerAuthResponse(res, 200, req.customer);
});

const updateCustomerMe = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const unsupportedFields = Object.keys(body).filter(
    (field) => !ALLOWED_PROFILE_FIELDS.has(field)
  );

  if (unsupportedFields.length > 0) {
    throw createHttpError(
      `Unsupported profile field${
        unsupportedFields.length > 1 ? "s" : ""
      }: ${unsupportedFields.join(", ")}.`
    );
  }

  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    const name = normalizeText(body.name);

    if (!name || name.length < 2 || name.length > 100) {
      throw createHttpError("Name must be between 2 and 100 characters.");
    }

    req.customer.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(body, "phone")) {
    if (body.phone === null) {
      req.customer.phone = undefined;
      req.customer.phoneVerified = false;
    } else {
      if (!normalizeText(body.phone)) {
        throw createHttpError(
          "Phone number cannot be empty. Use null to remove it."
        );
      }

      const phone = validatePhone(normalizePhone(body.phone));
      const existingPhone = await Customer.findOne({
        phone,
        _id: { $ne: req.customer._id },
      });

      if (existingPhone) {
        throwDuplicateError("phone");
      }

      if (phone !== req.customer.phone) {
        req.customer.phone = phone;
        req.customer.phoneVerified = false;
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "preferredLocale")) {
    const preferredLocale = normalizeText(body.preferredLocale).toLowerCase();

    if (!["en", "ar"].includes(preferredLocale)) {
      throw createHttpError("Preferred locale must be en or ar.");
    }

    req.customer.preferredLocale = preferredLocale;
  }

  if (Object.prototype.hasOwnProperty.call(body, "addresses")) {
    req.customer.addresses = normalizeAddresses(body.addresses);
  }

  try {
    await req.customer.save();
  } catch (error) {
    rethrowCustomerPersistenceError(error);
  }

  sendCustomerAuthResponse(res, 200, req.customer);
});

const changeCustomerPassword = asyncHandler(async (req, res) => {
  const currentPassword =
    typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
  const newPassword =
    typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
  const confirmation =
    typeof req.body?.confirmation === "string" ? req.body.confirmation : "";

  if (!currentPassword || !newPassword || !confirmation) {
    throw createHttpError(
      "Current password, new password, and confirmation are required."
    );
  }

  if (newPassword.length < 8 || newPassword.length > 128) {
    throw createHttpError("New password must be between 8 and 128 characters.");
  }

  if (!/\p{L}/u.test(newPassword) || !/\p{N}/u.test(newPassword)) {
    throw createHttpError(
      "New password must include at least one letter and one number."
    );
  }

  if (newPassword !== confirmation) {
    throw createHttpError("New password and confirmation do not match.");
  }

  if (newPassword === currentPassword) {
    throw createHttpError("New password must be different from the current password.");
  }

  const customer = await Customer.findById(req.customer._id).select(
    "+password +sessionVersion"
  );

  if (!customer || !(await customer.matchPassword(currentPassword))) {
    throw createHttpError("Current password is incorrect.", 401);
  }

  customer.password = newPassword;
  await customer.save();

  const tokens = generateCustomerTokenPair(customer);
  sendCustomerAuthResponse(res, 200, customer, tokens);
});

const refreshCustomerToken = asyncHandler(async (req, res) => {
  const refreshToken = normalizeText(req.body?.refreshToken);

  if (!refreshToken) {
    throw createHttpError("Refresh token is required.", 401);
  }

  let decoded;

  try {
    decoded = verifyCustomerRefreshToken(refreshToken);
  } catch (error) {
    if (error.statusCode === 500) throw error;
    throw createHttpError("Invalid or expired customer refresh token.", 401);
  }

  const customer = await Customer.findById(decoded.sub).select(
    "+sessionVersion"
  );

  if (!customer) {
    throw createHttpError("Customer account does not exist.", 401);
  }

  if (customer.status === "blocked") {
    throw createHttpError("Customer account is blocked.", 403);
  }

  if (
    Number(decoded.sessionVersion) !== Number(customer.sessionVersion || 0) ||
    wasTokenIssuedBeforePasswordChange(decoded, customer)
  ) {
    throw createHttpError("Customer session is no longer valid.", 401);
  }

  const tokens = generateCustomerTokenPair(customer);
  sendCustomerAuthResponse(res, 200, customer, tokens);
});

module.exports = {
  signupCustomer,
  signinCustomer,
  signoutCustomer,
  getCustomerMe,
  updateCustomerMe,
  changeCustomerPassword,
  refreshCustomerToken,
};
