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

console.log("backupCsv ok");
