import React, { useEffect, useState } from "react";
import {
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Globe,
  Mail,
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  Linkedin,
  MapPin,
  ShieldCheck,
  Loader2,
  Layers,
  Phone,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

export interface FooterLinkItem {
  label: string;
  url: string;
  enabled: boolean;
}

export interface SocialPlatformConfig {
  url: string;
  enabled: boolean;
}

export interface FooterData {
  aboutTitle: string;
  aboutDescription: string;
  contactEmail: string;
  contactPhone: string;
  archiveTitle: string;
  archiveLinks: FooterLinkItem[];
  infoTitle: string;
  infoLinks: FooterLinkItem[];
  followTitle: string;
  socialLinks: {
    instagram: SocialPlatformConfig;
    facebook: SocialPlatformConfig;
    youtube: SocialPlatformConfig;
    twitter: SocialPlatformConfig;
    linkedin: SocialPlatformConfig;
    email: SocialPlatformConfig;
  };
  locationTitle: string;
  locationIcon: string;
  locationText: string;
  copyrightText: string;
  taglineText: string;
  securePaymentText: string;
  paymentMethods: string[];
}

const defaultFooterState: FooterData = {
  aboutTitle: "ABOUT US",
  aboutDescription:
    "Creators of bold, affordable pin badges and custom merch. Every design tells your story. Badge culture, redefined with unbeatable quality and prices.",
  contactEmail: "sticktoon.xyz@gmail.com",
  contactPhone: "",
  archiveTitle: "ARCHIVE",
  archiveLinks: [
    { label: "OUR STORY", url: "/about", enabled: true },
    { label: "ALL DROPS", url: "/categories", enabled: true },
    { label: "CUSTOM ORDER", url: "/custom-order", enabled: true },
    { label: "FAQ", url: "/faq", enabled: true },
  ],
  infoTitle: "INFORMATION",
  infoLinks: [
    { label: "PRIVACY POLICY", url: "/privacy-policy", enabled: true },
    { label: "TERMS & CONDITIONS", url: "/terms-conditions", enabled: true },
    { label: "REFUND POLICY", url: "/refund-cancellation", enabled: true },
    { label: "GET IN TOUCH", url: "/contact", enabled: true },
  ],
  followTitle: "FOLLOW",
  socialLinks: {
    instagram: { url: "https://www.instagram.com/sticktoon.shop", enabled: true },
    email: { url: "mailto:sticktoon.xyz@gmail.com", enabled: true },
    facebook: { url: "", enabled: false },
    youtube: { url: "", enabled: false },
    twitter: { url: "", enabled: false },
    linkedin: { url: "", enabled: false },
  },
  locationTitle: "MADE IN INDIA",
  locationIcon: "🇮🇳",
  locationText:
    "Proudly designed and produced in India—crafted with care, quality, and local talent.",
  copyrightText: "© 2026 StickToon",
  taglineText: "Where design meets personal identity.",
  securePaymentText: "100% Secure Payments",
  paymentMethods: ["VISA", "MASTERCARD", "UPI", "GPAY", "PAYTM", "RUPAY"],
};

export const AdminFooter: React.FC = () => {
  const [footerData, setFooterData] = useState<FooterData>(defaultFooterState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [activeTab, setActiveTab] = useState<"about" | "social" | "archive" | "info" | "location" | "bottom">("about");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetchFooterData();
  }, []);

  const fetchFooterData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API_BASE_URL}/api/admin/footer`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setFooterData({
          ...defaultFooterState,
          ...data,
          socialLinks: {
            ...defaultFooterState.socialLinks,
            ...(data.socialLinks || {}),
          },
        });
      }
    } catch (err) {
      console.error("Error loading footer settings:", err);
      showToast("Failed to load footer settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API_BASE_URL}/api/admin/footer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(footerData),
      });

      if (res.ok) {
        showToast("Footer settings saved successfully!", "success");
      } else {
        const errData = await res.json();
        showToast(errData.message || "Failed to save footer settings", "error");
      }
    } catch (err) {
      console.error("Error saving footer data:", err);
      showToast("Error connecting to server to save footer data", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm("Are you sure you want to reset all footer fields to default values?")) {
      setFooterData(defaultFooterState);
      showToast("Reset to standard defaults", "success");
    }
  };

  // Helper link manipulators
  const updateLink = (
    type: "archive" | "info",
    index: number,
    field: "label" | "url" | "enabled",
    val: any
  ) => {
    const listKey = type === "archive" ? "archiveLinks" : "infoLinks";
    const updated = [...footerData[listKey]];
    updated[index] = { ...updated[index], [field]: val };
    setFooterData({ ...footerData, [listKey]: updated });
  };

  const addLink = (type: "archive" | "info") => {
    const listKey = type === "archive" ? "archiveLinks" : "infoLinks";
    setFooterData({
      ...footerData,
      [listKey]: [...footerData[listKey], { label: "NEW LINK", url: "/", enabled: true }],
    });
  };

  const removeLink = (type: "archive" | "info", index: number) => {
    const listKey = type === "archive" ? "archiveLinks" : "infoLinks";
    const updated = footerData[listKey].filter((_, i) => i !== index);
    setFooterData({ ...footerData, [listKey]: updated });
  };

  const updateSocialPlatform = (
    platform: keyof FooterData["socialLinks"],
    field: "url" | "enabled",
    value: any
  ) => {
    setFooterData({
      ...footerData,
      socialLinks: {
        ...footerData.socialLinks,
        [platform]: {
          ...(footerData.socialLinks[platform] || { url: "", enabled: false }),
          [field]: value,
        },
      },
    });
  };

  const togglePaymentMethod = (method: string) => {
    const exists = footerData.paymentMethods.includes(method);
    let updated: string[];
    if (exists) {
      updated = footerData.paymentMethods.filter((m) => m !== method);
    } else {
      updated = [...footerData.paymentMethods, method];
    }
    setFooterData({ ...footerData, paymentMethods: updated });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-bold text-slate-600">Loading Footer Management Settings...</p>
      </div>
    );
  }

  const allAvailablePayments = ["VISA", "MASTERCARD", "UPI", "GPAY", "PAYTM", "RUPAY", "AMEX", "NETBANKING"];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">Footer Management</h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Admin interface to customize content, URLs, and social toggles on the public customer website footer.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition shadow disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Footer Settings"}
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={`p-4 rounded-xl text-xs font-bold text-center border transition-all animate-fadeIn ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
              : "bg-red-50 text-red-800 border-red-300"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        {[
          { id: "about", label: "About Us & Contact", icon: <Globe className="w-4 h-4" /> },
          { id: "social", label: "Social Links", icon: <Instagram className="w-4 h-4" /> },
          { id: "archive", label: "Archive Navigation", icon: <Plus className="w-4 h-4" /> },
          { id: "info", label: "Information Navigation", icon: <ShieldCheck className="w-4 h-4" /> },
          { id: "location", label: "Made in India", icon: <MapPin className="w-4 h-4" /> },
          { id: "bottom", label: "Bottom Strip & Payments", icon: <Layers className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition ${
              activeTab === tab.id
                ? "bg-slate-900 text-white shadow-md"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content Panels */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        {/* ABOUT US TAB */}
        {activeTab === "about" && (
          <div className="space-y-5 max-w-3xl">
            <h2 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">
              About Us & Contact Information
            </h2>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Column Header Title
              </label>
              <input
                type="text"
                value={footerData.aboutTitle}
                onChange={(e) => setFooterData({ ...footerData, aboutTitle: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                About / Company Description
              </label>
              <textarea
                rows={4}
                value={footerData.aboutDescription}
                onChange={(e) => setFooterData({ ...footerData, aboutDescription: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 leading-relaxed"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Support Email Address
                </label>
                <input
                  type="email"
                  value={footerData.contactEmail}
                  onChange={(e) => setFooterData({ ...footerData, contactEmail: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Contact Phone Number (Optional)
                </label>
                <input
                  type="text"
                  value={footerData.contactPhone || ""}
                  onChange={(e) => setFooterData({ ...footerData, contactPhone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* SOCIAL LINKS TAB */}
        {activeTab === "social" && (
          <div className="space-y-5 max-w-3xl">
            <h2 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">
              Social Links & Channels Management
            </h2>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Section Header Title
              </label>
              <input
                type="text"
                value={footerData.followTitle}
                onChange={(e) => setFooterData({ ...footerData, followTitle: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500 mb-4"
              />
            </div>

            <div className="space-y-4">
              {[
                { key: "instagram" as const, name: "Instagram", icon: <Instagram className="w-4 h-4 text-pink-600" />, defaultPlaceholder: "https://www.instagram.com/sticktoon.shop" },
                { key: "email" as const, name: "Email", icon: <Mail className="w-4 h-4 text-indigo-600" />, defaultPlaceholder: "mailto:sticktoon.xyz@gmail.com" },
                { key: "facebook" as const, name: "Facebook", icon: <Facebook className="w-4 h-4 text-blue-600" />, defaultPlaceholder: "https://facebook.com/..." },
                { key: "youtube" as const, name: "YouTube", icon: <Youtube className="w-4 h-4 text-red-600" />, defaultPlaceholder: "https://youtube.com/..." },
                { key: "twitter" as const, name: "X / Twitter", icon: <Twitter className="w-4 h-4 text-sky-500" />, defaultPlaceholder: "https://x.com/..." },
                { key: "linkedin" as const, name: "LinkedIn", icon: <Linkedin className="w-4 h-4 text-blue-700" />, defaultPlaceholder: "https://linkedin.com/in/..." },
              ].map((platform) => {
                const item = footerData.socialLinks[platform.key] || { url: "", enabled: false };
                return (
                  <div key={platform.key} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 w-36 shrink-0">
                      {platform.icon}
                      <span className="text-xs font-black text-slate-900">{platform.name}</span>
                    </div>

                    <input
                      type="text"
                      placeholder={platform.defaultPlaceholder}
                      value={item.url}
                      onChange={(e) => updateSocialPlatform(platform.key, "url", e.target.value)}
                      className="flex-1 px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-mono text-slate-700 outline-none focus:border-indigo-500"
                    />

                    <button
                      type="button"
                      onClick={() => updateSocialPlatform(platform.key, "enabled", !item.enabled)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                        item.enabled
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-slate-200 text-slate-600 border border-slate-300"
                      }`}
                    >
                      {item.enabled ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-slate-400" />}
                      {item.enabled ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ARCHIVE NAVIGATION TAB */}
        {activeTab === "archive" && (
          <div className="space-y-5 max-w-3xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900">Archive Column Links</h2>
              <button
                type="button"
                onClick={() => addLink("archive")}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Link
              </button>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Column Title
              </label>
              <input
                type="text"
                value={footerData.archiveTitle}
                onChange={(e) => setFooterData({ ...footerData, archiveTitle: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-3 pt-2">
              {footerData.archiveLinks.map((link, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    placeholder="Link Label"
                    value={link.label}
                    onChange={(e) => updateLink("archive", idx, "label", e.target.value)}
                    className="w-full sm:w-48 px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-800"
                  />
                  <input
                    type="text"
                    placeholder="URL path (e.g. /about)"
                    value={link.url}
                    onChange={(e) => updateLink("archive", idx, "url", e.target.value)}
                    className="w-full sm:flex-1 px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-mono text-slate-600"
                  />
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <button
                      type="button"
                      onClick={() => updateLink("archive", idx, "enabled", !link.enabled)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                        link.enabled
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-slate-200 text-slate-600 border border-slate-300"
                      }`}
                    >
                      {link.enabled ? "Visible" : "Hidden"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLink("archive", idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                      title="Remove Link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INFORMATION NAVIGATION TAB */}
        {activeTab === "info" && (
          <div className="space-y-5 max-w-3xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900">Information Column Links</h2>
              <button
                type="button"
                onClick={() => addLink("info")}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Link
              </button>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Column Title
              </label>
              <input
                type="text"
                value={footerData.infoTitle}
                onChange={(e) => setFooterData({ ...footerData, infoTitle: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-3 pt-2">
              {footerData.infoLinks.map((link, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    placeholder="Link Label"
                    value={link.label}
                    onChange={(e) => updateLink("info", idx, "label", e.target.value)}
                    className="w-full sm:w-48 px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-800"
                  />
                  <input
                    type="text"
                    placeholder="URL path (e.g. /privacy-policy)"
                    value={link.url}
                    onChange={(e) => updateLink("info", idx, "url", e.target.value)}
                    className="w-full sm:flex-1 px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs font-mono text-slate-600"
                  />
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <button
                      type="button"
                      onClick={() => updateLink("info", idx, "enabled", !link.enabled)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                        link.enabled
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-slate-200 text-slate-600 border border-slate-300"
                      }`}
                    >
                      {link.enabled ? "Visible" : "Hidden"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLink("info", idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                      title="Remove Link"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MADE IN INDIA TAB */}
        {activeTab === "location" && (
          <div className="space-y-5 max-w-3xl">
            <h2 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">
              Made in India / Location Column
            </h2>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Column Header Title
              </label>
              <input
                type="text"
                value={footerData.locationTitle}
                onChange={(e) => setFooterData({ ...footerData, locationTitle: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Location Badge Icon / Emoji
              </label>
              <input
                type="text"
                value={footerData.locationIcon}
                onChange={(e) => setFooterData({ ...footerData, locationIcon: e.target.value })}
                className="w-24 px-4 py-2.5 rounded-xl border border-slate-200 text-lg text-center outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Location Description Text
              </label>
              <textarea
                rows={3}
                value={footerData.locationText}
                onChange={(e) => setFooterData({ ...footerData, locationText: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* BOTTOM STRIP TAB */}
        {activeTab === "bottom" && (
          <div className="space-y-5 max-w-3xl">
            <h2 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">
              Footer Bottom Strip & Payment Badges
            </h2>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Copyright Text
              </label>
              <input
                type="text"
                value={footerData.copyrightText}
                onChange={(e) => setFooterData({ ...footerData, copyrightText: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Tagline / Slogan Text
              </label>
              <input
                type="text"
                value={footerData.taglineText}
                onChange={(e) => setFooterData({ ...footerData, taglineText: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
                Payment Guarantee Badge Label
              </label>
              <input
                type="text"
                value={footerData.securePaymentText}
                onChange={(e) => setFooterData({ ...footerData, securePaymentText: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                Active Payment Badges
              </label>
              <div className="flex flex-wrap gap-2">
                {allAvailablePayments.map((method) => {
                  const isActive = footerData.paymentMethods.includes(method);
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => togglePaymentMethod(method)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black border transition ${
                        isActive
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {isActive ? "✓ " : "+ "}
                      {method}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFooter;
