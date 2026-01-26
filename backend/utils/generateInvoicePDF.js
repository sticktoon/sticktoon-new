const PDFDocument = require("pdfkit");

module.exports = ({ invoice, order }) => {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));

    const left = 40;
    const right = doc.page.width - 40;

    /* ======================
       CALCULATIONS (SAFE)
    ====================== */
    let subtotal = 0;
    (order.items || []).forEach((i) => {
      subtotal += i.price * i.quantity;
    });

    const delivery = Math.max(invoice.amount - subtotal, 0);

    /* ======================
       TITLE
    ====================== */
    doc.font("Helvetica-Bold").fontSize(20).text("INVOICE", {
      align: "center",
    });

    doc.moveDown(2);

    /* ======================
       META DETAILS
    ====================== */
    const meta = [
      ["Invoice No", invoice.invoiceNumber],
      ["Order ID", String(order._id)],
      ["Email", invoice.email || order.userEmail || "-"],
      ["Phone", invoice.address?.phone || "-"],
      ["Address", invoice.address?.street || "-"],
      ["Payment", invoice.paymentMethod || "-"],
    ];

    meta.forEach(([key, value]) => {
      doc.font("Helvetica-Bold").fontSize(10).text(`${key}:`, left);
      doc
        .font("Helvetica")
        .fontSize(10)
        .text(value, 140, doc.y - 12, { width: 360 });
    });

    doc.moveDown(2);

    /* ======================
       ITEMS
    ====================== */
    let y = doc.y;

    (order.items || []).forEach((item) => {
      const cardHeight = 60;

      doc
        .roundedRect(left, y, right - left, cardHeight, 10)
        .lineWidth(0.5)
        .stroke("#e5e7eb");

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("black")
        .text(item.name, left + 20, y + 15);

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#374151")
        .text(`₹${item.price} × ${item.quantity}`, left + 20, y + 35);

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("black")
        .text(
          `₹${item.price * item.quantity}`,
          right - 140,
          y + 22,
          { width: 120, align: "right" }
        );

      y += cardHeight + 15;
    });

    /* ======================
       TOTALS (NO WRAPPING FIX)
    ====================== */
    const summaryHeight = 110;

    doc
      .roundedRect(left, y, right - left, summaryHeight, 10)
      .lineWidth(0.5)
      .stroke("#e5e7eb");

    const labelX = left + 20;
    const valueWidth = 120;
    const valueX = right - valueWidth - 20;

    doc.font("Helvetica").fontSize(10).fillColor("black");

    doc.text("Subtotal", labelX, y + 20);
    doc.text(`₹${subtotal}`, valueX, y + 20, {
      width: valueWidth,
      align: "right",
    });

    doc.text("Delivery", labelX, y + 40);
    doc.text(`₹${delivery}`, valueX, y + 40, {
      width: valueWidth,
      align: "right",
    });

    doc.text("GST", labelX, y + 60);
    doc.text("Included", valueX, y + 60, {
      width: valueWidth,
      align: "right",
    });

    doc.font("Helvetica-Bold").fontSize(12);
    doc.text("Total", labelX, y + 85);
    doc.text(`₹${invoice.amount}`, valueX, y + 85, {
      width: valueWidth,
      align: "right",
    });

    doc.end();
  });
};
