import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import AdminBackButton from "./AdminBackButton";
import { API_BASE_URL } from "../config/api";
import { formatDateTime } from "../utils/formatDate";

type ActivityLog = {
  _id: string;
  actorName?: string;
  actorEmail?: string;
  actorRole: string;
  action: string;
  category: string;
  status: "success" | "failure";
  message?: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  meta?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  method?: string;
  path?: string;
  createdAt: string;
};

type FilterOptions = {
  actions: string[];
  actors: string[];
  categories: string[];
  roles: string[];
  statuses: string[];
};

type Filters = {
  q: string;
  category: string;
  action: string;
  actorEmail: string;
  actorRole: string;
  status: string;
  from: string;
  to: string;
};

const EMPTY_FILTERS: Filters = {
  q: "",
  category: "",
  action: "",
  actorEmail: "",
  actorRole: "",
  status: "",
  from: "",
  to: "",
};

const PAGE_SIZE = 50;

const CATEGORY_STYLES: Record<string, string> = {
  auth: "bg-sky-100 text-sky-700",
  user: "bg-indigo-100 text-indigo-700",
  product: "bg-amber-100 text-amber-700",
  order: "bg-emerald-100 text-emerald-700",
  promo: "bg-purple-100 text-purple-700",
  influencer: "bg-pink-100 text-pink-700",
  review: "bg-teal-100 text-teal-700",
  cart: "bg-orange-100 text-orange-700",
  support: "bg-cyan-100 text-cyan-700",
  settings: "bg-slate-200 text-slate-700",
  other: "bg-slate-100 text-slate-600",
};

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-red-50 text-red-600 border-red-200",
  influencer: "bg-pink-50 text-pink-600 border-pink-200",
  user: "bg-slate-50 text-slate-600 border-slate-200",
  guest: "bg-slate-50 text-slate-400 border-slate-200",
  system: "bg-violet-50 text-violet-600 border-violet-200",
};

export default function AdminLogs() {
  const token =
    localStorage.getItem("adminToken") || localStorage.getItem("token");

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [options, setOptions] = useState<FilterOptions>({
    actions: [],
    actors: [],
    categories: [],
    roles: [],
    statuses: [],
  });

  // `filters` is what the user is editing; `applied` is what the last request
  // used. Typing in the search box must not fire a request per keystroke.
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  );

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/logs/filters`, { headers: authHeaders })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setOptions(data))
      .catch(console.error);
  }, [authHeaders]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    (Object.keys(applied) as (keyof Filters)[]).forEach((key) => {
      const value = applied[key].trim();
      if (value) params.set(key, value);
    });

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/logs?${params.toString()}`,
        { headers: authHeaders },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to load logs");

      setLogs(Array.isArray(data.logs) ? data.logs : []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (e: any) {
      setError(e.message || "Failed to load logs");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [applied, page, authHeaders]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const applyFilters = () => {
    setPage(1);
    setApplied(filters);
  };

  const resetFilters = () => {
    setPage(1);
    setFilters(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
  };

  const activeFilterCount = (Object.keys(applied) as (keyof Filters)[]).filter(
    (k) => applied[k].trim(),
  ).length;

  const setField = (key: keyof Filters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }));

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-10">
      <div className="max-w-[1400px] mx-auto">
        <AdminBackButton />

        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black">
              Activity Logs
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-500">
              Every login, admin change, order and review — newest first.
            </p>
          </div>
          <div className="text-sm text-slate-500">
            {loading ? "Loading…" : `${total.toLocaleString("en-IN")} event(s)`}
          </div>
        </div>

        {/* ================= FILTERS ================= */}
        <div className="bg-white rounded-xl shadow border p-4 md:p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                Search
              </label>
              <input
                type="text"
                value={filters.q}
                onChange={(e) => setField("q", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder="Message, email, action, target…"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => setField("category", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white capitalize focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">All</option>
                {options.categories.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) => setField("action", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">All</option>
                {options.actions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                User
              </label>
              <select
                value={filters.actorEmail}
                onChange={(e) => setField("actorEmail", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Everyone</option>
                {options.actors.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                Role
              </label>
              <select
                value={filters.actorRole}
                onChange={(e) => setField("actorRole", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white capitalize focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">All</option>
                {options.roles.map((r) => (
                  <option key={r} value={r} className="capitalize">
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setField("status", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white capitalize focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">All</option>
                {options.statuses.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                From
              </label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setField("from", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                To
              </label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setField("to", e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              {activeFilterCount
                ? `${activeFilterCount} filter(s) applied`
                : "No filters applied"}
            </span>
            <div className="flex gap-2">
              <button
                onClick={resetFilters}
                className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Reset
              </button>
              <button
                onClick={applyFilters}
                className="px-5 py-2 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* ================= TABLE ================= */}
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-xs md:text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3 text-left">When</th>
                  <th className="p-3 text-left">Who</th>
                  <th className="p-3 text-left">Role</th>
                  <th className="p-3 text-left">Action</th>
                  <th className="p-3 text-left">Category</th>
                  <th className="p-3 text-left">Details</th>
                  <th className="p-3 text-left">IP</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => {
                  const isOpen = expandedId === log._id;
                  const hasMeta = log.meta && Object.keys(log.meta).length > 0;

                  return (
                    <Fragment key={log._id}>
                      <tr
                        onClick={() =>
                          setExpandedId(isOpen ? null : log._id)
                        }
                        className="border-t hover:bg-slate-50 cursor-pointer"
                      >
                        <td className="p-3 whitespace-nowrap text-slate-500">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-slate-800">
                            {log.actorName || "—"}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {log.actorEmail || "unknown"}
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[11px] font-bold capitalize ${
                              ROLE_STYLES[log.actorRole] || ROLE_STYLES.guest
                            }`}
                          >
                            {log.actorRole}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-700">
                          {log.action}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                              CATEGORY_STYLES[log.category] ||
                              CATEGORY_STYLES.other
                            }`}
                          >
                            {log.category}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700 max-w-[340px]">
                          <div className="truncate">{log.message || "—"}</div>
                          {log.targetLabel && (
                            <div className="text-[11px] text-slate-400 truncate">
                              {log.targetType}: {log.targetLabel}
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-400">
                          {log.ip || "—"}
                        </td>
                        <td className="p-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              log.status === "success"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={8} className="px-4 pb-4 pt-0">
                            <div className="rounded-lg border border-slate-200 bg-white p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1 text-xs">
                                <p className="text-slate-400 font-bold uppercase tracking-wide text-[10px]">
                                  Request
                                </p>
                                <p>
                                  <span className="text-slate-400">Method:</span>{" "}
                                  {log.method || "—"}
                                </p>
                                <p className="break-all">
                                  <span className="text-slate-400">Path:</span>{" "}
                                  {log.path || "—"}
                                </p>
                                <p className="break-all">
                                  <span className="text-slate-400">Agent:</span>{" "}
                                  {log.userAgent || "—"}
                                </p>
                              </div>
                              <div className="space-y-1 text-xs">
                                <p className="text-slate-400 font-bold uppercase tracking-wide text-[10px]">
                                  Metadata
                                </p>
                                {hasMeta ? (
                                  <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto text-[11px] leading-relaxed">
                                    {JSON.stringify(log.meta, null, 2)}
                                  </pre>
                                ) : (
                                  <p className="text-slate-400">No extra detail</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}

                {!loading && logs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      {error || "No activity matches these filters"}
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Loading activity…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ================= PAGINATION ================= */}
          {pages > 1 && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t bg-slate-50">
              <span className="text-xs text-slate-500">
                Page {page} of {pages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border hover:bg-slate-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page >= pages || loading}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border hover:bg-slate-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {error && logs.length > 0 && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
}
