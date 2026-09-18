// Admin security guard: run with `node utils/adminSecurity.test.js`
// Fails if sign-in codes or the admin password policy drift.
const assert = require("assert");
const { newLoginCode, codeMatches, hashLoginCode, maskEmail, loginCodeEmail } = require("./loginCode");
const { adminPasswordError, passwordErrorForRole, passwordExpired } = require("./passwordPolicy");

// Sign-in codes: six digits, stored only as a keyed hash, checked exactly.
const { code, hash, expiresAt } = newLoginCode("server-secret");
assert.match(code, /^\d{6}$/);
assert.ok(!hash.includes(code));
assert.ok(expiresAt.getTime() - Date.now() > 9 * 60 * 1000);
assert.strictEqual(codeMatches(code, hash, "server-secret"), true);
assert.strictEqual(codeMatches(` ${code.slice(0, 3)} ${code.slice(3)} `, hash, "server-secret"), true, "spaces ignored");
assert.strictEqual(codeMatches(code, hash, "other-secret"), false, "hash is keyed");
assert.strictEqual(codeMatches(code === "000000" ? "111111" : "000000", hash, "server-secret"), false);
assert.strictEqual(codeMatches("12345", hash, "server-secret"), false);
assert.strictEqual(codeMatches("abcdef", hash, "server-secret"), false);
assert.strictEqual(codeMatches(code, undefined, "server-secret"), false);
assert.strictEqual(codeMatches(code, "short", "server-secret"), false);
assert.throws(() => hashLoginCode("123456", ""), /JWT_SECRET/);
const codes = new Set(Array.from({ length: 200 }, () => newLoginCode("s").code));
assert.ok(codes.size > 190, "codes are random");

assert.strictEqual(maskEmail("anishpatankar974@gmail.com"), "an••••••••••••74@gmail.com");
assert.strictEqual(maskEmail("ab@x.in"), "a•••@x.in");
assert.ok(loginCodeEmail("042917").includes("042917"));

// Password policy.
assert.strictEqual(adminPasswordError("Str0ng!Passw0rd"), null);
assert.match(adminPasswordError("short1!A"), /at least 12 characters/);
assert.strictEqual(
  adminPasswordError("alllowercase"),
  "Password needs an uppercase letter, a number and a special character"
);
assert.match(adminPasswordError("NOLOWERCASE123!"), /a lowercase letter/);
assert.match(adminPasswordError("NoSpecialChar123"), /a special character/);
assert.match(adminPasswordError("Anish@Sticktoon2026", "anish@sticktoon.shop"), /email name/);
assert.match(adminPasswordError(`Aa1!${"x".repeat(130)}`), /128 characters/);
assert.strictEqual(passwordErrorForRole("user", "abcdef"), null, "customers keep the 6-character minimum");
assert.match(passwordErrorForRole("user", "abc"), /6 characters/);
assert.match(passwordErrorForRole("superadmin", "abcdef"), /at least 12/);

const day = 24 * 60 * 60 * 1000;
assert.strictEqual(passwordExpired(null), true);
assert.strictEqual(passwordExpired(new Date(Date.now() - 364 * day)), false);
assert.strictEqual(passwordExpired(new Date(Date.now() - 366 * day)), true);

console.log("adminSecurity ok");
