// Amazon SP-API guard: run with `node utils/amazonSpApi.test.js`
// Fails if report decoding or the "is it set up" check drift.
const assert = require("assert");
const zlib = require("zlib");
const { decodeReport, spApiConfigured, getAccessToken, SETTLEMENT_REPORT_TYPE } = require("./amazonSpApi");

const keys = ["AMAZON_LWA_CLIENT_ID", "AMAZON_LWA_CLIENT_SECRET", "AMAZON_REFRESH_TOKEN"];
const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
const setKeys = (value) => keys.forEach((k) => (value === null ? delete process.env[k] : (process.env[k] = value)));

(async () => {
  // Report documents arrive plain or gzipped.
  const report = "settlement-id\ttotal-amount\n24681357902\t18240.00";
  assert.strictEqual(await decodeReport(Buffer.from(report, "utf8"), undefined), report);
  assert.strictEqual(await decodeReport(zlib.gzipSync(Buffer.from(report, "utf8")), "GZIP"), report);
  await assert.rejects(decodeReport(Buffer.from("not gzipped"), "GZIP"), "a corrupt gzip is an error, not silent garbage");

  // Nothing runs until all three Amazon keys are present.
  setKeys(null);
  assert.strictEqual(spApiConfigured(), false);
  await assert.rejects(getAccessToken(), (err) => err.status === 503 && /isn't set up/.test(err.message));

  setKeys("x");
  assert.strictEqual(spApiConfigured(), true);
  delete process.env.AMAZON_REFRESH_TOKEN;
  assert.strictEqual(spApiConfigured(), false, "a missing refresh token counts as not set up");

  assert.strictEqual(SETTLEMENT_REPORT_TYPE, "GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2");

  keys.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])));
  console.log("amazonSpApi ok");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
