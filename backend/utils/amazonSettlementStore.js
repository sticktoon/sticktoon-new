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

  return {
    alreadyImportedAt: existing?.importedAt || null,
    replacedManualEntry: payout?.source === "manual",
  };
}

module.exports = { storeSettlement, istDay, dayStart };
