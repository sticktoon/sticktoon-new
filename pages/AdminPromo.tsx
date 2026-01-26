import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Tag, Percent, IndianRupee, Calendar, Users, X, History, Eye, Building2, UserCheck, Wallet } from "lucide-react";
import AdminBackButton from "./AdminBackButton";
import { API_BASE_URL } from "../config/api";

type UsageHistoryItem = {
  userId: { _id: string; name?: string; email: string } | null;
  orderId: { _id: string; amount: number; status: string; createdAt: string } | null;
  discountApplied: number;
  unitsSold?: number;
  earningGenerated?: number;
  usedAt: string;
};

type PromoCode = {
  _id: string;
  code: string;
  promoType: "company" | "influencer";
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  description: string;
  earningPerUnit: number;
  totalEarnings: number;
  totalUnitsSold: number;
  createdAt: string;
};

type PromoFormData = {
  code: string;
  promoType: "company" | "influencer";
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  validFrom: string;
  validUntil: string;
  description: string;
  earningPerUnit: number;
};

const defaultFormData: PromoFormData = {
  code: "",
  promoType: "company",
  discountType: "percentage",
  discountValue: 10,
  minOrderAmount: 0,
  maxDiscount: null,
  usageLimit: null,
  validFrom: new Date().toISOString().split("T")[0],
  validUntil: "",
  description: "",
  earningPerUnit: 5,
};

export default function AdminPromo() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PromoFormData>(defaultFormData);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Usage history modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<{
    code: string;
    usedCount: number;
    usageLimit: number | null;
    history: UsageHistoryItem[];
  } | null>(null);

  // Fetch all promo codes
  const fetchPromos = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/promo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPromos(data);
    } catch (err) {
      console.error("Fetch promos error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch usage history for a promo
  const fetchHistory = async (promoId: string) => {
    setHistoryLoading(true);
    setShowHistoryModal(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/promo/${promoId}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setHistoryData(data);
    } catch (err) {
      console.error("Fetch history error:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  // Open modal for create/edit
  const openModal = (promo?: PromoCode) => {
    if (promo) {
      setEditingId(promo._id);
      setFormData({
        code: promo.code,
        promoType: promo.promoType || "company",
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        minOrderAmount: promo.minOrderAmount,
        maxDiscount: promo.maxDiscount,
        usageLimit: promo.usageLimit,
        validFrom: promo.validFrom.split("T")[0],
        validUntil: promo.validUntil.split("T")[0],
        description: promo.description,
        earningPerUnit: promo.earningPerUnit || 5,
      });
    } else {
      setEditingId(null);
      setFormData(defaultFormData);
    }
    setError("");
    setShowModal(true);
  };

  // Save promo code
  const handleSave = async () => {
    if (!formData.code.trim()) {
      setError("Promo code is required");
      return;
    }
    if (!formData.discountValue || formData.discountValue <= 0) {
      setError("Discount value must be greater than 0");
      return;
    }
    if (!formData.validUntil) {
      setError("Expiry date is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = editingId
        ? `${API_BASE_URL}/api/admin/promo/${editingId}`
        : `${API_BASE_URL}/api/admin/promo`;

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          maxDiscount: formData.maxDiscount || null,
          usageLimit: formData.usageLimit || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to save promo code");
        return;
      }

      setShowModal(false);
      fetchPromos();
    } catch (err) {
      setError("Failed to save promo code");
    } finally {
      setSaving(false);
    }
  };

  // Delete promo code
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promo code?")) return;

    try {
      await fetch(`${API_BASE_URL}/api/admin/promo/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPromos();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // Toggle promo status
  const handleToggle = async (id: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/admin/promo/${id}/toggle`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPromos();
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  // Check if promo is expired
  const isExpired = (date: string) => new Date(date) < new Date();

  // Admin protection
  if (user.role !== "admin") {
    window.location.href = "/";
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        Loading promo codes...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-10">
      <div className="max-w-7xl mx-auto">
        <AdminBackButton />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
              <Tag className="w-8 h-8" />
              Promo Codes
            </h1>
            <p className="text-slate-500 mt-1">
              Manage discount codes and offers
            </p>
          </div>

          <button
            onClick={() => openModal()}
            className="mt-4 md:mt-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition"
          >
            <Plus className="w-5 h-5" />
            Create Promo
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border">
            <p className="text-sm text-slate-500 font-medium">Total Codes</p>
            <p className="text-2xl font-black">{promos.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <p className="text-sm text-slate-500 font-medium">Active</p>
            <p className="text-2xl font-black text-green-600">
              {promos.filter((p) => p.isActive && !isExpired(p.validUntil)).length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <p className="text-sm text-slate-500 font-medium">Expired</p>
            <p className="text-2xl font-black text-red-600">
              {promos.filter((p) => isExpired(p.validUntil)).length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <p className="text-sm text-slate-500 font-medium">Total Uses</p>
            <p className="text-2xl font-black text-blue-600">
              {promos.reduce((sum, p) => sum + p.usedCount, 0)}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <p className="text-sm text-slate-500 font-medium">Influencer Promos</p>
            <p className="text-2xl font-black text-purple-600">
              {promos.filter((p) => p.promoType === "influencer").length}
            </p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
            <p className="text-sm text-green-100 font-medium">Total Earnings</p>
            <p className="text-2xl font-black">
              ₹{promos.reduce((sum, p) => sum + (p.totalEarnings || 0), 0)}
            </p>
          </div>
        </div>

        {/* Promo Codes Table */}
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-4 text-left text-sm font-bold text-slate-600">Code</th>
                  <th className="p-4 text-left text-sm font-bold text-slate-600">Type</th>
                  <th className="p-4 text-left text-sm font-bold text-slate-600">Discount</th>
                  <th className="p-4 text-left text-sm font-bold text-slate-600">Usage / Earnings</th>
                  <th className="p-4 text-left text-sm font-bold text-slate-600">Valid Until</th>
                  <th className="p-4 text-left text-sm font-bold text-slate-600">Status</th>
                  <th className="p-4 text-left text-sm font-bold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((promo) => (
                  <tr key={promo._id} className="border-b hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold px-2 py-1 rounded ${promo.promoType === "influencer" ? "text-purple-600 bg-purple-50" : "text-blue-600 bg-blue-50"}`}>
                          {promo.code}
                        </span>
                      </div>
                      {promo.description && (
                        <p className="text-xs text-slate-500 mt-1">{promo.description}</p>
                      )}
                    </td>
                    <td className="p-4">
                      {promo.promoType === "influencer" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-600">
                          <UserCheck className="w-3 h-3" />
                          Influencer
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-600">
                          <Building2 className="w-3 h-3" />
                          Company
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {promo.discountType === "percentage" ? (
                          <>
                            <Percent className="w-4 h-4 text-green-600" />
                            <span className="font-bold">{promo.discountValue}%</span>
                            {promo.maxDiscount && (
                              <span className="text-xs text-slate-500">
                                (max ₹{promo.maxDiscount})
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <IndianRupee className="w-4 h-4 text-green-600" />
                            <span className="font-bold">{promo.discountValue}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      <div className="flex items-center gap-1 mb-1">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>
                          {promo.usedCount}
                          {promo.usageLimit && ` / ${promo.usageLimit}`}
                        </span>
                      </div>
                      {promo.promoType === "influencer" && (
                        <div className="flex items-center gap-1 text-green-600">
                          <Wallet className="w-3 h-3" />
                          <span className="text-xs font-bold">₹{promo.totalEarnings || 0}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className={isExpired(promo.validUntil) ? "text-red-600" : ""}>
                          {new Date(promo.validUntil).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      {isExpired(promo.validUntil) ? (
                        <span className="px-2 py-1 text-xs font-bold rounded-full bg-red-100 text-red-600">
                          Expired
                        </span>
                      ) : promo.isActive ? (
                        <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-600">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => fetchHistory(promo._id)}
                          className="p-2 hover:bg-purple-50 rounded-lg transition"
                          title="View Usage History"
                        >
                          <History className="w-4 h-4 text-purple-600" />
                        </button>
                        <button
                          onClick={() => handleToggle(promo._id)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition"
                          title={promo.isActive ? "Deactivate" : "Activate"}
                        >
                          {promo.isActive ? (
                            <ToggleRight className="w-5 h-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                        <button
                          onClick={() => openModal(promo)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(promo._id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {promos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No promo codes yet. Create your first one!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feature Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <Percent className="w-8 h-8 text-blue-600 mb-3" />
            <h3 className="font-bold text-slate-900">Percentage Discount</h3>
            <p className="text-sm text-slate-600 mt-1">
              e.g., 20% off with optional max cap
            </p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <IndianRupee className="w-8 h-8 text-green-600 mb-3" />
            <h3 className="font-bold text-slate-900">Fixed Discount</h3>
            <p className="text-sm text-slate-600 mt-1">
              e.g., Flat ₹100 off on orders
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
            <Users className="w-8 h-8 text-purple-600 mb-3" />
            <h3 className="font-bold text-slate-900">Usage Limits</h3>
            <p className="text-sm text-slate-600 mt-1">
              Control how many times a code can be used
            </p>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-black">
                {editingId ? "Edit Promo Code" : "Create Promo Code"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Promo Type */}
              <div>
                <label className="block text-sm font-bold mb-2">
                  Promo Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, promoType: "company" })}
                    className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${
                      formData.promoType === "company"
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <Building2 className={`w-6 h-6 ${formData.promoType === "company" ? "text-blue-600" : "text-slate-400"}`} />
                    <span className={`font-bold text-sm ${formData.promoType === "company" ? "text-blue-600" : "text-slate-600"}`}>
                      Company
                    </span>
                    <span className="text-xs text-slate-500">WELCOME50, ST20 etc.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, promoType: "influencer" })}
                    className={`p-4 rounded-xl border-2 transition flex flex-col items-center gap-2 ${
                      formData.promoType === "influencer"
                        ? "border-purple-500 bg-purple-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <UserCheck className={`w-6 h-6 ${formData.promoType === "influencer" ? "text-purple-600" : "text-slate-400"}`} />
                    <span className={`font-bold text-sm ${formData.promoType === "influencer" ? "text-purple-600" : "text-slate-600"}`}>
                      Influencer
                    </span>
                    <span className="text-xs text-slate-500">Earns per unit sold</span>
                  </button>
                </div>
              </div>

              {/* Code */}
              <div>
                <label className="block text-sm font-bold mb-2">
                  Promo Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  placeholder={formData.promoType === "influencer" ? "e.g., RAHUL10" : "e.g., WELCOME50"}
                  className="w-full p-3 border rounded-xl uppercase font-mono"
                />
              </div>

              {/* Influencer Earning Per Unit */}
              {formData.promoType === "influencer" && (
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <label className="block text-sm font-bold mb-2 text-purple-700">
                    Earning Per Unit (₹) *
                  </label>
                  <input
                    type="number"
                    value={formData.earningPerUnit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        earningPerUnit: Number(e.target.value),
                      })
                    }
                    min="1"
                    className="w-full p-3 border border-purple-200 rounded-xl bg-white"
                  />
                  <p className="text-xs text-purple-600 mt-2">
                    Influencer earns ₹{formData.earningPerUnit} for every unit sold using this code
                  </p>
                </div>
              )}

              {/* Discount Type */}
              <div>
                <label className="block text-sm font-bold mb-2">
                  Discount Type *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="discountType"
                      value="percentage"
                      checked={formData.discountType === "percentage"}
                      onChange={() =>
                        setFormData({ ...formData, discountType: "percentage" })
                      }
                      className="w-4 h-4"
                    />
                    <span>Percentage (%)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="discountType"
                      value="fixed"
                      checked={formData.discountType === "fixed"}
                      onChange={() =>
                        setFormData({ ...formData, discountType: "fixed" })
                      }
                      className="w-4 h-4"
                    />
                    <span>Fixed Amount (₹)</span>
                  </label>
                </div>
              </div>

              {/* Discount Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountValue: Number(e.target.value),
                      })
                    }
                    min="0"
                    className="w-full p-3 border rounded-xl"
                  />
                </div>

                {formData.discountType === "percentage" && (
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Max Discount (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.maxDiscount || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxDiscount: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      placeholder="No limit"
                      min="0"
                      className="w-full p-3 border rounded-xl"
                    />
                  </div>
                )}
              </div>

              {/* Min Order & Usage Limit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Min Order Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.minOrderAmount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minOrderAmount: Number(e.target.value),
                      })
                    }
                    min="0"
                    className="w-full p-3 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    value={formData.usageLimit || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        usageLimit: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="Unlimited"
                    min="1"
                    className="w-full p-3 border rounded-xl"
                  />
                </div>
              </div>

              {/* Validity Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Valid From
                  </label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) =>
                      setFormData({ ...formData, validFrom: e.target.value })
                    }
                    className="w-full p-3 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Valid Until *
                  </label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) =>
                      setFormData({ ...formData, validUntil: e.target.value })
                    }
                    className="w-full p-3 border rounded-xl"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold mb-2">
                  Description (shown to users)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="e.g., Summer sale - 50% off!"
                  className="w-full p-3 border rounded-xl"
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-red-600 text-sm font-medium">{error}</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 border rounded-xl font-bold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Usage History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-500 to-indigo-600">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Usage History
                </h2>
                {historyData && (
                  <p className="text-purple-100 text-sm mt-1">
                    Code: <span className="font-mono font-bold">{historyData.code}</span> • 
                    Used: {historyData.usedCount}{historyData.usageLimit && ` / ${historyData.usageLimit}`}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setHistoryData(null);
                }}
                className="p-2 hover:bg-white/20 rounded-lg text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {historyLoading ? (
                <div className="text-center py-8 text-slate-500">
                  Loading usage history...
                </div>
              ) : historyData?.history && historyData.history.length > 0 ? (
                <div className="space-y-3">
                  {historyData.history.map((item, index) => (
                    <div
                      key={index}
                      className="bg-slate-50 rounded-xl p-4 border flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                    >
                      <div>
                        <p className="font-bold text-slate-900">
                          {item.userId?.name || item.userId?.email || "Unknown User"}
                        </p>
                        {item.userId?.email && item.userId?.name && (
                          <p className="text-xs text-slate-500">{item.userId.email}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(item.usedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Discount Applied</p>
                          <p className="font-bold text-green-600">-₹{item.discountApplied}</p>
                        </div>
                        {item.orderId && (
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Order Amount</p>
                            <p className="font-bold">₹{item.orderId.amount}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No usage history yet</p>
                  <p className="text-sm text-slate-400">
                    When someone uses this promo code, it will appear here.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-slate-50">
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setHistoryData(null);
                }}
                className="w-full py-3 border rounded-xl font-bold hover:bg-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
