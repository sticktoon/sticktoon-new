import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import { waitForBackupOutcome } from "../utils/backupStatus";


type AdminStats = {
  users: number;
  orders: number;      // existing Orders (Order table)
  userOrders: number;  // ✅ NEW (User_Orders table)
  revenue: number;
};

export default function AdminDashboard() {
  const user = JSON.parse(localStorage.getItem("adminUser") || localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("adminToken") || localStorage.getItem("token");

  const [stats, setStats] = useState<AdminStats>({
    users: 0,
    orders: 0,
    userOrders: 0, // ✅ NEW
    revenue: 0,
  });

  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const createBackup = async () => {
    setBackingUp(true);
    setBackupMsg(null);
    const startedAt = Date.now();
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/backup`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const msgText = typeof data.message === "string" ? data.message : (data.message?.message || "Backup failed");
      setBackupMsg({
        text: msgText,
        ok: res.ok,
      });
      if (!res.ok) return;

      const outcome = await waitForBackupOutcome(token, startedAt);
      if (outcome) setBackupMsg(outcome);
    } catch {
      setBackupMsg({ text: "Backup failed. Check your connection.", ok: false });
    } finally {
      setBackingUp(false);
    }
  };

  useEffect(() => {
   fetch(`${API_BASE_URL}/api/admin/stats`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
})

      .then((res) => res.json())
      .then((data) => {
        setStats({
          users: data.users || 0,
          orders: data.orders || 0,
          userOrders: data.userOrders || 0, // ✅ NEW
          revenue: data.revenue || 0,
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [token]);

  /* 🔐 Frontend admin protection handled by ProtectedAdminRoute in App.tsx */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading admin dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900">
          Admin Dashboard
        </h1>

        <p className="mt-2 text-xs md:text-sm text-slate-500">
          Manage Sticktoon users, orders and payments
        </p>

        {/* 🔢 GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-10">

          {/* 👥 USERS */}
          <Link
            to="/admin/users"
            className="bg-white p-4 md:p-6 rounded-xl shadow border hover:shadow-md transition cursor-pointer"
          >
            <h3 className="text-xs md:text-sm font-black text-slate-500 uppercase">
              Users
            </h3>
            <p className="text-2xl md:text-3xl font-black mt-2">
              {stats.users}
            </p>
            <span className="text-indigo-600 font-bold text-xs md:text-sm mt-2 inline-block">
              View Users →
            </span>
          </Link>

          {/* 📦 ORDERS (UNCHANGED) */}
          <div className="bg-white p-4 md:p-6 rounded-xl shadow border">
            <h3 className="text-xs md:text-sm font-black text-slate-500 uppercase">
              Orders
            </h3>
            <p className="text-2xl md:text-3xl font-black mt-2">
              {stats.orders}
            </p>
            <Link
              to="/admin/orders"
              className="text-indigo-600 font-bold text-sm mt-2 inline-block"
            >
              View Orders →
            </Link>
          </div>

          {/* 🧾 USER ORDERS (NEW CARD) */}
          <div className="bg-white p-4 md:p-6 rounded-xl shadow border">
            <h3 className="text-xs md:text-sm font-black text-slate-500 uppercase">
              User Orders
            </h3>
            <p className="text-2xl md:text-3xl font-black mt-2">
              {stats.userOrders}
            </p>
            <Link
  to="/admin/user-orders"
  className="text-indigo-600 font-bold text-xs md:text-sm mt-2 inline-block"
>
  Successful Orders →
</Link>

          </div>

          {/* 💰 REVENUE */}
          <div className="bg-white p-4 md:p-6 rounded-xl shadow border">
            <h3 className="text-xs md:text-sm font-black text-slate-500 uppercase">
              Revenue
            </h3>
            <p className="text-2xl md:text-3xl font-black mt-2">
              ₹{stats.revenue}
            </p>
            <Link
              to="/admin/revenue"
              className="text-indigo-600 font-bold text-xs md:text-sm mt-2 inline-block"
            >
              View Revenue →
            </Link>
          </div>

          {/* 🏷️ PROMO CODES */}
          <Link
            to="/admin/promo"
            className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 md:p-6 rounded-xl shadow border hover:shadow-md transition cursor-pointer text-white"
          >
            <h3 className="text-xs md:text-sm font-black text-purple-100 uppercase">
              Promo Codes
            </h3>
            <p className="text-2xl md:text-3xl font-black mt-2">
              🏷️
            </p>
            <span className="text-white font-bold text-xs md:text-sm mt-2 inline-block">
              Manage Promos →
            </span>
          </Link>

          {/* 👥 INFLUENCERS */}
          <Link
            to="/admin/influencers"
            className="bg-gradient-to-br from-pink-500 to-rose-600 p-4 md:p-6 rounded-xl shadow border hover:shadow-md transition cursor-pointer text-white"
          >
            <h3 className="text-xs md:text-sm font-black text-pink-100 uppercase">
              Influencers
            </h3>
            <p className="text-2xl md:text-3xl font-black mt-2">
              👥
            </p>
            <span className="text-white font-bold text-xs md:text-sm mt-2 inline-block">
              Manage Influencers →
            </span>
          </Link>

          {/* 📜 ACTIVITY LOGS */}
          <Link
            to="/admin/logs"
            className="bg-gradient-to-br from-slate-700 to-slate-900 p-4 md:p-6 rounded-xl shadow border hover:shadow-md transition cursor-pointer text-white"
          >
            <h3 className="text-xs md:text-sm font-black text-slate-300 uppercase">
              Activity Logs
            </h3>
            <p className="text-2xl md:text-3xl font-black mt-2">
              📜
            </p>
            <span className="text-white font-bold text-xs md:text-sm mt-2 inline-block">
              View Logs →
            </span>
          </Link>

        </div>

        {/* 🗄️ DATA BACKUP */}
        <div className="bg-white p-4 md:p-6 rounded-xl shadow border mt-6">
          <h3 className="text-xs md:text-sm font-black text-slate-500 uppercase">
            Data Backup
          </h3>
          <p className="mt-2 text-xs md:text-sm text-slate-500">
            Emails a CSV of users, orders, invoices, leads, products and promos to the
            admin inbox. Runs automatically every Sunday at 9:00 AM.
          </p>

          <button
            onClick={createBackup}
            disabled={backingUp}
            className="mt-4 bg-slate-900 text-white font-bold text-xs md:text-sm px-5 py-2.5 rounded-lg hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {backingUp ? "Creating backup..." : "🗄️ Create Backup"}
          </button>

          {backupMsg && (
            <p
              className={`mt-3 text-xs md:text-sm font-bold ${
                backupMsg.ok ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {backupMsg.ok ? "✅ " : "❌ "}
              {backupMsg.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
