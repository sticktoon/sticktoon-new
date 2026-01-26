import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

interface ProfileData {
  name: string;
  email: string;
  phone?: string;
  influencerProfile: {
    instagram?: string;
    youtube?: string;
    bio?: string;
    upiId?: string;
    bankDetails?: {
      accountNumber?: string;
      ifscCode?: string;
      accountHolder?: string;
      bankName?: string;
    };
    totalEarnings: number;
    pendingEarnings: number;
    withdrawnAmount: number;
  };
}

const InfluencerProfile: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
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
    fetchProfile(token);
  }, [navigate]);

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/influencer/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem("influencerToken");
        navigate("/influencer/login");
        return;
      }

      const data = await res.json();
      if (res.ok && data.user) {
        setProfile(data.user);
        setFormData({
          upiId: data.user.influencerProfile?.upiId || "",
          bankDetails: {
            accountNumber: data.user.influencerProfile?.bankDetails?.accountNumber || "",
            ifscCode: data.user.influencerProfile?.bankDetails?.ifscCode || "",
            accountHolder: data.user.influencerProfile?.bankDetails?.accountHolder || "",
            bankName: data.user.influencerProfile?.bankDetails?.bankName || "",
          },
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
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
      const res = await fetch(`${API_BASE_URL}/api/influencer/payment-details`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update");
      }

      setSuccess("Payment details updated successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
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
          <h1 className="text-xl font-bold text-white">Profile Settings</h1>
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

        {/* Profile Info */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 mb-8">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {profile?.name?.charAt(0) || "I"}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{profile?.name}</h2>
              <p className="text-gray-400">{profile?.email}</p>
              {profile?.phone && <p className="text-gray-500 text-sm">{profile.phone}</p>}
            </div>
          </div>

          {/* Social Links */}
          <div className="flex flex-wrap gap-4">
            {profile?.influencerProfile?.instagram && (
              <a
                href={`https://instagram.com/${profile.influencerProfile.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-pink-500/20 text-pink-400 rounded-lg hover:bg-pink-500/30 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                {profile.influencerProfile.instagram}
              </a>
            )}
            {profile?.influencerProfile?.youtube && (
              <a
                href={profile.influencerProfile.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                YouTube
              </a>
            )}
          </div>

          {profile?.influencerProfile?.bio && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-gray-300">{profile.influencerProfile.bio}</p>
            </div>
          )}
        </div>

        {/* Earnings Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 text-center">
            <p className="text-gray-400 text-sm">Total Earned</p>
            <p className="text-3xl font-bold text-green-400">₹{profile?.influencerProfile?.totalEarnings || 0}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 text-center">
            <p className="text-gray-400 text-sm">Available</p>
            <p className="text-3xl font-bold text-purple-400">₹{profile?.influencerProfile?.pendingEarnings || 0}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 text-center">
            <p className="text-gray-400 text-sm">Withdrawn</p>
            <p className="text-3xl font-bold text-blue-400">₹{profile?.influencerProfile?.withdrawnAmount || 0}</p>
          </div>
        </div>

        {/* Payment Details Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-6">Payment Details</h3>
          <p className="text-gray-400 text-sm mb-6">
            Add your payment details to receive withdrawals. You can add UPI ID, bank details, or both.
          </p>

          <form onSubmit={handleSave} className="space-y-6">
            {/* UPI Section */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h4 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                UPI Payment
              </h4>
              <div>
                <label className="block text-gray-300 text-sm mb-2">UPI ID</label>
                <input
                  type="text"
                  value={formData.upiId}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                  placeholder="yourname@upi"
                />
              </div>
            </div>

            {/* Bank Section */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h4 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Bank Transfer
              </h4>
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
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="Full Name as per bank"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
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
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 uppercase"
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
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="Bank Name"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Payment Details"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default InfluencerProfile;
