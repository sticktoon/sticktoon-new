import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, ArrowLeft, Eye, EyeOff, MailCheck, ShieldCheck } from "lucide-react";
import { API_BASE_URL } from "../config/api";
import PasswordRules, { meetsAdminPasswordRules } from "./PasswordRules";

/**
 * The admin sign-in steps after the password or Google: replace an expired /
 * weak password, then enter the 6-digit code emailed to the admin.
 * The server decides which step is next (routes/admin.js).
 */
export type AdminLoginStep = {
  step: "change_password" | "verify_email_code";
  challengeToken: string;
  reason?: "weak" | "expired";
  email?: string;
};

type SignedIn = { token: string; user: any };
type ApiError = Error & { status?: number; retryAfter?: number };

const RESEND_SECONDS = 60;
const INPUT =
  "w-full px-4 py-3 rounded-xl bg-white border-3 border-black focus:border-indigo-600 focus:outline-none transition-all text-black font-medium placeholder:text-indigo-400 shadow-[3px_3px_0px_#4F46E5]";
const PRIMARY =
  "w-full py-4 bg-indigo-600 hover:bg-black text-white rounded-xl font-black text-sm uppercase tracking-wide disabled:opacity-50 border-3 border-black shadow-[4px_4px_0px_#6366F1] hover:shadow-[2px_2px_0px_#6366F1] hover:translate-x-[2px] hover:translate-y-[2px] transition-all";

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api/admin/login/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data.message || "Something went wrong"), {
      status: res.status,
      retryAfter: data.retryAfter,
    });
  }
  return data as T;
}

export default function AdminLoginSteps({
  initial,
  onSignedIn,
  onCancel,
}: {
  initial: AdminLoginStep;
  onSignedIn: (data: SignedIn) => void;
  onCancel: (message?: string) => void;
}) {
  const [current, setCurrent] = useState(initial);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const next = await post<AdminLoginStep>("change-password", {
        challengeToken: current.challengeToken,
        newPassword: password,
      });
      setPassword("");
      setConfirm("");
      setResendIn(RESEND_SECONDS);
      setCurrent(next);
    } catch (err) {
      const e = err as ApiError;
      if (e.status === 401) onCancel(e.message);
      else setError(e.message);
    }
    setBusy(false);
  };

  const verifyCode = async (value = code) => {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      onSignedIn(await post<SignedIn>("2fa", { challengeToken: current.challengeToken, code: value }));
    } catch (err) {
      const e = err as ApiError;
      if (e.status === 401) return onCancel(e.message);
      setCode("");
      setError(e.message);
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setCurrent(await post<AdminLoginStep>("email-code/resend", { challengeToken: current.challengeToken }));
      setCode("");
      setResendIn(RESEND_SECONDS);
      setNotice("New code sent. Older codes no longer work.");
    } catch (err) {
      const e = err as ApiError;
      if (e.status === 401) return onCancel(e.message);
      setError(e.message);
      if (e.retryAfter) setResendIn(e.retryAfter);
    }
    setBusy(false);
  };

  const expired = current.reason === "expired";
  const heading =
    current.step === "change_password" ? (expired ? "Time for a new password" : "Set a stronger password") : "Check your email";
  const subheading =
    current.step === "change_password"
      ? expired
        ? "Admin passwords are changed once a year. Pick one you haven't used here before."
        : "Admin accounts need a stronger password before signing in."
      : `We sent a 6-digit code to ${current.email || "your email"}. It works once and expires in 10 minutes.`;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-indigo-100 border-3 border-black flex items-center justify-center">
          {current.step === "change_password" ? (
            <ShieldCheck className="w-6 h-6 text-indigo-700" />
          ) : (
            <MailCheck className="w-6 h-6 text-indigo-700" />
          )}
        </div>
        <h3 className="text-lg font-black text-black">{heading}</h3>
        <p className="mt-1 text-sm font-medium text-slate-600">{subheading}</p>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 px-4 py-3 bg-red-100 border-2 border-red-500 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm font-bold text-red-700">{error}</p>
        </div>
      )}
      {notice && (
        <p role="status" className="px-4 py-3 bg-emerald-100 border-2 border-emerald-500 rounded-xl text-sm font-bold text-emerald-700">
          {notice}
        </p>
      )}

      {current.step === "change_password" && (
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label htmlFor="admin-new-password" className="block text-sm font-bold text-black mb-1.5">
              New password
            </label>
            <div className="relative">
              <input
                id="admin-new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                autoFocus
                className={`${INPUT} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <PasswordRules password={password} />
          </div>
          <div>
            <label htmlFor="admin-confirm-password" className="block text-sm font-bold text-black mb-1.5">
              Type it again
            </label>
            <input
              id="admin-confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className={INPUT}
            />
            {confirm && confirm !== password && (
              <p className="mt-1.5 text-xs font-bold text-red-600">The two passwords don't match</p>
            )}
          </div>
          <button
            type="submit"
            disabled={busy || !meetsAdminPasswordRules(password) || password !== confirm}
            className={PRIMARY}
          >
            {busy ? "Saving…" : "Save password"}
          </button>
        </form>
      )}

      {current.step === "verify_email_code" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verifyCode();
          }}
          className="space-y-4"
        >
          <input
            value={code}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(digits);
              if (digits.length === 6) verifyCode(digits);
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            aria-label="6-digit code from your email"
            placeholder="000000"
            className={`${INPUT} text-center text-2xl tracking-[0.5em] font-black tabular-nums`}
          />
          <button type="submit" disabled={busy || code.length !== 6} className={PRIMARY}>
            {busy ? "Checking…" : "Sign in"}
          </button>
          <p className="text-center text-xs font-medium text-slate-600">
            No email? Check spam, or{" "}
            {resendIn > 0 ? (
              <span className="font-bold text-slate-500">send a new code in {resendIn}s</span>
            ) : (
              <button type="button" onClick={resend} disabled={busy} className="font-bold text-indigo-700 hover:underline">
                send a new code
              </button>
            )}
          </p>
        </form>
      )}

      <button
        type="button"
        onClick={() => onCancel()}
        className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 hover:text-black"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to sign in
      </button>
    </div>
  );
}
