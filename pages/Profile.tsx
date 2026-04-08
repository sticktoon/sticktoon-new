import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Camera, X, Save, LogOut, Mail, Calendar, ShoppingBag, CheckCircle, XCircle, AlertCircle, Package, RefreshCw, Clock, ChevronRight, Shield } from "lucide-react";
import { API_BASE_URL } from "../config/api";

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  createdAt: string;
}

interface OrderItem {
  badgeId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  printImage?: string;
}

interface Order {
  _id: string;
  items: OrderItem[];
  amount: number;
  status: string;
  createdAt: string;
  invoiceId?: {
    invoiceNumber: string;
  };
}

interface ProfileProps {
  addToCart?: (item: any) => Promise<void>;
}

interface Toast {
  id: number;
  type: "success" | "error" | "warning";
  message: string;
  isExiting?: boolean;
}

const Profile: React.FC<ProfileProps> = ({ addToCart }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<"profile" | "orders">("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastIdCounter, setToastIdCounter] = useState(0);

  const showToast = (type: "success" | "error" | "warning", message: string) => {
    const id = toastIdCounter;
    setToastIdCounter(id + 1);
    const newToast: Toast = { id, type, message };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t)));
      setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, 300);
    }, 4000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t)));
    setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, 300);
  };

  useEffect(() => {
    fetchProfile();
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    if (params.get('tab') === 'orders') setActiveTab('orders');
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') fetchOrders();
  }, [activeTab]);

  const fetchOrders = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setOrdersLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user-orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchProfile = async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }
        throw new Error("Failed to fetch profile");
      }
      const data = await res.json();
      setProfile(data);
      setEditName(data.name || "");
      setEditAvatar(data.avatar || null);
    } catch (err) {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("cart");
    window.location.href = "/";
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast("warning", "⚠️ Image size must be less than 2MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setEditAvatar(reader.result as string); };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => { setEditAvatar(null); };

  const handleSaveProfile = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName, avatar: editAvatar }),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      const data = await res.json();
      setProfile(prev => prev ? { ...prev, name: data.user.name, avatar: data.user.avatar } : null);
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        userData.name = data.user.name;
        userData.avatar = data.user.avatar;
        localStorage.setItem("user", JSON.stringify(userData));
      }
      setShowEditModal(false);
      showToast("success", "✅ Profile updated successfully!");
      setTimeout(() => { window.location.reload(); }, 1000);
    } catch (err) {
      showToast("error", "❌ Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getInitial = (name: string) => name?.charAt(0)?.toUpperCase() || "U";

  const handleBuyAgain = async (item: OrderItem) => {
    if (addToCart) {
      try {
        await addToCart({
          id: item.badgeId, name: item.name, price: item.price,
          image: item.image, printImage: item.printImage,
          quantity: item.quantity, category: "Reorder"
        });
        showToast("success", `✅ Added ${item.name} to cart!`);
      } catch (err) {
        showToast("error", "❌ Failed to add item to cart.");
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SUCCESS": return <CheckCircle className="w-4 h-4" />;
      case "FAILED": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "SUCCESS": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "FAILED": return "bg-red-500/15 text-red-400 border-red-500/30";
      default: return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-10 h-10 border-[3px] border-purple-500 border-t-transparent rounded-full" />
          <p className="text-slate-500 text-sm tracking-widest uppercase">Loading Profile</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-red-400">{error || "Something went wrong"}</p>
      </div>
    );
  }

  const sidebarItems = [
    { id: "profile" as const, label: "Profile", icon: User, desc: "Manage your account" },
    { id: "orders" as const, label: "My Orders", icon: Package, desc: "View order history" },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Account</h1>
          <p className="text-slate-500 mt-1">Manage your profile and view your orders</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* ===== SIDEBAR ===== */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] overflow-hidden sticky top-8">
              {/* User Mini Card */}
              <div className="p-6 border-b border-white/[0.06]">
                <div className="flex items-center gap-4">
                  {profile.avatar && (profile.avatar.startsWith('http') || profile.avatar.startsWith('data:')) ? (
                    <img src={profile.avatar} alt={profile.name}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-500/40" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold ring-2 ring-purple-500/40">
                      {getInitial(profile.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">{profile.name}</p>
                    <p className="text-slate-500 text-xs truncate">{profile.email}</p>
                  </div>
                </div>
                {profile.role !== "user" && (
                  <span className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/15 text-purple-400 text-xs font-medium rounded-full border border-purple-500/20">
                    <Shield className="w-3 h-3" />
                    {profile.role}
                  </span>
                )}
              </div>

              {/* Navigation */}
              <nav className="p-3">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 mb-1 group ${
                      activeTab === item.id
                        ? "bg-purple-500/15 text-white"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${activeTab === item.id ? "text-purple-400" : "text-slate-500 group-hover:text-slate-300"}`} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-slate-600 truncate">{item.desc}</p>
                    </div>
                    {activeTab === item.id && <ChevronRight className="w-4 h-4 text-purple-400 ml-auto" />}
                  </button>
                ))}
              </nav>

              {/* Logout */}
              <div className="p-3 pt-0">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 text-left"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium text-sm">Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* ===== MAIN CONTENT ===== */}
          <div className="flex-1 min-w-0">
            {activeTab === "profile" ? (
              <div className="space-y-6 animate-fadeIn">
                {/* Profile Header Card */}
                <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] overflow-hidden">
                  {/* Banner */}
                  <div className="h-32 bg-gradient-to-r from-purple-600/30 via-indigo-600/20 to-purple-600/10 relative">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
                  </div>

                  <div className="px-8 pb-8 -mt-14 relative">
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
                      {/* Large Avatar */}
                      <div className="relative group flex-shrink-0">
                        {profile.avatar && (profile.avatar.startsWith('http') || profile.avatar.startsWith('data:')) ? (
                          <img src={profile.avatar} alt={profile.name}
                            className="w-28 h-28 rounded-2xl object-cover ring-4 ring-slate-950 shadow-2xl" />
                        ) : (
                          <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold ring-4 ring-slate-950 shadow-2xl">
                            {getInitial(profile.name)}
                          </div>
                        )}
                        <button
                          onClick={() => setShowEditModal(true)}
                          className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        >
                          <Camera className="w-6 h-6 text-white" />
                        </button>
                      </div>

                      <div className="flex-1 min-w-0 pt-2">
                        <h2 className="text-2xl font-bold text-white tracking-tight">{profile.name}</h2>
                        <p className="text-slate-400 text-sm">{profile.email}</p>
                      </div>

                      <button
                        onClick={() => setShowEditModal(true)}
                        className="px-5 py-2.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 rounded-xl font-medium text-sm transition-all border border-purple-500/20 hover:border-purple-500/40 flex items-center gap-2"
                      >
                        <User className="w-4 h-4" />
                        Edit Profile
                      </button>
                    </div>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 bg-purple-500/15 rounded-xl flex items-center justify-center">
                        <Mail className="w-4 h-4 text-purple-400" />
                      </div>
                      <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Email</span>
                    </div>
                    <p className="text-white font-medium truncate">{profile.email}</p>
                  </div>

                  <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 bg-emerald-500/15 rounded-xl flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Member Since</span>
                    </div>
                    <p className="text-white font-medium">{formatDate(profile.createdAt)}</p>
                  </div>

                  <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 bg-indigo-500/15 rounded-xl flex items-center justify-center">
                        <Package className="w-4 h-4 text-indigo-400" />
                      </div>
                      <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Total Orders</span>
                    </div>
                    <p className="text-white font-medium">{orders.length > 0 ? orders.length : "—"}</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] p-6">
                  <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Quick Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => setActiveTab("orders")}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.1] transition-all group"
                    >
                      <div className="w-10 h-10 bg-indigo-500/15 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ShoppingBag className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium text-sm">View Orders</p>
                        <p className="text-slate-500 text-xs">Track and manage your purchases</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 ml-auto group-hover:text-slate-400 transition-colors" />
                    </button>

                    <button
                      onClick={() => navigate("/categories")}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.1] transition-all group"
                    >
                      <div className="w-10 h-10 bg-purple-500/15 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ShoppingBag className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium text-sm">Browse Store</p>
                        <p className="text-slate-500 text-xs">Explore our sticker collection</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 ml-auto group-hover:text-slate-400 transition-colors" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ===== ORDERS TAB ===== */
              <div className="space-y-4 animate-fadeIn">
                {/* Orders Header */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Order History</h2>
                    <p className="text-slate-500 text-sm mt-0.5">{orders.length} order{orders.length !== 1 ? "s" : ""} placed</p>
                  </div>
                  <button
                    onClick={fetchOrders}
                    className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all text-slate-400 hover:text-white"
                    title="Refresh orders"
                  >
                    <RefreshCw className={`w-4 h-4 ${ordersLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {ordersLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 bg-slate-900/60 rounded-2xl border border-white/[0.06]">
                    <div className="animate-spin w-10 h-10 border-[3px] border-purple-500 border-t-transparent rounded-full mb-4" />
                    <p className="text-slate-500 text-sm tracking-widest uppercase">Loading Orders</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 bg-slate-900/60 rounded-2xl border border-white/[0.06] text-center px-8">
                    <div className="w-20 h-20 bg-slate-800/80 rounded-2xl flex items-center justify-center mb-6">
                      <Package className="w-10 h-10 text-slate-600" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No orders yet</h3>
                    <p className="text-slate-500 mb-8 max-w-sm">Your order history will appear here once you make your first purchase.</p>
                    <button
                      onClick={() => navigate("/categories")}
                      className="bg-purple-600 hover:bg-purple-500 text-white py-3 px-8 rounded-xl font-semibold transition-all hover:scale-105 shadow-lg shadow-purple-500/20"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  orders.map((order, orderIdx) => (
                    <div key={order._id} className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] overflow-hidden hover:border-white/[0.1] transition-all duration-300">
                      {/* Order Header */}
                      <div className="px-6 py-4 flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-white/[0.04]">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 text-xs font-medium uppercase tracking-wider">Order</span>
                          <span className="text-slate-400 text-xs font-mono">#{order._id.slice(-8)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-600" />
                          <span className="text-slate-400 text-xs">{formatDate(order.createdAt)}</span>
                        </div>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${getStatusStyle(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {order.status}
                        </div>
                        {order.invoiceId && (
                          <span className="text-slate-500 text-xs font-mono">INV #{order.invoiceId.invoiceNumber}</span>
                        )}
                        <span className="text-white font-bold ml-auto text-lg">₹{order.amount}</span>
                      </div>

                      {/* Order Items */}
                      <div className="p-4">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-800 border border-white/[0.06] flex-shrink-0">
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                            </div>
                            <div className="flex-grow min-w-0">
                              <h4 className="text-white font-medium text-sm truncate">{item.name}</h4>
                              <p className="text-slate-500 text-xs mt-0.5">
                                ₹{item.price} × {item.quantity}
                                <span className="text-slate-600 ml-2">= ₹{item.price * item.quantity}</span>
                              </p>
                            </div>
                            <button
                              onClick={() => handleBuyAgain(item)}
                              className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white rounded-lg text-xs font-semibold transition-all duration-200 border border-purple-500/20 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20 flex-shrink-0"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Buy Again
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-white/[0.08] shadow-2xl shadow-black/50 animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
              <h2 className="text-lg font-bold text-white">Edit Profile</h2>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="p-6">
              {/* Avatar Edit */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative group">
                  {editAvatar && (editAvatar.startsWith('http') || editAvatar.startsWith('data:')) ? (
                    <img src={editAvatar} alt="Profile" className="w-24 h-24 rounded-2xl object-cover ring-2 ring-purple-500/40" />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold ring-2 ring-purple-500/40">
                      {editAvatar || getInitial(editName)}
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  >
                    <Camera className="w-6 h-6 text-white" />
                  </button>
                </div>

                <div className="flex gap-2 mt-4">
                  {editAvatar && (editAvatar.startsWith('http') || editAvatar.startsWith('data:')) && (
                    <button onClick={handleRemoveAvatar} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition-colors border border-red-500/20">
                      Remove
                    </button>
                  )}
                  <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 rounded-lg text-xs font-medium transition-colors border border-white/[0.08]">
                    Upload Photo
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                </div>
              </div>

              {/* Name Input */}
              <div className="mb-6">
                <label className="block text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full bg-white/[0.04] border border-white/[0.08] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all placeholder:text-slate-600"
                />
              </div>

              {/* Save */}
              <button
                onClick={handleSaveProfile}
                disabled={saving || !editName.trim()}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
              >
                {saving ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-6 right-6 z-[9999] space-y-3 max-w-sm">
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
            error: <XCircle className="w-5 h-5 text-red-400" />,
            warning: <AlertCircle className="w-5 h-5 text-amber-400" />,
          };
          const colors = {
            success: "bg-slate-900/95 border-emerald-500/30",
            error: "bg-slate-900/95 border-red-500/30",
            warning: "bg-slate-900/95 border-amber-500/30",
          };
          return (
            <div
              key={toast.id}
              className={`${colors[toast.type]} backdrop-blur-xl border rounded-xl p-4 pr-10 shadow-2xl shadow-black/40
                ${toast.isExiting ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'}
                transition-all duration-300`}
            >
              <div className="flex items-center gap-3">
                {icons[toast.type]}
                <p className="text-white text-sm font-medium">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Profile;
