import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

interface EarningItem {
  _id: string;
  orderId: { _id: string; amount: number; status: string };
  customerId: { name: string };
  totalUnits: number;
  totalEarning: number;
  status: string;
  createdAt: string;
}

interface PromoCode {
  _id: string;
  code: string;
  discountType: string;
  discountValue: number;
  usageCount: number;
  totalUnitsSold: number;
  totalEarnings: number;
  isActive: boolean;
}

interface DashboardData {
  totalEarnings: number;
  pendingEarnings: number;
  withdrawnAmount: number;
  minWithdrawalAmount: number;
  totalOrders: number;
  totalUnits: number;
  recentEarnings: EarningItem[];
  promoCode: PromoCode | null;
  promoCodes: PromoCode[];
}

const InfluencerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("influencerToken");
    const storedUser = localStorage.getItem("influencerUser");

    if (!token) {
      navigate("/influencer/login");
      return;
    }

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    fetchDashboard(token);
  }, [navigate]);

  const fetchDashboard = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/influencer/earnings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem("influencerToken");
        localStorage.removeItem("influencerUser");
        navigate("/influencer/login");
        return;
      }

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("influencerToken");
    localStorage.removeItem("influencerUser");
    navigate("/influencer/login");
  };

  const copyPromoCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert("Promo code copied!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">StickToon</h1>
            <p className="text-purple-300 text-sm">Influencer Portal</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-300">Hi, {user?.name || "Influencer"}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <p className="text-gray-400 text-sm">Total Earnings</p>
            <p className="text-3xl font-bold text-green-400">₹{data?.totalEarnings || 0}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <p className="text-gray-400 text-sm">Available to Withdraw</p>
            <p className="text-3xl font-bold text-purple-400">₹{data?.pendingEarnings || 0}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <p className="text-gray-400 text-sm">Withdrawn</p>
            <p className="text-3xl font-bold text-blue-400">₹{data?.withdrawnAmount || 0}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <p className="text-gray-400 text-sm">Total Orders</p>
            <p className="text-3xl font-bold text-yellow-400">{data?.totalOrders || 0}</p>
            <p className="text-gray-500 text-sm">{data?.totalUnits || 0} units sold</p>
          </div>
        </div>

        {/* Promo Code Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Your Promo Codes ({data?.promoCodes?.length || 0}/2)</h2>
            {(data?.promoCodes?.length || 0) < 2 && (
              <Link
                to="/influencer/promo"
                className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add New
              </Link>
            )}
          </div>
          
          {data?.promoCodes && data.promoCodes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.promoCodes.map((promo) => (
                <div key={promo._id} className="flex flex-wrap items-center gap-4 bg-gradient-to-r from-purple-600/30 to-pink-600/30 px-4 py-3 rounded-xl border border-purple-500/30">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-white tracking-wider">
                      {promo.code}
                    </span>
                    <button
                      onClick={() => copyPromoCode(promo.code)}
                      className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                      title="Copy code"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  <div className="text-gray-300 text-sm">
                    <p className="font-semibold">{promo.discountValue}{promo.discountType === "percentage" ? "%" : "₹"} OFF</p>
                    <p className="text-gray-500 text-xs">Used {promo.usageCount}x</p>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-xs ${promo.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {promo.isActive ? "Active" : "Inactive"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">You haven't created a promo code yet</p>
              <Link
                to="/influencer/promo"
                className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                Create Promo Code
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            to="/influencer/promo"
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold group-hover:text-purple-300 transition-colors">Manage Promo</h3>
                <p className="text-gray-400 text-sm">Create or edit your code</p>
              </div>
            </div>
          </Link>

          <Link
            to="/influencer/withdraw"
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold group-hover:text-green-300 transition-colors">Withdraw</h3>
                <p className="text-gray-400 text-sm">Request payout</p>
              </div>
            </div>
          </Link>

          <Link
            to="/influencer/profile"
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold group-hover:text-blue-300 transition-colors">Profile</h3>
                <p className="text-gray-400 text-sm">Payment details</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Withdrawal Notice */}
        {data && data.pendingEarnings < (data.minWithdrawalAmount || 100) && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-8">
            <p className="text-yellow-300">
              <strong>Note:</strong> Minimum withdrawal amount is ₹{data.minWithdrawalAmount || 100}. 
              You need ₹{(data.minWithdrawalAmount || 100) - data.pendingEarnings} more to withdraw.
            </p>
          </div>
        )}

        {/* Recent Earnings */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white">Recent Earnings</h2>
          </div>

          {data?.recentEarnings && data.recentEarnings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium">Date</th>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium">Customer</th>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium">Units</th>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium">Earning</th>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentEarnings.map((earning) => (
                    <tr key={earning._id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-6 py-4 text-gray-300">
                        {new Date(earning.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {earning.customerId?.name || "Customer"}
                      </td>
                      <td className="px-6 py-4 text-gray-300">{earning.totalUnits}</td>
                      <td className="px-6 py-4 text-green-400 font-semibold">
                        ₹{earning.totalEarning}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          earning.status === "paid" 
                            ? "bg-green-500/20 text-green-400"
                            : earning.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                        }`}>
                          {earning.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400">
              <p>No earnings yet. Share your promo code to start earning!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default InfluencerDashboard;
