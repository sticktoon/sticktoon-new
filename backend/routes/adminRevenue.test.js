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

/* Month-end balances carried forward from each bank check. */
const { walkBalances } = require("./adminRevenue");

// ₹1,000 in the bank as June (the check's month) began; June earns ₹100,
// July spends ₹300. A second check in August restates the balance at ₹500.
const net = { "2026-05": 20000, "2026-06": 10000, "2026-07": -30000, "2026-08": 4000, "2026-09": 1000 };
const months = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];
const balances = walkBalances(months, [{ month: "2026-06", atMonthStart: 100000 }], (k) => net[k] || 0);

assert.deepStrictEqual(balances, {
  "2026-06": 110000,
  "2026-07": 80000,
  "2026-08": 84000,
  "2026-09": 85000,
});
assert.ok(!("2026-05" in balances), "months before the first check get no balance");

const twoChecks = walkBalances(
  months,
  [{ month: "2026-06", atMonthStart: 100000 }, { month: "2026-08", atMonthStart: 50000 }],
  (k) => net[k] || 0
);
assert.strictEqual(twoChecks["2026-07"], 80000, "the first check still covers July");
assert.strictEqual(twoChecks["2026-08"], 54000, "August onwards follows the newer check");
assert.strictEqual(twoChecks["2026-09"], 55000);

// Across a year end, and when the check sits before the range.
const yearEnd = walkBalances(["2026-01", "2026-02"], [{ month: "2025-12", atMonthStart: 50000 }], () => 1000);
assert.deepStrictEqual(yearEnd, { "2026-01": 52000, "2026-02": 53000 });

console.log("adminRevenue balances ok");
