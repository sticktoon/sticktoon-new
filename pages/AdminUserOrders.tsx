import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminBackButton from "./AdminBackButton";
import { API_BASE_URL } from "../config/api";
type GroupedUserOrders = {
  user: {
    email: string;
  };
  orders: {
    orderId: string;
    amount: number;
    createdAt: string;
    invoice: {
      _id: string;
      invoiceNumber: string;
    };
  }[];
};

export default function AdminUserOrders() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [groups, setGroups] = useState<GroupedUserOrders[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
   fetch(`${API_BASE_URL}/api/admin/user-orders`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    })
      .then((res) => res.json())
      .then((data) => {
        setGroups(data);
        setLoading(false);
      })
      .catch(console.error);
  }, [token]);

  if (user.role !== "admin") {
    window.location.href = "/";
    return null;
  }

  if (loading) {
    return <div className="p-10">Loading user orders...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-10">
      <div className="max-w-6xl mx-auto">

        <AdminBackButton />
        
        <h1 className="text-3xl font-black mb-6">User Orders</h1>

        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="p-4 text-left">User</th>
                <th className="p-4 text-left">Order ID(s)</th>
                <th className="p-4 text-left">Amount(s)</th>
                <th className="p-4 text-left">Invoice(s)</th>
                <th className="p-4 text-left">Date(s)</th>
              </tr>
            </thead>

            <tbody>
              {groups.map((group) => (
                <tr key={group.user.email} className="border-t align-top">
                  {/* USER */}
                  <td className="p-4 font-bold whitespace-nowrap">
                    {group.user.email}
                  </td>

                  {/* ORDERS (GRID) */}
                  <td colSpan={4} className="p-4">
                    <div className="divide-y divide-slate-200">
                      {group.orders.map((o) => (
                        <div
                          key={o.orderId}
                          className="grid grid-cols-4 gap-4 py-3"
                        >
                          {/* ORDER ID */}
                          <div className="break-all">
                            {o.orderId}
                          </div>

                          {/* AMOUNT */}
                          <div>₹{o.amount}</div>

                          {/* INVOICE */}
                          <div className="font-bold">
                            <Link
                              to={`/admin/invoice/${o.invoice._id}`}
                              className="text-indigo-600 hover:underline"
                            >
                              {o.invoice.invoiceNumber}
                            </Link>
                          </div>

                          {/* DATE */}
                          <div>
                            {new Date(o.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}

              {groups.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    No successful user orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
