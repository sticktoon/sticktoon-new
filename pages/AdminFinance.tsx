import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Download,
  Filter,
  IndianRupee,
  Landmark,
  Layers,
  Lock,
  Pencil,
  PieChart,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

/* ==========================================================================
   TYPES & CONSTANTS
========================================================================== */
export type FinanceType = "income" | "expense" | "capital" | "transfer";
export type Ledger = "business" | "personal";

export type FinanceCategory =
  | "sales"
  | "amazon_payout"
  | "raw_material"
  | "printing_press"
  | "courier_shipping"
  | "packaging"
  | "marketing_ads"
  | "tools_software"
  | "office_equipment"
  | "partner_payout"
  | "capital_infusion"
  | "refund"
  | "miscellaneous"
  | "salary_income"
  | "food_dining"
  | "rent_housing"
  | "bills_utilities"
  | "travel_transport"
  | "shopping"
  | "health_medical"
  | "education"
  | "investment"
  | "loan_emi"
  | "family_gifts"
  | "entertainment";

export type PaymentMode =
  | "upi"
  | "bank_transfer"
  | "cash"
  | "card"
  | "amazon"
  | "razorpay"
  | "other";

export interface FinanceTransaction {
  _id: string;
  ledger?: Ledger;
  type: FinanceType;
  category: FinanceCategory;
  amountPaise: number;
  occurredAt: string;
  title: string;
  note?: string;
  utr?: string | null;
  paymentMode: PaymentMode;
  source: "manual" | "statement_import" | "system";
  createdAt: string;
  createdBy?: { _id: string; name: string; email: string } | null;
}

export interface FinanceSummary {
  range: { from: string; to: string };
  pnl: {
    income: number;
    expense: number;
    netProfit: number;
    profitMarginPercent: number;
    capital: number;
    transfer: number;
  };
  balance: {
    allTimeIncome: number;
    allTimeExpense: number;
    allTimeCapital: number;
    cashBalance: number;
  };
  categoryBreakdown: Array<{
    category: FinanceCategory;
    total: number;
    count: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    income: number;
    expense: number;
    capital: number;
  }>;
}

const CATEGORY_LABELS: Record<FinanceCategory, string> = {
  sales: "Website / Direct Sales",
  amazon_payout: "Amazon Settlement",
  raw_material: "Raw Material",
  printing_press: "Printing Press & Production",
  courier_shipping: "Courier & Shipping",
  packaging: "Packaging Material",
  marketing_ads: "Marketing & Ads",
  tools_software: "Software & Subscriptions",
  office_equipment: "Equipment & Hardware",
  partner_payout: "Partner / Profit Payout",
  capital_infusion: "Founder Capital Infusion",
  refund: "Customer Refund",
  miscellaneous: "Miscellaneous",
  salary_income: "Salary / Personal Income",
  food_dining: "Food & Dining",
  rent_housing: "Rent & Housing",
  bills_utilities: "Bills & Recharges",
  travel_transport: "Travel & Fuel",
  shopping: "Shopping",
  health_medical: "Health & Medical",
  education: "Education & Courses",
  investment: "Investments / SIP / Savings",
  loan_emi: "Loan / EMI",
  family_gifts: "Family & Gifts",
  entertainment: "Entertainment & Subscriptions",
};

const LEDGER_CATEGORIES: Record<Ledger, FinanceCategory[]> = {
  business: [
    "sales", "amazon_payout", "raw_material", "printing_press", "courier_shipping", "packaging",
    "marketing_ads", "tools_software", "office_equipment", "partner_payout", "capital_infusion",
    "refund", "miscellaneous",
  ],
  personal: [
    "salary_income", "partner_payout", "food_dining", "rent_housing", "bills_utilities",
    "travel_transport", "shopping", "health_medical", "education", "investment", "loan_emi",
    "family_gifts", "entertainment", "capital_infusion", "refund", "miscellaneous",
  ],
};

const LEDGER_LABELS: Record<Ledger, string> = { business: "StickToon", personal: "Personal" };

function defaultCategory(ledger: Ledger, type: FinanceType): FinanceCategory {
  if (type === "capital") return "capital_infusion";
  if (type === "transfer") return "miscellaneous";
  if (type === "income") return ledger === "personal" ? "salary_income" : "sales";
  return ledger === "personal" ? "food_dining" : "raw_material";
}

const CATEGORY_COLORS: Record<FinanceCategory, string> = {
  sales: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amazon_payout: "bg-amber-50 text-amber-700 border-amber-200",
  raw_material: "bg-rose-50 text-rose-700 border-rose-200",
  printing_press: "bg-orange-50 text-orange-700 border-orange-200",
  courier_shipping: "bg-blue-50 text-blue-700 border-blue-200",
  packaging: "bg-cyan-50 text-cyan-700 border-cyan-200",
  marketing_ads: "bg-purple-50 text-purple-700 border-purple-200",
  tools_software: "bg-indigo-50 text-indigo-700 border-indigo-200",
  office_equipment: "bg-slate-100 text-slate-700 border-slate-300",
  partner_payout: "bg-pink-50 text-pink-700 border-pink-200",
  capital_infusion: "bg-violet-50 text-violet-700 border-violet-200",
  refund: "bg-red-50 text-red-700 border-red-200",
  miscellaneous: "bg-gray-100 text-gray-700 border-gray-300",
  salary_income: "bg-emerald-50 text-emerald-700 border-emerald-200",
  food_dining: "bg-orange-50 text-orange-700 border-orange-200",
  rent_housing: "bg-stone-100 text-stone-700 border-stone-300",
  bills_utilities: "bg-sky-50 text-sky-700 border-sky-200",
  travel_transport: "bg-blue-50 text-blue-700 border-blue-200",
  shopping: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  health_medical: "bg-red-50 text-red-700 border-red-200",
  education: "bg-teal-50 text-teal-700 border-teal-200",
  investment: "bg-lime-50 text-lime-700 border-lime-200",
  loan_emi: "bg-rose-50 text-rose-700 border-rose-200",
  family_gifts: "bg-pink-50 text-pink-700 border-pink-200",
  entertainment: "bg-purple-50 text-purple-700 border-purple-200",
};

const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  upi: "UPI",
  bank_transfer: "Bank Transfer (NEFT/IMPS)",
  cash: "Cash",
  card: "Credit / Debit Card",
  amazon: "Amazon Payout",
  razorpay: "Razorpay Gateway",
  other: "Other",
};

/* ==========================================================================
   HELPERS
========================================================================== */
function formatInr(paise: number, showSign = false): string {
  const rupees = paise / 100;
  const absFormatted = Math.abs(rupees).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });

  if (showSign) {
    if (rupees > 0) return `+₹${absFormatted}`;
    if (rupees < 0) return `-₹${absFormatted}`;
    return `₹${absFormatted}`;
  }
  return `₹${absFormatted}`;
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

function getTodayYmd(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthStartYmd(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function getLastMonthRange(): { from: string; to: string } {
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfPrevMonth = new Date(firstOfThisMonth.getTime() - 86400000);
  const year = lastOfPrevMonth.getFullYear();
  const month = String(lastOfPrevMonth.getMonth() + 1).padStart(2, "0");
  const day = String(lastOfPrevMonth.getDate()).padStart(2, "0");
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${day}`,
  };
}

function getThreeMonthsAgoStartYmd(): string {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const year = threeMonthsAgo.getFullYear();
  const month = String(threeMonthsAgo.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

/* ==========================================================================
   API FETCH WRAPPER
========================================================================== */
async function fetchFinanceApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token || ""}`,
  };
  if (typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE_URL}/api/admin/finance${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `API error (${res.status})`);
  }
  return data;
}

/* ==========================================================================
   MAIN COMPONENT
========================================================================== */
export default function AdminFinance() {
  // Preset Range state
  const [rangePreset, setRangePreset] = useState<
    "this-month" | "last-month" | "last-3m" | "fy" | "all" | "custom"
  >("this-month");
  const [customFrom, setCustomFrom] = useState<string>(getMonthStartYmd());
  const [customTo, setCustomTo] = useState<string>(getTodayYmd());

  // Which book: StickToon (business), Personal, or both
  const [ledgerView, setLedgerView] = useState<Ledger | "all">("business");

  // Filter & Search states
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data states
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [totalTxCount, setTotalTxCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTx, setEditingTx] = useState<FinanceTransaction | null>(null);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [formData, setFormData] = useState<{
    ledger: Ledger;
    type: FinanceType;
    category: FinanceCategory;
    amountRupees: string;
    occurredAt: string;
    title: string;
    note: string;
    utr: string;
    paymentMode: PaymentMode;
  }>({
    ledger: "business",
    type: "expense",
    category: "raw_material",
    amountRupees: "",
    occurredAt: getTodayYmd(),
    title: "",
    note: "",
    utr: "",
    paymentMode: "upi",
  });

  // Calculate active date range
  const activeRange = useMemo(() => {
    const today = getTodayYmd();
    if (rangePreset === "this-month") {
      return { from: getMonthStartYmd(), to: today };
    }
    if (rangePreset === "last-month") {
      return getLastMonthRange();
    }
    if (rangePreset === "last-3m") {
      return { from: getThreeMonthsAgoStartYmd(), to: today };
    }
    if (rangePreset === "fy") {
      const now = new Date();
      const currentYear = now.getFullYear();
      // Indian Financial Year starts April 1st
      const fyStartYear = now.getMonth() >= 3 ? currentYear : currentYear - 1;
      return { from: `${fyStartYear}-04-01`, to: today };
    }
    if (rangePreset === "all") {
      return { from: "2024-01-01", to: today };
    }
    return { from: customFrom, to: customTo };
  }, [rangePreset, customFrom, customTo]);

  // Load summary and transactions
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        from: activeRange.from,
        to: activeRange.to,
        ledger: ledgerView,
      });

      const summaryData = await fetchFinanceApi<FinanceSummary>(
        `/summary?${queryParams.toString()}`
      );
      setSummary(summaryData);

      const txParams = new URLSearchParams({
        from: activeRange.from,
        to: activeRange.to,
        page: String(page),
        limit: "50",
        ledger: ledgerView,
      });
      if (typeFilter !== "all") txParams.set("type", typeFilter);
      if (categoryFilter !== "all") txParams.set("category", categoryFilter);
      if (searchQuery.trim()) txParams.set("search", searchQuery.trim());

      const txData = await fetchFinanceApi<{
        transactions: FinanceTransaction[];
        pagination: { total: number };
      }>(`/transactions?${txParams.toString()}`);

      setTransactions(txData.transactions || []);
      setTotalTxCount(txData.pagination?.total || 0);
    } catch (err: any) {
      console.error("Failed to load finance data:", err);
      setError(err.message || "Failed to load financial records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeRange.from, activeRange.to, page, typeFilter, categoryFilter, ledgerView]);

  // Handle Search on Enter or debounce
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  // Open modal for Create
  const handleOpenCreateModal = (defaultType?: FinanceType) => {
    setEditingTx(null);
    setFormError(null);
    const ledger: Ledger = ledgerView === "all" ? "business" : ledgerView;
    const type = defaultType || "expense";
    setFormData({
      ledger,
      type,
      category: defaultCategory(ledger, type),
      amountRupees: "",
      occurredAt: getTodayYmd(),
      title: "",
      note: "",
      utr: "",
      paymentMode: defaultType === "capital" ? "bank_transfer" : "upi",
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (tx: FinanceTransaction) => {
    setEditingTx(tx);
    setFormError(null);
    setFormData({
      ledger: tx.ledger || "business",
      type: tx.type,
      category: tx.category,
      amountRupees: (tx.amountPaise / 100).toString(),
      occurredAt: tx.occurredAt.slice(0, 10),
      title: tx.title,
      note: tx.note || "",
      utr: tx.utr || "",
      paymentMode: tx.paymentMode,
    });
    setIsModalOpen(true);
  };

  // Submit modal form
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amountNum = parseFloat(formData.amountRupees);
    if (!amountNum || amountNum <= 0) {
      setFormError("Please enter a valid positive amount in ₹");
      return;
    }
    if (!formData.title.trim()) {
      setFormError("Please enter a title or description");
      return;
    }

    try {
      setFormSubmitting(true);
      const payload = {
        ledger: formData.ledger,
        type: formData.type,
        category: formData.category,
        amountPaise: Math.round(amountNum * 100),
        occurredAt: new Date(formData.occurredAt).toISOString(),
        title: formData.title.trim(),
        note: formData.note.trim(),
        utr: formData.utr.trim() || null,
        paymentMode: formData.paymentMode,
      };

      if (editingTx) {
        await fetchFinanceApi(`/transactions/${editingTx._id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await fetchFinanceApi("/transactions", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || "Failed to save transaction");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      await fetchFinanceApi(`/transactions/${id}`, { method: "DELETE" });
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete transaction");
    }
  };

  // Quick Seed Capital button for Anish (₹2,70,000 + ₹64,000)
  const handleQuickAddCapitalPresets = async () => {
    const confirmAdd = window.confirm(
      "Quick Add Founder Capital:\nThis will add 2 Capital Infusion entries:\n1) ₹2,70,000 (Initial Capital)\n2) ₹64,000 (Supplementary Capital)\n\nDo you want to proceed?"
    );
    if (!confirmAdd) return;

    try {
      setLoading(true);
      await fetchFinanceApi("/transactions/bulk", {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              type: "capital",
              category: "capital_infusion",
              amountPaise: 27000000,
              occurredAt: new Date().toISOString(),
              title: "Founder Capital Infusion (Anish)",
              note: "Initial core capital investment for StickToon inventory & operations",
              paymentMode: "bank_transfer",
            },
            {
              type: "capital",
              category: "capital_infusion",
              amountPaise: 6400000,
              occurredAt: new Date().toISOString(),
              title: "Founder Supplementary Capital (Anish)",
              note: "Working capital infusion",
              paymentMode: "bank_transfer",
            },
          ],
        }),
      });
      alert("Successfully recorded ₹2,70,000 and ₹64,000 Capital Infusions!");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to add capital entries");
      setLoading(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!transactions.length) {
      alert("No transactions to export for the selected filters.");
      return;
    }

    const headers = [
      "Date",
      "Ledger",
      "Type",
      "Category",
      "Title",
      "Amount (₹)",
      "Payment Mode",
      "UTR / Ref",
      "Notes",
    ];

    const rows = transactions.map((t) => [
      t.occurredAt.slice(0, 10),
      LEDGER_LABELS[t.ledger || "business"],
      t.type,
      CATEGORY_LABELS[t.category] || t.category,
      `"${(t.title || "").replace(/"/g, '""')}"`,
      (t.amountPaise / 100).toFixed(2),
      t.paymentMode,
      t.utr || "",
      `"${(t.note || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `finance_${ledgerView}_${activeRange.from}_to_${activeRange.to}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4">
      {/* ====================================================================
          SUPER ADMIN PRIVACY NOTICE BANNER
      ==================================================================== */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-amber-400/10 border border-amber-400/20 text-amber-400 rounded-xl">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {ledgerView === "personal" ? "Personal Finance" : ledgerView === "all" ? "Personal + StickToon Finance" : "StickToon Finance & Treasury"}
                </h1>
                <span className="bg-amber-400/20 text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-amber-400/30">
                  Super Admin Only
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                {ledgerView === "personal"
                  ? "Private record of your own income, spending, savings and EMIs."
                  : "Private ledger for business inflows, expenses, profit/loss, and founder capital reconciliation."}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleOpenCreateModal("expense")}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow transition"
            >
              <TrendingDown className="w-4 h-4" />
              + Add Expense
            </button>
            <button
              onClick={() => handleOpenCreateModal("income")}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow transition"
            >
              <TrendingUp className="w-4 h-4" />
              + Add Income
            </button>
            <button
              onClick={() => handleOpenCreateModal("capital")}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow transition"
            >
              <Landmark className="w-4 h-4" />
              + Add Capital
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================================
          LEDGER SWITCH
      ==================================================================== */}
      <div className="flex items-center gap-1.5 bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200/80 w-full sm:w-fit">
        {(["business", "personal", "all"] as const).map((l) => (
          <button
            key={l}
            onClick={() => {
              setLedgerView(l);
              setCategoryFilter("all");
              setPage(1);
            }}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
              ledgerView === l ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {l === "all" ? "Combined" : LEDGER_LABELS[l]}
          </button>
        ))}
      </div>

      {/* ====================================================================
          DATE RANGE SELECTOR BAR
      ==================================================================== */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Preset Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 hidden lg:inline">
            Period:
          </span>
          {[
            { id: "this-month", label: "This Month" },
            { id: "last-month", label: "Last Month" },
            { id: "last-3m", label: "Last 3 Months" },
            { id: "fy", label: "This FY" },
            { id: "all", label: "All Time" },
            { id: "custom", label: "Custom" },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setRangePreset(preset.id as any);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition whitespace-nowrap ${
                rangePreset === preset.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Date Display / Custom Inputs & Refresh */}
        <div className="flex items-center gap-3">
          {rangePreset === "custom" ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => {
                  setCustomFrom(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => {
                  setCustomTo(e.target.value);
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {formatDate(activeRange.from)} &rarr; {formatDate(activeRange.to)}
              </span>
            </div>
          )}

          <button
            onClick={() => loadData()}
            title="Refresh Data"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>

          <button
            onClick={handleExportCsv}
            title="Export filtered records as CSV"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition flex items-center gap-1 text-xs font-semibold"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          FOUNDER CAPITAL CALLOUT (IF NEEDED)
      ==================================================================== */}
      {ledgerView === "business" && summary && summary.balance.allTimeCapital === 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-indigo-900">
                Record Founder Capital Infusion (₹2,70,000 + ₹64,000)
              </h4>
              <p className="text-xs text-indigo-700">
                No founder capital is recorded yet. Click below to add the ₹2.7L and ₹64K capital infusions into the treasury.
              </p>
            </div>
          </div>
          <button
            onClick={handleQuickAddCapitalPresets}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition whitespace-nowrap"
          >
            Quick Add Capital
          </button>
        </div>
      )}

      {/* ====================================================================
          CORE KPI METRICS CARDS
      ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Inflow (Income) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 hover:border-emerald-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Inflow (Sales)
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {formatInr(summary?.pnl.income || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Revenue & Amazon payouts in this period
            </p>
          </div>
        </div>

        {/* 2. Outflow (Expenses) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 hover:border-rose-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Outflow (Expenses)
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-600">
              {formatInr(summary?.pnl.expense || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Production, courier, packaging & tools
            </p>
          </div>
        </div>

        {/* 3. Net P&L (Profit / Loss) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 hover:border-indigo-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Net Profit (P&L)
            </span>
            <div
              className={`p-2 rounded-xl ${
                (summary?.pnl.netProfit || 0) >= 0
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-rose-50 text-rose-600"
              }`}
            >
              {(summary?.pnl.netProfit || 0) >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-black ${
                (summary?.pnl.netProfit || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {formatInr(summary?.pnl.netProfit || 0, true)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <span>Margin:</span>
              <span
                className={`font-bold ${
                  (summary?.pnl.profitMarginPercent || 0) >= 0
                    ? "text-emerald-600"
                    : "text-rose-600"
                }`}
              >
                {summary?.pnl.profitMarginPercent?.toFixed(1) || "0.0"}%
              </span>
              <span className="text-slate-400">for period</span>
            </div>
          </div>
        </div>

        {/* 4. Cash Balance (All-Time Liquid) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 hover:border-violet-200 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Net Treasury Balance
            </span>
            <div className="p-2 bg-violet-50 text-violet-600 rounded-xl">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {formatInr(summary?.balance.cashBalance || 0)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <span>Capital recorded:</span>
              <span className="font-bold text-violet-700">
                {formatInr(summary?.balance.allTimeCapital || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          CATEGORY BREAKDOWN SECTION
      ==================================================================== */}
      {summary && summary.categoryBreakdown && summary.categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-slate-700" />
              <h3 className="text-base font-bold text-slate-900">
                Expense Breakdown by Category
              </h3>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Total Expenses: {formatInr(summary.pnl.expense)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.categoryBreakdown.map((item) => (
              <div
                key={item.category}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                  <span className="font-semibold text-slate-900 truncate">
                    {CATEGORY_LABELS[item.category] || item.category}
                  </span>
                  <span className="font-bold text-rose-600">
                    {formatInr(item.total)}
                  </span>
                </div>
                <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-rose-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(3, item.percentage))}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{item.count} {item.count === 1 ? "entry" : "entries"}</span>
                  <span className="font-medium text-slate-600">{item.percentage.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====================================================================
          TRANSACTIONS TABLE & CONTROLS
      ==================================================================== */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 border-b border-slate-200/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Financial Transactions
            </h3>
            <p className="text-xs text-slate-500">
              Showing {transactions.length} of {totalTxCount} entries for selected range
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search title, note, UTR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-800"
              />
            </form>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
            >
              <option value="all">All Types</option>
              <option value="expense">Expenses Only</option>
              <option value="income">Incomes Only</option>
              <option value="capital">Capital Infusions</option>
              <option value="transfer">Transfers</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium max-w-[150px] truncate"
            >
              <option value="all">All Categories</option>
              {(ledgerView === "all"
                ? (Object.keys(CATEGORY_LABELS) as FinanceCategory[])
                : LEDGER_CATEGORIES[ledgerView]
              ).map((catKey) => (
                <option key={catKey} value={catKey}>
                  {CATEGORY_LABELS[catKey]}
                </option>
              ))}
            </select>

            <button
              onClick={() => handleOpenCreateModal()}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Transaction
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Transaction / Description</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Payment & UTR</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading financial records...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="max-w-sm mx-auto text-center space-y-2">
                      <p className="font-semibold text-slate-700">No transactions found</p>
                      <p className="text-xs text-slate-400">
                        No transactions recorded for this period or match your filters.
                      </p>
                      <button
                        onClick={() => handleOpenCreateModal()}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Record Transaction
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx._id}
                    className="hover:bg-slate-50/80 transition group"
                  >
                    {/* Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {formatDate(tx.occurredAt)}
                    </td>

                    {/* Title & Notes */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-slate-900 truncate">
                        {ledgerView === "all" && (
                          <span
                            className={`mr-1.5 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase align-middle ${
                              tx.ledger === "personal" ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800"
                            }`}
                          >
                            {LEDGER_LABELS[tx.ledger || "business"]}
                          </span>
                        )}
                        {tx.title}
                      </div>
                      {tx.note && (
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {tx.note}
                        </div>
                      )}
                    </td>

                    {/* Type Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          tx.type === "income"
                            ? "bg-emerald-100 text-emerald-800"
                            : tx.type === "expense"
                            ? "bg-rose-100 text-rose-800"
                            : tx.type === "capital"
                            ? "bg-violet-100 text-violet-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>

                    {/* Category Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                          CATEGORY_COLORS[tx.category] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {CATEGORY_LABELS[tx.category] || tx.category}
                      </span>
                    </td>

                    {/* Payment Mode & UTR */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-700">
                        {PAYMENT_MODE_LABELS[tx.paymentMode] || tx.paymentMode}
                      </div>
                      {tx.utr ? (
                        <div className="text-[11px] text-slate-400 font-mono">
                          UTR: {tx.utr}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400">-</div>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                      <span
                        className={`text-sm font-black ${
                          tx.type === "expense"
                            ? "text-rose-600"
                            : tx.type === "income"
                            ? "text-emerald-600"
                            : tx.type === "capital"
                            ? "text-violet-700"
                            : "text-slate-800"
                        }`}
                      >
                        {tx.type === "expense" ? "-" : "+"}
                        {formatInr(tx.amountPaise)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <div className="inline-flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                        <button
                          onClick={() => handleOpenEditModal(tx)}
                          title="Edit transaction"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(tx._id, tx.title)}
                          title="Delete transaction"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalTxCount > 50 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Page {page} of {Math.ceil(totalTxCount / 50)}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg font-semibold"
              >
                Previous
              </button>
              <button
                disabled={page >= Math.ceil(totalTxCount / 50)}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
          ADD / EDIT TRANSACTION MODAL
      ==================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 rounded-xl text-slate-800">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingTx ? "Edit Transaction" : "New Financial Entry"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Recorded securely into Super Admin Treasury
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveTransaction} className="mt-4 space-y-4 text-xs">
              {/* Ledger */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Whose money?</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["business", "personal"] as Ledger[]).map((l) => (
                    <button
                      type="button"
                      key={l}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          ledger: l,
                          category: LEDGER_CATEGORIES[l].includes(prev.category)
                            ? prev.category
                            : defaultCategory(l, prev.type),
                        }))
                      }
                      className={`py-2 text-center rounded-xl font-bold text-[11px] transition ${
                        formData.ledger === l
                          ? "bg-slate-900 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {LEDGER_LABELS[l]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type Switcher */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Transaction Type
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["expense", "income", "capital", "transfer"] as FinanceType[]).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          type: t,
                          category: defaultCategory(prev.ledger, t),
                        }));
                      }}
                      className={`py-2 text-center rounded-xl font-bold uppercase tracking-wider text-[11px] transition ${
                        formData.type === t
                          ? t === "expense"
                            ? "bg-rose-600 text-white shadow-sm"
                            : t === "income"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : t === "capital"
                            ? "bg-violet-700 text-white shadow-sm"
                            : "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 5000"
                      value={formData.amountRupees}
                      onChange={(e) =>
                        setFormData({ ...formData, amountRupees: e.target.value })
                      }
                      className="w-full pl-8 pr-3 py-2 text-sm font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.occurredAt}
                    onChange={(e) =>
                      setFormData({ ...formData, occurredAt: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none text-slate-900"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as FinanceCategory })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none text-slate-900"
                >
                  {LEDGER_CATEGORIES[formData.ledger].map((catKey) => (
                    <option key={catKey} value={catKey}>
                      {CATEGORY_LABELS[catKey]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title / Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Title / Vendor / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bulk Die Cut Sticker Paper, Courier Charges"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none text-slate-900"
                />
              </div>

              {/* Payment Mode & UTR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentMode: e.target.value as PaymentMode,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none text-slate-900"
                  >
                    {Object.entries(PAYMENT_MODE_LABELS).map(([modeKey, modeLabel]) => (
                      <option key={modeKey} value={modeKey}>
                        {modeLabel}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    UTR / Ref No. (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 42918837123"
                    value={formData.utr}
                    onChange={(e) => setFormData({ ...formData, utr: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none text-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Note / Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Add any additional detail, invoice number, or breakdown..."
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none text-slate-900"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold transition flex items-center gap-1.5"
                >
                  {formSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : editingTx ? (
                    "Save Changes"
                  ) : (
                    "Add Entry"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
