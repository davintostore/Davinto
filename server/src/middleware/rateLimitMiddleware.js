const { rateLimit } = require("express-rate-limit");

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

const getPositiveInteger = (envKey, fallback) => {
  const parsedValue = Number.parseInt(process.env[envKey], 10);

  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
};

const windowMs = getPositiveInteger(
  "RATE_LIMIT_WINDOW_MS",
  FIFTEEN_MINUTES_MS
);

const createLimiter = ({ max, message }) => {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message,
      });
    },
  });
};

const authLimiter = createLimiter({
  max: getPositiveInteger("AUTH_RATE_LIMIT_MAX", 10),
  message: "Too many authentication attempts. Please try again later.",
});

const refreshLimiter = createLimiter({
  max: getPositiveInteger("REFRESH_RATE_LIMIT_MAX", 30),
  message: "Too many token refresh attempts. Please try again later.",
});

const trackingLimiter = createLimiter({
  max: getPositiveInteger("TRACKING_RATE_LIMIT_MAX", 20),
  message: "Too many order tracking attempts. Please try again later.",
});

const orderCreateLimiter = createLimiter({
  max: getPositiveInteger("ORDER_CREATE_RATE_LIMIT_MAX", 15),
  message: "Too many order attempts. Please try again later.",
});

const quoteLimiter = createLimiter({
  max: getPositiveInteger("QUOTE_RATE_LIMIT_MAX", 120),
  message: "Too many quote requests. Please try again later.",
});

const paymentRetryLimiter = createLimiter({
  max: getPositiveInteger("PAYMENT_RETRY_RATE_LIMIT_MAX", 10),
  message: "Too many payment retry attempts. Please try again later.",
});

module.exports = {
  authLimiter,
  refreshLimiter,
  trackingLimiter,
  orderCreateLimiter,
  quoteLimiter,
  paymentRetryLimiter,
};
