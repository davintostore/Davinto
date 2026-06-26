const DEFAULT_DEV_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

const normalizeOrigin = (origin) => {
  if (!origin || typeof origin !== "string") {
    return "";
  }

  return origin.trim().replace(/\/+$/, "");
};

const parseOrigins = (value) => {
  if (!value || typeof value !== "string") {
    return [];
  }

  return value.split(",").map(normalizeOrigin).filter(Boolean);
};

const getAllowedCorsOrigins = () => {
  const configuredOrigins = parseOrigins(process.env.CORS_ORIGIN);
  const fallbackOrigins = configuredOrigins.length ? [] : parseOrigins(process.env.CLIENT_URL);
  const origins = new Set([...configuredOrigins, ...fallbackOrigins]);

  if ((process.env.NODE_ENV || "development") === "development") {
    DEFAULT_DEV_ORIGINS.forEach((origin) => origins.add(origin));
  }

  return Array.from(origins);
};

const allowedCorsOrigins = getAllowedCorsOrigins();

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);

    if (allowedCorsOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  optionsSuccessStatus: 204,
};

module.exports = {
  allowedCorsOrigins,
  corsOptions,
  normalizeOrigin,
  parseOrigins,
};
