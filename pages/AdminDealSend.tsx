import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Camera } from "lucide-react";

type LeadLike = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  email?: string;
  phone?: string;
  expectedAmount?: number;
};

type QuoteItem = {
  id: string;
  description: string;
  unitPrice: number;
  quantity: number;
  image?: string;
  defaultImage?: string;
  finishLabel?: string;
};

const fieldClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-400";

const createQuoteItem = (
  index: number,
  unitPrice: number,
  overrides: Partial<QuoteItem> = {},
): QuoteItem => ({
  id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  description: `Badge ${index}`,
  unitPrice,
  quantity: 1,
  image: "",
  finishLabel: "Premium 58mm Glossy",
  ...overrides,
});

const makeQuoteNumber = () => {
  const now = new Date();
  return `ST/QTN/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
};

const makeInitialItems = (unitPrice: number): QuoteItem[] => [
  createQuoteItem(1, unitPrice, {
    description: "Logo Badge",
  }),
  createQuoteItem(2, unitPrice, {
    description: "Elite Club Badge",
    finishLabel: "Premium 58mm Satin Matte",
  }),
  createQuoteItem(3, unitPrice, {
    description: "Classic Emerald Badge",
  }),
  createQuoteItem(4, unitPrice, {
    description: "Pride Club Edition",
    finishLabel: "Premium 58mm High-Impact",
  }),
  createQuoteItem(5, unitPrice, {
    description: "Teal Culture Badge",
  }),
];

const waitForImages = async (root: ParentNode) => {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));

  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }

          const finish = () => {
            img.removeEventListener("load", finish);
            img.removeEventListener("error", finish);
            resolve();
          };

          img.addEventListener("load", finish, { once: true });
          img.addEventListener("error", finish, { once: true });
        }),
    ),
  );
};

export default function AdminDealSend() {
  const location = useLocation();
  const navigate = useNavigate();
  const lead = (location.state as { lead?: LeadLike } | null)?.lead;

  const [email, setEmail] = useState(lead?.email || "");
  const [phone, setPhone] = useState(lead?.phone || "");
  const [quotationNo, setQuotationNo] = useState(makeQuoteNumber());
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().slice(0, 10));
  const [subject, setSubject] = useState("Advantage Club Collection");
  const [tagline, setTagline] = useState("Limited Edition");
  const [highlightLine, setHighlightLine] = useState(
    "Smart Magnetic 58mm Pin Badges - Designed to Stick Anywhere in Your Office.",
  );
  const [items, setItems] = useState<QuoteItem[]>(() =>
    makeInitialItems(Number(lead?.expectedAmount || 50)),
  );
  const [gstRate, setGstRate] = useState(18);
  const [overviewPoints, setOverviewPoints] = useState(
    [
      "Specializes in the creation of 58 mm round plastic pin badges.",
      "Fully customizable plastic badges tailored to meet design preferences.",
      "Innovative pin-magnet dual feature for apparel and magnetic surfaces.",
      "High-quality glossy coating for a durable finish.",
    ].join("\n"),
  );
  const [officeLocation, setOfficeLocation] = useState(
    "TBI, CIIT, Ramdeobaba College,\nNagpur, Maharashtra - 440013",
  );
  const [contactChannels, setContactChannels] = useState(
    "Email: sticktoon.xyz@gmail.com\nDirect: +91 8956667277\nSocial: @sticktoon.shop",
  );
  const [curationNote, setCurationNote] = useState(
    "\"This product catalogue has been curated especially for you. Kindly review the details, and feel free to contact us for any enquiries.\"",
  );
  const [footerNote, setFooterNote] = useState(
    "GSTIN: 27HENPP0138G1Z9 • THANK YOU FOR YOUR VALUABLE TIME",
  );
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const totals = useMemo(() => {
    const totalUnits = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0),
      0,
    );
    const baseUnitPrice = totalUnits > 0 ? subtotal / totalUnits : Number(lead?.expectedAmount || 50);
    const gstPerUnit = (baseUnitPrice * Number(gstRate || 0)) / 100;
    return {
      totalUnits,
      subtotal,
      baseUnitPrice,
      gstPerUnit,
      totalPerUnit: baseUnitPrice + gstPerUnit,
    };
  }, [gstRate, items, lead?.expectedAmount]);

  const catalogPages = useMemo(() => {
    if (items.length === 0) {
      return [[]];
    }

    const counts: number[] = [];
    let remaining = items.length;

    while (remaining > 0) {
      const count = Math.min(6, remaining);
      counts.push(count);
      remaining -= count;
    }

    const pages: QuoteItem[][] = [];
    let cursor = 0;
    for (let page = 0; page < counts.length; page += 1) {
      const count = counts[page];
      pages.push(items.slice(cursor, cursor + count));
      cursor += count;
    }

    return pages;
  }, [items]);

  const updateItem = (id: string, updates: Partial<QuoteItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      createQuoteItem(prev.length + 1, Number(lead?.expectedAmount || 50)),
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((item) => item.id !== id)));
  };

  const handleItemImageUpload = (id: string, file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateItem(id, { image: String(reader.result || "") });
    };
    reader.readAsDataURL(file);
  };

  const buildPdf = async () => {
    const previewRoot = document.getElementById("deal-send-preview");
    if (!previewRoot) return null;

    try {
      setIsExporting(true);
      await new Promise((resolve) => setTimeout(resolve, 80));
      await waitForImages(previewRoot);

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pages = previewRoot.querySelectorAll<HTMLElement>(".catalog-page");
      let isFirst = true;

      for (const page of pages) {
        const canvas = await html2canvas(page, {
          scale: 3,
          backgroundColor: "#101828",
          useCORS: true,
          allowTaint: true,
        });

        if (!isFirst) pdf.addPage();
        isFirst = false;

        const image = canvas.toDataURL("image/png");
        pdf.addImage(image, "PNG", 0, 0, pageWidth, pageHeight);
      }

      return pdf;
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = async () => {
    const pdf = await buildPdf();
    if (!pdf) return;
    pdf.save(`catalogue-${quotationNo}.pdf`);
  };

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));

      const pdf = await buildPdf();
      if (!pdf) {
        setIsPrinting(false);
        return;
      }

      pdf.autoPrint();
      const printUrl = String(pdf.output("bloburl"));
      const printWindow = window.open(printUrl, "_blank", "noopener,noreferrer");

      if (!printWindow) {
        window.location.href = printUrl;
        return;
      }

      printWindow.addEventListener(
        "load",
        () => {
          window.setTimeout(() => URL.revokeObjectURL(printUrl), 60_000);
        },
        { once: true },
      );
    } catch {
      setIsPrinting(false);
      return;
    }

    setIsPrinting(false);
  };

  useEffect(() => {
    const resetPrintMode = () => setIsPrinting(false);
    window.addEventListener("afterprint", resetPrintMode);
    return () => window.removeEventListener("afterprint", resetPrintMode);
  }, []);

  if (!lead) {
    return (
      <div className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border bg-white p-8">
          <h1 className="text-2xl font-black text-slate-900">No lead selected</h1>
          <p className="mt-2 text-slate-600">
            Open this page from the Leads table using the Send action.
          </p>
          <button
            onClick={() => navigate("/admin")}
            className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"
          >
            Back to Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-8">
      <style>{`
        .catalog-page {
          width: 210mm;
          height: 297mm;
          margin: 0 auto;
          overflow: hidden;
          position: relative;
          background: #ffffff;
          color: #0f172a;
        }

        .catalog-shell {
          height: 100%;
          padding: 1.5mm;
          box-sizing: border-box;
          border: 2px solid rgba(0, 0, 0, 0.72);
        }

        .catalog-sheet {
          background: linear-gradient(180deg, #ffffff 0%, #f4f7fb 100%);
          border: 2px solid #000000;
          height: 100%;
          overflow: hidden;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto auto;
        }

        .catalog-header {
          
          text-align: center;
          background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
          border-bottom: 1px solid #e2e8f0;
        }

        .catalog-logo-wrap {
          display: block;
          align-items: center;
          justify-content: center;
          background: #000000;
          padding: 8px 18px;
          border: none;
          box-shadow: none;
          outline: none;
        }

        .catalog-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 9px;
        }

        .catalog-products-section {
          padding: 10px 12px 10px;
          overflow: hidden;
        }

        .catalog-card {
          border-radius: 12px;
          background: linear-gradient(180deg, #eef2f7 0%, #e8edf4 100%);
          border: 1px solid #d8e0ea;
          padding: 10px 10px 12px;
          min-height: 248px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.66);
        }

        .catalog-card-image {
          height: 174px;
          border-radius: 6px;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 4px;
        }

        .catalog-card-image img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .catalog-card-title {
          text-align: center;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.01em;
          text-transform: uppercase;
          color: #0f172a;
          min-height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1.1;
        }

        .catalog-card-subtitle {
          text-align: center;
          font-size: 6px;
          font-weight: 900;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #8d9ab0;
          margin-top: -3px;
          line-height: 1.1;
        }

        .catalog-card-custom {
          justify-content: center;
          padding: 10px;
          background: linear-gradient(180deg, #eef2f7 0%, #e8edf4 100%);
        }

        .catalog-card-custom-inner {
          flex: 1;
          border-radius: 22px;
          border: 1px solid rgba(86, 111, 196, 0.45);
          background: linear-gradient(180deg, #2c469a 0%, #22377f 100%);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 22px 24px;
          color: #ffffff;
        }

        .catalog-card-custom-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        .catalog-card-custom-title {
          margin-top: 22px;
          text-align: center;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.06em;
          line-height: 1.35;
          text-transform: uppercase;
        }

        .catalog-card-custom-copy {
          margin-top: 14px;
          text-align: center;
          font-size: 8px;
          line-height: 1.6;
          color: rgba(233, 239, 255, 0.92);
          max-width: 170px;
          font-style: italic;
          font-weight: 600;
        }

        .catalog-card-upload {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          border: 1px solid #d8e1eb;
          border-radius: 8px;
          padding: 6px 8px;
          font-size: 11px;
          font-weight: 700;
          color: #334155;
          background: linear-gradient(180deg, #ffffff 0%, #f5f8fc 100%);
          cursor: pointer;
        }

        .catalog-panel-input {
          width: 100%;
          border: 1px solid #d9e1ea;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 14px;
          color: #0f172a;
          outline: none;
          background: #ffffff;
        }

        .catalog-panel-input:focus {
          border-color: #64748b;
        }

        .catalog-price-box {
          padding: 7px 10px;
          border-radius: 10px;
          border: 1px solid #d4deea;
          background: linear-gradient(180deg, #ffffff 0%, #f7faff 100%);
        }

        .catalog-accent-bar {
          width: 2px;
          height: 18px;
          background: linear-gradient(180deg, #64748b 0%, #d0d8e4 100%);
          border-radius: 999px;
        }

        .catalog-overview-list {
          margin-top: 10px;
          padding-left: 16px;
          color: #334155;
          font-size: 10px;
          line-height: 1.65;
        }

        .catalog-overview-list li + li {
          margin-top: 4px;
        }

        .catalog-proposal {
          padding: 4px 10px 8px;
          background: linear-gradient(180deg, rgba(244, 247, 251, 0.8) 0%, #ffffff 100%);
          border-top: 1px solid #dde5ef;
        }

        .catalog-proposal-grid {
          display: grid;
          grid-template-columns: 0.95fr 1.25fr;
          border: 1px solid #d7e0ea;
          border-radius: 12px;
          overflow: hidden;
          background: #ffffff;
        }

        .catalog-proposal-col {
          padding: 14px 18px 15px;
        }

        .catalog-proposal-col + .catalog-proposal-col {
          border-left: 1px solid #dfe6ef;
        }

        .catalog-proposal-title {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #94a3b8;
        }

        .catalog-footer {
          margin-top: auto;
          background: linear-gradient(180deg, #0b1630 0%, #0a1224 100%);
          color: white;
        }

        .catalog-footer-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 28px;
          padding: 26px 24px 24px;
        }

        .catalog-footer-title {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #98a6c0;
        }

        .catalog-footer-copy {
          margin-top: 10px;
          white-space: pre-line;
          font-size: 9px;
          line-height: 1.75;
          color: #eef2ff;
        }

        .catalog-footer-copy-muted {
          margin-top: 10px;
          white-space: pre-line;
          font-size: 9px;
          line-height: 1.75;
          color: #d7deef;
        }

        .catalog-footer-bottom {
          border-top: 1px solid rgba(148, 163, 184, 0.16);
          padding: 14px 24px 16px;
          text-align: center;
        }

        @media screen {
          .catalog-page {
            box-shadow: 0 18px 48px rgba(15, 23, 42, 0.22);
          }
        }
      `}</style>

      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[380px_1fr]">
        <div className="rounded-2xl border bg-white p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Send Catalogue</h1>
              <p className="text-sm text-slate-500">Build a visual proposal before sharing it.</p>
            </div>
            <Link to="/admin" className="text-sm font-bold text-slate-600">
              Back
            </Link>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">Subject</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className={fieldClass} />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">Tagline</span>
                <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">Highlight</span>
                <input value={highlightLine} onChange={(e) => setHighlightLine(e.target.value)} className={fieldClass} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">Quotation No</span>
                <input value={quotationNo} onChange={(e) => setQuotationNo(e.target.value)} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">Date</span>
                <input type="date" value={quotationDate} onChange={(e) => setQuotationDate(e.target.value)} className={fieldClass} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">Email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">Phone</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">Unit Price</span>
                <input
                  type="number"
                  min={0}
                  value={Math.round(totals.baseUnitPrice)}
                  onChange={(e) => {
                    const next = Number(e.target.value || 0);
                    setItems((prev) => prev.map((item) => ({ ...item, unitPrice: next })));
                  }}
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">GST %</span>
                <input type="number" min={0} value={gstRate} onChange={(e) => setGstRate(Number(e.target.value || 0))} className={fieldClass} />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">StickToon Overview</span>
              <textarea value={overviewPoints} onChange={(e) => setOverviewPoints(e.target.value)} rows={5} className={fieldClass} />
            </label>

            <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Catalogue Items</p>
                  <p className="mt-1 text-xs text-slate-500">Manage card names and upload artwork for the final sheet.</p>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
                >
                  Add Item
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Badge {index + 1}</p>
                        <p className="mt-1 text-xs text-slate-500">Shown directly in the proposal preview and export.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        className="text-xs font-bold text-rose-500 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
                      <input
                        value={item.description}
                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                        placeholder="Badge title"
                        className={fieldClass}
                      />
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">
                        {item.image ? "Replace Image" : "Upload Image"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleItemImageUpload(item.id, e.target.files?.[0])}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">Office Location</span>
                <textarea value={officeLocation} onChange={(e) => setOfficeLocation(e.target.value)} rows={4} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">Contact Channels</span>
                <textarea value={contactChannels} onChange={(e) => setContactChannels(e.target.value)} rows={4} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">Curation Note</span>
                <textarea value={curationNote} onChange={(e) => setCurationNote(e.target.value)} rows={4} className={fieldClass} />
              </label>
            </div>

            <div className="flex gap-3">
              <button onClick={handlePrint} className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold">
                Print
              </button>
              <button onClick={handleDownload} className="flex-1 rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white">
                Download PDF
              </button>
            </div>
          </div>
        </div>

        <div id="deal-send-preview">
          {catalogPages.map((pageItems, pageIndex) => (
            <div key={`catalog-page-${pageIndex}`} className="catalog-page mb-6">
              <div className="catalog-shell">
                <div className="catalog-sheet">
                  {pageIndex === 0 && (
                    <div className="catalog-header">
                      <div className="catalog-logo-wrap">
                        <img
                          src="/images/STICKTOON_LONG.jpeg"
                          alt="StickToon"
                          className="mx-auto h-10 w-auto object-contain"
                        />
                      </div>
                      <p className=" text-[7px] font-semibold uppercase tracking-[0.32em] bg-black text-white px-2 py-1 ">
  We create for the souls
</p>
                      <div className="mx-auto mt-3 h-px w-28 bg-slate-200" />
                      <p className="mt-3 text-[7px] font-black uppercase tracking-[0.34em] text-slate-400">
                        {tagline}
                      </p>
                      <h2 className="mt-1.5 text-[18px] font-black uppercase tracking-tight text-slate-900">
                        {subject}
                      </h2>
                      <div className="mx-auto mt-2 mb-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-[7px] font-bold text-amber-800">
                        {highlightLine}
                      </div>
                    </div>
                  )}

                  <div className="catalog-products-section">
                    <div className="catalog-grid">
                      {pageItems.map((item) => (
                        <div key={item.id} className="catalog-card">
                          <div className="catalog-card-image">
                            {item.image || item.defaultImage ? (
                              <img
                                src={item.image || item.defaultImage}
                                crossOrigin="anonymous"
                                alt={item.description}
                              />
                            ) : (
                              <div className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
                                No image
                              </div>
                            )}
                          </div>
                          <div className="text-center">
                            <p className="catalog-card-title">
                              {item.description || "Untitled badge"}
                            </p>
                            <p className="catalog-card-subtitle">
                              {item.finishLabel || "Premium 58mm Glossy"}
                            </p>
                          </div>
                        </div>
                      ))}

                      {pageIndex === catalogPages.length - 1 && pageItems.length < 6 && (
                        <div className="catalog-card catalog-card-custom">
                          <div className="catalog-card-custom-inner">
                            <div className="catalog-card-custom-icon">
                              <Camera className="h-5 w-5" strokeWidth={2.2} />
                            </div>
                            <p className="catalog-card-custom-title">Custom<br />Advantage</p>
                            <p className="catalog-card-custom-copy">
                              We can turn your own corporate branding or event logo into a premium 58mm badge set.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {pageIndex === catalogPages.length - 1 && (
                    <>
                      <div className="catalog-proposal">
                        <div className="catalog-proposal-grid">
                          <div className="catalog-proposal-col">
                            <div className="flex items-center gap-3">
                              <span className="catalog-accent-bar" />
                              <p className="catalog-proposal-title">
                                Commercial Proposal
                              </p>
                            </div>
                            <div className="mt-5 space-y-3 text-[10px] text-slate-700">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-600">Product Price</span>
                                <span className="font-extrabold text-slate-900">₹{totals.baseUnitPrice.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-600">GST ({gstRate}%)</span>
                                <span className="font-extrabold text-slate-900">₹{totals.gstPerUnit.toFixed(2)}</span>
                              </div>
                              <div className="mt-4 border-t border-slate-200 pt-4">
                                <div className="flex items-end justify-between gap-3">
                                  <span className="text-[12px] font-black text-slate-900">Total Per Unit</span>
                                  <span className="text-[20px] font-black leading-none text-slate-900">₹{totals.totalPerUnit.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="catalog-proposal-col">
                            <p className="catalog-proposal-title">
                              StickToon Overview
                            </p>
                            <ul className="catalog-overview-list">
                              {overviewPoints
                                .split("\n")
                                .map((point) => point.trim())
                                .filter(Boolean)
                                .map((point, index) => (
                                  <li key={`${point}-${index}`}>{point}</li>
                                ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="catalog-footer">
                        <div className="catalog-footer-grid">
                          <div>
                            <p className="catalog-footer-title">Office Location</p>
                            <p className="catalog-footer-copy">{officeLocation}</p>
                          </div>
                          <div>
                            <p className="catalog-footer-title">Contact Channels</p>
                            <p className="catalog-footer-copy">{contactChannels}</p>
                          </div>
                          <div>
                            <p className="catalog-footer-title">Curation Note</p>
                            <p className="catalog-footer-copy-muted italic">{curationNote}</p>
                          </div>
                        </div>

                        <div className="catalog-footer-bottom">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {footerNote}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
