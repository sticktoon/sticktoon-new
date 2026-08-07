// Weekly data backup: every Sunday 9am IST the CSV dump goes to admin email.
// Checked hourly instead of scheduled once, so a server restart cannot skip a week.
const Setting = require("../models/Setting");
const { sendBackup } = require("../utils/backupCsv");

const KEY = "last_weekly_backup";
const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const SEND_HOUR_IST = 9;

// Render runs on UTC. IST is a fixed +5:30 with no DST, so shifting the
// timestamp lets the plain getUTC* readers report IST wall-clock time.
const nowIst = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000);

const runIfDue = async () => {
  const ist = nowIst();
  if (ist.getUTCDay() !== 0) return; // 0 = Sunday
  if (ist.getUTCHours() < SEND_HOUR_IST) return;

  const today = ist.toISOString().slice(0, 10);
  const last = await Setting.findOne({ key: KEY }).lean();
  if (last?.value === today) return;

  // Claim the slot before sending: a crash mid-send must not re-mail on restart.
  // ponytail: single-instance dedupe. Needs a real lock only if backend scales out.
  await Setting.findOneAndUpdate({ key: KEY }, { value: today }, { upsert: true });

  const result = await sendBackup({ trigger: "weekly" });

  if (!result.ok) {
    console.error("❌ Weekly backup failed:", result.error);
    // Release the claim so the next hourly check retries.
    await Setting.findOneAndUpdate({ key: KEY }, { value: `failed-${today}` });
    return;
  }

  console.log(`✅ Weekly backup sent to ${result.recipients.join(", ")}`);
};

const startWeeklyBackup = () => {
  const tick = () => runIfDue().catch((err) => console.error("Weekly backup error:", err.message));
  tick(); // Catches a Sunday where the server was asleep at 9am.
  setInterval(tick, CHECK_INTERVAL_MS);
  console.log("🗓️  Weekly backup scheduler active (Sundays 9:00 IST)");
};

module.exports = { startWeeklyBackup };
