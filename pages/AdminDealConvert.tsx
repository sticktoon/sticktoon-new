import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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

const makeQuoteNumber = () => {
  const now = new Date();
  return `ST/QTN/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
};

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

export default function AdminDealConvert() {
  const location = useLocation();
  const navigate = useNavigate();
  const lead = (location.state as { lead?: LeadLike } | null)?.lead;
  const isSendMode = location.pathname === "/admin/deal-send";
  const pageTitle = isSendMode ? "Send Quotation" : "Convert Deal";
  const pageSubtitle = isSendMode
    ? "Prepare the quotation before sending it."
    : "Edit fields and generate quotation.";

  const [quotationFor, setQuotationFor] = useState(
    [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") || "",
  );
  const [company, setCompany] = useState(lead?.company || "");
  const [email, setEmail] = useState(lead?.email || "");
  const [phone, setPhone] = useState(lead?.phone || "");
  const [address, setAddress] = useState("");
  const [quotationNo, setQuotationNo] = useState(makeQuoteNumber());
  const [quotationDate, setQuotationDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [validityDays, setValidityDays] = useState(30);
  const [subject, setSubject] = useState(
    "Quotation for manufacturing & printing",
  );
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
  const [termsText, setTermsText] = useState(
    [
      "1. Currency: All prices are in Indian Rupees (INR).",
      "2. Taxes: Rates are inclusive of applicable GST unless stated otherwise.",
      "3. Lead time depends on artwork approval and order confirmation.",
      "4. Validity: This quotation is valid for 30 days.",
    ].join("\n"),
  );
  const [accountName, setAccountName] = useState("Anish Patankar (Stick Toon)");
  const [bankName, setBankName] = useState("State Bank of India");
  const [accountNumber, setAccountNumber] = useState("41532186427");
  const [ifsc, setIfsc] = useState("SBIN0000502");
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
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const isStaticPreview = isExporting || isPrinting;

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

      return pdf;
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = async () => {
    const pdf = await buildPdf();
    if (!pdf) return;
    pdf.save(`quotation-${quotationNo}.pdf`);
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
          <h1 className="text-2xl font-black text-slate-900">No deal selected</h1>
          <p className="mt-2 text-slate-600">
            Open this page from the Leads table using the {isSendMode ? "Send" : "Convert"} action.
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

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">Quotation For</span>
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
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">Quotation No</span>
                <input value={quotationNo} onChange={(e) => setQuotationNo(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">Date</span>
                <input type="date" value={quotationDate} onChange={(e) => setQuotationDate(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">Validity Days</span>
                <input type="number" min={1} value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value || 30))} className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-500">GST %</span>
                <input type="number" min={0} value={gstRate} onChange={(e) => setGstRate(Number(e.target.value || 0))} className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-black uppercase text-slate-500">Subject</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className={`w-full rounded-lg border px-3 py-2 text-sm ${printFieldClass}`} />
            </label>

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
                      <div className="text-right text-sm font-semibold leading-6">
                        <p>GSTIN: 27HENPP0138G1Z9</p>
                        <p>Udyam Reg: UDYAM-MH-03-0082090</p>
                        <p>Email: sticktoon.xyz@gmail.com</p>
                        <p>Contact: +91 895 666 7277</p>
                      </div>
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-6 border-b pb-6">
                      <div>
                        <p className="text-sm font-black uppercase">Quotation For:</p>
                        <p className="mt-3 text-2xl font-black">{quotationFor || "-"}</p>
                        {company.trim() ? <p className="mt-1 text-base">{company}</p> : null}
                        {email.trim() ? <p className="text-base">{email}</p> : null}
                        {phone.trim() ? <p className="text-base">{phone}</p> : null}
                        {address.trim() ? <p className="whitespace-pre-line text-base">{address}</p> : null}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black uppercase">Details:</p>
                        <p className="mt-3"><span className="font-black">Quotation No:</span> {quotationNo}</p>
                        <p><span className="font-black">Date:</span> {quotationDate}</p>
                        <p><span className="font-black">Validity:</span> {validityDays} Days</p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <p className="text-sm font-black uppercase underline">{subject}</p>
                      <p className="mt-4 text-sm leading-7 text-slate-700">
                        Dear Sir/Ma'am, thank you for your interest in Stick Toon. Please find below the
                        quotation details prepared for your requirement.
                      </p>
                    </div>
                  </>
                )}

                <div className={`${pageIndex === 0 ? "mt-6" : "mt-0"} overflow-hidden rounded-xl border`}>
                  <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
                    <p className="text-sm font-black uppercase text-slate-700">Items</p>
                    {pageIndex === 0 && (
                      <button
                        onClick={addItem}
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-bold text-white print:hidden"
                      >
                        Add Row
                      </button>
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
                                    <p className="mt-1 text-[9px] italic text-slate-500">{item.subDescription}</p>
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
                                    className={`w-full rounded-md border px-2 py-2 text-[9px] italic text-slate-600 ${printFieldClass}`}
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
                                <div>Rs. {item.unitPrice.toLocaleString("en-IN")}</div>
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
                            <td className={rowCellClass}>{amount.toLocaleString("en-IN")}</td>
                            <td className={rowCellClass}>{Math.round(igst).toLocaleString("en-IN")}</td>
                            <td className={`${rowCellClass} font-black`}>
                              <div className={`flex items-center justify-center ${isStaticPreview ? "" : "flex-col gap-2"}`}>
                                <span>Rs. {Math.round(amount + igst).toLocaleString("en-IN")}</span>
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
                          <td className="border px-3 py-3 text-center">{Math.round(totals.subtotal).toLocaleString("en-IN")}</td>
                          <td className="border px-3 py-3 text-center">{Math.round(totals.gstAmount).toLocaleString("en-IN")}</td>
                          <td className="border px-4 py-3 text-center font-black">Rs. {Math.round(totals.grandTotal).toLocaleString("en-IN")}</td>
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
                <div className="whitespace-pre-line text-slate-700">{termsText}</div>
              </div>
              <div>
                <p className="mb-2 font-black uppercase">Bank Account Details:</p>
                <div className="rounded-lg bg-slate-100 p-4 leading-7">
                  <p><span className="font-black">Account Name:</span> {accountName}</p>
                  <p><span className="font-black">Bank Name:</span> {bankName}</p>
                  <p><span className="font-black">Account No:</span> {accountNumber}</p>
                  <p><span className="font-black">SWIFT Code:</span> SBININBBXXX</p>
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
                <p className="text-3xl font-black">For StickToon</p>
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
    </div>
  );
}
