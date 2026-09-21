// Rate limit guard: run with `node middleware/rateLimit.test.js`
// Fails if an IP can keep hitting a limited endpoint past its cap.
const assert = require("assert");
const rateLimit = require("./rateLimit");

const limit = rateLimit({ max: 2, windowMs: 60 * 1000 });
const hit = (ip, path = "/login") => {
  let status = 200;
  let passed = false;
  const res = { set() {}, status(code) { status = code; return { json() {} }; } };
  limit({ method: "POST", ip, baseUrl: "/api/auth", path }, res, () => { passed = true; });
  return passed ? 200 : status;
};

assert.strictEqual(hit("1.1.1.1"), 200);
assert.strictEqual(hit("1.1.1.1"), 200);
assert.strictEqual(hit("1.1.1.1"), 429, "third try in the window is blocked");
assert.strictEqual(hit("2.2.2.2"), 200, "another IP has its own count");
assert.strictEqual(hit("1.1.1.1", "/signup"), 200, "another path has its own count");

console.log("rateLimit ok");
