const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const Order = require("../models/Order");
const LedgerEntry = require("../models/LedgerEntry");
const AmazonSettlement = require("../models/AmazonSettlement");
const BankCheck = require("../models/BankCheck");
const auth = require("../middleware/auth");
const { adminOnly, superAdminOnly } = require("../middleware/roleMiddleware");
const { logActivity } = require("../utils/activityLogger");
const { uploadToCloudinary } = require("../utils/cloudinaryService");
const { parseSettlementReport } = require("../utils/amazonSettlement");
const { readReceipt, ReceiptReadError, normalizeUtr } = require("../utils/receiptReader");
const { storeSettlement } = require("../utils/amazonSettlementStore");
const { syncSettlements, getSyncStatus } = require("../services/amazonSync");

const router = express.Router();

// Every route below is mounted in server.js behind auth + requirePermission("revenue").

/* =========================
   HELPERS
========================= */
const IST = "Asia/Kolkata";
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const istDay = (date) => new Date(date).toLocaleDateString("en-CA", { timeZone: IST });
const dayStart = (ymd) => new Date(`${ymd}T00:00:00+05:30`);
const rupees = (paise) => `₹${(paise / 100).toLocaleString("en-IN")}`;
const dayOf = (field) => ({ $dateToString: { format: "%Y-%m-%d", date: field, timezone: IST } });
const monthOf = (field) => ({ $dateToString: { format: "%Y-%m", date: field, timezone: IST } });
// Order.amount is rupees; the ledger works in paise.
const ORDER_PAISE = { $round: [{ $multiply: ["$amount", 100] }, 0] };

// ?from=YYYY-MM-DD&to=YYYY-MM-DD, both inclusive IST days. Defaults to this month.
const readRange = (query) => {
  const to = YMD.test(query.to || "") ? query.to : istDay(new Date());
  const from = YMD.test(query.from || "") ? query.from : `${to.slice(0, 8)}01`;
  const start = dayStart(from);
  const end = new Date(dayStart(to).getTime() + DAY_MS);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return null;
  return { from, to, start, end };
};

// upload(options)(field) takes one file; upload(options)(field, max) takes up to max.
const upload = (options) => (field, max) => (req, res, next) => {
  const m = multer({ storage: multer.memoryStorage(), ...options });
  (max ? m.array(field, max) : m.single(field))(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "That file is too large"
        : err.code === "LIMIT_UNEXPECTED_FILE" && max
          ? `Attach up to ${max} documents`
          : err.message;
    res.status(400).json({ message });
  });
};

const reportUpload = upload({ limits: { fileSize: 10 * 1024 * 1024 } });
const receiptUpload = upload({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    /^image\/|^application\/pdf$/.test(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Attach an image or a PDF")),
});

const MAX_DOCS = 5;

// The index keeps two same-named files saved in the same millisecond apart.
const saveReceipt = async (file, index = 0) => {
  const safeName = file.originalname.replace(/[^\w.-]+/g, "-");
  const { url } = await uploadToCloudinary(file.buffer, "revenue-receipts", `${Date.now()}-${index}-${safeName}`);
  return { url, name: file.originalname };
};

const TYPES = ["payout", "income", "expense", "refund"];
const CHANNELS = ["amazon", "website", "offline", "other"];
const MAX_PAISE = 1e9; // ₹1 crore - anything bigger is a typo

// "1,234.50" -> 123450. Anything that isn't a plain positive amount -> NaN.
const inputPaise = (value) => {
  const s = String(value ?? "").replace(/[₹,\s]/g, "");
  return /^\d+(\.\d{1,2})?$/.test(s) ? Math.round(Number(s) * 100) : NaN;
};

// Validates a manual entry form. `type` is passed separately because an edit
// may not change it.
function readEntry(body, type) {
  if (!TYPES.includes(type)) return { error: "Pick what happened" };
  const channel = type === "payout" ? "amazon" : body.channel;
  if (!CHANNELS.includes(channel)) return { error: "Pick a channel" };

  const date = String(body.date || "");
  if (!YMD.test(date) || istDay(dayStart(date)) !== date) return { error: "Pick the date the money moved" };
  if (date > istDay(new Date())) return { error: "The date can't be in the future" };

  const common = {
    type,
    channel,
    occurredAt: dayStart(date),
    note: String(body.note || "").trim().slice(0, 500),
  };

  if (type === "payout") {
    const settlementId = String(body.settlementId || "").trim();
    if (!/^\d{5,20}$/.test(settlementId)) return { error: "Enter the settlement ID from Seller Central (digits only)" };
    const sales = inputPaise(body.gross);
    const fees = String(body.fees ?? "").trim() === "" ? 0 : inputPaise(body.fees);
    if (!(sales > 0 && sales <= MAX_PAISE)) return { error: "Enter the gross sales amount" };
    if (!(fees >= 0)) return { error: "Enter Amazon's deductions, or leave it empty" };
    if (fees >= sales) return { error: "Deductions can't be more than gross sales" };
    return {
      fields: {
        ...common,
        settlementId,
        orderRef: null,
        amountPaise: sales - fees,
        breakdown: { salesPaise: sales, feesPaise: -fees, refundsPaise: 0 },
        dedupeKey: `amz:settlement:${settlementId}`,
      },
    };
  }

  const amount = inputPaise(body.amount);
  if (!(amount > 0 && amount <= MAX_PAISE)) return { error: "Enter an amount" };
  const utrTyped = String(body.utr || "").trim();
  const utr = utrTyped ? normalizeUtr(utrTyped) : null;
  if (utrTyped && !utr) return { error: "Enter the UTR as printed: letters and digits only" };
  return {
    fields: {
      ...common,
      settlementId: null,
      orderRef: String(body.orderRef || "").trim().slice(0, 100) || null,
      utr,
      amountPaise: type === "income" ? amount : -amount,
    },
  };
}

// The same money must not go in twice. Blocked outright: an Amazon settlement
// already on the timeline, or a manual entry of the same type and amount with
// the same reference or UTR. Only warned about, because they can be genuine:
// the same type and amount on the same day (two identical purchases, or one
// receipt whose reference was misread), or a UTR already on an entry of another
// amount (one payment split across entries).
// Returns null, { message } (blocked) or { message, possible: true } (warn).
async function duplicateOf(fields, ignoreId) {
  if (fields.dedupeKey) {
    const clash = await LedgerEntry.findOne({ dedupeKey: fields.dedupeKey, _id: { $ne: ignoreId } })
      .select("occurredAt")
      .lean();
    return clash ? { message: `Settlement ${fields.settlementId} is already on the timeline (${istDay(clash.occurredAt)})` } : null;
  }

  const or = [{ amountPaise: fields.amountPaise, occurredAt: fields.occurredAt }];
  if (fields.orderRef) or.push({ orderRef: fields.orderRef, amountPaise: fields.amountPaise });
  if (fields.utr) or.push({ utr: fields.utr });
  const found = await LedgerEntry.find({ _id: { $ne: ignoreId }, voidedAt: null, type: fields.type, $or: or })
    .collation({ locale: "en", strength: 2 }) // references match ignoring case
    .select("occurredAt amountPaise orderRef utr note")
    .lean();
  return judgeDuplicate(fields, found);
}

// Sorts what duplicateOf found into blocked or warn. Kept apart so it can be tested.
function judgeDuplicate(fields, found) {
  if (!found.length) return null;
  const same = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
  const amount = rupees(Math.abs(fields.amountPaise));
  const kind = `${/^[aeiou]/.test(fields.type) ? "an" : "a"} ${fields.type}`; // "an expense", "a refund"

  const exact = found.find(
    (e) => e.amountPaise === fields.amountPaise && (same(e.orderRef, fields.orderRef) || same(e.utr, fields.utr))
  );
  if (exact) {
    const by = same(exact.utr, fields.utr) ? `UTR ${fields.utr}` : `ref ${fields.orderRef}`;
    return {
      message: `Already on the timeline: ${kind} of ${amount} with ${by}, dated ${istDay(exact.occurredAt)}. Edit that entry instead.`,
    };
  }

  const e = found[0];
  return {
    possible: true,
    message: same(e.utr, fields.utr)
      ? `UTR ${fields.utr} is already on ${kind} of ${rupees(Math.abs(e.amountPaise))} dated ${istDay(e.occurredAt)}. Save anyway if one payment is split across entries.`
      : `Possible duplicate: ${kind} of ${amount} is already on ${istDay(e.occurredAt)}${e.note ? ` (${e.note})` : ""}. Save anyway if this is a different payment.`,
  };
}

const loggable = (e) => ({
  date: istDay(e.occurredAt),
  amountPaise: e.amountPaise,
  channel: e.channel,
  settlementId: e.settlementId,
  orderRef: e.orderRef,
  utr: e.utr,
  note: e.note,
});

/* =========================
   SUMMARY (overview tab)
========================= */
async function totalsFor(start, end) {
  const [[website], ledger] = await Promise.all([
    Order.aggregate([
      { $match: { status: "SUCCESS", createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: null, paise: { $sum: ORDER_PAISE }, orders: { $sum: 1 } } },
    ]),
    LedgerEntry.aggregate([
      { $match: { voidedAt: null, occurredAt: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: "$type",
          paise: { $sum: "$amountPaise" },
          sales: { $sum: "$breakdown.salesPaise" },
          fees: { $sum: "$breakdown.feesPaise" },
          refunds: { $sum: "$breakdown.refundsPaise" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const by = Object.fromEntries(ledger.map((g) => [g._id, g]));
  const payout = by.payout || {};
  const websitePaise = website?.paise || 0;
  const amazonNetPaise = payout.paise || 0;
  const manualInPaise = by.income?.paise || 0;
  const manualOutPaise = -((by.expense?.paise || 0) + (by.refund?.paise || 0));

  return {
    websitePaise,
    websiteOrders: website?.orders || 0,
    amazonSalesPaise: payout.sales || 0,
    amazonFeesPaise: payout.fees || 0,
    amazonRefundsPaise: payout.refunds || 0,
    amazonNetPaise,
    payouts: payout.count || 0,
    manualInPaise,
    manualOutPaise,
    netPaise: websitePaise + amazonNetPaise + manualInPaise - manualOutPaise,
  };
}

router.get("/summary", async (req, res) => {
  const range = readRange(req.query);
  if (!range) return res.status(400).json({ message: "Invalid date range" });
  const { start, end } = range;

  try {
    // Previous period of the same length, for the % change on the cards.
    const prevStart = new Date(start.getTime() - (end - start));

    // Financial year (Apr-Mar) containing the end of the range, for the chart.
    const [toYear, toMonth] = range.to.split("-").map(Number);
    const fy = toMonth >= 4 ? toYear : toYear - 1;
    const fyStart = dayStart(`${fy}-04-01`);
    const fyEnd = dayStart(`${fy + 1}-04-01`);

    const [current, previous, settlementFees, manualFees, webMonths, payoutMonths, manualStats, lastImport] =
      await Promise.all([
        totalsFor(start, end),
        totalsFor(prevStart, start),
        AmazonSettlement.aggregate([
          { $match: { depositDate: { $gte: start, $lt: end } } },
          { $unwind: "$rows" },
          { $match: { "rows.bucket": "fees" } },
          { $group: { _id: "$rows.amountDescription", paise: { $sum: "$rows.amountPaise" } } },
        ]),
        LedgerEntry.aggregate([
          { $match: { voidedAt: null, source: "manual", type: "payout", occurredAt: { $gte: start, $lt: end } } },
          { $group: { _id: null, paise: { $sum: "$breakdown.feesPaise" } } },
        ]),
        Order.aggregate([
          { $match: { status: "SUCCESS", createdAt: { $gte: fyStart, $lt: fyEnd } } },
          { $group: { _id: monthOf("$createdAt"), paise: { $sum: ORDER_PAISE } } },
        ]),
        LedgerEntry.aggregate([
          { $match: { voidedAt: null, type: "payout", occurredAt: { $gte: fyStart, $lt: fyEnd } } },
          { $group: { _id: monthOf("$occurredAt"), paise: { $sum: "$amountPaise" } } },
        ]),
        LedgerEntry.aggregate([
          { $match: { voidedAt: null, source: "manual", occurredAt: { $gte: start, $lt: end } } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              backdated: { $sum: { $cond: [{ $gt: [dayOf("$createdAt"), dayOf("$occurredAt")] }, 1, 0] } },
            },
          },
        ]),
        AmazonSettlement.findOne({ importedAt: { $ne: null } })
          .sort({ importedAt: -1 })
          .select("settlementId periodEnd importedAt")
          .lean(),
      ]);

    const deductions = settlementFees.map((g) => ({ label: g._id || "Other", paise: g.paise }));
    if (manualFees[0]?.paise) deductions.push({ label: "Payouts entered by hand", paise: manualFees[0].paise });
    deductions.sort((a, b) => Math.abs(b.paise) - Math.abs(a.paise));

    const thisMonth = istDay(new Date()).slice(0, 7);
    const webByMonth = Object.fromEntries(webMonths.map((m) => [m._id, m.paise]));
    const payoutByMonth = Object.fromEntries(payoutMonths.map((m) => [m._id, m.paise]));
    const months = Array.from({ length: 12 }, (_, i) => {
      const key = `${i < 9 ? fy : fy + 1}-${String(((i + 3) % 12) + 1).padStart(2, "0")}`;
      return { key, websitePaise: webByMonth[key] || 0, amazonPaise: payoutByMonth[key] || 0 };
    }).filter((m) => m.key <= thisMonth);

    res.json({
      range: { from: range.from, to: range.to },
      current,
      previous,
      deductions,
      months,
      sources: {
        lastImport,
        manualCount: manualStats[0]?.count || 0,
        manualBackdated: manualStats[0]?.backdated || 0,
      },
    });
  } catch (err) {
    console.error("Revenue summary error:", err);
    res.status(500).json({ message: "Failed to load the revenue summary" });
  }
});

/* =========================
   BANK CHECK (expected balance + untracked)
========================= */
// The newest check anchors the balance. The bank figure at the end of its day
// plus every tracked money move after that day is what the bank should show
// now. What the tracked entries up to that day don't explain, once the owner's
// own money is taken out, is "untracked": a forgotten bill, gateway fees, etc.
// The bank balance is for super admins only, on top of the revenue permission.
router.get("/bank", superAdminOnly, async (req, res) => {
  try {
    const check = await BankCheck.findOne().sort({ createdAt: -1 }).lean();
    if (!check) return res.json({ check: null });

    const cut = new Date(dayStart(check.asOf).getTime() + DAY_MS);
    const [till, since] = await Promise.all([
      totalsFor(new Date(0), cut),
      totalsFor(cut, new Date(Date.now() + DAY_MS)),
    ]);

    res.json({
      check: {
        asOf: check.asOf,
        checkedAt: check.createdAt,
        balancePaise: check.balancePaise,
        ownPaise: check.ownPaise,
        trackedPaise: till.netPaise,
        sincePaise: since.netPaise,
        expectedPaise: check.balancePaise + since.netPaise,
        untrackedPaise: check.balancePaise - check.ownPaise - till.netPaise,
      },
    });
  } catch (err) {
    console.error("Bank check error:", err);
    res.status(500).json({ message: "Failed to load the bank balance" });
  }
});

// Every save is a new check, so earlier readings stay as history.
router.post("/bank", superAdminOnly, async (req, res) => {
  const date = String(req.body?.date || "");
  if (!YMD.test(date) || istDay(dayStart(date)) !== date) return res.status(400).json({ message: "Pick the day of the balance" });
  if (date > istDay(new Date())) return res.status(400).json({ message: "The date can't be in the future" });
  const balance = inputPaise(req.body?.balance);
  const own = String(req.body?.own ?? "").trim() === "" ? 0 : inputPaise(req.body.own);
  if (!(balance >= 0 && balance <= MAX_PAISE)) return res.status(400).json({ message: "Enter the balance your bank shows" });
  if (!(own >= 0 && own <= MAX_PAISE)) return res.status(400).json({ message: "Enter your own money, or leave it empty" });

  try {
    const check = await BankCheck.create({ asOf: date, balancePaise: balance, ownPaise: own, createdBy: req.user.id });

    // No amounts here: admins with the logs permission read this, and the
    // balance is for super admins. The BankCheck itself keeps the figures.
    logActivity({
      req,
      action: "revenue.bank_check",
      category: "revenue",
      message: `Updated the bank balance for ${date}`,
      target: { type: "BankCheck", id: check._id, label: date },
      meta: { asOf: date },
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("Save bank check error:", err);
    res.status(500).json({ message: "Failed to save the bank balance" });
  }
});

/* =========================
   SEARCH ENTRIES (across all dates)
========================= */
router.get("/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json({ entries: [], totalCount: 0, skip: 0, limit: 0 });

  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const skip = Math.max(Number(req.query.skip) || 0, 0);

  try {
    // The query is text an admin typed, never a pattern.
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const filter = {
      voidedAt: null,
      $or: [
        { note: regex },
        { orderRef: regex },
        { utr: regex },
        { settlementId: regex },
        { "attachment.name": regex },
        { "attachments.name": regex },
      ],
    };
    // "expense" or "amazon" should mean the type or channel, not every note containing the word.
    const exact = q.toLowerCase();
    if (TYPES.includes(exact)) filter.$or.push({ type: exact });
    if (CHANNELS.includes(exact)) filter.$or.push({ channel: exact });

    const [entries, totalCount] = await Promise.all([
      LedgerEntry.find(filter)
        .sort({ occurredAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email")
        .lean(),
      LedgerEntry.countDocuments(filter),
    ]);

    res.json({
      entries,
      totalCount,
      query: q,
      skip,
      limit,
    });
  } catch (err) {
    console.error("Revenue search error:", err);
    res.status(500).json({ message: "Failed to search entries" });
  }
});

/* =========================
   TIMELINE
========================= */
// ponytail: returns the whole range in one response (a few rows per day);
// add cursor paging if a range ever reaches thousands of rows.
router.get("/timeline", async (req, res) => {
  const range = readRange(req.query);
  if (!range) return res.status(400).json({ message: "Invalid date range" });
  const { start, end } = range;

  try {
    const [entries, websiteDays, amazonDays] = await Promise.all([
      LedgerEntry.find({ voidedAt: null, occurredAt: { $gte: start, $lt: end } })
        .sort({ occurredAt: -1, createdAt: -1 })
        .populate("createdBy", "name email")
        .lean(),
      Order.aggregate([
        { $match: { status: "SUCCESS", createdAt: { $gte: start, $lt: end } } },
        {
          $group: {
            _id: dayOf("$createdAt"),
            paise: { $sum: ORDER_PAISE },
            orders: { $sum: 1 },
            methods: { $push: "$paymentMethod" },
          },
        },
      ]),
      // Amazon order totals per day, from settled reports. Shown for context,
      // never added to totals: the payout is what reaches the bank.
      AmazonSettlement.aggregate([
        // Rows are always posted before their deposit, so this is a safe pre-filter.
        { $match: { depositDate: { $gte: start } } },
        { $unwind: "$rows" },
        { $match: { "rows.bucket": "sales", "rows.postedAt": { $gte: start, $lt: end } } },
        {
          $group: {
            _id: { day: dayOf("$rows.postedAt"), settlementId: "$settlementId" },
            paise: { $sum: "$rows.amountPaise" },
            orders: { $addToSet: "$rows.orderId" },
            depositDate: { $first: "$depositDate" },
          },
        },
        {
          $project: {
            _id: 0,
            day: "$_id.day",
            settlementId: "$_id.settlementId",
            paise: 1,
            orders: { $size: "$orders" },
            depositDate: 1,
          },
        },
      ]),
    ]);

    res.json({
      range: { from: range.from, to: range.to },
      entries,
      websiteDays: websiteDays.map(({ _id, methods, ...day }) => {
        const counts = {};
        for (const m of methods) counts[m || "Other"] = (counts[m || "Other"] || 0) + 1;
        return {
          ...day,
          day: _id,
          methods: Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([m, n]) => `${m} ${n}`)
            .join(", "),
        };
      }),
      amazonDays,
    });
  } catch (err) {
    console.error("Revenue timeline error:", err);
    res.status(500).json({ message: "Failed to load the timeline" });
  }
});

/* =========================
   READ A RECEIPT (pre-fills the manual entry form, saves nothing)
========================= */
router.post("/receipts/read", receiptUpload("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Choose a receipt to read" });

  try {
    const found = await readReceipt(req.file);

    // The file went to an outside AI service, so keep a record of who sent what.
    logActivity({
      req,
      action: "revenue.receipt_read",
      category: "revenue",
      message: `Sent ${req.file.originalname} to the receipt reader`,
      meta: { fileName: req.file.originalname, type: found.type, confidence: found.confidence },
    });

    res.json(found);
  } catch (err) {
    if (err instanceof ReceiptReadError) return res.status(err.status).json({ message: err.message });
    console.error("Receipt read error:", err.message);
    res.status(500).json({ message: "Couldn't read the receipt" });
  }
});

/* =========================
   MANUAL ENTRIES
========================= */
router.post("/entries", receiptUpload("attachments", MAX_DOCS), async (req, res) => {
  const { error, fields } = readEntry(req.body, req.body.type);
  if (error) return res.status(400).json({ message: error });

  try {
    // A likely duplicate goes in only when the admin confirms it's a different payment.
    const dup = await duplicateOf(fields);
    if (dup && !(dup.possible && req.body.confirmDuplicate === "1")) {
      return res.status(409).json({ message: dup.message, possibleDuplicate: !!dup.possible });
    }

    let attachments;
    try {
      attachments = await Promise.all((req.files || []).map(saveReceipt));
    } catch (err) {
      return res.status(502).json({ message: "Couldn't upload the documents. Try again, or save without them." });
    }

    const entry = await LedgerEntry.create({ ...fields, source: "manual", attachments, createdBy: req.user.id });

    logActivity({
      req,
      action: "revenue.entry_create",
      category: "revenue",
      message: `Added ${fields.type} of ${rupees(Math.abs(fields.amountPaise))} dated ${req.body.date}`,
      target: { type: "LedgerEntry", id: entry._id, label: fields.note || fields.settlementId || fields.type },
      meta: loggable(entry),
    });

    res.status(201).json(entry);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: `Settlement ${fields.settlementId} is already on the timeline` });
    console.error("Create ledger entry error:", err);
    res.status(500).json({ message: "Failed to save the entry" });
  }
});

router.patch("/entries/:id", receiptUpload("attachments", MAX_DOCS), async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Entry not found" });

  try {
    const entry = await LedgerEntry.findById(req.params.id);
    if (!entry || entry.voidedAt) return res.status(404).json({ message: "Entry not found" });
    if (entry.source !== "manual") {
      return res.status(400).json({ message: "Imported payouts can't be edited. Upload the corrected report instead." });
    }

    const { error, fields } = readEntry(req.body, entry.type);
    if (error) return res.status(400).json({ message: error });

    // Edits are only held to the outright blocks: warning again on every edit of
    // an entry already confirmed as a different payment would just be noise.
    const dup = await duplicateOf(fields, entry._id);
    if (dup && !dup.possible) return res.status(409).json({ message: dup.message });

    // The form sends back the URLs of the documents it kept; the rest are unlinked
    // (the files stay in Cloudinary). Only documents already on this entry can be kept.
    const keep = new Set([].concat(req.body.keep || []));
    const kept = [...(entry.attachment?.url ? [entry.attachment] : []), ...entry.attachments]
      .filter((d) => keep.has(d.url))
      .map(({ url, name }) => ({ url, name }));
    const files = req.files || [];
    if (kept.length + files.length > MAX_DOCS) {
      return res.status(400).json({ message: `An entry can hold up to ${MAX_DOCS} documents` });
    }

    let added;
    try {
      added = await Promise.all(files.map(saveReceipt));
    } catch (err) {
      return res.status(502).json({ message: "Couldn't upload the documents. Try again, or save without new ones." });
    }

    const before = loggable(entry);
    entry.set({ ...fields, attachment: undefined, attachments: [...kept, ...added] });
    await entry.save();

    logActivity({
      req,
      action: "revenue.entry_update",
      category: "revenue",
      message: `Edited ${entry.type} dated ${before.date}`,
      target: { type: "LedgerEntry", id: entry._id, label: entry.note || entry.settlementId || entry.type },
      meta: { before, after: loggable(entry) },
    });

    res.json(entry);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "That settlement is already on the timeline" });
    console.error("Update ledger entry error:", err);
    res.status(500).json({ message: "Failed to update the entry" });
  }
});

router.post("/entries/:id/void", async (req, res) => {
  const reason = String(req.body?.reason || "").trim();
  if (reason.length < 3) return res.status(400).json({ message: "Say why this entry is being voided" });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Entry not found" });

  try {
    const entry = await LedgerEntry.findById(req.params.id);
    if (!entry || entry.voidedAt) return res.status(404).json({ message: "Entry not found" });
    if (entry.source !== "manual") return res.status(400).json({ message: "Imported payouts can't be voided" });

    entry.voidedAt = new Date();
    entry.voidedBy = req.user.id;
    entry.voidReason = reason.slice(0, 300);
    entry.dedupeKey = undefined; // frees the settlement ID to be entered again
    await entry.save();

    logActivity({
      req,
      action: "revenue.entry_void",
      category: "revenue",
      message: `Voided ${entry.type} of ${rupees(Math.abs(entry.amountPaise))} dated ${istDay(entry.occurredAt)}`,
      target: { type: "LedgerEntry", id: entry._id, label: entry.note || entry.settlementId || entry.type },
      meta: { ...loggable(entry), reason: entry.voidReason },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Void ledger entry error:", err);
    res.status(500).json({ message: "Failed to void the entry" });
  }
});

/* =========================
   AMAZON SETTLEMENT REPORTS
========================= */
// ?dryRun=1 reads and checks the file and saves nothing (the review screen).
// Without it the same file is imported. Importing a settlement twice replaces it.
router.post("/amazon/import", reportUpload("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Choose the settlement report file" });

  let report;
  try {
    report = parseSettlementReport(req.file.buffer.toString("utf8"));
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
  if (report.currency && report.currency !== "INR") {
    return res.status(400).json({ message: `This settlement is in ${report.currency}. Only Amazon.in (INR) settlements are supported.` });
  }
  if (!report.depositDate) return res.status(400).json({ message: "The report has no deposit date" });

  try {
    const dedupeKey = `amz:settlement:${report.settlementId}`;
    const [existing, ledger] = await Promise.all([
      AmazonSettlement.findOne({ settlementId: report.settlementId }).select("importedAt").lean(),
      LedgerEntry.findOne({ dedupeKey }).select("source").lean(),
    ]);

    const { rows, ...summary } = report;
    const preview = {
      ...summary,
      fileName: req.file.originalname,
      rowCount: rows.length,
      sampleRows: rows.slice(0, 6),
      alreadyImportedAt: existing?.importedAt || null,
      replacesManual: ledger?.source === "manual",
    };
    if (req.query.dryRun === "1") return res.json(preview);

    if (!report.matches) {
      return res.status(422).json({
        message: `Rows add up to ${rupees(report.netPaise)} but Amazon's total is ${rupees(report.fileTotalPaise)}. Nothing was imported.`,
      });
    }

    // Same helper the daily sync uses, so an uploaded file and a synced report
    // end up identical: re-importing replaces, a hand-typed payout is upgraded.
    await storeSettlement(report, { fileName: req.file.originalname, userId: req.user.id });

    logActivity({
      req,
      action: "revenue.amazon_import",
      category: "revenue",
      message: `Imported Amazon settlement ${report.settlementId}: ${rupees(report.netPaise)} deposited ${istDay(report.depositDate)}`,
      target: { type: "AmazonSettlement", id: report.settlementId, label: req.file.originalname },
      meta: {
        rows: rows.length,
        netPaise: report.netPaise,
        reimported: !!existing,
        upgradedManualEntry: ledger?.source === "manual",
      },
    });

    res.json({ ...preview, imported: true });
  } catch (err) {
    console.error("Amazon import error:", err);
    res.status(500).json({ message: "Failed to import the report" });
  }
});

/* =========================
   AMAZON AUTO-SYNC (SP-API)
========================= */
router.get("/amazon/status", async (req, res) => {
  try {
    res.json(await getSyncStatus());
  } catch (err) {
    console.error("Amazon sync status error:", err);
    res.status(500).json({ message: "Failed to read the sync status" });
  }
});

// Runs the pull the daily job would run, right now.
router.post("/amazon/sync", async (req, res) => {
  try {
    const result = await syncSettlements({ trigger: "manual", actor: req.user.id, req });
    if (!result.configured) {
      return res.status(503).json({
        message: "Amazon auto-sync isn't set up yet. Add the Amazon keys to the backend settings.",
      });
    }
    res.json({ ...result, status: await getSyncStatus() });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error("Amazon sync error:", err);
    res.status(500).json({ message: "Amazon sync failed" });
  }
});

router.get("/amazon/settlements", async (req, res) => {
  const range = readRange(req.query);
  if (!range) return res.status(400).json({ message: "Invalid date range" });

  try {
    const payouts = await LedgerEntry.find({
      voidedAt: null,
      type: "payout",
      occurredAt: { $gte: range.start, $lt: range.end },
    })
      .sort({ occurredAt: -1 })
      .populate("createdBy", "name email")
      .lean();

    const settlements = await AmazonSettlement.find({ settlementId: { $in: payouts.map((p) => p.settlementId) } })
      .select("-rows")
      .populate("importedBy", "name email")
      .lean();
    const byId = new Map(settlements.map((s) => [s.settlementId, s]));

    res.json(payouts.map((p) => ({ ...p, settlement: byId.get(p.settlementId) || null })));
  } catch (err) {
    console.error("Amazon settlements error:", err);
    res.status(500).json({ message: "Failed to load settlements" });
  }
});

router.get("/amazon/settlements/:settlementId", async (req, res) => {
  try {
    const settlement = await AmazonSettlement.findOne({ settlementId: String(req.params.settlementId) }).lean();
    if (!settlement) return res.status(404).json({ message: "Settlement not found" });

    const { rows, ...rest } = settlement;
    const group = (bucket) => {
      const sums = new Map();
      for (const r of rows) {
        if (r.bucket !== bucket) continue;
        const label = r.amountDescription || r.amountType || "Other";
        sums.set(label, (sums.get(label) || 0) + r.amountPaise);
      }
      return [...sums]
        .map(([label, paise]) => ({ label, paise }))
        .sort((a, b) => Math.abs(b.paise) - Math.abs(a.paise));
    };

    res.json({
      ...rest,
      rowCount: rows.length,
      sales: group("sales"),
      fees: group("fees"),
      refundOrders: new Set(rows.filter((r) => r.bucket === "refunds" && r.orderId).map((r) => r.orderId)).size,
    });
  } catch (err) {
    console.error("Amazon settlement detail error:", err);
    res.status(500).json({ message: "Failed to load the settlement" });
  }
});

/* 📊 DAY-WISE REVENUE */
router.get("/daily", auth, adminOnly, async (req, res) => {
  try {
    const revenue = await Order.aggregate([
      {
        // only successful payments count as revenue
        $match: { status: "SUCCESS" },
      },
      {
        // group by DATE (YYYY-MM-DD)
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "Asia/Kolkata"
            },
          },
          totalRevenue: { $sum: "$amount" },
          ordersCount: { $sum: 1 },
        },
      },
      {
        // newest day first
        $sort: { _id: -1 },
      },
    ]);

    res.json(revenue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch revenue" });
  }
});

module.exports = router;

// server.js serves these same totals to AYUS ops on a read-only token route.
module.exports.totalsFor = totalsFor;
module.exports.readRange = readRange;
module.exports.judgeDuplicate = judgeDuplicate; // for adminRevenue.test.js
