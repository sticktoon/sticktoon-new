// Daily Amazon settlement sync: new settlement reports reach the revenue
// timeline without anyone downloading a file. Checked hourly rather than
// scheduled once, so a restart cannot skip a day - same shape as weeklyBackup.js.
const Setting = require("../models/Setting");
const AmazonSettlement = require("../models/AmazonSettlement");
const { parseSettlementReport } = require("../utils/amazonSettlement");
const { storeSettlement, istDay } = require("../utils/amazonSettlementStore");
const { spApiConfigured, listSettlementReports, downloadReport } = require("../utils/amazonSpApi");
const { logActivity } = require("../utils/activityLogger");

const STATE_KEY = "amazon_settlement_sync";
const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const RUN_HOUR_IST = 7;
// How far back the very first sync looks. Older settlements can still be uploaded by hand.
const FIRST_RUN_DAYS = 90;

// Render runs on UTC. IST is a fixed +5:30 with no DST, so shifting the
// timestamp lets the plain getUTC* readers report IST wall-clock time.
const nowIst = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000);

const readState = async () => (await Setting.findOne({ key: STATE_KEY }).lean())?.value || {};
const writeState = (value) => Setting.findOneAndUpdate({ key: STATE_KEY }, { value }, { upsert: true });

async function getSyncStatus() {
  const state = await readState();
  return {
    configured: spApiConfigured(),
    lastRunAt: state.lastRunAt || null,
    lastOkAt: state.lastOkAt || null,
    lastError: state.lastError || null,
    lastImported: state.lastImported || 0,
    runsDailyAtIst: `${String(RUN_HOUR_IST).padStart(2, "0")}:00`,
  };
}

/**
 * Pulls every settlement report Amazon has generated since the last sync and
 * stores it the same way an uploaded file would be, so a settlement is never
 * counted twice however it arrived.
 */
async function syncSettlements({ trigger = "schedule", actor = null, req = null } = {}) {
  if (!spApiConfigured()) return { configured: false, imported: [], updated: [], failed: [] };

  const state = await readState();
  const createdSince = state.lastReportAt ? new Date(state.lastReportAt) : new Date(Date.now() - FIRST_RUN_DAYS * 86400000);

  const imported = [];
  const updated = [];
  const failed = [];
  let newestReportAt = state.lastReportAt || null;

  const reports = await listSettlementReports({ createdSince });

  for (const report of reports) {
    if (!report.reportDocumentId) continue;
    try {
      const parsed = parseSettlementReport(await downloadReport(report.reportDocumentId));

      if (parsed.currency && parsed.currency !== "INR") {
        failed.push({ reportId: report.reportId, reason: `settlement is in ${parsed.currency}` });
        continue;
      }
      if (!parsed.matches) {
        failed.push({ settlementId: parsed.settlementId, reason: "rows don't add up to Amazon's total" });
        continue;
      }
      if (!parsed.depositDate) {
        failed.push({ settlementId: parsed.settlementId, reason: "no deposit date in the report" });
        continue;
      }

      const seen = await AmazonSettlement.findOne({ settlementId: parsed.settlementId }).select("_id").lean();
      await storeSettlement(parsed, {
        source: "amazon_api",
        fileName: `Amazon report ${report.reportId}`,
        userId: actor,
      });

      const summary = {
        settlementId: parsed.settlementId,
        netPaise: parsed.netPaise,
        depositDate: istDay(parsed.depositDate),
      };
      (seen ? updated : imported).push(summary);
    } catch (err) {
      failed.push({ reportId: report.reportId, reason: err.message });
    }

    // Only move the watermark past reports that were handled.
    if (report.createdTime && (!newestReportAt || report.createdTime > newestReportAt)) {
      newestReportAt = report.createdTime;
    }
  }

  const ranAt = new Date();
  await writeState({
    ...state,
    lastRunAt: ranAt,
    lastOkAt: failed.length ? state.lastOkAt || null : ranAt,
    lastError: failed.length ? failed[0].reason : null,
    lastReportAt: newestReportAt,
    lastImported: imported.length,
    lastDay: istDay(ranAt),
  });

  logActivity({
    req,
    actor: req ? undefined : { email: "amazon sync", role: "system" },
    action: "revenue.amazon_sync",
    category: "revenue",
    status: failed.length ? "failure" : "success",
    message: `Amazon sync (${trigger}): ${imported.length} new, ${updated.length} refreshed, ${failed.length} skipped`,
    meta: { imported, updated, failed },
  });

  return { configured: true, imported, updated, failed, ranAt };
}

const runIfDue = async () => {
  if (!spApiConfigured()) return;
  const ist = nowIst();
  if (ist.getUTCHours() < RUN_HOUR_IST) return;

  const today = ist.toISOString().slice(0, 10);
  const state = await readState();
  if (state.lastDay === today) return;

  // Claim the day before the pull, so a crash mid-sync doesn't loop on restart.
  // ponytail: single-instance dedupe, like weeklyBackup. Needs a real lock only
  // if the backend ever scales out.
  await writeState({ ...state, lastDay: today });
  const result = await syncSettlements({ trigger: "schedule" });
  if (result.imported.length) {
    console.log(`✅ Amazon sync: ${result.imported.length} new settlement(s)`);
  }
};

const startAmazonSync = () => {
  if (!spApiConfigured()) {
    console.log("ℹ️  Amazon settlement sync is off (no Amazon keys set)");
    return;
  }
  const tick = () => runIfDue().catch((err) => console.error("Amazon sync error:", err.message));
  tick(); // Catches a day where the server was asleep at 7am.
  setInterval(tick, CHECK_INTERVAL_MS);
  console.log(`🔄 Amazon settlement sync active (daily ${RUN_HOUR_IST}:00 IST)`);
};

module.exports = { startAmazonSync, syncSettlements, getSyncStatus };
