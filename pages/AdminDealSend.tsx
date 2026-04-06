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

const DEFAULT_CUSTOM_CARD_TITLE = "Custom\nAdvantage";
const DEFAULT_CUSTOM_CARD_COPY =
  "We can turn your own corporate branding or event logo into a premium 58mm badge set.";
const INSTAGRAM_PROFILE_URL = "https://www.instagram.com/sticktoon.shop?igsh=ZWllbWE0ZHdvOTJq";

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
    "Smart Magnetic 58mm Pin Badges - Designed to Stick Anywhere in Your Office",
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
  const [customCardTitle, setCustomCardTitle] = useState(DEFAULT_CUSTOM_CARD_TITLE);
  const [customCardCopy, setCustomCardCopy] = useState(DEFAULT_CUSTOM_CARD_COPY);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const normalizedTagline = (tagline || "Limited Edition").trim() || "Limited Edition";
  const normalizedHighlightLine =
    ((highlightLine || "Smart Magnetic 58mm Pin Badges - Designed to Stick Anywhere in Your Office").trim() ||
      "Smart Magnetic 58mm Pin Badges - Designed to Stick Anywhere in Your Office")
      .replace(/[–—]/g, "-")
      .replace(/\s*-\s*/g, " - ")
      .replace(/\.+$/, "");
  const normalizedCustomCardTitle =
    (customCardTitle || DEFAULT_CUSTOM_CARD_TITLE).trim() || DEFAULT_CUSTOM_CARD_TITLE;
  const normalizedCustomCardCopy =
    (customCardCopy || DEFAULT_CUSTOM_CARD_COPY).trim() || DEFAULT_CUSTOM_CARD_COPY;

  const contactChannelLines = useMemo(() => {
    return contactChannels
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [rawLabel, ...rawValueParts] = line.split(":");
        if (rawValueParts.length === 0) {
          return { kind: "text" as const, label: "", value: line, href: "" };
        }

        const label = rawLabel.trim();
        const value = rawValueParts.join(":").trim();

        if (/^email$/i.test(label) && value) {
          const emailAddress = value.replace(/^mailto:/i, "").trim();
          return {
            kind: "email" as const,
            label,
            value: emailAddress,
            href: `mailto:${emailAddress}`,
          };
        }

        if ((/^social$/i.test(label) || /^instagram$/i.test(label)) && value) {
          return {
            kind: "instagram" as const,
            label,
            value,
            href: INSTAGRAM_PROFILE_URL,
          };
        }

        return { kind: "text" as const, label: "", value: line, href: "" };
      });
  }, [contactChannels]);

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
        const pageRect = page.getBoundingClientRect();
        const pageLinks = Array.from(page.querySelectorAll<HTMLAnchorElement>("a[href]"))
          .map((anchor) => {
            const href = anchor.getAttribute("href") || "";
            if (!href) return null;

            const linkRect = anchor.getBoundingClientRect();
            if (linkRect.width <= 0 || linkRect.height <= 0) return null;

            return {
              href,
              x: linkRect.left - pageRect.left,
              y: linkRect.top - pageRect.top,
              width: linkRect.width,
              height: linkRect.height,
            };
          })
          .filter((link): link is { href: string; x: number; y: number; width: number; height: number } => Boolean(link));

        const canvas = await html2canvas(page, {
          scale: 3,
          backgroundColor: "#101828",
          useCORS: true,
          allowTaint: true,
          width: Math.ceil(pageRect.width),
          height: Math.ceil(pageRect.height),
          scrollX: -window.scrollX,
          scrollY: -window.scrollY,
          windowWidth: document.documentElement.clientWidth,
          windowHeight: document.documentElement.clientHeight,
          onclone: (clonedDocument) => {
            // Stabilize capture origin so exported pages don't pick up viewport offset artifacts.
            clonedDocument.documentElement.scrollTop = 0;
            clonedDocument.documentElement.scrollLeft = 0;
            clonedDocument.body.scrollTop = 0;
            clonedDocument.body.scrollLeft = 0;
          },
        });

        if (!isFirst) pdf.addPage();
        isFirst = false;

        const image = canvas.toDataURL("image/png");
        // The preview page is already authored at A4 proportions.
        // Render it edge-to-edge onto the PDF page to avoid offset/letterboxing drift.
        pdf.addImage(image, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST");

        // html2canvas flattens anchors into pixels; add explicit PDF link annotations.
        const scaleX = pageWidth / pageRect.width;
        const scaleY = pageHeight / pageRect.height;
        for (const link of pageLinks) {
          const x = Math.max(0, link.x * scaleX);
          const y = Math.max(0, link.y * scaleY);
          const width = Math.max(0.1, link.width * scaleX);
          const height = Math.max(0.1, link.height * scaleY);

          const maxWidth = Math.max(0.1, pageWidth - x);
          const maxHeight = Math.max(0.1, pageHeight - y);

          pdf.link(x, y, Math.min(width, maxWidth), Math.min(height, maxHeight), {
            url: link.href,
          });
        }
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
          padding: 0;
          text-align: center;
          background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
          border-bottom: 1px solid #e2e8f0;
        }

        .catalog-logo-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #000000;
          min-height: 78px;
          padding: 8px 18px 7px;
          border: none;
          box-shadow: none;
          outline: none;
        }

        .catalog-soul-line {
          margin: 6px 0 0;
          font-size: 8px;
          font-weight: 700;
          font-family: Arial, Helvetica, sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.38em;
          color: #ffffff;
          line-height: 1;
          transform: translateX(0.18em);
        }

        .catalog-tagline {
          margin-top: 11px;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.34em;
          color: #94a3b8;
          line-height: 1;
        }

        .catalog-highlight-line {
          margin: 8px auto 12px;
          min-height: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #f9e8b5;
          padding: 3px 20px 10px 20px;
          font-size: 8px;
          line-height: 1.1;
          font-weight: 700;
          font-family: Arial, Helvetica, sans-serif;
          color: #92400e;
          white-space: nowrap;
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
          white-space: pre-line;
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
          padding-left: 0;
          list-style: none;
          color: #334155;
          font-size: 10px;
          line-height: 1.65;
        }

        .catalog-overview-list li {
          position: relative;
          padding-left: 16px;
        }

        .catalog-overview-list li::before {
          content: "•";
          position: absolute;
          left: 0;
          top: 0;
          line-height: 1.65;
          font-size: 11px;
          color: #64748b;
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

        .catalog-footer-link {
          color: #eef2ff;
          text-decoration: underline;
          text-decoration-color: rgba(226, 232, 240, 0.45);
          text-underline-offset: 2px;
          transition: color 0.2s ease, text-decoration-color 0.2s ease;
        }

        .catalog-footer-link:hover {
          color: #ffffff;
          text-decoration-color: rgba(255, 255, 255, 0.8);
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
                  value={Number(totals.totalPerUnit.toFixed(2))}
                  onChange={(e) => {
                    const nextTotalPerUnit = Number(e.target.value || 0);
                    const rate = Number(gstRate || 0);
                    const nextBaseUnitPrice = nextTotalPerUnit / (1 + rate / 100);
                    setItems((prev) =>
                      prev.map((item) => ({ ...item, unitPrice: nextBaseUnitPrice }))
                    );
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

            <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Custom Card</p>
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">Title</span>
                <textarea
                  value={customCardTitle}
                  onChange={(e) => setCustomCardTitle(e.target.value)}
                  rows={2}
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">Description</span>
                <textarea
                  value={customCardCopy}
                  onChange={(e) => setCustomCardCopy(e.target.value)}
                  rows={4}
                  className={fieldClass}
                />
              </label>
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
                        <p className="catalog-soul-line">WE CREATE FOR THE SOULS</p>
                      </div>
                      <div className="mx-auto mt-3 h-px w-28 bg-slate-200" />
                      <p className="catalog-tagline">
                        {normalizedTagline}
                      </p>
                      <h2 className="mt-1.5 text-[18px] font-black uppercase tracking-tight text-slate-900">
                        {subject}
                      </h2>
                      <div className="catalog-highlight-line">
                        {normalizedHighlightLine}
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
                            <p className="catalog-card-custom-title">{normalizedCustomCardTitle}</p>
                            <p className="catalog-card-custom-copy">
                              {normalizedCustomCardCopy}
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
                            <p className="catalog-footer-copy">
                              {contactChannelLines.map((line, index) => (
                                <span key={`${line.value}-${index}`} className="block">
                                  {line.kind === "text" ? (
                                    line.value
                                  ) : (
                                    <>
                                      {line.label}: {" "}
                                      <a
                                        href={line.href}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="catalog-footer-link"
                                      >
                                        {line.value}
                                      </a>
                                    </>
                                  )}
                                </span>
                              ))}
                            </p>
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
