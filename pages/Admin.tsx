import React, { useState, useEffect, useMemo, useRef, JSX } from "react";

import { useNavigate, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import { BADGES } from "../constants";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import Groups2RoundedIcon from "@mui/icons-material/Groups2Rounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import ContactsRoundedIcon from "@mui/icons-material/ContactsRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import {
  Eye,
  EyeOff,
  Menu,
  LogOut,
  Users,
  AlertCircle,
  Check,
  X,
  Upload,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  DollarSign,
  CheckCircle,
  XCircle,
  Info,
  BarChart3,
  BriefcaseBusiness,
} from "lucide-react";
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
    positive_vibes: "Positive Vibes",
    moody: "Moody",
    sports: "Sports",
    religious: "Religious",
    entertainment: "Entertainment",
    events: "Events",
    animal: "Animal",
    pet: "Animal",
    couple: "Couple",
    anime: "Anime",
    custom: "Custom",
  };

  return map[lower] || trimmed;
};

const formatINRCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

// Add CSS for animations
const style = document.createElement("style");
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
  paymentDetails?: {
    upiId?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    accountHolderName?: string;
    paytmNumber?: string;
    bankDetails?: {
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
      accountHolder?: string;
      accountHolderName?: string;
    };
  };
  adminNote?: string;
  transactionId?: string;
  processedAt?: string;
  status: "pending" | "approved" | "rejected" | "paid";
  createdAt: string;
}

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category:
    | "Positive Vibes"
    | "Moody"
    | "Sports"
    | "Religious"
    | "Entertainment"
    | "Events"
    | "Animal"
    | "Couple"
    | "Anime"
    | "Custom";
  subcategory?: string;
  image: string;
  stock: number;
  createdAt: string;
  isPlaceholder?: boolean;
}

const ADMIN_PRODUCT_CATEGORIES = [
  "Positive Vibes",
  "Moody",
  "Sports",
  "Religious",
  "Entertainment",
  "Events",
  "Animal",
  "Couple",
  "Anime",
  "Custom",
] as const;
type AdminProductCategory = (typeof ADMIN_PRODUCT_CATEGORIES)[number];

const ADMIN_PRODUCT_CATEGORY_OPTIONS: Array<{
  value: AdminProductCategory;
  label: string;
  emoji: string;
}> = [
  { value: "Positive Vibes", label: "Positive Vibes", emoji: "✨" },
  { value: "Moody", label: "Moody", emoji: "😊" },
  { value: "Sports", label: "Sports", emoji: "🏆" },
  { value: "Religious", label: "Religious", emoji: "🕉️" },
  { value: "Entertainment", label: "Entertainment", emoji: "🎭" },
  { value: "Events", label: "Events", emoji: "🎉" },
  { value: "Animal", label: "Animal", emoji: "🐾" },
  { value: "Couple", label: "Couple", emoji: "💑" },
  { value: "Anime", label: "Anime", emoji: "🎌" },
  { value: "Custom", label: "Custom", emoji: "✨" },
];

const ADMIN_PRODUCT_SUBCATEGORY_SUGGESTIONS: Record<
  AdminProductCategory,
  string[]
> = {
  "Positive Vibes": ["Motivational", "Quotes", "Self Love", "Success"],
  Moody: ["Attitude", "Dark", "Introvert", "Aesthetic"],
  Sports: ["Cricket", "Football", "Gym", "Esports"],
  Religious: ["Festival", "Devotional", "Temple", "Spiritual"],
  Entertainment: ["Movies", "Music", "Memes", "Celebrities"],
  Events: ["Birthday", "Wedding", "Party", "College"],
  Animal: ["Dog", "Cat", "Bird", "Wildlife"],
  Couple: ["Anniversary", "Love Quotes", "Long Distance", "Cute"],
  Anime: ["Shonen", "Shojo", "Classic", "Manga"],
  Custom: ["Name", "Logo", "Photo", "Bulk"],
};

const PRODUCT_SUBCATEGORY_MAX_LENGTH = 60;
const sanitizeProductSubcategory = (value?: string) => {
  if (!value) return "";
  return value.trim().slice(0, PRODUCT_SUBCATEGORY_MAX_LENGTH);
};

const sanitizeProductImagePath = (value?: string) => {
  if (!value) return "";

  let normalized = value.trim();
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized) || /^data:/i.test(normalized)) {
    return normalized;
  }

  normalized = normalized.replace(/\\/g, "/").replace(/\/+/g, "/");
  const lower = normalized.toLowerCase();

  if (lower.includes("/public/")) {
    normalized = normalized.slice(lower.lastIndexOf("/public/") + "/public".length);
  } else if (lower.startsWith("public/")) {
    normalized = normalized.slice("public".length);
  } else if (lower.startsWith("./public/")) {
    normalized = normalized.slice("./public".length);
  }

  normalized = normalized.replace(/^\.\//, "");

  if (!normalized.startsWith("/") && /^(badge|images|sticker)\//i.test(normalized)) {
    normalized = `/${normalized}`;
  }

  if (!normalized.startsWith("/")) {
    normalized = `/badge/${normalized}`;
  }

  return normalized;
};

type ProductFormState = {
  name: string;
  description: string;
  price: number;
  category: AdminProductCategory;
  subcategory: string;
  image: string;
  stock: number;
};

const createDefaultProductForm = (
  category: AdminProductCategory = "Moody",
): ProductFormState => ({
  name: "",
  description: "",
  price: 0,
  category,
  subcategory: "",
  image: "",
  stock: 0,
});

const normalizeAdminProduct = (product: Product): Product => {
  const normalizedCategory = normalizeCategory(product.category) as
    | AdminProductCategory
    | undefined;

  return {
    ...product,
    category:
      normalizedCategory && ADMIN_PRODUCT_CATEGORIES.includes(normalizedCategory)
        ? normalizedCategory
        : "Moody",
    subcategory: sanitizeProductSubcategory(product.subcategory),
    image: sanitizeProductImagePath(product.image),
  };
};

const ensureMinimumProductsPerCategory = (
  items: Product[],
  minCount = 4,
): Product[] => {
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

const createDefaultPromoFormData = (): PromoFormData => ({
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
});

type TaskStatus =
  | "Pending"
  | "In Progress"
  | "Waiting on Customer"
  | "Completed"
  | "Cancelled";

type TaskItem = {
  _id?: string;
  user?: { _id?: string; name?: string; email?: string };
  assignedTo?: { _id?: string; name?: string; email?: string } | string;
  title: string;
  description?: string;
  status: TaskStatus | string;
  dueDate?: string;
  reminderAt?: string;
  relatedToType?: "Lead" | "Contact" | "Order" | "Support Ticket" | "Influencer" | "";
  relatedToId?: string;
  taskType?:
    | "Call"
    | "Email"
    | "WhatsApp Follow-up"
    | "Order Confirmation"
    | "Refund Processing"
    | "Influencer Follow-up"
    | "Internal Task";
  comments?: { authorName: string; text: string; createdAt: string }[];
  activityTimeline?: { message: string; createdAt: string }[];
  createdAt?: string;
};

type TaskFormState = {
  title: string;
  relatedToType: "Lead" | "Contact" | "Order" | "Support Ticket" | "Influencer" | "";
  relatedToId: string;
  taskType:
    | "Call"
    | "Email"
    | "WhatsApp Follow-up"
    | "Order Confirmation"
    | "Refund Processing"
    | "Influencer Follow-up"
    | "Internal Task";
  status: TaskStatus;
  dueDate: string;
  reminderAt: string;
  assignedTo: string;
  description: string;
};

const createDefaultTaskForm = (): TaskFormState => ({
  title: "",
  relatedToType: "Lead",
  relatedToId: "",
  taskType: "Call",
  status: "Pending",
  dueDate: "",
  reminderAt: "",
  assignedTo: "",
  description: "",
});
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
    | "login"
    | "dashboard"
    | "notifications"
    | "leads"
    | "deals"
    | "support"
    | "tasks"
    | "users"
    | "all-influencers"
    | "influencers"
    | "withdrawals"
    | "customers"
    | "products"
    | "promo"
    | "orders"
    | "reports"
    | "profile"
  >("login");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  // Data states
  const [pendingInfluencers, setPendingInfluencers] = useState<
    PendingInfluencer[]
  >([]);
  const [allInfluencers, setAllInfluencers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [updatingDeliveryOrderId, setUpdatingDeliveryOrderId] = useState<string | null>(null);
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
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
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDraft, setCustomerDraft] = useState({
    accountName: "",
    phone: "",
    email: "",
    company: "",
    address: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    contactMobile: "",
  });
  const [customerEdits, setCustomerEdits] = useState<
    Record<
      string,
      Partial<{
        accountName: string;
        phone: string;
        email: string;
        company: string;
        address: string;
        contactName: string;
        contactEmail: string;
        contactPhone: string;
        contactMobile: string;
      }>
    >
  >({});
  const [reportFilter, setReportFilter] = useState<"all" | "daily" | "weekly" | "monthly">("monthly");

  type Lead = {
    _id?: string;
    firstName: string;
    lastName: string;
    company: string;
    email: string;
    phone: string;
    expectedAmount?: number;
    mobile?: string;
    title?: string;
    industry?: string;
    leadSource?: string;
    status?: string;
    nextFollowUpAt?: string;
    createdAt?: string;
  };

  type SupportMessage = {
    _id: string;
    ticketId?: string;
    name: string;
    email: string;
    phone: string;
    inquiryType: string;
    message: string;
    internalNote?: string;
    firstResponseAt?: string;
    resolvedAt?: string;
    slaDeadlineAt?: string;
    status: "New" | "In Progress" | "Resolved";
    createdAt?: string;
  };

  const [leads, setLeads] = useState<Lead[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [isLoadingSupportMessages, setIsLoadingSupportMessages] = useState(false);
  const [slaNow, setSlaNow] = useState(() => Date.now());
  const [supportInternalNotes, setSupportInternalNotes] = useState<
    Record<string, string>
  >({});
  const [supportSlaDeadlines, setSupportSlaDeadlines] = useState<
    Record<string, string>
  >({});
  const [savingSupportNoteId, setSavingSupportNoteId] = useState<string | null>(
    null,
  );
  const [savingSupportSlaId, setSavingSupportSlaId] = useState<string | null>(
    null,
  );
  const [replyingSupportMessage, setReplyingSupportMessage] =
    useState<SupportMessage | null>(null);
  const [supportReplyText, setSupportReplyText] = useState("");
  const [isSendingSupportReply, setIsSendingSupportReply] = useState(false);
  const [supportMessageToDelete, setSupportMessageToDelete] =
    useState<SupportMessage | null>(null);
  const [isDeletingSupportMessage, setIsDeletingSupportMessage] =
    useState(false);
  const [showNewSupport, setShowNewSupport] = useState(true);
  const [showInProgressSupport, setShowInProgressSupport] = useState(true);
  const [showResolvedSupport, setShowResolvedSupport] = useState(true);
  const [supportFromDate, setSupportFromDate] = useState("");
  const [supportToDate, setSupportToDate] = useState("");
  const [supportSort, setSupportSort] = useState<"desc" | "asc">("desc");
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [dealDrafts, setDealDrafts] = useState<Record<string, Partial<Lead>>>({});
  const deleteLead = async () => {
    if (!leadToDelete?._id) return;

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/leads/${leadToDelete._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (handleUnauthorized(res)) return;
      if (!res.ok) {
        showToast("error", "❌ Failed to delete lead");
        return;
      }

      setLeads((prev) => prev.filter((l) => l._id !== leadToDelete._id));

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
    expectedAmount: 0,
    status: "New",
  });

  /* ================= TASK STATES ================= */
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showDeleteTaskModal, setShowDeleteTaskModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskItem | null>(null);
  const [newTask, setNewTask] = useState<TaskFormState>(createDefaultTaskForm());
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [viewingTask, setViewingTask] = useState<TaskItem | null>(null);
  const [taskCommentText, setTaskCommentText] = useState("");
  const [showPendingTasks, setShowPendingTasks] = useState(true);
  const [showInProgressTasks, setShowInProgressTasks] = useState(true);
  const [showCompletedTasks, setShowCompletedTasks] = useState(true);
  const [taskFromDate, setTaskFromDate] = useState("");
  const [taskToDate, setTaskToDate] = useState("");
  const [taskSort, setTaskSort] = useState<"desc" | "asc">("desc");

  const createLead = async () => {
    if (isSubmittingLead) return; // 🚀 prevent double click
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
      if (handleUnauthorized(res)) return;

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
        status: "New",
      });
    } catch (error) {
      console.error("Create lead error:", error);
    } finally {
      setIsSubmittingLead(false); // 🔥 always unlock button
    }
  };

  const updateLeadStatus = async (
    leadId: string | undefined,
    status: "New" | "Contacted" | "Interested" | "Lost",
  ) => {
    if (!leadId) return;

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/leads/${leadId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (handleUnauthorized(res)) return;

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update lead status");
      }

      const updatedLead = await res.json();
      setLeads((prev) =>
        prev.map((l) =>
          l._id === leadId
            ? {
                ...l,
                status: updatedLead.status,
                nextFollowUpAt: updatedLead.nextFollowUpAt || undefined,
              }
            : l,
        ),
      );
    } catch (err) {
      console.error("Update lead status error:", err);
      showToast("error", "❌ Failed to update lead status");
    }
  };

  const updateLeadFollowUpDate = async (leadId: string | undefined, nextDate: string) => {
    if (!leadId) return;

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/leads/${leadId}/follow-up`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nextFollowUpAt: nextDate }),
      });
      if (handleUnauthorized(res)) return;

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update follow-up date");
      }

      const updatedLead = await res.json();
      setLeads((prev) =>
        prev.map((l) =>
          l._id === leadId
            ? { ...l, nextFollowUpAt: updatedLead.nextFollowUpAt || undefined }
            : l,
        ),
      );
    } catch (err) {
      console.error("Update lead follow-up date error:", err);
      showToast("error", "❌ Failed to update follow-up date");
    }
  };

  const updateDealField = async (
    leadId: string | undefined,
    updates: Partial<Lead>,
  ) => {
    if (!leadId) return;

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      if (handleUnauthorized(res)) return;

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update deal");
      }

      const updatedLead = await res.json();
      setLeads((prev) =>
        prev.map((l) =>
          l._id === leadId
            ? { ...l, ...updatedLead }
            : l,
        ),
      );
      setDealDrafts((prev) => {
        const next = { ...prev };
        delete next[leadId];
        return next;
      });
    } catch (err) {
      console.error("Update deal error:", err);
      showToast("error", "❌ Failed to update deal");
    }
  };

  const getDealDraftValue = (
    lead: Lead,
    field: keyof Lead,
  ) => {
    const draft = lead._id ? dealDrafts[lead._id] : undefined;
    return draft && Object.prototype.hasOwnProperty.call(draft, field)
      ? draft[field]
      : lead[field];
  };

  const setDealDraftValue = (
    leadId: string | undefined,
    field: keyof Lead,
    value: string | number,
  ) => {
    if (!leadId) return;
    setDealDrafts((prev) => ({
      ...prev,
      [leadId]: {
        ...(prev[leadId] || {}),
        [field]: value,
      },
    }));
  };

  const normalizeTaskStatus = (value?: string): TaskStatus => {
    const v = (value || "").toLowerCase();
    if (v === "pending") return "Pending";
    if (v === "in-progress" || v === "in progress") return "In Progress";
    if (v === "waiting on customer") return "Waiting on Customer";
    if (v === "completed") return "Completed";
    if (v === "cancelled") return "Cancelled";
    return "Pending";
  };

  const fetchTasks = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (handleUnauthorized(res)) return;

      if (res.ok) {
        const data = await res.json();
        const normalized = (Array.isArray(data) ? data : []).map((task: TaskItem) => ({
          ...task,
          status: normalizeTaskStatus(task.status),
        }));
        setTasks(normalized);
      } else {
        showToast("error", "❌ Failed to fetch tasks");
      }
    } catch (err) {
      console.error("Fetch tasks error:", err);
      showToast("error", "❌ Failed to fetch tasks");
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: TaskStatus) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (handleUnauthorized(res)) return;

      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) =>
          prev.map((task) =>
            task._id === taskId ? { ...updated, status: normalizeTaskStatus(updated.status) } : task,
          ),
        );
      } else {
        showToast("error", "❌ Failed to update task status");
      }
    } catch (err) {
      console.error("Update task status error:", err);
      showToast("error", "❌ Failed to update task status");
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete?._id) return;
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/tasks/${taskToDelete._id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (handleUnauthorized(res)) return;

      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t._id !== taskToDelete._id));
        setShowDeleteTaskModal(false);
        setTaskToDelete(null);
      } else {
        showToast("error", "❌ Failed to delete task");
      }
    } catch (err) {
      console.error("Delete task error:", err);
      showToast("error", "❌ Failed to delete task");
    }
  };

  const handleCreateTask = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;
    const currentUserId = (user as any)?._id || user?.id;
    if (!newTask.title?.trim()) {
      showToast("warning", "⚠️ Task title is required");
      return;
    }
    const assignedId = newTask.assignedTo || currentUserId;
    if (!assignedId) {
      showToast("error", "❌ Missing user id. Please login again.");
      return;
    }

    try {
      const payload = {
        user: assignedId,
        assignedTo: assignedId,
        title: newTask.title.trim(),
        description: newTask.description?.trim() || "",
        status: newTask.status,
        dueDate: newTask.dueDate || undefined,
        reminderAt: newTask.reminderAt || undefined,
        relatedToType: newTask.relatedToType,
        relatedToId: newTask.relatedToId?.trim() || "",
        taskType: newTask.taskType,
      };

      const endpoint = editingTask?._id
        ? `${API_BASE_URL}/api/admin/tasks/${editingTask._id}`
        : `${API_BASE_URL}/api/admin/tasks`;
      const method = editingTask?._id ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (handleUnauthorized(res)) return;

      if (res.ok) {
        const updatedTask = await res.json();
        if (editingTask?._id) {
          setTasks((prev) =>
            prev.map((t) =>
              t._id === editingTask._id
                ? { ...updatedTask, status: normalizeTaskStatus(updatedTask.status) }
                : t,
            ),
          );
        } else {
          setTasks((prev) => [
            { ...updatedTask, status: normalizeTaskStatus(updatedTask.status) },
            ...prev,
          ]);
        }
        setShowCreateTask(false);
        setEditingTask(null);
        setNewTask(createDefaultTaskForm());
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast("error", `❌ ${errData.message || "Failed to create task"}`);
      }
    } catch (err) {
      console.error("Create task error:", err);
      showToast("error", "❌ Failed to create task");
    }
  };

  const openEditTask = (task: TaskItem) => {
    setEditingTask(task);
    setNewTask({
      title: task.title || "",
      relatedToType: task.relatedToType || "Lead",
      relatedToId: task.relatedToId || "",
      taskType: task.taskType || "Internal Task",
      status: normalizeTaskStatus(task.status),
      dueDate: task.dueDate ? toDateTimeLocalValue(task.dueDate) : "",
      reminderAt: task.reminderAt ? toDateTimeLocalValue(task.reminderAt) : "",
      assignedTo:
        typeof task.assignedTo === "string"
          ? task.assignedTo
          : task.assignedTo?._id || task.user?._id || "",
      description: task.description || "",
    });
    setShowCreateTask(true);
  };

  const addTaskComment = async () => {
    if (!viewingTask?._id) return;
    const token = localStorage.getItem("adminToken");
    if (!token) return;
    const text = taskCommentText.trim();
    if (!text) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/tasks/${viewingTask._id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      if (handleUnauthorized(res)) return;

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to add comment");
      }

      const updated = await res.json();
      const normalized = { ...updated, status: normalizeTaskStatus(updated.status) };
      setTasks((prev) => prev.map((t) => (t._id === viewingTask._id ? normalized : t)));
      setViewingTask(normalized);
      setTaskCommentText("");
    } catch (err) {
      console.error("Add task comment error:", err);
      showToast("error", "❌ Failed to add comment");
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
          u.email?.toLowerCase().includes(q),
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
      list = list.filter((o) => orderStatusFilter.includes(o.status));
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

  const allCustomers = useMemo(() => {
    const byCustomer = new Map<
      string,
      {
        id: string;
        accountName: string;
        phone: string;
        email: string;
        company: string;
        createdAt: string;
        address: string;
        contactName: string;
        contactEmail: string;
        contactPhone: string;
        contactMobile: string;
        orderCount: number;
        lastOrderAt: string;
      }
    >();

    orders.forEach((o) => {
      const id =
        o.userId?._id ||
        o.userId?.email ||
        o.address?.phone ||
        o.orderId ||
        o._id;
      if (!id) return;

      const inferredCreatedAt = o.userId?.createdAt || o.createdAt || "";
      const nextAccountName = o.userId?.name || o.address?.name || "Customer";
      const nextEmail = o.userId?.email || "";
      const nextPhone = o.address?.phone || o.userId?.phone || "";
      const nextCompany = o.company || o.userId?.company || "";
      const nextAddress = o.address?.street || o.address?.address || "";
      const nextContactName =
        o.contact?.name || o.address?.name || o.userId?.name || "";
      const nextContactEmail = o.contact?.email || o.userId?.email || "";
      const nextContactPhone = o.contact?.phone || o.address?.phone || "";
      const nextContactMobile = o.contact?.mobile || "";

      if (!byCustomer.has(id)) {
        byCustomer.set(id, {
          id: String(id),
          accountName: nextAccountName,
          phone: nextPhone,
          email: nextEmail,
          company: nextCompany,
          createdAt: inferredCreatedAt,
          address: nextAddress,
          contactName: nextContactName,
          contactEmail: nextContactEmail,
          contactPhone: nextContactPhone,
          contactMobile: nextContactMobile,
          orderCount: 1,
          lastOrderAt: o.createdAt || inferredCreatedAt,
        });
        return;
      }

      const current = byCustomer.get(id)!;
      current.orderCount += 1;
      current.accountName = current.accountName || nextAccountName;
      current.phone = current.phone || nextPhone;
      current.email = current.email || nextEmail;
      current.company = current.company || nextCompany;
      current.address = current.address || nextAddress;
      current.contactName = current.contactName || nextContactName;
      current.contactEmail = current.contactEmail || nextContactEmail;
      current.contactPhone = current.contactPhone || nextContactPhone;
      current.contactMobile = current.contactMobile || nextContactMobile;

      const currentCreatedTime = new Date(current.createdAt || 0).getTime();
      const nextCreatedTime = new Date(inferredCreatedAt || 0).getTime();
      if (!current.createdAt || (nextCreatedTime && nextCreatedTime < currentCreatedTime)) {
        current.createdAt = inferredCreatedAt || current.createdAt;
      }

      const currentLastOrderTime = new Date(current.lastOrderAt || 0).getTime();
      const nextLastOrderTime = new Date(o.createdAt || 0).getTime();
      if (nextLastOrderTime > currentLastOrderTime) {
        current.lastOrderAt = o.createdAt || current.lastOrderAt;
      }
    });

    const merged = Array.from(byCustomer.values()).map((customer) => ({
      ...customer,
      ...(customerEdits[customer.id] || {}),
    }));

    return merged.sort((a, b) => {
      const at = new Date(a.createdAt || a.lastOrderAt || 0).getTime();
      const bt = new Date(b.createdAt || b.lastOrderAt || 0).getTime();
      return bt - at;
    });
  }, [orders, customerEdits]);

  const customers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return allCustomers;
    return allCustomers.filter((c) =>
      [c.accountName, c.phone, c.email, c.company].some((value) =>
        String(value || "").toLowerCase().includes(q),
      ),
    );
  }, [allCustomers, customerSearch]);

  const selectedCustomer =
    viewingCustomerId
      ? allCustomers.find((c) => c.id === viewingCustomerId) || null
      : null;

  const reportsData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    const msPerDay = 24 * 60 * 60 * 1000;
    const rangeDaysByFilter: Record<"daily" | "weekly" | "monthly", number> = {
      daily: 1,
      weekly: 7,
      monthly: 30,
    };

    const allOrderTimes = orders
      .map((o) => new Date(o.createdAt).getTime())
      .filter((t) => !Number.isNaN(t));
    const earliestOrderTime = allOrderTimes.length ? Math.min(...allOrderTimes) : now.getTime();

    const start = new Date(now);
    if (reportFilter === "all") {
      start.setTime(earliestOrderTime);
    } else {
      const rangeDays = rangeDaysByFilter[reportFilter];
      start.setDate(start.getDate() - (rangeDays - 1));
    }
    start.setHours(0, 0, 0, 0);

    const reportRangeDays = Math.max(
      1,
      Math.ceil((now.getTime() - start.getTime()) / msPerDay) + 1,
    );

    const ordersInRange = orders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return !Number.isNaN(t) && t >= start.getTime();
    });

    const successfulOrders = ordersInRange.filter((o) => o.status === "SUCCESS");
    const failedOrders = ordersInRange.filter((o) => o.status === "FAILED");

    const totalOrders = ordersInRange.length;
    const totalRevenue = successfulOrders.reduce(
      (sum, o) => sum + Number(o.amount || 0),
      0,
    );
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const conversionRate =
      totalOrders > 0 ? (successfulOrders.length / totalOrders) * 100 : 0;
    const failedRate = totalOrders > 0 ? (failedOrders.length / totalOrders) * 100 : 0;

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const currentMonthRevenue = orders
      .filter((o) => {
        if (o.status !== "SUCCESS") return false;
        const t = new Date(o.createdAt).getTime();
        return t >= thisMonthStart.getTime();
      })
      .reduce((sum, o) => sum + Number(o.amount || 0), 0);

    const currentYearRevenue = orders
      .filter((o) => {
        if (o.status !== "SUCCESS") return false;
        const createdAt = new Date(o.createdAt);
        return createdAt.getFullYear() === currentYear;
      })
      .reduce((sum, o) => sum + Number(o.amount || 0), 0);

    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);
    const daysElapsed = Math.max(
      1,
      Math.min(
        Math.ceil((now.getTime() - yearStart.getTime()) / msPerDay) + 1,
        Math.ceil((yearEnd.getTime() - yearStart.getTime()) / msPerDay) + 1,
      ),
    );
    const daysInYear =
      Math.ceil((yearEnd.getTime() - yearStart.getTime()) / msPerDay) + 1;
    const projectedYearRevenue =
      daysElapsed > 0 ? (currentYearRevenue / daysElapsed) * daysInYear : 0;
    const targetRevenue = Math.max(projectedYearRevenue, currentYearRevenue, 1);
    const chartMidpoint = Math.round(targetRevenue / 2);

    const previousMonthRevenue = orders
      .filter((o) => {
        if (o.status !== "SUCCESS") return false;
        const t = new Date(o.createdAt).getTime();
        return t >= lastMonthStart.getTime() && t <= lastMonthEnd.getTime();
      })
      .reduce((sum, o) => sum + Number(o.amount || 0), 0);

    const growthMoM =
      previousMonthRevenue > 0
        ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        : currentMonthRevenue > 0
          ? 100
          : 0;

    const trendByDate = Array.from({ length: reportRangeDays }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      return { key, label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), revenue: 0 };
    });

    const trendIndex = new Map(trendByDate.map((x, idx) => [x.key, idx]));
    successfulOrders.forEach((o) => {
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      const idx = trendIndex.get(key);
      if (idx !== undefined) {
        trendByDate[idx].revenue += Number(o.amount || 0);
      }
    });

    const statusCounts = {
      SUCCESS: orders.filter((o) => o.status === "SUCCESS").length,
      PENDING: orders.filter((o) => o.status === "PENDING").length,
      FAILED: orders.filter((o) => o.status === "FAILED").length,
    };

    const getTopCustomers = (sourceOrders: any[]) => {
      const customerMap = new Map<string, { name: string; totalSpent: number }>();

      sourceOrders.forEach((o) => {
        const key =
          o.userId?._id ||
          o.userId?.email ||
          o.address?.phone ||
          o._id;
        const name =
          o.userId?.name ||
          o.address?.name ||
          o.userId?.email ||
          "Guest";
        const current = customerMap.get(key) || { name, totalSpent: 0 };
        current.totalSpent += Number(o.amount || 0);
        customerMap.set(key, current);
      });

      return Array.from(customerMap.values())
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 3);
    };

    const topInSelectedRange = getTopCustomers(ordersInRange);
    const topCustomers =
      topInSelectedRange.length >= 3 ? topInSelectedRange : getTopCustomers(orders);

    const getOrderUnits = (order: any) =>
      Array.isArray(order.items) && order.items.length > 0
        ? order.items.reduce(
            (sum: number, item: any) => sum + Number(item.quantity || 0),
            0,
          )
        : 1;

    const successfulOrdersForSales = orders
      .filter((order) => order.status === "SUCCESS")
      .map((order) => ({ order, createdAt: new Date(order.createdAt) }))
      .filter(({ createdAt }) => !Number.isNaN(createdAt.getTime()));

    let productSalesSeries: Array<{ label: string; value: number }> = [];
    let productSalesSubtitle = "Monthly";

    if (reportFilter === "daily") {
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const totalUnits = successfulOrdersForSales.reduce((sum, { order, createdAt }) => {
        if (createdAt >= dayStart && createdAt < dayEnd) {
          return sum + getOrderUnits(order);
        }
        return sum;
      }, 0);

      productSalesSeries = [{
        label: now.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        value: totalUnits,
      }];
      productSalesSubtitle = "Daily";
    } else if (reportFilter === "weekly") {
      const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const weekStart = new Date(now);
      const day = weekStart.getDay();
      const offsetFromMonday = day === 0 ? 6 : day - 1;
      weekStart.setDate(weekStart.getDate() - offsetFromMonday);
      weekStart.setHours(0, 0, 0, 0);

      const weekBuckets = Array.from({ length: 7 }, (_, idx) => ({
        label: labels[idx],
        value: 0,
      }));

      successfulOrdersForSales.forEach(({ order, createdAt }) => {
        if (createdAt < weekStart || createdAt > now) return;
        const index = Math.floor((createdAt.getTime() - weekStart.getTime()) / msPerDay);
        if (index >= 0 && index < 7) {
          weekBuckets[index].value += getOrderUnits(order);
        }
      });

      productSalesSeries = weekBuckets;
      productSalesSubtitle = "Weekly";
    } else if (reportFilter === "all") {
      const years = Array.from(
        new Set(successfulOrdersForSales.map(({ createdAt }) => createdAt.getFullYear())),
      ).sort((a, b) => a - b);

      productSalesSeries = years.map((year) => {
        const value = successfulOrdersForSales.reduce((sum, { order, createdAt }) => {
          if (createdAt.getFullYear() === year) {
            return sum + getOrderUnits(order);
          }
          return sum;
        }, 0);

        return {
          label: String(year),
          value,
        };
      });

      if (productSalesSeries.length === 0) {
        productSalesSeries = [{ label: String(now.getFullYear()), value: 0 }];
      }
      productSalesSubtitle = "All Time";
    } else {
      const monthLabels = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      const monthlyBuckets = Array.from({ length: 12 }, () => ({
        units: 0,
      }));

      successfulOrdersForSales.forEach(({ order, createdAt }) => {
        if (createdAt.getFullYear() !== currentYear) return;
        const monthIndex = createdAt.getMonth();
        monthlyBuckets[monthIndex].units += getOrderUnits(order);
      });

      productSalesSeries = monthLabels.map((label, idx) => ({
        label,
        value: Number(monthlyBuckets[idx].units.toFixed(1)),
      }));
      productSalesSubtitle = "Monthly";
    }

    return {
      totalRevenue,
      totalOrders,
      totalCustomers: allCustomers.length,
      aov,
      conversionRate,
      failedRate,
      growthMoM,
      currentMonthRevenue,
      currentYearRevenue,
      projectedYearRevenue,
      targetRevenue,
      chartMidpoint,
      trendByDate,
      statusCounts,
      topCustomers,
      productSalesSeries,
      productSalesSubtitle,
    };
  }, [allCustomers.length, orders, reportFilter]);

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
          l.email?.toLowerCase().includes(q),
      );
    }

    // STATUS FILTER
    if (leadStatusFilter.length) {
      list = list.filter((l) => leadStatusFilter.includes(l.status || "New"));
    }

    // SORT
    list.sort((a, b) => {
      const da = new Date(a.createdAt || "").getTime();
      const db = new Date(b.createdAt || "").getTime();
      return leadSort === "asc" ? da - db : db - da;
    });

    return list;
  }, [leads, leadSearch, leadStatusFilter, leadSort]);

  const toDateInputValue = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const formatDurationFromMs = (durationMs: number) => {
    if (!Number.isFinite(durationMs) || durationMs <= 0) return "0m";
    const totalMinutes = Math.floor(durationMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const toDateTimeLocalValue = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}`;
  };

  const getSupportSlaText = (msg: SupportMessage) => {
    const createdMs = msg.createdAt ? new Date(msg.createdAt).getTime() : NaN;
    const deadlineMs = msg.slaDeadlineAt
      ? new Date(msg.slaDeadlineAt).getTime()
      : Number.isNaN(createdMs)
        ? NaN
        : createdMs + 24 * 60 * 60 * 1000;

    if (Number.isNaN(deadlineMs)) return "⏳ SLA: unavailable";

    if (msg.status === "Resolved" && msg.resolvedAt) {
      const resolvedMs = new Date(msg.resolvedAt).getTime();
      if (!Number.isNaN(resolvedMs) && resolvedMs <= deadlineMs) {
        return "✅ SLA: met";
      }
      if (!Number.isNaN(resolvedMs)) {
        return `⚠️ SLA: breached by ${formatDurationFromMs(resolvedMs - deadlineMs)}`;
      }
    }

    const remainingMs = deadlineMs - slaNow;
    if (remainingMs >= 0) {
      return `⏳ SLA: ${formatDurationFromMs(remainingMs)} remaining`;
    }
    return `⚠️ SLA: overdue by ${formatDurationFromMs(Math.abs(remainingMs))}`;
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSlaNow(Date.now());
    }, 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  // ===============================
  // FILTERED SUPPORT MESSAGES
  // ===============================
  const filteredSupportMessages = useMemo(() => {
    let list = [...supportMessages];

    list = list.filter((msg) => {
      const status = (msg.status || "").toLowerCase();
      if (!showNewSupport && status === "new") return false;
      if (!showInProgressSupport && status === "in progress") return false;
      if (!showResolvedSupport && status === "resolved") return false;
      return true;
    });

    list = list.filter((msg) => {
      if (!msg.createdAt) return !supportFromDate && !supportToDate;

      const t = new Date(msg.createdAt).getTime();
      if (Number.isNaN(t)) return !supportFromDate && !supportToDate;

      if (supportFromDate) {
        const from = new Date(supportFromDate).setHours(0, 0, 0, 0);
        if (t < from) return false;
      }

      if (supportToDate) {
        const to = new Date(supportToDate).setHours(23, 59, 59, 999);
        if (t > to) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime();
      const db = new Date(b.createdAt || 0).getTime();
      return supportSort === "asc" ? da - db : db - da;
    });

    return list;
  }, [
    supportMessages,
    showNewSupport,
    showInProgressSupport,
    showResolvedSupport,
    supportFromDate,
    supportToDate,
    supportSort,
  ]);

  // ===============================
  // FILTERED TASKS
  // ===============================
  const filteredTasks = useMemo(() => {
    let list = [...tasks];

    list = list.filter((task) => {
      const status = normalizeTaskStatus(task.status);
      if (!showPendingTasks && status === "Pending") return false;
      if (!showInProgressTasks && status === "In Progress") return false;
      if (!showCompletedTasks && status === "Completed") return false;
      return true;
    });

    list = list.filter((task) => {
      const rawDate = task.dueDate || task.createdAt;
      if (!rawDate) return !taskFromDate && !taskToDate;

      const t = new Date(rawDate).getTime();
      if (Number.isNaN(t)) return !taskFromDate && !taskToDate;

      if (taskFromDate) {
        const from = new Date(taskFromDate).setHours(0, 0, 0, 0);
        if (t < from) return false;
      }

      if (taskToDate) {
        const to = new Date(taskToDate).setHours(23, 59, 59, 999);
        if (t > to) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      const da = new Date(a.dueDate || a.createdAt || 0).getTime();
      const db = new Date(b.dueDate || b.createdAt || 0).getTime();
      return taskSort === "asc" ? da - db : db - da;
    });

    return list;
  }, [
    tasks,
    showPendingTasks,
    showInProgressTasks,
    showCompletedTasks,
    taskFromDate,
    taskToDate,
    taskSort,
  ]);

  const isTaskOverdue = (task: TaskItem) => {
    const status = normalizeTaskStatus(task.status);
    if (status === "Completed" || status === "Cancelled") return false;
    const dueMs = task.dueDate ? new Date(task.dueDate).getTime() : NaN;
    if (Number.isNaN(dueMs)) return false;
    return dueMs < Date.now();
  };

  type AdminNotification = {
    id: string;
    category: "lead" | "support" | "task";
    severity: "high" | "medium";
    title: string;
    detail: string;
    whenText: string;
    whenMs: number;
  };

  const notifications = useMemo<AdminNotification[]>(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const items: AdminNotification[] = [];

    leads.forEach((lead) => {
      if (!lead._id) return;
      if (!["Contacted", "Interested"].includes(lead.status || "")) return;
      if (!lead.nextFollowUpAt) return;

      const followUpMs = new Date(lead.nextFollowUpAt).getTime();
      if (Number.isNaN(followUpMs)) return;

      const diff = followUpMs - now;
      if (diff > oneDayMs) return;

      const fullName = `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "Lead";
      const isOverdue = diff < 0;

      items.push({
        id: `lead-${lead._id}`,
        category: "lead",
        severity: isOverdue ? "high" : "medium",
        title: `Lead Follow-up: ${fullName}`,
        detail: isOverdue
          ? `Next Follow Up is overdue by ${formatDurationFromMs(Math.abs(diff))}.`
          : `Next Follow Up is due in ${formatDurationFromMs(diff)}.`,
        whenText: new Date(followUpMs).toLocaleString(),
        whenMs: followUpMs,
      });
    });

    supportMessages.forEach((msg) => {
      const deadlineMs = msg.slaDeadlineAt ? new Date(msg.slaDeadlineAt).getTime() : NaN;
      if (Number.isNaN(deadlineMs)) return;
      if ((msg.status || "").toLowerCase() === "resolved") return;

      const diff = deadlineMs - now;
      if (diff > oneDayMs) return;

      const isOverdue = diff < 0;
      items.push({
        id: `support-${msg._id}`,
        category: "support",
        severity: isOverdue ? "high" : "medium",
        title: `Support SLA: ${msg.ticketId || msg.name}`,
        detail: isOverdue
          ? `SLA is overdue by ${formatDurationFromMs(Math.abs(diff))}.`
          : `SLA will expire in ${formatDurationFromMs(diff)}.`,
        whenText: new Date(deadlineMs).toLocaleString(),
        whenMs: deadlineMs,
      });
    });

    tasks.forEach((task, index) => {
      const taskStatus = (task.status || "").toLowerCase();
      if (taskStatus === "completed") return;

      const dueMs = task.dueDate ? new Date(task.dueDate).getTime() : NaN;
      if (Number.isNaN(dueMs)) return;

      const diff = dueMs - now;
      if (diff > oneDayMs) return;

      const isOverdue = diff < 0;
      const taskId = task._id || index;
      items.push({
        id: `task-${taskId}`,
        category: "task",
        severity: isOverdue ? "high" : "medium",
        title: `Task Deadline: ${task.title || "Untitled Task"}`,
        detail: isOverdue
          ? `Task is overdue by ${formatDurationFromMs(Math.abs(diff))}.`
          : `Task is due in ${formatDurationFromMs(diff)}.`,
        whenText: new Date(dueMs).toLocaleString(),
        whenMs: dueMs,
      });
    });

    return items.sort((a, b) => {
      const severityOrder = (x: AdminNotification["severity"]) =>
        x === "high" ? 0 : 1;
      if (severityOrder(a.severity) !== severityOrder(b.severity)) {
        return severityOrder(a.severity) - severityOrder(b.severity);
      }
      return a.whenMs - b.whenMs;
    });
  }, [leads, supportMessages, tasks]);

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
  const [viewingWithdrawal, setViewingWithdrawal] =
    useState<WithdrawalRequest | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [stats, setStats] = useState({
    totalInfluencers: 0,
    pendingApprovals: 0,
    pendingWithdrawals: { total: 0, count: 0 },
  });

  // Product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isLoadingPromos, setIsLoadingPromos] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [promoForm, setPromoForm] = useState<PromoFormData>(
    createDefaultPromoFormData(),
  );
  const [promoFormError, setPromoFormError] = useState("");
  const [isSavingPromo, setIsSavingPromo] = useState(false);
  const [confirmingDeleteProduct, setConfirmingDeleteProduct] =
    useState<any>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(
    createDefaultProductForm(),
  );

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
  const authToastShownRef = useRef(false);

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
    const view = params.get("view");
    const category = params.get("category");

    if (isAuthenticated && view === "products") {
      setCurrentView("products");
      setShowProductForm(true);

      if (category) {
        const normalizedCategory = normalizeCategory(category) as
          | AdminProductCategory
          | undefined;

        if (
          normalizedCategory &&
          ADMIN_PRODUCT_CATEGORIES.includes(normalizedCategory)
        ) {
          setProductForm((prev) => ({
            ...prev,
            category: normalizedCategory,
            subcategory: "",
          }));
        }
      }
    }
  }, [location.search, isAuthenticated]);

  // Lazy load data when view changes
  useEffect(() => {
    if (!isAuthenticated) return;

    switch (currentView) {
      case "users":
        fetchUsersData();
        break;
      case "all-influencers":
        fetchAllInfluencersData();
        break;
      case "withdrawals":
        fetchWithdrawalsData();
        break;
      case "orders":
        fetchOrdersData();
        break;
      case "customers":
        fetchOrdersData();
        break;
      case "reports":
        fetchOrdersData();
        fetchLeadsData();
        break;
      case "products":
        fetchProductsData();
        break;
      case "promo":
        fetchPromoCodes();
        break;
      case "leads":
        fetchLeadsData();
        break;
      case "deals":
        fetchLeadsData();
        break;
      case "tasks":
        fetchTasks();
        fetchUsersData();
        break;
      case "support":
        fetchSupportMessages();
        break;
      case "notifications":
        fetchLeadsData();
        fetchTasks();
        fetchSupportMessages();
        break;

    }
  }, [currentView, isAuthenticated]);

  // Auto-close mobile navigation on view changes.
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [currentView]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Toast notification functions
  const showToast = (
    type: "success" | "error" | "info" | "warning",
    message: string,
  ) => {
    const id = toastIdCounter;
    setToastIdCounter(id + 1);

    const newToast: Toast = { id, type, message };
    setToasts((prev) => [...prev, newToast]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t)),
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 5000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t)),
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  };

  const clearAdminSession = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    setIsAuthenticated(false);
    setUser(null);
    setCurrentView("login");
  };

  const handleUnauthorized = (res: Response) => {
    if (res.status !== 401) return false;
    clearAdminSession();
    if (!authToastShownRef.current) {
      authToastShownRef.current = true;
      showToast("error", "🔒 Session expired. Please login again.");
    }
    return true;
  };

  const checkAuth = async () => {
    let token = localStorage.getItem("adminToken");
    let storedUser = localStorage.getItem("adminUser");

    // 🔄 SYNC: If admin panel session is missing but storefront admin session exists, sync them
    if (!token || !storedUser) {
      const storefrontToken = localStorage.getItem("token");
      const storefrontUserRaw = localStorage.getItem("user");
      if (storefrontToken && storefrontUserRaw) {
        try {
          const sfUser = JSON.parse(storefrontUserRaw);
          if (sfUser.role === "admin") {
            // Set for admin panel
            localStorage.setItem("adminToken", storefrontToken);
            localStorage.setItem("adminUser", storefrontUserRaw);
            token = storefrontToken;
            storedUser = storefrontUserRaw;
          }
        } catch (e) {
          console.error("Failed to parse storefront user for sync", e);
        }
      }
    }

    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const validationRes = await fetch(`${API_BASE_URL}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (handleUnauthorized(validationRes)) return;
        if (!validationRes.ok) {
          clearAdminSession();
          return;
        }

        authToastShownRef.current = false;
        setIsAuthenticated(true);
        setUser(parsedUser);
        setCurrentView("dashboard");
        fetchDashboardData(token);
      } catch (err) {
        console.error("Auth validation error:", err);
        clearAdminSession();
      }
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
      const statsRes = await fetch(
        `${API_BASE_URL}/api/admin/influencer-manage/stats/overview`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (handleUnauthorized(statsRes)) return;
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      // Only fetch pending influencers for initial dashboard view
      const influencersRes = await fetch(
        `${API_BASE_URL}/api/admin/influencer-manage/pending`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (handleUnauthorized(influencersRes)) return;
      if (influencersRes.ok) {
        const data = await influencersRes.json();
        setPendingInfluencers(data);
        setLoadedData((prev) => ({ ...prev, pendingInfluencers: true }));
      }

      const [usersRes, ordersRes, productsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/admin/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/admin/products`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!handleUnauthorized(usersRes) && usersRes.ok) {
        const data = await usersRes.json();
        setAllUsers(data);
        setLoadedData((prev) => ({ ...prev, users: true }));
      }

      if (!handleUnauthorized(ordersRes) && ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data);
        setLoadedData((prev) => ({ ...prev, orders: true }));
      }

      if (!handleUnauthorized(productsRes) && productsRes.ok) {
        const data = await productsRes.json();
        if (Array.isArray(data)) {
          setProducts(data.map((item: Product) => normalizeAdminProduct(item)));
        }
        setLoadedData((prev) => ({ ...prev, products: true }));
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

    setLoadingData((prev) => ({ ...prev, users: true }));
    try {
      const usersRes = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (handleUnauthorized(usersRes)) return;
      if (usersRes.ok) {
        const data = await usersRes.json();
        setAllUsers(data);
        setLoadedData((prev) => ({ ...prev, users: true }));
      } else {
        showToast("error", "❌ Failed to fetch users");
      }
    } catch (err) {
      console.error("Fetch users error:", err);
    } finally {
      setLoadingData((prev) => ({ ...prev, users: false }));
    }
  };

  const fetchAllInfluencersData = async () => {
    if (loadedData.allInfluencers) return; // Already loaded

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setLoadingData((prev) => ({ ...prev, allInfluencers: true }));
    try {
      const allInfluencersRes = await fetch(
        `${API_BASE_URL}/api/admin/influencer-manage`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (handleUnauthorized(allInfluencersRes)) return;
      if (allInfluencersRes.ok) {
        const data = await allInfluencersRes.json();
        setAllInfluencers(data);
        setLoadedData((prev) => ({ ...prev, allInfluencers: true }));
      } else {
        showToast("error", "❌ Failed to fetch influencers");
      }
    } catch (err) {
      console.error("Fetch all influencers error:", err);
    } finally {
      setLoadingData((prev) => ({ ...prev, allInfluencers: false }));
    }
  };

  const fetchWithdrawalsData = async () => {
    if (loadedData.withdrawals) return; // Already loaded

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setLoadingData((prev) => ({ ...prev, withdrawals: true }));
    try {
      const withdrawalsRes = await fetch(
        `${API_BASE_URL}/api/admin/influencer-manage/withdrawals/all`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (handleUnauthorized(withdrawalsRes)) return;
      if (withdrawalsRes.ok) {
        const data = await withdrawalsRes.json();
        setWithdrawals(
          Array.isArray(data)
            ? data.filter(
                (w) => w.status === "pending" || w.status === "approved",
              )
            : [],
        );
        setLoadedData((prev) => ({ ...prev, withdrawals: true }));
      } else {
        showToast("error", "❌ Failed to fetch withdrawals");
      }
    } catch (err) {
      console.error("Fetch withdrawals error:", err);
    } finally {
      setLoadingData((prev) => ({ ...prev, withdrawals: false }));
    }
  };

  const fetchOrdersData = async () => {
    if (loadedData.orders) return; // Already loaded

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setLoadingData((prev) => ({ ...prev, orders: true }));
    try {
      const ordersRes = await fetch(`${API_BASE_URL}/api/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (handleUnauthorized(ordersRes)) return;
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data);
        setLoadedData((prev) => ({ ...prev, orders: true }));
      } else {
        showToast("error", "❌ Failed to fetch orders");
      }
    } catch (err) {
      console.error("Fetch orders error:", err);
    } finally {
      setLoadingData((prev) => ({ ...prev, orders: false }));
    }
  };

  const updateOrderDeliveryStatus = async (orderId: string, isDelivered: boolean) => {
    if (!orderId || updatingDeliveryOrderId) return;

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setUpdatingDeliveryOrderId(orderId);

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/orders/${orderId}/delivery`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isDelivered }),
      });
      if (handleUnauthorized(res)) return;

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("error", data.message || "❌ Failed to update delivery status");
        return;
      }

      const updatedOrder = data.order;
      setOrders((prev) =>
        prev.map((order) => (order._id === updatedOrder._id ? { ...order, ...updatedOrder } : order)),
      );

      setViewingOrder((prev: any) =>
        prev && prev._id === updatedOrder._id ? { ...prev, ...updatedOrder } : prev,
      );

      showToast(
        "success",
        isDelivered ? "✅ Marked as delivered" : "🟡 Marked as not delivered",
      );
    } catch (err) {
      console.error("Update delivery status error:", err);
      showToast("error", "❌ Failed to update delivery status");
    } finally {
      setUpdatingDeliveryOrderId(null);
    }
  };

  const fetchProductsData = async () => {
    if (loadedData.products) return; // Already loaded

    setLoadingData((prev) => ({ ...prev, products: true }));
    try {
      const productsRes = await fetch(`${API_BASE_URL}/api/products`);
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(
          (Array.isArray(data.products) ? data.products : []).map(
            (item: Product) => normalizeAdminProduct(item),
          ),
        );
        setLoadedData((prev) => ({ ...prev, products: true }));
      }
    } catch (err) {
      console.error("Fetch products error:", err);
    } finally {
      setLoadingData((prev) => ({ ...prev, products: false }));
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

      authToastShownRef.current = false;
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
    authToastShownRef.current = false;
    clearAdminSession();
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
          },
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
          },
        );

        const data = await backendRes.json();

        if (!backendRes.ok) {
          setError(data.message || "Google login failed");
          return;
        }

        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("adminUser", JSON.stringify(data.user));

        authToastShownRef.current = false;
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
  const handleApproveInfluencer = async (
    influencerId: string,
    approve: boolean,
  ) => {
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
      if (handleUnauthorized(res)) return;

      if (res.ok) {
        // Refresh data - only update pending list and stats
        setPendingInfluencers(
          pendingInfluencers.filter((inf) => inf._id !== influencerId),
        );

        // Refresh stats only (not all data)
        const statsRes = await fetch(
          `${API_BASE_URL}/api/admin/influencer-manage/stats/overview`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (handleUnauthorized(statsRes)) return;
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }

        // Mark all influencers as needing refresh if that view is active
        if (loadedData.allInfluencers) {
          setLoadedData((prev) => ({ ...prev, allInfluencers: false }));
        }
      } else {
        const data = await res.json().catch(() => null);
        showToast(
          "error",
          data?.message || `❌ Failed to ${approve ? "approve" : "reject"} influencer`,
        );
      }
    } catch (err) {
      console.error("Influencer approval error:", err);
      showToast(
        "error",
        `❌ Failed to ${approve ? "approve" : "reject"} influencer`,
      );
    }
  };

  const openGmail = (email: string, name: string) => {
    const subject = encodeURIComponent("Regarding Your StickToon Account");
    const body = encodeURIComponent(
      `Hi ${name},\n\nWe wanted to connect with you regarding your StickToon account.\n\nRegards,\nStickToon Team`,
    );

    const gmailURL = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`;

    window.open(gmailURL, "_blank");
  };

  /* ===========================
     WITHDRAWAL APPROVAL
  =========================== */
  const handleProcessWithdrawal = async (
    withdrawalId: string,
    status: "pending" | "approved" | "paid" | "rejected",
    transactionId?: string,
  ) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/influencer-manage/withdrawals/${withdrawalId}/process`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status, transactionId }),
        },
      );
      if (handleUnauthorized(res)) return;

      if (res.ok) {
        const result = await res.json();
        // Refresh - only update withdrawal list and stats
        setWithdrawals((prev) =>
          status === "approved" || status === "pending"
            ? prev.map((w) =>
                w._id === withdrawalId
                  ? {
                      ...w,
                      status,
                      adminNote: result.withdrawal?.adminNote || w.adminNote,
                      transactionId:
                        result.withdrawal?.transactionId || w.transactionId,
                      processedAt:
                        result.withdrawal?.processedAt || w.processedAt,
                    }
                  : w,
              )
            : prev.filter((w) => w._id !== withdrawalId),
        );
        setViewingWithdrawal((prev) =>
          prev && prev._id === withdrawalId
            ? {
                ...prev,
                status,
                adminNote: result.withdrawal?.adminNote || prev.adminNote,
                transactionId:
                  result.withdrawal?.transactionId || prev.transactionId,
                processedAt: result.withdrawal?.processedAt || prev.processedAt,
              }
            : prev,
        );

        // Refresh stats only (not all data)
        const statsRes = await fetch(
          `${API_BASE_URL}/api/admin/influencer-manage/stats/overview`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (handleUnauthorized(statsRes)) return;
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
    const targetUser = allUsers.find((u) => u._id === userId);
    if (targetUser?.role === "admin" && user?.email !== SUPER_ADMIN_EMAIL) {
      showToast("error", "🔒 Only super admin can delete other admins");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (handleUnauthorized(res)) return;

      if (res.ok) {
        setAllUsers(allUsers.filter((u) => u._id !== userId));
        setConfirmingDelete(null);
      }
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  };

  const handleUpdateUser = async (
    userId: string,
    updates: {
      name?: string;
      email?: string;
      password?: string;
      avatar?: string;
    },
  ) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    const targetUser = allUsers.find((u) => u._id === userId);

    try {
      let endpoint = `${API_BASE_URL}/api/admin/users/${userId}`;

      // Super admin can use the full edit endpoint if changing password or avatar
      if ((updates.password || updates.avatar) && isSuperAdmin) {
        endpoint = `${API_BASE_URL}/api/admin/users/${userId}/super-edit`;
      } else if (targetUser?.role === "admin" && !isSuperAdmin) {
        showToast("error", "🔒 Only super admin can update other admins");
        return;
      }

      const res = await fetch(endpoint, {
        method: endpoint.includes("/super-edit") ? "PUT" : "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      if (handleUnauthorized(res)) return;

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
      const res = await fetch(
        `${API_BASE_URL}/api/admin/users/${userId}/reset-password`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ newPassword }),
        },
      );
      if (handleUnauthorized(res)) return;

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
      if (handleUnauthorized(res)) return;

      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      } else {
        showToast("error", "❌ Failed to fetch leads");
      }
    } catch (err) {
      console.error("Fetch leads error:", err);
    }
  };

  const fetchSupportMessages = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setIsLoadingSupportMessages(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/support`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (handleUnauthorized(res)) return;

      if (res.ok) {
        const data = await res.json();
        setSupportMessages(data);
      } else {
        showToast("error", "❌ Failed to fetch support inbox");
      }
    } catch (err) {
      console.error("Fetch support messages error:", err);
      showToast("error", "❌ Failed to fetch support inbox");
    } finally {
      setIsLoadingSupportMessages(false);
    }
  };

  const updateSupportMessageStatus = async (
    messageId: string,
    status: "New" | "In Progress" | "Resolved",
  ) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/support/${messageId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (handleUnauthorized(res)) return;

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update support message status");
      }

      const updated = await res.json();
      setSupportMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? {
                ...msg,
                status: updated.status,
                firstResponseAt: updated.firstResponseAt,
                resolvedAt: updated.resolvedAt,
              }
            : msg,
        ),
      );
    } catch (err) {
      console.error("Update support message status error:", err);
      showToast("error", "❌ Failed to update support message status");
    }
  };

  const saveSupportInternalNote = async (messageId: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    const draftNote = supportInternalNotes[messageId];
    const message = supportMessages.find((msg) => msg._id === messageId);
    const fallbackNote = message?.internalNote || "";
    const internalNote = (draftNote ?? fallbackNote).trim();

    setSavingSupportNoteId(messageId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/support/${messageId}/internal-note`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ internalNote }),
        },
      );
      if (handleUnauthorized(res)) return;

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to save internal note");
      }

      const updated = await res.json();
      setSupportMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, internalNote: updated.internalNote || "" } : msg,
        ),
      );
      setSupportInternalNotes((prev) => ({
        ...prev,
        [messageId]: updated.internalNote || "",
      }));
      showToast("success", "✅ Internal note saved");
    } catch (err) {
      console.error("Save support internal note error:", err);
      showToast("error", "❌ Failed to save internal note");
    } finally {
      setSavingSupportNoteId(null);
    }
  };

  const saveSupportSlaDeadline = async (messageId: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    const draftSla = supportSlaDeadlines[messageId];
    if (!draftSla) return;

    setSavingSupportSlaId(messageId);
    try {
      const parsed = new Date(draftSla);
      if (Number.isNaN(parsed.getTime())) {
        showToast("error", "❌ Invalid SLA deadline");
        return;
      }
      const slaDeadlineAt = parsed.toISOString();

      const res = await fetch(
        `${API_BASE_URL}/api/admin/support/${messageId}/sla-deadline`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ slaDeadlineAt }),
        },
      );
      if (handleUnauthorized(res)) return;

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update SLA deadline");
      }

      const updated = await res.json();
      setSupportMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, slaDeadlineAt: updated.slaDeadlineAt } : msg,
        ),
      );
      setSupportSlaDeadlines((prev) => ({
        ...prev,
        [messageId]: toDateTimeLocalValue(updated.slaDeadlineAt),
      }));
      showToast("success", "✅ SLA deadline updated");
    } catch (err) {
      console.error("Update support SLA deadline error:", err);
      showToast("error", "❌ Failed to update SLA deadline");
    } finally {
      setSavingSupportSlaId(null);
    }
  };

  const sendSupportReply = async () => {
    if (!replyingSupportMessage) return;

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    const reply = supportReplyText.trim();
    if (!reply) {
      showToast("warning", "⚠️ Reply message is required");
      return;
    }

    setIsSendingSupportReply(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/support/${replyingSupportMessage._id}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reply }),
        },
      );
      if (handleUnauthorized(res)) return;

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to send support reply");
      }

      const data = await res.json();
      if (data?.status) {
        setSupportMessages((prev) =>
          prev.map((msg) =>
            msg._id === replyingSupportMessage._id
              ? {
                  ...msg,
                  status: data.status,
                  firstResponseAt:
                    data.supportMessage?.firstResponseAt ?? msg.firstResponseAt,
                  resolvedAt: data.supportMessage?.resolvedAt ?? msg.resolvedAt,
                }
              : msg,
          ),
        );
      }

      showToast("success", "✅ Reply sent successfully");
      setSupportReplyText("");
      setReplyingSupportMessage(null);
    } catch (err) {
      console.error("Send support reply error:", err);
      showToast("error", "❌ Failed to send reply");
    } finally {
      setIsSendingSupportReply(false);
    }
  };

  const handleDeleteSupportMessage = async () => {
    if (!supportMessageToDelete?._id) return;

    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setIsDeletingSupportMessage(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/support/${supportMessageToDelete._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (handleUnauthorized(res)) return;

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete support message");
      }

      setSupportMessages((prev) =>
        prev.filter((msg) => msg._id !== supportMessageToDelete._id),
      );
      setSupportMessageToDelete(null);
      showToast("success", "✅ Support message deleted");
    } catch (err) {
      console.error("Delete support message error:", err);
      showToast("error", "❌ Failed to delete support message");
    } finally {
      setIsDeletingSupportMessage(false);
    }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    // Check if trying to modify admin without super admin privileges
    const targetUser = allUsers.find((u) => u._id === userId);
    if (targetUser?.role === "admin" && user?.email !== SUPER_ADMIN_EMAIL) {
      showToast("error", "🔒 Only super admin can modify other admins");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/users/${userId}/role`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role }),
        },
      );
      if (handleUnauthorized(res)) return;

      if (res.ok) {
        const data = await res.json();
        setAllUsers(allUsers.map((u) => (u._id === userId ? data.user : u)));
      }
    } catch (err) {
      console.error("Error updating role:", err);
    }
  };

  const isPromoExpired = (date: string) => new Date(date).getTime() < Date.now();

  const fetchPromoCodes = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setIsLoadingPromos(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/promo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (handleUnauthorized(res)) return;

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to fetch promo codes");
      }

      const data = await res.json();
      setPromos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch promo codes error:", err);
      showToast("error", "❌ Failed to fetch promo codes");
    } finally {
      setIsLoadingPromos(false);
    }
  };

  const openPromoModal = (promo?: PromoCode) => {
    if (promo) {
      setEditingPromoId(promo._id);
      setPromoForm({
        code: promo.code,
        promoType: promo.promoType || "company",
        discountType: promo.discountType || "percentage",
        discountValue: promo.discountValue || 0,
        minOrderAmount: promo.minOrderAmount || 0,
        maxDiscount: promo.maxDiscount || null,
        usageLimit: promo.usageLimit || null,
        validFrom: promo.validFrom ? String(promo.validFrom).split("T")[0] : "",
        validUntil: promo.validUntil ? String(promo.validUntil).split("T")[0] : "",
        description: promo.description || "",
        earningPerUnit: promo.earningPerUnit || 5,
      });
    } else {
      setEditingPromoId(null);
      setPromoForm(createDefaultPromoFormData());
    }
    setPromoFormError("");
    setShowPromoModal(true);
  };

  const savePromoCode = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    if (!promoForm.code.trim()) {
      setPromoFormError("Promo code is required");
      return;
    }
    if (!promoForm.discountValue || promoForm.discountValue <= 0) {
      setPromoFormError("Discount value must be greater than 0");
      return;
    }
    if (!promoForm.validUntil) {
      setPromoFormError("Valid until date is required");
      return;
    }

    setIsSavingPromo(true);
    setPromoFormError("");
    try {
      const endpoint = editingPromoId
        ? `${API_BASE_URL}/api/admin/promo/${editingPromoId}`
        : `${API_BASE_URL}/api/admin/promo`;
      const method = editingPromoId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...promoForm,
          code: promoForm.code.toUpperCase().trim(),
          maxDiscount: promoForm.maxDiscount || null,
          usageLimit: promoForm.usageLimit || null,
        }),
      });
      if (handleUnauthorized(res)) return;

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to save promo code");
      }

      setShowPromoModal(false);
      setEditingPromoId(null);
      setPromoForm(createDefaultPromoFormData());
      fetchPromoCodes();
      showToast("success", editingPromoId ? "✅ Promo updated" : "✅ Promo created");
    } catch (err: any) {
      console.error("Save promo code error:", err);
      setPromoFormError(err?.message || "Failed to save promo code");
    } finally {
      setIsSavingPromo(false);
    }
  };

  const togglePromoStatus = async (promoId: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/promo/${promoId}/toggle`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (handleUnauthorized(res)) return;

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to toggle promo");
      }

      const updated = await res.json();
      setPromos((prev) => prev.map((p) => (p._id === promoId ? updated : p)));
    } catch (err) {
      console.error("Toggle promo status error:", err);
      showToast("error", "❌ Failed to toggle promo status");
    }
  };

  const deletePromoCode = async (promoId: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;
    if (!window.confirm("Delete this promo code?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/promo/${promoId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (handleUnauthorized(res)) return;

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete promo");
      }

      setPromos((prev) => prev.filter((p) => p._id !== promoId));
      showToast("success", "✅ Promo deleted");
    } catch (err) {
      console.error("Delete promo code error:", err);
      showToast("error", "❌ Failed to delete promo code");
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
      subcategory: sanitizeProductSubcategory(productForm.subcategory),
      image: sanitizeProductImagePath(productForm.image),
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
        setProducts((prev) => [...prev, normalizeAdminProduct(data)]);
        setProductForm(createDefaultProductForm());
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
      subcategory: sanitizeProductSubcategory(productForm.subcategory),
      image: sanitizeProductImagePath(productForm.image),
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
          prevProducts.map((p) =>
            p._id === productId ? normalizeAdminProduct(data) : p,
          ),
        );

        setEditingProduct(null);
        setProductForm(createDefaultProductForm());
        showToast("success", "✅ Product updated successfully!");
      } else {
        const errorData = await res.json();
        console.error("Update failed:", errorData);
        showToast(
          "error",
          `❌ ${errorData.error || "Failed to update product"}`,
        );
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
        showToast(
          "error",
          `❌ ${errorData.error || "Failed to delete product"}`,
        );
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
          <div
            className="absolute top-20 left-10 w-20 h-20 bg-indigo-600 rounded-full border-4 border-black shadow-[4px_4px_0px_#000] animate-bounce opacity-60"
            style={{ animationDelay: "0s", animationDuration: "3s" }}
          ></div>
          <div
            className="absolute top-40 right-20 w-16 h-16 bg-purple-600 rounded-full border-4 border-black shadow-[4px_4px_0px_#000] animate-bounce opacity-60"
            style={{ animationDelay: "0.5s", animationDuration: "3.5s" }}
          ></div>
        </div>

        <div className="relative max-w-sm w-full">
          <div className="bg-white rounded-3xl px-6 py-8 border-4 border-black shadow-[8px_8px_0px_#000] relative">
            <div className="absolute -top-4 -right-4 w-10 h-10 bg-indigo-600 rounded-full border-4 border-black flex items-center justify-center text-lg shadow-[3px_3px_0px_#000]">
              ⚙️
            </div>
            <div className="absolute -bottom-4 -left-4 w-10 h-10 bg-purple-600 rounded-full border-4 border-black flex items-center justify-center text-lg shadow-[3px_3px_0px_#000]">
              🔐
            </div>

            <div className="text-center mb-6">
              <h2
                className="text-2xl font-black text-black tracking-tight"
                style={{ WebkitTextStroke: "1px #6366F1" }}
              >
                Admin Portal
              </h2>
              <p className="text-black mt-1 text-sm font-medium">
                Full Website Access 🛡️
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-100 border-2 border-red-500 rounded-xl mb-4">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm font-bold text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-black mb-1.5">
                  Email 📧
                </label>
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
                <label className="block text-sm font-bold text-black mb-1.5">
                  Password 🔐
                </label>
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
              <span className="text-xs font-bold text-black uppercase tracking-wider px-2 py-1 bg-white rounded-lg border border-indigo-500/20">
                or
              </span>
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
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
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
    <div className="min-h-screen bg-slate-50 text-slate-900 admin-zoho flex overflow-x-hidden relative">
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 top-[80px] bg-black/45 z-30 lg:hidden"
        />
      )}

      {/* Left Sidebar Navigation */}
      <aside
        className={`w-64 shrink-0 bg-slate-950 border-r border-slate-800 h-[calc(100vh-80px)] fixed left-0 top-[80px] z-40 overflow-y-auto transform transition-transform duration-300 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:z-30`}
      >
        <div className="p-6">
          <div className="mb-8">
            <h1 className="text-xl font-black text-white admin-zoho-keep-white">
              🛡️ StickToon
            </h1>
            <span className="inline-block mt-2 px-3 py-1 bg-white text-slate-950 rounded-full text-xs font-bold">
              ADMIN MODE
            </span>
          </div>

          <nav className="space-y-2">
            {[
              {
                id: "dashboard",
                label: "Dashboard",
                icon: <DashboardRoundedIcon sx={{ fontSize: 22 }} />,
              },
              {
                id: "notifications",
                label: "Notifications",
                icon: <NotificationsActiveRoundedIcon sx={{ fontSize: 22 }} />,
                badge: notifications.length,
              },
              {
                id: "leads",
                label: "Leads",
                icon: <DescriptionRoundedIcon sx={{ fontSize: 22 }} />,
              },
              {
                id: "deals",
                label: "Deals",
                icon: <BriefcaseBusiness className="w-5 h-5" />,
              },
              {
                id: "support",
                label: "Support",
                icon: <SupportAgentRoundedIcon sx={{ fontSize: 22 }} />,
              },
              {
                id: "tasks",
                label: "Tasks",
                icon: <AssignmentTurnedInRoundedIcon sx={{ fontSize: 22 }} />,
              },
              {
                id: "users",
                label: "All Users",
                icon: <PeopleAltRoundedIcon sx={{ fontSize: 22 }} />,
              },
              {
                id: "all-influencers",
                label: "All Influencers",
                icon: <Groups2RoundedIcon sx={{ fontSize: 22 }} />,
              },
              {
                id: "influencers",
                label: "Pending Approvals",
                icon: <PendingActionsRoundedIcon sx={{ fontSize: 22 }} />,
                badge: stats.pendingApprovals,
              },
              {
                id: "withdrawals",
                label: "Withdrawals",
                icon: <AccountBalanceWalletRoundedIcon sx={{ fontSize: 22 }} />,
                badge: stats.pendingWithdrawals.count,
              },
              {
                id: "orders",
                label: "Orders",
                icon: <ShoppingCartRoundedIcon sx={{ fontSize: 22 }} />,
              },
              {
                id: "customers",
                label: "Customers",
                icon: <ContactsRoundedIcon sx={{ fontSize: 22 }} />,
              },
              {
                id: "reports",
                label: "Reports",
                icon: <BarChart3 className="w-5 h-5" />,
              },
              {
                id: "products",
                label: "Products",
                icon: <Inventory2RoundedIcon sx={{ fontSize: 22 }} />,
              },
              {
                id: "promo",
                label: "Promo Codes",
                icon: <LocalOfferRoundedIcon sx={{ fontSize: 22 }} />,
              },
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
                <span className="inline-flex items-center justify-center">
                  {tab.icon}
                </span>
                <span className="text-base">{tab.label}</span>
                {typeof tab.badge === "number" && tab.badge > 0 && (
                  <span className="ml-auto mr-1 inline-flex min-w-6 h-6 items-center justify-center rounded-full bg-red-600 !text-white text-xs font-black px-1.5">
                    {tab.badge}
                  </span>
                )}
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
      <div className="flex-1 min-w-0 lg:ml-64">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen((prev) => !prev)}
                className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-300 bg-white text-slate-700"
              >
                {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 truncate">
                {currentView === "dashboard" && "Dashboard"}
                {currentView === "notifications" && "Notifications"}
                {currentView === "leads" && "Leads"}
                {currentView === "deals" && "Deals"}
                {currentView === "support" && "Support"}
                {currentView === "tasks" && "Tasks"}
                {currentView === "users" && "All Users"}
                {currentView === "all-influencers" && "All Influencers"}
                {currentView === "influencers" && "Pending Approvals"}
                {currentView === "withdrawals" && "Withdrawals"}
                {currentView === "orders" && "Orders"}
                {currentView === "customers" && "Customers"}
                {currentView === "reports" && "Reports"}
                {currentView === "products" && "Products"}
                {currentView === "promo" && "Promo Codes"}
                {currentView === "profile" && "Edit Profile"}
              </h2>
            </div>
            <div className="hidden sm:block text-sm text-slate-500 whitespace-nowrap">
              {new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
          {/* DASHBOARD VIEW */}
          {currentView === "dashboard" && (
            <div className="space-y-6">
              {/* Key Metrics Overview */}
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
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                      +12%
                    </span>
                  </div>
                  <p className="text-gray-600 text-xs font-bold uppercase mb-1">
                    Total Users
                  </p>
                  <p className="text-3xl font-black text-gray-900">
                    {allUsers.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">
                    Active accounts
                  </p>
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
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                      +8%
                    </span>
                  </div>
                  <p className="text-gray-600 text-xs font-bold uppercase mb-1">
                    Influencers
                  </p>
                  <p className="text-3xl font-black text-gray-900">
                    {stats.totalInfluencers}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">
                    Verified partners
                  </p>
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
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                      +24%
                    </span>
                  </div>
                  <p className="text-gray-600 text-xs font-bold uppercase mb-1">
                    Total Orders
                  </p>
                  <p className="text-3xl font-black text-gray-900">
                    {orders.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">
                    All time orders
                  </p>
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
                    <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      Live
                    </span>
                  </div>
                  <p className="text-gray-600 text-xs font-bold uppercase mb-1">
                    Products
                  </p>
                  <p className="text-3xl font-black text-gray-900">
                    {products.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">
                    In inventory
                  </p>
                </button>
              </div>

              {/* Action Required & Revenue */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pending Actions */}
                <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-black text-gray-900">
                      Action Required
                    </h3>
                    <span className="text-xs font-bold text-gray-500">
                      {stats.pendingApprovals + stats.pendingWithdrawals.count}{" "}
                      items
                    </span>
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
                          <p className="font-bold text-gray-900 text-sm">
                            Pending Influencer Approvals
                          </p>
                          <p className="text-xs text-gray-500">
                            {stats.pendingApprovals} requests awaiting review
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-gray-900">
                          {stats.pendingApprovals}
                        </span>
                        <svg
                          className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
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
                          <p className="font-bold text-gray-900 text-sm">
                            Pending Withdrawals
                          </p>
                          <p className="text-xs text-gray-500">
                            ₹{stats.pendingWithdrawals.total.toLocaleString()}{" "}
                            total amount
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-gray-900">
                          {stats.pendingWithdrawals.count}
                        </span>
                        <svg
                          className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </button>

                    <button
                      onClick={() => setCurrentView("orders")}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-blue-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                            />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-gray-900 text-sm">
                            Recent Orders
                          </p>
                          <p className="text-xs text-gray-500">
                            {orders.slice(0, 5).length} new orders today
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-gray-900">
                          {orders.length}
                        </span>
                        <svg
                          className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
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
            <div className="flex flex-col xl:flex-row gap-4 xl:gap-6 min-w-0">
              {/* ================= SIDEBAR ================= */}
              <aside className="w-full xl:w-[260px] shrink-0 bg-white rounded-xl border p-5 space-y-6 h-fit">
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
                <div className="space-y-1.5">
                  {["New", "Contacted", "Interested", "Lost"].map((s) => (
                    <label
                      key={s}
                      className="flex gap-2 items-center text-sm leading-tight"
                    >
                      <input
                        type="checkbox"
                        checked={leadStatusFilter.includes(s)}
                        onChange={() =>
                          setLeadStatusFilter((prev) =>
                            prev.includes(s)
                              ? prev.filter((x) => x !== s)
                              : [...prev, s],
                          )
                        }
                      />
                      {s}
                    </label>
                  ))}
                </div>

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
                    onChange={(e) =>
                      setLeadSort(e.target.value as "asc" | "desc")
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="desc">Newest first</option>
                    <option value="asc">Oldest first</option>
                  </select>
                </div>
              </aside>

              {/* ================= MAIN CONTENT ================= */}
              <div className="flex-1 min-w-0 flex flex-col gap-6">
                {/* HEADER */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
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
                  <div className="overflow-x-auto">
                    <div className="min-w-[980px]">
                      <div className="grid grid-cols-10 px-6 py-4 text-sm font-bold border-b bg-slate-50 text-left">
                        <span>Name</span>
                        <span>Company</span>
                        <span>Email</span>
                        <span>Phone</span>
                        <span>Status</span>
                        <span>Date</span>
                        <span>Next Follow Up</span>
                        <span>Mail</span>
                        <span>Send</span>
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
                            className="grid grid-cols-10 px-6 py-4 text-sm border-b hover:bg-slate-50 text-left"
                          >
                        <span className="font-semibold">
                          {lead.firstName} {lead.lastName}
                        </span>
                        <span>{lead.company}</span>
                        <span
                          className="min-w-0 truncate"
                          title={lead.email}
                        >
                          {lead.email}
                        </span>
                        <span className="min-w-0 whitespace-nowrap">
                          {lead.phone}
                        </span>
                        <span>
                          <select
                            value={lead.status || "New"}
                            onChange={(e) =>
                              updateLeadStatus(
                                lead._id,
                                e.target.value as
                                  | "New"
                                  | "Contacted"
                                  | "Interested"
                                  | "Lost",
                              )
                            }
                            className="border rounded-lg px-2 py-1 text-xs bg-white"
                          >
                            <option value="New">New</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Interested">Interested</option>
                            <option value="Lost">Lost</option>
                          </select>
                        </span>
                        <span className="text-xs text-slate-500">
                          {lead.createdAt
                            ? new Date(lead.createdAt).toLocaleDateString()
                            : "-"}
                        </span>
                        <span>
                          {lead.status === "Contacted" || lead.status === "Interested" ? (
                            <input
                              type="date"
                              value={
                                lead.nextFollowUpAt
                                  ? toDateInputValue(lead.nextFollowUpAt)
                                  : ""
                              }
                              onChange={(e) => updateLeadFollowUpDate(lead._id, e.target.value)}
                              className="border rounded-lg px-2 py-1 text-xs bg-white"
                            />
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </span>

                        <span>
                          <button
                            onClick={() => {
                              const subject = encodeURIComponent(
                                "Regarding Your Inquiry - StickToon",
                              );

                              const body = encodeURIComponent(
                                `Hi ${lead.firstName || "there"},\n\nThank you for your interest in StickToon.\n\nBest regards,\nStickToon Team`,
                              );

                              window.open(
                                `https://mail.google.com/mail/?view=cm&fs=1&to=${lead.email}&su=${subject}&body=${body}`,
                                "_blank",
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
                            onClick={() => navigate("/admin/deal-send", { state: { lead } })}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition"
                          >
                            Send
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
                  </div>
                </div>

                {/* CREATE LEAD MODAL */}
                {showCreateLead && (
                  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white w-full max-w-[700px] mx-4 rounded-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                          placeholder="First Name"
                          value={newLead.firstName}
                          onChange={(e) =>
                            setNewLead({
                              ...newLead,
                              firstName: e.target.value,
                            })
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
                    <div className="bg-white border-2 border-black-500 w-full max-w-[420px] mx-4 rounded-xl p-6 space-y-5 shadow-xl">
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
              </div>
            </div>
          )}

          {/* ================= DEALS VIEW ================= */}
          {currentView === "deals" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-black">Deals</h3>
                    <p className="text-sm text-slate-500">
                      Deal pipeline built from current lead records.
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentView("leads")}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold"
                  >
                    Manage Leads
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px]">
                    <thead className="bg-slate-50 border-b">
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-600">
                        <th className="px-4 py-3 font-black">Name</th>
                        <th className="px-4 py-3 font-black">Company</th>
                        <th className="px-4 py-3 font-black">Email</th>
                        <th className="px-4 py-3 font-black">Stage</th>
                        <th className="px-4 py-3 font-black">Lead Source</th>
                        <th className="px-4 py-3 font-black">Expected Amt</th>
                        <th className="px-4 py-3 font-black">More Options</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                            No deals found.
                          </td>
                        </tr>
                      ) : (
                        filteredLeads.map((lead) => (
                          <tr
                            key={lead._id || `${lead.email}-${lead.phone}`}
                            className="border-b last:border-b-0"
                          >
                            <td className="px-4 py-4">
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  value={String(getDealDraftValue(lead, "firstName") || "")}
                                  onChange={(e) => setDealDraftValue(lead._id, "firstName", e.target.value)}
                                  onBlur={(e) => updateDealField(lead._id, { firstName: e.target.value })}
                                  placeholder="First name"
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
                                />
                                <input
                                  value={String(getDealDraftValue(lead, "lastName") || "")}
                                  onChange={(e) => setDealDraftValue(lead._id, "lastName", e.target.value)}
                                  onBlur={(e) => updateDealField(lead._id, { lastName: e.target.value })}
                                  placeholder="Last name"
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <input
                                value={String(getDealDraftValue(lead, "company") || "")}
                                onChange={(e) => setDealDraftValue(lead._id, "company", e.target.value)}
                                onBlur={(e) => updateDealField(lead._id, { company: e.target.value })}
                                placeholder="Company"
                                className="min-w-[150px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <input
                                value={String(getDealDraftValue(lead, "email") || "")}
                                onChange={(e) => setDealDraftValue(lead._id, "email", e.target.value)}
                                onBlur={(e) => updateDealField(lead._id, { email: e.target.value })}
                                placeholder="Email"
                                className="min-w-[220px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <select
                                value={String(getDealDraftValue(lead, "status") || "New")}
                                onChange={(e) => {
                                  setDealDraftValue(lead._id, "status", e.target.value);
                                  updateDealField(lead._id, { status: e.target.value });
                                }}
                                className="min-w-[120px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                              >
                                <option value="New">New</option>
                                <option value="Contacted">Contacted</option>
                                <option value="Interested">Interested</option>
                                <option value="Lost">Lost</option>
                              </select>
                            </td>
                            <td className="px-4 py-4">
                              <select
                                value={String(getDealDraftValue(lead, "leadSource") || "")}
                                onChange={(e) => {
                                  setDealDraftValue(lead._id, "leadSource", e.target.value);
                                  updateDealField(lead._id, { leadSource: e.target.value });
                                }}
                                className="min-w-[160px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                              >
                                <option value="">-</option>
                                <option value="WhatsApp">WhatsApp</option>
                                <option value="Phone contact">Phone contact</option>
                                <option value="Social Media">Social Media</option>
                                <option value="Email">Email</option>
                                <option value="Referral">Referral</option>
                                <option value="Website">Website</option>
                              </select>
                            </td>
                            <td className="px-4 py-4">
                              <input
                                type="number"
                                min={0}
                                value={Number(getDealDraftValue(lead, "expectedAmount") || 0)}
                                onChange={(e) => setDealDraftValue(lead._id, "expectedAmount", Number(e.target.value || 0))}
                                onBlur={(e) => updateDealField(lead._id, { expectedAmount: Number(e.target.value || 0) })}
                                className="w-[120px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => navigate("/admin/deal-convert", { state: { lead } })}
                                  className="rounded-md border px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                >
                                  Convert
                                </button>
                                <button
                                  onClick={() => {
                                    setLeadToDelete(lead);
                                    setShowDeleteModal(true);
                                  }}
                                  className="rounded-md border border-red-200 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= NOTIFICATIONS VIEW ================= */}
          {currentView === "notifications" && (
            <div className="space-y-6">
              <div className="bg-white border rounded-xl p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Action Alerts</h3>
                  <p className="text-sm text-slate-600">
                    Leads follow-up, Support SLA, and Task deadlines within 1 day.
                  </p>
                </div>
                <span className="text-sm font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                  {notifications.length} alert{notifications.length === 1 ? "" : "s"}
                </span>
              </div>

              {notifications.length === 0 ? (
                <div className="bg-white border rounded-xl p-10 text-center text-slate-500">
                  No urgent notifications right now.
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`bg-white border rounded-xl p-4 flex items-start justify-between gap-4 ${
                        item.severity === "high" ? "border-red-200" : "border-amber-200"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block w-2.5 h-2.5 rounded-full ${
                              item.severity === "high" ? "bg-red-500" : "bg-amber-500"
                            }`}
                          />
                          <p className="text-sm font-black text-slate-900">{item.title}</p>
                        </div>
                        <p className="text-sm text-slate-700">{item.detail}</p>
                        <p className="text-xs text-slate-500">Due: {item.whenText}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setCurrentView(
                            item.category === "lead"
                              ? "leads"
                              : item.category === "support"
                                ? "support"
                                : "tasks",
                          )
                        }
                        className="shrink-0 border rounded-lg px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50"
                      >
                        Open
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= SUPPORT VIEW ================= */}
          {currentView === "support" && (
            <div className="flex flex-col xl:flex-row gap-4 xl:gap-6 min-w-0">
              <aside className="w-full xl:w-[260px] shrink-0 bg-white rounded-xl border p-5 space-y-6 h-fit">
                <h3 className="font-black text-sm">Filters</h3>

                <div className="space-y-2 text-sm">
                  <p className="text-xs font-black uppercase text-slate-600">
                    Status
                  </p>
                  <label className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      checked={showNewSupport}
                      onChange={(e) => setShowNewSupport(e.target.checked)}
                    />
                    New
                  </label>
                  <label className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      checked={showInProgressSupport}
                      onChange={(e) =>
                        setShowInProgressSupport(e.target.checked)
                      }
                    />
                    In Progress
                  </label>
                  <label className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      checked={showResolvedSupport}
                      onChange={(e) => setShowResolvedSupport(e.target.checked)}
                    />
                    Resolved
                  </label>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-black uppercase text-slate-600">
                    Date
                  </p>
                  <input
                    type="date"
                    value={supportFromDate}
                    onChange={(e) => setSupportFromDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="date"
                    value={supportToDate}
                    onChange={(e) => setSupportToDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-slate-600 mb-1">
                    Sort
                  </p>
                  <select
                    value={supportSort}
                    onChange={(e) =>
                      setSupportSort(e.target.value as "asc" | "desc")
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="desc">Newest first</option>
                    <option value="asc">Oldest first</option>
                  </select>
                </div>
              </aside>

              <div className="flex-1 min-w-0">
              <div className="bg-white border rounded-xl p-6 space-y-4">
                <h3 className="text-xl font-black text-slate-900">
                  Support Inbox ({filteredSupportMessages.length})
                </h3>
                <p className="text-sm text-slate-600">
                  Manage customer support conversations and follow-ups here.
                </p>
                {isLoadingSupportMessages ? (
                  <div className="text-sm text-slate-500">Loading support messages...</div>
                ) : supportMessages.length === 0 ? (
                  <div className="text-sm text-slate-500">No support messages yet.</div>
                ) : filteredSupportMessages.length === 0 ? (
                  <div className="text-sm text-slate-500">
                    No support messages match selected filters.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredSupportMessages.map((msg) => (
                      <div
                        key={msg._id}
                        className="border rounded-xl p-4 bg-slate-50/70 space-y-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-slate-900">{msg.name}</h4>
                            <p className="text-xs font-semibold text-indigo-700">
                              Ticket: {msg.ticketId || "N/A"}
                            </p>
                            <p className="text-sm text-slate-600">{msg.email}</p>
                            <p className="text-sm text-slate-600">{msg.phone}</p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSupportMessageToDelete(msg)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition"
                              title="Delete message"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-semibold text-slate-500">
                              {msg.createdAt
                                ? new Date(msg.createdAt).toLocaleString()
                                : "—"}
                            </span>
                            <select
                              value={msg.status || "New"}
                              onChange={(e) =>
                                updateSupportMessageStatus(
                                  msg._id,
                                  e.target.value as "New" | "In Progress" | "Resolved",
                                )
                              }
                              className="border rounded-lg px-3 py-1 text-sm bg-white"
                            >
                              <option value="New">New</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Resolved">Resolved</option>
                            </select>
                            <span className="text-xs font-semibold text-amber-700">
                              {getSupportSlaText(msg)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingSupportMessage(msg);
                                setSupportReplyText("");
                              }}
                              className="border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-lg transition"
                            >
                              Reply
                            </button>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Inquiry Type
                          </p>
                          <p className="text-sm font-medium text-slate-800">{msg.inquiryType}</p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Message
                          </p>
                          <p className="text-sm text-slate-800 whitespace-pre-wrap">
                            {msg.message}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            SLA Deadline
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                            <input
                              type="datetime-local"
                              value={
                                supportSlaDeadlines[msg._id] ??
                                toDateTimeLocalValue(msg.slaDeadlineAt)
                              }
                              onChange={(e) =>
                                setSupportSlaDeadlines((prev) => ({
                                  ...prev,
                                  [msg._id]: e.target.value,
                                }))
                              }
                              className="w-full max-w-md border rounded-lg p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                            />
                            <button
                              type="button"
                              onClick={() => saveSupportSlaDeadline(msg._id)}
                              disabled={savingSupportSlaId === msg._id}
                              className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-60"
                            >
                              {savingSupportSlaId === msg._id ? "Saving..." : "Save SLA"}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="pt-6 text-xs font-bold uppercase tracking-wide text-slate-500">
                            Internal Notes
                          </p>
                          <textarea
                            rows={2}
                            value={supportInternalNotes[msg._id] ?? msg.internalNote ?? ""}
                            onChange={(e) =>
                              setSupportInternalNotes((prev) => ({
                                ...prev,
                                [msg._id]: e.target.value,
                              }))
                            }
                            placeholder="Add the main issue summary for internal follow-up..."
                            className="w-full max-w-md border rounded-lg p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          />
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => saveSupportInternalNote(msg._id)}
                              disabled={savingSupportNoteId === msg._id}
                              className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-60"
                            >
                              {savingSupportNoteId === msg._id
                                ? "Saving..."
                                : "Save Internal Note"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {replyingSupportMessage && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                  <div className="bg-white w-full max-w-xl rounded-xl border p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-bold text-slate-900">
                          Reply to {replyingSupportMessage.name}
                        </h4>
                        <p className="text-sm text-slate-600">
                          {replyingSupportMessage.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingSupportMessage(null);
                          setSupportReplyText("");
                        }}
                        className="text-sm text-slate-500 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                    </div>

                    <textarea
                      rows={8}
                      value={supportReplyText}
                      onChange={(e) => setSupportReplyText(e.target.value)}
                      placeholder="Write your reply..."
                      className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingSupportMessage(null);
                          setSupportReplyText("");
                        }}
                        className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={sendSupportReply}
                        disabled={isSendingSupportReply}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 admin-zoho-keep-white rounded-lg text-sm font-semibold disabled:opacity-60"
                      >
                        {isSendingSupportReply ? "Sending..." : "Send Reply"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {supportMessageToDelete && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                  <div className="bg-white w-full max-w-md rounded-xl border p-6 space-y-5 shadow-xl">
                    <h4 className="text-lg font-bold text-red-600">
                      Delete Support Message
                    </h4>
                    <p className="text-sm text-slate-600">
                      Are you sure you want to delete this message from{" "}
                      <span className="font-semibold text-slate-800">
                        {supportMessageToDelete.name}
                      </span>
                      ?
                    </p>
                    <div className="flex justify-end gap-3 pt-2 border-t">
                      <button
                        type="button"
                        onClick={() => setSupportMessageToDelete(null)}
                        className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteSupportMessage}
                        disabled={isDeletingSupportMessage}
                        className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-semibold disabled:opacity-60"
                      >
                        {isDeletingSupportMessage ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          )}

          

          {/* ================= TASKS VIEW ================= */}
          {currentView === "tasks" && (
            <div className="flex flex-col xl:flex-row gap-4 xl:gap-6 min-w-0">
              <aside className="w-full xl:w-[260px] shrink-0 bg-white rounded-xl border p-5 space-y-6 h-fit">
                <h3 className="font-black text-sm">Filters</h3>

                <div className="space-y-2 text-sm">
                  <p className="text-xs font-black uppercase text-slate-600">Status</p>
                  <label className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      checked={showInProgressTasks}
                      onChange={(e) => setShowInProgressTasks(e.target.checked)}
                    />
                    In Progress
                  </label>
                  <label className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      checked={showPendingTasks}
                      onChange={(e) => setShowPendingTasks(e.target.checked)}
                    />
                    Pending
                  </label>
                  <label className="flex gap-2 items-center">
                    <input
                      type="checkbox"
                      checked={showCompletedTasks}
                      onChange={(e) => setShowCompletedTasks(e.target.checked)}
                    />
                    Completed
                  </label>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-black uppercase text-slate-600">Date</p>
                  <input
                    type="date"
                    value={taskFromDate}
                    onChange={(e) => setTaskFromDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="date"
                    value={taskToDate}
                    onChange={(e) => setTaskToDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </aside>

              <div className="flex-1 min-w-0 flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <h2 className="text-2xl font-black">Tasks ({filteredTasks.length})</h2>
                  <button
                    onClick={() => {
                      setEditingTask(null);
                      setNewTask(createDefaultTaskForm());
                      setShowCreateTask(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 admin-zoho-keep-white px-4 py-2 rounded-lg text-sm font-semibold"
                  >
                    + Create Task
                  </button>
                </div>

                <div className="bg-white border rounded-xl overflow-x-auto">
                  <div className="min-w-[1180px]">
                    <div className="grid grid-cols-8 px-6 py-4 text-sm font-bold border-b bg-slate-50 text-left">
                      <span>Title</span>
                      <span>Related To</span>
                      <span>Type</span>
                      <span>Status</span>
                      <span>Due Date</span>
                      <span>Reminder</span>
                      <span>Assigned To</span>
                      <span>Actions</span>
                    </div>

                    {filteredTasks.length === 0 ? (
                      <div className="p-10 text-center text-slate-400">No tasks found</div>
                    ) : (
                      filteredTasks.map((task, index) => {
                        const overdue = isTaskOverdue(task);
                        const taskStatus = overdue ? "Overdue" : normalizeTaskStatus(task.status);

                        return (
                          <div
                            key={task._id || index}
                            className={`grid grid-cols-8 px-6 py-4 text-sm border-b items-center ${
                              overdue ? "bg-red-50" : "hover:bg-slate-50"
                            }`}
                          >
                            <button
                              type="button"
                              className="text-left font-semibold hover:underline"
                              onClick={() => setViewingTask(task)}
                            >
                              {task.title}
                            </button>
                            <span>
                              {task.relatedToType && task.relatedToId
                                ? `${task.relatedToType} #${task.relatedToId}`
                                : "—"}
                            </span>
                            <span>{task.taskType || "Internal Task"}</span>
                            <span>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-bold ${
                                  taskStatus === "Overdue"
                                    ? "bg-red-100 text-red-700"
                                    : taskStatus === "Completed"
                                      ? "bg-green-100 text-green-700"
                                      : taskStatus === "In Progress"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {taskStatus}
                              </span>
                            </span>
                            <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}</span>
                            <span>
                              {task.reminderAt ? new Date(task.reminderAt).toLocaleString() : "—"}
                            </span>
                            <span>
                              {typeof task.assignedTo === "object"
                                ? task.assignedTo?.name || task.assignedTo?.email || "—"
                                : task.user?.name || task.user?.email || "—"}
                            </span>
                            <span className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setViewingTask(task)}
                                className="border rounded-lg px-2 py-1 text-xs hover:bg-slate-100"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditTask(task)}
                                className="border rounded-lg px-2 py-1 text-xs hover:bg-slate-100"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setTaskToDelete(task);
                                  setShowDeleteTaskModal(true);
                                }}
                                className="text-red-600 border border-red-300 px-2 py-1 rounded-lg hover:bg-red-50 text-xs"
                              >
                                Delete
                              </button>
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {showCreateTask && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                  <div className="bg-white w-full max-w-3xl rounded-xl p-6 space-y-5 border">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-bold">
                        {editingTask ? "Edit Task" : "Create Task"}
                      </h3>
                      <button
                        onClick={() => {
                          setShowCreateTask(false);
                          setEditingTask(null);
                          setNewTask(createDefaultTaskForm());
                        }}
                        className="text-sm text-slate-500 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        placeholder="Task Title"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        className="border rounded-lg px-3 py-2 md:col-span-2"
                      />

                      <select
                        value={newTask.relatedToType}
                        onChange={(e) =>
                          setNewTask({
                            ...newTask,
                            relatedToType: e.target.value as TaskFormState["relatedToType"],
                          })
                        }
                        className="border rounded-lg px-3 py-2"
                      >
                        <option value="Lead">Lead</option>
                        <option value="Contact">Contact</option>
                        <option value="Order">Order</option>
                        <option value="Support Ticket">Support Ticket</option>
                        <option value="Influencer">Influencer</option>
                      </select>
                      <input
                        placeholder="Select Entity ID"
                        value={newTask.relatedToId}
                        onChange={(e) => setNewTask({ ...newTask, relatedToId: e.target.value })}
                        className="border rounded-lg px-3 py-2"
                      />

                      <select
                        value={newTask.taskType}
                        onChange={(e) =>
                          setNewTask({
                            ...newTask,
                            taskType: e.target.value as TaskFormState["taskType"],
                          })
                        }
                        className="border rounded-lg px-3 py-2"
                      >
                        <option value="Call">Call</option>
                        <option value="Email">Email</option>
                        <option value="WhatsApp Follow-up">WhatsApp Follow-up</option>
                        <option value="Order Confirmation">Order Confirmation</option>
                        <option value="Refund Processing">Refund Processing</option>
                        <option value="Influencer Follow-up">Influencer Follow-up</option>
                        <option value="Internal Task">Internal Task</option>
                      </select>

                      <select
                        value={newTask.status}
                        onChange={(e) =>
                          setNewTask({ ...newTask, status: e.target.value as TaskStatus })
                        }
                        className="border rounded-lg px-3 py-2"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Waiting on Customer">Waiting on Customer</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>

                      <input
                        type="datetime-local"
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                        className="border rounded-lg px-3 py-2"
                      />
                      <input
                        type="datetime-local"
                        value={newTask.reminderAt}
                        onChange={(e) => setNewTask({ ...newTask, reminderAt: e.target.value })}
                        className="border rounded-lg px-3 py-2"
                      />

                      <select
                        value={newTask.assignedTo}
                        onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                        className="border rounded-lg px-3 py-2"
                      >
                        <option value="">Select Assignee</option>
                        {allUsers.map((u: any) => (
                          <option key={u._id} value={u._id}>
                            {u.name || u.email}
                          </option>
                        ))}
                      </select>

                      <textarea
                        placeholder="Description"
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        className="border rounded-lg px-3 py-2 md:col-span-2"
                        rows={4}
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-2 border-t">
                      <button
                        onClick={() => {
                          setShowCreateTask(false);
                          setEditingTask(null);
                          setNewTask(createDefaultTaskForm());
                        }}
                        className="px-4 py-2 border rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateTask}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 admin-zoho-keep-white rounded-lg font-semibold"
                      >
                        Save Task
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {viewingTask && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                  <div className="bg-white w-full max-w-3xl rounded-xl border p-6 space-y-5 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold">{viewingTask.title}</h3>
                        <p className="text-sm text-slate-600">
                          Related To →{" "}
                          {viewingTask.relatedToType && viewingTask.relatedToId
                            ? `${viewingTask.relatedToType} #${viewingTask.relatedToId}`
                            : "—"}
                        </p>
                        <p className="text-sm text-slate-600">
                          Assigned To →{" "}
                          {typeof viewingTask.assignedTo === "object"
                            ? viewingTask.assignedTo?.name || viewingTask.assignedTo?.email || "—"
                            : viewingTask.user?.name || viewingTask.user?.email || "—"}
                        </p>
                        <p className="text-sm text-slate-600">
                          Status → {isTaskOverdue(viewingTask) ? "Overdue" : normalizeTaskStatus(viewingTask.status)}
                        </p>
                        <p className="text-sm text-slate-600">
                          Due → {viewingTask.dueDate ? new Date(viewingTask.dueDate).toLocaleString() : "—"}
                        </p>
                        <p className="text-sm text-slate-600">
                          Reminder →{" "}
                          {viewingTask.reminderAt ? new Date(viewingTask.reminderAt).toLocaleString() : "—"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setViewingTask(null);
                          setTaskCommentText("");
                        }}
                        className="text-sm text-slate-500 hover:text-slate-800"
                      >
                        Close
                      </button>
                    </div>

                    <div className="border rounded-xl p-4 space-y-3">
                      <h4 className="font-bold">Comments</h4>
                      {(viewingTask.comments || []).length === 0 ? (
                        <p className="text-sm text-slate-500">No comments yet.</p>
                      ) : (
                        (viewingTask.comments || []).map((c, idx) => (
                          <div key={idx} className="border-b pb-2">
                            <p className="text-sm font-semibold">{c.authorName}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(c.createdAt).toLocaleString()}
                            </p>
                            <p className="text-sm mt-1">{c.text}</p>
                          </div>
                        ))
                      )}
                      <div className="flex gap-2 pt-2">
                        <input
                          value={taskCommentText}
                          onChange={(e) => setTaskCommentText(e.target.value)}
                          placeholder="Add comment"
                          className="flex-1 border rounded-lg px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={addTaskComment}
                          className="px-3 py-2 border rounded-lg text-sm font-semibold hover:bg-slate-50"
                        >
                          Send
                        </button>
                      </div>
                    </div>

                    <div className="border rounded-xl p-4 space-y-3">
                      <h4 className="font-bold">Activity Timeline</h4>
                      {(viewingTask.activityTimeline || []).length === 0 ? (
                        <p className="text-sm text-slate-500">No activity yet.</p>
                      ) : (
                        (viewingTask.activityTimeline || []).map((a, idx) => (
                          <p key={idx} className="text-sm">
                            {new Date(a.createdAt).toLocaleString()} - {a.message}
                          </p>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {showDeleteTaskModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl p-6 w-full max-w-[400px] mx-4 space-y-4 shadow-xl">
                    <h3 className="text-lg font-bold text-red-600">Delete Task?</h3>
                    <p className="text-sm text-slate-600">
                      Are you sure you want to delete this task?
                    </p>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setShowDeleteTaskModal(false)}
                        className="px-4 py-2 border rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteTask}
                        className="text-red-600 border border-red-500 px-3 py-1 rounded-lg hover:bg-red-50 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* INFLUENCERS VIEW */}
          {currentView === "influencers" && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white mb-6">
                Pending Influencer Approvals
              </h2>
              {pendingInfluencers.length === 0 ? (
                <div className="bg-white/10 border border-white/20 rounded-2xl p-8 text-center">
                  <p className="text-gray-400">No pending requests</p>
                </div>
              ) : (
                pendingInfluencers.map((inf) => (
                  <div
                    key={inf._id}
                    className="bg-white/10 border border-white/20 rounded-2xl p-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h3 className="text-white font-bold text-lg">
                          {inf.name}
                        </h3>
                        <p className="text-gray-400 text-sm">{inf.email}</p>
                        {inf.instagram && (
                          <p className="text-purple-300 text-sm">
                            @{inf.instagram}
                          </p>
                        )}
                        {inf.youtube && (
                          <p className="text-red-300 text-sm">{inf.youtube}</p>
                        )}
                        {inf.bio && (
                          <p className="text-gray-300 text-sm mt-2">
                            "{inf.bio}"
                          </p>
                        )}
                        <p className="text-gray-500 text-xs mt-2">
                          {new Date(inf.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApproveInfluencer(inf._id, true)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg text-green-300 font-medium transition-colors"
                        >
                          <Check className="w-4 h-4" /> Approve
                        </button>
                        <button
                          onClick={() =>
                            handleApproveInfluencer(inf._id, false)
                          }
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
              <h2 className="text-2xl font-bold text-white mb-6">
                Withdrawal Requests
              </h2>
              {loadingData.withdrawals ? (
                <div className="bg-white/10 border border-white/20 rounded-2xl p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto mb-4"></div>
                  <p className="text-gray-400">
                    Loading withdrawal requests...
                  </p>
                </div>
              ) : withdrawals.length === 0 ? (
                <div className="bg-white/10 border border-white/20 rounded-2xl p-8 text-center">
                  <p className="text-gray-400">No withdrawals found</p>
                </div>
              ) : (
                withdrawals.map((w) => (
                  <div
                    key={w._id}
                    className="bg-white/10 border border-white/20 rounded-2xl p-6 cursor-pointer transition-all hover:bg-white/15 hover:border-indigo-400/40"
                    onClick={() => setViewingWithdrawal(w)}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h3 className="text-white font-bold text-lg">
                          {w.influencerId.name}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {w.influencerId.email}
                        </p>
                        <p className="text-green-400 font-bold mt-2">
                          ₹{w.amount}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          {w.paymentMethod.toUpperCase()} •{" "}
                          {new Date(w.createdAt).toLocaleDateString()}
                        </p>
                        <span
                          className={`inline-flex mt-2 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            w.status === "approved"
                              ? "bg-blue-500/20 text-blue-300"
                              : w.status === "paid"
                                ? "bg-green-500/20 text-green-300"
                                : w.status === "rejected"
                                  ? "bg-red-500/20 text-red-300"
                                  : "bg-yellow-500/20 text-yellow-300"
                          }`}
                        >
                          {w.status.toUpperCase()}
                        </span>
                        <p className="text-indigo-300 text-xs mt-2">
                          Click to view submitted payment details
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProcessWithdrawal(
                              w._id,
                              w.status === "approved" ? "pending" : "approved",
                            );
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                            w.status === "approved"
                              ? "bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-300"
                              : "bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300"
                          }`}
                        >
                          <Check className="w-4 h-4" />{" "}
                          {w.status === "approved" ? "Set Pending" : "Approve"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProcessWithdrawal(w._id, "rejected");
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-300 font-medium transition-colors text-sm"
                        >
                          <X className="w-4 h-4" /> Reject
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProcessWithdrawal(w._id, "paid");
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg text-green-300 font-medium transition-colors text-sm"
                        >
                          💰 Mark Paid
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {viewingWithdrawal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
              <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-indigo-500/30 rounded-2xl p-6 max-w-2xl w-full shadow-2xl shadow-indigo-500/20 transform transition-all duration-300 max-h-[90vh] overflow-y-auto">
                <div className="mb-6 pb-4 border-b border-indigo-500/20 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-white font-bold text-xl">
                      Withdrawal Details
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                      {viewingWithdrawal.influencerId.name} •{" "}
                      {viewingWithdrawal.influencerId.email}
                    </p>
                  </div>
                  <button
                    onClick={() => setViewingWithdrawal(null)}
                    className="text-gray-400 hover:text-white text-2xl leading-none"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-gray-400 text-sm">Amount</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">
                      ₹{viewingWithdrawal.amount}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-gray-400 text-sm">Requested On</p>
                    <p className="text-white font-semibold mt-1">
                      {new Date(viewingWithdrawal.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-gray-400 text-sm">Payment Method</p>
                    <p className="text-white font-semibold mt-1 uppercase">
                      {viewingWithdrawal.paymentMethod.replace("_", " ")}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-gray-400 text-sm">Status</p>
                    <p className="text-white font-semibold mt-1 capitalize">
                      {viewingWithdrawal.status}
                    </p>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-5 border border-white/10 mb-6">
                  <h4 className="text-white font-semibold mb-4">
                    Submitted Payment Details
                  </h4>

                  {(() => {
                    const details = viewingWithdrawal.paymentDetails;
                    const bankDetails = details?.bankDetails;
                    const bankName = details?.bankName || bankDetails?.bankName;
                    const accountNumber =
                      details?.accountNumber || bankDetails?.accountNumber;
                    const ifscCode = details?.ifscCode || bankDetails?.ifscCode;
                    const accountHolderName =
                      details?.accountHolderName ||
                      bankDetails?.accountHolderName ||
                      bankDetails?.accountHolder;

                    if (!details) {
                      return (
                        <p className="text-gray-400 text-sm">
                          No payment details were included with this request.
                        </p>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {details.upiId && (
                          <div className="bg-white/10 rounded-lg p-3">
                            <p className="text-gray-400">UPI ID</p>
                            <p className="text-white font-medium mt-1 break-all">
                              {details.upiId}
                            </p>
                          </div>
                        )}
                        {details.paytmNumber && (
                          <div className="bg-white/10 rounded-lg p-3">
                            <p className="text-gray-400">Paytm Number</p>
                            <p className="text-white font-medium mt-1">
                              {details.paytmNumber}
                            </p>
                          </div>
                        )}
                        {accountHolderName && (
                          <div className="bg-white/10 rounded-lg p-3">
                            <p className="text-gray-400">Account Holder Name</p>
                            <p className="text-white font-medium mt-1">
                              {accountHolderName}
                            </p>
                          </div>
                        )}
                        {bankName && (
                          <div className="bg-white/10 rounded-lg p-3">
                            <p className="text-gray-400">Bank Name</p>
                            <p className="text-white font-medium mt-1">
                              {bankName}
                            </p>
                          </div>
                        )}
                        {accountNumber && (
                          <div className="bg-white/10 rounded-lg p-3">
                            <p className="text-gray-400">Account Number</p>
                            <p className="text-white font-medium mt-1">
                              {accountNumber}
                            </p>
                          </div>
                        )}
                        {ifscCode && (
                          <div className="bg-white/10 rounded-lg p-3">
                            <p className="text-gray-400">IFSC Code</p>
                            <p className="text-white font-medium mt-1">
                              {ifscCode}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {(viewingWithdrawal.adminNote || viewingWithdrawal.transactionId) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {viewingWithdrawal.transactionId && (
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <p className="text-gray-400 text-sm">Transaction ID</p>
                        <p className="text-white font-medium mt-1 break-all">
                          {viewingWithdrawal.transactionId}
                        </p>
                      </div>
                    )}
                    {viewingWithdrawal.adminNote && (
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <p className="text-gray-400 text-sm">Admin Note</p>
                        <p className="text-white font-medium mt-1">
                          {viewingWithdrawal.adminNote}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => {
                      handleProcessWithdrawal(
                        viewingWithdrawal._id,
                        viewingWithdrawal.status === "approved"
                          ? "pending"
                          : "approved",
                      );
                      setViewingWithdrawal(null);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                      viewingWithdrawal.status === "approved"
                        ? "bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-300"
                        : "bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300"
                    }`}
                  >
                    <Check className="w-4 h-4" />{" "}
                    {viewingWithdrawal.status === "approved"
                      ? "Set Pending"
                      : "Approve"}
                  </button>
                  <button
                    onClick={() => {
                      handleProcessWithdrawal(viewingWithdrawal._id, "rejected");
                      setViewingWithdrawal(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-300 font-medium transition-colors text-sm"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                  <button
                    onClick={() => {
                      handleProcessWithdrawal(viewingWithdrawal._id, "paid");
                      setViewingWithdrawal(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg text-green-300 font-medium transition-colors text-sm"
                  >
                    💰 Mark Paid
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PRODUCTS VIEW */}
          {currentView === "products" && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-gray-900">
                  Products ({products.length})
                </h2>
                <button
                  onClick={() => {
                    setShowProductForm(!showProductForm);
                    setEditingProduct(null);
                    setProductForm(createDefaultProductForm());
                  }}
                  className="group flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white-500 font-bold tracking-wide transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 text-white-800"
                >
                  <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300 text-white-900" />
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
                  <form
                    onSubmit={handleAddProduct}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  >
                    <div>
                      <label className="block text-gray-700 font-bold text-sm mb-2">
                        Product Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Anime Sticker Set"
                        value={productForm.name}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            name: e.target.value,
                          })
                        }
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold text-sm mb-2">
                        Price (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="499"
                        value={productForm.price}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            price: parseFloat(e.target.value),
                          })
                        }
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold text-sm mb-2">
                        Category
                      </label>
                      <select
                        value={productForm.category}
                        onChange={(e) => {
                          const nextCategory = e.target.value as AdminProductCategory;
                          setProductForm({
                            ...productForm,
                            category: nextCategory,
                            subcategory: "",
                          });
                        }}
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300 cursor-pointer"
                      >
                        {ADMIN_PRODUCT_CATEGORY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.emoji} {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold text-sm mb-2">
                        Subcategory
                      </label>
                      <input
                        type="text"
                        list="admin-product-subcategory-add"
                        placeholder="Optional (e.g., Cricket, Birthday, Dog Lovers)"
                        value={productForm.subcategory}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            subcategory: sanitizeProductSubcategory(e.target.value),
                          })
                        }
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300"
                      />
                      <datalist id="admin-product-subcategory-add">
                        {ADMIN_PRODUCT_SUBCATEGORY_SUGGESTIONS[
                          productForm.category
                        ].map((subcategory) => (
                          <option key={subcategory} value={subcategory} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold text-sm mb-2">
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        placeholder="100"
                        value={productForm.stock}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            stock: parseInt(e.target.value),
                          })
                        }
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-gray-700 font-bold text-sm mb-2">
                        Image URL
                      </label>
                      <input
                        type="text"
                        placeholder="/badge/image.png or https://example.com/image.jpg"
                        value={productForm.image}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            image: e.target.value,
                          })
                        }
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-gray-700 font-bold text-sm mb-2">
                        Description
                      </label>
                      <textarea
                        placeholder="Describe the product..."
                        value={productForm.description}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            description: e.target.value,
                          })
                        }
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
                        <span className="flex items-center justify-center gap-2 "> 
                          <Plus className="w-5 h-5" />
                          Add Product
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowProductForm(false);
                          setProductForm(createDefaultProductForm());
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
                      (p) =>
                        p.category === category &&
                        (p.isPlaceholder || hasValidImage(p.image)),
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
                              {categoryProducts.length}{" "}
                              {categoryProducts.length === 1
                                ? "product"
                                : "products"}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                          {categoryProducts.map((product) => (
                            <div
                              key={product._id}
                              className="group bg-white border border-gray-200 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
                            >
                              {/* Image */}
                              <div className="relative h-56 bg-gray-100 overflow-hidden">
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                {/* Stock badge overlay */}
                                <div className="absolute top-3 right-3">
                                  <span
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                                      product.stock > 0
                                        ? "bg-green-100 text-green-700 border border-green-200"
                                        : "bg-red-100 text-red-700 border border-red-200"
                                    }`}
                                  >
                                    {product.isPlaceholder
                                      ? "Sample"
                                      : `${product.stock} in stock`}
                                  </span>
                                </div>
                              </div>

                              {/* Content */}
                              <div className="p-5 space-y-3">
                                <h4 className="text-gray-900 font-bold text-lg line-clamp-2 leading-tight">
                                  {product.name}
                                </h4>
                                <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
                                  {product.description}
                                </p>
                                {product.subcategory && (
                                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                                    {product.subcategory}
                                  </p>
                                )}

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
                                          subcategory: sanitizeProductSubcategory(
                                            product.subcategory,
                                          ),
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
                                      onClick={() =>
                                        setConfirmingDeleteProduct(product)
                                      }
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
                  <p className="text-gray-500 text-lg">
                    📦 No products yet. Add your first product to get started!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ================= PROMO VIEW ================= */}
          {currentView === "promo" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black">Promo Codes ({promos.length})</h2>
                <button
                  type="button"
                  onClick={() => openPromoModal()}
                  className="bg-indigo-600 hover:bg-indigo-700 admin-zoho-keep-white px-4 py-2 rounded-lg text-sm font-semibold"
                >
                  + Create Promo
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border rounded-xl p-4">
                  <p className="text-xs font-black uppercase text-slate-500">Total Codes</p>
                  <p className="text-2xl font-black">{promos.length}</p>
                </div>
                <div className="bg-white border rounded-xl p-4">
                  <p className="text-xs font-black uppercase text-slate-500">Active</p>
                  <p className="text-2xl font-black text-green-600">
                    {promos.filter((p) => p.isActive && !isPromoExpired(p.validUntil)).length}
                  </p>
                </div>
                <div className="bg-white border rounded-xl p-4">
                  <p className="text-xs font-black uppercase text-slate-500">Expired</p>
                  <p className="text-2xl font-black text-red-600">
                    {promos.filter((p) => isPromoExpired(p.validUntil)).length}
                  </p>
                </div>
                <div className="bg-white border rounded-xl p-4">
                  <p className="text-xs font-black uppercase text-slate-500">Total Uses</p>
                  <p className="text-2xl font-black text-indigo-600">
                    {promos.reduce((sum, p) => sum + (p.usedCount || 0), 0)}
                  </p>
                </div>
              </div>

              <div className="bg-white border rounded-xl overflow-hidden">
                <div className="grid grid-cols-8 px-6 py-4 text-sm font-bold border-b bg-slate-50 text-left">
                  <span>Code</span>
                  <span>Type</span>
                  <span>Discount</span>
                  <span>Usage</span>
                  <span>Valid Until</span>
                  <span>Status</span>
                  <span>Toggle</span>
                  <span>Actions</span>
                </div>

                {isLoadingPromos ? (
                  <div className="p-10 text-center text-slate-400">Loading promo codes...</div>
                ) : promos.length === 0 ? (
                  <div className="p-10 text-center text-slate-400">No promo codes found</div>
                ) : (
                  promos.map((promo) => (
                    <div
                      key={promo._id}
                      className="grid grid-cols-8 px-6 py-4 text-sm border-b hover:bg-slate-50 text-left items-center"
                    >
                      <span className="font-mono font-bold text-indigo-600">{promo.code}</span>
                      <span className="capitalize">{promo.promoType}</span>
                      <span>
                        {promo.discountType === "percentage"
                          ? `${promo.discountValue}%`
                          : `₹${promo.discountValue}`}
                      </span>
                      <span>
                        {promo.usedCount}
                        {promo.usageLimit ? ` / ${promo.usageLimit}` : ""}
                      </span>
                      <span>{new Date(promo.validUntil).toLocaleDateString()}</span>
                      <span>
                        {isPromoExpired(promo.validUntil) ? (
                          <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            Expired
                          </span>
                        ) : promo.isActive ? (
                          <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                            Inactive
                          </span>
                        )}
                      </span>
                      <span>
                        <button
                          type="button"
                          onClick={() => togglePromoStatus(promo._id)}
                          className="border rounded-lg px-2 py-1 text-xs hover:bg-slate-100"
                        >
                          {promo.isActive ? "Disable" : "Enable"}
                        </button>
                      </span>
                      <span className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openPromoModal(promo)}
                          className="border rounded-lg px-2 py-1 text-xs hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePromoCode(promo._id)}
                          className="border border-red-300 text-red-700 rounded-lg px-2 py-1 text-xs hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </span>
                    </div>
                  ))
                )}
              </div>

              {showPromoModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                  <div className="bg-white w-full max-w-2xl rounded-xl border p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold">
                        {editingPromoId ? "Edit Promo Code" : "Create Promo Code"}
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPromoModal(false);
                          setPromoFormError("");
                        }}
                        className="text-sm text-slate-500 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        placeholder="Promo Code"
                        value={promoForm.code}
                        onChange={(e) =>
                          setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })
                        }
                        className="border rounded-lg px-3 py-2"
                      />
                      <select
                        value={promoForm.promoType}
                        onChange={(e) =>
                          setPromoForm({
                            ...promoForm,
                            promoType: e.target.value as "company" | "influencer",
                          })
                        }
                        className="border rounded-lg px-3 py-2"
                      >
                        <option value="company">Company</option>
                        <option value="influencer">Influencer</option>
                      </select>
                      <select
                        value={promoForm.discountType}
                        onChange={(e) =>
                          setPromoForm({
                            ...promoForm,
                            discountType: e.target.value as "percentage" | "fixed",
                          })
                        }
                        className="border rounded-lg px-3 py-2"
                      >
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Discount Value"
                        value={promoForm.discountValue}
                        onChange={(e) =>
                          setPromoForm({
                            ...promoForm,
                            discountValue: Number(e.target.value || 0),
                          })
                        }
                        className="border rounded-lg px-3 py-2"
                      />
                      <input
                        type="number"
                        placeholder="Min Order Amount"
                        value={promoForm.minOrderAmount}
                        onChange={(e) =>
                          setPromoForm({
                            ...promoForm,
                            minOrderAmount: Number(e.target.value || 0),
                          })
                        }
                        className="border rounded-lg px-3 py-2"
                      />
                      <input
                        type="number"
                        placeholder="Usage Limit (optional)"
                        value={promoForm.usageLimit ?? ""}
                        onChange={(e) =>
                          setPromoForm({
                            ...promoForm,
                            usageLimit: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="border rounded-lg px-3 py-2"
                      />
                      {promoForm.discountType === "percentage" && (
                        <input
                          type="number"
                          placeholder="Max Discount (optional)"
                          value={promoForm.maxDiscount ?? ""}
                          onChange={(e) =>
                            setPromoForm({
                              ...promoForm,
                              maxDiscount: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          className="border rounded-lg px-3 py-2"
                        />
                      )}
                      {promoForm.promoType === "influencer" && (
                        <input
                          type="number"
                          placeholder="Earning Per Unit"
                          value={promoForm.earningPerUnit}
                          onChange={(e) =>
                            setPromoForm({
                              ...promoForm,
                              earningPerUnit: Number(e.target.value || 0),
                            })
                          }
                          className="border rounded-lg px-3 py-2"
                        />
                      )}
                      <input
                        type="date"
                        value={promoForm.validFrom}
                        onChange={(e) =>
                          setPromoForm({ ...promoForm, validFrom: e.target.value })
                        }
                        className="border rounded-lg px-3 py-2"
                      />
                      <input
                        type="date"
                        value={promoForm.validUntil}
                        onChange={(e) =>
                          setPromoForm({ ...promoForm, validUntil: e.target.value })
                        }
                        className="border rounded-lg px-3 py-2"
                      />
                      <input
                        placeholder="Description"
                        value={promoForm.description}
                        onChange={(e) =>
                          setPromoForm({ ...promoForm, description: e.target.value })
                        }
                        className="border rounded-lg px-3 py-2 sm:col-span-2"
                      />
                    </div>

                    {promoFormError && (
                      <p className="text-sm font-medium text-red-600">{promoFormError}</p>
                    )}

                    <div className="flex justify-end gap-3 pt-2 border-t">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPromoModal(false);
                          setPromoFormError("");
                        }}
                        className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={savePromoCode}
                        disabled={isSavingPromo}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 admin-zoho-keep-white rounded-lg text-sm font-semibold disabled:opacity-60"
                      >
                        {isSavingPromo ? "Saving..." : editingPromoId ? "Update Promo" : "Create Promo"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ALL USERS VIEW */}
          {currentView === "users" && (
            <div className="flex flex-col xl:flex-row gap-4 xl:gap-6">
              {/* ================= SIDEBAR FILTERS ================= */}
              <aside className="w-full xl:w-[280px] shrink-0 bg-white rounded-xl border p-5 space-y-6">
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
                    <input
                      type="checkbox"
                      checked={showUsers}
                      onChange={(e) => setShowUsers(e.target.checked)}
                    />
                    Users
                  </label>
                  <label className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={showAdmins}
                      onChange={(e) => setShowAdmins(e.target.checked)}
                    />
                    Admins
                  </label>
                  <label className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={showInfluencers}
                      onChange={(e) => setShowInfluencers(e.target.checked)}
                    />
                    Influencers
                  </label>
                </div>

                {/* PROVIDER */}
                <div className="space-y-2 text-sm">
                  <p className="text-xs font-black uppercase text-slate-600">
                    Provider
                  </p>
                  <label className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={showCredentials}
                      onChange={(e) => setShowCredentials(e.target.checked)}
                    />
                    Credentials
                  </label>
                  <label className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={showGoogle}
                      onChange={(e) => setShowGoogle(e.target.checked)}
                    />
                    Google
                  </label>
                </div>

                {/* DATE */}
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase text-slate-600">
                    Date
                  </p>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
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
                <div className="px-4 sm:px-6 py-4 border-b font-black">
                  Users ({filteredUsers.length})
                </div>

                <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
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
                        <td className="p-3 capitalize">
                          {u.provider || "credentials"}
                        </td>
                        <td className="p-3 text-xs text-slate-500">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              const subject = encodeURIComponent(
                                "Regarding Your StickToon Account",
                              );

                              const body = encodeURIComponent(
                                `Hi ${u.name || "there"},\n\nWe’d love to connect with you regarding your StickToon account.\n\nBest regards,\nStickToon Team`,
                              );

                              window.open(
                                `https://mail.google.com/mail/?view=cm&fs=1&to=${u.email}&su=${subject}&body=${body}`,
                                "_blank",
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
                        <td
                          colSpan={7}
                          className="p-6 text-center text-slate-400"
                        >
                          No users match filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </section>
            </div>
          )}

          {/* ALL INFLUENCERS VIEW */}
          {/* ================= ALL INFLUENCERS VIEW ================= */}
          {currentView === "all-influencers" && (
            <div className="flex flex-col xl:flex-row gap-4 xl:gap-8">
              {/* ================= SIDEBAR ================= */}
              <aside className="w-full xl:w-[260px] shrink-0 bg-white rounded-xl border p-5 space-y-6 h-fit">
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
                    onChange={(e) =>
                      setInfSort(e.target.value as "asc" | "desc")
                    }
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
                          (i) => i.influencerProfile?.isApproved,
                        ).length
                      }
                    </span>
                    <span className="flex items-center gap-1">
                      ⏳ Pending:{" "}
                      {
                        filteredInfluencers.filter(
                          (i) => !i.influencerProfile?.isApproved,
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
                          <p className="text-xs text-slate-500">{inf.email}</p>
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
                        Joined: {new Date(inf.createdAt).toLocaleDateString()}
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
            <div className="flex flex-col xl:flex-row gap-4 xl:gap-6">
              {/* ================= FILTER SIDEBAR ================= */}
              <aside className="w-full xl:w-[260px] shrink-0 bg-white rounded-xl border p-5 space-y-6 h-fit">
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
                              : [...prev, s],
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
                    onChange={(e) =>
                      setOrderSort(e.target.value as "asc" | "desc")
                    }
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h2 className="text-2xl font-black">
                    All Orders ({orders.length})
                  </h2>

                  {orders.length > 0 && (
                    <div className="text-sm text-slate-500 flex flex-wrap gap-3">
                      <span>
                        ✅ Success:{" "}
                        {orders.filter((o) => o.status === "SUCCESS").length}
                      </span>
                      <span>
                        ⏳ Pending:{" "}
                        {orders.filter((o) => o.status === "PENDING").length}
                      </span>
                      <span>
                        ❌ Failed:{" "}
                        {orders.filter((o) => o.status === "FAILED").length}
                      </span>
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

                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <span>📅 {new Date(order.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span
                            className={
                              order.isDelivered
                                ? "text-emerald-600 font-semibold"
                                : "text-amber-600 font-semibold"
                            }
                          >
                            {order.isDelivered ? "Delivered" : "Not Delivered"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {currentView === "customers" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border p-5 ">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-black">Customers ({customers.length})</h3>
                    <p className="text-sm text-slate-500">
                      Auto-built from order records. Click a row to view and edit details.
                    </p>
                  </div>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search name, phone, email, company"
                    className="w-full md:w-[320px] px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-slate-50 border-b">
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-600">
                        <th className="px-4 py-3 font-black">Account Name</th>
                        <th className="px-4 py-3 font-black">Phone</th>
                        <th className="px-4 py-3 font-black">Email</th>
                        <th className="px-4 py-3 font-black">Company</th>
                        <th className="px-4 py-3 font-black">Date</th>
                        <th className="px-4 py-3 font-black">Orders</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingData.orders ? (
                        <tr>
                          <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                            Loading customers...
                          </td>
                        </tr>
                      ) : customers.length === 0 ? (
                        <tr>
                          <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                            No customer records found
                          </td>
                        </tr>
                      ) : (
                        customers.map((customer) => (
                          <tr
                            key={customer.id}
                            onClick={() => {
                              setViewingCustomerId(customer.id);
                              setIsEditingCustomer(false);
                              setCustomerDraft({
                                accountName: customer.accountName || "",
                                phone: customer.phone || "",
                                email: customer.email || "",
                                company: customer.company || "",
                                address: customer.address || "",
                                contactName: customer.contactName || customer.accountName || "",
                                contactEmail: customer.contactEmail || customer.email || "",
                                contactPhone: customer.contactPhone || customer.phone || "",
                                contactMobile: customer.contactMobile || "",
                              });
                            }}
                            className="border-b last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {customer.accountName || "Customer"}
                            </td>
                            <td className="px-4 py-3 text-slate-700">{customer.phone || "-"}</td>
                            <td className="px-4 py-3 text-slate-700">{customer.email || "-"}</td>
                            <td className="px-4 py-3 text-slate-700">{customer.company || "-"}</td>
                            <td className="px-4 py-3 text-slate-700">
                              {customer.createdAt
                                ? new Date(customer.createdAt).toLocaleDateString("en-IN")
                                : "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-700 font-bold">{customer.orderCount}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {currentView === "reports" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-black text-slate-900">Business Reports</h3>
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                  {[
                    { key: "all", label: "All" },
                    { key: "daily", label: "Daily" },
                    { key: "weekly", label: "Weekly" },
                    { key: "monthly", label: "Monthly" },
                  ].map((option) => (
                    <button
                      key={option.key}
                      onClick={() =>
                        setReportFilter(
                          option.key as "all" | "daily" | "weekly" | "monthly",
                        )
                      }
                      className={`px-4 py-1.5 text-sm font-bold rounded-md transition ${
                        reportFilter === option.key
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border p-5">
                  <p className="text-xs uppercase font-black text-slate-500">Total Revenue (This Month)</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">₹{Math.round(reportsData.currentMonthRevenue).toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-white rounded-xl border p-5">
                  <p className="text-xs uppercase font-black text-slate-500">Total Orders</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{orders.length}</p>
                </div>
                <div className="bg-white rounded-xl border p-5">
                  <p className="text-xs uppercase font-black text-slate-500">Average Order Value (AOV)</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">₹{Math.round(reportsData.aov).toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-white rounded-xl border p-5">
                  <p className="text-xs uppercase font-black text-slate-500">Conversion Rate</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{reportsData.conversionRate.toFixed(1)}%</p>
                </div>
                <div className="bg-white rounded-xl border p-5">
                  <p className="text-xs uppercase font-black text-slate-500">Total Leads</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{leads.length}</p>
                </div>
                <div className="bg-white rounded-xl border p-5">
                  <p className="text-xs uppercase font-black text-slate-500">Total Customers</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{reportsData.totalCustomers}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-5">
                  <h4 className="text-lg font-black text-slate-900 mb-4">Revenue Target - This Year</h4>
                  {(() => {
                    const achieved = reportsData.currentYearRevenue;
                    const target = reportsData.targetRevenue;
                    const rawMax = Math.max(target, achieved, 0);
                    const normalizedBase =
                      rawMax <= 1000
                        ? 1000
                        : Math.ceil(rawMax / 10000) * 10000;
                    const maxScale = normalizedBase;
                    const achievedWidth = maxScale > 0 ? (achieved / maxScale) * 100 : 0;
                    const targetWidth = maxScale > 0 ? (target / maxScale) * 100 : 0;
                    const progress = target > 0 ? (achieved / target) * 100 : 0;
                    const scaleTicks = [0, 0.25, 0.5, 0.75, 1];
                    const showAchievedLabel = achievedWidth >= 18;

                    return (
                      <div className="space-y-6">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="mb-3 flex items-center justify-between text-sm font-bold text-slate-600">
                            <span>Entire Org</span>
                            <span>{progress.toFixed(1)}% achieved</span>
                          </div>

                          <div className="relative">
                            <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-slate-400">
                              {scaleTicks.map((tick) => (
                                <span key={tick}>{Math.round(maxScale * tick).toLocaleString("en-IN")}</span>
                              ))}
                            </div>

                            <div className="relative h-20">
                              {scaleTicks.map((tick) => (
                                <div
                                  key={tick}
                                  className="absolute top-1/2 h-14 w-px -translate-y-1/2 bg-slate-300/80"
                                  style={{ left: `${tick * 100}%` }}
                                />
                              ))}
                            <div className="absolute left-0 right-0 top-1/2 h-10 -translate-y-1/2 rounded-md bg-slate-200" />
                            <div
                              className="absolute left-0 top-1/2 h-10 -translate-y-1/2 rounded-md bg-emerald-300"
                              style={{ width: `${Math.min(achievedWidth, 100)}%` }}
                            >
                              {showAchievedLabel && (
                                <div className="flex h-full items-center justify-end pr-3 text-xl font-black text-slate-900">
                                  Rs. {Math.round(achieved).toLocaleString("en-IN")}
                                </div>
                              )}
                            </div>
                            {target > 0 && (
                              <div
                                className="absolute top-1/2 h-14 w-0.5 -translate-y-1/2 bg-slate-900"
                                style={{ left: `${Math.min(targetWidth, 100)}%` }}
                              />
                            )}

                            {!showAchievedLabel && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-black text-slate-900">
                                Rs. {Math.round(achieved).toLocaleString("en-IN")}
                              </div>
                            )}
                          </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-sm bg-emerald-400" />
                            <span>Achieved</span>
                          </div>
                          <span>
                            Forecast based on {new Date().getFullYear()} revenue pace: Rs.{" "}
                            {Math.round(reportsData.projectedYearRevenue).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-white rounded-xl border p-5">
                  <h4 className="text-lg font-black text-slate-900 mb-4">Orders by Status (Donut Chart)</h4>
                  {(() => {
                    const success = reportsData.statusCounts.SUCCESS;
                    const pending = reportsData.statusCounts.PENDING;
                    const failed = reportsData.statusCounts.FAILED;
                    const total = success + pending + failed;
                    const radius = 64;
                    const stroke = 24;
                    const circumference = 2 * Math.PI * radius;
                    const successLen = total ? (success / total) * circumference : 0;
                    const pendingLen = total ? (pending / total) * circumference : 0;
                    const failedLen = total ? (failed / total) * circumference : 0;
                    return (
                      <div className="flex flex-col md:flex-row gap-6 items-center">
                        <svg viewBox="0 0 180 180" className="w-44 h-44 -rotate-90">
                          <circle
                            cx="90"
                            cy="90"
                            r={radius}
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth={stroke}
                          />
                          <circle
                            cx="90"
                            cy="90"
                            r={radius}
                            fill="none"
                            stroke="#16a34a"
                            strokeWidth={stroke}
                            strokeDasharray={`${successLen} ${circumference - successLen}`}
                            strokeDashoffset="0"
                            strokeLinecap="butt"
                          />
                          <circle
                            cx="90"
                            cy="90"
                            r={radius}
                            fill="none"
                            stroke="#eab308"
                            strokeWidth={stroke}
                            strokeDasharray={`${pendingLen} ${circumference - pendingLen}`}
                            strokeDashoffset={-successLen}
                            strokeLinecap="butt"
                          />
                          <circle
                            cx="90"
                            cy="90"
                            r={radius}
                            fill="none"
                            stroke="#dc2626"
                            strokeWidth={stroke}
                            strokeDasharray={`${failedLen} ${circumference - failedLen}`}
                            strokeDashoffset={-(successLen + pendingLen)}
                            strokeLinecap="butt"
                          />
                          <circle cx="90" cy="90" r="40" fill="white" />
                          <text
                            x="90"
                            y="87"
                            textAnchor="middle"
                            className="fill-slate-500 text-[10px] font-bold"
                            transform="rotate(90 90 90)"
                          >
                            TOTAL
                          </text>
                          <text
                            x="90"
                            y="104"
                            textAnchor="middle"
                            className="fill-slate-900 text-[16px] font-black"
                            transform="rotate(90 90 90)"
                          >
                            {total}
                          </text>
                        </svg>
                        <div className="space-y-2 text-sm w-full">
                          <p className="font-bold text-green-700">Success: {success}</p>
                          <p className="font-bold text-yellow-700">Pending: {pending}</p>
                          <p className="font-bold text-red-700">Failed: {failed}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="bg-white rounded-xl border p-5">
                <h4 className="text-lg font-black text-slate-900 mb-4">Top Customers (Bar Chart)</h4>
                {reportsData.topCustomers.length === 0 ? (
                  <p className="text-sm text-slate-500">No order data available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="w-fit min-w-[520px]">
                      <div className="h-72 border-l border-b border-slate-200 px-4 pt-4 pb-2">
                        <div className="h-full flex items-end justify-start gap-10">
                          {reportsData.topCustomers.map((c, idx) => {
                            const max = reportsData.topCustomers[0]?.totalSpent || 1;
                            const height = Math.max((c.totalSpent / max) * 100, 6);
                            const shortName =
                              c.name.length > 12 ? `${c.name.slice(0, 12)}...` : c.name;

                            return (
                              <div
                                key={`${c.name}-${c.totalSpent}-${idx}`}
                                className="flex-1 min-w-[90px] h-full flex flex-col justify-end items-center"
                              >
                                <p className="text-xs font-black text-slate-900 mb-2">
                                  Rs. {Math.round(c.totalSpent).toLocaleString("en-IN")}
                                </p>
                                <div className="w-8/12 max-w-[84px] bg-slate-900 rounded-t-md" style={{ height: `${height}%` }} />
                                <p className="text-xs font-semibold text-slate-700 mt-2 text-center leading-tight">
                                  {shortName}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
                <div className="flex items-end gap-3 mb-4">
                  <h4 className="text-4xl font-black text-white leading-none">Product Sales</h4>
                  <p className="text-slate-400 text-2xl leading-none">{reportsData.productSalesSubtitle}</p>
                </div>

                {(() => {
                  const series = reportsData.productSalesSeries;
                  const maxValue = Math.max(
                    ...series.map((item: { value: number }) => item.value),
                    1,
                  );
                  const minValue = 0;
                  const width = 840;
                  const height = 360;
                  const leftPad = 60;
                  const rightPad = 26;
                  const topPad = 24;
                  const bottomPad = 72;
                  const plotWidth = width - leftPad - rightPad;
                  const plotHeight = height - topPad - bottomPad;
                  const yTicks = 6;

                  const xFor = (idx: number) =>
                    leftPad + (idx / (series.length - 1)) * plotWidth;

                  const yFor = (value: number) => {
                    const normalized = (value - minValue) / (maxValue - minValue || 1);
                    return topPad + (1 - normalized) * plotHeight;
                  };

                  const polylinePoints = series
                    .map((point: { value: number }, idx: number) => `${xFor(idx)},${yFor(point.value)}`)
                    .join(" ");

                  return (
                    <div className="w-full overflow-x-auto">
                      <svg
                        viewBox={`0 0 ${width} ${height}`}
                        className="w-full min-w-[760px]"
                        role="img"
                        aria-label="Product sales monthly average line chart"
                      >
                        {Array.from({ length: yTicks + 1 }).map((_, idx) => {
                          const ratio = idx / yTicks;
                          const y = topPad + ratio * plotHeight;
                          const value = Math.round(maxValue * (1 - ratio));

                          return (
                            <g key={idx}>
                              <line
                                x1={leftPad}
                                y1={y}
                                x2={width - rightPad}
                                y2={y}
                                stroke="rgba(148,163,184,0.2)"
                                strokeWidth="1"
                              />
                              <text
                                x={leftPad - 14}
                                y={y + 4}
                                textAnchor="end"
                                fill="#cbd5e1"
                                fontSize="13"
                                fontWeight="600"
                              >
                                {value}
                              </text>
                            </g>
                          );
                        })}

                        <polyline
                          fill="none"
                          stroke="#f87171"
                          strokeWidth="3"
                          points={polylinePoints}
                        />

                        {series.map((point: { label: string; value: number }, idx: number) => {
                          const x = xFor(idx);
                          const y = yFor(point.value);

                          return (
                            <g key={`${point.label}-${idx}`}>
                              <circle cx={x} cy={y} r="4" fill="#f87171" />
                              <text
                                x={x}
                                y={height - 34}
                                textAnchor="end"
                                transform={`rotate(-45 ${x} ${height - 34})`}
                                fill="#e2e8f0"
                                fontSize="12"
                                fontWeight="500"
                              >
                                {point.label}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  );
                })()}
              </div>
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
                        e.currentTarget.style.display = "none";
                        const fallback = document.createElement("div");
                        fallback.className =
                          "w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-3xl font-black text-white border-4 border-white/20";
                        fallback.textContent =
                          user?.name?.charAt(0).toUpperCase() || "A";
                        e.currentTarget.parentElement?.appendChild(fallback);
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-3xl font-black text-white border-4 border-white/20">
                      {user?.name?.charAt(0).toUpperCase() || "A"}
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-black text-white">
                      Edit Profile
                    </h2>
                    <p className="text-indigo-300 text-sm">
                      Update your account information
                    </p>
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
                    <h3 className="text-lg font-bold text-white border-b border-white/20 pb-2">
                      Basic Information
                    </h3>

                    <div>
                      <label className="block text-sm font-bold text-white mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            name: e.target.value,
                          })
                        }
                        required
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border-2 border-white/20 focus:border-indigo-500 focus:outline-none transition-all text-white font-medium placeholder:text-gray-400"
                        placeholder="Your name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-white mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            email: e.target.value,
                          })
                        }
                        required
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border-2 border-white/20 focus:border-indigo-500 focus:outline-none transition-all text-white font-medium placeholder:text-gray-400"
                        placeholder="your@email.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-white mb-2">
                        Avatar URL
                      </label>
                      <input
                        type="text"
                        value={profileForm.avatar}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            avatar: e.target.value,
                          })
                        }
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
                              e.currentTarget.style.display = "none";
                            }}
                          />
                          <span className="text-xs text-gray-400">Preview</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Change Password */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white border-b border-white/20 pb-2">
                      Change Password (Optional)
                    </h3>

                    <div>
                      <label className="block text-sm font-bold text-white mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={profileForm.currentPassword}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            currentPassword: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border-2 border-white/20 focus:border-indigo-500 focus:outline-none transition-all text-white font-medium placeholder:text-gray-400"
                        placeholder="Enter current password"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-white mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={profileForm.newPassword}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            newPassword: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border-2 border-white/20 focus:border-indigo-500 focus:outline-none transition-all text-white font-medium placeholder:text-gray-400"
                        placeholder="Enter new password (min 6 characters)"
                      />
                    </div>

                    <p className="text-xs text-gray-400">
                      💡 Leave password fields empty to keep your current
                      password
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
                    <h3 className="text-white font-bold text-xl flex items-center gap-2">
                      📦 Order Details
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                      #{viewingOrder.orderId || viewingOrder._id}
                    </p>
                  </div>
                  <button
                    onClick={() => setViewingOrder(null)}
                    className="text-gray-400 hover:text-white text-2xl leading-none"
                  >
                    ✕
                  </button>
                </div>

                {/* Order Items */}
                <div className="space-y-3 mb-6">
                  {viewingOrder.items?.map((item: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 bg-white/5 rounded-xl p-3"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 rounded-lg object-cover border border-indigo-500/30"
                      />
                      <div className="flex-1">
                        <p className="text-white font-semibold">{item.name}</p>
                        <p className="text-gray-400 text-sm">
                          ₹{item.price} × {item.quantity}
                        </p>
                      </div>
                      <p className="text-white font-bold">
                        ₹{item.price * item.quantity}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-2">
                  <div className="flex justify-between text-gray-300">
                    <span>Subtotal</span>
                    <span>
                      ₹{viewingOrder.subtotal || viewingOrder.amount - 99}
                    </span>
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
                    <p className="text-white font-semibold">
                      {viewingOrder.userId?.name || "Anonymous"}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {viewingOrder.userId?.email || "N/A"}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-gray-400 text-xs mb-1">Status</p>
                    <p
                      className={`font-bold ${viewingOrder.status === "SUCCESS" ? "text-emerald-400" : viewingOrder.status === "PENDING" ? "text-amber-400" : "text-red-400"}`}
                    >
                      {viewingOrder.status}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {new Date(viewingOrder.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-4 mb-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Delivery Status</p>
                      <p
                        className={`font-bold ${viewingOrder.isDelivered ? "text-emerald-400" : "text-amber-300"}`}
                      >
                        {viewingOrder.isDelivered ? "Delivered" : "Not Delivered"}
                      </p>
                      {viewingOrder.deliveredAt && (
                        <p className="text-gray-400 text-xs mt-1">
                          Delivered on {new Date(viewingOrder.deliveredAt).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => updateOrderDeliveryStatus(viewingOrder._id, true)}
                        disabled={
                          updatingDeliveryOrderId === viewingOrder._id ||
                          Boolean(viewingOrder.isDelivered)
                        }
                        className="px-4 py-2 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updatingDeliveryOrderId === viewingOrder._id
                          ? "Updating..."
                          : "Mark Delivered"}
                      </button>

                      <button
                        onClick={() => updateOrderDeliveryStatus(viewingOrder._id, false)}
                        disabled={
                          updatingDeliveryOrderId === viewingOrder._id ||
                          !Boolean(viewingOrder.isDelivered)
                        }
                        className="px-4 py-2 rounded-lg text-sm font-bold bg-amber-500 hover:bg-amber-400 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updatingDeliveryOrderId === viewingOrder._id
                          ? "Updating..."
                          : "Mark Not Delivered"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Commercial Proposal Preview */}
                {(() => {
                  const items = viewingOrder.items || [];
                  const totalUnits = items.reduce(
                    (sum: number, item: any) => sum + Number(item.quantity || 0),
                    0,
                  );
                  const subtotal =
                    Number(viewingOrder.subtotal) ||
                    items.reduce(
                      (sum: number, item: any) =>
                        sum + Number(item.price || 0) * Number(item.quantity || 0),
                      0,
                    );
                  const basePricePerUnit =
                    totalUnits > 0 ? subtotal / totalUnits : Number(viewingOrder.amount || 0);
                  const gstPerUnit = basePricePerUnit * 0.18;
                  const totalPerUnit = basePricePerUnit + gstPerUnit;
                  const overviewPoints = [
                    "Specializes in the creation of 58 mm round plastic pin badges.",
                    "Fully customizable plastic badges tailored to meet design preferences.",
                    "Innovative pin+magnet dual feature for apparel and magnetic surfaces.",
                    "High-quality glossy coating for a durable finish.",
                  ];

                  return (
                    <div className="mb-6 overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.08fr]">
                        <div className="border-b border-slate-200 px-6 py-8 md:border-b-0 md:border-r md:px-12 md:py-11">
                          <p className="mb-8 text-xs font-extrabold uppercase tracking-[0.24em] text-slate-400">
                            Commercial Proposal
                          </p>

                          <div className="space-y-0">
                            <div className="flex items-center justify-between border-b border-slate-200 py-5">
                              <span className="text-[15px] font-semibold text-slate-900">
                                Product Price
                              </span>
                              <span className="text-[15px] font-extrabold text-slate-950">
                                {formatINRCurrency(basePricePerUnit)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between border-b border-slate-200 py-5">
                              <span className="text-[15px] font-semibold text-slate-900">
                                GST (18%)
                              </span>
                              <span className="text-[15px] font-extrabold text-slate-950">
                                {formatINRCurrency(gstPerUnit)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-7">
                              <span className="text-[18px] font-bold text-slate-950">
                                Total Per Unit
                              </span>
                              <span className="text-[22px] font-black text-slate-950 md:text-[24px]">
                                {formatINRCurrency(totalPerUnit)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="px-6 py-8 md:px-12 md:py-11">
                          <p className="mb-8 text-xs font-extrabold uppercase tracking-[0.24em] text-slate-400">
                            Sticktoon Overview
                          </p>

                          <ul className="space-y-5 text-[15px] leading-7 text-slate-600">
                            {overviewPoints.map((point) => (
                              <li key={point} className="flex items-start gap-4">
                                <span className="mt-[10px] h-1.5 w-1.5 flex-none rounded-full bg-blue-500" />
                                <span className="font-semibold">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Action Button */}
                <button
                  onClick={async () => {
                    const invoiceId =
                      typeof viewingOrder.invoiceId === "string"
                        ? viewingOrder.invoiceId
                        : viewingOrder.invoiceId?._id;
                    if (!invoiceId) {
                      showToast("warning", "⚠️ Invoice not available yet");
                      return;
                    }
                    try {
                      const token = localStorage.getItem("adminToken");
                      const res = await fetch(
                        `${API_BASE_URL}/api/invoice/${invoiceId}/download`,
                        {
                          headers: { Authorization: `Bearer ${token}` },
                        },
                      );
                      if (!res.ok) throw new Error("Failed to download");
                      const blob = await res.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `invoice-${invoiceId}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                      showToast("success", "✅ Invoice downloaded!");
                    } catch (error) {
                      showToast("error", "❌ Download failed");
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

          {selectedCustomer && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="mb-6 pb-4 border-b border-slate-200 flex items-start justify-between">
                  <div>
                    <h3 className="text-slate-900 font-black text-2xl">Customer Record</h3>
                    <p className="text-slate-500 text-sm mt-1">
                      {selectedCustomer.accountName || "Customer"} • {selectedCustomer.email || "No email"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setViewingCustomerId(null);
                      setIsEditingCustomer(false);
                    }}
                    className="text-slate-400 hover:text-slate-900 text-2xl leading-none"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-black uppercase text-slate-500 mb-2">Name</p>
                    {isEditingCustomer ? (
                      <input
                        type="text"
                        value={customerDraft.accountName}
                        onChange={(e) =>
                          setCustomerDraft((prev) => ({ ...prev, accountName: e.target.value }))
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    ) : (
                      <p className="font-bold text-slate-900">{selectedCustomer.accountName || "-"}</p>
                    )}
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-black uppercase text-slate-500 mb-2">Phone</p>
                    {isEditingCustomer ? (
                      <input
                        type="text"
                        value={customerDraft.phone}
                        onChange={(e) =>
                          setCustomerDraft((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    ) : (
                      <p className="font-bold text-slate-900">{selectedCustomer.phone || "-"}</p>
                    )}
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-black uppercase text-slate-500 mb-2">Email</p>
                    {isEditingCustomer ? (
                      <input
                        type="email"
                        value={customerDraft.email}
                        onChange={(e) =>
                          setCustomerDraft((prev) => ({ ...prev, email: e.target.value }))
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    ) : (
                      <p className="font-bold text-slate-900">{selectedCustomer.email || "-"}</p>
                    )}
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-black uppercase text-slate-500 mb-2">Address</p>
                    {isEditingCustomer ? (
                      <input
                        type="text"
                        value={customerDraft.address}
                        onChange={(e) =>
                          setCustomerDraft((prev) => ({ ...prev, address: e.target.value }))
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    ) : (
                      <p className="font-bold text-slate-900">{selectedCustomer.address || "-"}</p>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl border overflow-hidden">
                  <div className="px-4 py-3 border-b flex items-center justify-between">
                    <h4 className="font-black text-slate-900">Contact</h4>
                    <button
                      onClick={() => {
                        if (!isEditingCustomer) {
                          setIsEditingCustomer(true);
                          return;
                        }

                        setCustomerEdits((prev) => ({
                          ...prev,
                          [selectedCustomer.id]: {
                            ...prev[selectedCustomer.id],
                            accountName: customerDraft.accountName.trim(),
                            phone: customerDraft.phone.trim(),
                            email: customerDraft.email.trim(),
                            company: customerDraft.company.trim(),
                            address: customerDraft.address.trim(),
                            contactName: customerDraft.contactName.trim(),
                            contactEmail: customerDraft.contactEmail.trim(),
                            contactPhone: customerDraft.contactPhone.trim(),
                            contactMobile: customerDraft.contactMobile.trim(),
                          },
                        }));
                        setIsEditingCustomer(false);
                        showToast("success", "✅ Customer record updated");
                      }}
                      className="px-3 py-1.5 text-sm font-bold rounded-lg border border-slate-300 hover:bg-slate-100"
                    >
                      {isEditingCustomer ? "Save" : "Edit"}
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px]">
                      <thead className="bg-white border-b">
                        <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                          <th className="px-4 py-3 font-black">Name</th>
                          <th className="px-4 py-3 font-black">Email</th>
                          <th className="px-4 py-3 font-black">Phone</th>
                          <th className="px-4 py-3 font-black">Mobile</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-4 py-3">
                            {isEditingCustomer ? (
                              <input
                                type="text"
                                value={customerDraft.contactName}
                                onChange={(e) =>
                                  setCustomerDraft((prev) => ({ ...prev, contactName: e.target.value }))
                                }
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                              />
                            ) : (
                              <span className="font-semibold text-slate-900">
                                {selectedCustomer.contactName || selectedCustomer.accountName || "-"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditingCustomer ? (
                              <input
                                type="email"
                                value={customerDraft.contactEmail}
                                onChange={(e) =>
                                  setCustomerDraft((prev) => ({ ...prev, contactEmail: e.target.value }))
                                }
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                              />
                            ) : (
                              <span>{selectedCustomer.contactEmail || selectedCustomer.email || "-"}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditingCustomer ? (
                              <input
                                type="text"
                                value={customerDraft.contactPhone}
                                onChange={(e) =>
                                  setCustomerDraft((prev) => ({ ...prev, contactPhone: e.target.value }))
                                }
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                              />
                            ) : (
                              <span>{selectedCustomer.contactPhone || selectedCustomer.phone || "-"}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditingCustomer ? (
                              <input
                                type="text"
                                value={customerDraft.contactMobile}
                                onChange={(e) =>
                                  setCustomerDraft((prev) => ({ ...prev, contactMobile: e.target.value }))
                                }
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                              />
                            ) : (
                              <span>{selectedCustomer.contactMobile || "-"}</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => {
                      setViewingCustomerId(null);
                      setIsEditingCustomer(false);
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit User Modal */}
          {editingUser && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
              <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-indigo-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-indigo-500/20 transform transition-all duration-300">
                {/* Header */}
                <div className="mb-6 pb-4 border-b border-indigo-500/20">
                  <h3 className="text-white font-bold text-xl flex items-center gap-2">
                    ✏️ Edit User
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {editingUser.email}
                  </p>
                </div>

                {/* Form */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-gray-300 text-sm font-medium block mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter user name"
                      defaultValue={editingUser.name}
                      onChange={(e) =>
                        setEditingUser({ ...editingUser, name: e.target.value })
                      }
                      className="w-full px-4 py-2.5 bg-white/10 border border-indigo-500/30 hover:border-indigo-500/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 text-sm font-medium block mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="Enter email address"
                      defaultValue={editingUser.email}
                      onChange={(e) =>
                        setEditingUser({
                          ...editingUser,
                          email: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 bg-white/10 border border-indigo-500/30 hover:border-indigo-500/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    />
                  </div>

                  {/* Super Admin Password Field */}
                  {isSuperAdmin && (
                    <div>
                      <label className="text-gray-300 text-sm font-medium block mb-2">
                        🔐 Password (Super Admin Only)
                      </label>
                      <input
                        type="password"
                        placeholder="Leave empty to keep unchanged"
                        value={editingUser.password || ""}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            password: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 bg-yellow-500/10 border border-yellow-500/30 hover:border-yellow-500/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all"
                      />
                      {editingUser.password &&
                        editingUser.password.length < 6 && (
                          <p className="text-yellow-300 text-xs mt-1">
                            ⚠️ Password must be at least 6 characters
                          </p>
                        )}
                    </div>
                  )}

                  {/* Super Admin Avatar Field */}
                  {isSuperAdmin && (
                    <div>
                      <label className="text-gray-300 text-sm font-medium block mb-2">
                        🖼️ Avatar URL (Super Admin Only)
                      </label>
                      <input
                        type="url"
                        placeholder="Enter image URL (leave empty to remove avatar)"
                        value={editingUser.avatar || ""}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            avatar: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 bg-yellow-500/10 border border-yellow-500/30 hover:border-yellow-500/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all"
                      />
                      {editingUser.avatar && (
                        <div className="mt-2 flex items-center gap-2">
                          <img
                            src={editingUser.avatar}
                            alt="preview"
                            className="w-8 h-8 rounded-full object-cover border border-indigo-500/30"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
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
                      const updates: any = {
                        name: editingUser.name,
                        email: editingUser.email,
                      };
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
                  <h3 className="text-white font-bold text-xl flex items-center gap-2">
                    🔐 Super Admin Password Reset
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Resetting password for:
                  </p>
                  <p className="text-yellow-300 text-sm font-semibold truncate">
                    {resettingPassword.email}
                  </p>
                </div>

                {/* Info Box */}
                <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-300 text-xs">
                    ⚠️ Only super admin can reset user passwords. Enter a new
                    password below.
                  </p>
                </div>

                {/* Form */}
                <div className="mb-6">
                  <label className="text-gray-300 text-sm font-medium block mb-2">
                    New Password
                  </label>
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
                    <span
                      className={`text-xs font-medium ${
                        newPassword.length >= 6
                          ? "text-emerald-400"
                          : "text-gray-500"
                      }`}
                    >
                      {newPassword.length >= 6
                        ? "✓ Strong"
                        : "○ Min 6 characters"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {newPassword.length}/20
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      handleResetPassword(resettingPassword._id, newPassword)
                    }
                    className={`flex-1 py-2.5 rounded-lg text-white font-semibold transition-all duration-200 ${
                      newPassword.length >= 6
                        ? "bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 shadow-lg hover:shadow-lg hover:shadow-yellow-500/30"
                        : "bg-gray-600 cursor-not-allowed opacity-50"
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
                  <h3 className="text-white font-bold text-xl mb-2">
                    Delete User?
                  </h3>
                  <p className="text-gray-300 font-semibold mb-2">
                    {confirmingDelete.name}
                  </p>
                  <p className="text-gray-400 text-sm mb-2">
                    {confirmingDelete.email}
                  </p>
                  <p className="text-red-300 text-xs border-t border-red-500/20 mt-4 pt-4">
                    ⚠️ This action cannot be undone. All data associated with
                    this user will be deleted.
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
                  <h3 className="text-white font-bold text-xl mb-2">
                    Delete Product?
                  </h3>
                  <p className="text-gray-300 font-semibold mb-2">
                    {confirmingDeleteProduct.name}
                  </p>
                  <p className="text-indigo-400 text-sm mb-2">
                    ₹{confirmingDeleteProduct.price}
                  </p>
                  <p className="text-red-300 text-xs border-t border-red-500/20 mt-4 pt-4">
                    ⚠️ This action cannot be undone. The product will be deleted
                    permanently.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      handleDeleteProduct(confirmingDeleteProduct._id)
                    }
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
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUpdateProduct(editingProduct._id);
                  }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Product Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Anime Sticker Set"
                      value={productForm.name}
                      onChange={(e) =>
                        setProductForm({ ...productForm, name: e.target.value })
                      }
                      required
                      className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="499"
                      value={productForm.price}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          price: parseFloat(e.target.value),
                        })
                      }
                      required
                      className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Category
                    </label>
                    <select
                      value={productForm.category}
                      onChange={(e) => {
                        const nextCategory = e.target.value as AdminProductCategory;
                        setProductForm({
                          ...productForm,
                          category: nextCategory,
                          subcategory: "",
                        });
                      }}
                      required
                      className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white focus:border-indigo-500 focus:outline-none transition-all"
                    >
                      {ADMIN_PRODUCT_CATEGORY_OPTIONS.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                          className="text-black"
                        >
                          {option.emoji} {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Subcategory
                    </label>
                    <input
                      type="text"
                      list="admin-product-subcategory-edit"
                      placeholder="Optional (e.g., Cricket, Birthday, Dog Lovers)"
                      value={productForm.subcategory}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          subcategory: sanitizeProductSubcategory(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-all"
                    />
                    <datalist id="admin-product-subcategory-edit">
                      {ADMIN_PRODUCT_SUBCATEGORY_SUGGESTIONS[productForm.category].map(
                        (subcategory) => (
                          <option key={subcategory} value={subcategory} />
                        ),
                      )}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Stock Quantity
                    </label>
                    <input
                      type="number"
                      placeholder="100"
                      value={productForm.stock}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          stock: parseInt(e.target.value),
                        })
                      }
                      required
                      className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-white font-semibold mb-2">
                      Image URL
                    </label>
                    <input
                      type="text"
                      placeholder="/badge/image.png or https://example.com/image.jpg"
                      value={productForm.image}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          image: e.target.value,
                        })
                      }
                      required
                      className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-white font-semibold mb-2">
                      Description
                    </label>
                    <textarea
                      placeholder="Describe the product..."
                      value={productForm.description}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          description: e.target.value,
                        })
                      }
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
                        setProductForm(createDefaultProductForm());
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
      <div className="fixed top-4 left-3 right-3 sm:top-6 sm:left-auto sm:right-6 z-[9999] space-y-3 max-w-md sm:w-full">
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle className="w-6 h-6 text-green-400" />,
            error: <XCircle className="w-6 h-6 text-red-400" />,
            info: <Info className="w-6 h-6 text-blue-400" />,
            warning: <AlertCircle className="w-6 h-6 text-yellow-400" />,
          };

          const colors = {
            success:
              "from-green-500/20 via-emerald-500/10 to-transparent border-green-400/50 shadow-[0_8px_32px_rgba(34,197,94,0.3)]",
            error:
              "from-red-500/20 via-pink-500/10 to-transparent border-red-400/50 shadow-[0_8px_32px_rgba(239,68,68,0.3)]",
            info: "from-blue-500/20 via-indigo-500/10 to-transparent border-blue-400/50 shadow-[0_8px_32px_rgba(59,130,246,0.3)]",
            warning:
              "from-yellow-500/20 via-orange-500/10 to-transparent border-yellow-400/50 shadow-[0_8px_32px_rgba(234,179,8,0.3)]",
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
                <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
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

