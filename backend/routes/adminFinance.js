const express = require("express");
const router = express.Router();
const FinanceTransaction = require("../models/FinanceTransaction");

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400000;

const dayStart = (ymd) => new Date(`${ymd}T00:00:00.000Z`);
const istDay = (d) => {
  const ist = new Date(d.getTime() + 19800000);
  return ist.toISOString().slice(0, 10);
};

const readRange = (query) => {
  const to = YMD.test(query.to || "") ? query.to : istDay(new Date());
  const from = YMD.test(query.from || "") ? query.from : `${to.slice(0, 7)}-01`;
  const start = dayStart(from);
  const end = new Date(dayStart(to).getTime() + DAY_MS);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return null;
  return { from, to, start, end };
};

/* ==========================================================================
   GET /summary — P&L & Category Aggregation for selected date range
========================================================================== */
router.get("/summary", async (req, res) => {
  const range = readRange(req.query);
  if (!range) return res.status(400).json({ message: "Invalid date range" });
  const { start, end } = range;

  try {
    const [periodTotals, allTimeTotals, categoryGroups, monthlyTrend] = await Promise.all([
      // Totals for selected date range
      FinanceTransaction.aggregate([
        { $match: { occurredAt: { $gte: start, $lt: end } } },
        {
          $group: {
            _id: "$type",
            totalPaise: { $sum: "$amountPaise" },
            count: { $sum: 1 },
          },
        },
      ]),
      // All-time totals to calculate running cash balance
      FinanceTransaction.aggregate([
        {
          $group: {
            _id: "$type",
            totalPaise: { $sum: "$amountPaise" },
            count: { $sum: 1 },
          },
        },
      ]),
      // Category-wise breakdown for selected range (for expenses & income)
      FinanceTransaction.aggregate([
        { $match: { occurredAt: { $gte: start, $lt: end }, type: "expense" } },
        {
          $group: {
            _id: "$category",
            totalPaise: { $sum: "$amountPaise" },
            count: { $sum: 1 },
          },
        },
        { $sort: { totalPaise: -1 } },
      ]),
      // Monthly trend for past 6 months
      FinanceTransaction.aggregate([
        {
          $match: {
            occurredAt: {
              $gte: new Date(Date.now() - 180 * DAY_MS),
            },
          },
        },
        {
          $group: {
            _id: {
              month: { $dateToString: { format: "%Y-%m", date: "$occurredAt" } },
              type: "$type",
            },
            totalPaise: { $sum: "$amountPaise" },
          },
        },
        { $sort: { "_id.month": 1 } },
      ]),
    ]);

    const periodBy = Object.fromEntries(periodTotals.map((t) => [t._id, t.totalPaise]));
    const allTimeBy = Object.fromEntries(allTimeTotals.map((t) => [t._id, t.totalPaise]));

    const periodIncome = periodBy.income || 0;
    const periodExpense = periodBy.expense || 0;
    const periodCapital = periodBy.capital || 0;
    const periodTransfer = periodBy.transfer || 0;
    const periodProfit = periodIncome - periodExpense;

    const allTimeIncome = allTimeBy.income || 0;
    const allTimeExpense = allTimeBy.expense || 0;
    const allTimeCapital = allTimeBy.capital || 0;
    const allTimeTransfer = allTimeBy.transfer || 0;
    const currentCashBalance = allTimeCapital + allTimeIncome - (allTimeExpense + allTimeTransfer);

    // Format monthly trend
    const trendMap = {};
    monthlyTrend.forEach(({ _id, totalPaise }) => {
      const { month, type } = _id;
      if (!trendMap[month]) trendMap[month] = { month, income: 0, expense: 0, profit: 0 };
      if (type === "income") trendMap[month].income += totalPaise;
      if (type === "expense") trendMap[month].expense += totalPaise;
      trendMap[month].profit = trendMap[month].income - trendMap[month].expense;
    });

    res.json({
      range: { from: range.from, to: range.to },
      period: {
        incomePaise: periodIncome,
        expensePaise: periodExpense,
        capitalPaise: periodCapital,
        transferPaise: periodTransfer,
        netProfitPaise: periodProfit,
        profitMarginPct: periodIncome > 0 ? ((periodProfit / periodIncome) * 100).toFixed(1) : "0.0",
      },
      cashBalancePaise: currentCashBalance,
      categories: categoryGroups.map((g) => ({
        category: g._id,
        totalPaise: g.totalPaise,
        count: g.count,
        percentOfExpense: periodExpense > 0 ? ((g.totalPaise / periodExpense) * 100).toFixed(1) : "0.0",
      })),
      monthlyTrend: Object.values(trendMap),
    });
  } catch (err) {
    console.error("Finance summary error:", err);
    res.status(500).json({ message: "Failed to calculate finance summary" });
  }
});

/* ==========================================================================
   GET /transactions — Filterable ledger list
========================================================================== */
router.get("/transactions", async (req, res) => {
  try {
    const { from, to, type, category, search, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (from || to) {
      filter.occurredAt = {};
      if (from && YMD.test(from)) filter.occurredAt.$gte = dayStart(from);
      if (to && YMD.test(to)) filter.occurredAt.$lt = new Date(dayStart(to).getTime() + DAY_MS);
    }

    if (type && type !== "all") filter.type = type;
    if (category && category !== "all") filter.category = category;

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { note: { $regex: q, $options: "i" } },
        { utr: { $regex: q, $options: "i" } },
      ];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const [transactions, totalCount] = await Promise.all([
      FinanceTransaction.find(filter)
        .sort({ occurredAt: -1, _id: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("createdBy", "name email")
        .lean(),
      FinanceTransaction.countDocuments(filter),
    ]);

    res.json({
      transactions,
      totalCount,
      page: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit)) || 1,
    });
  } catch (err) {
    console.error("Finance list error:", err);
    res.status(500).json({ message: "Failed to load transactions" });
  }
});

/* ==========================================================================
   POST /transactions — Add single transaction
========================================================================== */
router.post("/transactions", async (req, res) => {
  try {
    const { type, category, amount, date, title, note, utr, paymentMode, source = "manual" } = req.body;

    if (!type || !["income", "expense", "capital", "transfer"].includes(type)) {
      return res.status(400).json({ message: "Valid transaction type is required" });
    }
    const numAmount = Number(String(amount).replace(/[₹,\s]/g, ""));
    if (Number.isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: "Enter a valid positive amount" });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title / Description is required" });
    }
    const occurredAt = date && YMD.test(date) ? dayStart(date) : new Date();

    const transaction = await FinanceTransaction.create({
      type,
      category: category || "miscellaneous",
      amountPaise: Math.round(numAmount * 100),
      occurredAt,
      title: title.trim(),
      note: note ? note.trim() : "",
      utr: utr ? utr.trim() : null,
      paymentMode: paymentMode || "upi",
      source,
      createdBy: req.user?.id || req.user?._id || null,
    });

    res.status(201).json({ message: "Transaction added successfully", transaction });
  } catch (err) {
    console.error("Finance add error:", err);
    res.status(500).json({ message: "Failed to save transaction" });
  }
});

/* ==========================================================================
   POST /transactions/bulk — Bulk import transactions (e.g. from CSV / plan)
========================================================================== */
router.post("/transactions/bulk", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: "No transaction items provided" });
    }

    const docs = items.map((i) => {
      const numAmount = Number(String(i.amount).replace(/[₹,\s]/g, ""));
      return {
        type: i.type || "expense",
        category: i.category || "miscellaneous",
        amountPaise: Math.round(Math.abs(numAmount) * 100),
        occurredAt: i.date && YMD.test(i.date) ? dayStart(i.date) : new Date(),
        title: (i.title || i.description || "Transaction").trim(),
        note: (i.note || "").trim(),
        utr: i.utr ? String(i.utr).trim() : null,
        paymentMode: i.paymentMode || "upi",
        source: "statement_import",
        createdBy: req.user?.id || req.user?._id || null,
      };
    });

    const result = await FinanceTransaction.insertMany(docs);
    res.status(201).json({ message: `Successfully imported ${result.length} transactions`, count: result.length });
  } catch (err) {
    console.error("Finance bulk import error:", err);
    res.status(500).json({ message: "Failed to bulk import transactions" });
  }
});

/* ==========================================================================
   PATCH /transactions/:id — Edit transaction
========================================================================== */
router.patch("/transactions/:id", async (req, res) => {
  try {
    const { type, category, amount, date, title, note, utr, paymentMode } = req.body;
    const updates = {};

    if (type) updates.type = type;
    if (category) updates.category = category;
    if (amount != null) {
      const numAmount = Number(String(amount).replace(/[₹,\s]/g, ""));
      if (!Number.isNaN(numAmount) && numAmount > 0) updates.amountPaise = Math.round(numAmount * 100);
    }
    if (date && YMD.test(date)) updates.occurredAt = dayStart(date);
    if (title != null) updates.title = title.trim();
    if (note != null) updates.note = note.trim();
    if (utr !== undefined) updates.utr = utr ? utr.trim() : null;
    if (paymentMode) updates.paymentMode = paymentMode;

    const updated = await FinanceTransaction.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updated) return res.status(404).json({ message: "Transaction not found" });

    res.json({ message: "Transaction updated", transaction: updated });
  } catch (err) {
    console.error("Finance update error:", err);
    res.status(500).json({ message: "Failed to update transaction" });
  }
});

/* ==========================================================================
   DELETE /transactions/:id — Delete transaction
========================================================================== */
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
