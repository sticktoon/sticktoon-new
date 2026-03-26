const PDFDocument = require("pdfkit");
const invoiceProfile = require("../config/invoiceProfile");

function toNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function inr(value) {
  return `Rs ${toNum(value).toFixed(2)}`;
}

function textOrDash(value) {
  return value ? String(value) : "-";
}

function fmtDate(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN");
}

function numberToWords(num) {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convert(n) {
    if (n === 0) return "";
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ` ${ones[n % 10]}` : "");
    if (n < 1000) {
      return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${convert(n % 100)}` : ""}`;
    }
    if (n < 100000) {
      return `${convert(Math.floor(n / 1000))} Thousand${n % 1000 ? ` ${convert(n % 1000)}` : ""}`;
    }
    return `${convert(Math.floor(n / 100000))} Lakh${n % 100000 ? ` ${convert(n % 100000)}` : ""}`;
  }

  return convert(Math.floor(num));
}

module.exports = ({ invoice, order }) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 32 });
    const buffers = [];
    doc.on("data", (d) => buffers.push(d));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const seller = invoiceProfile.seller;
    const bank = invoiceProfile.bank;
    const cfg = invoiceProfile.invoice;

    const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    const right = left + pageW;

    const items = Array.isArray(order?.items) ? order.items : [];
    const subtotal = items.reduce((sum, it) => sum + toNum(it.price) * toNum(it.quantity || 1), 0);
    const delivery = toNum(order?.deliveryCharges || order?.shippingCost || 0);
    const discount = toNum(invoice?.discount || order?.discount || 0);
    const taxable = Math.max(subtotal + delivery - discount, 0);

    const gstRate = toNum(cfg.gstRatePercent) / 100;
    const sellerState = seller.stateName;
    const buyerState = invoice?.address?.state || order?.address?.state || sellerState;
    const isIntraState = String(sellerState).toLowerCase() === String(buyerState).toLowerCase();

    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    if (isIntraState) {
      cgst = taxable * gstRate * 0.5;
      sgst = taxable * gstRate * 0.5;
    } else {
      igst = taxable * gstRate;
    }
    const totalTax = cgst + sgst + igst;
    const grandTotal = taxable + totalTax;

    const amountWords = `${numberToWords(Math.floor(grandTotal))} Rupees Only`;

    function fieldBox(x, y, w, h, label, value) {
      doc.rect(x, y, w, h).stroke("#d1d5db");
      doc.font("Helvetica").fontSize(7).fillColor("#64748b").text(label, x + 6, y + 5, { width: w - 12 });
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a").text(textOrDash(value), x + 6, y + 16, { width: w - 12 });
    }

    doc.rect(left, 22, pageW, 44).fill("#111827");
    doc.font("Helvetica-Bold").fontSize(19).fillColor("#ffffff").text(seller.brandName, left + 10, 35);
    doc.font("Helvetica-Bold").fontSize(17).fillColor("#f59e0b").text("TAX INVOICE", right - 145, 36, {
      width: 135,
      align: "right",
    });

    let y = 78;
    const half = (pageW - 10) / 2;

    doc.rect(left, y, half, 116).stroke("#d1d5db");
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a").text("Seller Details", left + 8, y + 8);
    doc.font("Helvetica-Bold").fontSize(9).text(seller.legalName, left + 8, y + 24);
    doc.font("Helvetica").fontSize(8).fillColor("#334155").text(seller.addressLines.join(", "), left + 8, y + 38, { width: half - 16 });
    doc.font("Helvetica").text(`Email: ${seller.email}`, left + 8, y + 66);
    doc.text(`Phone: ${seller.phone}`, left + 8, y + 77);
    doc.text(`GSTIN: ${seller.gstin}`, left + 8, y + 88);
    doc.text(`State: ${seller.stateName} (${seller.stateCode})`, left + 8, y + 99);

    const billX = left + half + 10;
    doc.rect(billX, y, half, 116).stroke("#d1d5db");
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a").text("Bill To", billX + 8, y + 8);
    doc.font("Helvetica-Bold").fontSize(9).text(
      textOrDash(invoice?.userId?.name || invoice?.address?.name || order?.address?.name),
      billX + 8,
      y + 24
    );
    doc.font("Helvetica").fontSize(8).fillColor("#334155").text(
      textOrDash(invoice?.address?.street || order?.address?.street),
      billX + 8,
      y + 38,
      { width: half - 16 }
    );
    doc.text(`Email: ${textOrDash(invoice?.userId?.email || invoice?.email || order?.userEmail)}`, billX + 8, y + 66);
    doc.text(`Phone: ${textOrDash(invoice?.userId?.phone || invoice?.address?.phone || order?.address?.phone)}`, billX + 8, y + 77);
    doc.text(`Place of Supply: ${textOrDash(invoice?.address?.state || cfg.placeOfSupplyDefault)}`, billX + 8, y + 88);
    doc.text(`Payment: ${textOrDash(invoice?.paymentMethod || order?.paymentMethod)}`, billX + 8, y + 99);

    y += 128;
    const fW = (pageW - 18) / 4;
    fieldBox(left, y, fW, 40, "Invoice No", invoice?.invoiceNumber);
    fieldBox(left + fW + 6, y, fW, 40, "Invoice Date", fmtDate(invoice?.createdAt));
    fieldBox(left + (fW + 6) * 2, y, fW, 40, "Order ID", String(order?._id || "").slice(-12));
    fieldBox(left + (fW + 6) * 3, y, fW, 40, "Order Date", fmtDate(order?.createdAt));
    y += 52;

    doc.rect(left, y, pageW, 22).fill("#f1f5f9");
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a");
    const x1 = left + 8;
    const x2 = left + 34;
    const x3 = left + 330;
    const x4 = left + 390;
    const x5 = left + 450;
    doc.text("#", x1, y + 7);
    doc.text("Description", x2, y + 7);
    doc.text("Qty", x3, y + 7, { width: 45, align: "center" });
    doc.text("Rate", x4, y + 7, { width: 55, align: "right" });
    doc.text("Amount", x5, y + 7, { width: 70, align: "right" });
    y += 22;

    items.forEach((item, idx) => {
      const rowY = y + idx * 22;
      doc.rect(left, rowY, pageW, 22).stroke("#e2e8f0");
      const amount = toNum(item.price) * toNum(item.quantity || 1);
      doc.font("Helvetica").fontSize(8).fillColor("#334155");
      doc.text(String(idx + 1), x1, rowY + 7);
      doc.text(textOrDash(item.name), x2, rowY + 7, { width: 285, ellipsis: true });
      doc.text(String(toNum(item.quantity || 1)), x3, rowY + 7, { width: 45, align: "center" });
      doc.text(toNum(item.price).toFixed(2), x4, rowY + 7, { width: 55, align: "right" });
      doc.text(toNum(amount).toFixed(2), x5, rowY + 7, { width: 70, align: "right" });
    });
    y += Math.max(items.length, 1) * 22 + 12;

    const sumX = right - 235;
    const labelW = 140;
    const valueW = 95;
    function summaryRow(label, value, strong, currentY) {
      doc.rect(sumX, currentY, labelW, 22).stroke("#e2e8f0");
      doc.rect(sumX + labelW, currentY, valueW, 22).stroke("#e2e8f0");
      doc.font(strong ? "Helvetica-Bold" : "Helvetica").fontSize(8).fillColor("#334155").text(label, sumX + 8, currentY + 7);
      doc.font(strong ? "Helvetica-Bold" : "Helvetica").fontSize(8).fillColor("#0f172a").text(inr(value), sumX + labelW + 8, currentY + 7, {
        width: valueW - 16,
        align: "right",
      });
    }

    summaryRow("Subtotal", subtotal, false, y);
    y += 22;
    if (delivery > 0) {
      summaryRow("Delivery", delivery, false, y);
      y += 22;
    }
    if (discount > 0) {
      summaryRow(`Discount${invoice?.promoCode ? ` (${invoice.promoCode})` : ""}`, -discount, false, y);
      y += 22;
    }
    if (isIntraState) {
      summaryRow("CGST", cgst, false, y);
      y += 22;
      summaryRow("SGST", sgst, false, y);
      y += 22;
    } else {
      summaryRow("IGST", igst, false, y);
      y += 22;
    }
    summaryRow("Grand Total", grandTotal, true, y);
    y += 30;

    doc.font("Helvetica-Bold").fontSize(8).fillColor("#0f172a").text("Amount In Words:", left, y, { continued: true });
    doc.font("Helvetica").fontSize(8).fillColor("#334155").text(` ${amountWords}`);
    y += 20;

    doc.rect(left, y, pageW, 64).stroke("#d1d5db");
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a").text("Bank Details", left + 8, y + 8);
    doc.font("Helvetica").fontSize(8).fillColor("#334155")
      .text(`Account Name: ${bank.accountName}`, left + 8, y + 22)
      .text(`Account No: ${bank.accountNumber}`, left + 210, y + 22)
      .text(`IFSC: ${bank.ifsc}`, left + 8, y + 36)
      .text(`Bank: ${bank.bankName}, ${bank.branch}`, left + 210, y + 36);
    y += 74;

    doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a").text("Terms", left, y);
    y += 12;
    invoiceProfile.terms.forEach((line) => {
      doc.font("Helvetica").fontSize(7).fillColor("#475569").text(`- ${line}`, left, y, { width: pageW });
      y += 11;
    });

    const signY = doc.page.height - 86;
    doc.font("Helvetica").fontSize(8).fillColor("#334155").text(`For ${seller.legalName}`, right - 150, signY, {
      width: 140,
      align: "right",
    });
    doc.moveTo(right - 130, signY + 34).lineTo(right - 16, signY + 34).stroke("#94a3b8");
    doc.font("Helvetica").fontSize(7).fillColor("#64748b").text("Authorized Signatory", right - 140, signY + 38, {
      width: 130,
      align: "right",
    });

    const footerY = doc.page.height - 30;
    doc.moveTo(left, footerY).lineTo(right, footerY).stroke("#e2e8f0");
    doc.font("Helvetica").fontSize(7).fillColor("#94a3b8").text(
      `${seller.brandName} | ${seller.email} | www.sticktoon.shop`,
      left,
      footerY + 6,
      { width: pageW, align: "center" }
    );

    doc.end();
  });
