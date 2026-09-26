// Duplicate guard: run with `node routes/adminRevenue.test.js`
// Fails if the same payment can be saved twice, or a genuine one is blocked outright.
const assert = require("assert");
const { judgeDuplicate } = require("./adminRevenue");

const may15 = new Date("2026-05-15T00:00:00+05:30");
const existing = {
  occurredAt: may15,
  amountPaise: -344600,
  orderRef: "T2605151059414650431182",
  utr: "872239728910",
  note: "Payment to Token Manufacturer",
};
// The same PhonePe payment entered again, its ID misread (8 for 6) and no UTR.
const again = { type: "expense", amountPaise: -344600, occurredAt: may15, orderRef: "T2605151059414850431182", utr: null };

assert.strictEqual(judgeDuplicate(again, []), null, "nothing found");

const misread = judgeDuplicate(again, [existing]);
assert.strictEqual(misread.possible, true, "same day and amount is warned about");
assert.match(misread.message, /^Possible duplicate: an expense of ₹3,446 is already on 2026-05-15/);

const byUtr = judgeDuplicate({ ...again, utr: "872239728910" }, [existing]);
assert.strictEqual(byUtr.possible, undefined, "same UTR and amount is blocked, whatever the ref says");
assert.match(byUtr.message, /with UTR 872239728910/);

const byRef = judgeDuplicate({ ...again, orderRef: "t2605151059414650431182" }, [existing]);
assert.strictEqual(byRef.possible, undefined, "same ref and amount is blocked, ignoring case");
assert.match(byRef.message, /with ref t2605151059414650431182/);

const split = judgeDuplicate({ ...again, amountPaise: -100000, orderRef: null, utr: "872239728910" }, [existing]);
assert.strictEqual(split.possible, true, "same UTR with another amount may be a split payment");
assert.match(split.message, /split across entries/);

assert.match(judgeDuplicate({ ...again, type: "refund" }, [existing]).message, /a refund of/);

console.log("adminRevenue duplicates ok");
