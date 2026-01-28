import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import { Eye, EyeOff, TrendingUp, DollarSign, Users, Award, Copy, Check, LogOut } from "lucide-react";

/* ===========================
   TYPES & INTERFACES
=========================== */
interface User {
  id: string;
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
    minWithdrawalAmount: number;
  };
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
  earningPerUnit: number;
  createdAt: string;
}

interface EarningItem {
  _id: string;
  orderId: { _id: string; amount: number; status: string };
  customerId: { name: string };
  totalUnits: number;
  totalEarning: number;
  status: string;
  createdAt: string;
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
  availableToWithdraw: number;
}

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

/* ===========================
   MAIN COMPONENT
=========================== */
const Influencer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  // View state - default to login if not authenticated
  const [currentView, setCurrentView] = useState<"login" | "signup" | "dashboard" | "promo" | "profile" | "withdraw">("login");
  
  // Common state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Dashboard data
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  
  // Form states
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    instagram: "",
    youtube: "",
    bio: "",
  });
  const [promoForm, setPromoForm] = useState({
    code: "",
    discountValue: 10,
  });
  const [withdrawForm, setWithdrawForm] = useState({
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
  const [profileForm, setProfileForm] = useState({
    upiId: "",
    bankDetails: {
      accountNumber: "",
      ifscCode: "",
      accountHolder: "",
      bankName: "",
    },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  /* ===========================
     EFFECTS
  =========================== */
  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    // Parse URL path to determine view
    const path = location.pathname;
    if (path.includes("/influencer/login")) {
      if (!isAuthenticated) setCurrentView("login");
      else setCurrentView("dashboard");
    } else if (path.includes("/influencer/signup")) {
      if (!isAuthenticated) setCurrentView("signup");
      else setCurrentView("dashboard");
    } else if (path.includes("/influencer/dashboard")) {
      setCurrentView("dashboard");
    } else if (path.includes("/influencer/promo")) {
      setCurrentView("promo");
    } else if (path.includes("/influencer/profile")) {
      setCurrentView("profile");
    } else if (path.includes("/influencer/withdraw")) {
      setCurrentView("withdraw");
    }
  }, [location.pathname, isAuthenticated]);

  const checkAuth = () => {
    const token = localStorage.getItem("influencerToken");
    const storedUser = localStorage.getItem("influencerUser");
    
    if (token && storedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(storedUser));
      fetchAllData(token);
    } else {
      setIsAuthenticated(false);
      setCurrentView("login");
    }
  };

  const fetchAllData = async (token: string) => {
    try {
      // Fetch dashboard data
      const dashRes = await fetch(`${API_BASE_URL}/api/influencer/earnings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (dashRes.ok) {
        const data = await dashRes.json();
        setDashboardData(data);
        setPromoCodes(data.promoCodes || []);
      }

      // Fetch profile
      const profileRes = await fetch(`${API_BASE_URL}/api/influencer/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setUser(profileData);
        setProfileForm({
          upiId: profileData.influencerProfile?.upiId || "",
          bankDetails: {
            accountNumber: profileData.influencerProfile?.bankDetails?.accountNumber || "",
            ifscCode: profileData.influencerProfile?.bankDetails?.ifscCode || "",
            accountHolder: profileData.influencerProfile?.bankDetails?.accountHolder || "",
            bankName: profileData.influencerProfile?.bankDetails?.bankName || "",
          },
        });
        setWithdrawForm(prev => ({
          ...prev,
          upiId: profileData.influencerProfile?.upiId || "",
          bankDetails: profileData.influencerProfile?.bankDetails || prev.bankDetails,
        }));
      }

      // Fetch withdrawals
      const withdrawRes = await fetch(`${API_BASE_URL}/api/influencer/withdrawals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (withdrawRes.ok) {
        const withdrawData = await withdrawRes.json();
        setWithdrawals(withdrawData.withdrawals || []);
      }
    } catch (err) {
      console.error("Fetch data error:", err);
    }
  };

  /* ===========================
     AUTH HANDLERS
  =========================== */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/influencer/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("influencerToken", data.token);
      localStorage.setItem("influencerUser", JSON.stringify(data.user));
      
      setIsAuthenticated(true);
      setUser(data.user);
      setCurrentView("dashboard");
      navigate("/influencer/dashboard");
      
      await fetchAllData(data.token);
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/influencer/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupForm),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Signup failed");
      }

      localStorage.setItem("influencerToken", data.token);
      localStorage.setItem("influencerUser", JSON.stringify(data.user));
      
      setIsAuthenticated(true);
      setUser(data.user);
      setCurrentView("dashboard");
      navigate("/influencer/dashboard");
      
      await fetchAllData(data.token);
    } catch (err: any) {
      setError(err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("influencerToken");
    localStorage.removeItem("influencerUser");
    setIsAuthenticated(false);
    setUser(null);
    setCurrentView("login");
    navigate("/influencer/login");
  };

  /* ===========================
     PROMO CODE HANDLERS
  =========================== */
  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
        body: JSON.stringify({
          code: promoForm.code,
          discountType: "percentage",
          discountValue: promoForm.discountValue,
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to create promo");
      }

      setSuccess("Promo code created successfully!");
      setPromoForm({ code: "", discountValue: 10 });
      await fetchAllData(token);
    } catch (err: any) {
      setError(err.message || "Failed to create promo code");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePromo = async (promoId: string) => {
    if (!confirm("Are you sure you want to delete this promo code?")) return;

    const token = localStorage.getItem("influencerToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/influencer/delete-promo/${promoId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete");
      }

      setSuccess("Promo code deleted!");
      await fetchAllData(token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyPromoCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ===========================
     PROFILE HANDLERS
  =========================== */
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
        body: JSON.stringify(profileForm),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Update failed");
      }

      setSuccess("Payment details updated successfully!");
      await fetchAllData(token);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  /* ===========================
     WITHDRAWAL HANDLERS
  =========================== */
  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const token = localStorage.getItem("influencerToken");
    if (!token) {
      navigate("/influencer/login");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/influencer/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: withdrawForm.amount,
          paymentMethod: withdrawForm.paymentMethod,
          paymentDetails: withdrawForm.paymentMethod === "upi" 
            ? { upiId: withdrawForm.upiId }
            : {
                bankName: withdrawForm.bankDetails.bankName,
                accountNumber: withdrawForm.bankDetails.accountNumber,
                ifscCode: withdrawForm.bankDetails.ifscCode,
                accountHolderName: withdrawForm.bankDetails.accountHolder,
              },
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Withdrawal request failed");
      }

      setSuccess("Withdrawal request submitted! It will be processed within 3-5 business days.");
      setWithdrawForm({ ...withdrawForm, amount: 0 });
      await fetchAllData(token);
    } catch (err: any) {
      setError(err.message || "Failed to submit withdrawal request");
    } finally {
      setLoading(false);
    }
  };

  /* ===========================
     RENDER LOGIN/SIGNUP
  =========================== */
  if (!isAuthenticated && (currentView === "login" || currentView === "signup")) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 md:px-6 relative overflow-hidden">
        {/* Fun Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-20 h-20 bg-purple-500 rounded-full border-4 border-black shadow-[4px_4px_0px_#000] animate-bounce opacity-60" style={{ animationDelay: '0s', animationDuration: '3s' }}></div>
          <div className="absolute top-40 right-20 w-16 h-16 bg-pink-400 rounded-full border-4 border-black shadow-[4px_4px_0px_#000] animate-bounce opacity-60" style={{ animationDelay: '0.5s', animationDuration: '3.5s' }}></div>
          <div className="absolute bottom-32 left-20 w-14 h-14 bg-black rounded-full border-4 border-purple-400 shadow-[4px_4px_0px_#A855F7] animate-bounce opacity-60" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
          <div className="absolute bottom-20 right-32 w-12 h-12 bg-pink-400 rounded-full border-4 border-black shadow-[4px_4px_0px_#000] animate-bounce opacity-60" style={{ animationDelay: '1.5s', animationDuration: '3.2s' }}></div>
          <div className="absolute bottom-40 left-32 text-3xl opacity-40 text-purple-500">★</div>
          <div className="absolute top-60 left-40 text-2xl opacity-30 text-black">⬤</div>
        </div>

        <div className="relative max-w-sm w-full">
          {/* Main Card - Sticker Style */}
          <div className="bg-white rounded-3xl px-6 py-8 border-4 border-black shadow-[8px_8px_0px_#000] relative">
            {/* Corner Stickers */}
            <div className="absolute -top-4 -right-4 w-10 h-10 bg-purple-500 rounded-full border-4 border-black flex items-center justify-center text-lg shadow-[3px_3px_0px_#000]">★</div>
            <div className="absolute -bottom-4 -left-4 w-10 h-10 bg-pink-400 rounded-full border-4 border-black flex items-center justify-center text-lg shadow-[3px_3px_0px_#000]">⬤</div>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center gap-2 mb-4">
                <div className="w-10 h-10 bg-white rounded-full border-4 border-black flex items-center justify-center shadow-[3px_3px_0px_#A855F7]">
                  <div className="w-3 h-4 bg-black rounded-full"></div>
                </div>
                <div className="w-10 h-10 bg-white rounded-full border-4 border-black flex items-center justify-center shadow-[3px_3px_0px_#A855F7]">
                  <div className="w-3 h-4 bg-black rounded-full"></div>
                </div>
              </div>
              <h2 className="text-2xl font-black text-black tracking-tight" style={{ WebkitTextStroke: '1px #A855F7' }}>
                {currentView === "login" ? "Influencer Login" : "Join as Influencer"}
              </h2>
              <p className="text-black mt-1 text-sm font-medium">
                {currentView === "login" ? "Welcome back! Let's earn together 💰" : "Start earning ₹5 per sticker 🚀"}
              </p>
            </div>

            {/* Toggle */}
            <div className="flex p-1.5 bg-purple-100 rounded-2xl mb-6 border-2 border-purple-400">
              <button
                type="button"
                onClick={() => setCurrentView("login")}
                className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${
                  currentView === "login"
                    ? "bg-purple-500 text-white border-2 border-black shadow-[3px_3px_0px_#A855F7]"
                    : "text-black hover:text-purple-500"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setCurrentView("signup")}
                className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${
                  currentView === "signup"
                    ? "bg-pink-400 text-black border-2 border-black shadow-[3px_3px_0px_#A855F7]"
                    : "text-black hover:text-pink-500"
                }`}
              >
                Sign Up
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-100 border-2 border-red-500 rounded-xl mb-4">
                <span className="text-lg">😵</span>
                <p className="text-sm font-bold text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 px-4 py-3 bg-green-100 border-2 border-green-500 rounded-xl mb-4">
                <span className="text-lg">🎉</span>
                <p className="text-sm font-bold text-green-700">{success}</p>
              </div>
            )}

            {/* Forms */}
            {currentView === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-1.5">Email 📧</label>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white border-3 border-black focus:border-purple-500 focus:outline-none transition-all text-black font-medium placeholder:text-purple-400 shadow-[3px_3px_0px_#A855F7]"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-1.5">Password 🔐</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-white border-3 border-black focus:border-purple-500 focus:outline-none transition-all text-black font-medium placeholder:text-purple-400 shadow-[3px_3px_0px_#A855F7]"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-purple-500 hover:bg-black text-white rounded-xl font-black text-sm uppercase tracking-wide disabled:opacity-50 border-3 border-black shadow-[4px_4px_0px_#A855F7] hover:shadow-[2px_2px_0px_#A855F7] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                >
                  {loading ? "Logging in... ⏳" : "Login 🚀"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={signupForm.name}
                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white border-3 border-black focus:border-pink-500 focus:outline-none transition-all text-black font-medium placeholder:text-pink-400 shadow-[3px_3px_0px_#A855F7]"
                    placeholder="Your Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white border-3 border-black focus:border-pink-500 focus:outline-none transition-all text-black font-medium placeholder:text-pink-400 shadow-[3px_3px_0px_#A855F7]"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-1.5">Password *</label>
                  <input
                    type="password"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 rounded-xl bg-white border-3 border-black focus:border-pink-500 focus:outline-none transition-all text-black font-medium placeholder:text-pink-400 shadow-[3px_3px_0px_#A855F7]"
                    placeholder="Min 6 characters"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={signupForm.phone}
                    onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white border-3 border-black focus:border-pink-500 focus:outline-none transition-all text-black font-medium placeholder:text-pink-400 shadow-[3px_3px_0px_#A855F7]"
                    placeholder="9876543210"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-black mb-1.5">Instagram</label>
                    <input
                      type="text"
                      value={signupForm.instagram}
                      onChange={(e) => setSignupForm({ ...signupForm, instagram: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white border-3 border-black focus:border-pink-500 focus:outline-none transition-all text-black font-medium placeholder:text-pink-400 shadow-[3px_3px_0px_#A855F7]"
                      placeholder="@username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black mb-1.5">YouTube</label>
                    <input
                      type="text"
                      value={signupForm.youtube}
                      onChange={(e) => setSignupForm({ ...signupForm, youtube: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white border-3 border-black focus:border-pink-500 focus:outline-none transition-all text-black font-medium placeholder:text-pink-400 shadow-[3px_3px_0px_#A855F7]"
                      placeholder="Channel"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-pink-400 hover:bg-black text-black hover:text-white rounded-xl font-black text-sm uppercase tracking-wide disabled:opacity-50 border-3 border-black shadow-[4px_4px_0px_#A855F7] hover:shadow-[2px_2px_0px_#A855F7] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                >
                  {loading ? "Creating Account... ⏳" : "Start Earning Now 💰"}
                </button>
              </form>
            )}
          </div>

          {/* Back to Store */}
          <div className="text-center mt-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-3 bg-purple-400 text-black rounded-full border-3 border-black shadow-[4px_4px_0px_#A855F7] hover:shadow-[2px_2px_0px_#A855F7] hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-bold"
            >
              ← Back to Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ===========================
     RENDER DASHBOARD (Authenticated)
  =========================== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white">StickToon Influencer</h1>
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-purple-500/20 rounded-full border border-purple-500/50">
                <Award className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-200 font-medium">{user?.name}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg border border-red-500/50 transition-colors"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span className="text-red-300 text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { id: "dashboard", label: "Dashboard", icon: TrendingUp },
              { id: "promo", label: "Promo Codes", icon: Award },
              { id: "withdraw", label: "Withdrawals", icon: DollarSign },
              { id: "profile", label: "Profile", icon: Users },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setCurrentView(tab.id as any);
                  navigate(`/influencer/${tab.id}`);
                }}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-all whitespace-nowrap ${
                  currentView === tab.id
                    ? "text-white border-b-2 border-purple-500 bg-purple-500/10"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* DASHBOARD VIEW */}
        {currentView === "dashboard" && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm font-medium">Total Earnings</span>
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-white">₹{dashboardData?.totalEarnings || 0}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm font-medium">Pending</span>
                  <TrendingUp className="w-5 h-5 text-yellow-400" />
                </div>
                <p className="text-3xl font-bold text-white">₹{dashboardData?.pendingEarnings || 0}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm font-medium">Total Orders</span>
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-3xl font-bold text-white">{dashboardData?.totalOrders || 0}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm font-medium">Total Units</span>
                  <Award className="w-5 h-5 text-pink-400" />
                </div>
                <p className="text-3xl font-bold text-white">{dashboardData?.totalUnits || 0}</p>
              </div>
            </div>

            {/* Promo Codes Quick View */}
            {promoCodes && promoCodes.length > 0 && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">Your Promo Codes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {promoCodes.map((promo) => (
                    <div key={promo._id} className="bg-purple-500/20 rounded-xl p-4 border border-purple-500/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-white">{promo.code}</span>
                          <button
                            onClick={() => copyPromoCode(promo.code)}
                            className="p-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                          >
                            {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
                          </button>
                        </div>
                        <span className="px-3 py-1 bg-purple-600 rounded-full text-white text-xs font-bold">
                          {promo.discountValue}% OFF
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-purple-200">Used: {promo.usageCount} times</span>
                        <span className="text-green-400 font-bold">₹{promo.totalEarnings}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Earnings */}
            {dashboardData?.recentEarnings && dashboardData.recentEarnings.length > 0 && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">Recent Earnings</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="pb-3 text-gray-400 font-medium text-sm">Date</th>
                        <th className="pb-3 text-gray-400 font-medium text-sm">Customer</th>
                        <th className="pb-3 text-gray-400 font-medium text-sm">Units</th>
                        <th className="pb-3 text-gray-400 font-medium text-sm">Amount</th>
                        <th className="pb-3 text-gray-400 font-medium text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.recentEarnings.slice(0, 10).map((earning) => (
                        <tr key={earning._id} className="border-b border-white/5">
                          <td className="py-3 text-gray-300 text-sm">
                            {new Date(earning.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-white text-sm">{earning.customerId?.name || "N/A"}</td>
                          <td className="py-3 text-gray-300 text-sm">{earning.totalUnits}</td>
                          <td className="py-3 text-green-400 font-bold text-sm">₹{earning.totalEarning}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              earning.status === "paid" 
                                ? "bg-green-500/20 text-green-400"
                                : "bg-yellow-500/20 text-yellow-400"
                            }`}>
                              {earning.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROMO CODE VIEW */}
        {currentView === "promo" && (
          <div className="space-y-6">
            {/* Create Promo Form */}
            {promoCodes.length < 2 && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">Create New Promo Code</h3>
                <form onSubmit={handleCreatePromo} className="space-y-4">
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Promo Code</label>
                    <input
                      type="text"
                      value={promoForm.code}
                      onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                      required
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      placeholder="MYCODE"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Discount Value (%)</label>
                    <select
                      value={promoForm.discountValue}
                      onChange={(e) => setPromoForm({ ...promoForm, discountValue: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value={5}>5%</option>
                      <option value={10}>10%</option>
                      <option value={15}>15%</option>
                      <option value={99}>99%</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
                  >
                    {loading ? "Creating..." : "Create Promo Code"}
                  </button>
                </form>
              </div>
            )}

            {/* Promo List */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Your Promo Codes ({promoCodes.length}/2)</h3>
              {promoCodes.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No promo codes yet. Create one above!</p>
              ) : (
                <div className="space-y-4">
                  {promoCodes.map((promo) => (
                    <div key={promo._id} className="bg-purple-500/20 rounded-xl p-6 border border-purple-500/50">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-3xl font-black text-white">{promo.code}</span>
                            <button
                              onClick={() => copyPromoCode(promo.code)}
                              className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                            >
                              {copied ? <Check className="w-5 h-5 text-white" /> : <Copy className="w-5 h-5 text-white" />}
                            </button>
                          </div>
                          <p className="text-purple-200 text-sm">
                            Earn ₹{promo.earningPerUnit} per unit • {promo.discountValue}% discount
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeletePromo(promo._id)}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-purple-500/30">
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Usage Count</p>
                          <p className="text-white font-bold">{promo.usageCount}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Units Sold</p>
                          <p className="text-white font-bold">{promo.totalUnitsSold}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs mb-1">Total Earned</p>
                          <p className="text-green-400 font-bold">₹{promo.totalEarnings}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* WITHDRAWAL VIEW */}
        {currentView === "withdraw" && (
          <div className="space-y-6">
            {/* Withdrawal Form */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Request Withdrawal</h3>
              <div className="mb-4 p-4 bg-purple-500/20 rounded-lg border border-purple-500/50">
                <p className="text-purple-200 text-sm">
                  Available to withdraw: <span className="font-bold text-white">₹{dashboardData?.availableToWithdraw || 0}</span>
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Minimum withdrawal: ₹{user?.influencerProfile?.minWithdrawalAmount || 100}
                </p>
              </div>

              <form onSubmit={handleWithdrawal} className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Amount (₹)</label>
                  <input
                    type="number"
                    value={withdrawForm.amount || ""}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: parseInt(e.target.value) })}
                    required
                    min={user?.influencerProfile?.minWithdrawalAmount || 100}
                    max={dashboardData?.availableToWithdraw || 0}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    placeholder="Enter amount"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm mb-2">Payment Method</label>
                  <div className="flex gap-4 mb-4">
                    <button
                      type="button"
                      onClick={() => setWithdrawForm({ ...withdrawForm, paymentMethod: "upi" })}
                      className={`flex-1 py-3 rounded-lg border-2 transition-all ${
                        withdrawForm.paymentMethod === "upi"
                          ? "border-purple-500 bg-purple-500/20 text-white"
                          : "border-white/20 bg-white/10 text-gray-400"
                      }`}
                    >
                      UPI
                    </button>
                    <button
                      type="button"
                      onClick={() => setWithdrawForm({ ...withdrawForm, paymentMethod: "bank_transfer" })}
                      className={`flex-1 py-3 rounded-lg border-2 transition-all ${
                        withdrawForm.paymentMethod === "bank_transfer"
                          ? "border-purple-500 bg-purple-500/20 text-white"
                          : "border-white/20 bg-white/10 text-gray-400"
                      }`}
                    >
                      Bank Transfer
                    </button>
                  </div>
                </div>

                {withdrawForm.paymentMethod === "upi" ? (
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">UPI ID</label>
                    <input
                      type="text"
                      value={withdrawForm.upiId}
                      onChange={(e) => setWithdrawForm({ ...withdrawForm, upiId: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      placeholder="yourname@upi"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Account Holder</label>
                      <input
                        type="text"
                        value={withdrawForm.bankDetails.accountHolder}
                        onChange={(e) => setWithdrawForm({
                          ...withdrawForm,
                          bankDetails: { ...withdrawForm.bankDetails, accountHolder: e.target.value }
                        })}
                        required
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                        placeholder="Account holder name"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Account Number</label>
                      <input
                        type="text"
                        value={withdrawForm.bankDetails.accountNumber}
                        onChange={(e) => setWithdrawForm({
                          ...withdrawForm,
                          bankDetails: { ...withdrawForm.bankDetails, accountNumber: e.target.value }
                        })}
                        required
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                        placeholder="Account number"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">IFSC Code</label>
                      <input
                        type="text"
                        value={withdrawForm.bankDetails.ifscCode}
                        onChange={(e) => setWithdrawForm({
                          ...withdrawForm,
                          bankDetails: { ...withdrawForm.bankDetails, ifscCode: e.target.value }
                        })}
                        required
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                        placeholder="IFSC code"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Bank Name</label>
                      <input
                        type="text"
                        value={withdrawForm.bankDetails.bankName}
                        onChange={(e) => setWithdrawForm({
                          ...withdrawForm,
                          bankDetails: { ...withdrawForm.bankDetails, bankName: e.target.value }
                        })}
                        required
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                        placeholder="Bank name"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Submit Withdrawal Request"}
                </button>
              </form>
            </div>

            {/* Withdrawal History */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Withdrawal History</h3>
              {withdrawals.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No withdrawals yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="pb-3 text-gray-400 font-medium text-sm">Date</th>
                        <th className="pb-3 text-gray-400 font-medium text-sm">Amount</th>
                        <th className="pb-3 text-gray-400 font-medium text-sm">Method</th>
                        <th className="pb-3 text-gray-400 font-medium text-sm">Status</th>
                        <th className="pb-3 text-gray-400 font-medium text-sm">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.map((withdrawal) => (
                        <tr key={withdrawal._id} className="border-b border-white/5">
                          <td className="py-3 text-gray-300 text-sm">
                            {new Date(withdrawal.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-white font-bold text-sm">₹{withdrawal.amount}</td>
                          <td className="py-3 text-gray-300 text-sm uppercase">{withdrawal.paymentMethod}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              withdrawal.status === "approved" 
                                ? "bg-green-500/20 text-green-400"
                                : withdrawal.status === "rejected"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-yellow-500/20 text-yellow-400"
                            }`}>
                              {withdrawal.status}
                            </span>
                          </td>
                          <td className="py-3 text-gray-400 text-sm">{withdrawal.adminNote || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PROFILE VIEW */}
        {currentView === "profile" && (
          <div className="space-y-6">
            {/* Account Info */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Account Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-sm">Name</p>
                  <p className="text-white font-medium">{user?.name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white font-medium">{user?.email}</p>
                </div>
                {user?.phone && (
                  <div>
                    <p className="text-gray-400 text-sm">Phone</p>
                    <p className="text-white font-medium">{user.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Payment Details</h3>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-2">UPI ID</label>
                  <input
                    type="text"
                    value={profileForm.upiId}
                    onChange={(e) => setProfileForm({ ...profileForm, upiId: e.target.value })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    placeholder="yourname@upi"
                  />
                </div>

                <div className="border-t border-white/10 pt-4">
                  <h4 className="text-white font-semibold mb-3">Bank Details</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Account Holder</label>
                      <input
                        type="text"
                        value={profileForm.bankDetails.accountHolder}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          bankDetails: { ...profileForm.bankDetails, accountHolder: e.target.value }
                        })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                        placeholder="Account holder name"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Account Number</label>
                      <input
                        type="text"
                        value={profileForm.bankDetails.accountNumber}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          bankDetails: { ...profileForm.bankDetails, accountNumber: e.target.value }
                        })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                        placeholder="Account number"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">IFSC Code</label>
                      <input
                        type="text"
                        value={profileForm.bankDetails.ifscCode}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          bankDetails: { ...profileForm.bankDetails, ifscCode: e.target.value }
                        })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                        placeholder="IFSC code"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">Bank Name</label>
                      <input
                        type="text"
                        value={profileForm.bankDetails.bankName}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          bankDetails: { ...profileForm.bankDetails, bankName: e.target.value }
                        })}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                        placeholder="Bank name"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Payment Details"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Influencer;
