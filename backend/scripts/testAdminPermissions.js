/**
 * Self-check for the admin section permission middleware. No DB, no framework.
 *   node backend/scripts/testAdminPermissions.js
 */
const assert = require("assert");

process.env.DEV_EMAIL = "owner@example.com";
process.env.ADMIN_ACCESS_EMAILS = "owner@example.com";

const User = require("../models/User");
const { requirePermission, ADMIN_PERMISSIONS } = require("../middleware/roleMiddleware");

// Stand in for the database lookup the middleware performs.
let stored = {};
User.findById = (id) => ({ select: async () => stored[id] || null });

const run = async (user, permission) => {
  const req = { user };
  let status = null;
  const res = {
    status(code) {
      status = code;
      return this;
    },
    json() {
      return this;
    },
  };
  let passed = false;
  await requirePermission(permission)(req, res, () => {
    passed = true;
  });
  return { passed, status };
};

(async () => {
  stored = {
    intern: { _id: "intern", role: "admin", email: "intern@example.com", adminPermissions: ["orders", "products"] },
    fresh: { _id: "fresh", role: "admin", email: "fresh@example.com", adminPermissions: [] },
    boss: { _id: "boss", role: "superadmin", email: "owner@example.com", adminPermissions: [] },
  };

  const intern = { id: "intern", role: "admin", email: "intern@example.com" };
  const fresh = { id: "fresh", role: "admin", email: "fresh@example.com" };
  const boss = { id: "boss", role: "superadmin", email: "owner@example.com" };
  const customer = { id: "cust", role: "user", email: "cust@example.com" };

  // Granted section passes.
  assert.deepStrictEqual(await run(intern, "orders"), { passed: true, status: null });

  // Ungranted section is refused, not silently allowed.
  assert.deepStrictEqual(await run(intern, "revenue"), { passed: false, status: 403 });

  // Deny by default: an admin with no permissions gets nothing.
  for (const permission of ADMIN_PERMISSIONS) {
    assert.deepStrictEqual(
      await run(fresh, permission),
      { passed: false, status: 403 },
      `empty permission list must deny ${permission}`
    );
  }

  // Super admin bypasses every check, including with an empty stored list.
  for (const permission of ADMIN_PERMISSIONS) {
    assert.deepStrictEqual(
      await run(boss, permission),
      { passed: true, status: null },
      `super admin must keep access to ${permission}`
    );
  }

  // Non-admins never reach the permission lookup.
  assert.deepStrictEqual(await run(customer, "orders"), { passed: false, status: 403 });

  // A token whose account was deleted is refused rather than crashing.
  assert.deepStrictEqual(
    await run({ id: "ghost", role: "admin", email: "ghost@example.com" }, "orders"),
    { passed: false, status: 403 }
  );

  console.log("admin permission middleware: all checks passed");
  process.exit(0);
})();
