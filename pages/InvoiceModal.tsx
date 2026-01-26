interface InvoiceModalProps {
  invoice: any;
  onClose: () => void;
}

export default function InvoiceModal({
  invoice,
  onClose,
}: InvoiceModalProps) {
  if (!invoice) {
    return (
      <div className="p-6 text-center text-slate-500">
        Loading invoice...
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-blue/60 flex items-center justify-center z-[9999]">
      <div className="relative bg-blue w-[90%] max-w-lg rounded-2xl p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 font-black"
        >
          ✕
        </button>

        <h2 className="text-xl font-black mb-4">
          Invoice {invoice.invoiceNumber}
        </h2>

        <p><strong>User:</strong> {invoice.userId?.email}</p>
        <p><strong>Amount:</strong> ₹{invoice.amount}</p>
        <p><strong>Payment:</strong> {invoice.paymentMethod}</p>
      </div>
    </div>
  );
}
