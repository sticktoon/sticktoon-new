const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

// Convert number to words (Indian format)
function numberToWords(num) {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
                 "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty",
                "Sixty", "Seventy", "Eighty", "Ninety"];

  function convert(n) {
    if (n === 0) return "";
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    }
    if (n < 1000) {
      return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    }
    if (n < 100000) {
      return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    }
    return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
  }

  return convert(Math.floor(num));
}

module.exports = ({ invoice, order }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      size: "A4", 
      margin: 30,
      bufferPages: true
    });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const left = 30;
    const right = doc.page.width - 30;
    const pageWidth = right - left;

    // DARKER AMBER/GOLD COLOR
    const accentColor = "#D97706";
    const lightAccent = "#FEF3C7";

    /* ========================
       BLACK HEADER BAR WITH LOGO
       ======================== */
    doc.rect(left, 10, pageWidth, 60).fill("#1a1a1a");
    
    const logoPath = path.join(__dirname, "../public/images/STICKTOON_LONG.jpeg");
    let logoLoaded = false;
    
    const possiblePaths = [
      logoPath,
      path.join(__dirname, "../../public/images/STICKTOON_LONG.jpeg"),
      path.join(__dirname, "../public/images/STICKTOON.jpeg"),
      path.join(__dirname, "../../public/images/STICKTOON.jpeg"),
    ];

    for (let lPath of possiblePaths) {
      if (fs.existsSync(lPath)) {
        try {
          doc.image(lPath, left + 10, 18, { width: 130, height: 45 });
          logoLoaded = true;
          break;
        } catch (e) {}
      }
    }
    
    if (!logoLoaded) {
      doc.font("Helvetica-Bold").fontSize(22).fillColor("#ffffff")
         .text("STICKTOON", left + 10, 25);
      doc.font("Helvetica").fontSize(8).fillColor("#cccccc")
         .text("We Create For The Store", left + 10, 50);
    }

    // TAX INVOICE - Dark amber color
    doc.font("Helvetica-Bold").fontSize(22).fillColor(accentColor)
       .text("TAX INVOICE", right - 160, 30, { width: 150, align: "right" });

    doc.y = 80;

    /* ========================
       INVOICE DETAILS HEADER BAR - DARK AMBER
       ======================== */
    const barY = doc.y;
    doc.rect(left, barY, pageWidth, 22).fill(accentColor);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#ffffff")
       .text("Invoice Details", left + 10, barY + 6);
    
    doc.y = barY + 25;

    /* ========================
       TWO COLUMN INFO SECTION
       ======================== */
    const infoY = doc.y;
    const colWidth = (pageWidth - 10) / 2;

    // Background box
    doc.rect(left, infoY, pageWidth, 100).fill("#fafafa").stroke("#e0e0e0");

    /* LEFT COLUMN - SELLER INFO */
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#1f2937")
       .text("StickToon", left + 10, infoY + 8);
    
    doc.font("Helvetica").fontSize(8).fillColor("#4b5563")
       .text("TBI, Ramdeobaba College,", left + 10, infoY + 22)
       .text("Nagpur, Maharashtra - 440013, India", left + 10, infoY + 32);
    
    doc.font("Helvetica").fontSize(7).fillColor("#6b7280")
       .text("Email: sticktoon.xyz@gmail.com", left + 10, infoY + 44)
       
    
    // GSTIN
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#1f2937")
       .text("GSTIN: ", left + 10, infoY + 68, { continued: true });
    doc.font("Helvetica").fontSize(7).fillColor("#4b5563")
       .text(invoice.sellerGSTIN || "27HENPP0138G1Z9");
    
    // Place of Supply
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#1f2937")
       .text("Place of Supply: ", left + 10, infoY + 80, { continued: true });
    doc.font("Helvetica").fontSize(7).fillColor("#4b5563")
       .text("Maharashtra (27)");

    /* RIGHT COLUMN - BUYER INFO */
    const billX = left + colWidth + 10;
    
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#1f2937")
       .text("Bill To", billX, infoY + 8);
    
    // Get customer name from multiple possible sources
    const customerName = invoice.userId?.name || invoice.address?.name || order.address?.name || "Customer Name";
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#111827")
       .text(customerName, billX, infoY + 22);
    
    const fullAddress = [
      invoice.address?.street,
      invoice.address?.city,
      invoice.address?.state,
      invoice.address?.pincode
    ].filter(Boolean).join(", ");
    
    doc.font("Helvetica").fontSize(8).fillColor("#4b5563")
       .text(fullAddress || "Address", billX, infoY + 34, { width: colWidth - 15 });
    
    const customerEmail = invoice.userId?.email || invoice.email || order.address?.email || "N/A";
    const customerPhone = invoice.userId?.phone || invoice.address?.phone || order.address?.phone || "N/A";
    
    doc.font("Helvetica").fontSize(7).fillColor("#6b7280")
       .text("Email: " + customerEmail, billX, infoY + 54)
       .text("Phone: " + customerPhone, billX, infoY + 64);
    
    if (invoice.userId?.gstin) {
      doc.font("Helvetica-Bold").fontSize(7).fillColor("#1f2937")
         .text("GSTIN: ", billX, infoY + 78, { continued: true });
      doc.font("Helvetica").fontSize(7).fillColor("#4b5563")
         .text(invoice.userId.gstin);
    }

    doc.y = infoY + 105;

    /* ========================
       INVOICE METADATA ROW
       ======================== */
    const metaY = doc.y;
    const metaRowHeight = 45;
    
    doc.rect(left, metaY, pageWidth, metaRowHeight).fill("#f9fafb").stroke("#e0e0e0");

    // Left metadata
    doc.font("Helvetica").fontSize(7).fillColor("#6b7280")
       .text("Invoice Number:", left + 10, metaY + 6);
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#111827")
       .text(invoice.invoiceNumber || "INV-XXXX", left + 10, metaY + 16);
    
    doc.font("Helvetica").fontSize(7).fillColor("#6b7280")
       .text("Invoice Date:", left + 10, metaY + 28);
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#111827")
       .text(new Date(invoice.createdAt).toLocaleDateString("en-IN"), left + 10, metaY + 36);

    // Middle metadata
    const midX = left + (pageWidth / 3);
    doc.font("Helvetica").fontSize(7).fillColor("#6b7280")
       .text("Order ID:", midX, metaY + 6);
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#111827")
       .text(String(order._id || "").slice(-12) || "N/A", midX, metaY + 16);
    
    doc.font("Helvetica").fontSize(7).fillColor("#6b7280")
       .text("Payment Mode:", midX, metaY + 28);
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#111827")
       .text(invoice.paymentMethod || "Online", midX, metaY + 36);

    // Right metadata
    const rightMetaX = left + (2 * pageWidth / 3);
    doc.font("Helvetica").fontSize(7).fillColor("#6b7280")
       .text("Order Date:", rightMetaX, metaY + 6);
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#111827")
       .text(new Date(order.createdAt || invoice.createdAt).toLocaleDateString("en-IN"), 
             rightMetaX, metaY + 16);
    
  
    doc.y = metaY + metaRowHeight + 12;

    /* ========================
       ORDER SUMMARY HEADER - DARK AMBER
       ======================== */
    const orderBarY = doc.y;
    doc.rect(left, orderBarY, pageWidth, 22).fill(accentColor);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#ffffff")
       .text("Order Summary", left + 10, orderBarY + 6);
    
    doc.y = orderBarY + 25;

    /* ========================
       TABLE HEADER
       ======================== */
    const tableHeaderY = doc.y;
    doc.rect(left, tableHeaderY, pageWidth, 20).fill("#e8eaf6");
    
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#1f2937");

    const col1X = left + 8;           // S.No
    const col2X = left + 28;          // Description
    const col3X = left + 260;         // HSN/SAC
    const col4X = left + 310;         // Rate
    const col5X = left + 370;         // Qty
    const col6X = left + 420;         // Taxable Value
    const col7X = left + 480;         // Total

    doc.text("#", col1X, tableHeaderY + 6);
    doc.text("Description", col2X, tableHeaderY + 6);
    doc.text("HSN", col3X, tableHeaderY + 6);
    doc.text("Rate", col4X, tableHeaderY + 6, { width: 50, align: "right" });
    doc.text("Qty", col5X, tableHeaderY + 6, { width: 40, align: "center" });
    doc.text("Value", col6X, tableHeaderY + 6, { width: 50, align: "right" });
    doc.text("Total", col7X, tableHeaderY + 6, { width: 50, align: "right" });

    doc.y = tableHeaderY + 22;

    /* ========================
       TABLE ROWS - LINE ITEMS
       ======================== */
    let subtotal = 0;
    const rowHeight = 45;
    let serialNo = 1;

    (order.items || []).forEach((item, index) => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;

      const rowY = doc.y;

      // Alternating row background
      if (index % 2 === 0) {
        doc.rect(left, rowY, pageWidth, rowHeight).fill("#fafafa");
      }
      doc.rect(left, rowY, pageWidth, rowHeight).stroke("#e0e0e0");

      // Serial Number
      doc.font("Helvetica").fontSize(8).fillColor("#4b5563")
         .text(serialNo.toString(), col1X, rowY + 16);

      // Product Image
      if (item.image) {
        try {
          let imageLoaded = false;
          
          if (item.image.startsWith('http://') || item.image.startsWith('https://')) {
            try {
              doc.image(item.image, col2X, rowY + 4, { width: 32, height: 32, fit: [32, 32] });
              imageLoaded = true;
            } catch (e) {}
          } else {
            const localPaths = [
              path.join(__dirname, item.image),
              path.join(__dirname, "../public", item.image),
              path.join(__dirname, "../../public", item.image),
            ];
            
            for (let imgPath of localPaths) {
              if (fs.existsSync(imgPath)) {
                try {
                  doc.image(imgPath, col2X, rowY + 4, { width: 32, height: 32, fit: [32, 32] });
                  imageLoaded = true;
                  break;
                } catch (e) {}
              }
            }
          }
          
          if (!imageLoaded) {
            doc.rect(col2X, rowY + 4, 32, 32).stroke("#d1d5db");
            doc.font("Helvetica").fontSize(14).fillColor("#9ca3af")
               .text("🎨", col2X + 8, rowY + 10);
          }
        } catch (e) {
          doc.rect(col2X, rowY + 4, 32, 32).stroke("#d1d5db");
          doc.font("Helvetica").fontSize(14).fillColor("#9ca3af")
             .text("🎨", col2X + 8, rowY + 10);
        }
      }

      // Product Description
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#111827")
         .text(item.name, col2X + 40, rowY + 8, { width: 200 });
      
      if (item.subtitle || item.category) {
        doc.font("Helvetica").fontSize(7).fillColor("#6b7280")
           .text(item.subtitle || item.category || "", col2X + 40, rowY + 20, { width: 200 });
      }

      // HSN Code
      doc.font("Helvetica").fontSize(7).fillColor("#4b5563")
         .text(item.hsnCode || "N/A", col3X, rowY + 16);

      // Rate
      doc.font("Helvetica").fontSize(8).fillColor("#111827")
         .text(item.price.toFixed(2), col4X, rowY + 16, { width: 50, align: "right" });

      // Quantity
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#111827")
         .text(item.quantity.toString(), col5X, rowY + 16, { width: 40, align: "center" });

      // Taxable Value
      doc.font("Helvetica").fontSize(8).fillColor("#111827")
         .text(itemTotal.toFixed(2), col6X, rowY + 16, { width: 50, align: "right" });

      // Total
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#111827")
         .text(itemTotal.toFixed(2), col7X, rowY + 16, { width: 50, align: "right" });

      doc.y = rowY + rowHeight;
      serialNo++;
    });

    /* ========================
       SHIPPING/HANDLING ROW
       ======================== */
    if (order.shippingCost && order.shippingCost > 0) {
      const rowY = doc.y;
      
      if (serialNo % 2 === 0) {
        doc.rect(left, rowY, pageWidth, rowHeight).fill("#fafafa");
      }
      doc.rect(left, rowY, pageWidth, rowHeight).stroke("#e0e0e0");

      doc.font("Helvetica").fontSize(8).fillColor("#4b5563")
         .text(serialNo.toString(), col1X, rowY + 16);

      // Shipping icon
      doc.fontSize(16).fillColor("#4caf50").text("📦", col2X + 8, rowY + 12);

      doc.font("Helvetica-Bold").fontSize(8).fillColor("#111827")
         .text("Shipping & Handling", col2X + 40, rowY + 16);

      doc.font("Helvetica").fontSize(7).fillColor("#4b5563")
         .text(order.shippingHSN || "996791", col3X, rowY + 16);

      doc.font("Helvetica").fontSize(8).fillColor("#111827")
         .text(order.shippingCost.toFixed(2), col4X, rowY + 16, { width: 50, align: "right" });

      doc.font("Helvetica-Bold").fontSize(8).fillColor("#111827")
         .text("1", col5X, rowY + 16, { width: 40, align: "center" });

      doc.font("Helvetica").fontSize(8).fillColor("#111827")
         .text(order.shippingCost.toFixed(2), col6X, rowY + 16, { width: 50, align: "right" });

      doc.font("Helvetica-Bold").fontSize(8).fillColor("#111827")
         .text(order.shippingCost.toFixed(2), col7X, rowY + 16, { width: 50, align: "right" });

      subtotal += order.shippingCost;
      doc.y = rowY + rowHeight;
    }

    doc.moveDown(0.5);

    /* ========================
       FINAL CALCULATION HEADER - DARK AMBER
       ======================== */
    const finalBarY = doc.y;
    doc.rect(left, finalBarY, pageWidth, 22).fill(accentColor);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#ffffff")
       .text("Final Calculation", left + 10, finalBarY + 6);
    
    doc.y = finalBarY + 28;

    /* ========================
       TAX CALCULATION TABLE
       ======================== */
    const calcY = doc.y;
    const rowH = 22;
    const labelColWidth = pageWidth * 0.7;
    const valueColWidth = pageWidth * 0.3;
    const valueColX = left + labelColWidth;

    // GST Calculation
    const sellerState = "Maharashtra";
    const buyerState = invoice.address?.state || "Maharashtra";
    const isIntraState = sellerState === buyerState;

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    const gstRate = 0.12;

    if (isIntraState) {
      cgstAmount = subtotal * (gstRate / 2);
      sgstAmount = subtotal * (gstRate / 2);
    } else {
      igstAmount = subtotal * gstRate;
    }
    const totalTax = cgstAmount + sgstAmount + igstAmount;
    const discount = invoice.discount || 0;
    const grandTotal = subtotal + totalTax - discount;

    // Row 1: Subtotal
    doc.rect(left, calcY, labelColWidth, rowH).fill("#f9fafb").stroke("#e5e7eb");
    doc.rect(valueColX, calcY, valueColWidth, rowH).fill("#f9fafb").stroke("#e5e7eb");
    doc.font("Helvetica").fontSize(9).fillColor("#374151")
       .text("Subtotal (Taxable Value)", left + 12, calcY + 6);
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#111827")
       .text("Rs. " + subtotal.toFixed(2), valueColX + 10, calcY + 6);

    let currentY = calcY + rowH;

    // Row 2: CGST or IGST
    doc.rect(left, currentY, labelColWidth, rowH).fill("#ffffff").stroke("#e5e7eb");
    doc.rect(valueColX, currentY, valueColWidth, rowH).fill("#ffffff").stroke("#e5e7eb");
    if (isIntraState) {
      doc.font("Helvetica").fontSize(9).fillColor("#374151")
         .text("CGST @ 6%", left + 12, currentY + 6);
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#111827")
         .text("Rs. " + cgstAmount.toFixed(2), valueColX + 10, currentY + 6);
    } else {
      doc.font("Helvetica").fontSize(9).fillColor("#374151")
         .text("IGST @ 12%", left + 12, currentY + 6);
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#111827")
         .text("Rs. " + igstAmount.toFixed(2), valueColX + 10, currentY + 6);
    }

    currentY += rowH;

    // Row 3: SGST (only for intra-state) or Total Tax
    doc.rect(left, currentY, labelColWidth, rowH).fill("#f9fafb").stroke("#e5e7eb");
    doc.rect(valueColX, currentY, valueColWidth, rowH).fill("#f9fafb").stroke("#e5e7eb");
    if (isIntraState) {
      doc.font("Helvetica").fontSize(9).fillColor("#374151")
         .text("SGST @ 6%", left + 12, currentY + 6);
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#111827")
         .text("Rs. " + sgstAmount.toFixed(2), valueColX + 10, currentY + 6);
      currentY += rowH;
      // Total Tax row
      doc.rect(left, currentY, labelColWidth, rowH).fill("#ffffff").stroke("#e5e7eb");
      doc.rect(valueColX, currentY, valueColWidth, rowH).fill("#ffffff").stroke("#e5e7eb");
    }
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#374151")
       .text("Total Tax (GST)", left + 12, currentY + 6);
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#111827")
       .text("Rs. " + totalTax.toFixed(2), valueColX + 10, currentY + 6);

    currentY += rowH;

    // Row 4: Discount
    doc.rect(left, currentY, labelColWidth, rowH).fill("#f9fafb").stroke("#e5e7eb");
    doc.rect(valueColX, currentY, valueColWidth, rowH).fill("#f9fafb").stroke("#e5e7eb");
    
    let discountLabel = "Discount";
    if (invoice.promoCode) {
      discountLabel = `Discount (${invoice.promoCode})`;
    }
    
    doc.font("Helvetica").fontSize(9).fillColor("#374151")
       .text(discountLabel, left + 12, currentY + 6);
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#111827")
       .text("- Rs. " + discount.toFixed(2), valueColX + 10, currentY + 6);

    currentY += rowH + 8;

    // Grand Total - Right aligned with dark amber color
    doc.font("Helvetica-Bold").fontSize(18).fillColor(accentColor)
       .text("Rs. " + grandTotal.toFixed(2), right - 130, currentY, { width: 120, align: "right" });

    doc.y = currentY + 30;

    /* ========================
       AMOUNT IN WORDS
       ======================== */
    const amountWords = numberToWords(Math.floor(grandTotal));
    const paise = Math.round((grandTotal - Math.floor(grandTotal)) * 100);
    const fullAmountWords = paise > 0 
      ? `${amountWords} Rupees and ${numberToWords(paise)} Paise Only`
      : `${amountWords} Rupees Only`;

    doc.font("Helvetica-Bold").fontSize(8).fillColor("#1f2937")
       .text("Amount in Words: ", left, doc.y, { continued: true });
    doc.font("Helvetica").fontSize(8).fillColor("#4b5563")
       .text(fullAmountWords);

    doc.moveDown(1.5);

    /* ========================
       AUTHORIZED SIGNATORY
       ======================== */
    const sigY = doc.y;
    
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#1f2937")
       .text("For StickToon:", left);
    
    doc.moveDown(2);
    
    // Signature line
    doc.moveTo(left, doc.y).lineTo(left + 100, doc.y).stroke("#9ca3af");
    doc.font("Helvetica").fontSize(7).fillColor("#6b7280")
       .text("Authorized Signatory", left, doc.y + 5);

    // Company stamp area
    doc.rect(right - 120, sigY, 110, 50).stroke("#d1d5db").dash(3, { space: 3 });
    doc.font("Helvetica").fontSize(7).fillColor("#9ca3af")
       .text("Company Stamp", right - 90, sigY + 20, { width: 80, align: "center" });

    doc.moveDown(3);

    /* ========================
       TERMS & CONDITIONS
       ======================== */
    doc.moveTo(left, doc.y).lineTo(right, doc.y).stroke("#d1d5db");
    doc.moveDown(0.5);

    doc.font("Helvetica-Bold").fontSize(9).fillColor("#1f2937")
       .text("Terms & Notes");
    doc.moveDown(0.3);

    doc.font("Helvetica").fontSize(7).fillColor("#4b5563")
       .text("1. This is a computer-generated invoice and does not require a physical signature.", left)
       .text("2. Goods once sold will not be taken back or exchanged.", left)
       .text("3. All disputes are subject to Nagpur jurisdiction only.", left)
       .text("4. Thank you for your trust in choosing StickToon! Visit ", left, doc.y, { continued: true });
    
    doc.font("Helvetica-Bold").fillColor("#2563eb")
       .text("www.sticktoon.shop", { link: "https://www.sticktoon.shop", continued: true });
    doc.font("Helvetica").fillColor("#4b5563")
       .text(" for more products.");

    /* ========================
       FOOTER
       ======================== */
    const footerY = doc.page.height - 40;
    doc.moveTo(left, footerY).lineTo(right, footerY).stroke("#d1d5db");
    
    doc.font("Helvetica").fontSize(7).fillColor("#9ca3af")
       .text("StickToon  |  www.sticktoon.shop  |  sticktoon.xyz@gmail.com ", left, footerY + 8, { width: pageWidth, align: "center" });

    doc.end();
  });
};
