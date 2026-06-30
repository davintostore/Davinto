const normalizeText = (value = "") => String(value || "").trim();

const isProduction = () =>
  normalizeText(process.env.NODE_ENV || "development").toLowerCase() ===
  "production";

const hasAny = (keys) => keys.some((key) => Boolean(normalizeText(process.env[key])));

const getMissingKeys = (keys) =>
  keys.filter((key) => !normalizeText(process.env[key]));

const unique = (values) => Array.from(new Set(values));

const getProductionEnvReport = () => {
  const required = [
    "MONGO_URI",
    "JWT_SECRET",
    "CLIENT_URL",
    "CUSTOMER_ACCESS_TOKEN_SECRET",
    "CUSTOMER_REFRESH_TOKEN_SECRET",
  ];
  const warnings = [];

  const cloudinaryKeys = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];
  const paymobKeys = [
    "PAYMOB_API_KEY",
    "PAYMOB_INTEGRATION_ID",
    "PAYMOB_IFRAME_ID",
    "PAYMOB_HMAC_SECRET",
  ];
  const smtpKeys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];

  const requireCloudinary =
    normalizeText(process.env.REQUIRE_CLOUDINARY).toLowerCase() !== "false";
  const requireSmtp =
    normalizeText(process.env.REQUIRE_SMTP).toLowerCase() === "true";

  if (requireCloudinary) {
    required.push(...cloudinaryKeys);
  } else if (hasAny(cloudinaryKeys)) {
    const missingCloudinary = getMissingKeys(cloudinaryKeys);
    if (missingCloudinary.length > 0) {
      warnings.push(
        `Cloudinary config is partially set. Missing: ${missingCloudinary.join(", ")}.`
      );
    }
  }

  if (requireSmtp) {
    required.push(...smtpKeys);
  } else if (hasAny(smtpKeys)) {
    const missingSmtp = getMissingKeys(smtpKeys);
    if (missingSmtp.length > 0) {
      warnings.push(
        `SMTP config is partially set. Missing: ${missingSmtp.join(", ")}.`
      );
    }
  }

  if (hasAny(paymobKeys)) {
    required.push(...paymobKeys);
  }

  return {
    required: unique(required),
    missing: unique(getMissingKeys(required)),
    warnings,
  };
};

const assertProductionEnv = () => {
  if (!isProduction()) return;

  const report = getProductionEnvReport();

  report.warnings.forEach((warning) => console.warn(warning));

  if (report.missing.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${report.missing.join(", ")}.`
    );
  }
};

module.exports = {
  assertProductionEnv,
  getProductionEnvReport,
  isProduction,
  normalizeText,
};
