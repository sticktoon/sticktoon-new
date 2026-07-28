import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import InvoiceView from "./InvoiceView";

export default function Invoice() {
  const { orderId } = useParams();
  const token = localStorage.getItem("token");
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/invoice/${orderId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setInvoice(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load invoice", err);
        setLoading(false);
      });
  }, [orderId, token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (!invoice || invoice.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl text-center max-w-md w-full">
          <p className="text-lg font-bold text-slate-800 mb-2">Invoice Not Found</p>
          <p className="text-xs text-slate-500">Could not retrieve invoice details for this order ID.</p>
        </div>
      </div>
    );
  }

  return <InvoiceView invoice={invoice} />;
}
