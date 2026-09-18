const AmazonSettlement = require("../models/AmazonSettlement");
const LedgerEntry = require("../models/LedgerEntry");

/**
 * Saves one parsed settlement report and the payout it produced.
 *
 * Shared by the upload route and the daily sync so both behave the same way:
 * importing a settlement again replaces it, and a payout that was typed in by
 * hand is upgraded in place (its note kept) rather than counted twice.
 */
const IST = "Asia/Kolkata";
const istDay = (date) => new Date(date).toLocaleDateString("en-CA", { timeZone: IST });
const dayStart = (ymd) => new Date(`${ymd}T00:00:00+05:30`);

async function storeSettlement(report, { source = "amazon_report", fileName = "", userId = null } = {}) {
  const dedupeKey = `amz:settlement:${report.settlementId}`;
  const [existing, payout] = await Promise.all([
    AmazonSettlement.findOne({ settlementId: report.settlementId }).select("importedAt").lean(),
    LedgerEntry.findOne({ dedupeKey }).select("source").lean(),
  ]);

  await AmazonSettlement.findOneAndUpdate(
    { settlementId: report.settlementId },
    { $set: { ...report, source, fileName, importedBy: userId, importedAt: new Date() } },
    { upsert: true, setDefaultsOnInsert: true }
  );

  await LedgerEntry.findOneAndUpdate(
    { dedupeKey },
    {
      $set: {
        source,
        type: "payout",
        channel: "amazon",
        occurredAt: dayStart(istDay(report.depositDate)),
        amountPaise: report.netPaise,
        breakdown: {
          salesPaise: report.salesPaise,
          feesPaise: report.feesPaise,
          refundsPaise: report.refundsPaise,
        },
        settlementId: report.settlementId,
      },
      $setOnInsert: { createdBy: userId },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  // A real report beats the stand-in the finances API leaves for the same
  // period: same money, different id, and this one has the fee lines.
  const dropped = await dropFinanceStandIn(report.periodEnd, report.settlementId);

  return {
    alreadyImportedAt: existing?.importedAt || null,
    replacedManualEntry: payout?.source === "manual",
    replacedFinanceStandIn: dropped,
  };
}

// Settlement periods line up to the day, but the timestamps inside them don't.
const around = (date, hours = 36) => ({
  $gte: new Date(new Date(date).getTime() - hours * 3600000),
  $lte: new Date(new Date(date).getTime() + hours * 3600000),
});

async function dropFinanceStandIn(periodEnd, keepSettlementId = null) {
  if (!periodEnd) return false;
  const standIns = await AmazonSettlement.find({
    source: "amazon_finances",
    periodEnd: around(periodEnd),
    ...(keepSettlementId ? { settlementId: { $ne: keepSettlementId } } : {}),
  })
    .select("settlementId")
    .lean();

  for (const standIn of standIns) {
    await AmazonSettlement.deleteOne({ settlementId: standIn.settlementId });
    await LedgerEntry.deleteOne({ dedupeKey: `amz:settlement:${standIn.settlementId}` });
  }
  return standIns.length > 0;
}

/**
 * Stores a payout Amazon reports through its finances API, for periods whose
 * report file is no longer downloadable. Only the amount that reached the bank
 * is known - there are no fee lines behind it.
 */
async function storeFinanceGroup(group, { userId = null } = {}) {
  const settlementId = group.FinancialEventGroupId;
  const netPaise = Math.round(Number(group.OriginalTotal?.CurrencyAmount || 0) * 100);
  const depositDate = new Date(group.FundTransferDate);
  const periodEnd = group.FinancialEventGroupEnd ? new Date(group.FinancialEventGroupEnd) : null;

  await AmazonSettlement.findOneAndUpdate(
    { settlementId },
    {
      $set: {
        settlementId,
        currency: group.OriginalTotal?.CurrencyCode || "INR",
        periodStart: group.FinancialEventGroupStart ? new Date(group.FinancialEventGroupStart) : null,
        periodEnd,
        depositDate,
        salesPaise: 0,
        feesPaise: 0,
        refundsPaise: 0,
        netPaise,
        fileTotalPaise: netPaise,
        orderCount: 0,
        rows: [],
        source: "amazon_finances",
        fileName: "",
        importedBy: userId,
        importedAt: new Date(),
      },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  await LedgerEntry.findOneAndUpdate(
    { dedupeKey: `amz:settlement:${settlementId}` },
    {
      $set: {
        source: "amazon_api",
        type: "payout",
        channel: "amazon",
        occurredAt: dayStart(istDay(depositDate)),
        amountPaise: netPaise,
        breakdown: { salesPaise: 0, feesPaise: 0, refundsPaise: 0 },
        settlementId,
      },
      $setOnInsert: { createdBy: userId },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
}

module.exports = { storeSettlement, storeFinanceGroup, dropFinanceStandIn, around, istDay, dayStart };
