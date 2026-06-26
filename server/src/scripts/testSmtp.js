require("dotenv").config();

const {
  sendEmail,
  getAdminOrderEmail,
  getSmtpConfigStatus,
  getSafeSmtpErrorMessage,
} = require("../services/email.service");

const run = async () => {
  const smtp = getSmtpConfigStatus();

  if (!smtp.configured) {
    console.log("SMTP test skipped.");
    console.log(`Missing SMTP keys: ${smtp.missing.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const recipient = getAdminOrderEmail();

  if (!recipient) {
    console.log("SMTP test skipped. ADMIN_ORDER_EMAIL is missing.");
    process.exitCode = 1;
    return;
  }

  const result = await sendEmail({
    to: recipient,
    subject: "Davinto SMTP Test",
    text: "Davinto SMTP test email sent successfully.",
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#090909;color:#f7f3ea;padding:28px;border-radius:18px;">
        <p style="letter-spacing:4px;text-transform:uppercase;color:rgba(247,243,234,0.5);font-size:12px;font-weight:800;">Davinto</p>
        <h1 style="margin:0 0 14px;font-size:28px;">SMTP Test Successful</h1>
        <p style="color:rgba(247,243,234,0.65);line-height:1.7;">Davinto can send email notifications from the server.</p>
      </div>
    `,
  });

  if (!result.success) {
    console.log(result.reason || "SMTP test email failed.");
    process.exitCode = 1;
    return;
  }

  console.log("SMTP test email sent successfully.");
  console.log(`Message ID: ${result.messageId || "n/a"}`);
};

if (require.main === module) {
  run().catch((error) => {
    console.error(getSafeSmtpErrorMessage(error));
    process.exitCode = 1;
  });
}

module.exports = {
  run,
};
