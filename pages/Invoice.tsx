import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

export default function Invoice() {
  const { orderId } = useParams();
  const token = localStorage.getItem("token");
  const [invoice, setInvoice] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/invoice/${orderId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(setInvoice);
  }, []);

  if (!invoice) return null;

  return (
    <div className="max-w-3xl mx-auto p-10 bg-white print:p-0">
      <h1 className="text-3xl font-black mb-6">INVOICE</h1>

      <p className="text-sm text-gray-500">
        Invoice No: {invoice.invoiceNumber}
      </p>

      <hr className="my-6" />

      <h3 className="font-bold">Billed To</h3>
      <p>{invoice.address.name}</p>
      <p>{invoice.address.street}</p>
      <p>{invoice.address.phone}</p>

      <hr className="my-6" />

      <div className="flex justify-between">
        <span>Amount</span>
        <span className="font-black">₹{invoice.amount}</span>
      </div>

      <div className="flex justify-between">
        <span>Payment Method</span>
        <span>{invoice.paymentMethod}</span>
      </div>

      <button
        onClick={() => window.print()}
        className="mt-10 bg-blue-600 text-white px-6 py-3 rounded-xl print:hidden"
      >
        Print Invoice
      </button>
    </div>
  );
}
