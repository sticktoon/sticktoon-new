// Avatar guard: run with `node utils/avatarGuard.test.js`
// The rule is "no image bytes in the users collection", but it must not lock out
// a user who already has one - their next sign-in calls save() on that document.
const assert = require("assert");
const mongoose = require("mongoose");
const User = require("../models/User");

const blob = "data:image/png;base64,iVBORw0KGgo=";

const errorFor = async (doc) => {
  try {
    await doc.validate();
    return null;
  } catch (err) {
    return err.errors?.avatar?.message || null;
  }
};

(async () => {
  const base = { name: "T", email: `t${Date.now()}@x.com`, provider: "google" };

  // A fresh inline avatar is refused, whichever way it is set.
  assert.ok(await errorFor(new User({ ...base, avatar: blob })), "new doc with blob must fail");

  const assigned = new User(base);
  assigned.avatar = blob;
  assert.ok(await errorFor(assigned), "assigning a blob must fail");

  // URLs and initials are what the panel and Google OAuth actually send.
  assert.strictEqual(await errorFor(new User({ ...base, avatar: "https://x.com/a.jpg" })), null);
  assert.strictEqual(await errorFor(new User({ ...base, avatar: "A" })), null);
  assert.strictEqual(await errorFor(new User({ ...base, avatar: null })), null);

  // A legacy document loaded from the database, avatar untouched: must still
  // validate, or sbhalmey@gmail.com cannot sign in before the cleanup runs.
  const legacy = new User({ ...base, avatar: blob });
  legacy.$isNew = false;
  legacy.unmarkModified("avatar");
  assert.strictEqual(await errorFor(legacy), null, "legacy untouched blob must stay saveable");

  console.log("avatarGuard ok");
  await mongoose.disconnect().catch(() => {});
})();
