import React, { useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Printer, Download, ArrowLeft } from "lucide-react";

export default function InvoiceView({ invoice, onClose }: { invoice: any; onClose?: () => void }) {
  const [isExporting, setIsExporting] = useState(false);

  if (!invoice) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        Loading invoice details...
      </div>
    );
  }

  const order = invoice.orderId || invoice.order || (invoice.items ? invoice : {});
  const address = invoice.address || order.address || {};
  const items = Array.isArray(order.items)
    ? order.items
    : Array.isArray(invoice.items)
    ? invoice.items
    : [];

  const invoiceNumber =
    invoice.invoiceNumber ||
    order.invoiceNumber ||
    (invoice._id ? `INV-${invoice._id.slice(-6).toUpperCase()}` : "INV-001");

  const dateStr = invoice.createdAt || order.createdAt
    ? new Date(invoice.createdAt || order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // Calculate items total sum robustly
  const calculatedItemsTotal = items.reduce((acc: number, item: any) => {
    const price = Number(item.price || item.unitPrice || 0);
    const qty = Number(item.quantity || item.qty || 1);
    return acc + (isNaN(price) ? 0 : price) * (isNaN(qty) ? 1 : qty);
  }, 0);

  const subtotal =
    Number(order.subtotal) ||
    Number(invoice.subtotal) ||
    (calculatedItemsTotal > 0 ? calculatedItemsTotal : 0);

  const totalAmount =
    Number(invoice.amount) ||
    Number(order.totalAmount) ||
    Number(order.amount) ||
    Number(invoice.total) ||
    Number(order.total) ||
    subtotal;

  const shippingFee =
    typeof order.shippingFee === 'number'
      ? order.shippingFee
      : typeof invoice.shippingFee === 'number'
      ? invoice.shippingFee
      : (totalAmount > subtotal ? totalAmount - subtotal : 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const element = document.getElementById("invoice-a4-page");
    if (!element) return;

    try {
      setIsExporting(true);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(element, {
        scale: 4,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        windowWidth: 794, // Standard A4 width in px
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "NONE");
      pdf.save(`StickToon-Invoice-${invoiceNumber}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 flex flex-col items-center">
      {/* Control Action Header (Hidden in Print) */}
      <div className="w-full max-w-[210mm] flex items-center justify-between gap-4 mb-6 print:hidden">
        {onClose ? (
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" /> Back
          </button>
        ) : <div />}

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition shadow-md active:scale-95"
          >
            <Printer className="w-4 h-4" /> Print A4
          </button>
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-md disabled:opacity-50 active:scale-95"
          >
            <Download className="w-4 h-4" /> {isExporting ? "Exporting PDF..." : "Download A4 PDF"}
          </button>
        </div>
      </div>

      {/* Official A4 Document Container */}
      <div
        id="invoice-a4-page"
        className="a4-invoice-container w-full max-w-[210mm] min-h-[297mm] bg-white p-8 sm:p-12 border border-slate-200 shadow-2xl rounded-2xl text-slate-900 flex flex-col justify-between"
      >
        <div>
          {/* Header Section */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8 gap-4">
            <div>
              <img
                src="/images/STICKTOON_LONG.jpeg"
                alt="StickToon"
                className="h-10 sm:h-12 object-contain mb-3"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">StickToon Store</h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Premium Custom Badges &amp; Stickers<br />
                Email: support@sticktoon.com<br />
                Web: www.sticktoon.com
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-md mb-2">
                Tax Invoice
              </span>
              <h1 className="text-xl font-mono font-black text-slate-900">#{invoiceNumber}</h1>
              <p className="text-xs text-slate-500 font-semibold mt-1">Date: {dateStr}</p>
              <p className="text-xs text-slate-500 font-semibold">Payment: {invoice.paymentMethod || 'Online'}</p>
            </div>
          </div>

          {/* Billed To / Shipped To Info */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-200/80 mb-8 text-xs">
            <div>
              <p className="font-black text-slate-400 uppercase tracking-wider text-[10px] mb-1">Customer Details</p>
              <p className="font-bold text-slate-900 text-sm">{address.fullName || address.name || invoice.userId?.name || 'Customer'}</p>
              <p className="text-slate-600 mt-1 font-medium">{invoice.userId?.email || address.email}</p>
              <p className="text-slate-600 font-medium">{address.phone || 'Phone not specified'}</p>
            </div>
            <div>
              <p className="font-black text-slate-400 uppercase tracking-wider text-[10px] mb-1">Shipping Address</p>
              <p className="text-slate-700 font-medium leading-relaxed">
                {address.street ? `${address.street}, ` : ''}
                {address.city ? `${address.city}, ` : ''}
                {address.state ? `${address.state} ` : ''}
                {address.pincode ? `- ${address.pincode}` : ''}
              </p>
              <p className="text-slate-500 font-semibold mt-1">{address.country || 'India'}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider">
                  <th className="py-3 px-4">Item Description</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {items.length > 0 ? (
                  items.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-9 h-9 rounded-lg object-cover bg-slate-100 border border-slate-200 flex-shrink-0"
                            />
                          )}
                          <div>
                            <p className="font-bold text-slate-900">{item.name}</p>
                            {item.category && <p className="text-[10px] text-slate-400 uppercase">{item.category}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700">{item.quantity || 1}</td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-700">₹{Number(item.price).toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">₹{(Number(item.price) * Number(item.quantity || 1)).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">Order items list</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pricing Summary */}
          <div className="flex justify-end mb-8">
            <div className="w-full sm:w-72 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs font-semibold">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>₹{Number(subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Shipping Charges</span>
                <span>{shippingFee > 0 ? `₹${Number(shippingFee).toFixed(2)}` : 'FREE'}</span>
              </div>
              <div className="border-t-2 border-slate-900 pt-2 flex justify-between text-sm sm:text-base font-black text-slate-950">
                <span>Total Amount</span>
                <span className="text-indigo-600 font-mono">₹{Number(totalAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer & Signature */}
        <div className="border-t border-slate-200 pt-6 mt-6">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[11px] font-bold text-slate-700">Thank you for ordering with StickToon! 💖</p>
              <p className="text-[10px] text-slate-400 mt-0.5">This is a computer generated invoice and does not require a physical signature.</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-black uppercase text-slate-900">For StickToon Store</p>
              <div className="h-8"></div>
              <p className="text-[10px] text-slate-400 font-semibold">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
