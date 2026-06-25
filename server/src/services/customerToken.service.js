const jwt = require("jsonwebtoken");

const CUSTOMER_TOKEN_ISSUER = "davinto-api";
const CUSTOMER_TOKEN_AUDIENCE = "davinto-customer";
const ACCESS_TOKEN_TYPE = "customer_access";
const REFRESH_TOKEN_TYPE = "customer_refresh";

const normalizeText = (value = "") => String(value || "").trim();

const getNodeEnvironment = () =>
  normalizeText(process.env.NODE_ENV || "development").toLowerCase();

const isProduction = () => getNodeEnvironment() === "production";
const isDevelopment = () => getNodeEnvironment() === "development";

const getSecret = (dedicatedKey) => {
  const dedicatedSecret = normalizeText(process.env[dedicatedKey]);

  if (dedicatedSecret) {
    return dedicatedSecret;
  }

  if (isDevelopment()) {
    const developmentFallback = normalizeText(process.env.JWT_SECRET);

    if (developmentFallback) {
      return developmentFallback;
    }
  }

  const error = new Error(
    `${dedicatedKey} is required for customer authentication${
      isProduction() ? " in production" : ""
    }.`
  );
  error.statusCode = 500;
  throw error;
};

const getAccessTokenSecret = () => getSecret("CUSTOMER_ACCESS_TOKEN_SECRET");
const getRefreshTokenSecret = () => getSecret("CUSTOMER_REFRESH_TOKEN_SECRET");

const buildCustomerTokenPayload = (customer, tokenType) => ({
  sub: String(customer._id || customer.id),
  tokenType,
  sessionVersion: Number(customer.sessionVersion || 0),
});

const signCustomerToken = ({
  customer,
  tokenType,
  secret,
  expiresIn,
}) => {
  return jwt.sign(buildCustomerTokenPayload(customer, tokenType), secret, {
    expiresIn,
    issuer: CUSTOMER_TOKEN_ISSUER,
    audience: CUSTOMER_TOKEN_AUDIENCE,
  });
};

const generateCustomerAccessToken = (customer) => {
  return signCustomerToken({
    customer,
    tokenType: ACCESS_TOKEN_TYPE,
    secret: getAccessTokenSecret(),
    expiresIn:
      normalizeText(process.env.CUSTOMER_ACCESS_TOKEN_EXPIRES_IN) || "15m",
  });
};

const generateCustomerRefreshToken = (customer) => {
  return signCustomerToken({
    customer,
    tokenType: REFRESH_TOKEN_TYPE,
    secret: getRefreshTokenSecret(),
    expiresIn:
      normalizeText(process.env.CUSTOMER_REFRESH_TOKEN_EXPIRES_IN) || "30d",
  });
};

const verifyCustomerToken = ({ token, secret, expectedTokenType }) => {
  const decoded = jwt.verify(token, secret, {
    issuer: CUSTOMER_TOKEN_ISSUER,
    audience: CUSTOMER_TOKEN_AUDIENCE,
  });

  if (
    decoded.tokenType !== expectedTokenType ||
    !decoded.sub ||
    !Number.isInteger(decoded.sessionVersion) ||
    decoded.sessionVersion < 0
  ) {
    const error = new Error("Invalid customer token claims.");
    error.name = "JsonWebTokenError";
    throw error;
  }

  return decoded;
};

const verifyCustomerAccessToken = (token) => {
  return verifyCustomerToken({
    token,
    secret: getAccessTokenSecret(),
    expectedTokenType: ACCESS_TOKEN_TYPE,
  });
};

const verifyCustomerRefreshToken = (token) => {
  return verifyCustomerToken({
    token,
    secret: getRefreshTokenSecret(),
    expectedTokenType: REFRESH_TOKEN_TYPE,
  });
};

const generateCustomerTokenPair = (customer) => ({
  accessToken: generateCustomerAccessToken(customer),
  refreshToken: generateCustomerRefreshToken(customer),
});

const wasTokenIssuedBeforePasswordChange = (decoded, customer) => {
  if (!customer.passwordChangedAt || !decoded.iat) return false;

  const passwordChangedAtSeconds = Math.floor(
    new Date(customer.passwordChangedAt).getTime() / 1000
  );

  return decoded.iat < passwordChangedAtSeconds;
};

module.exports = {
  generateCustomerAccessToken,
  generateCustomerRefreshToken,
  generateCustomerTokenPair,
  verifyCustomerAccessToken,
  verifyCustomerRefreshToken,
  wasTokenIssuedBeforePasswordChange,
  CUSTOMER_TOKEN_ISSUER,
  CUSTOMER_TOKEN_AUDIENCE,
};
