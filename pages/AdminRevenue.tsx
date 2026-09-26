import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Globe,
  History,
  IndianRupee,
  Landmark,
  Package,
  Paperclip,
  Pencil,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Undo2,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

/* =========================
   TYPES
========================= */
type EntryType = "payout" | "income" | "expense" | "refund";
type Channel = "amazon" | "website" | "offline" | "other";

type Entry = {
  _id: string;
  source: "manual" | "amazon_report" | "amazon_api";
  type: EntryType;
  channel: Channel;
  occurredAt: string;
  createdAt: string;
  amountPaise: number;
  breakdown?: { salesPaise: number; feesPaise: number; refundsPaise: number };
  settlementId?: string | null;
  orderRef?: string | null;
  utr?: string | null;
  note?: string;
  attachments?: Doc[];
  attachment?: { url?: string; name?: string }; // older entries: one document
  createdBy?: { name?: string; email?: string } | null;
};
type Doc = { url: string; name?: string };

const MAX_DOCS = 5; // same limit as the server
const docsOf = (e?: Entry): Doc[] => [
  ...(e?.attachment?.url ? [{ url: e.attachment.url, name: e.attachment.name }] : []),
  ...(e?.attachments || []),
];

type TimelineData = {
  entries: Entry[];
  websiteDays: { day: string; paise: number; orders: number; methods: string }[];
  amazonDays: { day: string; settlementId: string; paise: number; orders: number; depositDate: string }[];
};

type Totals = {
  websitePaise: number;
  websiteOrders: number;
  amazonSalesPaise: number;
  amazonFeesPaise: number;
  amazonRefundsPaise: number;
  amazonNetPaise: number;
  payouts: number;
  manualInPaise: number;
  manualOutPaise: number;
  netPaise: number;
};

type Summary = {
  current: Totals;
  previous: Totals;
  deductions: { label: string; paise: number }[];
  months: { key: string; websitePaise: number; amazonPaise: number }[];
  sources: {
    lastImport: { settlementId: string; periodEnd?: string; importedAt: string } | null;
    manualCount: number;
    manualBackdated: number;
  };
};

// The newest bank check and what follows from it (GET /bank).
type BankCheck = {
  asOf: string; // IST day; the balance is at its end
  checkedAt: string;
  balancePaise: number;
  ownPaise: number;
  trackedPaise: number; // net of every tracked entry up to asOf
  sincePaise: number; // net of tracked entries after asOf
  expectedPaise: number;
  untrackedPaise: number;
};

// Values a new manual entry starts with, e.g. "Book as miscellaneous".
type Preset = Partial<{ type: EntryType; channel: Channel; date: string; amount: string; note: string }>;

type SettlementMeta = {
  settlementId: string;
  // "amazon_finances" means only the payout total is known: Amazon no longer
  // offers the report file for that period.
  source?: "amazon_report" | "amazon_api" | "amazon_finances";
  periodStart?: string;
  periodEnd?: string;
  depositDate: string;
  orderCount: number;
  fileName?: string;
  importedAt?: string;
  importedBy?: { name?: string; email?: string } | null;
};

type SettlementRow = Entry & { settlement: SettlementMeta | null };

type SettlementDetail = SettlementMeta & {
  salesPaise: number;
  feesPaise: number;
  refundsPaise: number;
  netPaise: number;
  fileTotalPaise: number;
  rowCount: number;
  refundOrders: number;
  sales: { label: string; paise: number }[];
  fees: { label: string; paise: number }[];
};

type ImportPreview = SettlementMeta & {
  currency: string;
  salesPaise: number;
  feesPaise: number;
  refundsPaise: number;
  netPaise: number;
  fileTotalPaise: number;
  matches: boolean;
  rowCount: number;
  alreadyImportedAt: string | null;
  replacesManual: boolean;
  sampleRows: {
    postedAt: string | null;
    transactionType: string;
    orderId: string;
    amountDescription: string;
    amountPaise: number;
  }[];
};

// What the server's receipt reader found. Every value is optional.
type ReceiptFields = {
  type: EntryType | null;
  date: string | null;
  amount: string | null;
  gross: string | null;
  fees: string | null;
  settlementId: string | null;
  orderRef: string | null;
  utr: string | null;
  note: string | null;
  notRupees: boolean;
  confidence: "high" | "medium" | "low";
};

// Daily Amazon settlement pull (services/amazonSync.js).
type SyncStatus = {
  configured: boolean;
  lastRunAt: string | null;
  lastOkAt: string | null;
  lastError: string | null;
  lastImported: number;
  runsDailyAtIst: string;
};

type Range = { from: string; to: string };
type Tab = "overview" | "timeline" | "settlements" | "website";

/* =========================
   HELPERS
========================= */
const TZ = "Asia/Kolkata";
const istDay = (value: string | Date) => new Date(value).toLocaleDateString("en-CA", { timeZone: TZ });
const todayIst = () => istDay(new Date());
const pad = (n: number) => String(n).padStart(2, "0");
const utcDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const shiftDay = (ymd: string, days: number) =>
  new Date(utcDate(ymd).getTime() + days * 86400000).toISOString().slice(0, 10);
const daysBetween = (from: string, to: string) => Math.round((utcDate(to).getTime() - utcDate(from).getTime()) / 86400000);
const fmtDay = (ymd: string, withYear = false) =>
  utcDate(ymd).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
const fmtWeekday = (ymd: string) => utcDate(ymd).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
const fmtMonth = (key: string, style: "long" | "short" = "long") =>
  utcDate(`${key}-01`).toLocaleDateString("en-GB", {
    month: style,
    ...(style === "long" ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });

const rupees = (paise: number, digits = 2) =>
  `₹${(Math.abs(paise) / 100).toLocaleString("en-IN", { maximumFractionDigits: digits })}`;
const signed = (paise: number) => `${paise < 0 ? "−" : "+"}${rupees(paise)}`;
const compact = (paise: number) => {
  const r = Math.abs(paise) / 100;
  if (r >= 1e7) return `${+(r / 1e7).toFixed(2)}Cr`;
  if (r >= 1e5) return `${+(r / 1e5).toFixed(2)}L`;
  if (r >= 1e3) return `${+(r / 1e3).toFixed(1)}k`;
  return String(Math.round(r));
};
// "1,234.50" -> 123450, anything else -> NaN. Mirrors the server check.
const inputPaise = (value: string) => {
  const s = value.replace(/[₹,\s]/g, "");
  return /^\d+(\.\d{1,2})?$/.test(s) ? Math.round(Number(s) * 100) : NaN;
};

const RANGES = [
  { key: "month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "3m", label: "Last 3 months" },
  { key: "fy", label: "This financial year" },
  { key: "last-fy", label: "Last financial year" },
  { key: "all", label: "All time" },
];

function rangeFor(key: string): Range {
  const to = todayIst();
  const [y, m] = to.split("-").map(Number);
  const fy = m >= 4 ? y : y - 1;
  const monthStart = (yy: number, mm: number) => (mm < 1 ? `${yy - 1}-${pad(mm + 12)}-01` : `${yy}-${pad(mm)}-01`);
  switch (key) {
    case "last-month": {
      const [ly, lm] = m === 1 ? [y - 1, 12] : [y, m - 1];
      return { from: monthStart(ly, lm), to: `${ly}-${pad(lm)}-${pad(new Date(Date.UTC(ly, lm, 0)).getUTCDate())}` };
    }
    case "3m":
      return { from: monthStart(y, m - 2), to };
    case "fy":
      return { from: `${fy}-04-01`, to };
    case "last-fy":
      return { from: `${fy - 1}-04-01`, to: `${fy}-03-31` };
    case "all":
      return { from: "2020-01-01", to };
    default:
      return { from: monthStart(y, m), to };
  }
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (typeof init.body === "string") headers["Content-Type"] = "application/json";
  const res = await fetch(`${API_BASE_URL}/api/admin/revenue${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  // The body rides along on the error, e.g. { possibleDuplicate } from a save.
  if (!res.ok) throw Object.assign(new Error(data.message || "Something went wrong"), { data });
  return data as T;
}

function useData<T>(path: string | null, refreshKey: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!path) {
      setData(null);
      return;
    }
    let alive = true;
    setError("");
    api<T>(path)
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [path, refreshKey]);

  return { data, error };
}

const qs = (range: Range) => `?from=${range.from}&to=${range.to}`;

/* =========================
   TIMELINE ITEMS
========================= */
type Item = {
  key: string;
  day: string;
  kind: "entry" | "website" | "amazon";
  amountPaise: number;
  // Amazon order totals are context only; their payout is what counts.
  counted: boolean;
  entry?: Entry;
  orders?: number;
  methods?: string;
  settlementId?: string;
  depositDate?: string;
  enteredAt: string;
};

const KIND_RANK = { entry: 0, website: 1, amazon: 2 };
const byNewest = (a: Item, b: Item) =>
  b.day.localeCompare(a.day) || KIND_RANK[a.kind] - KIND_RANK[b.kind] || b.enteredAt.localeCompare(a.enteredAt);

function buildItems(data: TimelineData): Item[] {
  return [
    ...data.entries.map((e) => ({
      key: e._id,
      day: istDay(e.occurredAt),
      kind: "entry" as const,
      amountPaise: e.amountPaise,
      counted: true,
      entry: e,
      enteredAt: e.createdAt,
    })),
    ...data.websiteDays.map((w) => ({
      key: `web-${w.day}`,
      day: w.day,
      kind: "website" as const,
      amountPaise: w.paise,
      counted: true,
      orders: w.orders,
      methods: w.methods,
      enteredAt: "",
    })),
    ...data.amazonDays.map((a) => ({
      key: `amz-${a.day}-${a.settlementId}`,
      day: a.day,
      kind: "amazon" as const,
      amountPaise: a.paise,
      counted: false,
      orders: a.orders,
      settlementId: a.settlementId,
      depositDate: a.depositDate,
      enteredAt: "",
    })),
  ].sort(byNewest);
}

const TYPE_LABEL: Record<EntryType, string> = {
  payout: "Amazon payout",
  income: "Income",
  expense: "Expense",
  refund: "Refund",
};
const CHANNEL_LABEL: Record<Channel, string> = {
  amazon: "Amazon",
  website: "Website",
  offline: "Offline",
  other: "Other",
};

const CHIP = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap";
const TILE = {
  web: "bg-indigo-50 text-indigo-600",
  amz: "bg-amber-50 text-amber-700",
  man: "bg-slate-100 text-slate-700",
  muted: "bg-slate-50 text-slate-400",
};

type Described = {
  title: string;
  meta: string;
  icon: ReactNode;
  tone: keyof typeof TILE;
  chips: { label: string; className: string; icon?: ReactNode }[];
  backdated: boolean;
};

function describe(item: Item): Described {
  if (item.kind === "website") {
    return {
      title: "Website sales",
      meta: `Razorpay${item.methods ? ` · ${item.methods}` : ""}`,
      icon: <Globe className="w-5 h-5" />,
      tone: "web",
      chips: [{ label: `${item.orders} orders`, className: "bg-indigo-50 text-indigo-600" }],
      backdated: false,
    };
  }
  if (item.kind === "amazon") {
    return {
      title: "Amazon orders",
      meta: `Settled · paid out ${fmtDay(istDay(item.depositDate!))} in settlement ${item.settlementId}`,
      icon: <Package className="w-5 h-5" />,
      tone: "muted",
      chips: [{ label: `${item.orders} orders`, className: "bg-slate-100 text-slate-500" }],
      backdated: false,
    };
  }

  const e = item.entry!;
  const manual = e.source === "manual";
  const backdated = manual && istDay(e.createdAt) > item.day;
  const chips: Described["chips"] = [];
  if (e.type === "payout") chips.push({ label: `Settlement ${e.settlementId}`, className: "bg-amber-50 text-amber-700" });
  if (manual) chips.push({ label: "Manual", className: "bg-slate-100 text-slate-600" });
  if (e.type === "expense" || e.type === "refund") chips.push({ label: TYPE_LABEL[e.type], className: "bg-red-50 text-red-600" });
  if (e.type === "income") chips.push({ label: "Income", className: "bg-green-50 text-green-600" });
  if (backdated) {
    chips.push({
      label: "Backdated",
      className: "bg-white border border-slate-300 text-slate-700",
      icon: <History className="w-3 h-3" />,
    });
  }

  const entered = manual
    ? `entered ${fmtDay(istDay(e.createdAt))}${e.createdBy?.name ? ` by ${e.createdBy.name}` : ""}`
    : "from report upload";

  if (e.type === "payout") {
    const b = e.breakdown || { salesPaise: 0, feesPaise: 0, refundsPaise: 0 };
    return {
      title: "Amazon payout",
      meta: [
        `Gross ${rupees(b.salesPaise)} − deductions ${rupees(b.feesPaise + b.refundsPaise)}`,
        entered,
        e.note,
      ]
        .filter(Boolean)
        .join(" · "),
      icon: <Landmark className="w-5 h-5" />,
      tone: "amz",
      chips,
      backdated,
    };
  }

  return {
    title: e.note || TYPE_LABEL[e.type],
    meta: [CHANNEL_LABEL[e.channel], e.orderRef, e.utr && `UTR ${e.utr}`, entered].filter(Boolean).join(" · "),
    icon: e.type === "refund" ? <Undo2 className="w-5 h-5" /> : <Pencil className="w-5 h-5" />,
    tone: "man",
    chips,
    backdated,
  };
}

// Which source filters an item answers to.
const sourcesOf = (item: Item) => {
  if (item.kind !== "entry") return [item.kind];
  const e = item.entry!;
  const list: string[] = e.source === "manual" ? ["manual"] : [];
  if (e.type === "payout") list.push("amazon");
  return list;
};

/* =========================
   SMALL PIECES
========================= */
const Loading = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm font-medium text-slate-500">Loading…</div>
);
const Failed = ({ message }: { message: string }) => (
  <div className="bg-white rounded-xl border border-red-200 p-6 text-sm font-bold text-red-600">{message}</div>
);

function ItemRow({
  item,
  showDate = false,
  onEdit,
  onVoid,
}: {
  item: Item;
  showDate?: boolean;
  onEdit?: (e: Entry) => void;
  onVoid?: (e: Entry) => void;
}) {
  const d = describe(item);
  const editable = item.entry?.source === "manual" && onEdit && onVoid;
  return (
    <div
      className={`grid ${
        showDate ? "grid-cols-[44px_36px_minmax(0,1fr)_auto]" : "grid-cols-[36px_minmax(0,1fr)_auto]"
      } gap-3 items-center px-4 sm:px-5 py-3 ${d.backdated ? "bg-slate-50" : ""}`}
    >
      {showDate && <span className="text-xs font-bold text-slate-500">{fmtDay(item.day)}</span>}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${TILE[d.tone]}`}>{d.icon}</div>
      <div className="min-w-0">
        <p className={`flex flex-wrap items-center gap-2 text-sm font-bold ${item.counted ? "text-slate-900" : "text-slate-600"}`}>
          <span className="break-words">{d.title}</span>
          {d.chips.map((c) => (
            <span key={c.label} className={`${CHIP} ${c.className}`}>
              {c.icon}
              {c.label}
            </span>
          ))}
        </p>
        <p className="mt-0.5 text-xs text-slate-500 break-words">
          {d.meta}
          {docsOf(item.entry).map((doc, i) => (
            <Fragment key={doc.url}>
              {" · "}
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                title={doc.name}
                className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline"
              >
                <Paperclip className="w-3 h-3" />
                <span className="max-w-[140px] truncate">{doc.name || `Document ${i + 1}`}</span>
              </a>
            </Fragment>
          ))}
        </p>
      </div>
      <div className="text-right">
        <p
          className={`text-[15px] font-black tabular-nums whitespace-nowrap ${
            !item.counted ? "text-slate-400" : item.amountPaise < 0 ? "text-red-600" : "text-green-600"
          }`}
        >
          {item.counted ? signed(item.amountPaise) : rupees(item.amountPaise)}
        </p>
        {!item.counted && <p className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">counted in payout</p>}
        {editable && (
          <div className="mt-1 flex justify-end gap-3 text-xs font-bold">
            <button type="button" onClick={() => onEdit!(item.entry!)} className="hover:underline">
              <span className="text-indigo-600">Edit</span>
            </button>
            <button type="button" onClick={() => onVoid!(item.entry!)} className="hover:underline">
              <span className="text-red-600">Void</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  chip,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
  chip?: { text: string; tone: "up" | "down" | "flat" } | null;
}) {
  const chipTone = { up: "text-green-600 bg-green-50", down: "text-red-600 bg-red-50", flat: "text-gray-600 bg-gray-100" };
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center text-white admin-zoho-keep-white">
          {icon}
        </div>
        {chip && <span className={`text-xs font-bold px-2 py-1 rounded ${chipTone[chip.tone]}`}>{chip.text}</span>}
      </div>
      <p className="text-gray-600 text-xs font-bold uppercase mb-1">{label}</p>
      <p className="text-2xl xl:text-3xl font-black text-gray-900 tabular-nums">{value}</p>
      <p className="text-xs text-gray-500 mt-1 font-medium">{sub}</p>
    </div>
  );
}

/* =========================
   OVERVIEW
========================= */
function MonthChart({ months }: { months: Summary["months"] }) {
  const max = Math.max(0, ...months.flatMap((m) => [m.websitePaise, m.amazonPaise]));
  if (!max) {
    return <p className="py-16 text-center text-sm text-slate-500">No money in yet this financial year.</p>;
  }
  const exp = 10 ** Math.floor(Math.log10(max / 4));
  const f = max / 4 / exp;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
  const top = step * 4;
  const HEIGHT = 200;
  const thisMonth = todayIst().slice(0, 7);
  const bar = (paise: number, color: string, light: string, current: boolean) => ({
    height: Math.max(paise > 0 ? 2 : 0, (paise / top) * HEIGHT),
    background: current ? `repeating-linear-gradient(135deg, ${color} 0 5px, ${light} 5px 8px)` : color,
  });

  return (
    <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-2">
      <div className="relative text-[11px] leading-3 text-slate-400 font-medium text-right" style={{ height: HEIGHT }}>
        {[4, 3, 2, 1, 0].map((i) => (
          <span key={i} className="absolute right-0" style={{ bottom: (i / 4) * HEIGHT - 6 }}>
            {i === 4 ? "₹" : ""}
            {compact(step * i)}
          </span>
        ))}
      </div>
      <div className="relative" style={{ height: HEIGHT }}>
        {[4, 3, 2, 1].map((i) => (
          <div key={i} className="absolute inset-x-0 border-t border-slate-100" style={{ bottom: (i / 4) * HEIGHT }} />
        ))}
        <div className="absolute inset-x-0 bottom-0 border-t border-slate-300" />
        <div className="absolute inset-0 flex items-end">
          {months.map((m) => {
            const current = m.key === thisMonth;
            return (
              <div key={m.key} className="flex-1 flex justify-center items-end gap-0.5">
                <div
                  title={`Website · ${fmtMonth(m.key)}${current ? " so far" : ""}: ${rupees(m.websitePaise, 0)}`}
                  className="w-2.5 sm:w-4 lg:w-5 rounded-t"
                  style={bar(m.websitePaise, "#4f46e5", "#a5b4fc", current)}
                />
                <div
                  title={`Amazon payouts · ${fmtMonth(m.key)}${current ? " so far" : ""}: ${rupees(m.amazonPaise, 0)}`}
                  className="w-2.5 sm:w-4 lg:w-5 rounded-t"
                  style={bar(m.amazonPaise, "#d97706", "#fcd34d", current)}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div />
      <div className="flex pt-2 text-xs font-semibold text-slate-500">
        {months.map((m) => (
          <span key={m.key} className="flex-1 text-center">
            {fmtMonth(m.key, "short")}
          </span>
        ))}
      </div>
    </div>
  );
}

function Overview({
  range,
  rangeKey,
  refreshKey,
  onTab,
  onUpload,
  onManual,
  showBank,
  onBank,
  onBook,
}: {
  range: Range;
  rangeKey: string;
  refreshKey: number;
  onTab: (t: Tab) => void;
  onUpload: () => void;
  onManual: () => void;
  showBank: boolean;
  onBank: (check: BankCheck | null) => void;
  onBook: (preset: Preset) => void;
}) {
  const summary = useData<Summary>(`/summary${qs(range)}`, refreshKey);
  const sync = useData<SyncStatus>("/amazon/status", refreshKey);
  const timeline = useData<TimelineData>(`/timeline${qs(range)}`, refreshKey);
  const bank = useData<{ check: BankCheck | null }>(showBank ? "/bank" : null, refreshKey);

  if (summary.error) return <Failed message={summary.error} />;
  if (!summary.data) return <Loading />;

  const { current: c, previous: p, deductions, months, sources } = summary.data;
  const change = (now: number, before: number) => {
    if (rangeKey === "all" || !before) return null;
    const pct = ((now - before) / Math.abs(before)) * 100;
    return { text: `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}%`, tone: pct >= 0 ? ("up" as const) : ("down" as const) };
  };
  const feeShare = c.amazonSalesPaise ? (-c.amazonFeesPaise / c.amazonSalesPaise) * 100 : 0;
  const maxDeduction = Math.max(1, ...deductions.map((d) => Math.abs(d.paise)));
  const recent = timeline.data ? buildItems(timeline.data).filter((i) => i.counted).slice(0, 6) : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          icon={<IndianRupee className="w-5 h-5" />}
          label="Net revenue"
          value={rupees(c.netPaise, 0)}
          sub="Website + Amazon payouts + manual"
          chip={change(c.netPaise, p.netPaise)}
        />
        <StatCard
          icon={<Globe className="w-5 h-5" />}
          label="Website sales"
          value={rupees(c.websitePaise, 0)}
          sub={`${c.websiteOrders} paid orders`}
          chip={change(c.websitePaise, p.websitePaise)}
        />
        <StatCard
          icon={<Package className="w-5 h-5" />}
          label="Amazon gross"
          value={rupees(c.amazonSalesPaise, 0)}
          sub={`${c.payouts} ${c.payouts === 1 ? "payout" : "payouts"} deposited`}
          chip={change(c.amazonSalesPaise, p.amazonSalesPaise)}
        />
        <StatCard
          icon={<Percent className="w-5 h-5" />}
          label="Amazon deductions"
          value={rupees(-c.amazonFeesPaise, 0)}
          sub="Fees, GST on fees, TCS, TDS"
          chip={c.amazonSalesPaise ? { text: `${feeShare.toFixed(1)}%`, tone: "flat" } : null}
        />
        <StatCard
          icon={<Landmark className="w-5 h-5" />}
          label="Amazon payout"
          value={rupees(c.amazonNetPaise, 0)}
          sub={c.amazonRefundsPaise ? `After ${rupees(c.amazonRefundsPaise, 0)} refunds` : "Reached your bank"}
          chip={change(c.amazonNetPaise, p.amazonNetPaise)}
        />
      </div>

      {bank.error && <Failed message={bank.error} />}
      {bank.data && (
        <BankPanel check={bank.data.check} onSet={() => onBank(bank.data!.check)} onAdd={onManual} onBook={onBook} />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h4 className="text-lg font-black text-slate-900">Money in by month</h4>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Financial year · cash actually received · this month is hatched (so far)
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600" />
                Website
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-600" />
                Amazon payouts
              </span>
            </div>
          </div>
          <MonthChart months={months} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
          <h4 className="text-lg font-black text-slate-900">Where Amazon's cut goes</h4>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Settlements deposited in this range</p>
          {deductions.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">No Amazon settlements deposited in this range.</p>
          ) : (
            <>
              <div className="mt-5 space-y-3.5">
                {deductions.slice(0, 7).map((d) => (
                  <div key={d.label} className="space-y-1.5">
                    <div className="flex justify-between gap-3 text-[13px]">
                      <span className="font-semibold text-slate-700 truncate">{d.label}</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {d.paise > 0 ? "+" : ""}
                        {rupees(d.paise, 0)}
                      </span>
                    </div>
                    <div className="h-2 rounded bg-slate-100">
                      <div
                        className={`h-2 rounded ${d.paise > 0 ? "bg-green-600" : "bg-amber-600"}`}
                        style={{ width: `${Math.max(1, (Math.abs(d.paise) / maxDeduction) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {deductions.some((d) => /TCS|TDS/i.test(d.label)) && (
                <p className="mt-5 pt-3.5 border-t border-slate-100 text-xs text-slate-500">
                  TCS and TDS come back to you: claim them in your GST and income-tax filings.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h4 className="text-lg font-black text-slate-900">Recent activity</h4>
            <button type="button" onClick={() => onTab("timeline")} className="text-sm font-bold hover:underline">
              <span className="text-indigo-600">Open timeline →</span>
            </button>
          </div>
          {timeline.error && <p className="p-5 text-sm font-bold text-red-600">{timeline.error}</p>}
          {!timeline.data && !timeline.error && <p className="p-8 text-center text-sm text-slate-500">Loading…</p>}
          {timeline.data && recent.length === 0 && (
            <p className="p-8 text-center text-sm text-slate-500">Nothing in this range yet.</p>
          )}
          <div className="divide-y divide-slate-100">
            {recent.map((item) => (
              <ItemRow key={item.key} item={item} showDate />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 px-5 sm:px-6 pt-4 pb-2">
          <h4 className="text-lg font-black text-slate-900">Data sources</h4>
          <div className="mt-1 divide-y divide-slate-100">
            <SourceRow
              tone="web"
              icon={<Globe className="w-5 h-5" />}
              title="Website orders"
              detail="Updates on every paid order"
              action={
                <span className={`${CHIP} bg-green-50 text-green-600`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                  Live
                </span>
              }
            />
            <SourceRow
              tone="amz"
              icon={<FileText className="w-5 h-5" />}
              title="Amazon reports"
              detail={
                sources.lastImport
                  ? `Last upload ${fmtDay(istDay(sources.lastImport.importedAt))}${
                      sources.lastImport.periodEnd ? ` · covers to ${fmtDay(istDay(sources.lastImport.periodEnd))}` : ""
                    }`
                  : "No report uploaded yet"
              }
              action={<LinkButton onClick={onUpload}>Upload</LinkButton>}
            />
            <SourceRow
              tone="amz"
              icon={<RefreshCw className="w-5 h-5" />}
              title="Amazon auto-sync"
              detail={
                sync.data?.configured
                  ? sync.data.lastOkAt
                    ? `On · last synced ${fmtDay(istDay(sync.data.lastOkAt), true)}`
                    : "On · first sync still to run"
                  : "Not connected yet"
              }
              action={
                <LinkButton onClick={() => onTab("settlements")}>{sync.data?.configured ? "View" : "Set up"}</LinkButton>
              }
            />
            <SourceRow
              tone="man"
              icon={<Pencil className="w-5 h-5" />}
              title="Manual entries"
              detail={`${sources.manualCount} in this range · ${sources.manualBackdated} backdated`}
              action={<LinkButton onClick={onManual}>Add</LinkButton>}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Expected balance and untracked money. Always all time, whatever range is picked.
function BankPanel({
  check: c,
  onSet,
  onAdd,
  onBook,
}: {
  check: BankCheck | null;
  onSet: () => void;
  onAdd: () => void;
  onBook: (preset: Preset) => void;
}) {
  if (!c) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3 max-w-2xl">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${TILE.man}`}>
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-lg font-black text-slate-900">Bank balance</h4>
            <p className="mt-0.5 text-sm text-slate-500">
              Enter what your bank shows, once. From then on the expected balance moves with every entry, and money your
              entries don't explain shows up as untracked, so a forgotten bill is easy to find.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSet}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold"
        >
          <Wallet className="w-4 h-4" />
          Set bank balance
        </button>
      </div>
    );
  }

  const gap = c.untrackedPaise;
  const settled = Math.abs(gap) < 100; // under ₹1
  const minus = (paise: number) => (paise < 0 ? "−" : "");
  const rows: [string, string][] = [
    [`In the bank, end of ${fmtDay(c.asOf)}`, rupees(c.balancePaise)],
    ["Explained by entries till then", `${minus(c.trackedPaise)}${rupees(c.trackedPaise)}`],
    ["Your own money", rupees(c.ownPaise)],
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-black text-slate-900">Bank balance</h4>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            All time, whatever range is picked · last matched with the bank for {fmtDay(c.asOf, true)}
          </p>
        </div>
        <LinkButton onClick={onSet}>Update from bank</LinkButton>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-gray-600 text-xs font-bold uppercase mb-1">Expected in bank now</p>
          <p className="text-2xl xl:text-3xl font-black text-gray-900 tabular-nums">
            {minus(c.expectedPaise)}
            {rupees(c.expectedPaise, 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            {rupees(c.balancePaise, 0)} at the end of {fmtDay(c.asOf)},{" "}
            {c.sincePaise ? `${signed(c.sincePaise)} from entries since` : "no entries since"}
          </p>
        </div>

        <div className="md:border-l md:border-slate-100 md:pl-6">
          <dl className="space-y-1.5 text-[13px]">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-slate-600">{label}</dt>
                <dd className="font-semibold text-slate-900 tabular-nums">{value}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-3 pt-2 mt-1 border-t border-slate-200 font-black">
              <dt className="text-slate-900">Untracked</dt>
              <dd className={`tabular-nums ${settled ? "text-green-600" : "text-amber-700"}`}>{settled ? "₹0" : signed(gap)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-slate-500">
            {settled
              ? "Everything in the bank is explained by your entries."
              : gap > 0
                ? "More in the bank than your entries explain: missing income, or your own money not counted above."
                : "Less in the bank than your entries explain: a missing expense, gateway fees, or money you took out."}
            {!settled && ` Add forgotten entries with their real date (${fmtDay(c.asOf)} or earlier) and this shrinks.`}
          </p>
          {!settled && (
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
              <LinkButton onClick={onAdd}>Add missing entry</LinkButton>
              <LinkButton
                onClick={() =>
                  onBook({
                    type: gap < 0 ? "expense" : "income",
                    channel: "other",
                    date: c.asOf,
                    amount: String(Math.abs(gap) / 100),
                    note: "Miscellaneous: bank difference not matched to an entry",
                  })
                }
              >
                Book as miscellaneous
              </LinkButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const LinkButton = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => (
  <button type="button" onClick={onClick} className="text-[13px] font-bold hover:underline">
    <span className="text-indigo-600">{children}</span>
  </button>
);

function SourceRow({
  tone,
  icon,
  title,
  detail,
  action,
}: {
  tone: keyof typeof TILE;
  icon: ReactNode;
  title: string;
  detail: string;
  action: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${TILE[tone]}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
      {action}
    </div>
  );
}

/* =========================
   TIMELINE
========================= */
function Timeline({
  range,
  refreshKey,
  onEdit,
  onVoid,
}: {
  range: Range;
  refreshKey: number;
  onEdit: (e: Entry) => void;
  onVoid: (e: Entry) => void;
}) {
  const { data, error } = useData<TimelineData>(`/timeline${qs(range)}`, refreshKey);
  const [source, setSource] = useState("all");
  const [type, setType] = useState("all");
  const [query, setQuery] = useState("");
  const [showAmazonOrders, setShowAmazonOrders] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const items = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return buildItems(data).filter((item) => {
      if (item.kind === "amazon" && !showAmazonOrders) return false;
      if (source !== "all" && !sourcesOf(item).includes(source)) return false;
      if (type !== "all" && (type === "sales" ? item.kind === "entry" : item.entry?.type !== type)) return false;
      if (!q) return true;
      const e = item.entry;
      return [item.settlementId, e?.settlementId, e?.orderRef, e?.utr, e?.note, describe(item).title]
        .filter(Boolean)
        .some((text) => String(text).toLowerCase().includes(q));
    });
  }, [data, source, type, query, showAmazonOrders]);

  const months = useMemo(() => {
    const out: { key: string; days: { day: string; items: Item[] }[] }[] = [];
    for (const item of items) {
      const key = item.day.slice(0, 7);
      if (out[out.length - 1]?.key !== key) out.push({ key, days: [] });
      const month = out[out.length - 1];
      if (month.days[month.days.length - 1]?.day !== item.day) month.days.push({ day: item.day, items: [] });
      month.days[month.days.length - 1].items.push(item);
    }
    return out;
  }, [items]);

  const moneyIn = (list: Item[]) => list.reduce((s, i) => s + (i.counted && i.amountPaise > 0 ? i.amountPaise : 0), 0);
  const moneyOut = (list: Item[]) => list.reduce((s, i) => s + (i.counted && i.amountPaise < 0 ? i.amountPaise : 0), 0);

  const exportCsv = () => {
    // Text cells starting with = + - @ would run as formulas in Excel.
    const cell = (v: unknown) => {
      const s = String(v ?? "");
      return `"${(typeof v === "string" && /^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
    };
    const rows = items.map((i) => {
      const d = describe(i);
      return [
        i.day,
        i.kind === "entry" ? i.entry!.source : i.kind,
        i.kind === "entry" ? i.entry!.type : "sales",
        d.title,
        (i.amountPaise / 100).toFixed(2),
        i.counted ? "yes" : "no",
        i.settlementId || i.entry?.settlementId || "",
        i.entry?.orderRef || "",
        i.entry?.utr || "",
        i.entry?.note || "",
        i.entry?.createdBy?.name || "",
        i.entry ? istDay(i.entry.createdAt) : "",
      ];
    });
    const header = ["Date", "Source", "Type", "Description", "Amount (INR)", "Counted in totals", "Settlement ID", "Order ref", "UTR", "Note", "Entered by", "Entered on"];
    const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-timeline-${range.from}-to-${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:px-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          {["all", "website", "amazon", "manual"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSource(s)}
              className={`px-3 sm:px-4 py-1.5 text-sm font-bold rounded-md capitalize transition ${
                source === s ? "bg-slate-900 text-white" : "hover:bg-slate-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 border rounded-lg text-sm font-semibold">
          <option value="all">All types</option>
          <option value="sales">Sales</option>
          <option value="payout">Amazon payouts</option>
          <option value="income">Income</option>
          <option value="expense">Expenses</option>
          <option value="refund">Refunds</option>
        </select>
        <label className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Order ID, settlement ID, note"
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={showAmazonOrders}
            onChange={(e) => setShowAmazonOrders(e.target.checked)}
            className="w-4 h-4 accent-slate-900"
          />
          Show Amazon order totals
        </label>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!items.length}
          className="ml-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-sm font-bold disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {error && <Failed message={error} />}
      {!data && !error && <Loading />}
      {data && months.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-slate-500">
          Nothing matches in this range.
        </div>
      )}

      {months.map((month, index) => {
        const all = month.days.flatMap((d) => d.items);
        const isCollapsed = collapsed[month.key] ?? index > 0;
        const totals = (
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] font-semibold text-slate-500 tabular-nums">
            <span>
              In <b className="font-black text-green-600">{rupees(moneyIn(all), 0)}</b>
            </span>
            <span>
              Out <b className="font-black text-red-600">{rupees(moneyOut(all), 0)}</b>
            </span>
            <span>
              Net <b className="font-black text-slate-900">{rupees(moneyIn(all) + moneyOut(all), 0)}</b>
            </span>
          </div>
        );

        return (
          <section key={month.key}>
            <button
              type="button"
              onClick={() => setCollapsed((c) => ({ ...c, [month.key]: !isCollapsed }))}
              aria-expanded={!isCollapsed}
              className={`w-full flex flex-wrap items-center gap-x-3 gap-y-1 text-left ${
                isCollapsed ? "bg-white rounded-xl border border-gray-200 px-5 py-4" : "pb-4"
              }`}
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
              <span className="text-lg sm:text-xl font-black text-slate-900">{fmtMonth(month.key)}</span>
              <span className="text-xs font-medium text-slate-500">{month.days.length} days with activity</span>
              <span className="sm:ml-auto">{totals}</span>
            </button>

            {!isCollapsed &&
              month.days.map((day) => (
                <div key={day.day} className="grid grid-cols-[56px_minmax(0,1fr)] sm:grid-cols-[88px_minmax(0,1fr)]">
                  <div className="pt-3 pr-3 sm:pr-5 text-right">
                    <p className="text-xl sm:text-[22px] leading-7 font-black text-slate-900">{Number(day.day.slice(8))}</p>
                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{fmtWeekday(day.day)}</p>
                    <p
                      className={`mt-1 text-xs font-bold tabular-nums ${
                        moneyIn(day.items) + moneyOut(day.items) < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {signed(moneyIn(day.items) + moneyOut(day.items)).replace(/\.\d+$/, "")}
                    </p>
                  </div>
                  <div className="relative pl-4 sm:pl-6 pb-4 border-l-2 border-slate-200">
                    <span className="absolute -left-[7px] top-[22px] w-3 h-3 rounded-full bg-slate-300 ring-[3px] ring-slate-50" />
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden divide-y divide-slate-100">
                      {day.items.map((item) => (
                        <ItemRow key={item.key} item={item} onEdit={onEdit} onVoid={onVoid} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
          </section>
        );
      })}
    </div>
  );
}

/* =========================
   AMAZON SETTLEMENTS
========================= */
const SETUP_STEPS = [
  ["Developer profile", "Solution Provider Portal → Developer Central. Register as a private developer and get the roles approved."],
  ["Create the app", "Add new app client: SP-API, Production, Sellers, with the approved roles. Copy its client ID and secret."],
  ["Authorize your store", "Authorize the app on your own seller account to get a refresh token."],
  ["Add the keys", "Put the client ID, secret and refresh token in the backend settings (the AMAZON_ variables). No AWS account needed."],
];

function Settlements({ range, refreshKey, onUpload }: { range: Range; refreshKey: number; onUpload: () => void }) {
  // Bumped after a manual sync so the list and status reload.
  const [syncKey, setSyncKey] = useState(0);
  const { data, error } = useData<SettlementRow[]>(`/amazon/settlements${qs(range)}`, refreshKey + syncKey);
  const status = useData<SyncStatus>("/amazon/status", refreshKey + syncKey);
  const [open, setOpen] = useState<string | null>(null);
  // Hand-typed payouts, and ones Amazon only gave us a total for, have no
  // report behind them, so there is nothing to fetch.
  const hasReport = !!data?.some(
    (r) => r.settlementId === open && r.settlement && r.settlement.source !== "amazon_finances"
  );
  const detail = useData<SettlementDetail>(open && hasReport ? `/amazon/settlements/${open}` : null, refreshKey + syncKey);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const connected = !!status.data?.configured;

  const syncNow = async () => {
    setSyncing(true);
    setSyncMessage("");
    try {
      const result = await api<{ imported: unknown[]; updated: unknown[]; failed: { reason: string }[] }>("/amazon/sync", {
        method: "POST",
      });
      const parts = [
        `${result.imported.length} new`,
        result.updated.length ? `${result.updated.length} refreshed` : "",
        result.failed.length ? `${result.failed.length} skipped (${result.failed[0].reason})` : "",
      ].filter(Boolean);
      setSyncMessage(`Synced: ${parts.join(" · ")}`);
      setSyncKey((k) => k + 1);
    } catch (err) {
      setSyncMessage((err as Error).message);
    }
    setSyncing(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h4 className="flex items-center gap-2.5 text-lg font-black text-slate-900">
              Amazon auto-sync
              {connected ? (
                <span className={`${CHIP} bg-green-50 text-green-600`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                  Connected
                </span>
              ) : (
                <span className={`${CHIP} bg-slate-100 text-slate-600`}>Not connected</span>
              )}
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              {connected
                ? `New settlements arrive on their own every morning at ${status.data?.runsDailyAtIst} IST. ${
                    status.data?.lastOkAt ? `Last synced ${fmtDay(istDay(status.data.lastOkAt), true)}.` : "First sync still to run."
                  }`
                : "Until it's connected, open Seller Central → Payments → All statements, use “Download Flat File V2” on a settlement, and upload that file here. You can also type a payout in by hand."}
            </p>
            {syncMessage && <p className="mt-1.5 text-sm font-bold text-slate-700">{syncMessage}</p>}
            {connected && status.data?.lastError && (
              <p className="mt-1.5 text-sm font-bold text-red-600">Last run had a problem: {status.data.lastError}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {connected && (
              <button
                type="button"
                onClick={syncNow}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-bold disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing…" : "Sync now"}
              </button>
            )}
            <button
              type="button"
              onClick={onUpload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold"
            >
              <Upload className="w-4 h-4" />
              Upload report
            </button>
          </div>
        </div>
        {!connected && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {SETUP_STEPS.map(([title, text], i) => (
              <div key={title} className="rounded-lg border border-slate-200 p-3.5">
                <span className="inline-flex w-6 h-6 rounded-full bg-slate-100 text-slate-600 items-center justify-center text-xs font-black">
                  {i + 1}
                </span>
                <p className="mt-2 text-sm font-bold text-slate-900">{title}</p>
                <p className="mt-1 text-xs leading-[18px] text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4">
          <h4 className="text-lg font-black text-slate-900">Settlements</h4>
          <p className="text-xs text-gray-500 font-medium">Newest first · each settlement is one bank deposit</p>
        </div>
        {error && <p className="px-5 pb-5 text-sm font-bold text-red-600">{error}</p>}
        {!data && !error && <p className="px-5 pb-8 text-center text-sm text-slate-500">Loading…</p>}
        {data && data.length === 0 && (
          <p className="px-5 pb-10 pt-4 text-center text-sm text-slate-500">No Amazon payouts in this range.</p>
        )}
        {data && data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-[11px] font-black uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Settlement ID</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Deposited</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">Fees</th>
                  <th className="px-4 py-3 text-right">Refunds</th>
                  <th className="px-4 py-3 text-right">Net payout</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.map((row) => {
                  const s = row.settlement;
                  const b = row.breakdown || { salesPaise: 0, feesPaise: 0, refundsPaise: 0 };
                  const isOpen = open === row.settlementId;
                  return (
                    <Fragment key={row._id}>
                    <tr
                      onClick={() => setOpen(isOpen ? null : row.settlementId || null)}
                      className={`border-t border-slate-100 whitespace-nowrap cursor-pointer hover:bg-slate-50 ${isOpen ? "bg-slate-50" : ""}`}
                    >
                      <td className="px-4 py-3.5 font-bold text-slate-900 tabular-nums" title={row.settlementId || ""}>
                        {/* Payouts filled in from the finances API carry a long internal id, not a settlement number. */}
                        {row.settlement?.source === "amazon_finances" ? "—" : row.settlementId}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">
                        {s?.periodStart && s.periodEnd ? `${fmtDay(istDay(s.periodStart))} – ${fmtDay(istDay(s.periodEnd))}` : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">{fmtDay(istDay(row.occurredAt), true)}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-slate-700">{s ? s.orderCount : "—"}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-slate-700">{rupees(b.salesPaise)}</td>
                      {/* Amazon credits fees back sometimes, and a settlement can end up owing
                          Amazon money, so every figure carries its own sign. */}
                      <td className={`px-4 py-3.5 text-right tabular-nums ${b.feesPaise > 0 ? "text-green-600" : "text-red-600"}`}>
                        {b.feesPaise ? signed(b.feesPaise) : "—"}
                      </td>
                      <td className={`px-4 py-3.5 text-right tabular-nums ${b.refundsPaise > 0 ? "text-green-600" : "text-red-600"}`}>
                        {b.refundsPaise ? signed(b.refundsPaise) : "—"}
                      </td>
                      <td
                        className={`px-4 py-3.5 text-right tabular-nums font-black ${
                          row.amountPaise < 0 ? "text-red-600" : "text-slate-900"
                        }`}
                      >
                        {row.amountPaise < 0 ? `−${rupees(row.amountPaise)}` : rupees(row.amountPaise)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`${CHIP} ${
                            row.source === "manual" ? "bg-white border border-slate-300 text-slate-700" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {row.source === "manual"
                            ? "Manual"
                            : row.settlement?.source === "amazon_finances"
                            ? "Amazon total"
                            : "Report"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">
                        {isOpen ? <ChevronDown className="w-4 h-4 rotate-180" /> : <ChevronDown className="w-4 h-4" />}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-slate-50 border-t border-slate-200">
                        <td colSpan={10} className="px-5 sm:px-6 py-5">
                          {s?.source === "amazon_finances" ? (
                            <p className="text-sm text-slate-600">
                              Amazon only gives the payout total for this period — the report file with the fee lines
                              isn't offered any more. If you still have the file, upload it and this row will fill in.
                            </p>
                          ) : !s ? (
                            <p className="text-sm text-slate-600">
                              Entered by hand{row.createdBy?.name ? ` by ${row.createdBy.name}` : ""}
                              {row.note ? ` · ${row.note}` : ""}. Upload this settlement's report to see the full
                              breakdown; it will replace this entry, not add to it.
                            </p>
                          ) : detail.error ? (
                            <p className="text-sm font-bold text-red-600">{detail.error}</p>
                          ) : detail.data?.settlementId !== row.settlementId ? (
                            <p className="text-sm text-slate-500">Loading…</p>
                          ) : (
                            <SettlementBreakdown d={detail.data} />
                          )}
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function BreakdownList({ title, lines, total, totalLabel }: { title: string; lines: { label: string; paise: number }[]; total: number; totalLabel: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-black uppercase text-slate-500 mb-2">{title}</p>
      {lines.map((l) => (
        <div key={l.label} className="flex justify-between gap-3 py-1 text-[13px]">
          <span className="text-slate-600 truncate">{l.label}</span>
          <span className={`font-semibold tabular-nums ${l.paise < 0 ? "text-red-600" : "text-slate-900"}`}>
            {l.paise < 0 ? "−" : ""}
            {rupees(l.paise)}
          </span>
        </div>
      ))}
      <div className="flex justify-between gap-3 pt-2 mt-1.5 border-t border-slate-200 text-[13px] font-black">
        <span className="text-slate-900">{totalLabel}</span>
        <span className={`tabular-nums ${total < 0 ? "text-red-600" : "text-slate-900"}`}>
          {total < 0 ? "−" : ""}
          {rupees(total)}
        </span>
      </div>
    </div>
  );
}

function SettlementBreakdown({ d }: { d: SettlementDetail }) {
  const matches = d.netPaise === d.fileTotalPaise;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 whitespace-normal">
      <BreakdownList title="Sales" lines={d.sales} total={d.salesPaise} totalLabel="Gross" />
      <BreakdownList title="Fees & adjustments" lines={d.fees} total={d.feesPaise} totalLabel="Total" />
      <div>
        <p className="text-[11px] font-black uppercase text-slate-500 mb-2">Payout</p>
        {[
          ["Gross", d.salesPaise],
          ["Fees & adjustments", d.feesPaise],
          [`Refunds (${d.refundOrders} ${d.refundOrders === 1 ? "order" : "orders"})`, d.refundsPaise],
        ].map(([label, paise]) => (
          <div key={label as string} className="flex justify-between gap-3 py-1 text-[13px]">
            <span className="text-slate-600">{label}</span>
            <span className={`font-semibold tabular-nums ${(paise as number) < 0 ? "text-red-600" : "text-slate-900"}`}>
              {(paise as number) < 0 ? "−" : ""}
              {rupees(paise as number)}
            </span>
          </div>
        ))}
        <div className="flex justify-between gap-3 pt-2 mt-1.5 border-t border-slate-200 text-[15px] font-black">
          <span className="text-slate-900">Deposited {fmtDay(istDay(d.depositDate), true)}</span>
          <span className="tabular-nums text-green-600">{rupees(d.netPaise)}</span>
        </div>
        <span className={`${CHIP} mt-3 ${matches ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
          {matches ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          {matches ? "Matches Amazon's total for this settlement" : `Amazon's total is ${rupees(d.fileTotalPaise)}`}
        </span>
        <p className="mt-2.5 text-xs leading-[18px] text-slate-500">
          Imported {d.importedAt ? fmtDay(istDay(d.importedAt), true) : ""}
          {d.importedBy?.name ? ` by ${d.importedBy.name}` : ""} · {d.fileName} · {d.rowCount} rows
        </p>
      </div>
    </div>
  );
}

/* =========================
   WEBSITE ORDERS (the original day-wise table)
========================= */
function WebsiteOrders({ range, refreshKey }: { range: Range; refreshKey: number }) {
  const { data, error } = useData<{ _id: string; totalRevenue: number; ordersCount: number }[]>("/daily", refreshKey);
  const days = (data || []).filter((d) => d._id >= range.from && d._id <= range.to);

  if (error) return <Failed message={error} />;
  if (!data) return <Loading />;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr className="text-left text-[11px] font-black uppercase tracking-wide text-slate-500">
            <th className="px-5 py-3">Date</th>
            <th className="px-5 py-3 text-right">Orders</th>
            <th className="px-5 py-3 text-right">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day._id} className="border-t border-slate-100">
              <td className="px-5 py-3 text-slate-700">
                {fmtWeekday(day._id)}, {fmtDay(day._id, true)}
              </td>
              <td className="px-5 py-3 text-right font-medium tabular-nums">{day.ordersCount}</td>
              <td className="px-5 py-3 text-right font-bold text-green-600 tabular-nums">
                ₹{day.totalRevenue.toLocaleString("en-IN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {days.length === 0 && <p className="p-6 text-center text-slate-500">No website orders in this range</p>}
    </div>
  );
}

/* =========================
   MODALS
========================= */
function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${wide ? "max-w-3xl" : "max-w-xl"} bg-white rounded-2xl shadow-2xl overflow-hidden`}
      >
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-5 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-black text-slate-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-md hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 sm:px-6 py-5">{children}</div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t border-slate-200">{footer}</div>
      </div>
    </div>
  );
}

const FIELD = "block w-full px-3 py-2.5 border rounded-lg text-sm text-slate-900";
const LABEL = "block text-xs font-bold text-slate-700 mb-1.5";

function EntryModal({
  entry,
  preset,
  onClose,
  onSaved,
}: {
  entry?: Entry;
  preset?: Preset;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const editing = !!entry;
  const [form, setForm] = useState(() => ({
    type: (entry?.type || "payout") as EntryType,
    channel: (entry?.channel || "amazon") as Channel,
    date: entry ? istDay(entry.occurredAt) : todayIst(),
    settlementId: entry?.settlementId || "",
    gross: entry?.type === "payout" ? String((entry.breakdown?.salesPaise || 0) / 100) : "",
    fees: entry?.type === "payout" ? String(-(entry.breakdown?.feesPaise || 0) / 100) : "",
    amount: entry && entry.type !== "payout" ? String(Math.abs(entry.amountPaise) / 100) : "",
    orderRef: entry?.orderRef || "",
    utr: entry?.utr || "",
    note: entry?.note || "",
    ...preset,
  }));
  const [files, setFiles] = useState<File[]>([]); // new documents to upload
  const [kept, setKept] = useState<Doc[]>(() => docsOf(entry)); // documents already on the entry
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [possibleDup, setPossibleDup] = useState(""); // server's warning, answered with "Save anyway"
  const [reading, setReading] = useState({ busy: false, message: "", failed: false });

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setPossibleDup(""); // a changed form is checked afresh on save
  };
  const defaultChannel = (type: EntryType): Channel =>
    type === "payout" ? "amazon" : type === "refund" ? "website" : "offline";
  const pickType = (type: EntryType) => setForm((f) => ({ ...f, type, channel: defaultChannel(type) }));

  // Sends the receipt to the server's reader and fills in whatever it found.
  // Nothing is saved: the admin checks the form, and the server validates again on save.
  const readReceipt = async (receipt: File) => {
    setReading({ busy: true, message: "Reading the receipt…", failed: false });
    const body = new FormData();
    body.append("file", receipt);
    try {
      const found = await api<ReceiptFields>("/receipts/read", { method: "POST", body });
      const type = editing ? null : found.type; // an edit can't change the type
      const payout = (type || form.type) === "payout";
      // A payout screenshot often shows only what was deposited: treat it as gross with no fees.
      const onlyNet = payout && !found.gross && !!found.amount;

      setForm((f) => ({
        ...f,
        ...(type && type !== f.type ? { type, channel: defaultChannel(type) } : {}),
        ...(found.date ? { date: found.date } : {}),
        ...(payout
          ? {
              ...(found.settlementId ? { settlementId: found.settlementId } : {}),
              ...(found.gross ? { gross: found.gross } : onlyNet ? { gross: found.amount!, fees: "0" } : {}),
              ...(found.fees ? { fees: found.fees } : {}),
            }
          : {
              ...(found.amount ? { amount: found.amount } : {}),
              ...(found.orderRef ? { orderRef: found.orderRef } : {}),
              ...(found.utr ? { utr: found.utr } : {}),
            }),
        ...(found.note ? { note: found.note } : {}),
      }));

      const filled = [
        type && "type",
        found.date && "date",
        (payout ? found.gross || found.amount : found.amount) && "amount",
        payout && found.settlementId && "settlement ID",
        !payout && found.orderRef && "ref",
        !payout && found.utr && "UTR",
        found.note && "note",
      ].filter(Boolean);
      const warnings = [
        found.notRupees && "the amount isn't in rupees",
        found.confidence === "low" && "parts were hard to read",
        onlyNet && "only the deposited amount was found",
      ].filter(Boolean);

      setReading({
        busy: false,
        failed: false,
        message: filled.length
          ? `Filled ${filled.join(", ")} from the receipt${warnings.length ? ` (${warnings.join("; ")})` : ""}. Check before saving.`
          : "Couldn't find details on this receipt. Enter them by hand.",
      });
    } catch (e) {
      setReading({ busy: false, message: (e as Error).message, failed: true });
    }
  };

  // The reader works on photos, screenshots and PDFs; anything else is only attached.
  const readable = (f: File) => /^(image\/(jpeg|png|webp)|application\/pdf)$/.test(f.type);

  const addFiles = (picked: File[]) => {
    const room = MAX_DOCS - kept.length - files.length;
    setFiles((list) => [...list, ...picked.slice(0, room)]);
    if (picked.length > room) {
      setReading({ busy: false, failed: true, message: `An entry can hold up to ${MAX_DOCS} documents.` });
      return;
    }
    // A new entry fills itself from the first readable document, once; the
    // invoice added after the payment receipt doesn't overwrite what was read.
    const first = picked.find(readable);
    if (first && !editing && !reading.message) readReceipt(first);
  };

  const today = todayIst();
  const isPayout = form.type === "payout";
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(form.date);
  const future = validDate && form.date > today;
  const sales = inputPaise(form.gross);
  const fees = form.fees.trim() ? inputPaise(form.fees) : 0;
  const amount = isPayout ? sales - fees : inputPaise(form.amount);
  const value = form.type === "expense" || form.type === "refund" ? -amount : amount;
  const canSave =
    validDate &&
    !future &&
    amount > 0 &&
    (!isPayout || (/^\d{5,20}$/.test(form.settlementId.trim()) && fees >= 0 && fees < sales));

  // Nearby timeline, to show where this entry will land.
  const around = validDate && !future ? `/timeline?from=${shiftDay(form.date, -20)}&to=${[shiftDay(form.date, 20), today].sort()[0]}` : null;
  const nearby = useData<TimelineData>(around, 0);
  const preview = useMemo(() => {
    if (!nearby.data || !validDate) return [];
    const draft: Item = {
      key: "draft",
      day: form.date,
      kind: "entry",
      amountPaise: Number.isFinite(value) ? value : 0,
      counted: true,
      enteredAt: "~", // sorts above existing entries on the same day
    };
    const list = [...buildItems(nearby.data).filter((i) => i.counted && i.key !== entry?._id), draft].sort(byNewest);
    const at = list.indexOf(draft);
    const start = Math.max(0, Math.min(at - 2, list.length - 5));
    return list.slice(start, start + 5);
  }, [nearby.data, form.date, value, validDate, entry?._id]);

  const daysBack = validDate ? daysBetween(form.date, today) : 0;
  const notice = !validDate
    ? { text: "Pick the date the money actually moved.", className: "bg-slate-50 text-slate-600" }
    : future
      ? { text: "That date is in the future. Entries can only be dated today or earlier.", className: "bg-red-50 text-red-700" }
      : daysBack > 0
        ? {
            text: `Backdated ${daysBack} ${daysBack === 1 ? "day" : "days"}: it shows on ${fmtDay(form.date, true)} and ${fmtMonth(
              form.date.slice(0, 7),
            )} totals update. The time you entered it is kept separately.`,
            className: "bg-slate-50 text-slate-600",
          }
        : { text: "Dated today, so it shows at the top of the timeline.", className: "bg-slate-50 text-slate-600" };

  const submit = async (confirmDuplicate = false) => {
    setSaving(true);
    setError("");
    setPossibleDup("");
    const body = new FormData();
    Object.entries(form).forEach(([k, v]) => body.append(k, v));
    files.forEach((f) => body.append("attachments", f));
    if (editing) kept.forEach((d) => body.append("keep", d.url));
    if (confirmDuplicate) body.append("confirmDuplicate", "1");
    try {
      await api(editing ? `/entries/${entry!._id}` : "/entries", { method: editing ? "PATCH" : "POST", body });
      onSaved(editing ? "Entry updated" : `Added to the timeline on ${fmtDay(form.date, true)}`);
    } catch (e) {
      const err = e as Error & { data?: { possibleDuplicate?: boolean } };
      if (err.data?.possibleDuplicate) setPossibleDup(err.message);
      else setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? "Edit manual entry" : "Add manual entry"}
      subtitle="For money that didn't come through a website order or a report upload."
      onClose={onClose}
      footer={
        <>
          <span className="text-xs text-slate-500">
            Saved as <b className="text-slate-700">Manual</b> · recorded in Activity Logs
          </span>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-bold">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => submit()}
              disabled={!canSave || saving || reading.busy}
              className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : editing ? "Save changes" : "Save entry"}
            </button>
          </div>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-dashed border-slate-300 divide-y divide-dashed divide-slate-300">
          {kept.map((doc, i) => (
            <div key={doc.url} className="flex items-center gap-2.5 px-3.5 py-2 text-xs">
              <Paperclip className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <a href={doc.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-bold text-slate-700 hover:underline">
                {doc.name || `Document ${i + 1}`}
              </a>
              <button
                type="button"
                onClick={() => setKept((list) => list.filter((d) => d !== doc))}
                aria-label={`Remove ${doc.name || "document"}`}
                className="p-0.5 rounded hover:bg-slate-100"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          ))}
          {files.map((f, i) => (
            <div key={`${i}-${f.name}`} className="flex items-center gap-2.5 px-3.5 py-2 text-xs">
              <Paperclip className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1 truncate font-bold text-slate-700">{f.name}</span>
              {readable(f) && (
                <button
                  type="button"
                  onClick={() => readReceipt(f)}
                  disabled={reading.busy}
                  className="inline-flex items-center gap-1.5 font-bold disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-indigo-600">Fill form</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setFiles((list) => list.filter((x) => x !== f))}
                aria-label={`Remove ${f.name}`}
                className="p-0.5 rounded hover:bg-slate-100"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          ))}
          {kept.length + files.length < MAX_DOCS && (
            <label className="flex items-center gap-2.5 px-3.5 py-3 rounded-lg text-[13px] text-slate-500 cursor-pointer hover:bg-slate-50">
              <Paperclip className="w-4 h-4 shrink-0" />
              <span className="min-w-0 flex-1">
                {kept.length + files.length ? (
                  <>
                    <b className="text-slate-700">Add another document</b> · invoice, payment receipt, anything for reference
                  </>
                ) : (
                  <>
                    <b className="text-slate-700">Have a receipt?</b> Attach photos, screenshots or PDFs and the details fill in
                  </>
                )}
              </span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="sr-only"
                onChange={(e) => {
                  addFiles(Array.from(e.target.files || []));
                  e.target.value = ""; // lets the same file be picked again after removing it
                }}
              />
            </label>
          )}
          {reading.message && (
            <p role="status" className={`px-3.5 py-2 text-xs ${reading.failed ? "font-bold text-red-600" : "text-slate-600"}`}>
              {reading.message}
            </p>
          )}
        </div>

        <div>
          <span className={LABEL}>What happened?</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 border border-slate-200 rounded-lg">
            {(Object.keys(TYPE_LABEL) as EntryType[]).map((t) => (
              <button
                key={t}
                type="button"
                disabled={editing}
                onClick={() => pickType(t)}
                className={`px-2 py-2 rounded-md text-sm font-bold transition ${
                  form.type === t ? "bg-slate-900 text-white" : "hover:bg-slate-100 disabled:opacity-40"
                }`}
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label>
            <span className={LABEL}>Date the money moved</span>
            <input type="date" max={today} value={form.date} onChange={set("date")} className={FIELD} />
          </label>
          <label>
            <span className={LABEL}>Channel</span>
            <select value={form.channel} onChange={set("channel")} disabled={isPayout} className={`${FIELD} disabled:opacity-60`}>
              {(Object.keys(CHANNEL_LABEL) as Channel[]).map((c) => (
                <option key={c} value={c}>
                  {c === "offline" ? "Offline (stall, event, cash)" : CHANNEL_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isPayout ? (
          <>
            <label className="block">
              <span className={LABEL}>Settlement ID</span>
              <input
                value={form.settlementId}
                onChange={set("settlementId")}
                inputMode="numeric"
                placeholder="Seller Central → Payments → All statements"
                className={`${FIELD} tabular-nums`}
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <label>
                <span className={LABEL}>Gross sales (₹)</span>
                <input value={form.gross} onChange={set("gross")} inputMode="decimal" placeholder="0" className={`${FIELD} tabular-nums`} />
              </label>
              <label>
                <span className={LABEL}>Amazon deductions (₹)</span>
                <input value={form.fees} onChange={set("fees")} inputMode="decimal" placeholder="0" className={`${FIELD} tabular-nums`} />
              </label>
              <div>
                <span className={LABEL}>Net deposited</span>
                <div
                  className={`px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-black tabular-nums ${
                    amount < 0 ? "text-red-600" : "text-slate-900"
                  }`}
                >
                  {Number.isFinite(amount) ? `${amount < 0 ? "−" : ""}${rupees(amount)}` : "—"}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label>
              <span className={LABEL}>Amount (₹)</span>
              <input value={form.amount} onChange={set("amount")} inputMode="decimal" placeholder="0" className={`${FIELD} tabular-nums`} />
            </label>
            <label>
              <span className={LABEL}>Order or invoice ref (optional)</span>
              <input value={form.orderRef} onChange={set("orderRef")} placeholder="e.g. #ST-10411" className={FIELD} />
            </label>
            <label>
              <span className={LABEL}>UTR / UPI ref (optional)</span>
              <input value={form.utr} onChange={set("utr")} placeholder="e.g. 872239728910" className={`${FIELD} tabular-nums`} />
            </label>
          </div>
        )}

        <label className="block">
          <span className={LABEL}>Note</span>
          <input value={form.note} onChange={set("note")} maxLength={500} placeholder="What was this for?" className={FIELD} />
        </label>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
            <span className="text-[13px] font-black text-slate-900">Where it lands in the timeline</span>
            {validDate && (
              <span className={`${CHIP} bg-white border border-slate-200 text-slate-700`}>{fmtMonth(form.date.slice(0, 7))}</span>
            )}
          </div>
          {preview.length > 0 && (
            <div className="p-2 space-y-0.5">
              {preview.map((item) => {
                const isDraft = item.key === "draft";
                const label = isDraft
                  ? isPayout
                    ? `Amazon payout · ${form.settlementId || "settlement ID?"}`
                    : form.note || TYPE_LABEL[form.type]
                  : `${describe(item).title}${item.orders ? ` · ${item.orders} orders` : ""}`;
                return (
                  <div
                    key={item.key}
                    className={`grid grid-cols-[48px_8px_minmax(0,1fr)_auto] gap-2.5 items-center px-2.5 py-2 rounded-lg border-2 ${
                      isDraft ? "border-slate-900 bg-white" : "border-transparent"
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-500">{fmtDay(item.day)}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isDraft ? "bg-slate-900" : item.kind === "website" ? "bg-indigo-600" : item.entry?.type === "payout" ? "bg-amber-600" : "bg-slate-500"
                      }`}
                    />
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={`text-[13px] truncate ${isDraft ? "font-black" : "font-semibold"} text-slate-900`}>{label}</span>
                      {isDraft && <span className={`${CHIP} bg-slate-900 text-white admin-zoho-keep-white`}>This entry</span>}
                    </span>
                    <span
                      className={`text-[13px] font-black tabular-nums ${
                        item.amountPaise > 0 ? "text-green-600" : item.amountPaise < 0 ? "text-red-600" : "text-slate-400"
                      }`}
                    >
                      {item.amountPaise ? signed(item.amountPaise) : rupees(0)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <p className={`px-4 py-2.5 border-t border-slate-200 text-xs font-semibold ${notice.className}`}>{notice.text}</p>
        </div>

        {possibleDup && (
          <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-3">
            <p className="text-sm font-bold text-amber-800">{possibleDup}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => submit(true)}
                disabled={saving}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 text-white admin-zoho-keep-white text-xs font-bold disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save anyway"}
              </button>
              <button type="button" onClick={() => setPossibleDup("")} className="text-xs font-bold text-amber-800 hover:underline">
                Don't save, let me check
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-sm font-bold text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}

function BankModal({ check, onClose, onSaved }: { check: BankCheck | null; onClose: () => void; onSaved: (message: string) => void }) {
  const today = todayIst();
  const [date, setDate] = useState(today);
  const [balance, setBalance] = useState("");
  const [own, setOwn] = useState(check?.ownPaise ? String(check.ownPaise / 100) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const canSave =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    date <= today &&
    Number.isFinite(inputPaise(balance)) &&
    (!own.trim() || Number.isFinite(inputPaise(own)));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api("/bank", { method: "POST", body: JSON.stringify({ date, balance, own }) });
      onSaved("Bank balance saved");
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <Modal
      title={check ? "Update from bank" : "Set bank balance"}
      subtitle="What your bank account shows. Update it whenever you check the bank; earlier checks are kept."
      onClose={onClose}
      footer={
        <>
          <span className="text-xs text-slate-500">Recorded in Activity Logs</span>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-bold">
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!canSave || saving}
              className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label>
            <span className={LABEL}>Balance in the bank (₹)</span>
            <input
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className={`${FIELD} tabular-nums`}
            />
          </label>
          <label>
            <span className={LABEL}>At the end of</span>
            <input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} />
          </label>
        </div>
        <label className="block">
          <span className={LABEL}>Your own money in it (₹, optional)</span>
          <input value={own} onChange={(e) => setOwn(e.target.value)} inputMode="decimal" placeholder="0" className={`${FIELD} tabular-nums`} />
          <span className="mt-1.5 block text-xs text-slate-500">
            Money you put in yourself, or that was already there before your first entry. It isn't revenue, so it's kept out
            of untracked instead of being booked as income.
          </span>
        </label>
        <p className="rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
          Use that day's closing balance from your bank statement or app. Website sales from the last two days may still be
          on their way from Razorpay.
        </p>
        {error && <p className="text-sm font-bold text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}

function UploadModal({ onClose, onImported }: { onClose: () => void; onImported: (message: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const send = async (dryRun: boolean) => {
    if (!file) return;
    setBusy(true);
    setError("");
    const body = new FormData();
    body.append("file", file);
    try {
      const data = await api<ImportPreview>(`/amazon/import${dryRun ? "?dryRun=1" : ""}`, { method: "POST", body });
      if (!dryRun) {
        onImported(`Settlement ${data.settlementId} imported · ${rupees(data.netPaise)} payout on ${fmtDay(istDay(data.depositDate), true)}`);
        return;
      }
      setPreview(data);
    } catch (e) {
      setError((e as Error).message);
      if (dryRun) setPreview(null);
    }
    setBusy(false);
  };

  useEffect(() => {
    send(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const step = preview ? 2 : 1;

  return (
    <Modal
      wide
      title="Import Amazon settlement report"
      subtitle="Seller Central → Payments → All statements → Download Flat File V2 (.txt)"
      onClose={onClose}
      footer={
        <>
          <span className="text-xs text-slate-500">Nothing is saved until you press Import.</span>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-bold">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => send(false)}
              disabled={!preview?.matches || busy}
              className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy && preview ? "Importing…" : preview ? `Import ${preview.rowCount} rows` : "Import"}
            </button>
          </div>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 text-[13px] font-bold">
          {["Choose file", "Review", "Imported"].map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              {i > 0 && <span className="w-6 sm:w-10 h-px bg-slate-200" />}
              <span className={`flex items-center gap-2 ${i + 1 < step ? "text-green-600" : i + 1 === step ? "text-slate-900" : "text-slate-400"}`}>
                <span
                  className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] ${
                    i + 1 < step ? "bg-green-50" : i + 1 === step ? "bg-slate-900 text-white admin-zoho-keep-white" : "bg-slate-100"
                  }`}
                >
                  {i + 1 < step ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                {label}
              </span>
            </div>
          ))}
        </div>

        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
          }}
          className={`flex items-center gap-3 px-4 py-3.5 rounded-lg border cursor-pointer hover:bg-slate-50 ${
            file ? "border-slate-200" : "border-dashed border-slate-300 py-8 justify-center"
          }`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${TILE.amz}`}>
            {file ? <FileText className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 truncate">{file ? file.name : "Choose or drop the settlement report"}</p>
            <p className="text-xs text-slate-500">
              {busy && !preview ? "Reading the file…" : file ? `${Math.ceil(file.size / 1024)} KB` : ".txt flat file V2, up to 10 MB"}
            </p>
          </div>
          {file && <span className="text-[13px] font-bold text-indigo-600">Change file</span>}
          <input
            type="file"
            accept=".txt,.tsv,.csv,text/plain"
            className="sr-only"
            onChange={(e) => {
              setPreview(null);
              setFile(e.target.files?.[0] || null);
            }}
          />
        </label>

        {error && <p className="px-4 py-3 rounded-lg bg-red-50 text-sm font-bold text-red-700">{error}</p>}

        {preview && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ["Period", preview.periodStart && preview.periodEnd ? `${fmtDay(istDay(preview.periodStart))} – ${fmtDay(istDay(preview.periodEnd))}` : "—"],
                ["Deposit", fmtDay(istDay(preview.depositDate), true)],
                ["Rows · orders", `${preview.rowCount} · ${preview.orderCount}`],
                ["Status", preview.alreadyImportedAt ? `Imported ${fmtDay(istDay(preview.alreadyImportedAt))}` : "New"],
              ].map(([label, text]) => (
                <div key={label} className="rounded-lg border border-slate-200 px-3.5 py-3">
                  <p className="text-[11px] font-bold uppercase text-slate-500">{label}</p>
                  <p className="mt-1 text-[15px] font-black text-slate-900">{text}</p>
                </div>
              ))}
            </div>

            {(preview.alreadyImportedAt || preview.replacesManual) && (
              <p className="px-4 py-3 rounded-lg bg-slate-50 text-[13px] text-slate-600">
                {preview.replacesManual
                  ? "You entered this payout by hand earlier. Importing adds the full breakdown to that entry and keeps your note, so nothing is counted twice."
                  : "This settlement was imported before. Importing again replaces it, so nothing is counted twice."}
              </p>
            )}

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3.5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                {[
                  ["Gross", preview.salesPaise],
                  ["Fees & adjustments", preview.feesPaise],
                  ["Refunds", preview.refundsPaise],
                  ["Net payout", preview.netPaise],
                ].map(([label, paise], i) => (
                  <div key={label as string}>
                    <p className="text-xs font-semibold text-slate-500">{label}</p>
                    <p className={`text-lg font-black ${i === 3 ? "text-green-600" : (paise as number) < 0 ? "text-red-600" : "text-slate-900"}`}>
                      {(paise as number) < 0 ? "−" : ""}
                      {rupees(paise as number)}
                    </p>
                  </div>
                ))}
              </div>
              <p
                className={`mt-3 pt-3 border-t border-slate-200 flex items-center gap-2 text-[13px] font-bold ${
                  preview.matches ? "text-green-600" : "text-red-600"
                }`}
              >
                {preview.matches ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                {preview.matches
                  ? `Rows add up to Amazon's own total for this settlement (${rupees(preview.fileTotalPaise)})`
                  : `Rows add up to ${rupees(preview.netPaise)} but Amazon's total is ${rupees(preview.fileTotalPaise)}. This file can't be imported.`}
              </p>
            </div>

            <div>
              <p className="text-[13px] font-black text-slate-900 mb-2">First rows</p>
              <div className="rounded-lg border border-slate-200 overflow-x-auto">
                <table className="w-full text-[13px] whitespace-nowrap">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-[11px] font-black uppercase tracking-wide text-slate-500">
                      <th className="px-3.5 py-2.5">Posted</th>
                      <th className="px-3.5 py-2.5">Type</th>
                      <th className="px-3.5 py-2.5">Order ID</th>
                      <th className="px-3.5 py-2.5">Description</th>
                      <th className="px-3.5 py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sampleRows.map((r, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3.5 py-2.5 text-slate-700">{r.postedAt ? fmtDay(istDay(r.postedAt)) : "—"}</td>
                        <td className="px-3.5 py-2.5 text-slate-700">{r.transactionType}</td>
                        <td className="px-3.5 py-2.5 text-slate-700 tabular-nums">{r.orderId || "—"}</td>
                        <td className="px-3.5 py-2.5 text-slate-700">{r.amountDescription}</td>
                        <td className={`px-3.5 py-2.5 text-right font-bold tabular-nums ${r.amountPaise < 0 ? "text-red-600" : "text-slate-900"}`}>
                          {r.amountPaise < 0 ? "−" : ""}
                          {rupees(r.amountPaise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function VoidModal({ entry, onClose, onDone }: { entry: Entry; onClose: () => void; onDone: (message: string) => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const d = describe({
    key: entry._id,
    day: istDay(entry.occurredAt),
    kind: "entry",
    amountPaise: entry.amountPaise,
    counted: true,
    entry,
    enteredAt: entry.createdAt,
  });

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await api(`/entries/${entry._id}/void`, { method: "POST", body: JSON.stringify({ reason }) });
      onDone("Entry voided");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Void this entry?"
      subtitle="It leaves the timeline and totals. The record and your reason stay in Activity Logs."
      onClose={onClose}
      footer={
        <>
          <span />
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-bold">
              Keep it
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={reason.trim().length < 3 || busy}
              className="px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? "Voiding…" : "Void entry"}
            </button>
          </div>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-slate-200">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{d.title}</p>
            <p className="text-xs text-slate-500">{fmtDay(istDay(entry.occurredAt), true)}</p>
          </div>
          <p className={`text-[15px] font-black tabular-nums ${entry.amountPaise < 0 ? "text-red-600" : "text-green-600"}`}>
            {signed(entry.amountPaise)}
          </p>
        </div>
        <label className="block">
          <span className={LABEL}>Why?</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="e.g. Entered twice, wrong amount"
            className={FIELD}
          />
        </label>
        {error && <p className="text-sm font-bold text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}

/* =========================
   SEARCH RESULTS (across all dates)
========================= */
function SearchResults({
  query,
  refreshKey,
  onEdit,
  onVoid,
  onClear,
}: {
  query: string;
  refreshKey: number;
  onEdit: (entry: Entry) => void;
  onVoid: (entry: Entry) => void;
  onClear: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const PAGE = 50;

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setEntries([]);
      setTotal(0);
      return;
    }
    let alive = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      api<{ entries: Entry[]; totalCount: number }>(`/search?q=${encodeURIComponent(q)}&limit=${PAGE}`)
        .then((res) => {
          if (!alive) return;
          setEntries(res.entries || []);
          setTotal(res.totalCount || 0);
          setLoading(false);
        })
        .catch((err: Error) => {
          if (!alive) return;
          setError(err.message || "Failed to search entries");
          setLoading(false);
        });
    }, 250);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query, refreshKey]);

  // The server sends 50 at a time; this appends the next page.
  const loadMore = async () => {
    setLoadingMore(true);
    setError("");
    try {
      const res = await api<{ entries: Entry[]; totalCount: number }>(
        `/search?q=${encodeURIComponent(query.trim())}&limit=${PAGE}&skip=${entries.length}`
      );
      setEntries((list) => [...list, ...(res.entries || [])]);
      setTotal(res.totalCount || 0);
    } catch (err) {
      setError((err as Error).message || "Failed to search entries");
    }
    setLoadingMore(false);
  };

  const totalExpense = useMemo(
    () => entries.filter((e) => e.type === "expense" || e.type === "refund").reduce((s, e) => s + Math.abs(e.amountPaise), 0),
    [entries]
  );
  const totalIncome = useMemo(
    () => entries.filter((e) => e.type === "income" || e.type === "payout").reduce((s, e) => s + Math.abs(e.amountPaise), 0),
    [entries]
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-slate-900">Search Results</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              "{query.trim()}"
            </span>
            <span className="text-xs font-semibold text-slate-500">
              (
              {loading
                ? "Searching..."
                : total > entries.length
                ? `showing ${entries.length} of ${total} across all dates`
                : `${total} found across all dates`}
              )
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Matches notes, vendor and invoice references, settlement IDs and receipt file names — on any date.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          {entries.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
              {totalExpense > 0 && (
                <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                  Expenses shown: −{rupees(totalExpense)}
                </span>
              )}
              {totalIncome > 0 && (
                <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Inflow shown: +{rupees(totalIncome)}
                </span>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <X className="w-3.5 h-3.5" />
            Clear Search
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-sm font-semibold shadow-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          Searching transactions...
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-red-200 p-6 text-center text-red-600 text-sm font-bold shadow-sm">
          {error}
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No matching entries found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            No transactions matching <strong className="text-slate-700">"{query.trim()}"</strong> were found across any date. Try searching for vendor names, invoice numbers, or note terms (like "raw material", "badge machine").
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-left text-[11px] font-black uppercase tracking-wider text-slate-500 whitespace-nowrap">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Details / Note</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Attachment</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => {
                const isOut = entry.type === "expense" || entry.type === "refund";
                return (
                  <tr key={entry._id} className="hover:bg-slate-50/75 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {fmtDay(istDay(entry.occurredAt), true)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`${CHIP} ${
                          entry.type === "expense"
                            ? "bg-rose-100 text-rose-800"
                            : entry.type === "income"
                            ? "bg-emerald-100 text-emerald-800"
                            : entry.type === "payout"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {entry.type === "payout" ? "Amazon payout" : entry.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 min-w-[200px]">
                      <p className="font-semibold text-slate-900">{entry.note || "—"}</p>
                      {entry.createdBy?.name && (
                        <p className="text-[11px] text-slate-500">by {entry.createdBy.name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono text-xs">
                      {entry.orderRef || entry.settlementId || (entry.utr ? null : "—")}
                      {entry.utr && <span className="block text-[11px] text-slate-400">UTR {entry.utr}</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap capitalize text-slate-600 text-xs">
                      {entry.channel}
                    </td>
                    <td
                      className={`px-4 py-3 text-right whitespace-nowrap font-black tabular-nums ${
                        isOut ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {signed(isOut ? -Math.abs(entry.amountPaise) : Math.abs(entry.amountPaise))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {docsOf(entry).length ? (
                        <div className="flex flex-col items-start gap-1">
                          {docsOf(entry).map((doc, i) => (
                            <a
                              key={doc.url}
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition"
                              title={doc.name || "View document"}
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                              <span className="max-w-[140px] truncate">{doc.name || `Document ${i + 1}`}</span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit(entry)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                          title="Edit details"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onVoid(entry)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Void entry"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {total > entries.length && (
            <div className="border-t border-slate-200 p-3 text-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : `Load ${Math.min(PAGE, total - entries.length)} more`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================
   PAGE
========================= */
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "timeline", label: "Timeline" },
  { key: "settlements", label: "Amazon settlements" },
  { key: "website", label: "Website orders" },
];

// isSuperAdmin only decides whether the bank panel is shown; the server enforces it.
export default function AdminRevenue({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [rangeKey, setRangeKey] = useState("month");
  const range = useMemo(() => rangeFor(rangeKey), [rangeKey]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [entryModal, setEntryModal] = useState<{ entry?: Entry; preset?: Preset } | null>(null);
  const [bankModal, setBankModal] = useState<{ check: BankCheck | null } | null>(null);
  const [voiding, setVoiding] = useState<Entry | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const finished = (message: string) => {
    setEntryModal(null);
    setBankModal(null);
    setVoiding(null);
    setUploadOpen(false);
    setToast(message);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <div className="inline-flex flex-wrap self-start rounded-lg border border-slate-200 bg-white p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                setSearchQuery("");
              }}
              className={`px-3 sm:px-4 py-1.5 text-sm font-bold rounded-md transition ${
                tab === t.key && !searchQuery.trim() ? "bg-slate-900 text-white" : "hover:bg-slate-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 xl:justify-end">
          {/* 🔍 Search Input across all dates */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search raw material, note, ref..."
              className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <label className="relative">
            <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={rangeKey}
              onChange={(e) => setRangeKey(e.target.value)}
              aria-label="Date range"
              className="pl-9 pr-3 py-2 border rounded-lg text-sm font-semibold"
            >
              {RANGES.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-bold"
          >
            <Upload className="w-4 h-4" />
            Upload Amazon report
          </button>
          <button
            type="button"
            onClick={() => setEntryModal({})}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold hover:bg-gray-700"
          >
            <Plus className="w-4 h-4" />
            Manual entry
          </button>
        </div>
      </div>

      {searchQuery.trim() ? (
        <SearchResults
          query={searchQuery}
          refreshKey={refreshKey}
          onEdit={(entry) => setEntryModal({ entry })}
          onVoid={setVoiding}
          onClear={() => setSearchQuery("")}
        />
      ) : (
        <>
          {tab === "overview" && (
            <Overview
              range={range}
              rangeKey={rangeKey}
              refreshKey={refreshKey}
              onTab={setTab}
              onUpload={() => setUploadOpen(true)}
              onManual={() => setEntryModal({})}
              showBank={isSuperAdmin}
              onBank={(check) => setBankModal({ check })}
              onBook={(preset) => setEntryModal({ preset })}
            />
          )}
          {tab === "timeline" && (
            <Timeline range={range} refreshKey={refreshKey} onEdit={(entry) => setEntryModal({ entry })} onVoid={setVoiding} />
          )}
          {tab === "settlements" && <Settlements range={range} refreshKey={refreshKey} onUpload={() => setUploadOpen(true)} />}
          {tab === "website" && <WebsiteOrders range={range} refreshKey={refreshKey} />}
        </>
      )}

      {entryModal && (
        <EntryModal entry={entryModal.entry} preset={entryModal.preset} onClose={() => setEntryModal(null)} onSaved={finished} />
      )}
      {bankModal && <BankModal check={bankModal.check} onClose={() => setBankModal(null)} onSaved={finished} />}
      {voiding && <VoidModal entry={voiding} onClose={() => setVoiding(null)} onDone={finished} />}
      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onImported={finished} />}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white admin-zoho-keep-white text-sm font-bold shadow-lg"
        >
          <Check className="w-4 h-4" style={{ color: "#4ade80" }} />
          {toast}
        </div>
      )}
    </div>
  );
}
