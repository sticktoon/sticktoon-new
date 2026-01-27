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
        avatar: displayName.charAt(0).toUpperCase(),
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
    <div className="min-h-[calc(100vh-64px)] bg-white flex items-center justify-center px-4 md:px-6 relative overflow-hidden">
      {/* Fun Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Stickers */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-red-500 rounded-full border-4 border-black shadow-[4px_4px_0px_#000] animate-bounce opacity-60" style={{ animationDelay: '0s', animationDuration: '3s' }}></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-yellow-400 rounded-full border-4 border-black shadow-[4px_4px_0px_#000] animate-bounce opacity-60" style={{ animationDelay: '0.5s', animationDuration: '3.5s' }}></div>
        <div className="absolute bottom-32 left-20 w-14 h-14 bg-black rounded-full border-4 border-yellow-400 shadow-[4px_4px_0px_#FFD600] animate-bounce opacity-60" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
        <div className="absolute bottom-20 right-32 w-12 h-12 bg-yellow-400 rounded-full border-4 border-black shadow-[4px_4px_0px_#000] animate-bounce opacity-60" style={{ animationDelay: '1.5s', animationDuration: '3.2s' }}></div>
        {/* Star decorations */}
        <div className="absolute top-32 right-40 text-4xl opacity-40 text-yellow-400"></div>
        <div className="absolute bottom-40 left-32 text-3xl opacity-40 text-red-500">★</div>
        <div className="absolute top-60 left-40 text-2xl opacity-30 text-black">⬤</div>
      </div>

      <div className="relative max-w-sm w-full">
        {/* Main Card - Sticker Style */}
        <div className="bg-white rounded-3xl px-6 py-8 border-4 border-black shadow-[8px_8px_0px_#000] relative">
          {/* Corner Stickers */}
          <div className="absolute -top-4 -right-4 w-10 h-10 bg-red-500 rounded-full border-4 border-black flex items-center justify-center text-lg shadow-[3px_3px_0px_#000]">★</div>
          <div className="absolute -bottom-4 -left-4 w-10 h-10 bg-yellow-400 rounded-full border-4 border-black flex items-center justify-center text-lg shadow-[3px_3px_0px_#000]">⬤</div>

          {/* Header */}
          <div className="text-center mb-6">
            {/* Eyes Logo */}
            <div className="inline-flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 bg-white rounded-full border-4 border-black flex items-center justify-center shadow-[3px_3px_0px_#FFD600]">
                <div className="w-3 h-4 bg-black rounded-full"></div>
              </div>
              <div className="w-10 h-10 bg-white rounded-full border-4 border-black flex items-center justify-center shadow-[3px_3px_0px_#FFD600]">
                <div className="w-3 h-4 bg-black rounded-full"></div>
              </div>
            </div>
            <h2 className="text-2xl font-black text-black tracking-tight" style={{ WebkitTextStroke: '1px #FFD600' }}>
              {forgotMode
                ? "Oops! Forgot?"
                : isLogin
                ? "Welcome Back!"
                : "Join The Fun!"}
            </h2>
            <p className="text-black mt-1 text-sm font-medium">
              {forgotMode
                ? "No worries, we got you! "
                : isLogin
                ? "Let's get you back to your stickers 🎨"
                : "Create your account in seconds ⚡"}
            </p>
          </div>

          {/* Toggle - Sticker Style */}
          {!forgotMode && (
            <div className="flex p-1.5 bg-yellow-100 rounded-2xl mb-6 border-2 border-yellow-400">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${
                  isLogin 
                    ? "bg-red-500 text-white border-2 border-black shadow-[3px_3px_0px_#FFD600]" 
                    : "text-black hover:text-red-500"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${
                  !isLogin 
                    ? "bg-yellow-400 text-black border-2 border-black shadow-[3px_3px_0px_#FFD600]" 
                    : "text-black hover:text-yellow-500"
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !forgotMode && (
              <div>
                <label className="block text-sm font-bold text-black mb-1.5">Your Name 👋</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="What should we call you?"
                  className="w-full px-4 py-3 rounded-xl bg-white border-3 border-black focus:border-red-500 focus:outline-none transition-all text-black font-medium placeholder:text-yellow-400 shadow-[3px_3px_0px_#FFD600] focus:shadow-[3px_3px_0px_#FFD600]"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-black mb-1.5">Email Address 📧</label>
              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                type="email"
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-xl bg-white border-3 border-black focus:border-yellow-400 focus:outline-none transition-all text-black font-medium placeholder:text-yellow-400 shadow-[3px_3px_0px_#FFD600] focus:shadow-[3px_3px_0px_#FFD600]"
              />
            </div>

            {!forgotMode && (
              <div>
                <label className="block text-sm font-bold text-black mb-1.5">Password 🔐</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Super secret password"
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-white border-3 border-black focus:border-red-500 focus:outline-none transition-all text-black font-medium placeholder:text-yellow-400 shadow-[3px_3px_0px_#FFD600] focus:shadow-[3px_3px_0px_#FFD600]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-400 hover:text-red-500 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {!isLogin && password && !forgotMode && (
              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 rounded-xl border-2 border-yellow-400">
                <div className="flex-1 flex gap-1">
                  <div className={`flex-1 h-2 rounded-full transition-all border border-yellow-400 ${passwordStrength === 'weak' ? 'bg-red-500' : 'bg-yellow-100'}`}></div>
                  <div className={`flex-1 h-2 rounded-full transition-all border border-yellow-400 ${passwordStrength === 'medium' || passwordStrength === 'strong' ? 'bg-yellow-400' : 'bg-yellow-100'}`}></div>
                  <div className={`flex-1 h-2 rounded-full transition-all border border-yellow-400 ${passwordStrength === 'strong' ? 'bg-black' : 'bg-yellow-100'}`}></div>
                </div>
                <span className={`text-xs font-bold capitalize ${
                  passwordStrength === 'weak' ? 'text-red-500' :
                  passwordStrength === 'medium' ? 'text-yellow-600' :
                  'text-black'
                }`}>
                  {passwordStrength === 'weak' ? '😟 Weak' : passwordStrength === 'medium' ? '😊 Medium' : '💪 Strong'}
                </span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-100 border-2 border-red-500 rounded-xl">
                <span className="text-lg">😵</span>
                <p className="text-sm font-bold text-red-700">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 px-4 py-3 bg-yellow-100 border-2 border-yellow-400 rounded-xl">
                <span className="text-lg">🎉</span>
                <p className="text-sm font-bold text-black">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-red-500 hover:bg-black text-white rounded-xl font-black text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed border-3 border-black shadow-[4px_4px_0px_#FFD600] hover:shadow-[2px_2px_0px_#FFD600] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
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
                className="w-full text-sm font-bold text-black hover:text-red-500 transition-colors py-2"
              >
                Forgot password? 🤔
              </button>
            )}

            {forgotMode && (
              <button
                type="button"
                onClick={() => setForgotMode(false)}
                className="w-full text-sm font-bold text-black hover:text-yellow-500 transition-colors flex items-center justify-center gap-1.5 py-2"
              >
                ← Back to Login
              </button>
            )}
          </form>

          {/* Divider */}
          {!forgotMode && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 h-0.5 bg-yellow-400 rounded"></div>
                <span className="text-xs font-black text-black uppercase tracking-wider px-2 py-1 bg-yellow-100 rounded-lg">or</span>
                <div className="flex-1 h-0.5 bg-yellow-400 rounded"></div>
              </div>

              {/* Google Button */}
              <button
                type="button"
                onClick={() => googleLogin()}
                disabled={isGoogleLoading}
                className="w-full py-3.5 bg-white border-3 border-black rounded-xl text-sm font-bold text-black flex items-center justify-center gap-3 hover:bg-yellow-100 transition-all shadow-[4px_4px_0px_#FFD600] hover:shadow-[2px_2px_0px_#FFD600] hover:translate-x-[2px] hover:translate-y-[2px]"
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

        {/* Influencer Portal Link */}
        {!forgotMode && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-5 py-3 bg-yellow-400 text-black rounded-full border-3 border-black shadow-[4px_4px_0px_#FFD600] hover:shadow-[2px_2px_0px_#FFD600] hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
              <span className="text-lg">🎯</span>
              <span className="text-sm font-bold">Are you an influencer?</span>
              <Link to="/influencer/login" className="font-black underline">
  Join here →
</Link>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import { Link } from "react-router-dom";

