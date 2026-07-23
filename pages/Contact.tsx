
import React, { useState } from 'react';
import { Mail, Send, Loader2, CheckCircle2, MessageCircle, Phone, MapPin, Clock, ArrowRight, Sparkles, X } from 'lucide-react';
import { Instagram } from "lucide-react";
import { API_BASE_URL } from '../config/api';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    inquiryType: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const inquiryOptions = [
    'Customer Support (Existing Order Issue)',
    'Product Inquiry',
    'Feedback / Suggestions',
    'Other',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Failed to send inquiry');
      }

      setSubmittedTicketId(data.ticketId || '');
      setSubmitted(true);
      setFormData({ name: '', email: '', phone: '', inquiryType: '', message: '' });
    } catch (error: any) {
      setSubmitError(error.message || 'Failed to send inquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-yellow-50/40 relative overflow-hidden font-sans text-slate-900">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
        {/* Page Header - Compact */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-yellow-100 px-3.5 py-1.5 rounded-full border border-yellow-300 mb-3">
            <MessageCircle className="w-3.5 h-3.5 text-yellow-800" />
            <span className="text-[10px] font-black text-yellow-900 uppercase tracking-widest">Get In Touch</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">
            Contact Us
          </h1>
          <p className="text-slate-500 text-sm font-medium max-w-md mx-auto">
            Have a question or feedback? We'll get back to you within 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 max-w-6xl mx-auto">
          {/* ===== FORM (3 cols) ===== */}
          <div className="lg:col-span-3">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              {submitted ? (
                /* Success State */
                <div className="p-10 text-center">
                  <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-300">
                    <CheckCircle2 className="w-10 h-10 text-emerald-700" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Message Sent!</h3>
                  <p className="text-slate-600 font-medium mb-2">Our team will get back to you within 24 hours.</p>
                  {submittedTicketId && (
                    <div className="inline-flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-xl border border-yellow-200 mb-6">
                      <span className="text-yellow-800 text-sm font-bold">Ticket ID:</span>
                      <span className="text-slate-900 font-mono text-sm font-black">{submittedTicketId}</span>
                    </div>
                  )}
                  <div className="mt-4">
                    <button
                      onClick={() => { setSubmitted(false); setSubmittedTicketId(''); }}
                      className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 font-black rounded-xl transition-all shadow-md"
                    >
                      Send Another Message
                    </button>
                  </div>
                </div>
              ) : (
                /* Form */
                <form onSubmit={handleSubmit}>
                  <div className="p-6 lg:p-8 border-b border-slate-100">
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                      Send us a message
                    </h2>
                    <p className="text-slate-500 text-sm font-medium mt-1">Fill out the form below and we'll respond quickly.</p>
                  </div>

                  <div className="p-6 lg:p-8 space-y-5">
                    {submitError && (
                      <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                        <X className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <p className="text-red-700 text-sm font-bold">{submitError}</p>
                      </div>
                    )}

                    {/* Name & Phone Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-900 text-xs font-black uppercase tracking-wider mb-2">Your Name</label>
                        <input
                          required
                          type="text"
                          placeholder="Rahul Sharma"
                          value={formData.name}
                          onFocus={() => setFocusedField('name')}
                          onBlur={() => setFocusedField(null)}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          className={`w-full px-4 py-3 bg-white border-2 rounded-xl text-slate-900 placeholder:text-slate-500 font-semibold text-sm focus:outline-none transition-all duration-300 shadow-sm ${
                            focusedField === 'name' ? 'border-yellow-500 ring-4 ring-yellow-400/20' : 'border-slate-300 hover:border-slate-400'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-slate-900 text-xs font-black uppercase tracking-wider mb-2">Phone</label>
                        <input
                          required
                          type="tel"
                          placeholder="+91 98765 43210"
                          value={formData.phone}
                          onFocus={() => setFocusedField('phone')}
                          onBlur={() => setFocusedField(null)}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                          className={`w-full px-4 py-3 bg-white border-2 rounded-xl text-slate-900 placeholder:text-slate-500 font-semibold text-sm focus:outline-none transition-all duration-300 shadow-sm ${
                            focusedField === 'phone' ? 'border-yellow-500 ring-4 ring-yellow-400/20' : 'border-slate-300 hover:border-slate-400'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-slate-900 text-xs font-black uppercase tracking-wider mb-2">Email Address</label>
                      <input
                        required
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className={`w-full px-4 py-3 bg-white border-2 rounded-xl text-slate-900 placeholder:text-slate-500 font-semibold text-sm focus:outline-none transition-all duration-300 shadow-sm ${
                          focusedField === 'email' ? 'border-yellow-500 ring-4 ring-yellow-400/20' : 'border-slate-300 hover:border-slate-400'
                        }`}
                      />
                    </div>

                    {/* Inquiry Type */}
                    <div>
                      <label className="block text-slate-900 text-xs font-black uppercase tracking-wider mb-2">Inquiry Type</label>
                      <select
                        required
                        value={formData.inquiryType}
                        onFocus={() => setFocusedField('type')}
                        onBlur={() => setFocusedField(null)}
                        onChange={e => setFormData({ ...formData, inquiryType: e.target.value })}
                        className={`w-full px-4 py-3 bg-white border-2 rounded-xl text-slate-900 font-semibold text-sm focus:outline-none transition-all duration-300 shadow-sm ${
                          focusedField === 'type' ? 'border-yellow-500 ring-4 ring-yellow-400/20' : 'border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <option value="" disabled className="text-slate-500">Select an inquiry type</option>
                        {inquiryOptions.map((option) => (
                          <option key={option} value={option} className="bg-white text-slate-900 font-medium">{option}</option>
                        ))}
                      </select>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-slate-900 text-xs font-black uppercase tracking-wider mb-2">Message</label>
                      <textarea
                        required
                        placeholder="Tell us what's on your mind..."
                        rows={4}
                        value={formData.message}
                        onFocus={() => setFocusedField('message')}
                        onBlur={() => setFocusedField(null)}
                        onChange={e => setFormData({...formData, message: e.target.value})}
                        className={`w-full px-4 py-3 bg-white border-2 rounded-xl text-slate-900 placeholder:text-slate-500 font-semibold text-sm focus:outline-none transition-all duration-300 resize-none shadow-sm ${
                          focusedField === 'message' ? 'border-yellow-500 ring-4 ring-yellow-400/20' : 'border-slate-300 hover:border-slate-400'
                        }`}
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-slate-900 font-black text-sm uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg group"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin text-slate-900" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                          Send Message
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* ===== RIGHT SIDEBAR (2 cols) ===== */}
          <div className="lg:col-span-2 space-y-5">
            {/* Contact Cards */}
            <a
              href="mailto:sticktoon.xyz@gmail.com"
              className="group flex items-center gap-4 p-5 bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200/80 hover:border-yellow-400 transition-all duration-300 shadow-sm"
            >
              <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Mail className="w-5 h-5 text-yellow-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-slate-400 text-xs font-black uppercase tracking-wider mb-0.5">Email Us</p>
                <p className="text-slate-900 font-bold text-sm truncate">sticktoon.xyz@gmail.com</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-yellow-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </a>

            <a
              href="https://www.instagram.com/sticktoon.shop"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 p-5 bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200/80 hover:border-pink-400 transition-all duration-300 shadow-sm"
            >
              <div className="w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Instagram className="w-5 h-5 text-pink-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-slate-400 text-xs font-black uppercase tracking-wider mb-0.5">Instagram</p>
                <p className="text-slate-900 font-bold text-sm truncate">@sticktoon.shop</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-pink-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </a>

            {/* Brand Card */}
            <div className="p-6 bg-gradient-to-br from-yellow-50 via-white to-orange-50 backdrop-blur-sm rounded-3xl border border-slate-200/80 overflow-hidden relative shadow-sm">
              <div className="relative z-10 text-center space-y-3">
                <img
                  src="/images/STICKTOON_LONG.jpeg"
                  alt="STICKTOON"
                  className="h-14 w-auto mx-auto rounded-lg shadow-sm"
                />
                <p className="text-slate-600 text-sm font-semibold italic leading-relaxed">
                  "Express yourself with badges that tell your story!"
                </p>
                <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-bold">
                  <Sparkles className="w-3 h-3 text-yellow-500" />
                  <span>Premium Stickers & Badges</span>
                  <Sparkles className="w-3 h-3 text-yellow-500" />
                </div>
              </div>
            </div>

            {/* FAQ Quick Links */}
            <div className="p-5 bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200/80 shadow-sm">
              <h3 className="text-slate-900 font-black text-sm mb-4 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-yellow-600" />
                Common Questions
              </h3>
              <div className="space-y-2">
                {[
                  "Where is my order?",
                  "How do I request a refund?",
                  "Can I customize my stickers?",
                  "What are the shipping charges?"
                ].map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setFormData({ ...formData, inquiryType: 'Customer Support (Existing Order Issue)', message: q })}
                    className="w-full text-left px-4 py-3 rounded-2xl bg-slate-50 hover:bg-yellow-50 border border-slate-200 hover:border-yellow-300 text-slate-700 hover:text-slate-900 text-xs font-bold transition-all duration-200 group flex items-center justify-between"
                  >
                    <span>{q}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-yellow-600 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
