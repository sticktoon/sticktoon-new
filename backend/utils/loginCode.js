const crypto = require("crypto");

/**
 * One-time sign-in codes emailed to admins - the second step of admin sign-in.
 * Only a keyed hash is stored, so a leaked database doesn't reveal live codes.
 */
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_AFTER_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashLoginCode(code, serverSecret = process.env.JWT_SECRET) {
  if (!serverSecret) throw new Error("JWT_SECRET is not set");
  return crypto.createHmac("sha256", serverSecret).update(`admin-login-code:${code}`).digest("hex");
}

function newLoginCode(serverSecret) {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  return { code, hash: hashLoginCode(code, serverSecret), expiresAt: new Date(Date.now() + CODE_TTL_MS) };
}

// Constant-time check of a typed code against the stored hash.
function codeMatches(typed, storedHash, serverSecret) {
  const clean = String(typed ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean) || typeof storedHash !== "string") return false;
  const expected = Buffer.from(storedHash);
  const actual = Buffer.from(hashLoginCode(clean, serverSecret));
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// "anishpatankar974@gmail.com" -> "an••••••••••74@gmail.com", shown on the code screen.
function maskEmail(email) {
  const [name = "", domain = ""] = String(email).split("@");
  if (name.length <= 4) return `${name.slice(0, 1)}•••@${domain}`;
  return `${name.slice(0, 2)}${"•".repeat(name.length - 4)}${name.slice(-2)}@${domain}`;
}

const loginCodeEmail = (code) => `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:440px;margin:0 auto;padding:24px;color:#111827">
  <h2 style="margin:0 0 8px;font-size:20px">Your admin sign-in code</h2>
  <p style="margin:0 0 20px;color:#4b5563;font-size:14px;line-height:20px">
    Use this code to finish signing in to the StickToon admin panel. It works once and expires in 10 minutes.
  </p>
  <p style="margin:0 0 20px;font-size:34px;font-weight:700;letter-spacing:10px">${code}</p>
  <p style="margin:0;color:#6b7280;font-size:13px;line-height:18px">
    Didn't try to sign in? Someone may know your password. Change it and tell the super admin.
  </p>
</div>`;

module.exports = {
  newLoginCode,
  codeMatches,
  hashLoginCode,
  maskEmail,
  loginCodeEmail,
  CODE_TTL_MS,
  RESEND_AFTER_MS,
  MAX_ATTEMPTS,
};
