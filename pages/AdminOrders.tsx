import { useEffect, useState } from "react";
import { XCircle, AlertCircle } from "lucide-react";
import AdminBackButton from "./AdminBackButton";
import { API_BASE_URL } from "../config/api";
const DELIVERY_CHARGES = 99;

interface Toast {
  id: number;
  type: "error" | "warning" | "success";
  message: string;
  isExiting?: boolean;
}

export default function AdminOrders() {
  const token = localStorage.getItem("adminToken") || localStorage.getItem("token");

  const [orders, setOrders] = useState<any[]>([]);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [invoice, setInvoice] = useState<any>(null);

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastIdCounter, setToastIdCounter] = useState(0);

  const showToast = (type: "error" | "warning" | "success", message: string) => {
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


  const [autoApprove, setAutoApprove] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Orders load the last 30 days by default; older windows load on demand.
  const [rangeFilter, setRangeFilter] = useState<string>("30");
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);

  const RANGE_OPTIONS = [
    { value: "7", label: "Last 7 days" },
    { value: "30", label: "Last 30 days" },
    { value: "90", label: "Last 90 days" },
    { value: "all", label: "All time" },
  ];

  const fetchOrders = async (range: string = rangeFilter) => {
    if (!token) {
      showToast("warning", "Please login as admin to view orders.");
      setOrders([]);
      return;
    }

    setLoadingOrders(true);
    try {
      const params = range === "all" ? "?all=true" : `?days=${range}`;
      const res = await fetch(`${API_BASE_URL}/api/admin/orders${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(
          "error",
          data?.message || "Failed to fetch orders. Please login again."
        );
        setOrders([]);
        return;
      }

      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch orders error:", error);
      showToast("error", "Unable to load orders right now.");
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleRangeChange = (range: string) => {
    setRangeFilter(range);
    fetchOrders(range);
  };

  const fetchSettings = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/settings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAutoApprove(data.shiprocket_auto_approve === true);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };

  const handleToggleAutoApprove = async () => {
    if (!token) return;
    const nextValue = !autoApprove;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key: "shiprocket_auto_approve", value: nextValue }),
      });
      if (res.ok) {
        setAutoApprove(nextValue);
        showToast("success", `✅ Auto-push to Shiprocket is now ${nextValue ? "ENABLED (Auto)" : "DISABLED (Needs Approval)"}`);
      } else {
        showToast("error", "❌ Failed to update settings");
      }
    } catch (err) {
      showToast("error", "❌ Failed to update settings");
    }
  };

  const handleShiprocketPush = async (orderId: string) => {
    if (!token) return;
    setIsSyncing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/orders/${orderId}/shiprocket-push`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", "✅ Order successfully pushed to Shiprocket!");
        setOrders((prev) => prev.map((o) => (o._id === orderId ? data.order : o)));
        setActiveOrder(data.order);
      } else {
        showToast("error", `❌ ${data.message || "Failed to push to Shiprocket"}`);
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
      showToast("error", "❌ Sync error. Check backend logs.");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchSettings();
  }, [token]);

  return (
    <div className="p-10 bg-slate-100 min-h-screen">
      <AdminBackButton />
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-black">Orders</h1>
          <span className="text-sm font-semibold text-gray-500">
            {loadingOrders
              ? "Loading…"
              : `${orders.length} order${orders.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border shadow-sm">
            <span className="text-sm font-bold text-gray-700">📅 Show:</span>
            <select
              value={rangeFilter}
              onChange={(e) => handleRangeChange(e.target.value)}
              disabled={loadingOrders}
              className="text-sm font-semibold text-gray-800 bg-transparent focus:outline-none cursor-pointer disabled:opacity-50"
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border shadow-sm">
          <span className="text-sm font-bold text-gray-700">🚀 Shiprocket Auto-Push:</span>
          <button
            onClick={handleToggleAutoApprove}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              autoApprove ? "bg-indigo-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                autoApprove ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {autoApprove ? "Auto" : "Approval"}
          </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left">
              <th className="p-4">#</th>
              <th className="p-4">Order</th>
              <th className="p-4">User</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Status</th>
              <th className="p-4">Shiprocket</th>
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
                  {order.status !== "SUCCESS" ? (
                    <span className="text-gray-400 text-xs font-semibold">Not Paid</span>
                  ) : order.shiprocketStatus === "SUCCESS" ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-150 text-green-800 border border-green-300">Synced</span>
                  ) : order.shiprocketStatus === "FAILED" ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-150 text-red-800 border border-red-300">Failed</span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-150 text-yellow-800 border border-yellow-300">Pending</span>
                  )}
                </td>
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

            {!loadingOrders && orders.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500 text-sm">
                  {rangeFilter === "all"
                    ? "No orders found."
                    : "No orders in this period. Try a wider range above to load older orders."}
                </td>
              </tr>
            )}
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

              try {
                const res = await fetch(
                  `${API_BASE_URL}/api/invoice/${invoiceId}/download`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );

                if (!res.ok) throw new Error("Failed to download invoice");

                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `invoice-${invoiceId}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                showToast("success", "✅ Invoice downloaded successfully!");
              } catch (error) {
                showToast("error", "❌ Failed to download invoice");
              }
            }}
            className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white py-4 rounded-xl font-black transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-purple-500/30 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 mt-6"
          >
            <span className="text-xl">📥</span>
            <span>Download Invoice</span>
          </button>

          {/* Shiprocket Section */}
          {activeOrder.status === "SUCCESS" && (
            <div className="bg-white border rounded-xl p-4 mt-4 space-y-3 text-left">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                🚀 Shiprocket Fulfillment
              </h3>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-semibold">Sync Status:</span>
                {activeOrder.shiprocketStatus === "SUCCESS" ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-150 text-green-800 border border-green-300">Synced</span>
                ) : activeOrder.shiprocketStatus === "FAILED" ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-150 text-red-800 border border-red-300">Failed</span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-150 text-yellow-800 border border-yellow-300">Pending Approval</span>
                )}
              </div>

              {activeOrder.shiprocketOrderId && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shiprocket Order ID:</span>
                  <span className="font-mono font-bold text-gray-800">{activeOrder.shiprocketOrderId}</span>
                </div>
              )}

              {activeOrder.shiprocketErrorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700 font-medium">
                  <strong>Sync Error:</strong> {activeOrder.shiprocketErrorMessage}
                </div>
              )}

              <button
                onClick={() => handleShiprocketPush(activeOrder._id)}
                disabled={isSyncing}
                className={`w-full text-white py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 mt-2 disabled:opacity-50 ${
                  activeOrder.shiprocketStatus === "SUCCESS"
                    ? "bg-indigo-600 hover:bg-indigo-700 shadow-md"
                    : "bg-slate-900 hover:bg-slate-800"
                }`}
              >
                {isSyncing ? (
                  <>⏳ Syncing...</>
                ) : activeOrder.shiprocketStatus === "SUCCESS" ? (
                  <>🔄 Reship / Force Resync</>
                ) : (
                  <>📤 Send to Shiprocket</>
                )}
              </button>
            </div>
          )}
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
            success: "from-emerald-500/20 via-green-500/10 to-transparent border-emerald-400/50 shadow-[0_8px_32px_rgba(34,197,94,0.3)]",
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
