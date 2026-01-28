import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { XCircle, AlertCircle } from "lucide-react";
import AdminBackButton from "./AdminBackButton";
import { API_BASE_URL } from "../config/api";
const DELIVERY_CHARGES = 99;

interface Toast {
  id: number;
  type: "error" | "warning";
  message: string;
  isExiting?: boolean;
}

export default function AdminOrders() {
  const token = localStorage.getItem("token");

  const [orders, setOrders] = useState<any[]>([]);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const navigate = useNavigate();

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastIdCounter, setToastIdCounter] = useState(0);

  const showToast = (type: "error" | "warning", message: string) => {
    const id = toastIdCounter;
    setToastIdCounter(id + 1);
    const newToast: Toast = { id, type, message };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 4000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  };


  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/orders`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    })
      .then((res) => res.json())
      .then(setOrders)
      .catch(console.error);
  }, [token]);

  return (
    <div className="p-10 bg-slate-100 min-h-screen">
      <AdminBackButton />
      <h1 className="text-3xl font-black mb-6">Orders</h1>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left">
              <th className="p-4">#</th>
              <th className="p-4">Order</th>
              <th className="p-4">User</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Status</th>
              <th className="p-4">View</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order, i) => (
              <tr key={order._id} className="border-b">
                <td className="p-3">{i + 1}</td>
                <td className="p-3 text-sm">{order._id}</td>
                <td className="p-3">{order.userId?.email || "—"}</td>
                <td className="p-3">₹{order.amount}</td>
                <td className="p-3 font-bold">{order.status}</td>
                <td className="p-3">
                  <button
                    onClick={() => setActiveOrder(order)}
                    className="text-indigo-600 font-bold"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================= ORDER DETAILS MODAL ================= */}
      {activeOrder && (
        <Modal onClose={() => setActiveOrder(null)}>
          <h2 className="text-xl font-black mb-4 text-center">
            Order Details
          </h2>

          {activeOrder.items.map((item: any, i: number) => (
            <div
              key={i}
              className="flex items-center gap-4 bg-white rounded-xl p-4 mb-2"
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

          <div className="bg-white rounded-xl p-4 mt-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{activeOrder.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>₹{DELIVERY_CHARGES}</span>
            </div>
            <div className="flex justify-between font-black text-lg">
              <span>Total</span>
              <span>₹{activeOrder.amount}</span>
            </div>
          </div>

          <button
            onClick={async () => {
              const invoiceId =
                typeof activeOrder.invoiceId === "string"
                  ? activeOrder.invoiceId
                  : activeOrder.invoiceId?._id;

              if (!invoiceId) {
                showToast("warning", "⚠️ Invoice not available yet. Please try again later.");
                return;
              }

              const res = await fetch(
                `${API_BASE_URL}/api/invoice/${invoiceId}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );

              const data = await res.json();
              
navigate(`/admin/invoice/${invoiceId}`);
            }}
            className="w-full mt-6 bg-black text-white py-4 rounded-xl font-black"
          >
            🧾 View Invoice
          </button>
        </Modal>
      )}

      {/* ================= FULL INVOICE MODAL ================= */}
      {invoice && (
        <Modal onClose={() => setInvoice(null)}>
          <h2 className="text-2xl font-black mb-4 text-center">
            Invoice {invoice.invoiceNumber}
          </h2>

          <div className="text-sm space-y-1 mb-6">
            <p><b>User:</b> {invoice.userId?.email}</p>
            <p><b>Payment:</b> {invoice.paymentMethod}</p>
            <p><b>Address:</b> {invoice.address?.street}</p>
          </div>

          {invoice.orderId?.items.map((item: any, i: number) => (
            <div
              key={i}
              className="flex items-center gap-4 bg-white rounded-xl p-4 mb-2"
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

          <div className="bg-white rounded-xl p-4 mt-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{invoice.orderId?.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>₹{DELIVERY_CHARGES}</span>
            </div>
            <div className="flex justify-between font-black text-lg">
              <span>Total</span>
              <span>₹{invoice.amount}</span>
            </div>
          </div>
        </Modal>
      )}
      
      {/* Toast Notifications */}
      <div className="fixed top-6 right-6 z-[9999] space-y-3 max-w-md">
        {toasts.map((toast) => {
          const Icon = toast.type === "error" ? XCircle : AlertCircle;
          const colors = {
            error: "from-red-500/20 via-pink-500/10 to-transparent border-red-400/50 shadow-[0_8px_32px_rgba(239,68,68,0.3)]",
            warning: "from-yellow-500/20 via-orange-500/10 to-transparent border-yellow-400/50 shadow-[0_8px_32px_rgba(234,179,8,0.3)]",
          };

          return (
            <div
              key={toast.id}
              className={`
                relative bg-gradient-to-br ${colors[toast.type]} 
                backdrop-blur-xl border-2 rounded-2xl p-4 pr-12
                ${toast.isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
                transition-all duration-300 hover:scale-105
              `}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-6 h-6 flex-shrink-0 mt-0.5 ${toast.type === 'error' ? 'text-red-400' : 'text-yellow-400'}`} />
                <p className="text-white font-semibold text-sm leading-relaxed flex-1">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all group"
              >
                <span className="text-white/70 group-hover:text-white text-lg leading-none">✕</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= MODAL ================= */
function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
      <div className="relative bg-[#fdf9ef] w-[90%] max-w-xl rounded-2xl p-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 font-black"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
