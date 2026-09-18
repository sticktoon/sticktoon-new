/**
 * Password rules for admin accounts. The admin panel reaches customer data and
 * Amazon seller data, so it gets a stronger policy than the storefront, where
 * customers keep the 6-character minimum.
 *
 * Mirrored for live hints in components/PasswordRules.tsx - keep the two in step.
 */
const MIN_LENGTH = 12;
const MAX_LENGTH = 128;
const MAX_AGE_DAYS = 365;

const RULES = [
  { test: (p) => p.length >= MIN_LENGTH, need: `at least ${MIN_LENGTH} characters` },
  { test: (p) => /[A-Z]/.test(p), need: "an uppercase letter" },
  { test: (p) => /[a-z]/.test(p), need: "a lowercase letter" },
  { test: (p) => /\d/.test(p), need: "a number" },
  { test: (p) => /[^A-Za-z0-9\s]/.test(p), need: "a special character" },
];

const isAdminRole = (role) => role === "admin" || role === "superadmin";

const joinList = (items) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}` : items[0];

// Returns what's wrong with an admin password, or null when it's fine.
function adminPasswordError(password, email = "") {
  const p = String(password ?? "");
  if (p.length > MAX_LENGTH) return `Password must be ${MAX_LENGTH} characters or fewer`;

  const missing = RULES.filter((r) => !r.test(p)).map((r) => r.need);
  if (missing.length) return `Password needs ${joinList(missing)}`;

  const name = String(email).split("@")[0].toLowerCase();
  if (name.length >= 4 && p.toLowerCase().includes(name)) return "Password can't contain your email name";
  return null;
}

// Admin accounts get the full policy; everyone else keeps the storefront minimum.
function passwordErrorForRole(role, password, email) {
  if (isAdminRole(role)) return adminPasswordError(password, email);
  return String(password ?? "").length < 6 ? "Password must be at least 6 characters" : null;
}

// No date means the password was set by someone else (or before this existed),
// so it has to be changed by its owner.
const passwordExpired = (changedAt, now = Date.now()) =>
  !changedAt || now - new Date(changedAt).getTime() > MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

module.exports = { adminPasswordError, passwordErrorForRole, passwordExpired, isAdminRole, MAX_AGE_DAYS };
