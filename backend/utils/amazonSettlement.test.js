// Settlement parser guard: run with `node utils/amazonSettlement.test.js`
// Fails if totals, buckets, dates or the reconciliation check drift.
const assert = require("assert");
const { parseSettlementReport, parseDate, toPaise } = require("./amazonSettlement");

const HEADERS = [
  "settlement-id", "settlement-start-date", "settlement-end-date", "deposit-date", "total-amount",
  "currency", "transaction-type", "order-id", "merchant-order-id", "adjustment-id", "shipment-id",
  "marketplace-name", "amount-type", "amount-description", "amount", "fulfillment-id", "posted-date",
  "posted-date-time", "order-item-code", "merchant-order-item-id", "merchant-adjustment-item-id",
  "sku", "quantity-purchased", "promotion-id",
];

const report = (lines, sep = "\t") =>
  [HEADERS, ...lines.map((o) => HEADERS.map((h) => o[h] ?? ""))].map((cells) => cells.join(sep)).join("\r\n");

const line = (type, order, amountType, description, amount) => ({
  "settlement-id": "24681357902", "transaction-type": type, "order-id": order,
  "amount-type": amountType, "amount-description": description, amount,
  "posted-date": "2026-09-12", sku: "BADGE-01", "quantity-purchased": "1",
});

const lines = [
  {
    "settlement-id": "24681357902",
    "settlement-start-date": "2026-08-29 06:30:00 UTC",
    "settlement-end-date": "2026-09-12 06:30:00 UTC",
    "deposit-date": "2026-09-15 06:30:00 UTC",
    "total-amount": "317.12",
    currency: "INR",
  },
  line("Order", "408-1", "ItemPrice", "Principal", "349.00"),
  line("Order", "408-1", "ItemPrice", "Shipping", "40.00"),
  line("Order", "408-1", "Promotion", "Shipping", "-10.00"),
  line("Order", "408-1", "ItemFees", "Commission", "-41.88"),
  line("Order", "408-1", "ItemFees", "FixedClosingFee", "-20.00"),
  line("Order", "171-2", "ItemPrice", "Principal", "299.00"),
  line("Order", "171-2", "ItemFees", "Commission", "-35.88"),
  line("Refund", "171-2", "ItemPrice", "Principal", "-299.00"),
  line("Refund", "171-2", "ItemFees", "Commission", "35.88"),
];

const parsed = parseSettlementReport("﻿" + report(lines));
assert.strictEqual(parsed.settlementId, "24681357902");
assert.strictEqual(parsed.currency, "INR");
assert.strictEqual(parsed.rows.length, 9);
assert.strictEqual(parsed.salesPaise, 67800);
assert.strictEqual(parsed.feesPaise, -9776);
assert.strictEqual(parsed.refundsPaise, -26312);
assert.strictEqual(parsed.netPaise, 31712);
assert.strictEqual(parsed.fileTotalPaise, 31712);
assert.strictEqual(parsed.matches, true);
assert.strictEqual(parsed.orderCount, 2);
assert.strictEqual(parsed.depositDate.toISOString(), "2026-09-15T06:30:00.000Z");
assert.strictEqual(parsed.rows[7].bucket, "refunds");

// Same file saved as CSV, with a quoted comma in a description.
const csvLines = lines.map((l) => (l["amount-description"] === "Principal" ? { ...l, "amount-description": '"Principal, item"' } : l));
const csv = parseSettlementReport(report(csvLines, ","));
assert.strictEqual(csv.netPaise, 31712);
assert.strictEqual(csv.rows[0].amountDescription, "Principal, item");

// Rows that don't add up to Amazon's total are flagged, not silently accepted.
const off = parseSettlementReport(report([{ ...lines[0], "total-amount": "300.00" }, ...lines.slice(1)]));
assert.strictEqual(off.matches, false);

// Deposit date falls back to the settlement end when Amazon leaves it blank.
const noDeposit = parseSettlementReport(report([{ ...lines[0], "deposit-date": "" }, ...lines.slice(1)]));
assert.strictEqual(noDeposit.depositDate.toISOString(), "2026-09-12T06:30:00.000Z");

assert.throws(() => parseSettlementReport("date,type,total\n1,2,3"), /isn't an Amazon settlement report/);
assert.throws(() => parseSettlementReport(""), /isn't an Amazon settlement report/);

assert.strictEqual(parseDate("15.09.2026 06:30:00 UTC").toISOString(), "2026-09-15T06:30:00.000Z");
assert.strictEqual(parseDate("2026-09-15T12:00:00+05:30").toISOString(), "2026-09-15T06:30:00.000Z");
assert.strictEqual(parseDate("2026-09-15").toISOString(), "2026-09-15T00:00:00.000Z");
assert.strictEqual(parseDate("not a date"), null);

assert.strictEqual(toPaise("41,88"), 4188);
assert.strictEqual(toPaise("-1,234.50"), -123450);
assert.strictEqual(toPaise(""), 0);
assert.throws(() => toPaise("abc"), /Unreadable amount/);

console.log("amazonSettlement ok");
