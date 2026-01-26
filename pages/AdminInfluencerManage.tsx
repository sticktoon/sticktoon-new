import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import AdminBackButton from "./AdminBackButton";

interface Influencer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  influencerProfile: {
    isApproved: boolean;
    instagram?: string;
    youtube?: string;
    bio?: string;
    totalEarnings: number;
    pendingEarnings: number;
    withdrawnAmount: number;
    promoCodeId?: {
      code: string;
      usageCount: number;
    };
  };
}

interface Withdrawal {
  _id: string;
  influencerId: {
    _id: string;
    name: string;
    email: string;
  };
  amount: number;
  paymentMethod: string;
  paymentDetails?: any;
  status: string;
  createdAt: string;
}

interface Stats {
  totalInfluencers: number;
  approvedInfluencers: number;
  pendingApprovals: number;
  earnings: {
    totalEarnings: number;
    totalUnits: number;
    totalOrders: number;
  };
  pendingWithdrawals: {
    total: number;
    count: number;
  };
}

const AdminInfluencerManage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "withdrawals">("pending");
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  // Payment modal
  const [paymentModal, setPaymentModal] = useState<Withdrawal | null>(null);
  const [transactionId, setTransactionId] = useState("");

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const getToken = () => localStorage.getItem("token");

  const fetchData = async () => {
    setLoading(true);
    const token = getToken();

    try {
      // Fetch stats
      const statsRes = await fetch(`${API_BASE_URL}/api/admin/influencer-manage/stats/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (activeTab === "withdrawals") {
        // Fetch withdrawals
        const res = await fetch(`${API_BASE_URL}/api/admin/influencer-manage/withdrawals/all?status=pending`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setWithdrawals(res.ok ? data : []);
      } else {
        // Fetch influencers
        const endpoint = activeTab === "pending" ? "/pending" : "";
        const res = await fetch(`${API_BASE_URL}/api/admin/influencer-manage${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setInfluencers(res.ok ? data : []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessing(id);
    const token = getToken();

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/influencer-manage/${id}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setInfluencers((prev) => prev.filter((i) => i._id !== id));
        if (stats) {
          setStats({
            ...stats,
            pendingApprovals: stats.pendingApprovals - 1,
            approvedInfluencers: stats.approvedInfluencers + 1,
          });
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this application?")) return;

    setProcessing(id);
    const token = getToken();

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/influencer-manage/${id}/reject`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: "Application not approved at this time." }),
      });

      if (res.ok) {
        setInfluencers((prev) => prev.filter((i) => i._id !== id));
        if (stats) {
          setStats({
            ...stats,
            pendingApprovals: stats.pendingApprovals - 1,
            totalInfluencers: stats.totalInfluencers - 1,
          });
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleProcessWithdrawal = async (status: "paid" | "rejected") => {
    if (!paymentModal) return;

    setProcessing(paymentModal._id);
    const token = getToken();

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/influencer-manage/withdrawals/${paymentModal._id}/process`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          transactionId: status === "paid" ? transactionId : undefined,
        }),
      });

      if (res.ok) {
        setWithdrawals((prev) => prev.filter((w) => w._id !== paymentModal._id));
        setPaymentModal(null);
        setTransactionId("");
        if (stats) {
          setStats({
            ...stats,
            pendingWithdrawals: {
              total: stats.pendingWithdrawals.total - paymentModal.amount,
              count: stats.pendingWithdrawals.count - 1,
            },
          });
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AdminBackButton />
            <h1 className="text-2xl font-bold">Influencer Management</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <p className="text-gray-400 text-sm">Total Influencers</p>
              <p className="text-2xl font-bold text-white">{stats.totalInfluencers}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <p className="text-gray-400 text-sm">Approved</p>
              <p className="text-2xl font-bold text-green-400">{stats.approvedInfluencers}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <p className="text-gray-400 text-sm">Pending Approval</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.pendingApprovals}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <p className="text-gray-400 text-sm">Total Paid Out</p>
              <p className="text-2xl font-bold text-purple-400">₹{stats.earnings.totalEarnings}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <p className="text-gray-400 text-sm">Pending Payouts</p>
              <p className="text-2xl font-bold text-orange-400">₹{stats.pendingWithdrawals.total}</p>
              <p className="text-gray-500 text-xs">{stats.pendingWithdrawals.count} requests</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "pending"
                ? "bg-yellow-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Pending Approvals ({stats?.pendingApprovals || 0})
          </button>
          <button
            onClick={() => setActiveTab("approved")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "approved"
                ? "bg-green-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            All Influencers
          </button>
          <button
            onClick={() => setActiveTab("withdrawals")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === "withdrawals"
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Withdrawal Requests ({stats?.pendingWithdrawals.count || 0})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full"></div>
          </div>
        ) : activeTab === "withdrawals" ? (
          /* Withdrawals Table */
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            {withdrawals.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="text-left px-6 py-3 text-gray-300 font-medium">Influencer</th>
                    <th className="text-left px-6 py-3 text-gray-300 font-medium">Amount</th>
                    <th className="text-left px-6 py-3 text-gray-300 font-medium">Method</th>
                    <th className="text-left px-6 py-3 text-gray-300 font-medium">Date</th>
                    <th className="text-left px-6 py-3 text-gray-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w._id} className="border-t border-gray-700 hover:bg-gray-700/30">
                      <td className="px-6 py-4">
                        <p className="text-white font-medium">{w.influencerId?.name}</p>
                        <p className="text-gray-500 text-sm">{w.influencerId?.email}</p>
                      </td>
                      <td className="px-6 py-4 text-green-400 font-bold text-xl">₹{w.amount}</td>
                      <td className="px-6 py-4 text-gray-300 uppercase">{w.paymentMethod.replace("_", " ")}</td>
                      <td className="px-6 py-4 text-gray-400">
                        {new Date(w.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setPaymentModal(w)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Process
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-400">
                No pending withdrawal requests
              </div>
            )}
          </div>
        ) : (
          /* Influencers Table */
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            {influencers.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="text-left px-6 py-3 text-gray-300 font-medium">Influencer</th>
                    <th className="text-left px-6 py-3 text-gray-300 font-medium">Social</th>
                    <th className="text-left px-6 py-3 text-gray-300 font-medium">Promo Code</th>
                    <th className="text-left px-6 py-3 text-gray-300 font-medium">Earnings</th>
                    <th className="text-left px-6 py-3 text-gray-300 font-medium">Status</th>
                    <th className="text-left px-6 py-3 text-gray-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {influencers.map((inf) => (
                    <tr key={inf._id} className="border-t border-gray-700 hover:bg-gray-700/30">
                      <td className="px-6 py-4">
                        <p className="text-white font-medium">{inf.name}</p>
                        <p className="text-gray-500 text-sm">{inf.email}</p>
                        <p className="text-gray-600 text-xs">
                          Applied {new Date(inf.createdAt).toLocaleDateString("en-IN")}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {inf.influencerProfile?.instagram && (
                            <span className="text-pink-400 text-sm">{inf.influencerProfile.instagram}</span>
                          )}
                          {inf.influencerProfile?.youtube && (
                            <span className="text-red-400 text-sm">YouTube</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {inf.influencerProfile?.promoCodeId ? (
                          <div>
                            <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded font-mono">
                              {inf.influencerProfile.promoCodeId.code}
                            </span>
                            <p className="text-gray-500 text-xs mt-1">
                              {inf.influencerProfile.promoCodeId.usageCount} uses
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-green-400 font-semibold">₹{inf.influencerProfile?.totalEarnings || 0}</p>
                        <p className="text-gray-500 text-xs">
                          Pending: ₹{inf.influencerProfile?.pendingEarnings || 0}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            inf.influencerProfile?.isApproved
                              ? "bg-green-500/20 text-green-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {inf.influencerProfile?.isApproved ? "Approved" : "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {!inf.influencerProfile?.isApproved ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(inf._id)}
                              disabled={processing === inf._id}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(inf._id)}
                              disabled={processing === inf._id}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">Active</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-400">
                {activeTab === "pending" ? "No pending applications" : "No influencers found"}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Process Withdrawal</h3>

            <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
              <p className="text-gray-400 text-sm">Influencer</p>
              <p className="text-white font-medium">{paymentModal.influencerId?.name}</p>
              <p className="text-gray-500 text-sm">{paymentModal.influencerId?.email}</p>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
              <p className="text-gray-400 text-sm">Amount</p>
              <p className="text-3xl font-bold text-green-400">₹{paymentModal.amount}</p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
              <p className="text-gray-400 text-sm">Payment Method</p>
              <p className="text-white font-medium uppercase">{paymentModal.paymentMethod.replace("_", " ")}</p>
              {paymentModal.paymentDetails && (
                <div className="mt-2 text-sm text-gray-300">
                  {paymentModal.paymentMethod === "upi" && paymentModal.paymentDetails.upiId && (
                    <p>UPI: {paymentModal.paymentDetails.upiId}</p>
                  )}
                  {paymentModal.paymentMethod === "bank_transfer" && paymentModal.paymentDetails.bankDetails && (
                    <>
                      <p>A/C: {paymentModal.paymentDetails.bankDetails.accountNumber}</p>
                      <p>IFSC: {paymentModal.paymentDetails.bankDetails.ifscCode}</p>
                      <p>Name: {paymentModal.paymentDetails.bankDetails.accountHolder}</p>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-gray-300 text-sm mb-2">Transaction ID (for paid status)</label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                placeholder="Enter transaction ID"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleProcessWithdrawal("paid")}
                disabled={processing === paymentModal._id}
                className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Mark as Paid
              </button>
              <button
                onClick={() => handleProcessWithdrawal("rejected")}
                disabled={processing === paymentModal._id}
                className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Reject
              </button>
            </div>

            <button
              onClick={() => {
                setPaymentModal(null);
                setTransactionId("");
              }}
              className="w-full mt-3 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInfluencerManage;
