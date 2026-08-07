// CSV guard: run with `node utils/backupCsv.test.js`
// Fails if a value can break out of its cell or execute as an Excel formula.
require("dotenv").config(); // backupCsv pulls in sendEmail, which needs RESEND_API_KEY at import
const assert = require("assert");
const { toCsv, cell } = require("./backupCsv");

// Quotes, commas and newlines must stay inside one cell.
assert.strictEqual(cell(`He said "hi", then left`), `"He said ""hi"", then left"`);
assert.strictEqual(cell("line1\nline2"), `"line1\nline2"`);

// Excel formula injection: a leading =, +, - or @ gets neutralised.
assert.strictEqual(cell("=HYPERLINK(\"http://evil\")"), `"'=HYPERLINK(""http://evil"")"`);
assert.strictEqual(cell("+1234"), `"'+1234"`);
assert.strictEqual(cell("@SUM(A1)"), `"'@SUM(A1)"`);

// Missing values render empty, never "null"/"undefined".
assert.strictEqual(cell(null), "");
assert.strictEqual(cell(undefined), "");
assert.strictEqual(cell(0), `"0"`);

// Objects and dates survive as readable text.
assert.strictEqual(cell(new Date("2026-01-04T00:00:00Z")), `"2026-01-04T00:00:00.000Z"`);
assert.strictEqual(cell({ a: 1 }), `"{""a"":1}"`);

// Columns are the union of all rows, so a field missing from row 1 is not dropped.
const csv = toCsv([{ name: "A" }, { name: "B", phone: "999" }]);
assert.strictEqual(csv, 'name,phone\r\n"A",\r\n"B","999"');

assert.strictEqual(toCsv([]), "");

// The RESTORE json must survive a round trip with its types intact - that is the
// whole reason it exists next to the CSVs. Strings here would break populate().
const { EJSON, ObjectId } = require("bson");
const userId = new ObjectId();
const dump = EJSON.stringify(
  { orders: [{ _id: new ObjectId(), userId, placedAt: new Date("2026-08-07T10:00:00Z"), total: 499, paid: true }] },
  { relaxed: false }
);
// Relaxed parse is what restoreBackup.js uses: real ObjectId/Date, plain numbers.
const restored = EJSON.parse(dump).orders[0];

assert.ok(restored._id instanceof ObjectId, "_id must restore as ObjectId, not string");
assert.ok(restored.userId instanceof ObjectId, "relation id must restore as ObjectId");
assert.strictEqual(String(restored.userId), String(userId));
assert.ok(restored.placedAt instanceof Date, "date must restore as Date");
assert.strictEqual(restored.total, 499);
assert.strictEqual(restored.paid, true);

console.log("backupCsv ok");
