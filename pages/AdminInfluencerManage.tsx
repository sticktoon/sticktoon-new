import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import { formatDate } from "../utils/formatDate";
import { Search, UserCheck, Clock, CreditCard, Instagram, Youtube, ExternalLink, CheckCircle, XCircle, AlertCircle, RefreshCw, DollarSign, Tag, Edit3, Power, Plus, Award } from "lucide-react";

interface Influencer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  allPromoCodes?: PromoCodeItem[];
  influencerProfile: {
    isApproved: boolean;
    applicationStatus?: string;
    instagram?: string;
    youtube?: string;
    bio?: string;
    totalEarnings: number;
    pendingEarnings: number;
    withdrawnAmount: number;
    minWithdrawalAmount?: number;
    promoCodeId?: {
      _id: string;
      code: string;
      usageCount: number;
      discountType?: string;
      discountValue?: number;
      earningPerUnit?: number;
    };
  };
}

interface PromoCodeItem {
  _id: string;
  code: string;
  promoType: "company" | "influencer";
  discountType: "percentage" | "fixed";
  discountValue: number;
  earningPerUnit: number;
  usedCount: number;
  isActive: boolean;
  createdBy?: any;
  validUntil: string;
  createdAt: string;
}

interface Withdrawal {
  _id: string;
  influencerId: {
    _id: string;
    name: string;
    email: string;
    influencerProfile?: any;
  };
  amount: number;
  paymentMethod: string;
  paymentDetails?: any;
  status: string;
  transactionId?: string;
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

interface InfluencerDetail {
  user: Influencer;
  earnings: any[];
  withdrawals: Withdrawal[];
  promoCodes?: PromoCodeItem[];
}

interface AdminInfluencerManageProps {
  initialTab?: "pending" | "approved" | "withdrawals" | "promos";
}

export default function AdminInfluencerManage({ initialTab = "approved" }: AdminInfluencerManageProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "withdrawals" | "promos">(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [promos, setPromos] = useState<PromoCodeItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Payment processing modal
  const [paymentModal, setPaymentModal] = useState<Withdrawal | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [upiInput, setUpiInput] = useState("");

  const openPaymentModal = (w: Withdrawal) => {
    setPaymentModal(w);
    setTransactionId("");
    setUpiInput(w.paymentDetails?.upiId || w.influencerId?.influencerProfile?.upiId || "");
  };

  // Influencer detail inspector modal
  const [selectedInfluencerId, setSelectedInfluencerId] = useState<string | null>(null);
  const [influencerDetail, setInfluencerDetail] = useState<InfluencerDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Edit / Assign Promo Code modal
  const [editPromoModal, setEditPromoModal] = useState<any | null>(null);
  const [assignModalUser, setAssignModalUser] = useState<Influencer | null>(null);
  const [promoForm, setPromoForm] = useState({
    code: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: 10,
    earningPerUnit: 5,
    validUntil: "",
  });

  const getToken = () => localStorage.getItem("adminToken") || localStorage.getItem("token");

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    const token = getToken();

    try {
      // Fetch stats
      const statsRes = await fetch(`${API_BASE_URL}/api/admin/influencer-manage/stats/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        try {
          const text = await statsRes.text();
          if (text) setStats(JSON.parse(text));
        } catch {
          /* ignore stats JSON error */
        }
      }

      if (activeTab === "withdrawals") {
        // Fetch pending withdrawals
        const res = await fetch(`${API_BASE_URL}/api/admin/influencer-manage/withdrawals/all?status=pending`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            setWithdrawals(Array.isArray(data) ? data : []);
          } catch {
            setWithdrawals([]);
          }
        }
      } else {
        // Fetch influencers
        const endpoint = activeTab === "pending" ? "/pending" : "";
        const res = await fetch(`${API_BASE_URL}/api/admin/influencer-manage${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            setInfluencers(Array.isArray(data) ? data : []);
          } catch {
            setInfluencers([]);
          }
        }
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInfluencerDetail = async (id: string) => {
    setSelectedInfluencerId(id);
    setLoadingDetail(true);
    setInfluencerDetail(null);
    const token = getToken();

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/influencer-manage/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInfluencerDetail(data);
      } else {
        setError("Failed to load influencer details");
      }
    } catch (err: any) {
      setError(err.message || "Error fetching details");
    } finally {
      setLoadingDetail(false);
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
        setSuccessMsg("Influencer approved successfully ✓");
        setInfluencers((prev) => prev.filter((i) => i._id !== id));
        fetchData();
        if (selectedInfluencerId === id) {
          fetchInfluencerDetail(id);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject/suspend this influencer application?")) return;

    setProcessing(id);
    const token = getToken();

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/influencer-manage/${id}/reject`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: "Application rejected or suspended by admin." }),
      });

      if (res.ok) {
        setSuccessMsg("Influencer rejected/suspended.");
        setInfluencers((prev) => prev.filter((i) => i._id !== id));
        fetchData();
        if (selectedInfluencerId === id) {
          fetchInfluencerDetail(id);
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
          upiId: upiInput,
        }),
      });

      if (res.ok) {
        setSuccessMsg(`Payout marked as ${status} ✓`);
        setWithdrawals((prev) => prev.filter((w) => w._id !== paymentModal._id));
        setPaymentModal(null);
        setTransactionId("");
        fetchData();
      } else {
        const data = await res.json();
        setError(data.message || "Failed to process withdrawal");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleTogglePromoStatus = async (promoId: string) => {
    setProcessing(promoId);
    const token = getToken();

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/promos/${promoId}/toggle`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setSuccessMsg("Promo code status toggled!");
        fetchData();
      } else {
        setError("Failed to toggle promo code status");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();

    try {
      if (assignModalUser) {
        // Assign/Create promo code for influencer
        const res = await fetch(`${API_BASE_URL}/api/admin/influencer-manage/${assignModalUser._id}/assign-promo`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(promoForm),
        });

        if (res.ok) {
          setSuccessMsg(`Promo code '${promoForm.code}' assigned to ${assignModalUser.name}!`);
          setAssignModalUser(null);
          fetchData();
          if (selectedInfluencerId === assignModalUser._id) {
            fetchInfluencerDetail(assignModalUser._id);
          }
        } else {
          const data = await res.json();
          setError(data.message || "Failed to assign promo code");
        }
      } else if (editPromoModal) {
        // Update existing promo code
        const res = await fetch(`${API_BASE_URL}/api/admin/promos/${editPromoModal._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(promoForm),
        });

        if (res.ok) {
          setSuccessMsg("Promo code updated successfully ✓");
          setEditPromoModal(null);
          fetchData();
        } else {
          const data = await res.json();
          setError(data.message || "Failed to update promo code");
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openAssignModal = (inf: Influencer) => {
    setAssignModalUser(inf);
    setPromoForm({
      code: inf.influencerProfile?.promoCodeId?.code || `INF_${inf.name.replace(/\s+/g, "").toUpperCase()}`,
      discountType: (inf.influencerProfile?.promoCodeId?.discountType as any) || "percentage",
      discountValue: inf.influencerProfile?.promoCodeId?.discountValue || 10,
      earningPerUnit: inf.influencerProfile?.promoCodeId?.earningPerUnit || 5,
      validUntil: "",
    });
  };

  const openEditPromoModal = (p: PromoCodeItem) => {
    setEditPromoModal(p);
    setPromoForm({
      code: p.code,
      discountType: p.discountType,
      discountValue: p.discountValue,
      earningPerUnit: p.earningPerUnit || 5,
      validUntil: p.validUntil ? p.validUntil.split("T")[0] : "",
    });
  };

  // Search filtering
  const filteredInfluencers = useMemo(() => {
    if (!searchQuery.trim()) return influencers;
    const q = searchQuery.toLowerCase().trim();
    return influencers.filter((i) => {
      return (
        i.name?.toLowerCase().includes(q) ||
        i.email?.toLowerCase().includes(q) ||
        i.phone?.toLowerCase().includes(q) ||
        i.influencerProfile?.instagram?.toLowerCase().includes(q) ||
        i.influencerProfile?.promoCodeId?.code?.toLowerCase().includes(q)
      );
    });
  }, [influencers, searchQuery]);

  const filteredWithdrawals = useMemo(() => {
    if (!searchQuery.trim()) return withdrawals;
    const q = searchQuery.toLowerCase().trim();
    return withdrawals.filter((w) => {
      return (
        w.influencerId?.name?.toLowerCase().includes(q) ||
        w.influencerId?.email?.toLowerCase().includes(q) ||
        w.paymentMethod?.toLowerCase().includes(q)
      );
    });
  }, [withdrawals, searchQuery]);

  const filteredPromos = useMemo(() => {
    if (!searchQuery.trim()) return promos;
    const q = searchQuery.toLowerCase().trim();
    return promos.filter((p) => {
      return (
        p.code?.toLowerCase().includes(q) ||
        p.createdBy?.name?.toLowerCase().includes(q) ||
        p.createdBy?.email?.toLowerCase().includes(q)
      );
    });
  }, [promos, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-bold animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto text-red-500 hover:text-red-700 font-black">
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-bold animate-fadeIn">
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="ml-auto text-emerald-500 hover:text-emerald-700 font-black">
            ✕
          </button>
        </div>
      )}

      {/* Stats Cards Overview */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" /> Total Influencers
            </p>
            <p className="text-2xl font-black text-slate-900">{stats.totalInfluencers}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Approved
            </p>
            <p className="text-2xl font-black text-emerald-600">{stats.approvedInfluencers}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Approvals
            </p>
            <p className="text-2xl font-black text-amber-600">{stats.pendingApprovals}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-purple-600" /> Total Paid Out
            </p>
            <p className="text-2xl font-black text-purple-600">₹{stats.earnings?.totalEarnings || 0}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-1 col-span-2 sm:col-span-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-orange-600" /> Pending Payouts
            </p>
            <p className="text-2xl font-black text-orange-600">₹{stats.pendingWithdrawals?.total || 0}</p>
            <p className="text-[11px] font-medium text-slate-400">{stats.pendingWithdrawals?.count || 0} request(s)</p>
          </div>
        </div>
      )}

      {/* Control Bar: Search + Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === "pending"
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Pending ({stats?.pendingApprovals || 0})
          </button>

          <button
            onClick={() => setActiveTab("approved")}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === "approved"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" /> All Influencers
          </button>



          <button
            onClick={() => setActiveTab("withdrawals")}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === "withdrawals"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" /> Payout Requests ({stats?.pendingWithdrawals?.count || 0})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, code, or email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm font-bold text-slate-500">Loading Influencer Records...</p>
        </div>
      ) : activeTab === "promos" ? (
        /* PROMO CODES MANAGEMENT TAB */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-pink-600" /> Influencer Promo Codes Management
              </h3>
              <p className="text-xs text-slate-500">
                View, edit discount values, adjust commission rates (₹/sticker), and enable/disable codes.
              </p>
            </div>
          </div>

          {filteredPromos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                    <th className="px-6 py-4">Promo Code</th>
                    <th className="px-6 py-4">Assigned Influencer</th>
                    <th className="px-6 py-4">Customer Discount</th>
                    <th className="px-6 py-4">Commission / Sticker</th>
                    <th className="px-6 py-4">Total Uses</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPromos.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <span className="inline-block px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 font-mono font-black text-sm rounded-lg shadow-xs">
                          {p.code}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{p.createdBy?.name || "Influencer"}</p>
                        <p className="text-xs text-slate-500">{p.createdBy?.email || "N/A"}</p>
                      </td>

                      <td className="px-6 py-4 font-bold text-slate-900">
                        {p.discountType === "percentage" ? `${p.discountValue}% OFF` : `₹${p.discountValue} OFF`}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-black text-emerald-600 text-sm">
                          ₹{p.earningPerUnit || 5} / unit
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-700">{p.usedCount || 0} orders</span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            p.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                          }`}
                        >
                          {p.isActive ? "Active" : "Disabled"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditPromoModal(p)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleTogglePromoStatus(p._id)}
                            disabled={processing === p._id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                              p.isActive
                                ? "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200"
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" /> {p.isActive ? "Disable" : "Enable"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 font-medium">
              No active influencer promo codes found
            </div>
          )}
        </div>
      ) : activeTab === "withdrawals" ? (
        /* Payout / Withdrawals Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {filteredWithdrawals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                    <th className="px-6 py-4">Influencer</th>
                    <th className="px-6 py-4">Amount Requested</th>
                    <th className="px-6 py-4">Payment Method</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWithdrawals.map((w) => (
                    <tr key={w._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{w.influencerId?.name || "Influencer"}</p>
                        <p className="text-xs text-slate-500">{w.influencerId?.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-black text-emerald-600 text-base">₹{w.amount}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">
                          {w.paymentMethod?.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-500">
                        {formatDate(w.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openPaymentModal(w)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                        >
                          Process Payout
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 font-medium">
              No pending payout requests found
            </div>
          )}
        </div>
      ) : (
        /* Influencers Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {filteredInfluencers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider">
                    <th className="px-6 py-4">Influencer</th>
                    <th className="px-6 py-4">Social Handles</th>
                    <th className="px-6 py-4">Assigned Promo Code</th>
                    <th className="px-6 py-4">Total / Pending Earnings</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInfluencers.map((inf) => (
                    <tr
                      key={inf._id}
                      onClick={() => fetchInfluencerDetail(inf._id)}
                      className="hover:bg-indigo-50/30 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-sm flex-shrink-0">
                            {inf.name?.charAt(0).toUpperCase() || "I"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 flex items-center gap-1.5">
                              {inf.name}
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </p>
                            <p className="text-xs text-slate-500">{inf.email}</p>
                            <p className="text-[11px] text-slate-400">Joined {formatDate(inf.createdAt)}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {inf.influencerProfile?.instagram ? (
                            <a
                              href={`https://instagram.com/${inf.influencerProfile.instagram.replace("@", "")}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs font-bold text-pink-600 hover:underline"
                            >
                              <Instagram className="w-3.5 h-3.5" /> @{inf.influencerProfile.instagram.replace("@", "")}
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">No Instagram</span>
                          )}
                          {inf.influencerProfile?.youtube && (
                            <div className="flex items-center gap-1 text-xs font-semibold text-red-600">
                              <Youtube className="w-3.5 h-3.5" /> YouTube
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        {inf.allPromoCodes && inf.allPromoCodes.length > 0 ? (
                          <div className="flex flex-col gap-1.5 max-w-[220px]">
                            {inf.allPromoCodes.map((p: any) => (
                              <div key={p._id} className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg">
                                <span className="font-mono font-black text-xs text-purple-900">{p.code}</span>
                                <span className="text-[10px] text-emerald-600 font-bold">₹{p.earningPerUnit || 5}/u</span>
                                <button
                                  onClick={() => openEditPromoModal(p)}
                                  className="ml-auto text-slate-400 hover:text-indigo-600"
                                  title="Edit Promo Code"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => openAssignModal(inf)}
                              className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 pt-0.5"
                            >
                              <Plus className="w-3 h-3" /> Add Another Code
                            </button>
                          </div>
                        ) : inf.influencerProfile?.promoCodeId ? (
                          <div className="flex items-center gap-2">
                            <div>
                              <span className="inline-block px-2.5 py-1 rounded-md bg-purple-50 border border-purple-200 text-purple-700 font-mono font-bold text-xs">
                                {inf.influencerProfile.promoCodeId.code}
                              </span>
                              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                ₹{inf.influencerProfile.promoCodeId.earningPerUnit || 5}/sticker • {inf.influencerProfile.promoCodeId.usageCount || 0} uses
                              </p>
                            </div>
                            <button
                              onClick={() => openAssignModal(inf)}
                              className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Edit/Reassign Promo Code"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openAssignModal(inf)}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                          >
                            <Plus className="w-3 h-3" /> Assign Code
                          </button>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-black text-emerald-600">
                          ₹{inf.influencerProfile?.totalEarnings || 0}
                        </p>
                        <p className="text-xs text-amber-600 font-medium">
                          Pending: ₹{inf.influencerProfile?.pendingEarnings || 0}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            inf.influencerProfile?.isApproved
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {inf.influencerProfile?.isApproved ? "Approved" : "Pending"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {!inf.influencerProfile?.isApproved ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(inf._id)}
                              disabled={processing === inf._id}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(inf._id)}
                              disabled={processing === inf._id}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition-all"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => fetchInfluencerDetail(inf._id)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                          >
                            View Details
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 font-medium">
              {activeTab === "pending" ? "No pending influencer applications" : "No influencers found matching criteria"}
            </div>
          )}
        </div>
      )}

      {/* Influencer Inspector Drawer / Modal */}
      {selectedInfluencerId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900">
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                  {influencerDetail?.user?.name?.charAt(0).toUpperCase() || "I"}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    {influencerDetail?.user?.name || "Loading..."}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {influencerDetail?.user?.email} • Joined {influencerDetail?.user?.createdAt && formatDate(influencerDetail.user.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedInfluencerId(null);
                  setInfluencerDetail(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center font-bold text-slate-600 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            {loadingDetail ? (
              <div className="p-12 flex flex-col items-center justify-center">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                <p className="text-sm font-bold text-slate-500">Fetching Influencer Full Details...</p>
              </div>
            ) : influencerDetail ? (
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Financial Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-[11px] font-bold text-slate-500 uppercase">Total Earned</p>
                    <p className="text-xl font-black text-emerald-600">
                      ₹{influencerDetail.user.influencerProfile?.totalEarnings || 0}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-[11px] font-bold text-slate-500 uppercase">Pending Balance</p>
                    <p className="text-xl font-black text-amber-600">
                      ₹{influencerDetail.user.influencerProfile?.pendingEarnings || 0}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-[11px] font-bold text-slate-500 uppercase">Total Withdrawn</p>
                    <p className="text-xl font-black text-indigo-600">
                      ₹{influencerDetail.user.influencerProfile?.withdrawnAmount || 0}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-[11px] font-bold text-slate-500 uppercase">Min Payout Limit</p>
                    <p className="text-xl font-black text-slate-900">
                      ₹{influencerDetail.user.influencerProfile?.minWithdrawalAmount || 100}
                    </p>
                  </div>
                </div>

                {/* Social & Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</p>
                    <p className="text-sm font-bold text-slate-900">{influencerDetail.user.phone || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Instagram</p>
                    {influencerDetail.user.influencerProfile?.instagram ? (
                      <a
                        href={`https://instagram.com/${influencerDetail.user.influencerProfile.instagram.replace("@", "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-bold text-indigo-600 hover:underline"
                      >
                        @{influencerDetail.user.influencerProfile.instagram.replace("@", "")}
                      </a>
                    ) : (
                      <p className="text-sm text-slate-400">Not provided</p>
                    )}
                  </div>
                  {influencerDetail.user.influencerProfile?.bio && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-1">Bio</p>
                      <p className="text-sm text-slate-700 font-medium">{influencerDetail.user.influencerProfile.bio}</p>
                    </div>
                  )}
                </div>

                {/* Promo Codes Section */}
                <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                        Assigned Promo Codes ({influencerDetail.promoCodes?.length || (influencerDetail.user.influencerProfile?.promoCodeId ? 1 : 0)})
                      </p>
                      <p className="text-xs text-purple-600 font-medium">
                        Multiple active promo codes can be assigned to this influencer.
                      </p>
                    </div>
                    <button
                      onClick={() => openAssignModal(influencerDetail.user)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Assign New Code
                    </button>
                  </div>

                  {influencerDetail.promoCodes && influencerDetail.promoCodes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {influencerDetail.promoCodes.map((p) => (
                        <div key={p._id} className="bg-white p-3 rounded-xl border border-purple-200 flex items-center justify-between shadow-xs">
                          <div>
                            <span className="font-mono font-black text-sm text-purple-900">{p.code}</span>
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                              <span>{p.discountType === "percentage" ? `${p.discountValue}% OFF` : `₹${p.discountValue} OFF`}</span>
                              <span>•</span>
                              <span className="text-emerald-600 font-bold">₹{p.earningPerUnit || 5}/sticker</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">{p.usedCount || 0} order uses</p>
                          </div>
                          <button
                            onClick={() => openEditPromoModal(p)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Code"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : influencerDetail.user.influencerProfile?.promoCodeId ? (
                    <div className="bg-white p-3 rounded-xl border border-purple-200 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-black text-sm text-purple-900">
                          {influencerDetail.user.influencerProfile.promoCodeId.code}
                        </span>
                        <p className="text-xs text-emerald-600 font-bold mt-0.5">
                          ₹{influencerDetail.user.influencerProfile.promoCodeId.earningPerUnit || 5}/sticker
                        </p>
                      </div>
                      <button
                        onClick={() => openAssignModal(influencerDetail.user)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold"
                      >
                        Edit Code
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-purple-600 italic">No promo codes assigned yet.</p>
                  )}
                </div>

                {/* Earnings Log */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Recent Commission Earnings ({influencerDetail.earnings?.length || 0})
                  </h4>
                  {influencerDetail.earnings && influencerDetail.earnings.length > 0 ? (
                    <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                      {influencerDetail.earnings.map((e: any) => (
                        <div key={e._id} className="p-3 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-900">Order #{e.orderId?._id?.slice(-6) || "N/A"}</span>
                            <span className="text-slate-500 ml-2">({e.totalUnits || 1} units sold)</span>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-emerald-600">+₹{e.totalEarning || 0}</span>
                            <p className="text-[10px] text-slate-400">{formatDate(e.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl border border-slate-200">
                      No earnings records yet for this influencer.
                    </p>
                  )}
                </div>

                {/* Actions Bar */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  {!influencerDetail.user.influencerProfile?.isApproved ? (
                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => handleApprove(influencerDetail.user._id)}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm uppercase tracking-wide transition-all shadow-md"
                      >
                        Approve Influencer ✓
                      </button>
                      <button
                        onClick={() => handleReject(influencerDetail.user._id)}
                        className="px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-sm uppercase tracking-wide transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                        ✓ Approved & Active Account
                      </span>
                      <button
                        onClick={() => handleReject(influencerDetail.user._id)}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-xs uppercase tracking-wide transition-all"
                      >
                        Suspend Account
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Edit / Assign Promo Code Modal */}
      {(assignModalUser || editPromoModal) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn">
          <form
            onSubmit={handleSavePromo}
            className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl text-slate-900 space-y-4"
          >
            <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Tag className="w-5 h-5 text-indigo-600" />
              {assignModalUser ? `Assign Promo Code (${assignModalUser.name})` : "Edit Promo Code"}
            </h3>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Promo Code
              </label>
              <input
                type="text"
                value={promoForm.code}
                onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                placeholder="e.g. DISHITA10"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Discount Type
                </label>
                <select
                  value={promoForm.discountType}
                  onChange={(e) => setPromoForm({ ...promoForm, discountType: e.target.value as any })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Discount Value
                </label>
                <input
                  type="number"
                  min="1"
                  value={promoForm.discountValue}
                  onChange={(e) => setPromoForm({ ...promoForm, discountValue: Number(e.target.value) })}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Influencer Commission Rate (₹ per sticker sold)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={promoForm.earningPerUnit}
                onChange={(e) => setPromoForm({ ...promoForm, earningPerUnit: Number(e.target.value) })}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-emerald-600 focus:outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md"
              >
                Save Promo Code ✓
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssignModalUser(null);
                  setEditPromoModal(null);
                }}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Process Payout / Withdrawal Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl text-slate-900 space-y-4">
            <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">
              Process Payout Request
            </h3>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase">Influencer</p>
              <p className="font-bold text-slate-900">{paymentModal.influencerId?.name}</p>
              <p className="text-xs text-slate-500">{paymentModal.influencerId?.email}</p>
            </div>

            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
              <p className="text-xs font-bold text-emerald-700 uppercase">Amount to Pay</p>
              <p className="text-2xl font-black text-emerald-600">₹{paymentModal.amount}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase">Payment Method</p>
              <p className="text-xs font-bold uppercase text-indigo-600">{paymentModal.paymentMethod?.replace("_", " ")}</p>
              {paymentModal.paymentDetails && (
                <div className="text-xs font-mono text-slate-700 pt-1 border-t border-slate-200 mt-1">
                  {paymentModal.paymentDetails.upiId && <p>UPI ID: {paymentModal.paymentDetails.upiId}</p>}
                  {paymentModal.paymentDetails.bankDetails && (
                    <>
                      <p>A/C: {paymentModal.paymentDetails.bankDetails.accountNumber}</p>
                      <p>IFSC: {paymentModal.paymentDetails.bankDetails.ifscCode}</p>
                      <p>Name: {paymentModal.paymentDetails.bankDetails.accountHolder}</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {paymentModal.paymentMethod === "upi" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  UPI ID (Editable by Admin)
                </label>
                <input
                  type="text"
                  value={upiInput}
                  onChange={(e) => setUpiInput(e.target.value)}
                  placeholder="e.g. username@upi or 9876543210@paytm"
                  className="w-full px-4 py-2.5 bg-purple-50 border border-purple-300 rounded-xl text-sm font-mono font-bold text-purple-900 focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Transaction ID (for paid status)
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter bank/UPI transaction ID"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleProcessWithdrawal("paid")}
                disabled={processing === paymentModal._id}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 shadow-md"
              >
                {processing === paymentModal._id ? "Processing..." : "Mark as Paid ✓"}
              </button>
              <button
                onClick={() => handleProcessWithdrawal("rejected")}
                disabled={processing === paymentModal._id}
                className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
              >
                Reject Request
              </button>
            </div>

            <button
              onClick={() => {
                setPaymentModal(null);
                setTransactionId("");
              }}
              className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
