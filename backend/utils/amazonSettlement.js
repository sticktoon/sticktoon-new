/**
 * Parses an Amazon settlement report, flat file V2: the .txt from
 * Seller Central → Payments → All statements → "Download Flat File V2".
 * The SP-API Reports API returns the same file for
 * GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2, so a later auto-sync reuses this.
 *
 * Pure: text in, plain object out. Money is integer paise, signed the way
 * Amazon reports it (sales +, fees and refunds −).
 */

// "-41.88" -> -4188. Some marketplaces write a decimal comma ("41,88").
const toPaise = (value) => {
  let s = String(value ?? "").replace(/\s/g, "");
  if (!s) return 0;
  if (/^-?\d+,\d{1,2}$/.test(s)) s = s.replace(",", ".");
  const n = Number(s.replace(/,/g, ""));
  if (!Number.isFinite(n)) throw new Error(`Unreadable amount "${value}" in the report`);
  return Math.round(n * 100);
};

// Accepts "2026-09-15 06:30:00 UTC", "15.09.2026 06:30:00 UTC",
// "2026-09-15T06:30:00+05:30" and bare dates. No offset means UTC.
const parseDate = (value) => {
  const s = String(value || "").trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) {
    const d = s.match(/^(\d{2})\.(\d{2})\.(\d{4})(?: (\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (d) m = [d[0], d[3], d[2], d[1], d[4], d[5], d[6]];
  }
  if (!m) return null;

  let ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  const tz = m[4] && s.slice(m[0].length).match(/([+-])(\d{2}):?(\d{2})\s*$/);
  if (tz) ms -= (tz[1] === "-" ? -1 : 1) * (+tz[2] * 60 + +tz[3]) * 60000;
  return new Date(ms);
};

// ponytail: no multi-line quoted cells; settlement reports don't use them.
const splitCsv = (line) => {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c !== '"') cur += c;
      else if (line[i + 1] === '"') cur += '"', i++;
      else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ",") out.push(cur), (cur = "");
    else cur += c;
  }
  out.push(cur);
  return out;
};

// sales: what customers paid (item price, shipping, promotions).
// refunds: every line of a refund transaction, fee reversals included.
// fees: everything else Amazon takes or adjusts (fees, GST on fees, TCS, TDS, reserves).
const bucketOf = (transactionType, amountType) => {
  if (/refund/i.test(transactionType)) return "refunds";
  if (amountType === "ItemPrice" || amountType === "Promotion") return "sales";
  return "fees";
};

const NOT_A_REPORT =
  "This isn't an Amazon settlement report. In Seller Central open Payments → All statements and use \"Download Flat File V2\".";

function parseSettlementReport(text) {
  const lines = String(text || "")
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (lines.length < 2) throw new Error(NOT_A_REPORT);

  const split = lines[0].includes("\t") ? (l) => l.split("\t") : splitCsv;
  const headers = split(lines[0]).map((h) => h.trim().toLowerCase());
  for (const need of ["settlement-id", "total-amount", "transaction-type", "amount-type", "amount"]) {
    if (!headers.includes(need)) throw new Error(NOT_A_REPORT);
  }

  const records = lines.slice(1).map((line) => {
    const cells = split(line);
    const rec = {};
    headers.forEach((h, i) => (rec[h] = (cells[i] ?? "").trim()));
    return rec;
  });

  // The first data line carries the settlement totals and no transaction.
  const summary = records.find((r) => r["total-amount"] !== "");
  if (!summary || !summary["settlement-id"]) throw new Error("The report has no settlement summary line");

  const rows = records
    .filter((r) => r !== summary && r.amount !== "")
    .map((r) => ({
      postedAt: parseDate(r["posted-date-time"]) || parseDate(r["posted-date"]),
      transactionType: r["transaction-type"],
      orderId: r["order-id"],
      amountType: r["amount-type"],
      amountDescription: r["amount-description"],
      amountPaise: toPaise(r.amount),
      sku: r.sku || "",
      quantity: Number(r["quantity-purchased"]) || 0,
      bucket: bucketOf(r["transaction-type"], r["amount-type"]),
    }));
  if (!rows.length) throw new Error("The report has no transactions");

  const totals = { salesPaise: 0, feesPaise: 0, refundsPaise: 0 };
  const orders = new Set();
  for (const row of rows) {
    totals[`${row.bucket}Paise`] += row.amountPaise;
    if (row.bucket === "sales" && row.orderId) orders.add(row.orderId);
  }

  const netPaise = totals.salesPaise + totals.feesPaise + totals.refundsPaise;
  const fileTotalPaise = toPaise(summary["total-amount"]);
  const periodEnd = parseDate(summary["settlement-end-date"]);

  return {
    settlementId: summary["settlement-id"],
    currency: summary.currency || "",
    periodStart: parseDate(summary["settlement-start-date"]),
    periodEnd,
    depositDate: parseDate(summary["deposit-date"]) || periodEnd,
    ...totals,
    netPaise,
    fileTotalPaise,
    matches: netPaise === fileTotalPaise,
    orderCount: orders.size,
    rows,
  };
}

module.exports = { parseSettlementReport, parseDate, toPaise };
