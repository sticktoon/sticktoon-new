import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import InvoiceView from "./InvoiceView";
import { API_BASE_URL } from "../config/api";

export default function AdminInvoice() {
  const { id } = useParams();
  const token = localStorage.getItem("token");

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    fetch(`${API_BASE_URL}/api/admin/invoice/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    })
      .then((res) => res.json())
      .then((data) => {
        setInvoice(data);
        setLoading(false);
      })
      .catch(console.error);
  }, [id, token]);

  if (loading) {
    return <div className="p-10">Loading invoice...</div>;
  }

  if (!invoice) {
    return <div className="p-10">Invoice not found</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-10">
      <div className="max-w-4xl mx-auto">
        {/* ✅ FULL INVOICE UI — NOTHING LOST */}
        <InvoiceView invoice={invoice} />
      </div>
    </div>
  );
}
