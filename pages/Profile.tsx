import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Camera, X, Save, LogOut, Mail, Calendar, ShoppingBag, CheckCircle, XCircle, AlertCircle } from "lucide-react";
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
  const location = window.location;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<"profile" | "orders">("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastIdCounter, setToastIdCounter] = useState(0);

  const showToast = (type: "success" | "error" | "warning", message: string) => {
    const id = toastIdCounter;
    setToastIdCounter(id + 1);
    const newToast: Toast = { id, type, message };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 4000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  };

  useEffect(() => {
    fetchProfile();
    // Check URL for tab param
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    if (params.get('tab') === 'orders') {
      setActiveTab('orders');
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  const fetchOrders = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setOrdersLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user-orders/my-orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast("warning", "⚠️ Image size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setEditAvatar(null);
  };

  const handleSaveProfile = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          avatar: editAvatar,
        }),
      });

      if (!res.ok) throw new Error("Failed to update profile");

      const data = await res.json();
      
      // Update local state
      setProfile(prev => prev ? { ...prev, name: data.user.name, avatar: data.user.avatar } : null);
      
      // Update localStorage
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        userData.name = data.user.name;
        userData.avatar = data.user.avatar;
        localStorage.setItem("user", JSON.stringify(userData));
      }
      
      setShowEditModal(false);
      showToast("success", "✅ Profile updated successfully!");
      
      // Reload page to update navbar
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      showToast("error", "❌ Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getInitial = (name: string) => {
    return name?.charAt(0)?.toUpperCase() || "U";
  };

  const handleBuyAgain = async (item: OrderItem) => {
    if (addToCart) {
      try {
        await addToCart({
          id: item.badgeId,
          name: item.name,
          price: item.price,
          image: item.image,
          printImage: item.printImage,
          quantity: item.quantity,
          category: "Reorder" 
        });
        showToast("success", `✅ Added ${item.name} to cart!`);
      } catch (err) {
        showToast("error", "❌ Failed to add item to cart.");
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-red-400">{error || "Something went wrong"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Tab Switcher */}
        <div className="flex bg-slate-800/50 backdrop-blur-sm rounded-2xl p-1 mb-6 border border-slate-700">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all ${
              activeTab === "profile" 
                ? "bg-purple-600 text-white shadow-lg" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            Profile Info
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all ${
              activeTab === "orders" 
                ? "bg-purple-600 text-white shadow-lg" 
                : "text-slate-400 hover:text-white"
            }`}
          >
            My Orders
          </button>
        </div>

        {activeTab === "profile" ? (
          /* Profile Card */
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-3xl border border-slate-700 p-8 animate-fadeIn">
            {/* Avatar Section */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative group">
                {profile.avatar && (profile.avatar.startsWith('http') || profile.avatar.startsWith('data:')) ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-28 h-28 rounded-full object-cover border-4 border-purple-500 shadow-lg"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-4xl font-bold border-4 border-purple-500 shadow-lg">
                    {profile.avatar || getInitial(profile.name)}
                  </div>
                )}
                
                {/* Edit Button Overlay */}
                <button
                  onClick={() => setShowEditModal(true)}
                  className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Camera className="w-6 h-6 text-white" />
                </button>
              </div>
              
              <h1 className="text-2xl font-bold text-white mt-4">{profile.name}</h1>
              <p className="text-slate-400">{profile.email}</p>
              
              {profile.role !== "user" && (
                <span className="mt-2 px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded-full capitalize">
                  {profile.role}
                </span>
              )}
            </div>

            {/* Info Cards */}
            <div className="grid gap-4 mb-8">
              <div className="flex items-center gap-4 bg-slate-700/30 rounded-xl p-4">
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Email</p>
                  <p className="text-white">{profile.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-slate-700/30 rounded-xl p-4">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Member Since</p>
                  <p className="text-white">{formatDate(profile.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4">
              <button
                onClick={() => setShowEditModal(true)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/20"
              >
                <User className="w-5 h-5" />
                Edit Profile
              </button>

              <button
                onClick={() => setActiveTab("orders")}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] border border-slate-600"
              >
                <ShoppingBag className="w-5 h-5" />
                My Orders
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-500 py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] border border-red-500/20"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        ) : (
          /* Orders Section */
          <div className="space-y-6 animate-fadeIn">
            {ordersLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-800/50 rounded-3xl border border-slate-700 text-center">
                <div className="animate-spin w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full mb-4" />
                <p className="text-slate-400 font-medium tracking-wide">Fetching your order history...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-800/50 rounded-3xl border border-slate-700 text-center p-8">
                <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mb-6">
                  <ShoppingBag className="w-10 h-10 text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">No orders yet</h3>
                <p className="text-slate-400 mb-8 max-w-xs mx-auto">Looks like you haven't placed any orders yet. Start your collection today!</p>
                <button
                  onClick={() => navigate("/categories")}
                  className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-8 rounded-xl font-bold transition-all hover:scale-[1.05]"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order._id} className="bg-slate-800/50 backdrop-blur-sm rounded-3xl border border-slate-700 overflow-hidden shadow-xl hover:shadow-purple-500/5 transition-all">
                  {/* Order Header */}
                  <div className="p-6 bg-slate-700/30 flex flex-wrap items-center justify-between gap-4 border-b border-slate-700">
                    <div>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Order Date</p>
                      <p className="text-white font-bold">{formatDate(order.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-tighter shadow-sm ${
                        order.status === "SUCCESS" ? "bg-green-500/20 text-green-400" :
                        order.status === "FAILED" ? "bg-red-500/20 text-red-400" :
                        "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Total</p>
                      <p className="text-purple-400 font-black text-lg">₹{order.amount}</p>
                    </div>
                    {order.invoiceId && (
                      <div className="text-right">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Invoice</p>
                        <p className="text-white font-mono text-sm">#{order.invoiceId.invoiceNumber}</p>
                      </div>
                    )}
                  </div>

                  {/* Order Items */}
                  <div className="p-6 space-y-4">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4 py-3 border-b border-slate-700/50 last:border-0 group">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/50 flex-shrink-0">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <h4 className="text-white font-bold truncate tracking-tight">{item.name}</h4>
                          <p className="text-slate-400 text-sm">₹{item.price} • Qty: {item.quantity}</p>
                        </div>
                        <button
                          onClick={() => handleBuyAgain(item)}
                          className="px-4 py-2 bg-purple-600/10 hover:bg-purple-600 text-purple-400 hover:text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all hover:scale-105 border border-purple-500/20 hover:border-purple-500"
                        >
                          Buy Again
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Order Footer */}
                  <div className="px-6 py-4 bg-slate-900/40 text-right">
                    <p className="text-[10px] text-slate-600 font-mono tracking-tighter">ORDER ID: {order._id}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Edit Profile</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Avatar Edit */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                {editAvatar && (editAvatar.startsWith('http') || editAvatar.startsWith('data:')) ? (
                  <img
                    src={editAvatar}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-purple-500"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold border-4 border-purple-500">
                    {editAvatar || getInitial(editName)}
                  </div>
                )}
              </div>

              {/* Avatar Buttons */}
              <div className="flex gap-3 mt-4">
                {editAvatar && (editAvatar.startsWith('http') || editAvatar.startsWith('data:')) && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                  >
                    Remove Profile Pic
                  </button>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
                >
                  Change Pic
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            {/* Name Input */}
            <div className="mb-6">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Your Name"
                className="w-full bg-transparent border-2 border-purple-500 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-purple-400 transition-colors"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveProfile}
              disabled={saving || !editName.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-6 right-6 z-[9999] space-y-3 max-w-md">
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle className="w-6 h-6 text-green-400" />,
            error: <XCircle className="w-6 h-6 text-red-400" />,
            warning: <AlertCircle className="w-6 h-6 text-yellow-400" />,
          };

          const colors = {
            success: "from-green-500/20 via-emerald-500/10 to-transparent border-green-400/50 shadow-[0_8px_32px_rgba(34,197,94,0.3)]",
            error: "from-red-500/20 via-pink-500/10 to-transparent border-red-400/50 shadow-[0_8px_32px_rgba(239,68,68,0.3)]",
            warning: "from-yellow-500/20 via-orange-500/10 to-transparent border-yellow-400/50 shadow-[0_8px_32px_rgba(234,179,8,0.3)]",
          };

          return (
            <div
              key={toast.id}
              className={`
                relative bg-gradient-to-br ${colors[toast.type]} 
                backdrop-blur-xl border-2 rounded-2xl p-4 pr-12
                ${toast.isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
                transition-all duration-300
                hover:scale-105
              `}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {icons[toast.type]}
                </div>
                <p className="text-white font-semibold text-sm leading-relaxed flex-1">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all group"
              >
                <X className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);
};

export default Profile;
