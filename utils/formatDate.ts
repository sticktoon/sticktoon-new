/**
 * Date formatting helpers.
 *
 * Every date shown in the app is day-first (DD/MM/YYYY), never the US
 * month-first order. `toLocaleDateString()` with no locale follows the
 * *viewer's* browser locale, so a US visitor would see 07/09/2026 for
 * 9 July 2026. Always go through these helpers instead.
 */

const LOCALE = "en-GB"; // day-month-year

type DateInput = string | number | Date | null | undefined;

const toDate = (value: DateInput): Date | null => {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** 09/07/2026 */
export const formatDate = (value: DateInput, fallback = "—"): string => {
  const d = toDate(value);
  if (!d) return fallback;
  return d.toLocaleDateString(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/** 09 Jul 2026 */
export const formatDateLong = (value: DateInput, fallback = "—"): string => {
  const d = toDate(value);
  if (!d) return fallback;
  return d.toLocaleDateString(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/** 09/07/2026, 14:32 */
export const formatDateTime = (value: DateInput, fallback = "—"): string => {
  const d = toDate(value);
  if (!d) return fallback;
  return `${formatDate(d)}, ${d.toLocaleTimeString(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

/** 09 Jul */
export const formatDayMonth = (value: DateInput, fallback = "—"): string => {
  const d = toDate(value);
  if (!d) return fallback;
  return d.toLocaleDateString(LOCALE, { day: "2-digit", month: "short" });
};

/** 2026-07-09 — for <input type="date"> and query params. */
export const toDateInputValue = (value: DateInput): string => {
  const d = toDate(value);
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
