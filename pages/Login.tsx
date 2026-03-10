import React, { useState } from "react";
import { Eye, EyeOff, Sparkle } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { API_BASE_URL } from "../config/api";

/* =========================
   VALIDATION HELPERS
========================== */
const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const getPasswordStrength = (password: string) => {
  if (password.length < 6) return "weak";
  if (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
    return "strong";
  return "medium";
};

export default function Login() {
  /* =========================
     STATE
  ========================== */
  const [isLogin, setIsLogin] = useState(true);
  const [forgotMode, setForgotMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const passwordStrength = getPasswordStrength(password);

  /* =========================
     SAVE AUTH
  ========================== */
  const saveAuth = (data: any) => {
    const displayName = data.user.name?.trim() || "User";

    localStorage.setItem("token", data.token);
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: data.user._id,
        name: displayName,
        email: data.user.email,
        role: data.user.role,
        avatar: data.user.avatar || displayName.charAt(0).toUpperCase(),
      })
    );

    window.location.href = "/";
  };

  /* =========================
     LOGIN
  ========================== */
  const handleLogin = async () => {
    setError("");
    setSuccess("");

    const cleanedEmail = email.trim();

    if (!isValidEmail(cleanedEmail)) {
      setError("Please enter a valid email");
      return;
    }

    if (!password) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanedEmail, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed");
        return;
      }

      saveAuth(data);
    }catch (error: any) {
  console.error("LOGIN ERROR:", error);

  // Show backend / network error message if available
  if (error?.message) {
    setError(error.message);
  } else {
    setError("Something went wrong. Please try again.");
  }
}
 finally {
      setLoading(false);
    }
  };

  /* =========================
     SIGNUP
  ========================== */
  const handleSignup = async () => {
    setError("");
    setSuccess("");

    const cleanedEmail = email.trim();

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (!isValidEmail(cleanedEmail)) {
      setError("Please enter a valid email");
      return;
    }

    if (!password) {
      setError("Password is required");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: cleanedEmail,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Signup failed");
        return;
      }

      saveAuth(data);
    } catch {
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     FORGOT PASSWORD
  ========================== */
  const handleForgotPassword = async () => {
    setError("");
    setSuccess("");

    const cleanedEmail = email.trim();

    if (!isValidEmail(cleanedEmail)) {
      setError("Enter a valid email");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanedEmail }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to send reset link");
        return;
      }

      setSuccess("Reset link sent to your email");
    } catch {
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     FORM SUBMIT (✅ ENTER KEY FIX)
  ========================== */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // ✅ prevent page reload

    if (forgotMode) handleForgotPassword();
    else if (isLogin) handleLogin();
    else handleSignup();
  };

  /* =========================
     GOOGLE LOGIN
  ========================== */
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsGoogleLoading(true);

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
          `${API_BASE_URL}/api/auth/google`,
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

        saveAuth(data);
      } catch {
        setError("Google login failed");
      } finally {
        setIsGoogleLoading(false);
      }
    },
  });

  /* =========================
     UI
  ========================== */
  return (
    <div className="min-h-[calc(100vh-64px)] bg-white flex items-center justify-center px-4 md:px-6 relative overflow-hidden pt-3">
      {/* Premium background glow - Hot Drops Theme */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-64 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-yellow-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-[-300px] w-[600px] h-[600px] bg-orange-400/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-[-200px] w-[500px] h-[500px] bg-red-400/10 rounded-full blur-[100px]" />
      </div>

      {/* Funny Floating Circles - Outer Edges Only */}
      <div className="absolute top-32 -left-8 w-24 h-24 rounded-full border-[8px] border-yellow-400/30 animate-bounce" style={{ animationDuration: '4s' }} />
      <div className="absolute top-64 -right-12 w-32 h-32 rounded-full border-[10px] border-orange-400/25 animate-pulse" style={{ animationDuration: '3s' }} />
      <div className="absolute bottom-40 -left-16 w-28 h-28 rounded-full border-[8px] border-red-400/20 animate-bounce" style={{ animationDuration: '5s', animationDelay: '1s' }} />
      <div className="absolute bottom-72 -right-8 w-20 h-20 rounded-full border-[6px] border-yellow-500/35 animate-pulse" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />

      <div className="relative max-w-sm w-full z-10">
        {/* Main Card - Hot Drops Style */}
        <div className="bg-gradient-to-br from-white to-yellow-50/50 backdrop-blur rounded-2xl px-6 py-5 border-2 border-yellow-500/20 shadow-sm hover:shadow-2xl hover:shadow-yellow-500/20 hover:border-yellow-500/60 transition-all duration-300 relative">

          {/* Header */}
          <div className="text-center mb-3">
            {/* Eyes Logo */}
            <div className="inline-flex items-center justify-center gap-2 mb-2">
              <div className="w-10 h-10 bg-white rounded-full border-4 border-black flex items-center justify-center shadow-[3px_3px_0px_#FFD600]">
                <div className="w-3 h-4 bg-black rounded-full"></div>
              </div>
              <div className="w-10 h-10 bg-white rounded-full border-4 border-black flex items-center justify-center shadow-[3px_3px_0px_#FFD600]">
                <div className="w-3 h-4 bg-black rounded-full"></div>
              </div>
            </div>
            <h2 className="text-2xl font-black bg-gradient-to-r from-slate-900 via-yellow-700 to-orange-700 bg-clip-text text-transparent tracking-tight">
              {forgotMode
                ? "Oops! Forgot?"
                : isLogin
                ? "Welcome Back!"
                : "Join The Fun!"}
            </h2>
            <p className="text-slate-600 mt-0.5 text-xs md:text-sm font-medium">
              {forgotMode
                ? "No worries, we got you! "
                : isLogin
                ? "Let's get you back to your stickers 🎨"
                : "Create your account in seconds ⚡"}
            </p>
          </div>

          {/* Toggle - Hot Drops Style */}
          {!forgotMode && (
            <div className="flex p-1 bg-white rounded-2xl mb-3 border-2 border-yellow-500/20">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  isLogin 
                    ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-2 border-yellow-500/20" 
                    : "text-slate-600 hover:text-yellow-700"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  !isLogin 
                    ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-2 border-yellow-500/20" 
                    : "text-slate-600 hover:text-yellow-700"
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-2.5">
            {!isLogin && !forgotMode && (
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Your Name 👋</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="What should we call you?"
                  className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-yellow-500/20 focus:border-yellow-500 focus:outline-none transition-all text-sm text-slate-900 font-medium placeholder:text-slate-400"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">Email Address 📧</label>
              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                type="email"
                placeholder="your@email.com"
                  className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-yellow-500/20 focus:border-yellow-500 focus:outline-none transition-all text-sm text-slate-900 font-medium placeholder:text-slate-400"
              />
            </div>

            {!forgotMode && (
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">Password 🔐</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Super secret password"
                    className="w-full px-3 py-2.5 pr-10 rounded-lg bg-white border-2 border-yellow-500/20 focus:border-yellow-500 focus:outline-none transition-all text-sm text-slate-900 font-medium placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-600 hover:text-orange-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {!isLogin && password && !forgotMode && (
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border-2 border-yellow-500/20">
                <div className="flex-1 flex gap-1">
                  <div className={`flex-1 h-2 rounded-full transition-all border border-yellow-500/20 ${passwordStrength === 'weak' ? 'bg-red-500' : 'bg-yellow-100'}`}></div>
                  <div className={`flex-1 h-2 rounded-full transition-all border border-yellow-500/20 ${passwordStrength === 'medium' || passwordStrength === 'strong' ? 'bg-yellow-500' : 'bg-yellow-100'}`}></div>
                  <div className={`flex-1 h-2 rounded-full transition-all border border-yellow-500/20 ${passwordStrength === 'strong' ? 'bg-orange-500' : 'bg-yellow-100'}`}></div>
                </div>
                <span className={`text-xs font-bold capitalize ${
                  passwordStrength === 'weak' ? 'text-red-500' :
                  passwordStrength === 'medium' ? 'text-yellow-600' :
                  'text-orange-600'
                }`}>
                  {passwordStrength === 'weak' ? '😟 Weak' : passwordStrength === 'medium' ? '😊 Medium' : '💪 Strong'}
                </span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-2 border-red-500/30 rounded-xl">
                <span className="text-lg">😵</span>
                <p className="text-sm font-bold text-red-600">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 px-4 py-3 bg-yellow-50 border-2 border-yellow-500/30 rounded-xl">
                <span className="text-lg">🎉</span>
                <p className="text-sm font-bold text-yellow-700">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-xl font-bold text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed border-2 border-yellow-500/20 transition-all"
            >
              {loading
                ? "Hold on... ⏳"
                : forgotMode
                ? "Send Magic Link ✉️"
                : isLogin
                ? "Let's Go! 🚀"
                : "Create Account 🎨"}
            </button>

            {isLogin && !forgotMode && (
              <button
                type="button"
                onClick={() => setForgotMode(true)}
                className="w-full text-sm font-bold text-slate-600 hover:text-yellow-700 transition-colors py-2"
              >
                Forgot password? 🤔
              </button>
            )}

            {forgotMode && (
              <button
                type="button"
                onClick={() => setForgotMode(false)}
                className="w-full text-sm font-bold text-slate-600 hover:text-yellow-700 transition-colors flex items-center justify-center gap-1.5 py-2"
              >
                ← Back to Login
              </button>
            )}
          </form>

          {/* Divider */}
          {!forgotMode && (
            <>
              <div className="my-4 flex items-center gap-3">
                <div className="flex-1 h-0.5 bg-yellow-500/20 rounded"></div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider px-2 py-1 bg-white rounded-lg border border-yellow-500/20">or</span>
                <div className="flex-1 h-0.5 bg-yellow-500/20 rounded"></div>
              </div>

              {/* Google Button */}
              <button
                type="button"
                onClick={() => googleLogin()}
                disabled={isGoogleLoading}
                className="w-full py-3 bg-white border-2 border-yellow-500/20 hover:border-yellow-500/60 rounded-xl text-sm font-bold text-slate-900 flex items-center justify-center gap-3 hover:shadow-lg hover:shadow-yellow-500/10 transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {isGoogleLoading ? "Connecting..." : "Continue with Google"}
              </button>
            </>
          )}
        </div>

        {/* Portal Links */}
        {!forgotMode && (
          <div className="mt-6 mb-5 flex gap-3 sm:gap-4 md:gap-6">
            <Link to="/influencer/login" className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 rounded-2xl border-2 border-yellow-500/20 font-bold text-sm uppercase tracking-wider hover:shadow-lg hover:shadow-yellow-500/20 hover:border-yellow-500/60 transition-all">
              <span className="text-lg">🎯</span>
              <span>Influencer</span>
            </Link>
            <Link to="/admin/login" className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl border-2 border-indigo-500/20 font-bold text-sm uppercase tracking-wider hover:shadow-lg hover:shadow-indigo-500/20 hover:border-indigo-500/60 transition-all">
              <span className="text-lg">🛡️</span>
              <span>Admin</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
import { Link } from "react-router-dom";

