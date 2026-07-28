import React from "react";
import InvoiceView from "./InvoiceView";

interface InvoiceModalProps {
  invoice: any;
  onClose: () => void;
}

export default function InvoiceModal({ invoice, onClose }: InvoiceModalProps) {
  if (!invoice) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-slate-100 shadow-2xl print:max-h-none print:shadow-none print:bg-white print:w-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center hover:bg-slate-800 transition print:hidden shadow-md"
          title="Close invoice modal"
        >
          ✕
        </button>
        <InvoiceView invoice={invoice} onClose={onClose} />
      </div>
    </div>
  );
}
