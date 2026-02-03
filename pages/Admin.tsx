import React, { useState, useEffect, JSX } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import { Eye, EyeOff, LogOut, Users, AlertCircle, Check, X, Upload, Plus, Edit2, Trash2, TrendingUp, DollarSign, CheckCircle, XCircle, Info } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";

// Super Admin Email - Only this email can edit/remove other admins
const SUPER_ADMIN_EMAIL = "sticktoon.xyz@gmail.com";

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
  category: "Moody" | "Sports" | "Religious" | "Entertainment" | "Events" | "Animal" | "Couple" | "Anime" | "Custom";
  image: string;
  stock: number;
  createdAt: string;
}

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
  const [currentView, setCurrentView] = useState<"login" | "dashboard" | "users" | "all-influencers" | "influencers" | "withdrawals" | "products" | "orders" | "profile">("login");

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
    category: "Moody" as "Moody" | "Sports" | "Religious" | "Entertainment" | "Events" | "Animal" | "Couple" | "Anime" | "Custom",
    image: "",
    stock: 0,
  });

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
          category: category as 'Moody' | 'Sports' | 'Religious' | 'Entertainment' | 'Events' | 'Animal' | 'Couple' | 'Anime' | 'Custom'
        });
      }
    }
  }, [location.search, isAuthenticated]);

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
      // Fetch stats
      const statsRes = await fetch(`${API_BASE_URL}/api/admin/influencer-manage/stats/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      // Fetch pending influencers
      const influencersRes = await fetch(`${API_BASE_URL}/api/admin/influencer-manage/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (influencersRes.ok) {
        const data = await influencersRes.json();
        setPendingInfluencers(data);
      }

      // Fetch all influencers
      const allInfluencersRes = await fetch(`${API_BASE_URL}/api/admin/influencer-manage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (allInfluencersRes.ok) {
        const data = await allInfluencersRes.json();
        setAllInfluencers(data);
      }

      // Fetch all users
      const usersRes = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (usersRes.ok) {
        const data = await usersRes.json();
        setAllUsers(data);
      }

      // Fetch pending withdrawals
      const withdrawalsRes = await fetch(`${API_BASE_URL}/api/admin/influencer-manage/withdrawals/all?status=pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (withdrawalsRes.ok) {
        const data = await withdrawalsRes.json();
        setWithdrawals(data);
      }

      // Fetch all orders
      const ordersRes = await fetch(`${API_BASE_URL}/api/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data);
      }

      // Fetch all products
      const productsRes = await fetch(`${API_BASE_URL}/api/products`);
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data);
      }
    } catch (err) {
      console.error("Fetch data error:", err);
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
        // Refresh data
        setPendingInfluencers(pendingInfluencers.filter((inf) => inf._id !== influencerId));
        fetchDashboardData(token);
      }
    } catch (err) {
      console.error("Error:", err);
    }
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
        // Refresh
        setWithdrawals(withdrawals.filter((w) => w._id !== withdrawalId));
        fetchDashboardData(token);
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

    try {
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(productForm),
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

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(productForm),
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-black">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black text-white">🛡️ StickToon Admin</h1>
            <span className="px-3 py-1 bg-indigo-600/50 rounded-full text-indigo-200 text-xs font-bold">ADMIN MODE</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView("profile")}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg border border-indigo-500/50 transition-colors"
            >
              <Edit2 className="w-4 h-4 text-indigo-400" />
              <span className="text-indigo-300 text-sm font-medium">Edit Profile</span>
            </button>
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

      {/* Navigation */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { id: "dashboard", label: "Dashboard", icon: "📊" },
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
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-all whitespace-nowrap ${
                  currentView === tab.id
                    ? "text-white border-b-2 border-indigo-500 bg-indigo-500/10"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* DASHBOARD VIEW */}
        {currentView === "dashboard" && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="group relative bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent backdrop-blur-xl rounded-3xl p-8 border-2 border-white/20 hover:border-indigo-400/50 transition-all duration-500 hover:scale-105 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-indigo-200/80 text-sm font-bold uppercase tracking-wider mb-2">Total Influencers</p>
                    <p className="text-5xl font-black text-white mt-2">{stats.totalInfluencers}</p>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center">
                    <Users className="w-8 h-8 text-indigo-300" />
                  </div>
                </div>
              </div>

              <div className="group relative bg-gradient-to-br from-yellow-500/20 via-orange-500/10 to-transparent backdrop-blur-xl rounded-3xl p-8 border-2 border-white/20 hover:border-yellow-400/50 transition-all duration-500 hover:scale-105 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/20 rounded-full blur-2xl"></div>
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-yellow-200/80 text-sm font-bold uppercase tracking-wider mb-2">Pending Approvals</p>
                    <p className="text-5xl font-black text-white mt-2">{stats.pendingApprovals}</p>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/30 to-orange-500/30 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-yellow-300" />
                  </div>
                </div>
              </div>

              <div className="group relative bg-gradient-to-br from-green-500/20 via-emerald-500/10 to-transparent backdrop-blur-xl rounded-3xl p-8 border-2 border-white/20 hover:border-green-400/50 transition-all duration-500 hover:scale-105 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/20 rounded-full blur-2xl"></div>
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-green-200/80 text-sm font-bold uppercase tracking-wider mb-2">Pending Withdrawals</p>
                    <p className="text-5xl font-black text-white mt-2">{stats.pendingWithdrawals.count}</p>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center">
                    <DollarSign className="w-8 h-8 text-green-300" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => setCurrentView("influencers")}
                className="group relative bg-gradient-to-br from-indigo-500/10 to-purple-500/5 backdrop-blur-sm hover:from-indigo-500/20 hover:to-purple-500/10 border-2 border-white/20 hover:border-indigo-400/50 rounded-3xl p-8 transition-all duration-300 text-left hover:scale-105 active:scale-95 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all"></div>
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-2xl">
                      👥
                    </div>
                    <p className="text-white font-black text-xl">Review Influencer Requests</p>
                  </div>
                  <p className="text-indigo-200/60 text-sm font-semibold">{stats.pendingApprovals} pending approval</p>
                </div>
              </button>

              <button
                onClick={() => setCurrentView("withdrawals")}
                className="group relative bg-gradient-to-br from-green-500/10 to-emerald-500/5 backdrop-blur-sm hover:from-green-500/20 hover:to-emerald-500/10 border-2 border-white/20 hover:border-green-400/50 rounded-3xl p-8 transition-all duration-300 text-left hover:scale-105 active:scale-95 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/20 transition-all"></div>
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center text-2xl">
                      💰
                    </div>
                    <p className="text-white font-black text-xl">Process Withdrawals</p>
                  </div>
                  <p className="text-green-200/60 text-sm font-semibold">{stats.pendingWithdrawals.count} pending requests</p>
                </div>
              </button>
            </div>
          </div>
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
            {withdrawals.length === 0 ? (
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
              <h2 className="text-3xl font-bold text-white">Products ({products.length})</h2>
              <button
                onClick={() => {
                  setShowProductForm(!showProductForm);
                  setEditingProduct(null);
                  setProductForm({ name: "", description: "", price: 0, category: "Moody", image: "", stock: 0 });
                }}
                className="group flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 rounded-2xl text-white font-black tracking-wide uppercase transition-all duration-300 shadow-[0_10px_30px_rgba(79,70,229,0.4)] hover:shadow-[0_15px_40px_rgba(79,70,229,0.6)] hover:scale-105 active:scale-95"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" /> 
                Add Product
              </button>
            </div>

            {/* Add Product Form (only show when not editing) */}
            {showProductForm && !editingProduct && (
              <div className="relative bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-pink-900/20 backdrop-blur-xl border-2 border-white/20 rounded-3xl p-8 md:p-10 shadow-[0_20px_60px_rgba(79,70,229,0.3)] animate-fadeIn">
                {/* Decorative gradient orbs */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl -z-10"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -z-10"></div>
                
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-3xl font-black text-white tracking-tight">
                    Add New Product
                  </h3>
                </div>
                <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-white/90 font-bold text-sm mb-3 tracking-wide uppercase">Product Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Anime Sticker Set"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      required
                      className="w-full px-5 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl text-white placeholder-gray-400 focus:border-indigo-400 focus:bg-white/15 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-all duration-300 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-white/90 font-bold text-sm mb-3 tracking-wide uppercase">Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="499"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: parseFloat(e.target.value) })}
                      required
                      className="w-full px-5 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl text-white placeholder-gray-400 focus:border-indigo-400 focus:bg-white/15 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-all duration-300 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-white/90 font-bold text-sm mb-3 tracking-wide uppercase">Category</label>
                    <select
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value as "Moody" | "Sports" | "Religious" | "Entertainment" | "Events" | "Animal" | "Couple" | "Anime" | "Custom" })}
                      required
                      className="w-full px-5 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl text-white focus:border-indigo-400 focus:bg-white/15 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-all duration-300 font-medium cursor-pointer"
                    >
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
                    <label className="block text-white/90 font-bold text-sm mb-3 tracking-wide uppercase">Stock Quantity</label>
                    <input
                      type="number"
                      placeholder="100"
                      value={productForm.stock}
                      onChange={(e) => setProductForm({ ...productForm, stock: parseInt(e.target.value) })}
                      required
                      className="w-full px-5 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl text-white placeholder-gray-400 focus:border-indigo-400 focus:bg-white/15 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-all duration-300 font-medium"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-white/90 font-bold text-sm mb-3 tracking-wide uppercase">Image URL</label>
                    <input
                      type="text"
                      placeholder="/badge/image.png or https://example.com/image.jpg"
                      value={productForm.image}
                      onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                      required
                      className="w-full px-5 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl text-white placeholder-gray-400 focus:border-indigo-400 focus:bg-white/15 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-all duration-300 font-medium"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-white/90 font-bold text-sm mb-3 tracking-wide uppercase">Description</label>
                    <textarea
                      placeholder="Describe the product..."
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      required
                      rows={4}
                      className="w-full px-5 py-4 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-2xl text-white placeholder-gray-400 focus:border-indigo-400 focus:bg-white/15 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-all duration-300 resize-none font-medium"
                    />
                  </div>

                  <div className="md:col-span-2 flex gap-4 mt-4">
                    <button
                      type="submit"
                      className="flex-1 group relative py-4 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 rounded-2xl text-white font-black text-base tracking-wide uppercase transition-all duration-300 shadow-[0_10px_40px_rgba(79,70,229,0.4)] hover:shadow-[0_15px_50px_rgba(79,70,229,0.6)] hover:scale-[1.02] active:scale-[0.98]"
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
                      className="px-8 py-4 bg-white/10 backdrop-blur-sm hover:bg-white/20 border-2 border-white/20 hover:border-white/40 rounded-2xl text-white font-bold uppercase tracking-wide transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Products by Category */}
            {products.length > 0 ? (
              <div className="space-y-8">
                {["Moody", "Sports", "Religious", "Entertainment", "Events", "Animal", "Couple", "Anime", "Custom"].map((category) => {
                  const categoryProducts = products.filter((p) => p.category === category);
                  if (categoryProducts.length === 0) return null;

                  return (
                    <div key={category} className="animate-fadeIn">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center text-3xl">
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
                          <h3 className="text-3xl font-black text-white tracking-tight">
                            {category}
                          </h3>
                          <p className="text-indigo-300/60 font-semibold">
                            {categoryProducts.length} {categoryProducts.length === 1 ? 'product' : 'products'}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {categoryProducts.map((product) => (
                          <div key={product._id} className="group relative bg-gradient-to-br from-white/5 via-white/10 to-transparent backdrop-blur-sm border-2 border-white/10 hover:border-indigo-400/50 rounded-3xl overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_20px_60px_rgba(99,102,241,0.3)]">
                            {/* Image */}
                            <div className="relative h-56 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 overflow-hidden">
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              {/* Stock badge overlay */}
                              <div className="absolute top-3 right-3">
                                <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase backdrop-blur-md border-2 ${
                                  product.stock > 0 
                                    ? "bg-green-500/30 border-green-400/50 text-green-100 shadow-[0_0_20px_rgba(34,197,94,0.4)]" 
                                    : "bg-red-500/30 border-red-400/50 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                                }`}>
                                  {product.stock} stock
                                </span>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="p-5 space-y-4">
                              <h4 className="text-white font-black text-lg line-clamp-2 leading-tight">{product.name}</h4>
                              <p className="text-gray-300/80 text-sm line-clamp-2 leading-relaxed">{product.description}</p>

                              {/* Price */}
                              <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                  ₹{product.price}
                                </span>
                              </div>

                              {/* Actions */}
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
                                  className="flex-1 group/btn py-2.5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 border-2 border-blue-400/30 hover:border-blue-400/60 rounded-xl text-blue-300 hover:text-blue-200 font-bold transition-all text-sm hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                                >
                                  <span className="text-lg">✏️</span>
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => setConfirmingDeleteProduct(product)}
                                  className="flex-1 group/btn py-2.5 bg-gradient-to-r from-red-500/20 to-pink-500/20 hover:from-red-500/30 hover:to-pink-500/30 border-2 border-red-400/30 hover:border-red-400/60 rounded-xl text-red-300 hover:text-red-200 font-bold transition-all text-sm hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                                >
                                  <span className="text-lg">🗑️</span>
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white/5 border border-dashed border-white/20 rounded-2xl p-12 text-center">
                <p className="text-gray-400 text-lg">📦 No products yet. Add your first product to get started!</p>
              </div>
            )}
          </div>
        )}

        {/* ALL USERS VIEW */}
        {currentView === "users" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">All Users ({allUsers.length})</h2>
              {allUsers.length > 0 && (
                <div className="text-sm text-gray-400 space-x-4">
                  <span>👤 Users: {allUsers.filter(u => u.role === 'user').length}</span>
                  <span>⭐ Influencers: {allUsers.filter(u => u.role === 'influencer').length}</span>
                  <span>👑 Admins: {allUsers.filter(u => u.role === 'admin').length}</span>
                </div>
              )}
            </div>
            {allUsers.length === 0 ? (
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-indigo-500/20 rounded-2xl p-8 text-center">
                <p className="text-gray-400">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-indigo-500/20">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-indigo-500/20">
                      <th className="px-4 py-3 text-left text-white font-semibold text-sm">Name</th>
                      <th className="px-4 py-3 text-left text-white font-semibold text-sm">Email</th>
                      <th className="px-4 py-3 text-left text-white font-semibold text-sm">Role</th>
                      <th className="px-4 py-3 text-left text-white font-semibold text-sm">Provider</th>
                      <th className="px-4 py-3 text-left text-white font-semibold text-sm">Joined</th>
                      <th className="px-4 py-3 text-center text-white font-semibold text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((user, idx) => (
                      <tr key={user._id} className={`border-b border-white/10 hover:bg-indigo-500/10 transition-colors ${idx % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
                        <td className="px-4 py-3 text-white font-medium text-sm">{user.name}</td>
                        <td className="px-4 py-3 text-gray-300 text-sm">{user.email}</td>
                        <td className="px-4 py-3">
                          <select
                            value={user.role}
                            onChange={(e) => handleUpdateRole(user._id, e.target.value)}
                            className={`px-2 py-1.5 rounded text-xs font-semibold border transition-colors ${
                              (user.role === 'admin' && !isSuperAdmin) ? 'bg-purple-500/20 border-purple-500/30 text-purple-300 cursor-not-allowed' :
                              user.role === 'admin' ? 'bg-purple-500/20 border-purple-500/30 text-purple-300 hover:bg-purple-500/30' :
                              user.role === 'influencer' ? 'bg-amber-500/20 border-amber-500/30 text-amber-300 hover:bg-amber-500/30' :
                              'bg-blue-500/20 border-blue-500/30 text-blue-300 hover:bg-blue-500/30'
                            }`}
                            disabled={user.role === 'admin' && !isSuperAdmin}
                          >
                            <option value="user">User</option>
                            <option value="influencer">Influencer</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm capitalize">{user.provider}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-2">
                            {(user.role !== 'admin' || isSuperAdmin) && (
                              <>
                                <button
                                  onClick={() => setEditingUser(user)}
                                  className="p-1.5 hover:bg-blue-500/20 rounded-lg text-blue-400 hover:text-blue-300 transition-colors"
                                  title="Edit user"
                                >
                                  ✏️
                                {isSuperAdmin && (
                                  <button
                                    onClick={() => setResettingPassword(user)}
                                    className="p-1.5 hover:bg-yellow-500/20 rounded-lg text-yellow-400 hover:text-yellow-300 transition-colors"
                                    title="Reset password (Super Admin only)"
                                  >
                                    🔑
                                  </button>
                                )}
                                </button>
                                <button
                                  onClick={() => setConfirmingDelete(user)}
                                  className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                                  title="Delete user"
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                            {(user.role === 'admin' && !isSuperAdmin) && (
                              <span className="text-xs text-gray-500 italic px-2">🔒 Protected</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ALL INFLUENCERS VIEW */}
        {currentView === "all-influencers" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">All Influencers ({allInfluencers.length})</h2>
              {allInfluencers.length > 0 && (
                <div className="text-sm text-gray-400 space-x-4">
                  <span>✅ Approved: {allInfluencers.filter(i => i.influencerProfile?.isApproved).length}</span>
                  <span>⏳ Pending: {allInfluencers.filter(i => !i.influencerProfile?.isApproved).length}</span>
                </div>
              )}
            </div>
            {allInfluencers.length === 0 ? (
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-indigo-500/20 rounded-2xl p-8 text-center">
                <p className="text-gray-400">No influencers found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {allInfluencers.map((inf) => (
                  <div key={inf._id} className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold text-base mb-0.5 truncate">{inf.name}</h3>
                        <p className="text-gray-400 text-xs truncate">{inf.email}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2 border flex-shrink-0 ${inf.influencerProfile?.isApproved ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                        {inf.influencerProfile?.isApproved ? '✓ Approved' : '⏳ Pending'}
                      </span>
                    </div>
                    
                    {/* Contact Info */}
                    {(inf.influencerProfile?.phone || inf.influencerProfile?.instagram || inf.influencerProfile?.youtube) && (
                      <div className="space-y-1 mb-3 pb-3 border-b border-white/10 text-xs">
                        {inf.influencerProfile?.phone && <p className="text-gray-300">📱 <span className="font-medium">{inf.influencerProfile.phone}</span></p>}
                        {inf.influencerProfile?.instagram && <p className="text-purple-300">📷 <span className="font-medium">@{inf.influencerProfile.instagram}</span></p>}
                        {inf.influencerProfile?.youtube && <p className="text-red-300">🎥 <span className="font-medium">{inf.influencerProfile.youtube}</span></p>}
                      </div>
                    )}
                    
                    {/* Bio */}
                    {inf.influencerProfile?.bio && (
                      <p className="text-gray-400 text-xs italic mb-3 line-clamp-2 pb-3 border-b border-white/10">"{inf.influencerProfile.bio}"</p>
                    )}
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2.5 mb-3 p-3 bg-black/30 rounded-lg border border-white/5">
                      <div className="text-center">
                        <p className="text-gray-500 text-xs font-medium">Total</p>
                        <p className="text-emerald-400 font-bold text-sm">₹{inf.influencerProfile?.totalEarnings || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500 text-xs font-medium">Pending</p>
                        <p className="text-amber-400 font-bold text-sm">₹{inf.influencerProfile?.pendingEarnings || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500 text-xs font-medium">Withdrawn</p>
                        <p className="text-blue-400 font-bold text-sm">₹{inf.influencerProfile?.withdrawnAmount || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-500 text-xs font-medium">Min Withdrawal</p>
                        <p className="text-indigo-400 font-bold text-sm">₹{inf.influencerProfile?.minWithdrawalAmount || 100}</p>
                      </div>
                    </div>
                    
                    {/* Footer */}
                    <p className="text-gray-600 text-xs">📅 Joined: {new Date(inf.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ORDERS VIEW */}
        {currentView === "orders" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">All Orders ({orders.length})</h2>
              {orders.length > 0 && (
                <div className="text-sm text-gray-400 space-x-3">
                  <span>✅ Success: {orders.filter(o => o.status === 'SUCCESS').length}</span>
                  <span>⏳ Pending: {orders.filter(o => o.status === 'PENDING').length}</span>
                </div>
              )}
            </div>
            {orders.length === 0 ? (
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-indigo-500/20 rounded-2xl p-12 text-center">
                <p className="text-gray-400">No orders found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.map((order) => (
                  <div key={order._id} onClick={() => setViewingOrder(order)} className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl p-4 transition-all hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-sm">#{order.orderId || order._id.slice(-6)}</h3>
                        <p className="text-gray-400 text-xs mt-0.5 truncate">{order.userId?.email || 'N/A'}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2 border ${
                        order.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                        order.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                        order.status === 'FAILED' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                        'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      }`}>
                        {order.status === 'SUCCESS' ? '✓' : order.status === 'PENDING' ? '⏳' : order.status === 'FAILED' ? '✕' : '◉'} {order.status}
                      </span>
                    </div>
                    <div className="space-y-2 mb-3 pb-3 border-b border-white/10">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-xs">Amount</span>
                        <span className="text-emerald-400 font-bold">₹{order.amount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-xs">Customer</span>
                        <span className="text-gray-300 text-xs">{order.userId?.name || 'Anonymous'}</span>
                      </div>
                    </div>
                    <p className="text-gray-600 text-xs">📅 {new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
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
      </div>

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

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const invoiceId = typeof viewingOrder.invoiceId === 'string' ? viewingOrder.invoiceId : viewingOrder.invoiceId?._id;
                  if (!invoiceId) {
                    showToast('warning', '⚠️ Invoice not available yet');
                    return;
                  }
                  window.open(`/admin/invoice/${invoiceId}`, '_blank');
                }}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 rounded-lg text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-indigo-500/30"
              >
                🧾 View Invoice
              </button>
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
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-lg text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-purple-500/30"
              >
                📥 Download PDF
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
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value as "Moody" | "Sports" | "Religious" | "Entertainment" | "Events" | "Animal" | "Couple" | "Anime" | "Custom" })}
                  required
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white focus:border-indigo-500 focus:outline-none transition-all"
                >
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
