import { useEffect, useState } from "react";
import AdminBackButton from "./AdminBackButton";
import { API_BASE_URL } from "../config/api";
export default function AdminRevenue() {
  const token = localStorage.getItem("token");
  const [dailyRevenue, setDailyRevenue] = useState<any[]>([]);

  useEffect(() => {
     fetch(`${API_BASE_URL}/api/admin/revenue/daily`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    })
      .then((res) => res.json())
      .then(setDailyRevenue)
      .catch(console.error);
  }, []);

  return (
    <div className="p-10 bg-slate-100 min-h-screen">
      <AdminBackButton />
      <h1 className="text-3xl font-black mb-6">
        Day-wise Revenue
      </h1>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left">
              <th className="p-4">Date</th>
              <th className="p-4">Orders</th>
              <th className="p-4">Revenue</th>
            </tr>
          </thead>

          <tbody>
            {dailyRevenue.map((day) => (
              <tr key={day._id} className="border-b">
                <td className="p-3">
                  {new Date(day._id).toDateString()}
                </td>
                <td className="p-3 font-medium">
                  {day.ordersCount}
                </td>
                <td className="p-3 font-bold text-green-600">
                  ₹{day.totalRevenue}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {dailyRevenue.length === 0 && (
          <p className="p-6 text-center text-slate-500">
            No revenue data found
          </p>
        )}
      </div>
    </div>
  );
}
