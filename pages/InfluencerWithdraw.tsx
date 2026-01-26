import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

interface Withdrawal {
  _id: string;
  amount: number;
  paymentMethod: string;
  status: string;
  transactionId?: string;
  adminNote?: string;
  createdAt: string;
  processedAt?: string;
}

interface ProfileData {
  pendingEarnings: number;
  minWithdrawalAmount: number;
  upiId?: string;
  bankDetails?: {
    accountNumber?: string;
    ifscCode?: string;
    accountHolder?: string;
    bankName?: string;
  };
}

const InfluencerWithdraw: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    amount: 0,
    paymentMethod: "upi",
    upiId: "",
    bankDetails: {
      accountNumber: "",
      ifscCode: "",
      accountHolder: "",
      bankName: "",
    },
  });

  useEffect(() => {
    const token = localStorage.getItem("influencerToken");
    if (!token) {
      navigate("/influencer/login");
      return;
    }
    fetchData(token);
  }, [navigate]);

  const fetchData = async (token: string) => {
    try {
      // Fetch profile
      const profileRes = await fetch(`${API_BASE_URL}/api/influencer/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (profileRes.status === 401) {
        localStorage.removeItem("influencerToken");
        navigate("/influencer/login");
        return;
      }

      const profileData = await profileRes.json();
      if (profileRes.ok) {
        setProfile({
          pendingEarnings: profileData.user?.influencerProfile?.pendingEarnings || 0,
          minWithdrawalAmount: profileData.user?.influencerProfile?.minWithdrawalAmount || 100,
          upiId: profileData.user?.influencerProfile?.upiId,
          bankDetails: profileData.user?.influencerProfile?.bankDetails,
        });

        // Pre-fill saved payment details
        if (profileData.user?.influencerProfile?.upiId) {
          setFormData((prev) => ({
            ...prev,
            upiId: profileData.user.influencerProfile.upiId,
          }));
        }
        if (profileData.user?.influencerProfile?.bankDetails) {
          setFormData((prev) => ({
            ...prev,
            bankDetails: profileData.user.influencerProfile.bankDetails,
          }));
        }
      }

      // Fetch withdrawals
      const withdrawalsRes = await fetch(`${API_BASE_URL}/api/influencer/withdrawals`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const withdrawalsData = await withdrawalsRes.json();
      if (withdrawalsRes.ok) {
        setWithdrawals(withdrawalsData.withdrawals || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const token = localStorage.getItem("influencerToken");
    if (!token) {
      navigate("/influencer/login");
      return;
    }

    try {
      const payload: any = {
        amount: formData.amount,
        paymentMethod: formData.paymentMethod,
      };

      if (formData.paymentMethod === "upi") {
        if (!formData.upiId) {
          throw new Error("Please enter UPI ID");
        }
        payload.upiId = formData.upiId;
      } else {
        if (!formData.bankDetails.accountNumber || !formData.bankDetails.ifscCode) {
          throw new Error("Please enter bank details");
        }
        payload.bankDetails = formData.bankDetails;
      }

      const res = await fetch(`${API_BASE_URL}/api/influencer/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Withdrawal request failed");
      }

      setSuccess("Withdrawal request submitted successfully!");
      setFormData((prev) => ({ ...prev, amount: 0 }));
      
      // Refresh data
      fetchData(token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500/20 text-green-400";
      case "approved":
        return "bg-blue-500/20 text-blue-400";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400";
      case "rejected":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const canWithdraw = profile && profile.pendingEarnings >= (profile.minWithdrawalAmount || 100);
  const hasPendingWithdrawal = withdrawals.some((w) => w.status === "pending" || w.status === "approved");

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/influencer/dashboard" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-xl font-bold text-white">Withdraw Earnings</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-green-600/30 to-emerald-600/30 backdrop-blur-lg rounded-2xl p-8 border border-green-500/30 text-center mb-8">
          <p className="text-gray-300 mb-2">Available to Withdraw</p>
          <p className="text-5xl font-bold text-white mb-2">₹{profile?.pendingEarnings || 0}</p>
          <p className="text-gray-400 text-sm">Minimum withdrawal: ₹{profile?.minWithdrawalAmount || 100}</p>
        </div>

        {/* Withdrawal Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">Request Withdrawal</h2>

          {!canWithdraw ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-gray-300 mb-2">Insufficient Balance</p>
              <p className="text-gray-500">
                You need at least ₹{profile?.minWithdrawalAmount || 100} to withdraw.
                Keep sharing your promo code!
              </p>
            </div>
          ) : hasPendingWithdrawal ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-300 mb-2">Withdrawal in Progress</p>
              <p className="text-gray-500">
                You have a pending withdrawal request. Please wait for it to be processed.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Amount (₹)</label>
                <input
                  type="number"
                  value={formData.amount || ""}
                  onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
                  required
                  min={profile?.minWithdrawalAmount || 100}
                  max={profile?.pendingEarnings || 0}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500 text-xl"
                  placeholder={`Min ₹${profile?.minWithdrawalAmount || 100}`}
                />
                <div className="flex justify-between mt-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, amount: profile?.pendingEarnings || 0 })}
                    className="text-green-400 text-sm hover:underline"
                  >
                    Withdraw All
                  </button>
                  <span className="text-gray-500 text-sm">
                    Available: ₹{profile?.pendingEarnings || 0}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm mb-2">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: "upi" })}
                    className={`py-3 rounded-lg border transition-colors ${
                      formData.paymentMethod === "upi"
                        ? "bg-green-600 border-green-500 text-white"
                        : "bg-white/10 border-white/20 text-gray-300"
                    }`}
                  >
                    UPI
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: "bank_transfer" })}
                    className={`py-3 rounded-lg border transition-colors ${
                      formData.paymentMethod === "bank_transfer"
                        ? "bg-green-600 border-green-500 text-white"
                        : "bg-white/10 border-white/20 text-gray-300"
                    }`}
                  >
                    Bank Transfer
                  </button>
                </div>
              </div>

              {formData.paymentMethod === "upi" ? (
                <div>
                  <label className="block text-gray-300 text-sm mb-2">UPI ID</label>
                  <input
                    type="text"
                    value={formData.upiId}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                    placeholder="yourname@upi"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Account Holder Name</label>
                    <input
                      type="text"
                      value={formData.bankDetails.accountHolder}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bankDetails: { ...formData.bankDetails, accountHolder: e.target.value },
                        })
                      }
                      required
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                      placeholder="Full Name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Account Number</label>
                      <input
                        type="text"
                        value={formData.bankDetails.accountNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bankDetails: { ...formData.bankDetails, accountNumber: e.target.value },
                          })
                        }
                        required
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                        placeholder="Account Number"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">IFSC Code</label>
                      <input
                        type="text"
                        value={formData.bankDetails.ifscCode}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bankDetails: { ...formData.bankDetails, ifscCode: e.target.value.toUpperCase() },
                          })
                        }
                        required
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500 uppercase"
                        placeholder="IFSC Code"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Bank Name</label>
                    <input
                      type="text"
                      value={formData.bankDetails.bankName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bankDetails: { ...formData.bankDetails, bankName: e.target.value },
                        })
                      }
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                      placeholder="Bank Name (Optional)"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || formData.amount < (profile?.minWithdrawalAmount || 100)}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50"
              >
                {submitting ? "Submitting..." : `Request Withdrawal of ₹${formData.amount || 0}`}
              </button>
            </form>
          )}
        </div>

        {/* Withdrawal History */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white">Withdrawal History</h2>
          </div>

          {withdrawals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium">Date</th>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium">Amount</th>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium">Method</th>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium">Status</th>
                    <th className="text-left px-6 py-3 text-gray-400 font-medium">Transaction ID</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((withdrawal) => (
                    <tr key={withdrawal._id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-6 py-4 text-gray-300">
                        {new Date(withdrawal.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-6 py-4 text-white font-semibold">₹{withdrawal.amount}</td>
                      <td className="px-6 py-4 text-gray-300 uppercase">{withdrawal.paymentMethod.replace("_", " ")}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs uppercase ${getStatusColor(withdrawal.status)}`}>
                          {withdrawal.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {withdrawal.transactionId || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400">
              <p>No withdrawal history yet.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default InfluencerWithdraw;
