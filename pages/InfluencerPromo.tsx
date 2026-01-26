import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

interface PromoCode {
  _id: string;
  code: string;
  discountType: string;
  discountValue: number;
  usageCount: number;
  totalUnitsSold: number;
  totalEarnings: number;
  isActive: boolean;
  earningPerUnit: number;
  createdAt: string;
}

const InfluencerPromo: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [selectedPromo, setSelectedPromo] = useState<PromoCode | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [maxAllowed, setMaxAllowed] = useState(2);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    code: "",
    discountType: "percentage",
    discountValue: 10,
  });

  useEffect(() => {
    const token = localStorage.getItem("influencerToken");
    if (!token) {
      navigate("/influencer/login");
      return;
    }
    fetchPromos(token);
  }, [navigate]);

  const fetchPromos = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/influencer/my-promo`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem("influencerToken");
        navigate("/influencer/login");
        return;
      }

      const data = await res.json();
      
      if (res.ok) {
        setPromos(data.promos || []);
        setMaxAllowed(data.maxAllowed || 2);
        if (data.promos?.length > 0) {
          setSelectedPromo(data.promos[0]);
        }
      }
    } catch (err: any) {
      console.error("Fetch promo error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const token = localStorage.getItem("influencerToken");
    if (!token) {
      navigate("/influencer/login");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/influencer/create-promo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create promo");
      }

      // Refresh promos list
      await fetchPromos(token);
      setShowCreateForm(false);
      setFormData({ code: "", discountType: "percentage", discountValue: 10 });
      setSuccess("Promo code created successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (promoId: string, promoCode: string) => {
    if (!confirm(`Are you sure you want to delete promo code "${promoCode}"? This cannot be undone.`)) {
      return;
    }

    const token = localStorage.getItem("influencerToken");
    if (!token) return;

    setDeleting(promoId);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/influencer/delete-promo/${promoId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to delete promo");
      }

      // Refresh promos list
      await fetchPromos(token);
      setSuccess("Promo code deleted successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setSuccess("Code copied to clipboard!");
    setTimeout(() => setSuccess(""), 2000);
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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/influencer/dashboard" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-xl font-bold text-white">Your Promo Codes ({promos.length}/{maxAllowed})</h1>
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

        {/* Existing Promo Codes List */}
        {promos.length > 0 && !showCreateForm && (
          <div className="space-y-6">
            {/* Promo Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {promos.map((p) => (
                <div key={p._id} className="bg-gradient-to-br from-purple-600/30 to-pink-600/30 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30 relative">
                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(p._id, p.code)}
                    disabled={deleting === p._id}
                    className="absolute top-4 right-4 p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-colors group disabled:opacity-50"
                    title="Delete this promo code"
                  >
                    <svg className="w-5 h-5 text-red-400 group-hover:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  <div className="text-center mb-4">
                    <p className="text-gray-300 text-sm mb-1">Promo Code</p>
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-3xl font-bold text-white tracking-widest">{p.code}</span>
                      <button
                        onClick={() => copyCode(p.code)}
                        className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                        title="Copy code"
                      >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xl text-purple-300 mt-2">
                      {p.discountValue}{p.discountType === "percentage" ? "%" : "₹"} OFF
                    </p>
                    <div className={`inline-block mt-2 px-3 py-1 rounded-full text-xs ${p.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                      {p.isActive ? "✓ Active" : "✕ Inactive"}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <p className="text-gray-400 text-xs">Times Used</p>
                      <p className="text-xl font-bold text-white">{p.usageCount}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <p className="text-gray-400 text-xs">Units Sold</p>
                      <p className="text-xl font-bold text-blue-400">{p.totalUnitsSold}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <p className="text-gray-400 text-xs">Your Earnings</p>
                      <p className="text-xl font-bold text-green-400">₹{p.totalEarnings}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <p className="text-gray-400 text-xs">Per Unit</p>
                      <p className="text-xl font-bold text-yellow-400">₹{p.earningPerUnit}</p>
                    </div>
                  </div>

                  {/* Share Buttons */}
                  <div className="flex gap-2 mt-4">
                    <a
                      href={`https://wa.me/?text=Use my code ${p.code} to get ${p.discountValue}${p.discountType === "percentage" ? "%" : "₹"} OFF on StickToon stickers! 🎉`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </a>
                    <a
                      href={`https://twitter.com/intent/tweet?text=Use my code ${p.code} to get ${p.discountValue}${p.discountType === "percentage" ? "%" : "₹"} OFF on @StickToon stickers! 🎉`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                      </svg>
                      Twitter
                    </a>
                  </div>

                  <p className="text-gray-500 text-xs text-center mt-3">
                    Created on {new Date(p.createdAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
              ))}
            </div>

            {/* How it works */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">How It Works</h3>
              <div className="space-y-3 text-gray-300">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-purple-500/30 rounded-full flex items-center justify-center text-purple-400 text-sm flex-shrink-0">1</span>
                  <p>Share your promo code with your followers</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-purple-500/30 rounded-full flex items-center justify-center text-purple-400 text-sm flex-shrink-0">2</span>
                  <p>They get discount on their purchase</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-purple-500/30 rounded-full flex items-center justify-center text-purple-400 text-sm flex-shrink-0">3</span>
                  <p>You earn ₹5 for every item they buy (badges, stickers, etc.)</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-purple-500/30 rounded-full flex items-center justify-center text-purple-400 text-sm flex-shrink-0">4</span>
                  <p>Withdraw your earnings once you reach ₹100</p>
                </div>
              </div>
            </div>

            {/* Create New Promo Code Button */}
            {promos.length < maxAllowed ? (
              <div className="text-center">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all flex items-center gap-2 mx-auto"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Promo Code
                </button>
                <p className="text-gray-500 text-xs mt-2">You can create {maxAllowed - promos.length} more promo code(s)</p>
              </div>
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                <p className="text-yellow-300">
                  You've reached the maximum limit of {maxAllowed} promo codes.
                </p>
                <p className="text-yellow-400/70 text-sm mt-1">
                  Delete an existing code to create a new one, or contact admin for more slots.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Create Promo Form */}
        {(promos.length === 0 || showCreateForm) && promos.length < maxAllowed && (
          <div className="max-w-md mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Create Promo Code</h2>
                {promos.length > 0 && (
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <form onSubmit={handleCreate} className="space-y-6">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Promo Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    required
                    minLength={4}
                    maxLength={15}
                    pattern="[A-Z0-9]+"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 uppercase tracking-wider text-center text-xl font-bold"
                    placeholder="YOURCODE"
                  />
                  <p className="text-gray-500 text-xs mt-1">4-15 characters, letters and numbers only</p>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm mb-2">Discount Percentage</label>
                  <div className="grid grid-cols-4 gap-3">
                    {[5, 10, 15, 99].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormData({ ...formData, discountValue: val })}
                        className={`py-4 rounded-lg border transition-colors text-xl font-bold ${
                          formData.discountValue === val
                            ? "bg-purple-600 border-purple-500 text-white"
                            : "bg-white/10 border-white/20 text-gray-300 hover:bg-white/20"
                        }`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                  <p className="text-gray-500 text-xs mt-2 text-center">
                    Your customers will get this discount on their order
                  </p>
                </div>

                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <p className="text-purple-300 text-sm">
                    <strong>Your Earning:</strong> ₹5 per item sold using this code
                  </p>
                  <p className="text-purple-400/70 text-xs mt-1">
                    Example: If customer buys 10 badges + 2 stickers = 12 items → You earn ₹60
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create Promo Code"}
                </button>
              </form>
            </div>

            <p className="text-gray-400 text-sm text-center mt-4">
              You can create up to {maxAllowed} promo codes
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default InfluencerPromo;
