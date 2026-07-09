import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Search, Loader2, Check, X } from "lucide-react";
import { API_BASE_URL } from "../config/api";
import { useScreenshotPrivacy } from "../utils/useScreenshotPrivacy";
import ScreenshotPrivacyOverlay from "../utils/ScreenshotPrivacyOverlay";

const printFieldClass =
  "print:border-0 print:bg-transparent print:p-0 print:shadow-none print:outline-none print:ring-0";

const rowCellClass = "border h-[120px] px-3 py-3 text-center align-middle";
const designBoxClass =
  "flex h-24 w-36 items-center justify-center rounded-md border bg-white p-1.5";

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
  subDescription: string;
  unitPrice: number;
  quantity: number;
  image?: string;
};

type ImportProduct = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  subcategory?: string;
  image: string;
  sku?: string;
};

type DocType = "quotation" | "invoice";

const makeDocNumber = (docType: DocType = "quotation") => {
  const now = new Date();
  const segment = docType === "invoice" ? "INV" : "QTN";
  return `ST/${segment}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
};

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Formats an ISO (YYYY-MM-DD) date as "08 Jul 2026".
const formatDisplayDate = (iso: string) => {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  const [, year, month, day] = match;
  const monthLabel = MONTHS_SHORT[Number(month) - 1] ?? month;
  return `${day} ${monthLabel} ${year}`;
};

type Currency = {
  code: string;
  symbol: string;
  label: string;
  locale: string;
};

const CURRENCIES: Currency[] = [
  { code: "INR", symbol: "Rs.", label: "Indian Rupee (INR)", locale: "en-IN" },
  { code: "USD", symbol: "$", label: "US Dollar (USD)", locale: "en-US" },
  { code: "EUR", symbol: "€", label: "Euro (EUR)", locale: "en-IE" },
  { code: "GBP", symbol: "£", label: "British Pound (GBP)", locale: "en-GB" },
  { code: "AED", symbol: "AED", label: "UAE Dirham (AED)", locale: "en-US" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar (AUD)", locale: "en-AU" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar (CAD)", locale: "en-CA" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar (SGD)", locale: "en-SG" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen (JPY)", locale: "ja-JP" },
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

type PdfLinkRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
};

const getPdfLinkRects = (
  container: HTMLElement,
  pageWidth: number,
  renderedPageHeight: number,
  yOffset: number,
): PdfLinkRect[] => {
  const containerRect = container.getBoundingClientRect();
  if (containerRect.width <= 0 || containerRect.height <= 0) return [];

  const scaleX = pageWidth / containerRect.width;
  const scaleY = renderedPageHeight / containerRect.height;

  return Array.from(container.querySelectorAll<HTMLAnchorElement>("a[href]"))
    .map((anchor) => {
      const url = anchor.getAttribute("href")?.trim();
      if (!url) return null;

      const rect = anchor.getBoundingClientRect();
      const width = rect.width * scaleX;
      const height = rect.height * scaleY;
      if (width <= 0 || height <= 0) return null;

      return {
        x: (rect.left - containerRect.left) * scaleX,
        y: yOffset + (rect.top - containerRect.top) * scaleY,
        width,
        height,
        url,
      };
    })
    .filter((link): link is PdfLinkRect => Boolean(link));
};

export default function AdminDealConvert() {
  const location = useLocation();
  const navigate = useNavigate();
  const navState = location.state as { lead?: LeadLike; docType?: DocType } | null;
  const lead = navState?.lead;
  const initialDocType: DocType = navState?.docType === "invoice" ? "invoice" : "quotation";

  const [docType, setDocType] = useState<DocType>(initialDocType);
  const isInvoice = docType === "invoice";
  const partyLabel = isInvoice ? "Bill To" : "Quotation For";
  const numberLabel = isInvoice ? "Invoice No" : "Quotation No";
  const validityLabel = isInvoice ? "Payment Due (Days)" : "Validity Days";
  const validityPreviewLabel = isInvoice ? "Payment Due" : "Validity";
  const pageTitle = isInvoice ? "Create Invoice" : "Convert Deal";
  const pageSubtitle = isInvoice
    ? "Edit fields and generate invoice."
    : "Edit fields and generate quotation.";

  const [quotationFor, setQuotationFor] = useState(
    [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") || "",
  );
  const [company, setCompany] = useState(lead?.company || "");
  const [email, setEmail] = useState(lead?.email || "");
  const [phone, setPhone] = useState(lead?.phone || "");
  const [address, setAddress] = useState("");
  const [quotationNo, setQuotationNo] = useState(() => makeDocNumber(initialDocType));
  const [quotationDate, setQuotationDate] = useState(toIsoDate(new Date()));
  const [validityDays, setValidityDays] = useState(30);
  const [currencyCode, setCurrencyCode] = useState("INR");
  const [subject, setSubject] = useState(
    `${initialDocType === "invoice" ? "Invoice" : "Quotation"} for manufacturing & printing`,
  );
  const [intro, setIntro] = useState(
    initialDocType === "invoice"
      ? "Dear Sir/Ma'am, thank you for your business with Stick Toon. Please find below the invoice details for your order."
      : "Dear Sir/Ma'am, thank you for your interest in Stick Toon. Please find below the quotation details prepared for your requirement.",
  );
  const [companyGstin, setCompanyGstin] = useState("GSTIN: 27HENPP0138G1Z9");
  const [companyUdyam, setCompanyUdyam] = useState("Udyam Reg: UDYAM-MH-03-0082090");
  const [companyEmail, setCompanyEmail] = useState("Email: sticktoon.xyz@gmail.com");
  const [companyContact, setCompanyContact] = useState("Contact: +91 895 666 7277");
  const [items, setItems] = useState<QuoteItem[]>([
    {
      id: "item-1",
      description: "Custom product",
      subDescription: "",
      unitPrice: Number(lead?.expectedAmount || 0),
      quantity: 1,
      image: "",
    },
  ]);
  const [gstRate, setGstRate] = useState(18);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<ImportProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [importSearch, setImportSearch] = useState("");
  const [importCategory, setImportCategory] = useState("All");
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  const categoriesList = useMemo(() => [
    "All",
    "Positive Vibes",
    "Moody",
    "Sports",
    "Religious",
    "Entertainment",
    "Events",
    "Animal",
    "Couple",
    "Anime",
    "Custom"
  ], []);

  useEffect(() => {
    if (!isImportModalOpen) return;
    
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/products?all=true`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.products)) {
            setAvailableProducts(data.products);
          }
        }
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setLoadingProducts(false);
      }
    };
    
    fetchProducts();
  }, [isImportModalOpen]);

  const filteredProducts = useMemo(() => {
    return availableProducts.filter((prod) => {
      const matchSearch =
        prod.name.toLowerCase().includes(importSearch.toLowerCase()) ||
        (prod.sku && prod.sku.toLowerCase().includes(importSearch.toLowerCase()));
      const matchCategory =
        importCategory === "All" || prod.category === importCategory;
      return matchSearch && matchCategory;
    });
  }, [availableProducts, importSearch, importCategory]);

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleImportSelected = () => {
    const selected = availableProducts.filter((prod) => selectedProductIds.has(prod._id));
    if (selected.length === 0) return;

    const newItems = selected.map((prod) => ({
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      description: prod.name,
      subDescription: prod.description || "",
      unitPrice: prod.price || 0,
      quantity: 1,
      image: prod.image,
    }));

    setItems((prev) => {
      if (
        prev.length === 1 &&
        prev[0].description === "Custom product" &&
        !prev[0].image &&
        prev[0].unitPrice === Number(lead?.expectedAmount || 0)
      ) {
        return newItems;
      }
      return [...prev, ...newItems];
    });

    setSelectedProductIds(new Set());
    setIsImportModalOpen(false);
  };
  const [termsText, setTermsText] = useState(
    [
      "1. Currency: All prices are in Indian Rupees (INR).",
      "2. Taxes: Rates are inclusive of 18% IGST.",
      "3. International Shipping: Delivery will be managed by Sticktoon, with no charges applied to the customer.",
      "4. Lead Time: 20-25 working days from the date of Purchase Order and advance payment.",
      "5. Payment Terms: 100% Advance payment required for international orders.",
      "6. Validity: This quotation is valid for 10 days.",
      "7. Jurisdiction: Subject to Nagpur Jurisdiction.",
    ].join("\n"),
  );
  const [accountName, setAccountName] = useState("Anish Patankar (Stick Toon)");
  const [bankName, setBankName] = useState("State Bank of India");
  const [accountNumber, setAccountNumber] = useState("41532186427");
  const [ifsc, setIfsc] = useState("SBIN0000502");
  const [swift, setSwift] = useState("SBININBBXXX");
  const [branch, setBranch] = useState("Warud, Amravati, MH");
  const [operationalAddress, setOperationalAddress] = useState(
    "Stick-Toon : Tejas Bhandarkar at TBI, CIIT,\nRamdeobaba College, Nagpur - 440013",
  );
  const [headquartersAddress, setHeadquartersAddress] = useState(
    "House No.501/107 , N.T.R High School,\nWarud, Amravati, 444906",
  );
  const [authorizedSignatory, setAuthorizedSignatory] = useState(
    "Tejas Bhandarkar / Anish Patankar",
  );
  const [signatureBrand, setSignatureBrand] = useState("For StickToon");
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const isStaticPreview = isExporting || isPrinting;
  const isScreenProtected = useScreenshotPrivacy(!isExporting && !isPrinting);

  const currency = CURRENCIES.find((c) => c.code === currencyCode) ?? CURRENCIES[0];
  const formatMoney = (value: number) => Math.round(value).toLocaleString(currency.locale);
  const money = (value: number) => `${currency.symbol} ${formatMoney(value)}`;

  const termLines = useMemo(
    () =>
      termsText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    [termsText],
  );

  const totals = useMemo(() => {
    const computed = items.reduce(
      (sum, item) => {
        const amount = Number(item.unitPrice || 0) * Number(item.quantity || 0);
        const igst = (amount * Number(gstRate || 0)) / 100;

        return {
          subtotal: sum.subtotal + Math.round(amount),
          gstAmount: sum.gstAmount + Math.round(igst),
          grandTotal: sum.grandTotal + Math.round(amount + igst),
        };
      },
      { subtotal: 0, gstAmount: 0, grandTotal: 0 },
    );

    return {
      subtotal: computed.subtotal,
      gstAmount: computed.gstAmount,
      grandTotal: computed.grandTotal,
    };
  }, [gstRate, items]);

  const firstPageRows = 3;
  const otherPageRows = 8;

  const itemPages = useMemo(() => {
    const pages: QuoteItem[][] = [];

    if (items.length <= firstPageRows) {
      pages.push(items);
      return pages;
    }

    pages.push(items.slice(0, firstPageRows));
    const remainingItems = items.slice(firstPageRows);
    for (let start = 0; start < remainingItems.length; start += otherPageRows) {
      pages.push(remainingItems.slice(start, start + otherPageRows));
    }

    return pages;
  }, [items, firstPageRows, otherPageRows]);

  const handleDocTypeChange = (nextType: DocType) => {
    if (nextType === docType) return;
    setDocType(nextType);
    const segment = nextType === "invoice" ? "INV" : "QTN";
    // Keep the auto-generated number prefix in sync, but never clobber a custom number.
    setQuotationNo((prev) =>
      /^ST\/(QTN|INV)\//.test(prev) ? prev.replace(/^ST\/(QTN|INV)\//, `ST/${segment}/`) : prev,
    );
    setSubject((prev) =>
      prev.replace(/\b(quotation|invoice)\b/gi, nextType === "invoice" ? "Invoice" : "Quotation"),
    );
    setIntro((prev) =>
      prev.replace(/\b(quotation|invoice)\b/gi, nextType === "invoice" ? "invoice" : "quotation"),
    );
  };

  const updateItem = (id: string, updates: Partial<QuoteItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${prev.length + 1}`,
        description: "",
        subDescription: "",
        unitPrice: 0,
        quantity: 1,
        image: "",
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((item) => item.id !== id)));
  };

  const buildPdf = async () => {
    const mainContent = document.getElementById("deal-main-content");
    const finalElement = document.getElementById("deal-final-section");
    if (!mainContent || !finalElement) return null;

    try {
      setIsExporting(true);
      await new Promise((resolve) => setTimeout(resolve, 80));
      await waitForImages(mainContent);
      await waitForImages(finalElement);

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const pageElements = mainContent.querySelectorAll<HTMLElement>(".a4-page");
      let isFirst = true;

      for (const pageEl of pageElements) {
        const canvas = await html2canvas(pageEl, {
          scale: 3,
          backgroundColor: "#ffffff",
          useCORS: true,
          allowTaint: true,
        });
        if (!isFirst) pdf.addPage();
        isFirst = false;
        const imgData = canvas.toDataURL("image/png");
        const imgH = (canvas.height * pageWidth) / canvas.width;
        const yOffset = imgH < pageHeight ? (pageHeight - imgH) / 2 : 0;
        pdf.addImage(imgData, "PNG", 0, yOffset, pageWidth, imgH);
      }

      const finalCanvas = await html2canvas(finalElement, {
        scale: 3,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true,
      });
      pdf.addPage();
      const finalImgData = finalCanvas.toDataURL("image/png");
      const finalH = (finalCanvas.height * pageWidth) / finalCanvas.width;
      const finalYOffset = finalH < pageHeight ? (pageHeight - finalH) / 2 : 0;
      pdf.addImage(finalImgData, "PNG", 0, finalYOffset, pageWidth, finalH);

      const footerLinks = getPdfLinkRects(
        finalElement,
        pageWidth,
        finalH,
        finalYOffset,
      );
      footerLinks.forEach((link) => {
        pdf.link(link.x, link.y, link.width, link.height, { url: link.url });
      });

      return pdf;
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = async () => {
    const pdf = await buildPdf();
    if (!pdf) return;
    const safeNo = quotationNo.replace(/[\\/:*?"<>|]+/g, "-");
    pdf.save(`${isInvoice ? "invoice" : "quotation"}-${safeNo}.pdf`);
  };

  useEffect(() => {
    const resetPrintMode = () => setIsPrinting(false);
    window.addEventListener("afterprint", resetPrintMode);

    const printMediaQuery = window.matchMedia("print");
    const handlePrintChange = (event: MediaQueryListEvent) => {
      if (!event.matches) {
        resetPrintMode();
      }
    };

    printMediaQuery.addEventListener("change", handlePrintChange);

    return () => {
      window.removeEventListener("afterprint", resetPrintMode);
      printMediaQuery.removeEventListener("change", handlePrintChange);
    };
  }, []);

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

      const cleanup = () => {
        window.setTimeout(() => URL.revokeObjectURL(printUrl), 60_000);
      };

      printWindow.addEventListener("load", cleanup, { once: true });
    } catch {
      setIsPrinting(false);
      return;
    }
    setIsPrinting(false);
  };

  const handleItemImageUpload = (id: string, file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateItem(id, { image: String(reader.result || "") });
    };
    reader.readAsDataURL(file);
  };

  if (!lead) {
    return (
      <div className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-3xl rounded-2xl border bg-white p-8">
          <h1 className="text-2xl font-black text-slate-900">Nothing selected</h1>
          <p className="mt-2 text-slate-600">
            Open this page from the Leads table using the Convert action, or from the Invoices section.
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
        @page {
          size: A4;
          margin: 0;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          #deal-convert-layout {
            display: block !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          #deal-editor-panel {
            display: none !important;
          }

          #deal-quotation-preview {
            display: block !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          #deal-main-content,
          #deal-quotation-preview {
            display: block !important;
            gap: 0 !important;
          }

          #deal-quotation-preview input,
          #deal-quotation-preview textarea,
          #deal-quotation-preview select,
          #deal-quotation-preview.exporting input,
          #deal-quotation-preview.exporting textarea,
          #deal-quotation-preview.exporting select {
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            outline: none !important;
            appearance: none !important;
            -webkit-appearance: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          #deal-quotation-preview button,
          #deal-quotation-preview input[type="file"],
          #deal-quotation-preview.exporting button,
          #deal-quotation-preview.exporting input[type="file"] {
            display: none !important;
          }

          .a4-page {
            display: block !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: hidden !important;
            break-after: page !important;
            page-break-after: always !important;
          }

          .a4-page:last-child {
            break-after: auto !important;
            page-break-after: auto !important;
          }
        }

        #deal-quotation-preview.exporting input,
        #deal-quotation-preview.exporting textarea,
        #deal-quotation-preview.exporting select {
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          outline: none !important;
          appearance: none !important;
          -webkit-appearance: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }

        #deal-quotation-preview.exporting button,
        #deal-quotation-preview.exporting input[type="file"] {
          display: none !important;
        }

        #deal-quotation-preview .force-new-page {
          break-before: page !important;
          page-break-before: always !important;
        }

        #deal-main-content,
        #deal-quotation-preview {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        #deal-quotation-preview {
          overflow-x: auto;
          overflow-y: visible;
          padding-bottom: 8px;
        }

        .a4-page {
          width: 210mm;
          min-width: 210mm;
          height: 297mm;
          margin: 0 auto;
          background: #ffffff;
          box-sizing: border-box;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          flex: 0 0 auto;
          position: relative;
          isolation: isolate;
        }

        .a4-page-body {
          height: 100%;
          padding: 24px;
          box-sizing: border-box;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        @media screen {
          .a4-page {
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
          }
        }
      `}</style>
      <div id="deal-convert-layout" className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div id="deal-editor-panel" className="rounded-2xl border bg-white p-5 print:hidden">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900">{pageTitle}</h1>
              <p className="text-sm text-slate-500">{pageSubtitle}</p>
            </div>
            <Link to="/admin" className="text-sm font-bold text-slate-600 print:hidden">
              Back
            </Link>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1 print:hidden">
            <button
              type="button"
              onClick={() => handleDocTypeChange("quotation")}
              className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                !isInvoice ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Quotation
            </button>
            <button
              type="button"
              onClick={() => handleDocTypeChange("invoice")}
              className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                isInvoice ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Invoice
            </button>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">{partyLabel}</span>
              <input value={quotationFor} onChange={(e) => setQuotationFor(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">Company</span>
              <input value={company} onChange={(e) => setCompany(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">Phone</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">Address</span>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">{numberLabel}</span>
                <input value={quotationNo} onChange={(e) => setQuotationNo(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">Date</span>
                <input
                  type="date"
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`}
                />
                <span className="mt-1 block text-[11px] text-slate-400">Shows as {formatDisplayDate(quotationDate)}</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">{validityLabel}</span>
                <input type="number" min={1} value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value || 30))} className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">GST %</span>
                <input type="number" min={0} value={gstRate} onChange={(e) => setGstRate(Number(e.target.value || 0))} className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">Currency</span>
              <select
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol}  {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">Subject</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">Intro / Greeting</span>
              <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={3} className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
            </label>

            <div className="rounded-xl border p-4">
              <h2 className="mb-3 text-sm font-black uppercase text-slate-700">Company Header (Top Right)</h2>
              <div className="space-y-2">
                <input value={companyGstin} onChange={(e) => setCompanyGstin(e.target.value)} placeholder="GSTIN" className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
                <input value={companyUdyam} onChange={(e) => setCompanyUdyam(e.target.value)} placeholder="Udyam Reg" className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
                <input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="Email" className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
                <input value={companyContact} onChange={(e) => setCompanyContact(e.target.value)} placeholder="Contact" className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <h2 className="mb-3 text-sm font-black uppercase text-slate-700">Terms & Conditions</h2>
              <textarea
                value={termsText}
                onChange={(e) => setTermsText(e.target.value)}
                rows={6}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`}
              />
            </div>

            <div className="rounded-xl border p-4">
              <h2 className="mb-3 text-sm font-black uppercase text-slate-700">Bank Details</h2>
              <div className="space-y-2">
                <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Account Name" className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
                <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank Name" className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
                <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Account Number" className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
                <input value={ifsc} onChange={(e) => setIfsc(e.target.value)} placeholder="IFSC" className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
                <input value={swift} onChange={(e) => setSwift(e.target.value)} placeholder="SWIFT Code" className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
                <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Branch" className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <h2 className="mb-3 text-sm font-black uppercase text-slate-700">Footer Details</h2>
              <div className="space-y-3">
                <textarea
                  value={operationalAddress}
                  onChange={(e) => setOperationalAddress(e.target.value)}
                  rows={3}
                  placeholder="Operational Address"
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`}
                />
                <textarea
                  value={headquartersAddress}
                  onChange={(e) => setHeadquartersAddress(e.target.value)}
                  rows={3}
                  placeholder="Head Quarters"
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`}
                />
                <input
                  value={signatureBrand}
                  onChange={(e) => setSignatureBrand(e.target.value)}
                  placeholder="Signature Heading (e.g. For StickToon)"
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`}
                />
                <input
                  value={authorizedSignatory}
                  onChange={(e) => setAuthorizedSignatory(e.target.value)}
                  placeholder="Authorized Signatory"
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handlePrint} className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold print:hidden">
                Print
              </button>
              <button onClick={handleDownload} className="flex-1 rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white print:hidden">
                Download PDF
              </button>
            </div>
          </div>
        </div>

        <div
          id="deal-quotation-preview"
          className={`min-w-0 text-black ${isStaticPreview ? "exporting" : ""}`}
        >
          {isScreenProtected && (
            <ScreenshotPrivacyOverlay message="Hidden while this window is out of focus, so quotation pricing stays off task-switcher previews." />
          )}
          <div id="deal-main-content">
            {itemPages.map((pageItems, pageIndex) => (
              <div
                key={`page-${pageIndex}`}
                className={`a4-page rounded-2xl border ${pageIndex === 0 ? "p-8" : "px-8 py-6"}`}
              >
                {pageIndex === 0 && (
                  <>
                    <div className="flex items-start justify-between gap-6 border-b pb-4">
                      <img src="/images/STICKTOON_LONG.jpeg" alt="StickToon" className="h-16 w-auto object-contain" />
                      <div className="text-right text-xs font-semibold leading-6">
                        {companyGstin.trim() ? <p>{companyGstin}</p> : null}
                        {companyUdyam.trim() ? <p>{companyUdyam}</p> : null}
                        {companyEmail.trim() ? <p>{companyEmail}</p> : null}
                        {companyContact.trim() ? <p>{companyContact}</p> : null}
                      </div>
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-6 border-b pb-6">
                      <div className="border-r border-slate-300 pr-6">
                        <p className="text-xs font-black uppercase">{partyLabel}:</p>
                        <p className="mt-3 text-2xl font-black">{quotationFor || "-"}</p>
                        {company.trim() ? <p className="mt-1 text-sm">{company}</p> : null}
                        {email.trim() ? <p className="text-sm">{email}</p> : null}
                        {phone.trim() ? <p className="text-sm">{phone}</p> : null}
                        {address.trim() ? <p className="whitespace-pre-line text-sm">{address}</p> : null}
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-xs font-black uppercase">Details:</p>
                        <p className="mt-3"><span className="font-black">{numberLabel}:</span> {quotationNo}</p>
                        <p><span className="font-black">Date:</span> {formatDisplayDate(quotationDate)}</p>
                        <p><span className="font-black">{validityPreviewLabel}:</span> {validityDays} Days</p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <p className="text-sm font-black uppercase underline">{subject}</p>
                      <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{intro}</p>
                    </div>
                  </>
                )}

                <div className={`${pageIndex === 0 ? "mt-6" : "mt-0"} overflow-hidden rounded-xl border`}>
                  <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
                    <p className="text-sm font-black uppercase text-slate-700">Items</p>
                    {pageIndex === 0 && (
                      <div className="flex gap-2 print:hidden">
                        <button
                          type="button"
                          onClick={() => setIsImportModalOpen(true)}
                          className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
                        >
                          Import Products
                        </button>
                        <button
                          onClick={addItem}
                          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition"
                        >
                          Add Row
                        </button>
                      </div>
                    )}
                  </div>
                  <table className="w-full table-fixed border-collapse text-sm">
                    <colgroup>
                      <col style={{ width: "7%" }} />
                      <col style={{ width: "15%" }} />
                      <col style={{ width: "21%" }} />
                      <col style={{ width: "12%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "8%" }} />
                      <col style={{ width: "15%" }} />
                    </colgroup>
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="border px-2 py-2 text-center align-middle font-black">S.N.</th>
                        <th className="border px-2 py-2 text-center align-middle font-black">Description</th>
                        <th className="border px-2 py-2 text-center align-middle font-black">Design Preview</th>
                        <th className="border px-2 py-2 text-center align-middle font-black">Unit Price</th>
                        <th className="border px-2 py-2 text-center align-middle font-black">Quantity</th>
                        <th className="border px-2 py-2 text-center align-middle font-black">Amount</th>
                        <th className="border px-2 py-2 text-center align-middle font-black">IGST</th>
                        <th className="border px-2 py-2 text-center align-middle font-black">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((item, rowIndex) => {
                        const globalIndex =
                          pageItems
                            .slice(0, rowIndex)
                            .length +
                          itemPages
                            .slice(0, pageIndex)
                            .reduce((sum, page) => sum + page.length, 0);
                        const amount = item.unitPrice * item.quantity;
                        const igst = (amount * gstRate) / 100;
                        return (
                          <tr key={item.id} className="h-[100px]">
                            <td className={rowCellClass}>{globalIndex + 1}</td>
                            <td className={rowCellClass}>
                              {isStaticPreview ? (
                                <div className="text-left leading-snug">
                                  <p className="text-sm font-semibold">{item.description || "-"}</p>
                                  {item.subDescription ? (
                                    <p className="mt-1 text-[10px] italic text-slate-500">{item.subDescription}</p>
                                  ) : null}
                                </div>
                              ) : (
                                <div className="space-y-2 text-left">
                                  <input
                                    value={item.description}
                                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                                    placeholder="Title"
                                    className={`w-full rounded-md border px-2 py-2 text-sm font-semibold ${printFieldClass}`}
                                  />
                                  <input
                                    value={item.subDescription}
                                    onChange={(e) => updateItem(item.id, { subDescription: e.target.value })}
                                    placeholder="Description"
                                    className={`w-full rounded-md border px-2 py-2 text-[10px] italic text-slate-600 ${printFieldClass}`}
                                  />
                                </div>
                              )}
                            </td>
                            <td className={rowCellClass}>
                              <div className="flex h-[96px] flex-col items-center justify-center gap-2">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    crossOrigin="anonymous"
                                    alt={item.description || `Item ${globalIndex + 1}`}
                                    className={`${designBoxClass} object-contain ${isStaticPreview ? "border-transparent" : "border-slate-200"}`}
                                  />
                                ) : (
                                  <div className={`${designBoxClass} border-slate-200 bg-slate-100 text-sm text-slate-400`}>
                                    No image
                                  </div>
                                )}
                                {!isStaticPreview && (
                                  <label className="cursor-pointer rounded border border-slate-300 px-2 py-1 text-[10px] font-semibold text-slate-600 print:hidden">
                                    Upload
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => handleItemImageUpload(item.id, e.target.files?.[0])}
                                      className="hidden"
                                    />
                                  </label>
                                )}
                              </div>
                            </td>
                            <td className={rowCellClass}>
                              {isStaticPreview ? (
                                <div>{money(item.unitPrice)}</div>
                              ) : (
                                <input
                                  type="number"
                                  min={0}
                                  value={item.unitPrice}
                                  onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value || 0) })}
                                  className={`mx-auto w-full max-w-[96px] rounded-md border px-2 py-2 text-center ${printFieldClass}`}
                                />
                              )}
                            </td>
                            <td className={rowCellClass}>
                              {isStaticPreview ? (
                                <div>{item.quantity}</div>
                              ) : (
                                <input
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value || 1) })}
                                  className={`mx-auto w-full max-w-[80px] rounded-md border px-2 py-2 text-center ${printFieldClass}`}
                                />
                              )}
                            </td>
                            <td className={rowCellClass}>{formatMoney(amount)}</td>
                            <td className={rowCellClass}>{formatMoney(igst)}</td>
                            <td className={`${rowCellClass} font-black`}>
                              <div className={`flex items-center justify-center ${isStaticPreview ? "" : "flex-col gap-2"}`}>
                                <span>{money(amount + igst)}</span>
                                {!isStaticPreview && (
                                  <button
                                    onClick={() => removeItem(item.id)}
                                    className="rounded border border-red-200 px-2 py-1 text-[10px] font-bold text-red-600 print:hidden"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {pageIndex === itemPages.length - 1 && (
                      <tfoot className="bg-slate-900 text-white">
                        <tr>
                          <td colSpan={5} className="border px-3 py-3 text-center font-black">Grand Total</td>
                          <td className="border px-3 py-3 text-center">{formatMoney(totals.subtotal)}</td>
                          <td className="border px-3 py-3 text-center">{formatMoney(totals.gstAmount)}</td>
                          <td className="border px-4 py-3 text-center font-black">{money(totals.grandTotal)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            ))}
          </div>

          <div id="deal-final-section" className="a4-page rounded-2xl border p-8 text-sm force-new-page avoid-break">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="mb-2 font-black uppercase">Terms & Conditions:</p>
                <div className="space-y-1 text-slate-700">
                  {termLines.map((line, index) => {
                    const match = line.match(/^(\d+\.\s*)?([^:]+):\s*(.*)$/);
                    if (!match) {
                      return <p key={`${index}-${line}`}>{line}</p>;
                    }

                    const [, prefix = "", label, value = ""] = match;
                    return (
                      <p key={`${index}-${line}`}>
                        {prefix}
                        <span className="font-black">{label.trim()}:</span>
                        {value ? ` ${value}` : ""}
                      </p>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="mb-2 font-black uppercase">Bank Account Details:</p>
                <div className="rounded-lg bg-slate-100 p-4 leading-7">
                  <p><span className="font-black">Account Name:</span> {accountName}</p>
                  <p><span className="font-black">Bank Name:</span> {bankName}</p>
                  <p><span className="font-black">Account No:</span> {accountNumber}</p>
                  <p><span className="font-black">SWIFT Code:</span> {swift}</p>
                  <p><span className="font-black">IFSC Code:</span> {ifsc}</p>
                  <p><span className="font-black">Branch:</span> {branch}</p>
                </div>
              </div>
            </div>

            <div className="mt-12 border-t pt-8">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="font-black">Operational Address (TBI):</p>
                  <p className="mt-2 whitespace-pre-line text-slate-600">{operationalAddress}</p>
                </div>
                <div className="text-right">
                  <p className="font-black">Head Quarters:</p>
                  <p className="mt-2 whitespace-pre-line text-slate-600">{headquartersAddress}</p>
                </div>
              </div>

              <div className="mt-12 text-center">
                <p className="text-3xl font-black">{signatureBrand}</p>
                <p className="mt-8 text-4xl font-black italic text-slate-200">Signature</p>
                <p className="mt-4 text-sm italic text-slate-400">[Authorized Signatory]</p>
                <p className="mt-4 text-2xl font-black">{authorizedSignatory}</p>
              </div>

              <div className="mt-10 border-t pt-4 text-center text-sm text-blue-500">
                <a
                  href="https://www.instagram.com/sticktoon.shop?igsh=ZWllbWE0ZHdvOTJq"
                  target="_blank"
                  rel="noreferrer"
                >
                  Instagram: @sticktoon.shop
                </a>
                <span className="mx-4 text-slate-300">|</span>
                <a href="https://www.sticktoon.shop/" target="_blank" rel="noreferrer">
                  Website: www.sticktoon.shop
                </a>
                <span className="mx-4 text-slate-300">|</span>
                <a href="mailto:sticktoon.xyz@gmail.com">Mail: sticktoon.xyz@gmail.com</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isImportModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn text-slate-800">
          <div className="flex h-full max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Import Products</h3>
                <p className="text-xs text-slate-500">Select products to import into your invoice/quotation items</p>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Filters */}
            <div className="flex flex-col gap-3 border-b bg-slate-50 p-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products by name or SKU..."
                  value={importSearch}
                  onChange={(e) => setImportSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-slate-400 transition"
                />
              </div>
              <div className="w-full sm:w-48">
                <select
                  value={importCategory}
                  onChange={(e) => setImportCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 transition"
                >
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingProducts ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                  <p className="text-sm text-slate-500">Loading products...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center">
                  <p className="text-sm font-semibold text-slate-500">No products found matching filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {filteredProducts.map((prod) => {
                    const isSelected = selectedProductIds.has(prod._id);
                    return (
                      <div
                        key={prod._id}
                        onClick={() => toggleProductSelection(prod._id)}
                        className={`relative flex cursor-pointer flex-col overflow-hidden rounded-xl border p-2 transition hover:shadow-md ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-600"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="relative flex aspect-square items-center justify-center rounded-lg bg-slate-50 p-2 overflow-hidden border border-slate-100">
                          {prod.image ? (
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className="h-full w-full object-contain object-center"
                            />
                          ) : (
                            <div className="text-[10px] text-slate-400 uppercase font-black">No image</div>
                          )}
                          
                          {/* Selection Checkmark Bubble */}
                          <div className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border transition ${
                            isSelected
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-300 bg-white/80"
                          }`}>
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>

                        <div className="mt-2 flex flex-1 flex-col justify-between">
                          <div>
                            <h4 className="line-clamp-2 text-xs font-bold text-slate-900 leading-tight">
                              {prod.name}
                            </h4>
                            <p className="mt-1 text-[10px] font-medium text-slate-400">
                              {prod.category} {prod.subcategory ? `• ${prod.subcategory}` : ""}
                            </p>
                          </div>
                          <p className="mt-2 text-xs font-black text-slate-900">
                            ₹{prod.price}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedProductIds.size === filteredProducts.length) {
                      setSelectedProductIds(new Set());
                    } else {
                      setSelectedProductIds(new Set(filteredProducts.map((p) => p._id)));
                    }
                  }}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  {selectedProductIds.size === filteredProducts.length ? "Deselect All" : "Select All"}
                </button>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs font-bold text-slate-500">
                  {selectedProductIds.size} selected
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportSelected}
                  disabled={selectedProductIds.size === 0}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 transition"
                >
                  Import Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
