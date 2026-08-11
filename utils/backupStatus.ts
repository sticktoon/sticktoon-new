import { API_BASE_URL } from "../config/api";

/**
 * The backup endpoint answers before the backup is built - it has to, or Render's
 * 30s proxy kills the request - so "Backup is generating" is all the POST can
 * honestly say. The server records how the run actually ended; this polls for it
 * so a delivery failure reaches the admin instead of dying in the server log.
 */

type BackupOutcome = { text: string; ok: boolean };

const POLL_MS = 5000;
const MAX_WAIT_MS = 3 * 60 * 1000;
// The stamp comes from the server's clock, so leave room for it to disagree
// with the browser's rather than mistake a fresh result for a stale one.
const CLOCK_SKEW_MS = 30 * 1000;

const describe = (last: any): BackupOutcome => {
  if (last.ok) {
    const to = (last.recipients || []).join(", ");
    const missed = (last.failed || []).length;
    return {
      ok: true,
      text: missed
        ? `Backup emailed to ${to}, but ${missed} recipient(s) failed.`
        : `Backup emailed to ${to}.`,
    };
  }

  const error = typeof last.error === "string" ? last.error : JSON.stringify(last.error);
  return { ok: false, text: `Backup failed: ${error || "unknown error"}` };
};

export const waitForBackupOutcome = async (
  token: string | null,
  startedAt: number
): Promise<BackupOutcome | null> => {
  const deadline = startedAt + MAX_WAIT_MS;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));

    const data = await fetch(`${API_BASE_URL}/api/admin/backup/recipients`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);

    const last = data?.last;
    if (!last?.at) continue;
    // Anything stamped before this run is the previous backup's result.
    if (new Date(last.at).getTime() < startedAt - CLOCK_SKEW_MS) continue;

    return describe(last);
  }

  return {
    ok: false,
    text: "Backup is taking longer than expected. Check the admin inbox before retrying.",
  };
};
