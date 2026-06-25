const Customer = require("../models/Customer");
const asyncHandler = require("../utils/asyncHandler");
const {
  verifyCustomerAccessToken,
  wasTokenIssuedBeforePasswordChange,
} = require("../services/customerToken.service");

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) return "";

  const [scheme, token, extra] = authHeader.trim().split(/\s+/);

  if (scheme !== "Bearer" || !token || extra) {
    const error = new Error("Invalid authorization header.");
    error.statusCode = 401;
    throw error;
  }

  return token;
};

const verifyAccessToken = (token) => {
  try {
    return verifyCustomerAccessToken(token);
  } catch (error) {
    if (error.statusCode === 500) {
      throw error;
    }

    const authError = new Error("Not authorized. Invalid customer token.");
    authError.statusCode = 401;
    throw authError;
  }
};

const loadCustomerForToken = async (decoded) => {
  const customer = await Customer.findById(decoded.sub).select(
    "+sessionVersion"
  );

  if (!customer) {
    const error = new Error(
      "Not authorized. Customer account does not exist."
    );
    error.statusCode = 401;
    throw error;
  }

  if (customer.status === "blocked") {
    const error = new Error("Customer account is blocked.");
    error.statusCode = 403;
    throw error;
  }

  if (
    Number(decoded.sessionVersion) !== Number(customer.sessionVersion || 0) ||
    wasTokenIssuedBeforePasswordChange(decoded, customer)
  ) {
    const error = new Error(
      "Not authorized. Customer session is no longer valid."
    );
    error.statusCode = 401;
    throw error;
  }

  return customer;
};

const protectCustomer = asyncHandler(async (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    res.status(401);
    throw new Error("Not authorized. No customer token provided.");
  }

  const decoded = verifyAccessToken(token);
  const customer = await loadCustomerForToken(decoded);

  req.customer = customer;
  req.customerToken = decoded;

  next();
});

const optionalCustomer = asyncHandler(async (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    return next();
  }

  const decoded = verifyAccessToken(token);
  const customer = await loadCustomerForToken(decoded);

  req.customer = customer;
  req.customerToken = decoded;

  next();
});

module.exports = {
  protectCustomer,
  optionalCustomer,
};
