const {
  sendEmail,
  getAdminOrderEmail,
  isEmailConfigured,
  getSafeSmtpErrorMessage,
} = require("./email.service");

const normalizeText = (value = "") => {
  return String(value || "").trim();
};

const escapeHtml = (value = "") => {
  return normalizeText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const formatMoney = (value) => {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(number);
};

const formatStatus = (value = "") => {
  return normalizeText(value).replaceAll("_", " ");
};

const getPaymentMethodLabel = (method = "") => {
  const labels = {
    cod: "Cash on Delivery",
    instapay: "Instapay",
    vodafoneCash: "Vodafone Cash",
    paymobCard: "Visa / Mastercard",
  };

  return labels[method] || method;
};

const getTrackingUrl = (order) => {
  const clientUrl = normalizeText(process.env.CLIENT_URL || "http://localhost:5173");

  if (!order?.orderNumber) {
    return clientUrl;
  }

  const params = new URLSearchParams({
    orderNumber: order.orderNumber,
  });

  return `${clientUrl}/track-order?${params.toString()}`;
};

const buildEmailShell = ({ title, preview, children }) => {
  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(title)}</title>
    </head>

    <body style="margin:0;background:#090909;color:#f7f3ea;font-family:Arial,Helvetica,sans-serif;">
      <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">
        ${escapeHtml(preview)}
      </span>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#090909;padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;background:#111111;border:1px solid rgba(255,255,255,0.10);border-radius:28px;overflow:hidden;">
              <tr>
                <td style="padding:28px 28px 18px;border-bottom:1px solid rgba(255,255,255,0.10);">
                  <p style="margin:0 0 12px;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:rgba(247,243,234,0.45);font-weight:800;">
                    Davinto
                  </p>

                  <h1 style="margin:0;color:#f7f3ea;font-size:32px;line-height:1.05;text-transform:uppercase;letter-spacing:-1px;">
                    ${escapeHtml(title)}
                  </h1>
                </td>
              </tr>

              <tr>
                <td style="padding:28px;">
                  ${children}
                </td>
              </tr>

              <tr>
                <td style="padding:20px 28px;border-top:1px solid rgba(255,255,255,0.10);">
                  <p style="margin:0;color:rgba(247,243,234,0.40);font-size:12px;line-height:1.7;">
                    This email was sent automatically from the Davinto store system.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
};

const buildDetailRow = (label, value, strong = false) => {
  return `
    <tr>
      <td style="padding:10px 0;color:rgba(247,243,234,0.50);font-size:14px;border-bottom:1px solid rgba(255,255,255,0.08);">
        ${escapeHtml(label)}
      </td>
      <td align="right" style="padding:10px 0;color:#f7f3ea;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.08);font-weight:${strong ? 800 : 500};">
        ${escapeHtml(value)}
      </td>
    </tr>
  `;
};

const buildItemsHtml = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return `<p style="margin:0;color:rgba(247,243,234,0.55);font-size:14px;">No items found.</p>`;
  }

  return items
    .map((item) => {
      return `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
            <p style="margin:0 0 6px;color:#f7f3ea;font-size:15px;font-weight:800;text-transform:uppercase;">
              ${escapeHtml(item.name)}
            </p>

            <p style="margin:0;color:rgba(247,243,234,0.48);font-size:12px;line-height:1.7;">
              ${escapeHtml(item.color?.name || "")} / ${escapeHtml(
        item.size?.label || ""
      )} × ${Number(item.quantity || 0)}
              ${item.size?.sku ? ` · SKU: ${escapeHtml(item.size.sku)}` : ""}
            </p>
          </td>

          <td align="right" style="padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:#f7f3ea;font-size:14px;font-weight:800;">
            ${formatMoney(item.lineSubtotal)}
          </td>
        </tr>
      `;
    })
    .join("");
};

const buildSavingsHtml = (order) => {
  const blocks = [];

  if (Array.isArray(order.appliedBundles) && order.appliedBundles.length > 0) {
    blocks.push(`
      <div style="margin-top:14px;padding:16px;border:1px solid rgba(16,185,129,0.25);background:rgba(16,185,129,0.08);border-radius:18px;">
        <p style="margin:0 0 10px;color:#a7f3d0;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:800;">
          Bundles Applied
        </p>

        ${order.appliedBundles
          .map(
            (bundle) => `
          <p style="margin:0 0 6px;color:#d1fae5;font-size:13px;">
            ${escapeHtml(bundle.title)} — -${formatMoney(bundle.discountAmount)}
          </p>
        `
          )
          .join("")}
      </div>
    `);
  }

  if (Array.isArray(order.appliedOffers) && order.appliedOffers.length > 0) {
    blocks.push(`
      <div style="margin-top:14px;padding:16px;border:1px solid rgba(16,185,129,0.25);background:rgba(16,185,129,0.08);border-radius:18px;">
        <p style="margin:0 0 10px;color:#a7f3d0;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:800;">
          Offers Applied
        </p>

        ${order.appliedOffers
          .map((offer) => {
            const value =
              Number(offer.discountAmount || 0) > 0
                ? `-${formatMoney(offer.discountAmount)}`
                : offer.freeDeliveryApplied
                  ? "Free delivery"
                  : "";

            return `
              <p style="margin:0 0 6px;color:#d1fae5;font-size:13px;">
                ${escapeHtml(offer.title)}${value ? ` — ${escapeHtml(value)}` : ""}
              </p>
            `;
          })
          .join("")}
      </div>
    `);
  }

  if (order.discountCode?.code) {
    blocks.push(`
      <div style="margin-top:14px;padding:16px;border:1px solid rgba(16,185,129,0.25);background:rgba(16,185,129,0.08);border-radius:18px;">
        <p style="margin:0 0 10px;color:#a7f3d0;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:800;">
          Discount Code
        </p>

        <p style="margin:0;color:#d1fae5;font-size:13px;">
          ${escapeHtml(order.discountCode.code)} — -${formatMoney(
      order.discountCode.discountAmount
    )}
        </p>
      </div>
    `);
  }

  return blocks.join("");
};

const buildTotalsHtml = (order) => {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">
      ${buildDetailRow("Subtotal", formatMoney(order.subtotal))}
      ${buildDetailRow("Product Savings", `-${formatMoney(order.productSavings || 0)}`)}
      ${buildDetailRow("Bundle Discount", `-${formatMoney(order.bundleDiscountTotal || 0)}`)}
      ${buildDetailRow("Offer Discount", `-${formatMoney(order.offerDiscountTotal || 0)}`)}
      ${buildDetailRow("Discount Code", `-${formatMoney(order.discountTotal || 0)}`)}
      ${buildDetailRow("Total Discount", `-${formatMoney(order.totalDiscount || 0)}`)}
      ${buildDetailRow(
        "Delivery",
        `${formatMoney(order.deliveryFee)}${
          order.deliverySnapshot?.freeDeliveryApplied ? " / Free" : ""
        }`
      )}
      ${buildDetailRow("Total", formatMoney(order.total), true)}
    </table>
  `;
};

const buildDeliveryHtml = (order) => {
  return `
    <div style="margin-top:18px;padding:18px;border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.035);border-radius:20px;">
      <p style="margin:0 0 12px;color:rgba(247,243,234,0.45);font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:800;">
        Delivery
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${buildDetailRow("Name", order.customerInfo?.fullName || "")}
        ${buildDetailRow("Phone", order.customerInfo?.phone || "")}
        ${buildDetailRow("Email", order.customerInfo?.email || "")}
        ${buildDetailRow("Governorate", order.customerInfo?.city || "")}
        ${buildDetailRow("Address", order.customerInfo?.address || "")}
        ${buildDetailRow("Notes", order.customerInfo?.notes || "")}
      </table>
    </div>
  `;
};

const buildItemsText = (order) =>
  (order.items || [])
    .map(
      (item) =>
        `- ${item.name} / ${item.color?.name || ""} / ${
          item.size?.label || ""
        } x ${item.quantity} = ${formatMoney(item.lineSubtotal)}`
    )
    .join("\n");

const buildAdminOrderText = (order) => {
  const lines = [
    `New Davinto Order`,
    ``,
    `Order Number: ${order.orderNumber}`,
    `Customer: ${order.customerInfo?.fullName || ""}`,
    `Phone: ${order.customerInfo?.phone || ""}`,
    `Second Phone: ${order.customerInfo?.secondPhone || ""}`,
    `Email: ${order.customerInfo?.email || ""}`,
    `City: ${order.customerInfo?.city || ""}`,
    `Address: ${order.customerInfo?.address || ""}`,
    `Notes: ${order.customerInfo?.notes || ""}`,
    ``,
    `Payment Method: ${getPaymentMethodLabel(order.paymentMethod)}`,
    `Payment Status: ${formatStatus(order.paymentStatus)}`,
    `Payment Reference: ${order.paymentReference || ""}`,
    ``,
    `Subtotal: ${formatMoney(order.subtotal)}`,
    `Bundle Discount: ${formatMoney(order.bundleDiscountTotal)}`,
    `Offer Discount: ${formatMoney(order.offerDiscountTotal)}`,
    `Discount Code: ${formatMoney(order.discountTotal)}`,
    `Delivery: ${formatMoney(order.deliveryFee)}`,
    `Total: ${formatMoney(order.total)}`,
    ``,
    `Items:`,
    ...(order.items || []).map(
      (item) =>
        `- ${item.name} / ${item.color?.name || ""} / ${
          item.size?.label || ""
        } x ${item.quantity} = ${formatMoney(item.lineSubtotal)}`
    ),
  ];

  return lines.join("\n");
};

const buildCustomerOrderText = (order) => {
  return [
    `Your Davinto order has been received.`,
    ``,
    `Order Number: ${order.orderNumber}`,
    `Track Order: ${getTrackingUrl(order)}`,
    `Use your order number and checkout email to track your order.`,
    ``,
    `Order Status: ${formatStatus(order.orderStatus)}`,
    `Payment Status: ${formatStatus(order.paymentStatus)}`,
    `Payment Method: ${getPaymentMethodLabel(order.paymentMethod)}`,
    `Delivery: ${formatMoney(order.deliveryFee)}`,
    `Governorate: ${order.customerInfo?.city || ""}`,
    `Address: ${order.customerInfo?.address || ""}`,
    ``,
    `Total: ${formatMoney(order.total)}`,
    ``,
    `Items:`,
    buildItemsText(order),
    ``,
    `Thank you for shopping with Davinto.`,
  ].join("\n");
};

const buildAdminOrderHtml = (order) => {
  const trackingUrl = getTrackingUrl(order);

  return buildEmailShell({
    title: `New Order ${order.orderNumber}`,
    preview: `New Davinto order from ${order.customerInfo?.fullName || "customer"}.`,
    children: `
      <p style="margin:0 0 22px;color:rgba(247,243,234,0.65);font-size:15px;line-height:1.8;">
        A new order has been placed on Davinto.
      </p>

      <div style="padding:18px;border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.035);border-radius:20px;">
        <p style="margin:0 0 12px;color:rgba(247,243,234,0.45);font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:800;">
          Customer
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${buildDetailRow("Name", order.customerInfo?.fullName || "")}
          ${buildDetailRow("Phone", order.customerInfo?.phone || "")}
          ${buildDetailRow("Second Phone", order.customerInfo?.secondPhone || "")}
          ${buildDetailRow("Email", order.customerInfo?.email || "")}
          ${buildDetailRow("City", order.customerInfo?.city || "")}
          ${buildDetailRow("Address", order.customerInfo?.address || "")}
          ${buildDetailRow("Notes", order.customerInfo?.notes || "")}
        </table>
      </div>

      <div style="margin-top:18px;padding:18px;border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.035);border-radius:20px;">
        <p style="margin:0 0 12px;color:rgba(247,243,234,0.45);font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:800;">
          Payment
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${buildDetailRow("Method", getPaymentMethodLabel(order.paymentMethod))}
          ${buildDetailRow("Order Status", formatStatus(order.orderStatus))}
          ${buildDetailRow("Payment Status", formatStatus(order.paymentStatus))}
          ${buildDetailRow("Payment Reference", order.paymentReference || "—")}
        </table>
      </div>

      ${buildDeliveryHtml(order)}

      <div style="margin-top:18px;padding:18px;border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.035);border-radius:20px;">
        <p style="margin:0 0 12px;color:rgba(247,243,234,0.45);font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:800;">
          Items
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${buildItemsHtml(order.items)}
        </table>
      </div>

      ${buildSavingsHtml(order)}

      <div style="margin-top:18px;padding:18px;border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.035);border-radius:20px;">
        <p style="margin:0 0 12px;color:rgba(247,243,234,0.45);font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:800;">
          Totals
        </p>

        ${buildTotalsHtml(order)}
      </div>

      <div style="margin-top:22px;">
        <a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:#f7f3ea;color:#090909;text-decoration:none;padding:14px 20px;border-radius:999px;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:2px;">
          Track Order
        </a>
      </div>
    `,
  });
};

const buildCustomerOrderHtml = (order) => {
  const trackingUrl = getTrackingUrl(order);

  return buildEmailShell({
    title: `Order ${order.orderNumber} Received`,
    preview: `Your Davinto order has been received.`,
    children: `
      <p style="margin:0 0 22px;color:rgba(247,243,234,0.65);font-size:15px;line-height:1.8;">
        Hi ${escapeHtml(order.customerInfo?.fullName || "there")}, your order has been received successfully. You can track it anytime using your order number and checkout email.
      </p>

      <div style="padding:18px;border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.035);border-radius:20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${buildDetailRow("Order Number", order.orderNumber, true)}
          ${buildDetailRow("Order Status", formatStatus(order.orderStatus))}
          ${buildDetailRow("Payment Status", formatStatus(order.paymentStatus))}
          ${buildDetailRow("Payment Method", getPaymentMethodLabel(order.paymentMethod))}
          ${buildDetailRow("Total", formatMoney(order.total), true)}
        </table>
      </div>

      ${buildDeliveryHtml(order)}

      <div style="margin-top:18px;padding:18px;border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.035);border-radius:20px;">
        <p style="margin:0 0 12px;color:rgba(247,243,234,0.45);font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:800;">
          Items
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${buildItemsHtml(order.items)}
        </table>
      </div>

      ${buildSavingsHtml(order)}

      <div style="margin-top:18px;padding:18px;border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.035);border-radius:20px;">
        <p style="margin:0 0 12px;color:rgba(247,243,234,0.45);font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:800;">
          Totals
        </p>

        ${buildTotalsHtml(order)}
      </div>

      <div style="margin-top:22px;">
        <a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:#f7f3ea;color:#090909;text-decoration:none;padding:14px 20px;border-radius:999px;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:2px;">
          Track Order
        </a>
      </div>
    `,
  });
};

const sendAdminOrderNotification = async (order) => {
  const adminEmail = getAdminOrderEmail();

  return sendEmail({
    to: adminEmail,
    subject: `New Davinto Order ${order.orderNumber} — ${formatMoney(
      order.total
    )}`,
    text: buildAdminOrderText(order),
    html: buildAdminOrderHtml(order),
    replyTo: order.customerInfo?.email || undefined,
  });
};

const sendCustomerOrderConfirmation = async (order) => {
  const customerEmail = normalizeText(order.customerInfo?.email);

  if (!customerEmail) {
    return {
      success: false,
      skipped: true,
      reason: "Customer email is missing.",
    };
  }

  return sendEmail({
    to: customerEmail,
    subject: `Davinto Order ${order.orderNumber} Received`,
    text: buildCustomerOrderText(order),
    html: buildCustomerOrderHtml(order),
  });
};

const sendOrderNotifications = async (order) => {
  if (!order) {
    return {
      success: false,
      skipped: true,
      reason: "Order is missing.",
      results: [],
    };
  }

  if (!isEmailConfigured()) {
    console.warn(
      `Order ${order.orderNumber} email notifications skipped: SMTP is not configured.`
    );

    return {
      success: false,
      skipped: true,
      reason:
        "SMTP is not configured. Order was created, but emails were skipped.",
      results: [],
    };
  }

  const adminEmail = getAdminOrderEmail();
  const customerEmail = normalizeText(order.customerInfo?.email);

  console.log(
    `Order ${order.orderNumber} email notification attempt: admin=${
      adminEmail ? "yes" : "no"
    }, customer=${customerEmail ? "yes" : "no"}`
  );

  const results = await Promise.allSettled([
    sendAdminOrderNotification(order),
    sendCustomerOrderConfirmation(order),
  ]);

  const normalizedResults = results.map((result, index) => {
    const type = index === 0 ? "admin" : "customer";

    if (result.status === "fulfilled") {
      return {
        type,
        ...result.value,
      };
    }

    return {
      type,
      success: false,
      skipped: false,
      reason: getSafeSmtpErrorMessage(result.reason),
    };
  });

  normalizedResults.forEach((result) => {
    const label = result.type === "admin" ? "admin" : "customer";

    if (result.success) {
      console.log(
        `Order ${order.orderNumber} ${label} email sent successfully.`
      );
      return;
    }

    if (result.skipped) {
      console.warn(
        `Order ${order.orderNumber} ${label} email skipped: ${
          result.reason || "No reason provided."
        }`
      );
      return;
    }

    console.warn(
      `Order ${order.orderNumber} ${label} email failed: ${
        result.reason || "Email failed."
      }`
    );
  });

  return {
    success: normalizedResults.some((result) => result.success),
    skipped: false,
    results: normalizedResults,
  };
};

module.exports = {
  sendOrderNotifications,
  sendAdminOrderNotification,
  sendCustomerOrderConfirmation,
};
