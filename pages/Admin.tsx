import React, { useState, useEffect, useMemo, JSX } from "react";

import { useNavigate, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import { BADGES } from "../constants";
import { Eye, EyeOff, LogOut, Users, AlertCircle, Check, X, Upload, Plus, Edit2, Trash2, TrendingUp, DollarSign, CheckCircle, XCircle, Info } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";

// Super Admin Email - Only this email can edit/remove other admins
const SUPER_ADMIN_EMAIL = "sticktoon.xyz@gmail.com";

const normalizeCategory = (value?: string) => {
  if (!value) return value;
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  const map: Record<string, string> = {
    "positive vibe": "Positive Vibes",
    "positive vibes": "Positive Vibes",
    "positive-vibes": "Positive Vibes",
    "positive_vibes": "Positive Vibes",
    "moody": "Moody",
    "sports": "Sports",
    "religious": "Religious",
    "entertainment": "Entertainment",
    "events": "Events",
    "animal": "Animal",
    "couple": "Couple",
    "anime": "Anime",
    "custom": "Custom",
  };

  return map[lower] || trimmed;
};

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideOutRight {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
  
  .animate-slideInRight {
    animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }
  
  .animate-slideOutRight {
    animation: slideOutRight 0.3s ease-in;
  }

  /* Optimized Black & White Admin Theme */
  .admin-zoho {
    background-color: #f9fafb;
    color: #111827;
  }

  /* Text Color Overrides - Keep white text only on dark backgrounds */
  .admin-zoho .text-white {
    color: #111827 !important;
  }

  .admin-zoho .admin-zoho-keep-white {
    color: #ffffff !important;
  }

  /* Convert all colored text to grayscale */
  .admin-zoho .text-gray-300,
  .admin-zoho .text-gray-400,
  .admin-zoho .text-gray-500,
  .admin-zoho .text-indigo-300,
  .admin-zoho .text-indigo-200,
  .admin-zoho .text-indigo-100,
  .admin-zoho .text-indigo-400,
  .admin-zoho .text-blue-400,
  .admin-zoho .text-blue-500,
  .admin-zoho .text-purple-300,
  .admin-zoho .text-purple-400,
  .admin-zoho .text-emerald-300,
  .admin-zoho .text-emerald-400,
  .admin-zoho .text-yellow-200,
  .admin-zoho .text-yellow-300,
  .admin-zoho .text-green-300,
  .admin-zoho .text-green-400,
  .admin-zoho .text-red-300,
  .admin-zoho .text-red-400 {
    color: #6b7280 !important;
  }

  /* Background Color Overrides - Convert to white/gray */
  .admin-zoho .bg-black\/30,
  .admin-zoho .bg-black\/20,
  .admin-zoho .bg-black\/10,
  .admin-zoho .bg-white\/5,
  .admin-zoho .bg-white\/10,
  .admin-zoho .bg-white\/20,
  .admin-zoho .bg-white\/30,
  .admin-zoho .bg-white\/50 {
    background-color: #ffffff !important;
  }

  .admin-zoho .bg-indigo-500\/10,
  .admin-zoho .bg-indigo-500\/20,
  .admin-zoho .bg-indigo-500\/30,
  .admin-zoho .bg-indigo-600\/50,
  .admin-zoho .bg-purple-500\/10,
  .admin-zoho .bg-purple-500\/20,
  .admin-zoho .bg-purple-500\/30,
  .admin-zoho .bg-blue-500\/10,
  .admin-zoho .bg-blue-500\/20,
  .admin-zoho .bg-green-500\/10,
  .admin-zoho .bg-green-500\/20,
  .admin-zoho .bg-yellow-500\/10,
  .admin-zoho .bg-yellow-500\/20,
  .admin-zoho .bg-red-500\/10,
  .admin-zoho .bg-red-500\/20 {
    background-color: #f3f4f6 !important;
  }

  /* Border Color Overrides */
  .admin-zoho .border-white\/10,
  .admin-zoho .border-white\/20,
  .admin-zoho .border-white\/30,
  .admin-zoho .border-white\/50 {
    border-color: #e5e7eb !important;
  }

  .admin-zoho .border-indigo-500\/20,
  .admin-zoho .border-indigo-500\/30,
  .admin-zoho .border-indigo-500\/40,
  .admin-zoho .border-indigo-500\/50,
  .admin-zoho .border-purple-500\/20,
  .admin-zoho .border-purple-500\/30,
  .admin-zoho .border-red-500\/20,
  .admin-zoho .border-red-500\/30,
  .admin-zoho .border-red-500\/50,
  .admin-zoho .border-yellow-500\/20,
  .admin-zoho .border-yellow-500\/30,
  .admin-zoho .border-green-400\/30,
  .admin-zoho .border-green-400\/50,
  .admin-zoho .border-blue-400\/50 {
    border-color: #d1d5db !important;
  }

  /* Remove Gradients - Convert to Solid White */
  .admin-zoho .bg-gradient-to-br,
  .admin-zoho .bg-gradient-to-r,
  .admin-zoho .bg-gradient-to-l,
  .admin-zoho .bg-gradient-to-t,
  .admin-zoho .bg-gradient-to-b {
    background-image: none !important;
    background-color: #ffffff !important;
  }

  /* Card Background */
  .admin-zoho .rounded-3xl,
  .admin-zoho .rounded-2xl,
  .admin-zoho .rounded-xl {
    background-color: #ffffff !important;
  }

  .admin-zoho .bg-slate-50 {
    background-color: #f9fafb !important;
  }

  /* Remove Blur Effects */
  .admin-zoho .backdrop-blur-sm,
  .admin-zoho .backdrop-blur-md,
  .admin-zoho .backdrop-blur-xl,
  .admin-zoho .backdrop-blur-2xl {
    backdrop-filter: none !important;
  }

  /* Button Styling */
  .admin-zoho button {
    color: #111827 !important;
  }

  .admin-zoho button.bg-slate-900,
  .admin-zoho button.bg-slate-800,
  .admin-zoho button.bg-black,
  .admin-zoho button.bg-gray-900,
  .admin-zoho button.bg-gray-800 {
    background-color: #111827 !important;
    color: #ffffff !important;
    border-color: #111827 !important;
  }

  .admin-zoho button.bg-white,
  .admin-zoho button.bg-slate-100,
  .admin-zoho button.bg-gray-100 {
    background-color: #ffffff !important;
    color: #111827 !important;
    border-color: #e5e7eb !important;
  }

  /* Remove Gradient Buttons */
  .admin-zoho button[class*="bg-gradient"] {
    background-image: none !important;
    background-color: #111827 !important;
    color: #ffffff !important;
  }

  .admin-zoho button:hover {
    filter: brightness(0.95) !important;
  }

  /* Form Elements */
  .admin-zoho input,
  .admin-zoho textarea,
  .admin-zoho select {
    background-color: #ffffff !important;
    color: #111827 !important;
    border-color: #d1d5db !important;
  }

  .admin-zoho input::placeholder,
  .admin-zoho textarea::placeholder {
    color: #9ca3af !important;
  }

  .admin-zoho input:focus,
  .admin-zoho textarea:focus,
  .admin-zoho select:focus {
    border-color: #111827 !important;
    ring-color: #111827 !important;
  }

  /* Shadows - Subtle and Clean */
  .admin-zoho .shadow-2xl,
  .admin-zoho .shadow-xl,
  .admin-zoho .shadow-lg,
  .admin-zoho .shadow-md {
    box-shadow: 0 4px 16px rgba(17, 24, 39, 0.08) !important;
  }

  /* Table Styling */
  .admin-zoho table {
    background-color: #ffffff !important;
  }

  .admin-zoho table thead tr {
    background-color: #f9fafb !important;
    border-bottom: 2px solid #e5e7eb !important;
  }

  .admin-zoho table td,
  .admin-zoho table th {
    color: #111827 !important;
    border-color: #e5e7eb !important;
  }

  .admin-zoho table tbody tr:hover {
    background-color: #f9fafb !important;
  }

  /* Text and Special Elements */
  .admin-zoho .text-slate-500,
  .admin-zoho .text-slate-600,
  .admin-zoho .text-slate-700 {
    color: #6b7280 !important;
  }

  .admin-zoho .text-transparent {
    color: #111827 !important;
    -webkit-text-fill-color: #111827 !important;
  }

  /* Modal Backgrounds */
  .admin-zoho .bg-black\/60 {
    background-color: rgba(17, 24, 39, 0.6) !important;
  }

  /* Status Indicators - Keep Minimal Color for Clarity */
  .admin-zoho .text-green-400,
  .admin-zoho .text-green-500,
  .admin-zoho .text-green-600 {
    color: #16a34a !important;
  }

  .admin-zoho .text-red-400,
  .admin-zoho .text-red-500,
  .admin-zoho .text-red-600 {
    color: #dc2626 !important;
  }

  .admin-zoho .text-yellow-400,
  .admin-zoho .text-yellow-500,
  .admin-zoho .text-yellow-600 {
    color: #ca8a04 !important;
  }

  /* Clean Card Hover Effect */
  .admin-zoho .group:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(17, 24, 39, 0.12) !important;
  }
`;
document.head.appendChild(style);

/* ===========================
   TYPES
=========================== */
interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "influencer";
}

interface PendingInfluencer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  instagram?: string;
  youtube?: string;
  bio?: string;
  createdAt: string;
}

interface WithdrawalRequest {
  _id: string;
  influencerId: { _id: string; name: string; email: string };
  amount: number;
  paymentMethod: string;
  status: "pending" | "approved" | "rejected" | "paid";
  createdAt: string;
}

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: "Positive Vibes" | "Moody" | "Sports" | "Religious" | "Entertainment" | "Events" | "Animal" | "Couple" | "Anime" | "Custom";
  image: string;
  stock: number;
  createdAt: string;
  isPlaceholder?: boolean;
}

const ADMIN_PRODUCT_CATEGORIES = ["Positive Vibes", "Moody", "Sports", "Religious", "Entertainment", "Events", "Animal", "Couple", "Anime", "Custom"] as const;
type AdminProductCategory = (typeof ADMIN_PRODUCT_CATEGORIES)[number];

const ensureMinimumProductsPerCategory = (items: Product[], minCount = 4): Product[] => {
  const result: Product[] = [...items];

  ADMIN_PRODUCT_CATEGORIES.forEach((category) => {
    const current = result.filter((p) => p.category === category);
    if (current.length >= minCount) return;

    const fallbackBadges = BADGES.filter((b) => b.category === category);
    const needed = minCount - current.length;
    const existingNames = new Set(current.map((p) => p.name));
    const toAdd = fallbackBadges
      .filter((b) => !existingNames.has(b.name))
      .slice(0, needed)
      .map((b, index) => ({
        _id: `placeholder-${category}-${b.id}-${index}`,
        name: b.name,
        description: b.details || "",
        price: b.price,
        category: category as AdminProductCategory,
        image: b.image,
        stock: 0,
        createdAt: "1970-01-01T00:00:00.000Z",
        isPlaceholder: true,
      }));

    if (toAdd.length === 0 && current.length < minCount) {
      const fillerNeeded = minCount - current.length;
      for (let i = 0; i < fillerNeeded; i += 1) {
        result.push({
          _id: `placeholder-${category}-generic-${i}`,
          name: `${category} Badge`,
          description: "",
          price: 0,
          category: category as AdminProductCategory,
          image: "/badge/placeholder.png",
          stock: 0,
          createdAt: "1970-01-01T00:00:00.000Z",
          isPlaceholder: true,
        });
      }
      return;
    }

    result.push(...toAdd);
  });

  return result;
};

const hasValidImage = (image?: string) => {
  if (!image) return false;
  const trimmed = image.trim();
  if (!trimmed) return false;
  if (trimmed === "undefined" || trimmed === "null") return false;
  return true;
};

interface Toast {
  id: number;
  type: "success" | "error" | "info" | "warning";
  message: string;
  isExiting?: boolean;
}

/* ===========================
   MAIN COMPONENT
=========================== */
const Admin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
const [currentView, setCurrentView] = useState<
  "login" | "dashboard" | "leads" | "users" | "all-influencers" | "influencers" | "withdrawals" | "products" | "orders" | "profile"
>("login");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  // Data states
  const [pendingInfluencers, setPendingInfluencers] = useState<PendingInfluencer[]>([]);
  const [allInfluencers, setAllInfluencers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const productsForDisplay = ensureMinimumProductsPerCategory(products);
  
// 🔍 CRM FILTER STATE
const [search, setSearch] = useState("");

const [showUsers, setShowUsers] = useState(true);
const [showAdmins, setShowAdmins] = useState(true);
const [showInfluencers, setShowInfluencers] = useState(true);

const [showCredentials, setShowCredentials] = useState(true);
const [showGoogle, setShowGoogle] = useState(true);

const [fromDate, setFromDate] = useState("");
const [toDate, setToDate] = useState("");

const [order, setOrder] = useState<"asc" | "desc">("desc");
// 🔍 INFLUENCER CRM FILTER STATE
const [showApprovedInf, setShowApprovedInf] = useState(true);
const [showPendingInf, setShowPendingInf] = useState(true);

// 📅 date filter (same as users)
const [infFromDate, setInfFromDate] = useState("");
const [infToDate, setInfToDate] = useState("");


const [infSort, setInfSort] = useState<"desc" | "asc">("desc"); // desc = newe

// 🛒 ORDERS FILTER STATE
const [orderStatusFilter, setOrderStatusFilter] = useState<string[]>([]);
const [orderFromDate, setOrderFromDate] = useState("");
const [orderToDate, setOrderToDate] = useState("");
const [orderSort, setOrderSort] = useState<"desc" | "asc">("desc"); // desc = newest


type Lead = {
  _id?: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  mobile?: string;
  title?: string;
  industry?: string;
  leadSource?: string;
  status?: string;
  createdAt?: string;
};

const [leads, setLeads] = useState<Lead[]>([]);
const [showCreateLead, setShowCreateLead] = useState(false);
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
const deleteLead = async () => {
  if (!leadToDelete?._id) return;

  const token = localStorage.getItem("adminToken");
  if (!token) return;

  try {
    await fetch(`${API_BASE_URL}/api/admin/leads/${leadToDelete._id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    setLeads((prev) =>
      prev.filter((l) => l._id !== leadToDelete._id)
    );

    setShowDeleteModal(false);
    setLeadToDelete(null);

  } catch (err) {
    console.error("Delete lead error:", err);
  }
};

const [newLead, setNewLead] = useState<Lead>({
  firstName: "",
  lastName: "",
  company: "",
  email: "",
  phone: "",
  mobile: "",
  title: "",
  industry: "",
  leadSource: "",
  status: "New"
});


const createLead = async () => {
  if (isSubmittingLead) return;   // 🚀 prevent double click
  setIsSubmittingLead(true);

  try {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    const res = await fetch(`${API_BASE_URL}/api/admin/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newLead),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to create lead");
    }

    const savedLead = await res.json();

    // update UI from DB response
    setLeads((prev) => [savedLead, ...prev]);

    setShowCreateLead(false);

    // reset form
  setNewLead({
  firstName: "",
  lastName: "",
  company: "",
  email: "",
  phone: "",
  status: "New"
});


  } catch (error) {
    console.error("Create lead error:", error);
  } finally {
    setIsSubmittingLead(false);  // 🔥 always unlock button
  }
};

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");



// ===============================
// FILTERED USERS
// ===============================
const filteredUsers = useMemo(() => {
  let list = [...allUsers];

  // SEARCH
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    );
  }

  // ROLE FILTER
  list = list.filter((u) => {
    if (u.role === "user" && !showUsers) return false;
    if (u.role === "admin" && !showAdmins) return false;
    if (u.role === "influencer" && !showInfluencers) return false;
    return true;
  });

  // PROVIDER FILTER
  list = list.filter((u) => {
    const provider = u.provider || "credentials";
    if (provider === "google" && !showGoogle) return false;
    if (provider === "credentials" && !showCredentials) return false;
    return true;
  });

  // DATE FILTER
  list = list.filter((u) => {
    const t = new Date(u.createdAt).getTime();

    if (fromDate) {
      const from = new Date(fromDate).setHours(0, 0, 0, 0);
      if (t < from) return false;
    }

    if (toDate) {
      const to = new Date(toDate).setHours(23, 59, 59, 999);
      if (t > to) return false;
    }

    return true;
  });

  // SORT (Newest / Oldest)
  list.sort((a, b) => {
    const da = new Date(a.createdAt).getTime();
    const db = new Date(b.createdAt).getTime();
    return order === "asc" ? da - db : db - da;
  });

  return list;
}, [
  allUsers,
  search,
  showUsers,
  showAdmins,
  showInfluencers,
  showCredentials,
  showGoogle,
  fromDate,
  toDate,
  order,
]);


// ===============================
// FILTERED INFLUENCERS
// ===============================
const filteredInfluencers = useMemo(() => {
  let list = [...allInfluencers];

  // STATUS FILTER
  list = list.filter((inf) => {
    const approved = inf.influencerProfile?.isApproved;
    if (!showApprovedInf && approved) return false;
    if (!showPendingInf && !approved) return false;
    return true;
  });

  // DATE FILTER (same logic as users)
  list = list.filter((inf) => {
    const t = new Date(inf.createdAt).getTime();

    if (infFromDate) {
      const from = new Date(infFromDate).setHours(0, 0, 0, 0);
      if (t < from) return false;
    }

    if (infToDate) {
      const to = new Date(infToDate).setHours(23, 59, 59, 999);
      if (t > to) return false;
    }

    return true;
  });

  // SORT (Newest / Oldest)
  list.sort((a, b) => {
    const da = new Date(a.createdAt).getTime();
    const db = new Date(b.createdAt).getTime();
    return infSort === "asc" ? da - db : db - da;
  });

  return list;
}, [
  allInfluencers,
  showApprovedInf,
  showPendingInf,
  infFromDate,
  infToDate,
  infSort,
]);


// ===============================
// FILTERED ORDERS
// ===============================
const filteredOrders = useMemo(() => {
  let list = [...orders];

  // PAYMENT STATUS FILTER
  if (orderStatusFilter.length) {
    list = list.filter((o) =>
      orderStatusFilter.includes(o.status)
    );
  }

  // DATE FILTER
  list = list.filter((o) => {
    const t = new Date(o.createdAt).getTime();

    if (orderFromDate) {
      const from = new Date(orderFromDate).setHours(0, 0, 0, 0);
      if (t < from) return false;
    }

    if (orderToDate) {
      const to = new Date(orderToDate).setHours(23, 59, 59, 999);
      if (t > to) return false;
    }

    return true;
  });

  // SORT (Newest / Oldest)
  list.sort((a, b) => {
    const da = new Date(a.createdAt).getTime();
    const db = new Date(b.createdAt).getTime();
    return orderSort === "asc" ? da - db : db - da;
  });

  return list;
}, [orders, orderStatusFilter, orderFromDate, orderToDate, orderSort]);



// 🔍 LEADS FILTER STATE
const [leadSearch, setLeadSearch] = useState("");
const [leadStatusFilter, setLeadStatusFilter] = useState<string[]>([]);
const [leadSort, setLeadSort] = useState<"asc" | "desc">("desc");


// ===============================
// FILTERED LEADS
// ===============================
const filteredLeads = useMemo(() => {
  let list = [...leads];

  // SEARCH
  if (leadSearch) {
    const q = leadSearch.toLowerCase();
    list = list.filter(
      (l) =>
        l.firstName?.toLowerCase().includes(q) ||
        l.lastName?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q)
    );
  }

  // STATUS FILTER
  if (leadStatusFilter.length) {
    list = list.filter((l) =>
      leadStatusFilter.includes(l.status || "New")
    );
  }

  // SORT
  list.sort((a, b) => {
    const da = new Date(a.createdAt || "").getTime();
    const db = new Date(b.createdAt || "").getTime();
    return leadSort === "asc" ? da - db : db - da;
  });

  return list;
}, [leads, leadSearch, leadStatusFilter, leadSort]);


  // Track what data has been loaded to avoid unnecessary fetches
  const [loadedData, setLoadedData] = useState({
    users: false,
    allInfluencers: false,
    pendingInfluencers: false,
    withdrawals: false,
    products: false,
    orders: false,
  });
  
  // Track loading states for each view
  const [loadingData, setLoadingData] = useState({
    users: false,
    allInfluencers: false,
    withdrawals: false,
    products: false,
    orders: false,
  });

  // Modal states
  const [editingUser, setEditingUser] = useState<any>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [resettingPassword, setResettingPassword] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [stats, setStats] = useState({ 
    totalInfluencers: 0, 
    pendingApprovals: 0, 
    pendingWithdrawals: { total: 0, count: 0 } 
  });

  // Product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [confirmingDeleteProduct, setConfirmingDeleteProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: 0,
    category: "Moody" as "Positive Vibes" | "Moody" | "Sports" | "Religious" | "Entertainment" | "Events" | "Animal" | "Couple" | "Anime" | "Custom",
    image: "",
    stock: 0,
  });


  const [isSubmittingLead, setIsSubmittingLead] = useState(false);


  // Toast notification state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastIdCounter, setToastIdCounter] = useState(0);

  // Profile edit state
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    avatar: "",
    currentPassword: "",
    newPassword: "",
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Check if current user is super admin
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  /* ===========================
     EFFECTS
  =========================== */
  useEffect(() => {
    checkAuth();
  }, []);

  // Sync profile form with user data
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        email: user.email || "",
        avatar: (user as any).avatar || "",
        currentPassword: "",
        newPassword: "",
      });
    }
  }, [user]);

  // Handle URL parameters for navigation
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    const category = params.get('category');
    
    if (isAuthenticated && view === 'products') {
      setCurrentView('products');
      setShowProductForm(true);
      
      if (category) {
        setProductForm({
          ...productForm,
          category: normalizeCategory(category) as 'Positive Vibes' | 'Moody' | 'Sports' | 'Religious' | 'Entertainment' | 'Events' | 'Animal' | 'Couple' | 'Anime' | 'Custom'
        });
      }
    }
  }, [location.search, isAuthenticated]);

  // Lazy load data when view changes
  useEffect(() => {
    if (!isAuthenticated) return;

    switch (currentView) {
      case 'users':
        fetchUsersData();
        break;
      case 'all-influencers':
        fetchAllInfluencersData();
        break;
      case 'withdrawals':
        fetchWithdrawalsData();
        break;
      case 'orders':
        fetchOrdersData();
        break;
      case 'products':
        fetchProductsData();
        break;
      case 'leads':
        fetchLeadsData();
        break;

    }
  }, [currentView, isAuthenticated]);

  // Toast notification functions
  const showToast = (type: "success" | "error" | "info" | "warning", message: string) => {
    const id = toastIdCounter;
    setToastIdCounter(id + 1);
    
    const newToast: Toast = { id, type, message };
    setToasts((prev) => [...prev, newToast]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => 
        prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 5000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => 
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  };

  const checkAuth = () => {
    const token = localStorage.getItem("adminToken");
    const storedUser = localStorage.getItem("adminUser");

    if (token && storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setIsAuthenticated(true);
      setUser(parsedUser);
      setCurrentView("dashboard");
      fetchDashboardData(token);
    } else {
      setIsAuthenticated(false);
      setCurrentView("login");
      // Show authentication required toast
      setTimeout(() => {
        showToast("info", "🔐 Please login to access admin panel");
      }, 100);
    }
  };

  const fetchDashboardData = async (token: string) => {
    try {
      // Fetch stats (always needed for dashboard)
      const statsRes = await fetch(`${API_BASE_URL}/api/admin/influencer-manage/stats/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      // Only fetch pending influencers for initial dashboard view
      const influencersRes = await fetch(`${API_BASE_URL}/api/admin/influencer-manage/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (influencersRes.ok) {
        const data = await influencersRes.json();
        setPendingInfluencers(data);
        setLoadedData(prev => ({ ...prev, pendingInfluencers: true }));
      }
    } catch (err) {
      console.error("Fetch data error:", err);
    }
  };

  // Lazy load data only when user navigates to that view
  const fetchUsersData = async () => {
    if (loadedData.users) return; // Already loaded
    
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setLoadingData(prev => ({ ...prev, users: true }));
    try {
      const usersRes = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (usersRes.ok) {
        const data = await usersRes.json();
        setAllUsers(data);
        setLoadedData(prev => ({ ...prev, users: true }));
      }
    } catch (err) {
      console.error("Fetch users error:", err);
    } finally {
      setLoadingData(prev => ({ ...prev, users: false }));
    }
  };

  const fetchAllInfluencersData = async () => {
    if (loadedData.allInfluencers) return; // Already loaded
    
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setLoadingData(prev => ({ ...prev, allInfluencers: true }));
    try {
      const allInfluencersRes = await fetch(`${API_BASE_URL}/api/admin/influencer-manage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (allInfluencersRes.ok) {
        const data = await allInfluencersRes.json();
        setAllInfluencers(data);
        setLoadedData(prev => ({ ...prev, allInfluencers: true }));
      }
    } catch (err) {
      console.error("Fetch all influencers error:", err);
    } finally {
      setLoadingData(prev => ({ ...prev, allInfluencers: false }));
    }
  };

  const fetchWithdrawalsData = async () => {
    if (loadedData.withdrawals) return; // Already loaded
    
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setLoadingData(prev => ({ ...prev, withdrawals: true }));
    try {
      const withdrawalsRes = await fetch(`${API_BASE_URL}/api/admin/influencer-manage/withdrawals/all?status=pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (withdrawalsRes.ok) {
        const data = await withdrawalsRes.json();
        setWithdrawals(data);
        setLoadedData(prev => ({ ...prev, withdrawals: true }));
      }
    } catch (err) {
      console.error("Fetch withdrawals error:", err);
    } finally {
      setLoadingData(prev => ({ ...prev, withdrawals: false }));
    }
  };

  const fetchOrdersData = async () => {
    if (loadedData.orders) return; // Already loaded
    
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setLoadingData(prev => ({ ...prev, orders: true }));
    try {
      const ordersRes = await fetch(`${API_BASE_URL}/api/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data);
        setLoadedData(prev => ({ ...prev, orders: true }));
      }
    } catch (err) {
      console.error("Fetch orders error:", err);
    } finally {
      setLoadingData(prev => ({ ...prev, orders: false }));
    }
  };

  const fetchProductsData = async () => {
    if (loadedData.products) return; // Already loaded

    setLoadingData(prev => ({ ...prev, products: true }));
    try {
      const productsRes = await fetch(`${API_BASE_URL}/api/products`);
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products);
        setLoadedData(prev => ({ ...prev, products: true }));
      }
    } catch (err) {
      console.error("Fetch products error:", err);
    } finally {
      setLoadingData(prev => ({ ...prev, products: false }));
    }
  };

  

  /* ===========================
     AUTH HANDLERS
  =========================== */
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Check if user is admin
      if (data.user.role !== "admin") {
        throw new Error("Only admins can access this panel");
      }

      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminUser", JSON.stringify(data.user));

      setIsAuthenticated(true);
      setUser(data.user);
      setCurrentView("dashboard");
      await fetchDashboardData(data.token);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    setIsAuthenticated(false);
    setUser(null);
    setCurrentView("login");
  };

  /* ===========================
     GOOGLE LOGIN
  =========================== */
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsGoogleLoading(true);
        setError("");

        const res = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          }
        );

        const googleUser = await res.json();

        const backendRes = await fetch(
          `${API_BASE_URL}/api/admin/google-login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: googleUser.name,
              email: googleUser.email,
              avatar: googleUser.picture,
            }),
          }
        );

        const data = await backendRes.json();

        if (!backendRes.ok) {
          setError(data.message || "Google login failed");
          return;
        }

        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("adminUser", JSON.stringify(data.user));

        setIsAuthenticated(true);
        setUser(data.user);
        setCurrentView("dashboard");
        await fetchDashboardData(data.token);
      } catch {
        setError("Google login failed");
      } finally {
        setIsGoogleLoading(false);
      }
    },
  });

  /* ===========================
     UPDATE PROFILE
  =========================== */
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setError("");

    try {
      const token = localStorage.getItem("adminToken");
      if (!token) return;

      const updateData: any = {
        name: profileForm.name,
        avatar: profileForm.avatar,
        email: profileForm.email,
      };

      // Only include password fields if new password is provided
      if (profileForm.newPassword) {
        if (profileForm.newPassword.length < 6) {
          setError("New password must be at least 6 characters");
          setUpdatingProfile(false);
          return;
        }
        updateData.currentPassword = profileForm.currentPassword;
        updateData.newPassword = profileForm.newPassword;
      }

      const res = await fetch(`${API_BASE_URL}/api/admin/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Update failed");
      }

      // Update local user data
      setUser(data.user);
      localStorage.setItem("adminUser", JSON.stringify(data.user));

      // Reset password fields
      setProfileForm({
        ...profileForm,
        currentPassword: "",
        newPassword: "",
      });

      showToast("success", "Profile updated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setUpdatingProfile(false);
    }
  };

  /* ===========================
     INFLUENCER APPROVAL
  =========================== */
  const handleApproveInfluencer = async (influencerId: string, approve: boolean) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const endpoint = approve
        ? `/api/admin/influencer-manage/${influencerId}/approve`
        : `/api/admin/influencer-manage/${influencerId}/reject`;

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        // Refresh data - only update pending list and stats
        setPendingInfluencers(pendingInfluencers.filter((inf) => inf._id !== influencerId));
        
        // Refresh stats only (not all data)
        const statsRes = await fetch(`${API_BASE_URL}/api/admin/influencer-manage/stats/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }
        
        // Mark all influencers as needing refresh if that view is active
        if (loadedData.allInfluencers) {
          setLoadedData(prev => ({ ...prev, allInfluencers: false }));
        }
      }
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const openGmail = (email: string, name: string) => {
  const subject = encodeURIComponent("Regarding Your StickToon Account");
  const body = encodeURIComponent(
    `Hi ${name},\n\nWe wanted to connect with you regarding your StickToon account.\n\nRegards,\nStickToon Team`
  );

  const gmailURL = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`;

  window.open(gmailURL, "_blank");
};


  /* ===========================
     WITHDRAWAL APPROVAL
  =========================== */
  const handleProcessWithdrawal = async (withdrawalId: string, status: "approved" | "paid" | "rejected", transactionId?: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/influencer-manage/withdrawals/${withdrawalId}/process`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, transactionId }),
      });

      if (res.ok) {
        // Refresh - only update withdrawal list and stats
        setWithdrawals(withdrawals.filter((w) => w._id !== withdrawalId));
        
        // Refresh stats only (not all data)
        const statsRes = await fetch(`${API_BASE_URL}/api/admin/influencer-manage/stats/overview`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }
      }
    } catch (err) {
      console.error("Error:", err);
    }
  };

  /* ===========================
     USER MANAGEMENT
  =========================== */
  const handleDeleteUser = async (userId: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    // Check if trying to delete admin without super admin privileges
    const targetUser = allUsers.find(u => u._id === userId);
    if (targetUser?.role === 'admin' && user?.email !== SUPER_ADMIN_EMAIL) {
      showToast("error", "🔒 Only super admin can delete other admins");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setAllUsers(allUsers.filter((u) => u._id !== userId));
        setConfirmingDelete(null);
      }
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  };

  const handleUpdateUser = async (userId: string, updates: { name?: string; email?: string; password?: string; avatar?: string }) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    const targetUser = allUsers.find(u => u._id === userId);
    
    try {
      let endpoint = `${API_BASE_URL}/api/admin/users/${userId}`;
      
      // Super admin can use the full edit endpoint if changing password or avatar
      if ((updates.password || updates.avatar) && isSuperAdmin) {
        endpoint = `${API_BASE_URL}/api/admin/users/${userId}/super-edit`;
      } else if (targetUser?.role === 'admin' && !isSuperAdmin) {
        showToast("error", "🔒 Only super admin can update other admins");
        return;
      }

      const res = await fetch(endpoint, {
        method: endpoint.includes('/super-edit') ? "PUT" : "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        setAllUsers(allUsers.map((u) => (u._id === userId ? data.user : u)));
        setEditingUser(null);
        showToast("success", "✅ User updated successfully!");
      } else {
        const error = await res.json();
        showToast("error", error.message || "Failed to update user");
      }
    } catch (err) {
      console.error("Error updating user:", err);
      showToast("error", "❌ Error updating user");
    }
  };

  const handleResetPassword = async (userId: string, newPassword: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    // Check if trying to reset password without super admin privileges
    if (user?.email !== SUPER_ADMIN_EMAIL) {
      showToast("error", "🔒 Only super admin can reset passwords");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/reset-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast("success", "✅ Password reset successfully!");
        setResettingPassword(null);
        setNewPassword("");
      } else {
        showToast("error", `❌ ${data.message || "Failed to reset password"}`);
      }
    } catch (err) {
      console.error("Error resetting password:", err);
      showToast("error", "❌ Error resetting password. Please try again.");
    }
  };

  const fetchLeadsData = async () => {
  const token = localStorage.getItem("adminToken");
  if (!token) return;

  try {
    console.log("API URL:", API_BASE_URL);

    const res = await fetch(`${API_BASE_URL}/api/admin/leads`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setLeads(data);
    }
  } catch (err) {
    console.error("Fetch leads error:", err);
  }
};


  const handleUpdateRole = async (userId: string, role: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    // Check if trying to modify admin without super admin privileges
    const targetUser = allUsers.find(u => u._id === userId);
    if (targetUser?.role === 'admin' && user?.email !== SUPER_ADMIN_EMAIL) {
      showToast("error", "🔒 Only super admin can modify other admins");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });

      if (res.ok) {
        const data = await res.json();
        setAllUsers(allUsers.map((u) => (u._id === userId ? data.user : u)));
      }
    } catch (err) {
      console.error("Error updating role:", err);
    }
  };

  

  /* ===========================
     PRODUCT HANDLERS
  =========================== */
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    const payload = {
      ...productForm,
      category: normalizeCategory(productForm.category),
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("New product created:", data);
        setProducts([...products, data]);
        setProductForm({ name: "", description: "", price: 0, category: "Moody", image: "", stock: 0 });
        setShowProductForm(false);
        showToast("success", "✅ Product added successfully!");
      } else {
        const errorData = await res.json();
        console.error("Add failed:", errorData);
        showToast("error", `❌ ${errorData.error || "Failed to add product"}`);
      }
    } catch (err) {
      console.error("Error adding product:", err);
      showToast("error", "❌ Error adding product. Please try again.");
    }
  };

  const handleUpdateProduct = async (productId: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    const payload = {
      ...productForm,
      category: normalizeCategory(productForm.category),
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("✅ Updated product response:", data);
        
        // Update products state using functional update to ensure latest state
        setProducts((prevProducts) => 
          prevProducts.map((p) => (p._id === productId ? data : p))
        );
        
        setEditingProduct(null);
        setProductForm({ name: "", description: "", price: 0, category: "Moody", image: "", stock: 0 });
        showToast("success", "✅ Product updated successfully!");
      } else {
        const errorData = await res.json();
        console.error("Update failed:", errorData);
        showToast("error", `❌ ${errorData.error || "Failed to update product"}`);
      }
    } catch (err) {
      console.error("Error updating product:", err);
      showToast("error", "❌ Error updating product. Please try again.");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        console.log("Product deleted:", productId);
        setProducts(products.filter((p) => p._id !== productId));
        setConfirmingDeleteProduct(null);
        showToast("success", "✅ Product deleted successfully!");
      } else {
        const errorData = await res.json();
        console.error("Delete failed:", errorData);
        showToast("error", `❌ ${errorData.error || "Failed to delete product"}`);
      }
    } catch (err) {
      console.error("Error deleting product:", err);
      showToast("error", "❌ Error deleting product. Please try again.");
    }
  };

  /* ===========================
     RENDER LOGIN
  =========================== */
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 md:px-6 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-20 h-20 bg-indigo-600 rounded-full border-4 border-black shadow-[4px_4px_0px_#000] animate-bounce opacity-60" style={{ animationDelay: '0s', animationDuration: '3s' }}></div>
          <div className="absolute top-40 right-20 w-16 h-16 bg-purple-600 rounded-full border-4 border-black shadow-[4px_4px_0px_#000] animate-bounce opacity-60" style={{ animationDelay: '0.5s', animationDuration: '3.5s' }}></div>
        </div>

        <div className="relative max-w-sm w-full">
          <div className="bg-white rounded-3xl px-6 py-8 border-4 border-black shadow-[8px_8px_0px_#000] relative">
            <div className="absolute -top-4 -right-4 w-10 h-10 bg-indigo-600 rounded-full border-4 border-black flex items-center justify-center text-lg shadow-[3px_3px_0px_#000]">⚙️</div>
            <div className="absolute -bottom-4 -left-4 w-10 h-10 bg-purple-600 rounded-full border-4 border-black flex items-center justify-center text-lg shadow-[3px_3px_0px_#000]">🔐</div>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-black tracking-tight" style={{ WebkitTextStroke: '1px #6366F1' }}>
                Admin Portal
              </h2>
              <p className="text-black mt-1 text-sm font-medium">Full Website Access 🛡️</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-100 border-2 border-red-500 rounded-xl mb-4">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm font-bold text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-black mb-1.5">Email 📧</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white border-3 border-black focus:border-indigo-600 focus:outline-none transition-all text-black font-medium placeholder:text-indigo-400 shadow-[3px_3px_0px_#4F46E5]"
                  placeholder="admin@sticktoon.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-1.5">Password 🔐</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-white border-3 border-black focus:border-indigo-600 focus:outline-none transition-all text-black font-medium placeholder:text-indigo-400 shadow-[3px_3px_0px_#4F46E5]"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-indigo-600 hover:bg-black text-white rounded-xl font-black text-sm uppercase tracking-wide disabled:opacity-50 border-3 border-black shadow-[4px_4px_0px_#6366F1] hover:shadow-[2px_2px_0px_#6366F1] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                {loading ? "Signing in... ⏳" : "Admin Login 🔐"}
              </button>
            </form>

            {/* Divider */}
            <div className="my-4 flex items-center gap-3">
              <div className="flex-1 h-0.5 bg-indigo-500/20 rounded"></div>
              <span className="text-xs font-bold text-black uppercase tracking-wider px-2 py-1 bg-white rounded-lg border border-indigo-500/20">or</span>
              <div className="flex-1 h-0.5 bg-indigo-500/20 rounded"></div>
            </div>

            {/* Google Button */}
            <button
              type="button"
              onClick={() => googleLogin()}
              disabled={isGoogleLoading}
              className="w-full py-3 bg-white border-3 border-black hover:border-indigo-600 rounded-xl text-sm font-bold text-black flex items-center justify-center gap-3 hover:shadow-[4px_4px_0px_#6366F1] transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isGoogleLoading ? "Connecting..." : "Continue with Google"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ===========================
     RENDER DASHBOARD
  =========================== */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 admin-zoho flex">
      {/* Left Sidebar Navigation */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 h-screen sticky top-0 overflow-y-auto">
        <div className="p-6">
          <div className="mb-8">
            <h1 className="text-xl font-black text-white admin-zoho-keep-white">🛡️ StickToon</h1>
            <span className="inline-block mt-2 px-3 py-1 bg-white text-slate-950 rounded-full text-xs font-bold">ADMIN MODE</span>
          </div>
          
          <nav className="space-y-2">
            {[
              { id: "dashboard", label: "Dashboard", icon: "📊" },
              { id: "leads", label: "Leads", icon: "📋" },

              { id: "users", label: "All Users", icon: "👥" },
              { id: "all-influencers", label: "All Influencers", icon: "🌟" },
              { id: "influencers", label: "Pending Approvals", icon: "⭐" },
              { id: "withdrawals", label: "Withdrawals", icon: "💰" },
              { id: "orders", label: "Orders", icon: "🛒" },
              { id: "products", label: "Products", icon: "📦" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all text-left ${
                  currentView === tab.id
                    ? "bg-white text-slate-950 shadow-lg"
                    : "text-white admin-zoho-keep-white hover:bg-slate-800"
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="text-base">{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-8 pt-6 border-t border-slate-700 space-y-2">
            <button
              onClick={() => setCurrentView("profile")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all text-left text-white admin-zoho-keep-white hover:bg-slate-800"
            >
              <Edit2 className="w-5 h-5" />
              <span className="text-base">Edit Profile</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all text-left text-red-400 hover:bg-red-950/50 hover:text-red-300"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-base">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900">
                {currentView === "dashboard" && "Dashboard"}
                {currentView === "leads" && "Leads"}
                {currentView === "users" && "All Users"}
                {currentView === "all-influencers" && "All Influencers"}
                {currentView === "influencers" && "Pending Approvals"}
                {currentView === "withdrawals" && "Withdrawals"}
                {currentView === "orders" && "Orders"}
                {currentView === "products" && "Products"}
                {currentView === "profile" && "Edit Profile"}
              </h2>
            </div>
            <div className="text-sm text-slate-500">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {/* DASHBOARD VIEW */}
          {currentView === "dashboard" && (
          <div className="space-y-6">{/* Key Metrics Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* LEADS VIEW */}


              {/* Total Users */}
              <button 
                onClick={() => setCurrentView("users")}
                className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-lg transition-all hover:border-gray-400 cursor-pointer text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-white admin-zoho-keep-white" />
                  </div>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">+12%</span>
                </div>
                <p className="text-gray-600 text-xs font-bold uppercase mb-1">Total Users</p>
                <p className="text-3xl font-black text-gray-900">{allUsers.length}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Active accounts</p>
              </button>

              {/* Total Influencers */}
              <button 
                onClick={() => setCurrentView("all-influencers")}
                className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-lg transition-all hover:border-gray-400 cursor-pointer text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white admin-zoho-keep-white" />
                  </div>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">+8%</span>
                </div>
                <p className="text-gray-600 text-xs font-bold uppercase mb-1">Influencers</p>
                <p className="text-3xl font-black text-gray-900">{stats.totalInfluencers}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Verified partners</p>
              </button>

              {/* Total Orders */}
              <button 
                onClick={() => setCurrentView("orders")}
                className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-lg transition-all hover:border-gray-400 cursor-pointer text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white admin-zoho-keep-white" />
                  </div>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">+24%</span>
                </div>
                <p className="text-gray-600 text-xs font-bold uppercase mb-1">Total Orders</p>
                <p className="text-3xl font-black text-gray-900">{orders.length}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">All time orders</p>
              </button>

              {/* Total Products */}
              <button 
                onClick={() => setCurrentView("products")}
                className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-lg transition-all hover:border-gray-400 cursor-pointer text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-white admin-zoho-keep-white" />
                  </div>
                  <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">Live</span>
                </div>
                <p className="text-gray-600 text-xs font-bold uppercase mb-1">Products</p>
                <p className="text-3xl font-black text-gray-900">{products.length}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium">In inventory</p>
              </button>
            </div>

            {/* Action Required & Revenue */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pending Actions */}
              <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-black text-gray-900">Action Required</h3>
                  <span className="text-xs font-bold text-gray-500">{stats.pendingApprovals + stats.pendingWithdrawals.count} items</span>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => setCurrentView("influencers")}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900 text-sm">Pending Influencer Approvals</p>
                        <p className="text-xs text-gray-500">{stats.pendingApprovals} requests awaiting review</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-gray-900">{stats.pendingApprovals}</span>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>

                  <button
                    onClick={() => setCurrentView("withdrawals")}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900 text-sm">Pending Withdrawals</p>
                        <p className="text-xs text-gray-500">₹{stats.pendingWithdrawals.total.toLocaleString()} total amount</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-gray-900">{stats.pendingWithdrawals.count}</span>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>

                  <button
                    onClick={() => setCurrentView("orders")}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900 text-sm">Recent Orders</p>
                        <p className="text-xs text-gray-500">{orders.slice(0, 5).length} new orders today</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-gray-900">{orders.length}</span>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

{/* ================= LEADS VIEW ================= */}
{currentView === "leads" && (
  <div className="flex gap-6">

    {/* ================= SIDEBAR ================= */}
    <aside className="w-[260px] shrink-0 bg-white rounded-xl border p-5 space-y-6 h-fit">
      <h3 className="font-black text-sm">Filters</h3>

      {/* Search */}
      <div>
        <p className="text-xs font-black uppercase text-slate-600 mb-1">
          Search
        </p>
     <input
  value={leadSearch}
  onChange={(e) => setLeadSearch(e.target.value)}
  placeholder="Name or email"
  className="w-full px-3 py-2 border rounded-lg text-sm"
/>

      </div>

      {/* Status Filter */}
     {["New", "Contacted", "Interested", "Lost"].map((s) => (
  <label key={s} className="flex gap-2 items-center">
    <input
      type="checkbox"
      checked={leadStatusFilter.includes(s)}
      onChange={() =>
        setLeadStatusFilter((prev) =>
          prev.includes(s)
            ? prev.filter((x) => x !== s)
            : [...prev, s]
        )
      }
    />
    {s}
  </label>
)

)}

<input
  type="date"
  value={startDate}
  onChange={(e) => setStartDate(e.target.value)}
  className="border rounded-lg px-3 py-2"
/>

<input
  type="date"
  value={endDate}
  onChange={(e) => setEndDate(e.target.value)}
  className="border rounded-lg px-3 py-2"
/>


      {/* Sort */}
      <div>
        <p className="text-xs font-black uppercase text-slate-600 mb-1">
          Sort
        </p>
        <select
  value={leadSort}
  onChange={(e) => setLeadSort(e.target.value as "asc" | "desc")}
  className="w-full px-3 py-2 border rounded-lg text-sm"
>
  <option value="desc">Newest first</option>
  <option value="asc">Oldest first</option>
</select>

      </div>
    </aside>

    {/* ================= MAIN CONTENT ================= */}
    <div className="flex-1 flex flex-col gap-6">

    {/* HEADER */}
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-black">
        Leads ({filteredLeads.length})

      </h2>

      <button
        onClick={() => setShowCreateLead(true)}
       className="bg-indigo-600 hover:bg-indigo-700 admin-zoho-keep-white px-4 py-2 rounded-lg text-sm font-semibold"
      >
        + Create Lead
      </button>
    </div>

    {/* TABLE */}
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="grid grid-cols-8 px-6 py-4 text-sm font-bold border-b bg-slate-50 text-left">


        <span>Name</span>
        <span>Company</span>
        <span>Email</span>
        <span>Phone</span>
        <span>Status</span>
        <span>Date</span>
        <span>Mail</span>
        <span>Delete</span>

      </div>

      {leads.length === 0 ? (
        <div className="p-10 text-center text-slate-400">
          No leads found
        </div>
      ) : (
        filteredLeads.map((lead) => (

          <div
  key={lead._id}
  className="grid grid-cols-8 px-6 py-4 text-sm border-b hover:bg-slate-50 text-left"

>

            <span className="font-semibold">
              {lead.firstName} {lead.lastName}
            </span>
            <span>{lead.company}</span>
            <span>{lead.email}</span>
            <span>{lead.phone}</span>
            <span className="capitalize">{lead.status}</span>
            <span className="text-xs text-slate-500">
              {lead.createdAt
                ? new Date(lead.createdAt).toLocaleDateString()
                : "-"}
            </span>

            <span>
  <button
    onClick={() => {
      const subject = encodeURIComponent("Regarding Your Inquiry - StickToon");

      const body = encodeURIComponent(
        `Hi ${lead.firstName || "there"},\n\nThank you for your interest in StickToon.\n\nBest regards,\nStickToon Team`
      );

      window.open(
        `https://mail.google.com/mail/?view=cm&fs=1&to=${lead.email}&su=${subject}&body=${body}`,
        "_blank"
      );
    }}
    className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-lg transition shadow-sm"
  >
    <img
      src="https://www.gstatic.com/images/branding/product/1x/gmail_48dp.png"
      alt="gmail"
      className="w-4 h-4"
    />
    Mail
  </button>
</span>

<span>
  <button
    onClick={() => {
      setLeadToDelete(lead);
      setShowDeleteModal(true);
    }}
    className="px-4 py-2 bg-red-100 text-red-600 
hover:bg-red-200 rounded-lg text-xs font-semibold transition"


  >
    Delete
  </button>
</span>


          </div>
        ))
      )}
    </div>

    {/* CREATE LEAD MODAL */}
    {showCreateLead && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white w-[700px] rounded-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">

          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">Create Lead</h3>
            <button
              onClick={() => setShowCreateLead(false)}
              className="text-red-500 font-semibold"
            >
              Cancel
            </button>
          </div>

          {/* FORM GRID */}
          <div className="grid grid-cols-2 gap-4">

            <input
              placeholder="First Name"
              value={newLead.firstName}
              onChange={(e) =>
                setNewLead({ ...newLead, firstName: e.target.value })
              }
              className="border rounded-lg px-3 py-2"
            />

            <input
              placeholder="Last Name"
              value={newLead.lastName}
              onChange={(e) =>
                setNewLead({ ...newLead, lastName: e.target.value })
              }
              className="border rounded-lg px-3 py-2"
            />

            <input
              placeholder="Company"
              value={newLead.company}
              onChange={(e) =>
                setNewLead({ ...newLead, company: e.target.value })
              }
              className="border rounded-lg px-3 py-2 col-span-2"
            />

            <input
              placeholder="Email"
              value={newLead.email}
              onChange={(e) =>
                setNewLead({ ...newLead, email: e.target.value })
              }
              className="border rounded-lg px-3 py-2"
            />

            <input
              placeholder="Phone"
              value={newLead.phone}
              onChange={(e) =>
                setNewLead({ ...newLead, phone: e.target.value })
              }
              className="border rounded-lg px-3 py-2"
            />

            <select
              value={newLead.status}
              onChange={(e) =>
                setNewLead({ ...newLead, status: e.target.value })
              }
              className="border rounded-lg px-3 py-2 col-span-2"
            >
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Interested">Interested</option>
              <option value="Lost">Lost</option>
            </select>
          </div>

         <button
  onClick={createLead}
  disabled={isSubmittingLead}
  className="w-full bg-indigo-600 hover:bg-indigo-700 admin-zoho-keep-white py-2 rounded-lg font-semibold disabled:opacity-50"
>
  {isSubmittingLead ? "Saving..." : "Save Lead"}
</button>



        </div>
      </div>
    )}

{showDeleteModal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white border-2 border-red-500 w-[420px] rounded-xl p-6 space-y-5 shadow-xl">

      <h3 className="text-lg font-bold text-red-600">
        Delete Lead
      </h3>

      <p className="text-sm text-gray-600">
        Are you sure you want to delete this lead?
        <br />
        <span className="font-semibold text-gray-800">
          {leadToDelete?.firstName} {leadToDelete?.lastName}
        </span>
      </p>

      <div className="flex justify-end gap-3 pt-3 border-t border-red-100">
        <button
          onClick={() => setShowDeleteModal(false)}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
        >
          Cancel
        </button>

        <button
          onClick={deleteLead}
         className="px-4 py-2 bg-red-100 text-red-600 
hover:bg-red-200 rounded-lg text-xs font-semibold transition"
        >
          Delete
        </button>
      </div>

    </div>
  </div>
)}


  </div></div>

  
)}


        {/* INFLUENCERS VIEW */}
        {currentView === "influencers" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-6">Pending Influencer Approvals</h2>
            {pendingInfluencers.length === 0 ? (
              <div className="bg-white/10 border border-white/20 rounded-2xl p-8 text-center">
                <p className="text-gray-400">No pending requests</p>
              </div>
            ) : (
              pendingInfluencers.map((inf) => (
                <div key={inf._id} className="bg-white/10 border border-white/20 rounded-2xl p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-white font-bold text-lg">{inf.name}</h3>
                      <p className="text-gray-400 text-sm">{inf.email}</p>
                      {inf.instagram && <p className="text-purple-300 text-sm">@{inf.instagram}</p>}
                      {inf.youtube && <p className="text-red-300 text-sm">{inf.youtube}</p>}
                      {inf.bio && <p className="text-gray-300 text-sm mt-2">"{inf.bio}"</p>}
                      <p className="text-gray-500 text-xs mt-2">{new Date(inf.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApproveInfluencer(inf._id, true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg text-green-300 font-medium transition-colors"
                      >
                        <Check className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() => handleApproveInfluencer(inf._id, false)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-300 font-medium transition-colors"
                      >
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* WITHDRAWALS VIEW */}
        {currentView === "withdrawals" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-6">Pending Withdrawal Requests</h2>
            {loadingData.withdrawals ? (
              <div className="bg-white/10 border border-white/20 rounded-2xl p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading withdrawal requests...</p>
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="bg-white/10 border border-white/20 rounded-2xl p-8 text-center">
                <p className="text-gray-400">No pending withdrawals</p>
              </div>
            ) : (
              withdrawals.map((w) => (
                <div key={w._id} className="bg-white/10 border border-white/20 rounded-2xl p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-white font-bold text-lg">{w.influencerId.name}</h3>
                      <p className="text-gray-400 text-sm">{w.influencerId.email}</p>
                      <p className="text-green-400 font-bold mt-2">₹{w.amount}</p>
                      <p className="text-gray-500 text-xs mt-1">{w.paymentMethod.toUpperCase()} • {new Date(w.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleProcessWithdrawal(w._id, "approved")}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg text-blue-300 font-medium transition-colors text-sm"
                      >
                        <Check className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() => handleProcessWithdrawal(w._id, "paid")}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg text-green-300 font-medium transition-colors text-sm"
                      >
                        💰 Mark Paid
                      </button>
                      <button
                        onClick={() => handleProcessWithdrawal(w._id, "rejected")}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-300 font-medium transition-colors text-sm"
                      >
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* PRODUCTS VIEW */}
        {currentView === "products" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-gray-900">Products ({products.length})</h2>
              <button
                onClick={() => {
                  setShowProductForm(!showProductForm);
                  setEditingProduct(null);
                  setProductForm({ name: "", description: "", price: 0, category: "Moody", image: "", stock: 0 });
                }}
                className="group flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-bold tracking-wide transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" /> 
                Add Product
              </button>
            </div>

            {/* Add Product Form (only show when not editing) */}
            {showProductForm && !editingProduct && (
              <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-md">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Add New Product
                  </h3>
                </div>
                <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-700 font-bold text-sm mb-2">Product Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Anime Sticker Set"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold text-sm mb-2">Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="499"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) })}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold text-sm mb-2">Category</label>
                    <select
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value as "Positive Vibes" | "Moody" | "Sports" | "Religious" | "Entertainment" | "Events" | "Animal" | "Couple" | "Anime" | "Custom" })}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300 cursor-pointer"
                    >
                      <option value="Positive Vibes">✨ Positive Vibes</option>
                      <option value="Moody">😊 Moody</option>
                      <option value="Sports">🏆 Sports</option>
                      <option value="Religious">🕉️ Religious</option>
                      <option value="Entertainment">🎭 Entertainment</option>
                      <option value="Events">🎉 Events</option>
                      <option value="Animal">🐾 Animal</option>
                      <option value="Couple">💑 Couple</option>
                      <option value="Anime">🎌 Anime</option>
                      <option value="Custom">✨ Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold text-sm mb-2">Stock Quantity</label>
                    <input
                      type="number"
                      placeholder="100"
                      value={productForm.stock}
                      onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value) })}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-gray-700 font-bold text-sm mb-2">Image URL</label>
                    <input
                      type="text"
                      placeholder="/badge/image.png or https://example.com/image.jpg"
                      value={productForm.image}
                      onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-gray-700 font-bold text-sm mb-2">Description</label>
                    <textarea
                      placeholder="Describe the product..."
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      required
                      rows={4}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300 resize-none"
                    />
                  </div>

                  <div className="md:col-span-2 flex gap-4 mt-4">
                    <button
                      type="submit"
                      className="flex-1 group py-3 px-6 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-bold transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <Plus className="w-5 h-5" />
                        Add Product
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProductForm(false);
                        setProductForm({ name: "", description: "", price: 0, category: "Moody", image: "", stock: 0 });
                      }}
                      className="px-8 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-gray-700 font-bold transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Products by Category */}
            {loadingData.products ? (
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-500 text-lg">Loading products...</p>
              </div>
            ) : products.length > 0 ? (
              <div className="space-y-8">
                {ADMIN_PRODUCT_CATEGORIES.map((category) => {
                  const categoryProducts = productsForDisplay.filter(
                    (p) => p.category === category && (p.isPlaceholder || hasValidImage(p.image))
                  );
                  if (categoryProducts.length === 0) return null;

                  return (
                    <div key={category} className="animate-fadeIn">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-2xl">
                          {category === "Positive Vibes" && "✨"}
                          {category === "Moody" && "😊"}
                          {category === "Sports" && "🏆"}
                          {category === "Religious" && "🕉️"}
                          {category === "Entertainment" && "🎭"}
                          {category === "Events" && "🎉"}
                          {category === "Animal" && "🐾"}
                          {category === "Couple" && "💑"}
                          {category === "Anime" && "🎌"}
                          {category === "Custom" && "✨"}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold text-gray-900">
                            {category}
                          </h3>
                          <p className="text-gray-600 font-medium text-sm">
                            {categoryProducts.length} {categoryProducts.length === 1 ? 'product' : 'products'}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {categoryProducts.map((product) => (
                          <div key={product._id} className="group bg-white border border-gray-200 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                            {/* Image */}
                            <div className="relative h-56 bg-gray-100 overflow-hidden">
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              {/* Stock badge overlay */}
                              <div className="absolute top-3 right-3">
                                <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                                  product.stock > 0 
                                    ? "bg-green-100 text-green-700 border border-green-200" 
                                    : "bg-red-100 text-red-700 border border-red-200"
                                }`}>
                                  {product.isPlaceholder ? "Sample" : `${product.stock} in stock`}
                                </span>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="p-5 space-y-3">
                              <h4 className="text-gray-900 font-bold text-lg line-clamp-2 leading-tight">{product.name}</h4>
                              <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">{product.description}</p>

                              {/* Price */}
                              <div className="flex items-baseline gap-2 pt-2">
                                <span className="text-3xl font-bold text-indigo-600">
                                  ₹{product.price}
                                </span>
                              </div>

                              {/* Actions */}
                              {product.isPlaceholder ? (
                                <div className="flex gap-2 pt-2">
                                  <div className="flex-1 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 font-bold text-sm text-center">
                                    Sample Badge
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-2 pt-2">
                                  <button
                                    onClick={() => {
                                      setEditingProduct(product);
                                      setProductForm({
                                        name: product.name,
                                        description: product.description,
                                        price: product.price,
                                        category: product.category,
                                        image: product.image,
                                        stock: product.stock,
                                      });
                                      setShowProductForm(false);
                                    }}
                                    className="flex-1 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-700 font-bold transition-all text-sm hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                                  >
                                    <span className="text-base">✏️</span>
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    onClick={() => setConfirmingDeleteProduct(product)}
                                    className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-700 font-bold transition-all text-sm hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                                  >
                                    <span className="text-base">🗑️</span>
                                    <span>Delete</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-12 text-center">
                <p className="text-gray-500 text-lg">📦 No products yet. Add your first product to get started!</p>
              </div>
            )}
          </div>
        )}

        {/* ALL USERS VIEW */}
       {currentView === "users" && (
  <div className="flex gap-6">
    {/* ================= SIDEBAR FILTERS ================= */}
    <aside className="w-[280px] shrink-0 bg-white rounded-xl border p-5 space-y-6">
      <h3 className="font-black text-sm flex items-center gap-2">
        Filters
      </h3>

      {/* SEARCH */}
      <div>
        <p className="text-xs font-black uppercase text-slate-600 mb-1">
          Search
        </p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name or email"
          className="w-full px-3 py-2 rounded-lg border text-sm"
        />
      </div>

      {/* ROLE */}
      <div className="space-y-2 text-sm">
        <p className="text-xs font-black uppercase text-slate-600">
          Role
        </p>
        <label className="flex gap-2">
          <input type="checkbox" checked={showUsers} onChange={e => setShowUsers(e.target.checked)} />
          Users
        </label>
        <label className="flex gap-2">
          <input type="checkbox" checked={showAdmins} onChange={e => setShowAdmins(e.target.checked)} />
          Admins
        </label>
        <label className="flex gap-2">
          <input type="checkbox" checked={showInfluencers} onChange={e => setShowInfluencers(e.target.checked)} />
          Influencers
        </label>
      </div>

      {/* PROVIDER */}
      <div className="space-y-2 text-sm">
        <p className="text-xs font-black uppercase text-slate-600">
          Provider
        </p>
        <label className="flex gap-2">
          <input type="checkbox" checked={showCredentials} onChange={e => setShowCredentials(e.target.checked)} />
          Credentials
        </label>
        <label className="flex gap-2">
          <input type="checkbox" checked={showGoogle} onChange={e => setShowGoogle(e.target.checked)} />
          Google
        </label>
      </div>

      {/* DATE */}
      <div className="space-y-2">
        <p className="text-xs font-black uppercase text-slate-600">
          Date
        </p>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
      </div>

      {/* SORT */}
      <div>
        <p className="text-xs font-black uppercase text-slate-600 mb-1">
          Sort
        </p>
        <select
          value={order}
          onChange={(e) => setOrder(e.target.value as any)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </div>
    </aside>

    {/* ================= USERS TABLE ================= */}
    <section className="flex-1 bg-white rounded-xl border overflow-hidden">
      <div className="px-6 py-4 border-b font-black">
        Users ({filteredUsers.length})
      </div>

      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="p-3 text-left">#</th>
            <th className="p-3 text-left">Name</th>
            <th className="p-3 text-left">Email</th>
            <th className="p-3 text-left">Role</th>
            <th className="p-3 text-left">Provider</th>
            <th className="p-3 text-left">Created</th>
            <th className="px-4 py-3 text-left">Mail</th>

          </tr>
        </thead>

        <tbody>
          {filteredUsers.map((u, i) => (
            <tr key={u._id} className="border-t hover:bg-slate-50">
              <td className="p-3">{i + 1}</td>
              <td className="p-3 font-medium">{u.name || "—"}</td>
              <td className="p-3">{u.email}</td>
              <td className="p-3 capitalize">{u.role}</td>
              <td className="p-3 capitalize">{u.provider || "credentials"}</td>
              <td className="p-3 text-xs text-slate-500">
                {new Date(u.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
  <button
  onClick={() => {
    const subject = encodeURIComponent("Regarding Your StickToon Account");

    const body = encodeURIComponent(
      `Hi ${u.name || "there"},\n\nWe’d love to connect with you regarding your StickToon account.\n\nBest regards,\nStickToon Team`
    );

    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${u.email}&su=${subject}&body=${body}`,
      "_blank"
    );
  }}
  className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-lg transition shadow-sm"
>
  <img
    src="https://www.gstatic.com/images/branding/product/1x/gmail_48dp.png"
    alt="gmail"
    className="w-4 h-4"
  />
  Mail
</button>

</td>

            </tr>
          ))}

          {filteredUsers.length === 0 && (
            <tr>
              <td colSpan={6} className="p-6 text-center text-slate-400">
                No users match filters
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  </div>
)}


        {/* ALL INFLUENCERS VIEW */}
{/* ================= ALL INFLUENCERS VIEW ================= */}
{currentView === "all-influencers" && (
  <div className="flex gap-8">
    {/* ================= SIDEBAR ================= */}
    <aside className="w-[260px] shrink-0 bg-white rounded-xl border p-5 space-y-6 h-fit">
      <h3 className="font-black text-sm">Filters</h3>

      {/* STATUS */}
      <div className="space-y-2 text-sm">
        <p className="text-xs font-black uppercase text-slate-600">
          Status
        </p>

        <label className="flex gap-2 items-center">
          <input
            type="checkbox"
            checked={showApprovedInf}
            onChange={(e) => setShowApprovedInf(e.target.checked)}
          />
          Approved
        </label>

        <label className="flex gap-2 items-center">
          <input
            type="checkbox"
            checked={showPendingInf}
            onChange={(e) => setShowPendingInf(e.target.checked)}
          />
          Pending
        </label>
      </div>

      {/* DATE (same as Users) */}
      <div className="space-y-2">
        <p className="text-xs font-black uppercase text-slate-600">
          Date
        </p>

        <input
          type="date"
          value={infFromDate}
          onChange={(e) => setInfFromDate(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />

        <input
          type="date"
          value={infToDate}
          onChange={(e) => setInfToDate(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
      </div>

      {/* SORT */}
<div className="space-y-2">
  <p className="text-xs font-black uppercase text-slate-600">
    Sort
  </p>

  <select
    value={infSort}
    onChange={(e) => setInfSort(e.target.value as "asc" | "desc")}
    className="w-full px-3 py-2 border rounded-lg text-sm"
  >
    <option value="desc">Newest first</option>
    <option value="asc">Oldest first</option>
  </select>
</div>

    </aside>

    {/* ================= CONTENT ================= */}
    <section className="flex-1 flex flex-col gap-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black">
          All Influencers ({filteredInfluencers.length})
        </h2>

        <div className="flex gap-6 text-sm">
          <span className="flex items-center gap-1">
            ✅ Approved:{" "}
            {
              filteredInfluencers.filter(
                (i) => i.influencerProfile?.isApproved
              ).length
            }
          </span>
          <span className="flex items-center gap-1">
            ⏳ Pending:{" "}
            {
              filteredInfluencers.filter(
                (i) => !i.influencerProfile?.isApproved
              ).length
            }
          </span>
        </div>
      </div>

      {/* CARDS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredInfluencers.map((inf) => (
          <div
            key={inf._id}
            className="bg-white border rounded-xl p-5 hover:shadow-lg transition"
          >
            {/* HEADER */}
            <div className="flex justify-between mb-3">
              <div>
                <p className="font-bold">{inf.name}</p>
                <p className="text-xs text-slate-500">
                  {inf.email}
                </p>
              </div>

              <span
                className={`px-3 py-1 text-xs font-bold rounded-full ${
                  inf.influencerProfile?.isApproved
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {inf.influencerProfile?.isApproved
                  ? "Approved"
                  : "Pending"}
              </span>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-lg p-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="font-bold text-green-600">
                  ₹{inf.influencerProfile?.totalEarnings || 0}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Pending</p>
                <p className="font-bold">
                  ₹{inf.influencerProfile?.pendingEarnings || 0}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Withdrawn</p>
                <p className="font-bold text-blue-600">
                  ₹{inf.influencerProfile?.withdrawnAmount || 0}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Min Withdrawal
                </p>
                <p className="font-bold">
                  ₹{inf.influencerProfile?.minWithdrawalAmount || 100}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-3">
              Joined:{" "}
              {new Date(inf.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}

        {filteredInfluencers.length === 0 && (
          <p className="col-span-full text-center text-slate-400 py-10">
            No influencers match selected filters
          </p>
        )}
      </div>
    </section>
  </div>
)}



       {/* ================= ORDERS VIEW ================= */}
{currentView === "orders" && (
  <div className="flex gap-6">
    {/* ================= FILTER SIDEBAR ================= */}
    <aside className="w-[260px] shrink-0 bg-white rounded-xl border p-5 space-y-6 h-fit">
      <h3 className="font-black text-sm">Filters</h3>

      {/* PAYMENT STATUS */}
      <div className="space-y-2 text-sm">
        <p className="text-xs font-black uppercase text-slate-600">
          Payment Status
        </p>

        {["SUCCESS", "PENDING", "FAILED"].map((s) => (
          <label key={s} className="flex gap-2 items-center">
            <input
              type="checkbox"
              checked={orderStatusFilter.includes(s)}
              onChange={() =>
                setOrderStatusFilter((prev) =>
                  prev.includes(s)
                    ? prev.filter((x) => x !== s)
                    : [...prev, s]
                )
              }
            />
            <span className="capitalize">{s.toLowerCase()}</span>
          </label>
        ))}
      </div>

      {/* DATE */}
      <div className="space-y-2">
        <p className="text-xs font-black uppercase text-slate-600">
          Date
        </p>
        <input
          type="date"
          value={orderFromDate}
          onChange={(e) => setOrderFromDate(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
        <input
          type="date"
          value={orderToDate}
          onChange={(e) => setOrderToDate(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
      </div>

      {/* SORT */}
      <div className="space-y-2">
        <p className="text-xs font-black uppercase text-slate-600">
          Sort
        </p>
        <select
          value={orderSort}
          onChange={(e) => setOrderSort(e.target.value as "asc" | "desc")}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </div>
    </aside>

    {/* ================= MAIN CONTENT ================= */}
    <section className="flex-1 flex flex-col gap-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black">
          All Orders ({orders.length})
        </h2>

        {orders.length > 0 && (
          <div className="text-sm text-slate-500 flex gap-4">
            <span>✅ Success: {orders.filter(o => o.status === "SUCCESS").length}</span>
            <span>⏳ Pending: {orders.filter(o => o.status === "PENDING").length}</span>
            <span>❌ Failed: {orders.filter(o => o.status === "FAILED").length}</span>
          </div>
        )}
      </div>

      {/* LOADING */}
      {loadingData.orders ? (
        <div className="bg-white border rounded-xl p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-500">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        /* EMPTY STATE */
        <div className="bg-white border rounded-xl p-12 text-center">
          <p className="text-slate-500">No orders found</p>
        </div>
      ) : (
        /* GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => (
            <div
              key={order._id}
              onClick={() => setViewingOrder(order)}
              className="bg-white border hover:border-indigo-500 rounded-xl p-4 transition hover:shadow-lg cursor-pointer"
            >
              {/* HEADER */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-sm">
                    #{order.orderId || order._id.slice(-6)}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {order.userId?.email || "N/A"}
                  </p>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    order.status === "SUCCESS"
                      ? "bg-green-100 text-green-700 border-green-200"
                      : order.status === "PENDING"
                      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                      : "bg-red-100 text-red-700 border-red-200"
                  }`}
                >
                  {order.status}
                </span>
              </div>

              {/* BODY */}
              <div className="space-y-2 mb-3 pb-3 border-b">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-bold text-green-600">
                    ₹{order.amount}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Customer</span>
                  <span className="text-slate-700">
                    {order.userId?.name || "Anonymous"}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                📅 {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  </div>
)}


        {/* PROFILE VIEW */}
        {currentView === "profile" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent backdrop-blur-xl rounded-3xl p-8 border-2 border-white/20">
              <div className="flex items-center gap-4 mb-6">
                {(user as any)?.avatar ? (
                  <img 
                    src={(user as any).avatar} 
                    alt="Profile" 
                    className="w-16 h-16 rounded-full border-4 border-white/20 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = document.createElement('div');
                      fallback.className = "w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-3xl font-black text-white border-4 border-white/20";
                      fallback.textContent = user?.name?.charAt(0).toUpperCase() || "A";
                      e.currentTarget.parentElement?.appendChild(fallback);
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-3xl font-black text-white border-4 border-white/20">
                    {user?.name?.charAt(0).toUpperCase() || "A"}
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-black text-white">Edit Profile</h2>
                  <p className="text-indigo-300 text-sm">Update your account information</p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-100 border-2 border-red-500 rounded-xl mb-6">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm font-bold text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white border-b border-white/20 pb-2">Basic Information</h3>
                  
                  <div>
                    <label className="block text-sm font-bold text-white mb-2">Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border-2 border-white/20 focus:border-indigo-500 focus:outline-none transition-all text-white font-medium placeholder:text-gray-400"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-white mb-2">Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border-2 border-white/20 focus:border-indigo-500 focus:outline-none transition-all text-white font-medium placeholder:text-gray-400"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-white mb-2">Avatar URL</label>
                    <input
                      type="text"
                      value={profileForm.avatar}
                      onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border-2 border-white/20 focus:border-indigo-500 focus:outline-none transition-all text-white font-medium placeholder:text-gray-400"
                      placeholder="https://example.com/avatar.jpg (optional)"
                    />
                    {profileForm.avatar && (
                      <div className="mt-3 flex items-center gap-3">
                        <img 
                          src={profileForm.avatar} 
                          alt="Avatar preview" 
                          className="w-16 h-16 rounded-full border-2 border-indigo-500 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <span className="text-xs text-gray-400">Preview</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Change Password */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white border-b border-white/20 pb-2">Change Password (Optional)</h3>
                  
                  <div>
                    <label className="block text-sm font-bold text-white mb-2">Current Password</label>
                    <input
                      type="password"
                      value={profileForm.currentPassword}
                      onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border-2 border-white/20 focus:border-indigo-500 focus:outline-none transition-all text-white font-medium placeholder:text-gray-400"
                      placeholder="Enter current password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-white mb-2">New Password</label>
                    <input
                      type="password"
                      value={profileForm.newPassword}
                      onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/10 border-2 border-white/20 focus:border-indigo-500 focus:outline-none transition-all text-white font-medium placeholder:text-gray-400"
                      placeholder="Enter new password (min 6 characters)"
                    />
                  </div>

                  <p className="text-xs text-gray-400">
                    💡 Leave password fields empty to keep your current password
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={updatingProfile}
                    className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-black text-sm uppercase tracking-wide disabled:opacity-50 border-3 border-white/20 shadow-lg transition-all"
                  >
                    {updatingProfile ? "Updating... ⏳" : "Save Changes ✓"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentView("dashboard")}
                    className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold border-2 border-white/20 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* Order Details Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-indigo-500/30 rounded-2xl p-6 max-w-2xl w-full shadow-2xl shadow-indigo-500/20 transform transition-all duration-300 max-h-[90vh] overflow-y-auto">
            <div className="mb-6 pb-4 border-b border-indigo-500/20 flex items-start justify-between">
              <div>
                <h3 className="text-white font-bold text-xl flex items-center gap-2">📦 Order Details</h3>
                <p className="text-gray-400 text-sm mt-1">#{viewingOrder.orderId || viewingOrder._id}</p>
              </div>
              <button onClick={() => setViewingOrder(null)} className="text-gray-400 hover:text-white text-2xl leading-none">✕</button>
            </div>

            {/* Order Items */}
            <div className="space-y-3 mb-6">
              {viewingOrder.items?.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-4 bg-white/5 rounded-xl p-3">
                  <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover border border-indigo-500/30" />
                  <div className="flex-1">
                    <p className="text-white font-semibold">{item.name}</p>
                    <p className="text-gray-400 text-sm">₹{item.price} × {item.quantity}</p>
                  </div>
                  <p className="text-white font-bold">₹{item.price * item.quantity}</p>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-2">
              <div className="flex justify-between text-gray-300">
                <span>Subtotal</span>
                <span>₹{viewingOrder.subtotal || viewingOrder.amount - 99}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Delivery</span>
                <span>₹99</span>
              </div>
              <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-white/10">
                <span>Total</span>
                <span>₹{viewingOrder.amount}</span>
              </div>
            </div>

            {/* Customer & Payment Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-gray-400 text-xs mb-1">Customer</p>
                <p className="text-white font-semibold">{viewingOrder.userId?.name || 'Anonymous'}</p>
                <p className="text-gray-400 text-xs">{viewingOrder.userId?.email || 'N/A'}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-gray-400 text-xs mb-1">Status</p>
                <p className={`font-bold ${viewingOrder.status === 'SUCCESS' ? 'text-emerald-400' : viewingOrder.status === 'PENDING' ? 'text-amber-400' : 'text-red-400'}`}>
                  {viewingOrder.status}
                </p>
                <p className="text-gray-400 text-xs">{new Date(viewingOrder.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={async () => {
                const invoiceId = typeof viewingOrder.invoiceId === 'string' ? viewingOrder.invoiceId : viewingOrder.invoiceId?._id;
                if (!invoiceId) {
                  showToast('warning', '⚠️ Invoice not available yet');
                  return;
                }
                try {
                  const token = localStorage.getItem('adminToken');
                  const res = await fetch(`${API_BASE_URL}/api/invoice/${invoiceId}/download`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  if (!res.ok) throw new Error('Failed to download');
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `invoice-${invoiceId}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  showToast('success', '✅ Invoice downloaded!');
                } catch (error) {
                  showToast('error', '❌ Download failed');
                }
              }}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 rounded-xl text-white font-bold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-purple-500/40 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span className="text-2xl">📥</span>
              <span>Download Invoice</span>
            </button>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-indigo-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-indigo-500/20 transform transition-all duration-300">
            {/* Header */}
            <div className="mb-6 pb-4 border-b border-indigo-500/20">
              <h3 className="text-white font-bold text-xl flex items-center gap-2">✏️ Edit User</h3>
              <p className="text-gray-400 text-sm mt-1">{editingUser.email}</p>
            </div>
            
            {/* Form */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-2">Name</label>
                <input
                  type="text"
                  placeholder="Enter user name"
                  defaultValue={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/10 border border-indigo-500/30 hover:border-indigo-500/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm font-medium block mb-2">Email</label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  defaultValue={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/10 border border-indigo-500/30 hover:border-indigo-500/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
              
              {/* Super Admin Password Field */}
              {isSuperAdmin && (
                <div>
                  <label className="text-gray-300 text-sm font-medium block mb-2">🔐 Password (Super Admin Only)</label>
                  <input
                    type="password"
                    placeholder="Leave empty to keep unchanged"
                    value={editingUser.password || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    className="w-full px-4 py-2.5 bg-yellow-500/10 border border-yellow-500/30 hover:border-yellow-500/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all"
                  />
                  {editingUser.password && editingUser.password.length < 6 && (
                    <p className="text-yellow-300 text-xs mt-1">⚠️ Password must be at least 6 characters</p>
                  )}
                </div>
              )}
              
              {/* Super Admin Avatar Field */}
              {isSuperAdmin && (
                <div>
                  <label className="text-gray-300 text-sm font-medium block mb-2">🖼️ Avatar URL (Super Admin Only)</label>
                  <input
                    type="url"
                    placeholder="Enter image URL (leave empty to remove avatar)"
                    value={editingUser.avatar || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, avatar: e.target.value })}
                    className="w-full px-4 py-2.5 bg-yellow-500/10 border border-yellow-500/30 hover:border-yellow-500/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all"
                  />
                  {editingUser.avatar && (
                    <div className="mt-2 flex items-center gap-2">
                      <img 
                        src={editingUser.avatar} 
                        alt="preview" 
                        className="w-8 h-8 rounded-full object-cover border border-indigo-500/30"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <span className="text-gray-400 text-xs">Preview</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const updates: any = { name: editingUser.name, email: editingUser.email };
                  if (isSuperAdmin && editingUser.password) {
                    updates.password = editingUser.password;
                  }
                  if (isSuperAdmin && editingUser.avatar !== undefined) {
                    updates.avatar = editingUser.avatar;
                  }
                  handleUpdateUser(editingUser._id, updates);
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 rounded-lg text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-lg hover:shadow-indigo-500/30"
              >
                ✓ Save Changes
              </button>
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-semibold transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingPassword && isSuperAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-yellow-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-yellow-500/20 transform transition-all duration-300">
            {/* Header */}
            <div className="mb-6 pb-4 border-b border-yellow-500/20">
              <h3 className="text-white font-bold text-xl flex items-center gap-2">🔐 Super Admin Password Reset</h3>
              <p className="text-gray-400 text-sm mt-1">Resetting password for:</p>
              <p className="text-yellow-300 text-sm font-semibold truncate">{resettingPassword.email}</p>
            </div>
            
            {/* Info Box */}
            <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-300 text-xs">
                ⚠️ Only super admin can reset user passwords. Enter a new password below.
              </p>
            </div>
            
            {/* Form */}
            <div className="mb-6">
              <label className="text-gray-300 text-sm font-medium block mb-2">New Password</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Min 6 characters (A-z, 0-9, !@#)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/10 border border-yellow-500/30 hover:border-yellow-500/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all"
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-xs font-medium ${
                  newPassword.length >= 6 ? 'text-emerald-400' : 'text-gray-500'
                }`}>
                  {newPassword.length >= 6 ? '✓ Strong' : '○ Min 6 characters'}
                </span>
                <span className="text-xs text-gray-500">{newPassword.length}/20</span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => handleResetPassword(resettingPassword._id, newPassword)}
                className={`flex-1 py-2.5 rounded-lg text-white font-semibold transition-all duration-200 ${
                  newPassword.length >= 6
                    ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 shadow-lg hover:shadow-lg hover:shadow-yellow-500/30'
                    : 'bg-gray-600 cursor-not-allowed opacity-50'
                }`}
                disabled={newPassword.length < 6}
              >
                🔐 Reset Password
              </button>
              <button
                onClick={() => {
                  setResettingPassword(null);
                  setNewPassword("");
                }}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-semibold transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmingDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-red-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-red-500/20 transform transition-all duration-300">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/30">
                <span className="text-3xl">⚠️</span>
              </div>
            </div>

            {/* Content */}
            <div className="text-center mb-6">
              <h3 className="text-white font-bold text-xl mb-2">Delete User?</h3>
              <p className="text-gray-300 font-semibold mb-2">{confirmingDelete.name}</p>
              <p className="text-gray-400 text-sm mb-2">{confirmingDelete.email}</p>
              <p className="text-red-300 text-xs border-t border-red-500/20 mt-4 pt-4">
                ⚠️ This action cannot be undone. All data associated with this user will be deleted.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => handleDeleteUser(confirmingDelete._id)}
                className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-lg text-white font-bold transition-all duration-200 shadow-lg hover:shadow-lg hover:shadow-red-500/30"
              >
                🗑️ Delete Permanently
              </button>
              <button
                onClick={() => setConfirmingDelete(null)}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-semibold transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {confirmingDeleteProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-red-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-red-500/20 transform transition-all duration-300">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/30">
                <span className="text-3xl">⚠️</span>
              </div>
            </div>

            {/* Content */}
            <div className="text-center mb-6">
              <h3 className="text-white font-bold text-xl mb-2">Delete Product?</h3>
              <p className="text-gray-300 font-semibold mb-2">{confirmingDeleteProduct.name}</p>
              <p className="text-indigo-400 text-sm mb-2">₹{confirmingDeleteProduct.price}</p>
              <p className="text-red-300 text-xs border-t border-red-500/20 mt-4 pt-4">
                ⚠️ This action cannot be undone. The product will be deleted permanently.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => handleDeleteProduct(confirmingDeleteProduct._id)}
                className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-lg text-white font-bold transition-all duration-200 shadow-lg hover:shadow-lg hover:shadow-red-500/30"
              >
                🗑️ Delete Permanently
              </button>
              <button
                onClick={() => setConfirmingDeleteProduct(null)}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-semibold transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-indigo-500/30 rounded-2xl p-8 max-w-3xl w-full shadow-2xl shadow-indigo-500/20 my-8">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              ✏️ Edit Product
            </h3>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateProduct(editingProduct._id); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white font-semibold mb-2">Product Name</label>
                <input
                  type="text"
                  placeholder="e.g., Anime Sticker Set"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="499"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) })}
                  required
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Category</label>
                <select
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value as "Positive Vibes" | "Moody" | "Sports" | "Religious" | "Entertainment" | "Events" | "Animal" | "Couple" | "Anime" | "Custom" })}
                  required
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white focus:border-indigo-500 focus:outline-none transition-all"
                >
                  <option value="Positive Vibes">✨ Positive Vibes</option>
                  <option value="Moody">😊 Moody</option>
                  <option value="Sports">🏆 Sports</option>
                  <option value="Religious">🕉️ Religious</option>
                  <option value="Entertainment">🎭 Entertainment</option>
                  <option value="Events">🎉 Events</option>
                  <option value="Animal">🐾 Animal</option>
                  <option value="Couple">💑 Couple</option>
                  <option value="Anime">🎌 Anime</option>
                  <option value="Custom">✨ Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Stock Quantity</label>
                <input
                  type="number"
                  placeholder="100"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value) })}
                  required
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-white font-semibold mb-2">Image URL</label>
                <input
                  type="text"
                  placeholder="/badge/image.png or https://example.com/image.jpg"
                  value={productForm.image}
                  onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-white font-semibold mb-2">Description</label>
                <textarea
                  placeholder="Describe the product..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-all resize-none"
                />
              </div>

              <div className="md:col-span-2 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 rounded-lg text-white font-bold transition-all shadow-lg"
                >
                  💾 Update Product
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setProductForm({ name: "", description: "", price: 0, category: "Moody", image: "", stock: 0 });
                  }}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-bold transition-all"
                >
                  ✕ Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      </div>
      
      {/* Toast Notifications Container */}
      <div className="fixed top-6 right-6 z-[9999] space-y-3 max-w-md">
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle className="w-6 h-6 text-green-400" />,
            error: <XCircle className="w-6 h-6 text-red-400" />,
            info: <Info className="w-6 h-6 text-blue-400" />,
            warning: <AlertCircle className="w-6 h-6 text-yellow-400" />,
          };

          const colors = {
            success: "from-green-500/20 via-emerald-500/10 to-transparent border-green-400/50 shadow-[0_8px_32px_rgba(34,197,94,0.3)]",
            error: "from-red-500/20 via-pink-500/10 to-transparent border-red-400/50 shadow-[0_8px_32px_rgba(239,68,68,0.3)]",
            info: "from-blue-500/20 via-indigo-500/10 to-transparent border-blue-400/50 shadow-[0_8px_32px_rgba(59,130,246,0.3)]",
            warning: "from-yellow-500/20 via-orange-500/10 to-transparent border-yellow-400/50 shadow-[0_8px_32px_rgba(234,179,8,0.3)]",
          };

          return (
            <div
              key={toast.id}
              className={`
                relative bg-gradient-to-br ${colors[toast.type]} 
                backdrop-blur-xl border-2 rounded-2xl p-4 pr-12
                ${toast.isExiting ? "animate-slideOutRight" : "animate-slideInRight"}
                hover:scale-105 transition-transform duration-200
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
  );
};

export default Admin;
