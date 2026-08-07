// Escaping guard: run with `node utils/escapeHtml.test.js`
// Fails if user-supplied markup can survive into email HTML.
const assert = require("assert");
const escapeHtml = require("./escapeHtml");

assert.strictEqual(
  escapeHtml("<script>alert(1)</script>"),
  "&lt;script&gt;alert(1)&lt;/script&gt;"
);
assert.strictEqual(
  escapeHtml(`<img src=x onerror="alert(1)">`),
  "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
);
assert.strictEqual(escapeHtml("O'Brien & Sons"), "O&#39;Brien &amp; Sons");

// Legit non-ASCII names must pass through untouched.
assert.strictEqual(escapeHtml("こんにちは"), "こんにちは");
assert.strictEqual(escapeHtml("आनिश"), "आनिश");

// Missing values render as empty, never "null"/"undefined".
assert.strictEqual(escapeHtml(null), "");
assert.strictEqual(escapeHtml(undefined), "");
assert.strictEqual(escapeHtml(0), "0");

console.log("escapeHtml ok");
