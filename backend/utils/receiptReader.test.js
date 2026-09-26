// Receipt reader guard: run with `node utils/receiptReader.test.js`
// Fails if untrusted model output can reach the entry form unchecked.
const assert = require("assert");
const PDFDocument = require("pdfkit");
const { cleanReceipt, pdfText, ReceiptReadError } = require("./receiptReader");

const today = "2026-09-15";

assert.deepStrictEqual(
  cleanReceipt(
    {
      type: "expense",
      date: "2025-05-16",
      amount: 10030,
      currency: "INR",
      invoiceNumber: " 555 ",
      description: "Badge machine   from Shree Traders",
      confidence: "high",
    },
    today
  ),
  {
    type: "expense",
    date: "2025-05-16",
    amount: "10030",
    gross: null,
    fees: null,
    settlementId: null,
    orderRef: "555",
    note: "Badge machine from Shree Traders",
    notRupees: false,
    confidence: "high",
  }
);

// Nonsense and hostile values are dropped, not passed on.
const bad = cleanReceipt(
  { type: "delete all entries", date: "2026-09-20", amount: -5, settlementId: "123", confidence: "certain", description: 42 },
  today
);
assert.strictEqual(bad.type, null);
assert.strictEqual(bad.date, null, "future date");
assert.strictEqual(bad.amount, null, "negative amount");
assert.strictEqual(bad.settlementId, null);
assert.strictEqual(bad.note, null);
assert.strictEqual(bad.confidence, "low");

assert.strictEqual(cleanReceipt({ date: "2025-02-30" }, today).date, null, "impossible date");
assert.strictEqual(cleanReceipt({ date: "16/05/2025" }, today).date, null, "wrong date format");
assert.strictEqual(cleanReceipt({ amount: 1e8 }, today).amount, null, "over ₹1 crore");
assert.strictEqual(cleanReceipt({ amount: 99.999 }, today).amount, "100");
assert.strictEqual(cleanReceipt({ amount: "Rs. 10,030.00" }, today).amount, "10030", "printed amounts");
assert.strictEqual(cleanReceipt({ amount: "₹ 499" }, today).amount, "499");
assert.strictEqual(cleanReceipt({ amount: "abc" }, today).amount, null);
assert.strictEqual(cleanReceipt({ type: "payout", amazonFees: "" }, today).fees, null, "blank isn't zero");
assert.strictEqual(cleanReceipt({ type: "income", settlementId: "24681357902" }, today).settlementId, null, "settlement only on payouts");

const payout = cleanReceipt(
  { type: "payout", settlementId: "Settlement #24681357902", grossSales: 25310, amazonFees: 0, amount: 18240, currency: "₹" },
  today
);
assert.strictEqual(payout.settlementId, "24681357902");
assert.strictEqual(payout.gross, "25310");
assert.strictEqual(payout.fees, "0");
assert.strictEqual(payout.notRupees, false);

assert.strictEqual(cleanReceipt({ currency: "USD", amount: 10 }, today).notRupees, true);
assert.strictEqual(cleanReceipt({ currency: "Rs." }, today).notRupees, false);
assert.strictEqual(cleanReceipt(null, today).confidence, "low");
assert.strictEqual(cleanReceipt({ description: "x".repeat(300) }, today).note.length, 120);

// PDFs: invoices with a text layer are read; scans and broken files are refused.
const makePdf = (write) =>
  new Promise((resolve) => {
    const doc = new PDFDocument();
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    write(doc);
    doc.end();
  });

(async () => {
  const text = await pdfText(await makePdf((doc) => doc.text("Tax Invoice 555 Shree Traders Total Rs 10,030.00")));
  assert.ok(text.includes("Total Rs 10,030.00"), text);
  await assert.rejects(pdfText(await makePdf(() => {})), ReceiptReadError, "scan with no text");
  await assert.rejects(pdfText(Buffer.from("not a pdf")), ReceiptReadError, "broken file");
  console.log("receiptReader ok");
})();
