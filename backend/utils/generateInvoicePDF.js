const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const invoiceProfile = require("../config/invoiceProfile");

const HEADER_LOGO_CANDIDATES = [
  path.resolve(__dirname, "../../public/images/STICKTOON_LONG.jpeg"),
  path.resolve(__dirname, "../../public/images/STICKTOON_LONG.jpg"),
  path.resolve(__dirname, "../../public/images/STICKTOON_LONG.png"),
];

function getExistingFile(candidates) {
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function dataUriToBuffer(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  if (!match) return null;
  try {
    return Buffer.from(match[1], "base64");
  } catch {
    return null;
  }
}

function resolveLocalItemImagePath(imagePath) {
  if (typeof imagePath !== "string" || !imagePath) return null;
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) return null;

  // Keep true absolute filesystem paths when they exist.
  if (path.isAbsolute(imagePath) && fs.existsSync(imagePath)) return imagePath;

  const clean = imagePath.replace(/^\/+/, "");
  const publicPath = path.resolve(__dirname, "../../public", clean);
  if (fs.existsSync(publicPath)) return publicPath;

  const rootPath = path.resolve(__dirname, "../../", clean);
  if (fs.existsSync(rootPath)) return rootPath;

  return null;
}

function resolveImageSource(imageValue) {
  const inlineBuffer = dataUriToBuffer(imageValue);
  if (inlineBuffer) return inlineBuffer;
  return resolveLocalItemImagePath(imageValue);
}

async function prepareSignatureImage(imageSource) {
  if (!imageSource) return null;

  try {
    const input = Buffer.isBuffer(imageSource) ? imageSource : fs.readFileSync(imageSource);

    // Trim transparent/white padding around signature so it appears at practical size.
    const trimmed = await sharp(input)
      .trim({ threshold: 12 })
      .png()
      .toBuffer();

    return trimmed;
  } catch {
    return imageSource;
  }
}

function drawItemImage(doc, imageValue, x, y, width, height) {
  const imgX = x;
  const imgY = y;
  const imgW = Math.max(width, 10);
  const imgH = Math.max(height, 10);

  const imageSource = resolveImageSource(imageValue);

  if (imageSource) {
    try {
      doc.image(imageSource, imgX, imgY, {
        fit: [imgW, imgH],
        align: "center",
        valign: "center",
      });
      return;
    } catch {
      // fall through to placeholder
    }
  }

  doc.font("Helvetica").fontSize(6).fillColor("#94a3b8").text("NO IMG", imgX, imgY + imgH / 2 - 3, {
    width: imgW,
    align: "center",
  });
}

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
    const doc = new PDFDocument({ size: "A4", margin: 24 });
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
      doc.font("Helvetica").fontSize(6.5).fillColor("#64748b").text(label, x + 6, y + 4, { width: w - 12 });
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f172a").text(textOrDash(value), x + 6, y + 14, { width: w - 12 });
    }

    doc.rect(left, 22, pageW, 38).fill("#000000");
    const headerLogoPath = getExistingFile(HEADER_LOGO_CANDIDATES);
    if (headerLogoPath) {
      try {
        doc.image(headerLogoPath, left + 8, 29, { fit: [200, 24], align: "left", valign: "center" });
      } catch {
        doc.font("Helvetica-Bold").fontSize(17).fillColor("#ffffff").text(seller.brandName, left + 10, 33);
      }
    } else {
      doc.font("Helvetica-Bold").fontSize(17).fillColor("#ffffff").text(seller.brandName, left + 10, 33);
    }
    doc.font("Helvetica-Bold").fontSize(16).fillColor("#f59e0b").text("TAX INVOICE", right - 140, 33, {
      width: 135,
      align: "right",
    });

    let y = 70;
    const half = (pageW - 10) / 2;

    doc.rect(left, y, half, 102).stroke("#d1d5db");
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a").text("Seller Details", left + 8, y + 7);
    doc.font("Helvetica-Bold").fontSize(9).text(seller.legalName, left + 8, y + 21);
    doc.font("Helvetica").fontSize(8).fillColor("#334155").text(seller.addressLines.join(", "), left + 8, y + 34, { width: half - 16 });
    doc.font("Helvetica").text(`Email: ${seller.email}`, left + 8, y + 58);
    doc.text(`Phone: ${seller.phone}`, left + 8, y + 68);
    doc.text(`GSTIN: ${seller.gstin}`, left + 8, y + 78);
    doc.text(`State: ${seller.stateName} (${seller.stateCode})`, left + 8, y + 88);

    const billX = left + half + 10;
    doc.rect(billX, y, half, 102).stroke("#d1d5db");
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a").text("Bill To", billX + 8, y + 7);
    doc.font("Helvetica-Bold").fontSize(9).text(
      textOrDash(invoice?.userId?.name || invoice?.address?.name || order?.address?.name),
      billX + 8,
      y + 21
    );
    doc.font("Helvetica").fontSize(8).fillColor("#334155").text(
      textOrDash(invoice?.address?.street || order?.address?.street),
      billX + 8,
      y + 34,
      { width: half - 16 }
    );
    doc.text(`Email: ${textOrDash(invoice?.userId?.email || invoice?.email || order?.userEmail)}`, billX + 8, y + 58);
    doc.text(`Phone: ${textOrDash(invoice?.userId?.phone || invoice?.address?.phone || order?.address?.phone)}`, billX + 8, y + 68);
    doc.text(`Place of Supply: ${textOrDash(invoice?.address?.state || cfg.placeOfSupplyDefault)}`, billX + 8, y + 78);
    doc.text(`Payment: ${textOrDash(invoice?.paymentMethod || order?.paymentMethod)}`, billX + 8, y + 88);

    y += 112;
    const fW = (pageW - 18) / 4;
    fieldBox(left, y, fW, 34, "Invoice No", invoice?.invoiceNumber);
    fieldBox(left + fW + 6, y, fW, 34, "Invoice Date", fmtDate(invoice?.createdAt));
    fieldBox(left + (fW + 6) * 2, y, fW, 34, "Order ID", String(order?._id || "").slice(-12));
    fieldBox(left + (fW + 6) * 3, y, fW, 34, "Order Date", fmtDate(order?.createdAt));
    y += 42;

    const tableHeaderH = 20;
    const summaryRowH = 18;
    const summaryRows = 2 + (delivery > 0 ? 1 : 0) + (discount > 0 ? 1 : 0) + (isIntraState ? 2 : 1);
    const rowsCount = Math.max(items.length, 1);
    const postTableEstimate = summaryRows * summaryRowH + 96;
    const availableRowsHeight = doc.page.height - 110 - (y + tableHeaderH + postTableEstimate);
    const minRowH = 30;
    const maxRowH = 42;
    const dynamicRowH = Math.floor(availableRowsHeight / rowsCount);
    const rowHeight = Math.max(minRowH, Math.min(maxRowH, Number.isFinite(dynamicRowH) ? dynamicRowH : maxRowH));
    const thumbSize = Math.max(22, rowHeight - 4);

    const tablePad = 6;
    const tableInnerW = pageW - tablePad * 2;
    const colSr = 24;
    const colImg = 72;
    const colQty = 42;
    const colRate = 62;
    const colAmount = 72;
    const colDesc = Math.max(tableInnerW - (colSr + colImg + colQty + colRate + colAmount), 120);

    const xSr = left + tablePad;
    const xImg = xSr + colSr;
    const xDesc = xImg + colImg;
    const xQty = xDesc + colDesc;
    const xRate = xQty + colQty;
    const xAmount = xRate + colRate;

    doc.rect(left, y, pageW, tableHeaderH).fill("#f1f5f9");
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f172a");
    doc.text("#", xSr, y + 6, { width: colSr, align: "left" });
    doc.text("Image", xImg, y + 6, { width: colImg, align: "center" });
    doc.text("Description", xDesc + 2, y + 6, { width: colDesc - 4 });
    doc.text("Qty", xQty, y + 6, { width: colQty, align: "center" });
    doc.text("Rate", xRate, y + 6, { width: colRate, align: "right" });
    doc.text("Amount", xAmount, y + 6, { width: colAmount, align: "right" });
    y += tableHeaderH;

    items.forEach((item, idx) => {
      const rowY = y + idx * rowHeight;
      doc.rect(left, rowY, pageW, rowHeight).stroke("#e2e8f0");
      const amount = toNum(item.price) * toNum(item.quantity || 1);
      doc.font("Helvetica").fontSize(8).fillColor("#334155");
      doc.text(String(idx + 1), xSr, rowY + (rowHeight - 8) / 2, { width: colSr, align: "left" });

      drawItemImage(
        doc,
        item?.image,
        xImg + (colImg - thumbSize) / 2,
        rowY + (rowHeight - thumbSize) / 2,
        thumbSize,
        thumbSize
      );

      doc.text(textOrDash(item.name), xDesc + 2, rowY + (rowHeight - 8) / 2, {
        width: colDesc - 6,
        ellipsis: true,
      });
      doc.text(String(toNum(item.quantity || 1)), xQty, rowY + (rowHeight - 8) / 2, { width: colQty, align: "center" });
      doc.text(toNum(item.price).toFixed(2), xRate, rowY + (rowHeight - 8) / 2, { width: colRate, align: "right" });
      doc.text(toNum(amount).toFixed(2), xAmount, rowY + (rowHeight - 8) / 2, { width: colAmount, align: "right" });
    });
    y += Math.max(items.length, 1) * rowHeight + 8;

    const sectionY = y;
    const sumX = right - 220;
    const labelW = 130;
    const valueW = 90;
    function summaryRow(label, value, strong, currentY) {
      doc.rect(sumX, currentY, labelW, summaryRowH).stroke("#e2e8f0");
      doc.rect(sumX + labelW, currentY, valueW, summaryRowH).stroke("#e2e8f0");
      doc.font(strong ? "Helvetica-Bold" : "Helvetica").fontSize(7.5).fillColor("#334155").text(label, sumX + 6, currentY + 5);
      doc.font(strong ? "Helvetica-Bold" : "Helvetica").fontSize(7.5).fillColor("#0f172a").text(inr(value), sumX + labelW + 6, currentY + 5, {
        width: valueW - 16,
        align: "right",
      });
    }

    let summaryY = sectionY;
    summaryRow("Subtotal", subtotal, false, summaryY);
    summaryY += summaryRowH;
    if (delivery > 0) {
      summaryRow("Delivery", delivery, false, summaryY);
      summaryY += summaryRowH;
    }
    if (discount > 0) {
      summaryRow(`Discount${invoice?.promoCode ? ` (${invoice.promoCode})` : ""}`, -discount, false, summaryY);
      summaryY += summaryRowH;
    }
    if (isIntraState) {
      summaryRow("CGST", cgst, false, summaryY);
      summaryY += summaryRowH;
      summaryRow("SGST", sgst, false, summaryY);
      summaryY += summaryRowH;
    } else {
      summaryRow("IGST", igst, false, summaryY);
      summaryY += summaryRowH;
    }
    summaryRow("Grand Total", grandTotal, true, summaryY);
    summaryY += summaryRowH;

    const bankGap = 10;
    const bankX = left;
    const bankW = Math.max(sumX - bankX - bankGap, 220);
    const bankH = Math.max(summaryY - sectionY, 56);

    // Temporarily hidden: Bank details section from invoice output.
    // doc.rect(bankX, sectionY, bankW, bankH).stroke("#d1d5db");
    // doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f172a").text("Bank Details", bankX + 8, sectionY + 6);
    //
    // const bankColGap = 12;
    // const bankTextTop = sectionY + 20;
    // const bankTextW = (bankW - 16 - bankColGap) / 2;
    // const bankRightX = bankX + 8 + bankTextW + bankColGap;
    //
    // doc.font("Helvetica").fontSize(7.5).fillColor("#334155")
    //   .text(`Account Name: ${bank.accountName}`, bankX + 8, bankTextTop, { width: bankTextW })
    //   .text(`IFSC: ${bank.ifsc}`, bankX + 8, bankTextTop + 13, { width: bankTextW })
    //   .text(`Account No: ${bank.accountNumber}`, bankRightX, bankTextTop, { width: bankTextW })
    //   .text(`Bank: ${bank.bankName}, ${bank.branch}`, bankRightX, bankTextTop + 13, { width: bankTextW });

    y = sectionY + Math.max(bankH, summaryY - sectionY) + 12;

    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#0f172a").text("Amount In Words:", left, y, { continued: true });
    doc.font("Helvetica").fontSize(7.5).fillColor("#334155").text(` ${amountWords}`);
    y += 16;

    const footerY = doc.page.height - doc.page.margins.bottom - 14;
    const signBlockHeight = 72;
    let signY = footerY - signBlockHeight - 6;

    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f172a").text("Terms", left, y);
    y += 10;

    const termLineHeight = 9;
    const availableTermLines = Math.max(0, Math.floor((signY - y - 6) / termLineHeight));
    const terms = Array.isArray(invoiceProfile.terms) ? invoiceProfile.terms : [];
    const visibleTerms = terms.slice(0, availableTermLines);

    visibleTerms.forEach((line) => {
      doc.font("Helvetica").fontSize(6.8).fillColor("#475569").text(`- ${line}`, left, y, { width: pageW });
      y += termLineHeight;
    });

    if (visibleTerms.length < terms.length && availableTermLines > 0) {
      doc.font("Helvetica").fontSize(6.8).fillColor("#64748b").text("- Additional terms available on request.", left, y, { width: pageW });
      y += termLineHeight;
    }

    signY = Math.max(signY, y + 4);
    signY = Math.min(signY, footerY - signBlockHeight - 2);

    const signAreaW = 180;
    const signAreaX = right - signAreaW - 4;
    const signLineY = signY + 54;

    const rawSignatureImage =
      resolveImageSource(seller.signatureImage) ||
      resolveImageSource("/images/STICKTOON SIGN.png") ||
      resolveImageSource("/images/owner-signature.png");

    (async () => {
      const signatureImage = await prepareSignatureImage(rawSignatureImage);

      let signatureDrawn = false;
      if (signatureImage) {
        try {
          const sigBoxW = Math.min(126, signAreaW - 24);
          const sigBoxH = 22;
          const sigBoxX = signAreaX + (signAreaW - sigBoxW) / 2;
          const sigBoxY = signLineY - sigBoxH - 9;

          doc.image(signatureImage, sigBoxX, sigBoxY, {
            fit: [sigBoxW, sigBoxH],
            align: "center",
            valign: "center",
          });
          signatureDrawn = true;
        } catch {
          // fall through to text fallback
        }
      }

      if (!signatureDrawn) {
        doc.font("Helvetica").fontSize(8).fillColor("#334155").text(seller.legalName, signAreaX, signLineY - 20, {
          width: signAreaW,
          align: "center",
        });
      }

      doc.moveTo(signAreaX + 12, signLineY).lineTo(signAreaX + signAreaW - 12, signLineY).stroke("#94a3b8");
      doc.font("Helvetica").fontSize(7).fillColor("#64748b").text("Authorized Signatory", signAreaX, signLineY + 4, {
        width: signAreaW,
        align: "center",
      });

      doc.moveTo(left, footerY).lineTo(right, footerY).stroke("#e2e8f0");
      doc.font("Helvetica").fontSize(7).fillColor("#94a3b8").text(
        `${seller.brandName} | ${seller.email} | www.sticktoon.shop`,
        left,
        footerY + 4,
        { width: pageW, align: "center" }
      );

      doc.end();
    })().catch(reject);
  });
