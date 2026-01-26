import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminBackButton from "./AdminBackButton";
import { API_BASE_URL } from "../config/api";
const DELIVERY_CHARGES = 99;

export default function AdminOrders() {
  const token = localStorage.getItem("token");

  const [orders, setOrders] = useState<any[]>([]);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const navigate = useNavigate();


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
                alert("Invoice not available yet");
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
