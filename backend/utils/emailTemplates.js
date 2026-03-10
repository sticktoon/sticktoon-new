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
exports.adminOrderSuccessEmail = ({ order, invoice }) =>
  wrapper(`
    <h2 style="margin-top:0;">New Paid Order</h2>
    <p><b>Status:</b> SUCCESS</p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />

    <p><b>Invoice:</b> ${invoice.invoiceNumber}</p>
    <p><b>Order ID:</b> ${order._id}</p>
    <p><b>Amount:</b> ₹${invoice.amount}</p>
    <p><b>Payment:</b> ${invoice.paymentMethod}</p>
    <p><b>Gateway:</b> ${invoice.paymentGateway}</p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />

    <h3>Customer</h3>
    <p><b>Email:</b> ${invoice.email || order.userEmail || "-"}</p>
    <p><b>Phone:</b> ${invoice.address?.phone || "-"}</p>
    <p><b>Address:</b> ${invoice.address?.street || "-"}</p>

    <p style="margin-top:20px;font-size:13px;color:#6b7280;">
      Invoice PDF is attached.
    </p>
  `);

/* =========================
   USER EMAIL (INVOICE STYLE)
========================= */
exports.userOrderSuccessEmail = ({ order, invoice }) =>
  wrapper(`
    <h2 style="margin-top:0;color:${brand.primary};">
      Payment Successful 🎉
    </h2>

    <p>
      Hi <b>${order.address?.name || "there"}</b>,<br/>
      Thank you for shopping with <b>${brand.name}</b>.
    </p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />

    <p><b>Invoice No:</b> ${invoice.invoiceNumber}</p>
    <p><b>Order ID:</b> ${order._id}</p>
    <p><b>Payment:</b> ${invoice.paymentMethod}</p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />

    <!-- ITEMS -->
    <table width="100%" cellpadding="0" cellspacing="0">
      ${order.items
        .map(
          (item) => `
        <tr>
          <td style="padding:8px 0;">
            <b>${item.name}</b><br/>
            <span style="color:#6b7280;font-size:13px;">
              ₹${item.price} × ${item.quantity}
            </span>
          </td>
          <td align="right" style="padding:8px 0;">
            ₹${item.price * item.quantity}
          </td>
        </tr>
      `
        )
        .join("")}
    </table>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />

    <!-- TOTALS -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>Subtotal</td>
        <td align="right">₹${order.subtotal}</td>
      </tr>
      <tr>
        <td>Delivery</td>
        <td align="right">₹99</td>
      </tr>
      <tr>
        <td style="font-weight:bold;font-size:16px;">Total</td>
        <td align="right" style="font-weight:bold;font-size:16px;">
          ₹${invoice.amount}
        </td>
      </tr>
    </table>

    <p style="margin-top:25px;">
      Your invoice is attached as a PDF.
    </p>

    <p style="margin-top:20px;">
      ❤️ Team ${brand.name}
    </p>
  `);






/* =========================
   USER EMAIL
========================= */
exports.userOrderSuccessEmail = ({ order, invoice }) =>
  wrapper(`
    <h2 style="margin-top:0;color:${brand.primary};">
      Payment Successful 🎉
    </h2>

    <p>Hi <b>${order.address.name}</b>,</p>

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
      ${order.address.street}<br/>
      Phone: ${order.address.phone}
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
