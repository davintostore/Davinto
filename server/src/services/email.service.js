const nodemailer = require("nodemailer");

let cachedTransporter = null;

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

const getTransporter = () => {
  if (!isEmailConfigured()) {
    return null;
  }

  if (cachedTransporter) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: normalizeText(process.env.SMTP_HOST),
    port: Number(process.env.SMTP_PORT || 465),
    secure: shouldUseSecureConnection(),
    auth: {
      user: normalizeText(process.env.SMTP_USER),
      pass: normalizeText(process.env.SMTP_PASS),
    },
  });

  return cachedTransporter;
};

const sendEmail = async ({ to, subject, text, html, replyTo }) => {
  if (!isEmailConfigured()) {
    return {
      success: false,
      skipped: true,
      reason:
        "SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.",
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
      reason:
        "SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.",
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
  getEmailFrom,
  getAdminOrderEmail,
};