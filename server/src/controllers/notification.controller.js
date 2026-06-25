const {
  sendEmail,
  verifyEmailConnection,
  getAdminOrderEmail,
} = require("../services/email.service");

const asyncHandler = require("../utils/asyncHandler");

const testEmail = asyncHandler(async (req, res) => {
  const verification = await verifyEmailConnection();

  if (verification.skipped) {
    return res.status(200).json({
      success: false,
      skipped: true,
      message: verification.reason,
    });
  }

  const recipient = req.body?.to || getAdminOrderEmail();

  const result = await sendEmail({
    to: recipient,
    subject: "Davinto Email Test",
    text: "Davinto email notifications are working.",
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#090909;color:#f7f3ea;padding:28px;border-radius:18px;">
        <p style="letter-spacing:4px;text-transform:uppercase;color:rgba(247,243,234,0.5);font-size:12px;font-weight:800;">Davinto</p>
        <h1 style="margin:0 0 14px;font-size:28px;">Email Test Successful</h1>
        <p style="color:rgba(247,243,234,0.65);line-height:1.7;">Davinto email notifications are working.</p>
      </div>
    `,
  });

  res.status(200).json({
    success: Boolean(result.success),
    message: result.success
      ? "Test email sent successfully."
      : result.reason || "Test email could not be sent.",
    result,
  });
});

module.exports = {
  testEmail,
};