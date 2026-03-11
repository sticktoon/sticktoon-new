import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const printFieldClass =
  "print:border-0 print:bg-transparent print:p-0 print:shadow-none print:outline-none print:ring-0";

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
};

const makeQuoteNumber = () => {
  const now = new Date();
  return `ST/QTN/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
};

export default function AdminDealConvert() {
  const location = useLocation();
  const navigate = useNavigate();
  const lead = (location.state as { lead?: LeadLike } | null)?.lead;

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

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0),
      0,
    );
    const gstAmount = (subtotal * Number(gstRate || 0)) / 100;
    return {
      subtotal,
      gstAmount,
      grandTotal: subtotal + gstAmount,
    };
  }, [gstRate, items]);

  const updateItem = (id: string, updates: Partial<QuoteItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${prev.length + 1}`,
        description: "",
        unitPrice: 0,
        quantity: 1,
        image: "",
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((item) => item.id !== id)));
  };

  const handleDownload = async () => {
    const element = document.getElementById("deal-quotation-preview");
    if (!element) return;

    try {
      setIsExporting(true);
      await new Promise((resolve) => setTimeout(resolve, 80));

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`quotation-${quotationNo}.pdf`);
    } finally {
      setIsExporting(false);
    }
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
            Open this page from the Deals table using the Convert action.
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
        @media print {
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
      `}</style>
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[380px_1fr]">
        <div className="rounded-2xl border bg-white p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Convert Deal</h1>
              <p className="text-sm text-slate-500">Edit fields and generate quotation.</p>
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
              <button onClick={() => window.print()} className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold print:hidden">
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
          className={`rounded-2xl border bg-white p-8 text-black ${isExporting ? "exporting" : ""}`}
        >
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
              <p className="mt-1 text-base">{company || "-"}</p>
              <p className="text-base">{email || "-"}</p>
              <p className="text-base">{phone || "-"}</p>
              <p className="whitespace-pre-line text-base">{address || "-"}</p>
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

          <div className="mt-6 overflow-hidden rounded-xl border">
            <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
              <p className="text-sm font-black uppercase text-slate-700">Items</p>
              <button
                onClick={addItem}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-bold text-white print:hidden"
              >
                Add Row
              </button>
            </div>
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border px-3 py-2 text-left font-black">S.N.</th>
                  <th className="border px-3 py-2 text-left font-black">Description</th>
                  <th className="border px-3 py-2 text-left font-black">Design Preview</th>
                  <th className="border px-3 py-2 text-right font-black">Unit Price</th>
                  <th className="border px-3 py-2 text-right font-black">Quantity</th>
                  <th className="border px-3 py-2 text-right font-black">Amount</th>
                  <th className="border px-3 py-2 text-right font-black">IGST</th>
                  <th className="border px-3 py-2 text-right font-black">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const amount = item.unitPrice * item.quantity;
                  const igst = (amount * gstRate) / 100;
                  return (
                    <tr key={item.id}>
                      <td className="border px-3 py-3">{index + 1}</td>
                      <td className="border px-3 py-3">
                        {isExporting ? (
                          <div className="text-sm font-semibold">{item.description || "-"}</div>
                        ) : (
                          <input
                            value={item.description}
                            onChange={(e) => updateItem(item.id, { description: e.target.value })}
                            placeholder="Description"
                            className={`w-full rounded-md border px-2 py-2 text-sm font-semibold ${printFieldClass}`}
                          />
                        )}
                      </td>
                      <td className="border px-3 py-3">
                        <div className="space-y-2">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.description || `Item ${index + 1}`}
                              className="h-16 w-24 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-16 w-24 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
                              No image
                            </div>
                          )}
                          {!isExporting && (
                            <>
                              <input
                                value={item.image || ""}
                                onChange={(e) => updateItem(item.id, { image: e.target.value })}
                                placeholder="Image URL"
                                className="w-full rounded-md border px-2 py-1.5 text-xs print:hidden"
                              />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleItemImageUpload(item.id, e.target.files?.[0])}
                                className="block w-full text-xs text-slate-600 print:hidden"
                              />
                            </>
                          )}
                        </div>
                      </td>
                      <td className="border px-3 py-3">
                        {isExporting ? (
                          <div className="text-right">Rs. {item.unitPrice.toLocaleString("en-IN")}</div>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value || 0) })}
                            className={`w-24 rounded-md border px-2 py-2 text-right ${printFieldClass}`}
                          />
                        )}
                      </td>
                      <td className="border px-3 py-3">
                        {isExporting ? (
                          <div className="text-right">{item.quantity}</div>
                        ) : (
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value || 1) })}
                            className={`w-20 rounded-md border px-2 py-2 text-right ${printFieldClass}`}
                          />
                        )}
                      </td>
                      <td className="border px-3 py-3 text-right">Rs. {amount.toLocaleString("en-IN")}</td>
                      <td className="border px-3 py-3 text-right">Rs. {Math.round(igst).toLocaleString("en-IN")}</td>
                      <td className="border px-3 py-3 text-right font-black">
                        <div className="flex items-center justify-end gap-2">
                          <span>Rs. {Math.round(amount + igst).toLocaleString("en-IN")}</span>
                          {!isExporting && (
                            <button
                              onClick={() => removeItem(item.id)}
                              className="rounded border border-red-200 px-2 py-1 text-xs font-bold text-red-600 print:hidden"
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
              <tfoot className="bg-slate-900 text-white">
                <tr>
                  <td colSpan={5} className="border px-3 py-3 text-right font-black">Grand Total</td>
                  <td className="border px-3 py-3 text-right">Rs. {Math.round(totals.subtotal).toLocaleString("en-IN")}</td>
                  <td className="border px-3 py-3 text-right">Rs. {Math.round(totals.gstAmount).toLocaleString("en-IN")}</td>
                  <td className="border px-3 py-3 text-right font-black">Rs. {Math.round(totals.grandTotal).toLocaleString("en-IN")}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-8 text-sm force-new-page">
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
                <p><span className="font-black">IFSC Code:</span> {ifsc}</p>
                <p><span className="font-black">Branch:</span> {branch}</p>
              </div>
            </div>
          </div>

          <div className="mt-12 border-t pt-8 text-sm">
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
  );
}
