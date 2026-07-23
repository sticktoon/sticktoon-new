import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  MapPin,
  Package,
  LogOut,
  Mail,
  Phone,
  Calendar,
  ChevronRight,
  Shield,
  ShoppingBag,
  Camera,
  Save,
  Trash2,
  Check,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  Star,
  ExternalLink,
  X,
  CreditCard,
  FileText,
  Download,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";
import { clearTokens } from "../utils/apiClient";
import { BADGES } from "../constants";

type UserProfile = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  phone?: string;
  createdAt?: string;
};

type AddressItem = {
  _id: string;
  label?: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault?: boolean;
};

type OrderItem = {
  id?: string;
  _id?: string;
  title: string;
  name?: string;
  price: number;
  quantity: number;
  badgeId?: string;
  customDesign?: {
    uploadedImage?: string;
    previewDataUrl?: string;
    text?: string;
  };
};

type UserOrder = {
  _id: string;
  amount: number;
  subtotal?: number;
  shippingAddress?: AddressItem;
  address?: {
    name?: string;
    phone?: string;
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  items: OrderItem[];
  status: string;
  isDelivered?: boolean;
  deliveredAt?: string;
  createdAt: string;
};

type ToastType = "success" | "error" | "warning";

export default function Profile() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"profile" | "addresses" | "orders">("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: "Home",
    fullName: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    isDefault: false,
  });

  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadInvoice = async (orderId: string) => {
    setDownloadingInvoiceId(orderId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/invoice/${orderId}/download`);
      if (!res.ok) {
        showToast("Invoice not available yet for this order.", "error");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${orderId.slice(-8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast("Invoice downloaded successfully!", "success");
    } catch (err) {
      console.error("Download invoice error:", err);
      showToast("Failed to download invoice", "error");
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const showToast = (message: string, type: ToastType = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getStoredToken = () => {
    return localStorage.getItem("token") || "";
  };

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      navigate("/login");
      return;
    }
    fetchProfile(token);
    fetchAddresses(token);
    fetchOrders(token);
  }, []);

  const fetchProfile = async (token: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          clearTokens();
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }
        throw new Error("Failed to fetch profile");
      }
      const data = await res.json();
      const userObj = data.user || data;
      setProfile(userObj);
      setEditName(userObj.name || "");
      setEditPhone(userObj.phone || "");
      setEditAvatar(userObj.avatar || "");
    } catch (err: any) {
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchAddresses = async (token?: string) => {
    const authToken = token || getStoredToken();
    if (!authToken) return;
    setAddressesLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/addresses`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(Array.isArray(data.addresses) ? data.addresses : []);
      }
    } catch {
      // soft fail
    } finally {
      setAddressesLoading(false);
    }
  };

  const fetchOrders = async (token?: string) => {
    const authToken = token || getStoredToken();
    if (!authToken) return;
    setOrdersLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user-orders/my-orders`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch {
      // soft fail
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleLogout = () => {
    clearTokens();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleSaveProfile = async () => {
    const token = getStoredToken();
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
          phone: editPhone,
          avatar: editAvatar,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update profile");

      setProfile(data.user);
      setShowEditModal(false);
      showToast("Profile updated successfully!");
    } catch (err: any) {
      showToast(err.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const openAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm({
      label: "Home",
      fullName: profile?.name || "",
      phone: profile?.phone || "",
      street: "",
      city: "",
      state: "",
      pincode: "",
      country: "India",
      isDefault: addresses.length === 0,
    });
    setShowAddressModal(true);
  };

  const openEditAddress = (a: AddressItem) => {
    setEditingAddressId(a._id);
    setAddressForm({
      label: a.label || "Home",
      fullName: a.fullName || "",
      phone: a.phone || "",
      street: a.street || "",
      city: a.city || "",
      state: a.state || "",
      pincode: a.pincode || "",
      country: a.country || "India",
      isDefault: Boolean(a.isDefault),
    });
    setShowAddressModal(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getStoredToken();
    if (!token) return;

    try {
      const url = editingAddressId
        ? `${API_BASE_URL}/api/addresses/${editingAddressId}`
        : `${API_BASE_URL}/api/addresses`;
      const method = editingAddressId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(addressForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save address");

      setAddresses(Array.isArray(data.addresses) ? data.addresses : []);
      setShowAddressModal(false);
      showToast(editingAddressId ? "Address updated!" : "Address added!");
    } catch (err: any) {
      showToast(err.message || "Failed to save address", "error");
    }
  };

  const handleDeleteAddress = async (id: string) => {
    const token = getStoredToken();
    if (!token) return;
    if (!window.confirm("Are you sure you want to delete this address?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/addresses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete address");

      setAddresses(Array.isArray(data.addresses) ? data.addresses : []);
      showToast("Address deleted");
    } catch (err: any) {
      showToast(err.message || "Failed to delete address", "error");
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    const token = getStoredToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/addresses/${id}/default`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setAddresses(Array.isArray(data.addresses) ? data.addresses : []);
        showToast("Default address set!");
      }
    } catch {
      showToast("Failed to set default address", "error");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("Image size must be less than 2MB", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setEditAvatar("");
  };

  const getInitial = (name?: string) => {
    return name ? name.charAt(0).toUpperCase() : "U";
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getBadgeImage = (item: any) => {
    // 1. Direct image property saved on order item
    if (item.image && typeof item.image === "string" && item.image.trim()) {
      return item.image;
    }
    if (item.imageUrl && typeof item.imageUrl === "string" && item.imageUrl.trim()) {
      return item.imageUrl;
    }

    // 2. Custom design preview
    if (item.customDesign?.previewDataUrl) return item.customDesign.previewDataUrl;
    if (item.customDesign?.uploadedImage) return item.customDesign.uploadedImage;

    // 3. Match BADGES catalog by badgeId or item.id
    const targetId = String(item.badgeId || item.id || "").toLowerCase().trim();
    if (targetId) {
      const foundById = BADGES.find((b) => String(b.id).toLowerCase() === targetId);
      if (foundById?.image) return foundById.image;
    }

    // 4. Match BADGES catalog by item name / title
    const itemName = String(item.title || item.name || "").toLowerCase().trim();
    if (itemName) {
      const foundByName = BADGES.find(
        (b) => b.name.toLowerCase().trim() === itemName || itemName.includes(b.name.toLowerCase().trim()) || b.name.toLowerCase().trim().includes(itemName)
      );
      if (foundByName?.image) return foundByName.image;
    }

    // 5. Default fallback logo image
    return "/images/STICKTOON_LONG.jpeg";
  };

  const handleBuyAgain = (item: OrderItem) => {
    const rawCart = localStorage.getItem("cart");
    let currentCart: any[] = [];
    try {
      currentCart = rawCart ? JSON.parse(rawCart) : [];
    } catch {
      currentCart = [];
    }

    const newItem = {
      id: `${item.badgeId || "item"}-${Date.now()}`,
      title: item.title || item.name || "Badge Item",
      price: item.price || 99,
      quantity: 1,
      image: getBadgeImage(item) || "",
    };

    currentCart.push(newItem);
    localStorage.setItem("cart", JSON.stringify(currentCart));
    window.dispatchEvent(new Event("cartUpdated"));
    showToast("Added item back to your cart!", "success");
    navigate("/checkout");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-yellow-50/40 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-10 h-10 border-[3px] border-yellow-500 border-t-transparent rounded-full" />
          <p className="text-slate-600 text-sm tracking-widest font-black uppercase">Loading Profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-yellow-50/40 flex items-center justify-center">
        <div className="p-6 bg-white rounded-3xl border border-red-200 shadow-xl text-center">
          <p className="text-red-600 font-bold">{error || "Something went wrong"}</p>
          <button
            onClick={() => navigate("/login")}
            className="mt-4 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const sidebarItems = [
    { id: "profile" as const, label: "Profile", icon: User, desc: "Manage your account" },
    { id: "addresses" as const, label: "Addresses", icon: MapPin, desc: "Manage delivery addresses" },
    { id: "orders" as const, label: "My Orders", icon: Package, desc: "View order history" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-yellow-50/40 pt-8 pb-20 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-[9999] animate-fadeIn">
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-bold ${
              toast.type === "success"
                ? "bg-slate-900 text-white border-yellow-500/40"
                : toast.type === "error"
                ? "bg-red-600 text-white border-red-700"
                : "bg-amber-500 text-slate-900 border-amber-600"
            }`}
          >
            <CheckCircle className="w-5 h-5 text-yellow-400 shrink-0" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Account</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Manage your personal profile, addresses, and view recent orders
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* ===== SIDEBAR ===== */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-slate-200/80 shadow-[0_10px_30px_rgba(15,23,42,0.05)] overflow-hidden sticky top-8">
              {/* User Mini Card */}
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  {profile.avatar && (profile.avatar.startsWith('http') || profile.avatar.startsWith('data:')) ? (
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-yellow-500/40"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-slate-900 text-lg font-black ring-2 ring-yellow-500/40">
                      {getInitial(profile.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-slate-900 font-extrabold truncate">{profile.name}</p>
                    <p className="text-slate-500 text-xs truncate">{profile.email}</p>
                  </div>
                </div>
                {profile.role !== "user" && (
                  <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-900 text-xs font-black rounded-full border border-yellow-300">
                    <Shield className="w-3.5 h-3.5" />
                    {profile.role}
                  </span>
                )}
              </div>

              {/* Navigation */}
              <nav className="p-3 space-y-1">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-200 group ${
                      activeTab === item.id
                        ? "bg-slate-900 text-white font-extrabold shadow-md"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium"
                    }`}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${activeTab === item.id ? "text-yellow-400" : "text-slate-400 group-hover:text-slate-700"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold">{item.label}</p>
                      <p className={`text-xs truncate ${activeTab === item.id ? "text-slate-300" : "text-slate-400"}`}>{item.desc}</p>
                    </div>
                    {activeTab === item.id && <ChevronRight className="w-4 h-4 text-yellow-400 ml-auto" />}
                  </button>
                ))}
              </nav>

              {/* Logout */}
              <div className="p-3 pt-0">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-600 hover:bg-red-50 transition-all font-bold text-sm text-left"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* ===== MAIN CONTENT ===== */}
          <div className="flex-1 min-w-0">
            {activeTab === "profile" && (
              <div className="space-y-6 animate-fadeIn">
                {/* Profile Header Card */}
                <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-slate-200/80 shadow-[0_10px_30px_rgba(15,23,42,0.05)] overflow-hidden">
                  {/* Banner */}
                  <div className="h-32 bg-gradient-to-r from-yellow-400 via-orange-400 to-amber-500 relative">
                    <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
                  </div>

                  <div className="px-6 sm:px-8 pb-8 -mt-14 relative">
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
                      {/* Large Avatar */}
                      <div className="relative group flex-shrink-0">
                        {profile.avatar && (profile.avatar.startsWith('http') || profile.avatar.startsWith('data:')) ? (
                          <img
                            src={profile.avatar}
                            alt={profile.name}
                            className="w-28 h-28 rounded-2xl object-cover ring-4 ring-white shadow-xl"
                          />
                        ) : (
                          <div className="w-28 h-28 rounded-2xl bg-slate-900 flex items-center justify-center text-yellow-400 text-4xl font-black ring-4 ring-white shadow-xl">
                            {getInitial(profile.name)}
                          </div>
                        )}
                        <button
                          onClick={() => setShowEditModal(true)}
                          className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer text-white"
                        >
                          <Camera className="w-6 h-6" />
                        </button>
                      </div>

                      <div className="flex-1 min-w-0 pt-2">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{profile.name}</h2>
                        <p className="text-slate-500 font-medium text-sm">{profile.email}</p>
                      </div>

                      <button
                        onClick={() => setShowEditModal(true)}
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
                      >
                        <User className="w-4 h-4 text-yellow-400" />
                        Edit Profile
                      </button>
                    </div>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 bg-yellow-100 rounded-xl flex items-center justify-center">
                        <Mail className="w-4 h-4 text-yellow-700" />
                      </div>
                      <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Email</span>
                    </div>
                    <p className="text-slate-900 font-bold truncate">{profile.email}</p>
                  </div>

                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
                        <Phone className="w-4 h-4 text-orange-700" />
                      </div>
                      <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Phone</span>
                    </div>
                    <p className="text-slate-900 font-bold truncate">{profile.phone || "—"}</p>
                  </div>

                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-amber-700" />
                      </div>
                      <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Member Since</span>
                    </div>
                    <p className="text-slate-900 font-bold">{formatDate(profile.createdAt)}</p>
                  </div>

                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <Package className="w-4 h-4 text-emerald-700" />
                      </div>
                      <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Total Orders</span>
                    </div>
                    <p className="text-slate-900 font-bold">{orders.length > 0 ? orders.length : "—"}</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-slate-200/80 p-6 shadow-sm">
                  <h3 className="text-slate-900 font-black mb-4 text-xs uppercase tracking-wider">Quick Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => setActiveTab("orders")}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-yellow-50 border border-slate-200 hover:border-yellow-300 transition-all group"
                    >
                      <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ShoppingBag className="w-5 h-5 text-slate-900" />
                      </div>
                      <div className="text-left">
                        <p className="text-slate-900 font-bold text-sm">View Orders</p>
                        <p className="text-slate-500 text-xs font-medium">Track and manage your purchases</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 ml-auto group-hover:text-slate-900 transition-colors" />
                    </button>

                    <button
                      onClick={() => navigate("/categories")}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-yellow-50 border border-slate-200 hover:border-yellow-300 transition-all group"
                    >
                      <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ShoppingBag className="w-5 h-5 text-slate-900" />
                      </div>
                      <div className="text-left">
                        <p className="text-slate-900 font-bold text-sm">Browse Store</p>
                        <p className="text-slate-500 text-xs font-medium">Explore our sticker collection</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 ml-auto group-hover:text-slate-900 transition-colors" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "addresses" && (
              /* ===== ADDRESSES TAB ===== */
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Saved Addresses</h2>
                    <p className="text-slate-500 text-sm font-medium mt-0.5">
                      {addresses.length} address{addresses.length !== 1 ? "es" : ""} saved
                    </p>
                  </div>
                  <button
                    onClick={openAddAddress}
                    className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Address
                  </button>
                </div>

                {addresses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-white/90 rounded-3xl border border-slate-200/80 text-center p-6 shadow-sm">
                    <MapPin className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="text-slate-900 font-bold text-base">No saved addresses yet</p>
                    <p className="text-slate-500 text-sm mt-1">Add your home or work address for faster future checkout.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {addresses.map((a) => (
                      <div
                        key={a._id}
                        className={`bg-white/90 backdrop-blur-sm rounded-3xl border p-5 shadow-sm ${
                          a.isDefault ? "border-yellow-500 ring-2 ring-yellow-400/20 bg-yellow-50/40" : "border-slate-200/80"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-slate-900 font-black truncate">{a.fullName}</span>
                            {a.label && (
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                {a.label === "Home" ? "🏠 Home" : a.label === "Work" ? "💼 Work" : a.label === "Office" ? "📍 Office" : `🏷️ ${a.label}`}
                              </span>
                            )}
                          </div>
                          {a.isDefault && (
                            <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-yellow-900 bg-yellow-200 px-2 py-0.5 rounded-md border border-yellow-300">
                              <Star className="w-3 h-3 text-yellow-700" /> Default
                            </span>
                          )}
                        </div>
                        <p className="text-slate-700 text-xs leading-relaxed font-medium mt-2">
                          {a.street}, {a.city}, {a.state} - {a.pincode}
                        </p>
                        <p className="text-slate-500 text-xs mt-1 font-medium">📞 {a.phone}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5 font-bold uppercase">{a.country}</p>

                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                          {!a.isDefault && (
                            <button
                              onClick={() => handleSetDefaultAddress(a._id)}
                              className="text-xs font-bold text-yellow-700 hover:text-yellow-900 hover:underline"
                            >
                              Set default
                            </button>
                          )}
                          <button
                            onClick={() => openEditAddress(a)}
                            className="ml-auto px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(a._id)}
                            className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "orders" && (
              /* ===== ORDERS TAB ===== */
              <div className="space-y-4 animate-fadeIn">
                {/* Orders Header */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Order History</h2>
                    <p className="text-slate-500 text-sm font-medium mt-0.5">{orders.length} order{orders.length !== 1 ? "s" : ""} placed</p>
                  </div>
                  <button
                    onClick={() => fetchOrders()}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 transition-all text-slate-600 hover:text-slate-900 shadow-sm"
                    title="Refresh orders"
                  >
                    <RefreshCw className={`w-4 h-4 ${ordersLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {ordersLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-200 shadow-sm">
                    <div className="animate-spin w-10 h-10 border-[3px] border-yellow-500 border-t-transparent rounded-full mb-4" />
                    <p className="text-slate-600 text-sm tracking-widest font-black uppercase">Loading Orders...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 bg-white/90 rounded-3xl border border-slate-200/80 text-center px-8 shadow-sm">
                    <div className="w-20 h-20 bg-yellow-100 rounded-2xl flex items-center justify-center mb-6">
                      <Package className="w-10 h-10 text-yellow-700" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">No orders yet</h3>
                    <p className="text-slate-500 font-medium mb-8 max-w-sm">Your order history will appear here once you make your first purchase.</p>
                    <button
                      onClick={() => navigate("/categories")}
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 font-black py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div key={order._id} className="bg-white/90 backdrop-blur-sm rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                      {/* Order Header */}
                      <div className="px-6 py-4 flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Order</span>
                          <span className="text-slate-900 text-xs font-mono font-bold">#{order._id.slice(-8)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-600 text-xs font-bold">{formatDate(order.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Status</span>
                          <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            order.status === "SUCCESS" ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                            order.status === "PENDING" ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-red-100 text-red-800 border-red-300"
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="ml-auto flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Total:</span>
                            <span className="text-slate-900 font-black text-sm">₹{order.amount}</span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleDownloadInvoice(order._id)}
                            disabled={downloadingInvoiceId === order._id}
                            className="px-3 py-1.5 rounded-xl bg-yellow-100 hover:bg-yellow-200 text-yellow-900 border border-yellow-300 text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                            title="Download Official Tax Invoice PDF"
                          >
                            <FileText className="w-3.5 h-3.5 text-yellow-800" />
                            {downloadingInvoiceId === order._id ? "Downloading..." : "Invoice"}
                          </button>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="p-6">
                        <div className="divide-y divide-slate-100">
                          {order.items?.map((item, idx) => {
                            const badgeImg = getBadgeImage(item);
                            return (
                              <div key={idx} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                                <div className="flex items-center gap-3">
                                  {badgeImg ? (
                                    <img
                                      src={badgeImg}
                                      alt={item.title || item.name}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = "/images/STICKTOON_LONG.jpeg";
                                      }}
                                      className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center text-yellow-800 font-black text-xs">
                                      ST
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-slate-900 font-bold text-sm">{item.title || item.name || "Sticker Badge"}</p>
                                    <p className="text-slate-500 text-xs font-medium">Qty: {item.quantity} × ₹{item.price}</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleBuyAgain(item)}
                                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider transition-all"
                                >
                                  Buy Again
                                </button>
                              </div>
                            );
                          })}
                        </div>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-200 shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto text-slate-900">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-900">Edit Profile</h2>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  {editAvatar && (editAvatar.startsWith('http') || editAvatar.startsWith('data:')) ? (
                    <img src={editAvatar} alt="Profile" className="w-24 h-24 rounded-2xl object-cover ring-2 ring-yellow-500/40" />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-slate-900 flex items-center justify-center text-yellow-400 text-3xl font-black ring-2 ring-yellow-500/40">
                      {getInitial(editName)}
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer text-white"
                  >
                    <Camera className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex gap-2 mt-4">
                  {editAvatar && (editAvatar.startsWith('http') || editAvatar.startsWith('data:')) && (
                    <button onClick={handleRemoveAvatar} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold transition-colors border border-red-200">
                      Remove
                    </button>
                  )}
                  <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold transition-colors border border-slate-200">
                    Upload Photo
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-slate-900 text-xs font-black uppercase tracking-wider mb-2">Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full bg-white border-2 border-slate-300 text-slate-900 placeholder:text-slate-500 px-4 py-3 rounded-xl focus:outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-400/20 font-semibold text-sm shadow-sm"
                />
              </div>

              <div className="mb-6">
                <label className="block text-slate-900 text-xs font-black uppercase tracking-wider mb-2">Phone</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="Phone number"
                  className="w-full bg-white border-2 border-slate-300 text-slate-900 placeholder:text-slate-500 px-4 py-3 rounded-xl focus:outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-400/20 font-semibold text-sm shadow-sm"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving || !editName.trim()}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md"
              >
                {saving ? "Saving..." : "Save Changes ✓"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg my-auto shadow-2xl text-slate-900">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {editingAddressId ? "Edit Address" : "Add New Address"}
                </h3>
                <p className="text-slate-500 text-xs font-medium mt-0.5">Enter delivery address details below</p>
              </div>
              <button
                onClick={() => setShowAddressModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="p-6 space-y-4">
              <div>
                <label className="block text-slate-900 text-xs font-black uppercase tracking-wider mb-2">Address Tag</label>
                <div className="flex gap-2">
                  {["Home", "Work", "Office", "Other"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAddressForm({ ...addressForm, label: preset })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                        addressForm.label === preset
                          ? "bg-yellow-500 text-slate-900 border-yellow-500 shadow-sm"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {preset === "Home" && "🏠 "}
                      {preset === "Work" && "💼 "}
                      {preset === "Office" && "📍 "}
                      {preset === "Other" && "🏷️ "}
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                [
                  { key: "fullName", label: "Full Name", placeholder: "Name", full: false },
                  { key: "phone", label: "Phone", placeholder: "10-digit mobile number", full: false },
                  { key: "street", label: "Street Address", placeholder: "House No, Street, Landmark", full: true },
                  { key: "city", label: "City", placeholder: "City", full: false },
                  { key: "state", label: "State", placeholder: "State", full: false },
                  { key: "pincode", label: "Pincode", placeholder: "6-digit Pincode", full: false },
                  { key: "country", label: "Country", placeholder: "Country", full: false },
                ] as const
              ).map((f) => (
                <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
                  <label className="block text-slate-900 text-xs font-black uppercase tracking-wider mb-1.5">
                    {f.label}
                  </label>
                  <input
                    type="text"
                    required
                    value={(addressForm as any)[f.key]}
                    onChange={(e) =>
                      setAddressForm((prev) => ({
                        ...prev,
                        [f.key]:
                          f.key === "phone" || f.key === "pincode"
                            ? e.target.value.replace(/\D/g, "")
                            : e.target.value,
                      }))
                    }
                    placeholder={f.placeholder}
                    className="w-full bg-white border-2 border-slate-300 text-slate-900 placeholder:text-slate-500 px-4 py-3 rounded-xl focus:outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-400/20 font-semibold text-sm shadow-sm"
                  />
                </div>
              ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefaultCheck"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
                  className="w-4 h-4 accent-yellow-500 rounded"
                />
                <label htmlFor="isDefaultCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Set as default shipping address
                </label>
              </div>

              <div className="sm:col-span-2 flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
