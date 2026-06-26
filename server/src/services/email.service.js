const nodemailer = require("nodemailer");

let cachedTransporter = null;
let tlsOverrideWarningShown = false;

const normalizeText = (value = "") => {
  return String(value || "").trim();
};

const isEmailConfigured = () => {
  return Boolean(
    normalizeText(process.env.SMTP_HOST) &&
      normalizeText(process.env.SMTP_PORT) &&
      normalizeText(process.env.SMTP_USER) &&
      normalizeText(process.env.SMTP_PASS)
  );
};

const getSmtpConfigStatus = () => {
  const requiredKeys = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
  const missing = requiredKeys.filter((key) => !normalizeText(process.env[key]));

  return {
    configured: missing.length === 0,
    missing,
    hostConfigured: Boolean(normalizeText(process.env.SMTP_HOST)),
    portConfigured: Boolean(normalizeText(process.env.SMTP_PORT)),
    userConfigured: Boolean(normalizeText(process.env.SMTP_USER)),
    passConfigured: Boolean(normalizeText(process.env.SMTP_PASS)),
    secure: shouldUseSecureConnection(),
    tlsRejectUnauthorized: shouldRejectUnauthorizedTls(),
    emailFromConfigured: Boolean(normalizeText(process.env.EMAIL_FROM)),
    adminOrderEmailConfigured: Boolean(
      normalizeText(process.env.ADMIN_ORDER_EMAIL)
    ),
  };
};

const getSmtpConfigMessage = () => {
  const status = getSmtpConfigStatus();

  if (status.configured) {
    return "SMTP is configured.";
  }

  if (status.missing.includes("SMTP_PASS")) {
    return "SMTP password is missing. Add SMTP_PASS in the server environment, then retry the test email.";
  }

  return `SMTP is not configured. Missing: ${status.missing.join(", ")}.`;
};

const getEmailFrom = () => {
  const customFrom = normalizeText(process.env.EMAIL_FROM);

  if (customFrom) return customFrom;

  const smtpUser = normalizeText(process.env.SMTP_USER);

  if (smtpUser) return `"Davinto" <${smtpUser}>`;

  return "";
};

const getAdminOrderEmail = () => {
  return (
    normalizeText(process.env.ADMIN_ORDER_EMAIL) ||
    normalizeText(process.env.EMAIL_FROM) ||
    normalizeText(process.env.SMTP_USER)
  );
};

const shouldUseSecureConnection = () => {
  const explicitSecure = normalizeText(process.env.SMTP_SECURE).toLowerCase();

  if (explicitSecure === "true") return true;
  if (explicitSecure === "false") return false;

  return Number(process.env.SMTP_PORT) === 465;
};

const isProduction = () => {
  return normalizeText(process.env.NODE_ENV).toLowerCase() === "production";
};

const shouldRejectUnauthorizedTls = () => {
  const explicitRejectUnauthorized = normalizeText(
    process.env.SMTP_TLS_REJECT_UNAUTHORIZED
  ).toLowerCase();

  if (!explicitRejectUnauthorized) return true;
  if (explicitRejectUnauthorized !== "false") return true;

  if (isProduction()) {
    if (!tlsOverrideWarningShown) {
      console.error(
        "SMTP_TLS_REJECT_UNAUTHORIZED=false was ignored because NODE_ENV=production. TLS certificate verification remains enabled."
      );
      tlsOverrideWarningShown = true;
    }

    return true;
  }

  if (!tlsOverrideWarningShown) {
    console.warn(
      "SMTP TLS certificate verification is disabled for this non-production process. Do not use SMTP_TLS_REJECT_UNAUTHORIZED=false in production."
    );
    tlsOverrideWarningShown = true;
  }

  return false;
};

const getSmtpTransportOptions = () => {
  return {
    host: normalizeText(process.env.SMTP_HOST),
    port: Number(process.env.SMTP_PORT || 465),
    secure: shouldUseSecureConnection(),
    auth: {
      user: normalizeText(process.env.SMTP_USER),
      pass: normalizeText(process.env.SMTP_PASS),
    },
    tls: {
      rejectUnauthorized: shouldRejectUnauthorizedTls(),
    },
  };
};

const getTransporter = () => {
  if (!isEmailConfigured()) {
    return null;
  }

  if (cachedTransporter) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport(getSmtpTransportOptions());

  return cachedTransporter;
};

const getSafeSmtpErrorMessage = (error) => {
  const message = String(error?.message || "").toLowerCase();

  if (message.includes("self-signed") || message.includes("certificate") || message.includes("cert")) {
    return "SMTP server was reached, but TLS certificate verification failed.";
  }

  if (message.includes("auth") || message.includes("login")) {
    return "SMTP authentication failed. Check SMTP_USER and SMTP_PASS.";
  }

  if (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("socket") ||
    message.includes("connection")
  ) {
    return "SMTP server could not be reached. Check SMTP_HOST, SMTP_PORT, SMTP_SECURE, and network access.";
  }

  return error?.message || "SMTP email failed.";
};

const sendEmail = async ({ to, subject, text, html, replyTo }) => {
  if (!isEmailConfigured()) {
    return {
      success: false,
      skipped: true,
      reason: getSmtpConfigMessage(),
    };
  }

  const finalTo = normalizeText(to);

  if (!finalTo) {
    return {
      success: false,
      skipped: true,
      reason: "Recipient email is missing.",
    };
  }

  const transporter = getTransporter();

  const info = await transporter.sendMail({
    from: getEmailFrom(),
    to: finalTo,
    subject,
    text,
    html,
    replyTo: replyTo || undefined,
  });

  return {
    success: true,
    skipped: false,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  };
};

const verifyEmailConnection = async () => {
  if (!isEmailConfigured()) {
    return {
      success: false,
      skipped: true,
      reason: getSmtpConfigMessage(),
      smtp: getSmtpConfigStatus(),
    };
  }

  const transporter = getTransporter();

  await transporter.verify();

  return {
    success: true,
    skipped: false,
    message: "SMTP connection verified successfully.",
  };
};

module.exports = {
  sendEmail,
  verifyEmailConnection,
  isEmailConfigured,
  getSmtpConfigStatus,
  getEmailFrom,
  getAdminOrderEmail,
  getSmtpTransportOptions,
  getSafeSmtpErrorMessage,
};
