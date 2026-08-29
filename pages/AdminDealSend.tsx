import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Camera, Search, Loader2, Check, X, Trash2, Mail } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { API_BASE_URL } from "../config/api";
import { useScreenshotPrivacy } from "../utils/useScreenshotPrivacy";
import ScreenshotPrivacyOverlay from "../utils/ScreenshotPrivacyOverlay";

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

const reindexItems = (list: QuoteItem[]): QuoteItem[] => {
  return list.map((item, idx) => {
    const trimmed = (item.description || "").trim();
    if (!trimmed || /^Badge \d+$/i.test(trimmed)) {
      return { ...item, description: `Badge ${idx + 1}` };
    }
    return item;
  });
};

const makeQuoteNumber = () => {
  const now = new Date();
  return `ST/QTN/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
};

const makeInitialItems = (unitPrice: number): QuoteItem[] => [];

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
  const navState = location.state as { lead?: LeadLike; existingCatalogue?: any; catalogue?: any } | null;
  const existingCatalogue = navState?.existingCatalogue || navState?.catalogue;
  const lead = navState?.lead;

  const [savedCatalogueId, setSavedCatalogueId] = useState<string | null>(
    existingCatalogue?._id || null
  );

  const [email, setEmail] = useState(existingCatalogue?.customerEmail ?? lead?.email ?? "");
  const [phone, setPhone] = useState(existingCatalogue?.customerPhone ?? lead?.phone ?? "");
  const [quotationNo, setQuotationNo] = useState(existingCatalogue?.catalogueNumber ?? makeQuoteNumber());
  const [quotationDate, setQuotationDate] = useState(existingCatalogue?.quotationDate ?? new Date().toISOString().slice(0, 10));
  const [subject, setSubject] = useState(existingCatalogue?.title ?? "Advantage Club Collection");
  const [tagline, setTagline] = useState(existingCatalogue?.tagline ?? "Limited Edition");
  const [highlightLine, setHighlightLine] = useState(
    existingCatalogue?.highlightLine ??
      "Smart Magnetic 58mm Pin Badges - Designed to Stick Anywhere in Your Office"
  );
  const [items, setItems] = useState<QuoteItem[]>(
    existingCatalogue?.items ?? makeInitialItems(Number(lead?.expectedAmount || 50))
  );
  const [gstRate, setGstRate] = useState(existingCatalogue?.gstRate ?? 18);
  const [gstEnabled, setGstEnabled] = useState<boolean>(
    existingCatalogue ? existingCatalogue.gstEnabled !== false : true
  );
  const [gstin, setGstin] = useState<string>(existingCatalogue?.gstin ?? "27HENPP0138G1Z9");
  const [deliveryCharges, setDeliveryCharges] = useState<number>(
    existingCatalogue?.deliveryCharges ?? 0
  );
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    let isMounted = true;
    const fetchQuotationNumber = async () => {
      try {
        const token = localStorage.getItem("adminToken");
        const res = await fetch(`${API_BASE_URL}/api/admin/settings/quotation-number`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.quotationNo && isMounted) {
          setQuotationNo(data.quotationNo);
        }
      } catch (err) {
        console.error("Failed to fetch initial quotation number:", err);
      }
    };

    fetchQuotationNumber();
    return () => {
      isMounted = false;
    };
  }, []);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<ImportProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [importSearch, setImportSearch] = useState("");
  const [importCategory, setImportCategory] = useState("All");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const selectedSet = useMemo(() => new Set(selectedProductIds), [selectedProductIds]);

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
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleImportSelected = () => {
    const selectedMap = new Map(availableProducts.map((prod) => [prod._id, prod]));
    const selected = selectedProductIds
      .map((id) => selectedMap.get(id))
      .filter((prod): prod is ImportProduct => prod !== undefined);

    if (selected.length === 0) return;

    const newItems = selected.map((prod) => ({
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      description: prod.name,
      unitPrice: prod.price || Number(lead?.expectedAmount || 50),
      quantity: 1,
      image: prod.image,
      finishLabel: "Premium 58mm Glossy",
    }));

    setItems(newItems);
    setSelectedProductIds([]);
    setIsImportModalOpen(false);
  };
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
  const [showCustomCard, setShowCustomCard] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  type GeneratedCatalogueRef = {
    pdf: jsPDF;
    catalogueId: string;
    filename: string;
    blobUrl: string;
  };

  const [generatedCatalogue, setGeneratedCatalogue] = useState<GeneratedCatalogueRef | null>(null);
  const [isGeneratingCatalogue, setIsGeneratingCatalogue] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendStatus, setSendStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    setGeneratedCatalogue(null);
    setSendStatus(null);
  }, [quotationNo, quotationDate, subject, tagline, highlightLine, items, gstRate, customCardTitle, customCardCopy, showCustomCard, curationNote, officeLocation, contactChannels, footerNote]);

  const isScreenProtected = useScreenshotPrivacy(!isExporting && !isPrinting);

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
      0
    );
    const baseUnitPrice = totalUnits > 0 ? subtotal / totalUnits : (items[0]?.unitPrice || 0);
    const gstPerUnit = gstEnabled ? (baseUnitPrice * Number(gstRate || 0)) / 100 : 0;
    const gstAmount = gstEnabled ? (subtotal * Number(gstRate || 0)) / 100 : 0;
    const delivery = Math.max(0, Number(deliveryCharges || 0));
    const deliveryPerUnit = totalUnits > 0 ? delivery / totalUnits : 0;
    const total = subtotal + gstAmount + delivery;

    return {
      totalUnits,
      subtotal,
      baseUnitPrice,
      gstPerUnit,
      gstAmount,
      deliveryCharges: delivery,
      totalPerUnit: baseUnitPrice + gstPerUnit + deliveryPerUnit,
      total,
    };
  }, [gstRate, items, gstEnabled, deliveryCharges]);

  const handleSaveCatalogue = async () => {
    if (isSaving) return;

    if (deliveryCharges < 0 || Number.isNaN(deliveryCharges)) {
      showToast("Delivery charges must be a valid non-negative number", "error");
      return;
    }

    if (items.length === 0) {
      showToast("Please add at least one item to the catalogue", "error");
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem("adminToken");
      const payload = {
        catalogueNumber: quotationNo,
        leadId: lead?._id || null,
        title: subject,
        tagline,
        highlightLine,
        customerEmail: email,
        customerPhone: phone,
        quotationDate,
        items,
        gstEnabled,
        gstin,
        gstRate,
        deliveryCharges: totals.deliveryCharges,
        subtotal: totals.subtotal,
        gstAmount: totals.gstAmount,
        total: totals.total,
        overviewPoints,
        officeLocation,
        contactChannels,
        curationNote,
        footerNote,
        customCardTitle,
        customCardCopy,
        showCustomCard,
        status: "Saved",
      };

      const isEdit = Boolean(savedCatalogueId);
      const url = isEdit
        ? `${API_BASE_URL}/api/admin/catalogue/${savedCatalogueId}`
        : `${API_BASE_URL}/api/admin/catalogue`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        if (data._id) {
          setSavedCatalogueId(data._id);
        }
        showToast(
          isEdit
            ? `Changes saved for catalogue ${quotationNo}`
            : "Catalogue saved successfully!",
          "success"
        );
      } else {
        showToast(data.message || "Failed to save catalogue", "error");
      }
    } catch (err: any) {
      console.error("Save catalogue error:", err);
      showToast("Failed to save catalogue due to connection error", "error");
    } finally {
      setIsSaving(false);
    }
  };

  type RenderCard =
    | { type: "item"; item: QuoteItem }
    | { type: "custom" };

  const catalogPages = useMemo(() => {
    const allCards: RenderCard[] = [
      ...items.map((item) => ({ type: "item" as const, item })),
      ...(showCustomCard ? [{ type: "custom" as const }] : []),
    ];

    const pages: Array<{ cards: RenderCard[]; showProposal: boolean }> = [];
    let remaining = [...allCards];

    while (remaining.length > 0) {
      // Pages WITH proposal fit up to 6 cards (2 rows of 3)
      // Pages WITHOUT proposal fit up to 9 cards (3 rows of 3)
      if (remaining.length <= 6) {
        pages.push({ cards: remaining, showProposal: true });
        remaining = [];
      } else {
        const takeCount = Math.min(remaining.length, 9);
        pages.push({ cards: remaining.slice(0, takeCount), showProposal: false });
        remaining = remaining.slice(takeCount);
      }
    }

    if (pages.length > 0 && !pages[pages.length - 1].showProposal) {
      pages.push({ cards: [], showProposal: true });
    }

    return pages;
  }, [items, showCustomCard]);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState<number>(1);

  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const updateScale = () => {
      const width = container.clientWidth;
      const availableWidth = width - 40;
      if (availableWidth <= 0) return;
      const targetWidth = 794;
      const scale = Math.min(1, Math.max(0.35, availableWidth / targetWidth));
      setPreviewScale(scale);
    };

    updateScale();

    const resizeObserver = new ResizeObserver(() => {
      updateScale();
    });

    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const updateItem = (id: string, updates: Partial<QuoteItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const addItem = () => {
    setItems((prev) =>
      reindexItems([
        ...prev,
        createQuoteItem(prev.length + 1, Number(lead?.expectedAmount || 50)),
      ]),
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) =>
      prev.length === 1 ? prev : reindexItems(prev.filter((item) => item.id !== id)),
    );
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

        let canvas: HTMLCanvasElement;
        try {
          canvas = await html2canvas(page, {
            scale: 3,
            backgroundColor: "#101828",
            useCORS: true,
            allowTaint: true,
            imageTimeout: 15000,
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
        } catch (canvasErr) {
          console.warn("Primary html2canvas capture failed, retrying fallback capture:", canvasErr);
          canvas = await html2canvas(page, {
            scale: 2,
            backgroundColor: "#101828",
            useCORS: false,
            allowTaint: true,
            imageTimeout: 15000,
            width: Math.ceil(pageRect.width),
            height: Math.ceil(pageRect.height),
          });
        }

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

  const incrementQuotationCounter = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API_BASE_URL}/api/admin/settings/quotation-number/increment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.quotationNo) {
          setQuotationNo(data.quotationNo);
        }
      }
    } catch (err) {
      console.error("Failed to increment quotation counter:", err);
    }
  };

  const ensureGeneratedCatalogue = async (): Promise<GeneratedCatalogueRef | null> => {
    if (generatedCatalogue) {
      return generatedCatalogue;
    }

    try {
      setIsGeneratingCatalogue(true);
      setSendStatus(null);

      const pdf = await buildPdf();
      if (!pdf) {
        setSendStatus({ type: "error", message: "Catalogue generation failed" });
        return null;
      }

      const filename = `catalogue-${quotationNo}.pdf`;
      const pdfBlob = pdf.output("blob");

      const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const formData = new FormData();
      formData.append("pdfFile", pdfBlob, filename);
      formData.append("filename", filename);
      if (lead?._id) formData.append("leadId", lead._id);

      let res: Response | null = null;
      let uploadErr: any = null;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          res = await fetch(`${API_BASE_URL}/api/admin/leads/catalogue/upload`, {
            method: "POST",
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
          });
          if (res.ok) break;
        } catch (e) {
          uploadErr = e;
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }
      }

      if (!res || !res.ok) {
        const errData = res ? await res.json().catch(() => ({})) : {};
        const msg = errData.message || uploadErr?.message || "Catalogue generation failed";
        setSendStatus({ type: "error", message: msg });
        return null;
      }

      const data = await res.json();
      const blobUrl = URL.createObjectURL(pdfBlob);

      const catRef: GeneratedCatalogueRef = {
        pdf,
        catalogueId: data.catalogueId,
        filename: data.filename || filename,
        blobUrl,
      };

      setGeneratedCatalogue(catRef);
      return catRef;
    } catch (err: any) {
      console.error("Error generating catalogue:", err);
      const msg = err?.message === "Failed to fetch"
        ? "Failed to connect to backend server. Make sure backend is running."
        : (err?.message || "Catalogue generation failed");
      setSendStatus({ type: "error", message: msg });
      return null;
    } finally {
      setIsGeneratingCatalogue(false);
    }
  };

  const handleDownload = async () => {
    const catRef = await ensureGeneratedCatalogue();
    if (!catRef) return;
    catRef.pdf.save(catRef.filename);
    await incrementQuotationCounter();
  };

  const handleSendEmail = async () => {
    setSendStatus(null);
    const targetEmail = email.trim();

    if (!targetEmail) {
      setSendStatus({ type: "error", message: "Lead has no email address" });
      return;
    }

    const catRef = await ensureGeneratedCatalogue();
    if (!catRef) return;

    try {
      setIsSendingEmail(true);
      const adminToken = localStorage.getItem("adminToken") || localStorage.getItem("token");
      const requestPayload = JSON.stringify({
        leadId: lead?._id,
        catalogueId: catRef.catalogueId,
        email: targetEmail,
        subject: subject ? `Product Catalogue - ${subject}` : `Product Catalogue - ${quotationNo}`,
        body: curationNote,
      });

      let res: Response | null = null;
      let fetchErr: any = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          res = await fetch(`${API_BASE_URL}/api/admin/leads/gmail/create-draft`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
            },
            body: requestPayload,
          });
          if (res) break;
        } catch (err) {
          fetchErr = err;
          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }
      }

      if (!res) {
        throw fetchErr || new Error("Failed to connect to backend server");
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.requiresGoogleAuth) {
          setSendStatus({
            type: "error",
            message: "Google Gmail authorization is required for orders.sticktoon@gmail.com.",
          });
          return;
        }
        setSendStatus({ type: "error", message: data.message || "Failed to create Gmail draft" });
        return;
      }

      setSendStatus({
        type: "success",
        message: `Gmail draft created under orders.sticktoon@gmail.com with catalogue PDF attached! Opening Gmail...`,
      });
      window.open(data.viewUrl || "https://mail.google.com/mail/u/0/#drafts", "_blank");
      await incrementQuotationCounter();
    } catch (err: any) {
      console.error("Error creating Gmail draft:", err);
      const msg = err?.message === "Failed to fetch"
        ? "Failed to connect to backend server. Make sure backend is running."
        : (err?.message || "Error creating Gmail draft");
      setSendStatus({ type: "error", message: msg });
    } finally {
      setIsSendingEmail(false);
    }
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
        await incrementQuotationCounter();
        return;
      }

      printWindow.addEventListener(
        "load",
        () => {
          window.setTimeout(() => URL.revokeObjectURL(printUrl), 60_000);
        },
        { once: true },
      );
      await incrementQuotationCounter();
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
    <div className="h-full w-full overflow-hidden bg-slate-100 p-4 md:p-6 flex flex-col">
      <style>{`
        .catalog-page {
          width: 210mm;
          min-height: 297mm;
          height: auto;
          margin: 0 auto;
          position: relative;
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 18px 48px rgba(15, 23, 42, 0.22);
          flex-shrink: 0;
        }

        .catalog-shell {
          min-height: 297mm;
          height: 100%;
          padding: 1.5mm;
          box-sizing: border-box;
          border: 2px solid rgba(0, 0, 0, 0.72);
        }

        .catalog-sheet {
          background: linear-gradient(180deg, #ffffff 0%, #f4f7fb 100%);
          border: 2px solid #000000;
          min-height: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
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
          margin-top: 10px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: #64748b;
        }

        .catalog-highlight-line {
          margin-top: 6px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #d97706;
          padding-bottom: 10px;
        }

        .catalog-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .catalog-products-section {
          padding: 10px 12px 6px;
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
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
          object-position: center;
          display: block;
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
          padding-bottom:7px;
        }

        .catalog-card-subtitle {
          text-align: center;
          font-size: 8px;
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
          text-align: center;
          padding: 16px 14px;
          color: #ffffff;
        }

        .catalog-card-custom-icon {
          width: 38px;
          height: 38px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          margin-bottom: 10px;
        }

        .catalog-card-custom-title {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #ffffff;
          line-height: 1.25;
        }

        .catalog-card-custom-copy {
          margin-top: 6px;
          font-size: 9px;
          line-height: 1.35;
          color: #c7d2fe;
        }

        .catalog-accent-bar {
          width: 14px;
          height: 4px;
          border-radius: 9999px;
          background: #d97706;
          display: inline-block;
        }

        .catalog-overview-list {
          margin-top: 14px;
          list-style: none;
          padding: 0;
        }

        .catalog-overview-list li {
          position: relative;
          padding-left: 14px;
          font-size: 10px;
          line-height: 1.45;
          color: #334155;
        }

        .catalog-overview-list li::before {
          content: "•";
          position: absolute;
          left: 0;
          top: 0;
          font-size: 11px;
          color: #64748b;
        }

        .catalog-overview-list li + li {
          margin-top: 4px;
        }

        .catalog-proposal {
          padding: 8px 10px 8px;
          background: linear-gradient(180deg, rgba(244, 247, 251, 0.8) 0%, #ffffff 100%);
          border-top: 1px solid #dde5ef;
          margin-top: 16px;
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
          gap: 24px;
          padding: 14px 20px 10px;
        }

        .catalog-footer-title {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #98a6c0;
        }

        .catalog-footer-copy {
          margin-top: 5px;
          white-space: pre-line;
          font-size: 9px;
          line-height: 1.5;
          color: #eef2ff;
        }

        .catalog-footer-copy-muted {
          margin-top: 5px;
          font-size: 9px;
          line-height: 1.5;
          color: #94a3b8;
        }

        .catalog-footer-link {
          color: #ffffff;
          text-decoration: underline;
        }

        .catalog-footer-bottom {
          border-top: 1px solid rgba(148, 163, 184, 0.16);
          padding: 7px 20px 8px;
          text-align: center;
        }
      `}</style>

      <div className="mx-auto grid h-full w-full max-w-[1600px] gap-6 grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)] overflow-hidden">
        {/* LEFT PANEL: Send Catalogue Form */}
        <div className="h-full overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

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
                  value={totals.baseUnitPrice === 0 ? "" : totals.baseUnitPrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    const nextPrice = val === "" ? 0 : Math.max(0, Number(val));
                    setItems((prev) =>
                      prev.map((item) => ({ ...item, unitPrice: nextPrice }))
                    );
                  }}
                  placeholder="0"
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">GST %</span>
                <input
                  type="number"
                  min={0}
                  value={gstRate === 0 ? "" : gstRate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGstRate(val === "" ? 0 : Math.max(0, Number(val)));
                  }}
                  placeholder="0"
                  className={fieldClass}
                />
              </label>
            </div>

            <div className="rounded-xl border p-4 space-y-3 bg-slate-50">
              <h2 className="text-sm font-black uppercase text-slate-700">GSTIN & Delivery Charges</h2>

              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={gstEnabled}
                    onChange={(e) => setGstEnabled(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <span>Enable GSTIN</span>
                </label>

                {gstEnabled && (
                  <div className="mt-2">
                    <span className="mb-1 block text-xs font-black uppercase text-slate-500">GSTIN Value</span>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      placeholder="27XXXXXXXXXX1Z5"
                      className={`${fieldClass} font-mono uppercase`}
                    />
                  </div>
                )}
              </div>

              <div>
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">Delivery Charges (₹)</span>
                <input
                  type="number"
                  min={0}
                  value={deliveryCharges === 0 ? "" : deliveryCharges}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDeliveryCharges(val === "" ? 0 : Math.max(0, Number(val)));
                  }}
                  placeholder="0"
                  className={fieldClass}
                />
                <span className="mt-1 block text-[11px] text-slate-400">Enter ₹0 for free delivery or any valid positive amount.</span>
              </div>
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
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    Import Products
                  </button>
                  <button
                    type="button"
                    onClick={addItem}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Add Item
                  </button>
                </div>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Custom Card</p>
                  {!showCustomCard && (
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-600">
                      Deleted from preview
                    </span>
                  )}
                </div>
                {showCustomCard ? (
                  <button
                    type="button"
                    onClick={() => setShowCustomCard(false)}
                    className="flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-700 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Card
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCustomCard(true)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                  >
                    + Add Card
                  </button>
                )}
              </div>

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

            {toast && (
              <div className={`p-3 rounded-lg text-xs font-bold text-center border ${toast.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-red-50 text-red-800 border-red-300"}`}>
                {toast.message}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSaveCatalogue}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : savedCatalogueId ? (
                  "Save Changes"
                ) : (
                  "Save Catalogue"
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>

            <div className="flex gap-3">
              <button onClick={handlePrint} className="flex-1 rounded-lg border border-slate-300 px-3 py-3 text-xs font-bold hover:bg-slate-50 transition">
                Print
              </button>
              <button onClick={handleDownload} disabled={isExporting || isGeneratingCatalogue} className="flex-1 rounded-lg bg-slate-900 px-3 py-3 text-xs font-bold text-white hover:bg-slate-800 transition flex items-center justify-center gap-1.5">
                {isGeneratingCatalogue ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Download PDF
              </button>
              <button onClick={handleSendEmail} disabled={isSendingEmail || isGeneratingCatalogue} className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm">
                {isSendingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                Send Email
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Catalogue Preview (Independent Scroll & Responsive Auto-Fit Scaling) */}
        <div
          id="deal-send-preview"
          ref={previewContainerRef}
          className="h-full overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-200 bg-slate-200/50 p-4 md:p-6 shadow-inner flex flex-col items-center"
        >

          {/* Catalogue Actions & Email Attachment Card */}
          <div className="w-full max-w-[210mm] bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 mb-6 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Catalogue Preview</h2>
                <p className="text-xs text-slate-500">Preview catalogue, download PDF, or send email with PDF attached.</p>
              </div>
              {isGeneratingCatalogue ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                </span>
              ) : generatedCatalogue ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                  <Check className="w-4 h-4" /> Catalogue Ready
                </span>
              ) : (
                <button
                  onClick={ensureGeneratedCatalogue}
                  disabled={isGeneratingCatalogue}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-xl transition border border-indigo-200"
                >
                  Generate Catalogue
                </button>
              )}
            </div>

            {/* Attachment Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">📎</span>
                <div>
                  <p className="text-xs font-black text-slate-800">
                    {generatedCatalogue ? generatedCatalogue.filename : `catalogue-${quotationNo}.pdf`}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">Automatically attached when sending</p>
                </div>
              </div>
              {generatedCatalogue && (
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded-md">
                  Referenced
                </span>
              )}
            </div>

            {/* Recipient Email & Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1">To:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (sendStatus) setSendStatus(null);
                  }}
                  placeholder="lead@example.com"
                  className={fieldClass}
                />
              </div>

              <div className="flex items-end gap-3">
                <button
                  onClick={handleDownload}
                  disabled={isExporting || isGeneratingCatalogue}
                  className="flex-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 transition flex items-center justify-center gap-1.5 h-[40px]"
                >
                  {isGeneratingCatalogue ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Download Catalogue
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || isGeneratingCatalogue}
                  className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold transition flex items-center justify-center gap-2 h-[40px] shadow-sm"
                >
                  {isSendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Send Email
                </button>
              </div>
            </div>

            {/* Status feedback */}
            {sendStatus && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between transition ${
                  sendStatus.type === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border border-rose-200 text-rose-800"
                }`}
              >
                <span>{sendStatus.message}</span>
                <button onClick={() => setSendStatus(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {isScreenProtected && (
            <ScreenshotPrivacyOverlay message="Hidden while this window is out of focus, so catalog pricing and artwork stay off task-switcher previews." />
          )}
          {catalogPages.map((page, pageIndex) => {
            const pageHeightPx = 297 * 3.7795275591; // ~1122.5px
            const scaledHeight = pageHeightPx * previewScale;
            const marginOffset = previewScale < 1 ? -(pageHeightPx - scaledHeight) + 24 : 24;

            return (
              <div
                key={`catalog-page-wrapper-${pageIndex}`}
                className="w-full flex justify-center flex-shrink-0"
                style={{
                  minHeight: previewScale < 1 ? `${scaledHeight}px` : undefined,
                  marginBottom: `${marginOffset}px`,
                }}
              >
                <div
                  className="catalog-page"
                  style={{
                    transform: previewScale < 1 ? `scale(${previewScale})` : undefined,
                    transformOrigin: "top center",
                  }}
                >
                  <div className="catalog-shell">
                    <div className="catalog-sheet">
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

                        <h2 className="mt-1.5 text-[18px] font-black tracking-tight text-slate-900 whitespace-pre-wrap">
                          {subject}
                        </h2>
                        <div className="catalog-highlight-line">
                          {normalizedHighlightLine}
                        </div>
                      </div>

                      {page.cards.length > 0 && (
                        <div className="catalog-products-section">
                          <div className="catalog-grid">
                            {page.cards.map((card, cardIndex) => {
                              if (card.type === "item") {
                                const item = card.item;
                                return (
                                  <div key={item.id} className="catalog-card relative">
                                    {!isExporting && !isPrinting && items.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => removeItem(item.id)}
                                        title="Delete this card"
                                        className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow hover:bg-rose-600 transition"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
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
                                );
                              } else {
                                return (
                                  <div key={`custom-card-${cardIndex}`} className="catalog-card catalog-card-custom relative">
                                    {!isExporting && !isPrinting && (
                                      <button
                                        type="button"
                                        onClick={() => setShowCustomCard(false)}
                                        title="Delete Custom Card"
                                        className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow hover:bg-rose-600 transition"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
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
                                );
                              }
                            })}
                          </div>
                        </div>
                      )}

                      {page.showProposal && (
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
                                {gstEnabled && (
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-600">GST ({gstRate}%)</span>
                                    <span className="font-extrabold text-slate-900">₹{totals.gstPerUnit.toFixed(2)}</span>
                                  </div>
                                )}
                                {totals.deliveryCharges > 0 && (
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-600">Delivery Charges</span>
                                    <span className="font-extrabold text-slate-900">₹{totals.deliveryCharges}</span>
                                  </div>
                                )}
                                <div className="mt-4 border-t border-slate-200 pt-4 space-y-2">
                                  <div className="flex items-end justify-between gap-3">
                                    <span className="text-[12px] font-black text-slate-900">Total Per Unit</span>
                                    <span className="text-[20px] font-black leading-none text-slate-900">₹{totals.totalPerUnit.toFixed(2)}</span>
                                  </div>
                                  {totals.totalUnits > 1 && (
                                    <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-700 pt-1 border-t border-slate-100">
                                      <span>Total ({totals.totalUnits} Units)</span>
                                      <span>₹{totals.total.toFixed(2)}</span>
                                    </div>
                                  )}
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
                      )}

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
                            Page {pageIndex + 1} of {catalogPages.length} | {footerNote}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isImportModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="flex h-full max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Import Products</h3>
                <p className="text-xs text-slate-500">Select products to import into your catalogue items</p>
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
                    const selectionIndex = selectedProductIds.indexOf(prod._id);
                    const selectionNumber = selectionIndex !== -1 ? selectionIndex + 1 : null;
                    const isSelected = selectionNumber !== null;
                    return (
                      <div
                        key={prod._id}
                        onClick={() => toggleProductSelection(prod._id)}
                        className={`relative flex cursor-pointer flex-col overflow-hidden rounded-xl border p-2 transition hover:shadow-md ${isSelected
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

                          {/* Selection Order Bubble */}
                          <div className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-black transition ${isSelected
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                            : "border-slate-300 bg-white/80 text-transparent"
                            }`}>
                            {isSelected ? selectionNumber : ""}
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
                    if (selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0) {
                      setSelectedProductIds([]);
                    } else {
                      const currentSet = new Set(selectedProductIds);
                      const newIds = filteredProducts.map((p) => p._id).filter((id) => !currentSet.has(id));
                      setSelectedProductIds([...selectedProductIds, ...newIds]);
                    }
                  }}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  {selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0 ? "Deselect All" : "Select All"}
                </button>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs font-bold text-slate-500">
                  {selectedProductIds.length} selected
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
                  disabled={selectedProductIds.length === 0}
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
