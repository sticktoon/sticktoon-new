const express = require("express");
const router = express.Router();
const FinanceTransaction = require("../models/FinanceTransaction");

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400000;
const TYPES = ["income", "expense", "capital", "transfer"];
const LEDGERS = ["business", "personal"];

const dayStart = (ymd) => new Date(`${ymd}T00:00:00.000Z`);
const istDay = (d) => new Date(d.getTime() + 19800000).toISOString().slice(0, 10);

const readRange = (query) => {
  const to = YMD.test(query.to || "") ? query.to : istDay(new Date());
  const from = YMD.test(query.from || "") ? query.from : `${to.slice(0, 7)}-01`;
  const start = dayStart(from);
  const end = new Date(dayStart(to).getTime() + DAY_MS);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return null;
  return { from, to, start, end };
};

// Old rows have no `ledger` field: treat them as business.
const ledgerMatch = (ledger) =>
  ledger === "personal" ? { ledger: "personal" } : ledger === "business" ? { ledger: { $ne: "personal" } } : {};

// Accepts amountPaise (page) or amount in rupees (scripts / CSV).
const readAmountPaise = (b) => {
  const paise =
    b.amountPaise != null
      ? Math.round(Number(b.amountPaise))
      : Math.round(Number(String(b.amount ?? "").replace(/[₹,\s]/g, "")) * 100);
  return Number.isFinite(paise) && paise > 0 ? paise : null;
};

// Accepts date (YYYY-MM-DD) or occurredAt (ISO).
const readDate = (b) => {
  if (YMD.test(b.date || "")) return dayStart(b.date);
  if (!b.occurredAt) return null;
  const d = new Date(b.occurredAt);
  return Number.isNaN(d.getTime()) ? null : d;
};

const toDoc = (b, req) => {
  const amountPaise = readAmountPaise(b);
  if (!TYPES.includes(b.type)) return { error: "Valid transaction type is required" };
  if (!amountPaise) return { error: "Enter a valid positive amount" };
  const title = String(b.title || b.description || "").trim();
  if (!title) return { error: "Title / Description is required" };
  return {
    doc: {
      ledger: LEDGERS.includes(b.ledger) ? b.ledger : "business",
      type: b.type,
      category: b.category || "miscellaneous",
      amountPaise,
      occurredAt: readDate(b) || new Date(),
      title,
      note: String(b.note || "").trim(),
      utr: b.utr ? String(b.utr).trim() : null,
      paymentMode: b.paymentMode || "upi",
      source: b.source === "statement_import" ? "statement_import" : "manual",
      createdBy: req.user?.id || req.user?._id || null,
    },
  };
};

const sumByType = (rows) => Object.fromEntries(rows.map((t) => [t._id, t.totalPaise]));

/* GET /summary?from&to&ledger — P&L, balance, category split, monthly trend */
router.get("/summary", async (req, res) => {
  const range = readRange(req.query);
  if (!range) return res.status(400).json({ message: "Invalid date range" });
  const { start, end } = range;
  const lm = ledgerMatch(req.query.ledger);
  const groupByType = { $group: { _id: "$type", totalPaise: { $sum: "$amountPaise" } } };

  try {
    const [periodTotals, allTimeTotals, categoryGroups, monthlyTrend] = await Promise.all([
      FinanceTransaction.aggregate([{ $match: { ...lm, occurredAt: { $gte: start, $lt: end } } }, groupByType]),
      FinanceTransaction.aggregate([{ $match: lm }, groupByType]),
      FinanceTransaction.aggregate([
        { $match: { ...lm, occurredAt: { $gte: start, $lt: end }, type: "expense" } },
        { $group: { _id: "$category", totalPaise: { $sum: "$amountPaise" }, count: { $sum: 1 } } },
        { $sort: { totalPaise: -1 } },
      ]),
      FinanceTransaction.aggregate([
        { $match: { ...lm, occurredAt: { $gte: new Date(Date.now() - 180 * DAY_MS) } } },
        {
          $group: {
            _id: { month: { $dateToString: { format: "%Y-%m", date: "$occurredAt" } }, type: "$type" },
            totalPaise: { $sum: "$amountPaise" },
          },
        },
        { $sort: { "_id.month": 1 } },
      ]),
    ]);

    const p = sumByType(periodTotals);
    const a = sumByType(allTimeTotals);
    const income = p.income || 0;
    const expense = p.expense || 0;
    const netProfit = income - expense;

    const trend = {};
    monthlyTrend.forEach(({ _id, totalPaise }) => {
      const m = (trend[_id.month] ||= { month: _id.month, income: 0, expense: 0, capital: 0 });
      if (m[_id.type] != null) m[_id.type] += totalPaise;
    });

    res.json({
      range: { from: range.from, to: range.to },
      pnl: {
        income,
        expense,
        netProfit,
        profitMarginPercent: income > 0 ? (netProfit / income) * 100 : 0,
        capital: p.capital || 0,
        transfer: p.transfer || 0,
      },
      balance: {
        allTimeIncome: a.income || 0,
        allTimeExpense: a.expense || 0,
        allTimeCapital: a.capital || 0,
        cashBalance: (a.capital || 0) + (a.income || 0) - (a.expense || 0) - (a.transfer || 0),
      },
      categoryBreakdown: categoryGroups.map((g) => ({
        category: g._id,
        total: g.totalPaise,
        count: g.count,
        percentage: expense > 0 ? (g.totalPaise / expense) * 100 : 0,
      })),
      monthlyTrend: Object.values(trend),
    });
  } catch (err) {
    console.error("Finance summary error:", err);
    res.status(500).json({ message: "Failed to calculate finance summary" });
  }
});

/* GET /transactions — filterable ledger list */
router.get("/transactions", async (req, res) => {
  try {
    const { from, to, type, category, search, ledger } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 50));
    const filter = { ...ledgerMatch(ledger) };

    if (YMD.test(from || "") || YMD.test(to || "")) {
      filter.occurredAt = {};
      if (YMD.test(from || "")) filter.occurredAt.$gte = dayStart(from);
      if (YMD.test(to || "")) filter.occurredAt.$lt = new Date(dayStart(to).getTime() + DAY_MS);
    }
    if (type && type !== "all") filter.type = type;
    if (category && category !== "all") filter.category = category;
    if (search && search.trim()) {
      const q = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = ["title", "note", "utr"].map((f) => ({ [f]: { $regex: q, $options: "i" } }));
    }

    const [transactions, total] = await Promise.all([
      FinanceTransaction.find(filter)
        .sort({ occurredAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("createdBy", "name email")
        .lean(),
      FinanceTransaction.countDocuments(filter),
    ]);

    res.json({ transactions, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } });
  } catch (err) {
    console.error("Finance list error:", err);
    res.status(500).json({ message: "Failed to load transactions" });
  }
});

/* POST /transactions — add one */
router.post("/transactions", async (req, res) => {
  try {
    const { doc, error } = toDoc(req.body || {}, req);
    if (error) return res.status(400).json({ message: error });
    const transaction = await FinanceTransaction.create(doc);
    res.status(201).json({ message: "Transaction added successfully", transaction });
  } catch (err) {
    console.error("Finance add error:", err);
    res.status(err.name === "ValidationError" ? 400 : 500).json({ message: err.message || "Failed to save transaction" });
  }
});

/* POST /transactions/bulk — import many (all-or-nothing validation) */
router.post("/transactions/bulk", async (req, res) => {
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: "No transaction items provided" });
    }
    const docs = [];
    for (let i = 0; i < items.length; i++) {
      const { doc, error } = toDoc({ type: "expense", ...items[i] }, req);
      if (error) return res.status(400).json({ message: `Row ${i + 1}: ${error}` });
      docs.push(doc);
    }
    const result = await FinanceTransaction.insertMany(docs);
    res.status(201).json({ message: `Successfully imported ${result.length} transactions`, count: result.length });
  } catch (err) {
    console.error("Finance bulk import error:", err);
    res.status(err.name === "ValidationError" ? 400 : 500).json({ message: err.message || "Failed to bulk import transactions" });
  }
});

/* PATCH /transactions/:id — edit */
router.patch("/transactions/:id", async (req, res) => {
  try {
    const b = req.body || {};
    const updates = {};
    if (b.ledger && LEDGERS.includes(b.ledger)) updates.ledger = b.ledger;
    if (b.type && TYPES.includes(b.type)) updates.type = b.type;
    if (b.category) updates.category = b.category;
    if (b.amountPaise != null || b.amount != null) {
      const paise = readAmountPaise(b);
      if (!paise) return res.status(400).json({ message: "Enter a valid positive amount" });
      updates.amountPaise = paise;
    }
    const date = readDate(b);
    if (date) updates.occurredAt = date;
    if (b.title != null) updates.title = String(b.title).trim();
    if (b.note != null) updates.note = String(b.note).trim();
    if (b.utr !== undefined) updates.utr = b.utr ? String(b.utr).trim() : null;
    if (b.paymentMode) updates.paymentMode = b.paymentMode;

    const updated = await FinanceTransaction.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Transaction not found" });
    res.json({ message: "Transaction updated", transaction: updated });
  } catch (err) {
    console.error("Finance update error:", err);
    res.status(err.name === "ValidationError" ? 400 : 500).json({ message: err.message || "Failed to update transaction" });
  }
});

/* DELETE /transactions/:id */
router.delete("/transactions/:id", async (req, res) => {
  try {
    const deleted = await FinanceTransaction.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Transaction not found" });
    res.json({ message: "Transaction deleted" });
  } catch (err) {
    console.error("Finance delete error:", err);
    res.status(500).json({ message: "Failed to delete transaction" });
  }
});

module.exports = router;
