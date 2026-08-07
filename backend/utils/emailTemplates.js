const esc = require("./escapeHtml");

const brand = {
  name: "StickToon",
  primary: "#111827",
  accent: "#6366F1",
  bg: "#F9FAFB",
};

const wrapper = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
</head>
<body style="margin:0;padding:0;background:${brand.bg};font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:30px 0;">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.08);">

          <!-- HEADER -->
          <tr>
            <td style="background:${brand.primary};padding:20px 30px;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;">
                🧾 ${brand.name}
              </h1>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="padding:30px;">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f3f4f6;padding:15px 30px;text-align:center;font-size:12px;color:#6b7280;">
              © ${new Date().getFullYear()} ${brand.name}. All rights reserved.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/* =========================
   ADMIN EMAIL (SUMMARY ONLY)
========================= */
exports.adminOrderSuccessEmail = ({ order, invoice, shiprocketSynced }) => {
  const syncStatusHtml = shiprocketSynced
    ? `
        <div style="background: #ecfdf5; border: 2px solid #10b981; padding: 15px; border-radius: 8px; margin-bottom: 20px; color: #065f46; font-family: Arial, sans-serif;">
          <h3 style="margin: 0; font-size: 16px;">✅ Auto-Synced to Shiprocket!</h3>
          <p style="margin: 5px 0 0; font-size: 14px;">The order has been automatically pushed to Shiprocket. Go to your Shiprocket panel and ship the order.</p>
        </div>
      `
    : `
        <div style="background: #fffbeb; border: 2px solid #f59e0b; padding: 15px; border-radius: 8px; margin-bottom: 20px; color: #92400e; font-family: Arial, sans-serif;">
          <h3 style="margin: 0; font-size: 16px;">⚠️ Manual Action Required</h3>
          <p style="margin: 5px 0 0; font-size: 14px;">This order is NOT auto-synced. Please open your Admin Panel, review the order, and click "Send to Shiprocket" to proceed with the shipment.</p>
        </div>
      `;

  return wrapper(`
    <h2 style="margin-top:0;">New Paid Order</h2>
    
    ${syncStatusHtml}

    <p><b>Status:</b> SUCCESS</p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />

    <p><b>Invoice:</b> ${invoice.invoiceNumber}</p>
    <p><b>Order ID:</b> ${order._id}</p>
    <p><b>Amount:</b> ₹${invoice.amount}</p>
    <p><b>Payment:</b> ${invoice.paymentMethod}</p>
    <p><b>Gateway:</b> ${invoice.paymentGateway}</p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />

    <h3>Customer</h3>
    <p><b>Email:</b> ${esc(invoice.email || order.userEmail || "-")}</p>
    <p><b>Phone:</b> ${esc(invoice.address?.phone || "-")}</p>
    <p><b>Address:</b> ${esc(invoice.address?.street || "-")}</p>

    <p style="margin-top:20px;font-size:13px;color:#6b7280;">
      Invoice PDF is attached.
    </p>
  `);
};



/* =========================
   USER EMAIL
========================= */
exports.userOrderSuccessEmail = ({ order, invoice }) =>
  wrapper(`
    <h2 style="margin-top:0;color:${brand.primary};">
      Payment Successful 🎉
    </h2>

    <p>Hi <b>${esc(order.address.name)}</b>,</p>

    <p>
      Thank you for shopping with <b>${brand.name}</b>.
      Your payment has been received successfully.
    </p>

    <table width="100%" style="border-collapse:collapse;margin:20px 0;">
      <tr>
        <td><b>Invoice</b></td>
        <td>${invoice.invoiceNumber}</td>
      </tr>
      <tr>
        <td><b>Order ID</b></td>
        <td>${order._id}</td>
      </tr>
      <tr>
        <td><b>Amount Paid</b></td>
        <td>₹${order.amount}</td>
      </tr>
      <tr>
        <td><b>Payment Method</b></td>
        <td>${order.paymentMethod}</td>
      </tr>
    </table>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:25px 0;" />

    <h3>Delivery Address</h3>
    <p style="margin:0;">
      ${esc(order.address.street)}<br/>
      Phone: ${esc(order.address.phone)}
    </p>

    <p style="margin-top:30px;">
      Your invoice is attached as a PDF for your reference.
    </p>

    <p style="margin-top:20px;">
      ❤️ Team ${brand.name}
    </p>
  `);


  exports.resetPasswordEmail = ({ resetUrl }) =>
  wrapper(`
    <h2 style="margin-top:0;color:${brand.primary};">
      Reset your StickToon password
    </h2>

    <p>
      You requested a password reset.
      Click the button below to set a new password.
    </p>

    <div style="text-align:center;margin:30px 0;">
      <a href="${resetUrl}"
        style="
          background:${brand.accent};
          color:#ffffff;
          padding:14px 28px;
          text-decoration:none;
          border-radius:10px;
          font-weight:bold;
          display:inline-block;
        ">
        Reset Password
      </a>
    </div>

    <p style="font-size:13px;color:#6b7280;">
      This link expires in 15 minutes.
      If you didn’t request this, you can safely ignore this email.
    </p>
  `);

/* =========================
   DATA BACKUP (ADMIN)
========================= */
exports.backupEmail = ({ trigger, triggeredBy, counts, stamp }) => {
  const isWeekly = trigger === "weekly";

  const rows = Object.entries(counts || {})
    .map(
      ([name, count]) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${esc(name)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:bold;">${esc(count)}</td>
        </tr>`
    )
    .join("");

  return wrapper(`
    <h2 style="margin:0 0 6px;color:${brand.primary};">
      🗄️ ${isWeekly ? "Weekly" : "Manual"} Data Backup
    </h2>

    <p style="font-size:14px;color:#374151;margin:0 0 20px;">
      ${
        isWeekly
          ? "Your scheduled Sunday backup is attached."
          : `Backup generated on request${triggeredBy ? ` by <b>${esc(triggeredBy)}</b>` : ""}.`
      }
      Backup date: <b>${esc(stamp)}</b>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#374151;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <tr style="background:#f9fafb;">
        <td style="padding:8px 12px;font-weight:bold;">Collection</td>
        <td style="padding:8px 12px;font-weight:bold;text-align:right;">Records</td>
      </tr>
      ${rows}
    </table>

    <p style="font-size:13px;color:#6b7280;margin-top:20px;">
      Each collection is attached as a CSV file (UTF-8, opens in Excel or Google Sheets)
      for reading. The <b>RESTORE-${esc(stamp)}.json</b> file is the one to keep for
      recovery — it preserves record IDs and links between collections, which the CSVs do not.
      Restore with <b>node scripts/restoreBackup.js RESTORE-${esc(stamp)}.json --yes</b>.
    </p>

    <p style="font-size:13px;color:#6b7280;">
      Passwords and reset tokens are excluded from every file, so restored users must use
      Forgot Password to sign in again. Store these attachments somewhere safe —
      they contain customer data.
    </p>
  `);
};
