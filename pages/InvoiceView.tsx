import { useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useScreenshotPrivacy } from "../utils/useScreenshotPrivacy";
import ScreenshotPrivacyOverlay from "../utils/ScreenshotPrivacyOverlay";

export default function InvoiceView({ invoice }: { invoice: any }) {
  const [isExporting, setIsExporting] = useState(false);
  const isScreenProtected = useScreenshotPrivacy(!isExporting);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const element = document.getElementById("invoice-root");
    if (!element) return;

    try {
      setIsExporting(true);
      // Wait a frame for state update and DOM changes to settle before capturing
      await new Promise((resolve) => setTimeout(resolve, 80));
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice-${invoice.invoiceNumber}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div id="invoice-root" className="bg-white p-10 text-black">
      {isScreenProtected && (
        <ScreenshotPrivacyOverlay message="Hidden while this window is out of focus, so commercial details stay off task-switcher previews." />
      )}
      <h1 className="text-3xl font-black mb-6 text-center">INVOICE</h1>

      <div className="mb-6 text-sm space-y-1">
        <p><b>Invoice No:</b> {invoice.invoiceNumber}</p>
        <p><b>Order ID:</b> {invoice.orderId._id}</p>
        <p><b>User:</b> {invoice.userId?.email}</p>
        <p><b>Phone:</b> {invoice.address?.phone}</p>
        <p><b>Address:</b> {invoice.address?.street}</p>
        <p><b>Payment:</b> {invoice.paymentMethod}</p>
      </div>

      <hr className="my-6" />

      {/* ITEMS */}
      <div className="space-y-4">
        {invoice.orderId.items.map((item: any, i: number) => (
          <div
            key={i}
            className="flex items-center gap-4 border rounded-xl p-4"
          >
            <img
              src={item.image}
              alt={item.name}
              className="w-14 h-14 rounded-lg object-cover"
            />

            <div className="flex-1">
              <b>{item.name}</b>
              <div className="text-sm text-gray-600">
                ₹{item.price} × {item.quantity}
              </div>
            </div>

            <b>₹{item.price * item.quantity}</b>
          </div>
        ))}
      </div>

      {/* TOTALS */}
      <div className="mt-6 border rounded-xl p-4 space-y-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹{invoice.orderId.subtotal}</span>
        </div>
        <div className="flex justify-between">
          <span>Delivery</span>
          <span>₹99</span>
        </div>
        <div className="flex justify-between font-black text-lg">
          <span>Total</span>
          <span>₹{invoice.amount}</span>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex gap-4 mt-8 print:hidden">
        <button
          onClick={handlePrint}
          className="flex-1 bg-black text-white py-3 rounded-xl font-bold"
        >
          🖨 Print
        </button>

        <button
          onClick={handleDownload}
          className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold"
        >
          ⬇ Download PDF
        </button>
      </div>
    </div>
  );
}
