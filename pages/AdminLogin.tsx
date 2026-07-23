import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { API_BASE_URL } from "../config/api";

const syncStorefrontSession = (token: string, adminUser: any) => {
  try {
    localStorage.setItem("token", token);
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: adminUser?._id || adminUser?.id,
        name: adminUser?.name,
        email: adminUser?.email,
        role: adminUser?.role,
        avatar: adminUser?.avatar,
      }),
    );
  } catch {
    // ignore storage errors
  }
};

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const from = (location.state as any)?.from?.pathname || "/admin";

  // If already authenticated, redirect to admin dashboard immediately
  useEffect(() => {
    const adminToken = localStorage.getItem("adminToken");
    const rawAdminUser = localStorage.getItem("adminUser");
    if (adminToken && rawAdminUser) {
      try {
        const parsed = JSON.parse(rawAdminUser);
        if (parsed?.role === "admin") {
          navigate(from, { replace: true });
        }
      } catch {}
    }
  }, [navigate, from]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      if (data.user?.role !== "admin") {
        throw new Error("Only admins can access this panel");
      }

      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminUser", JSON.stringify(data.user));
      syncStorefrontSession(data.token, data.user);

      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    prompt: "select_account",
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
        syncStorefrontSession(data.token, data.user);

        navigate(from, { replace: true });
      } catch {
        setError("Google login failed");
      } finally {
        setIsGoogleLoading(false);
      }
    },
  });

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 md:px-6 relative overflow-hidden">
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
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
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
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    if (!loginEmail) {
                      setError("Please enter your admin email address first.");
                      return;
                    }
                    setLoading(true);
                    setError("");
                    try {
                      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: loginEmail }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.message || "Failed to send reset link");
                      alert("✅ Password reset link sent! Check your admin email inbox.");
                    } catch (err: any) {
                      setError(err.message || "Failed to send reset email");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="text-xs font-bold text-indigo-700 hover:text-indigo-900 hover:underline transition-all"
                >
                  Forgot Password? 🤔
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
};

export default AdminLogin;
