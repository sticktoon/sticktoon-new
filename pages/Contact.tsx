
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
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[700px] h-[700px] bg-purple-600/[0.07] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/[0.05] rounded-full blur-[130px]" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-fuchsia-600/[0.04] rounded-full blur-[120px]" />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        {/* Page Header - Compact */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 px-3 py-1.5 rounded-full border border-purple-500/20 mb-3">
            <MessageCircle className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-widest">Get In Touch</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
            Contact Us
          </h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Have a question or feedback? We'll get back to you within 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 max-w-6xl mx-auto">
          {/* ===== FORM (3 cols) ===== */}
          <div className="lg:col-span-3">
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] overflow-hidden">
              {submitted ? (
                /* Success State */
                <div className="p-10 text-center">
                  <div className="w-20 h-20 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Message Sent!</h3>
                  <p className="text-slate-400 mb-2">Our team will get back to you within 24 hours.</p>
                  {submittedTicketId && (
                    <div className="inline-flex items-center gap-2 bg-indigo-500/10 px-4 py-2 rounded-lg border border-indigo-500/20 mb-6">
                      <span className="text-indigo-400 text-sm font-medium">Ticket ID:</span>
                      <span className="text-white font-mono text-sm font-bold">{submittedTicketId}</span>
                    </div>
                  )}
                  <div className="mt-4">
                    <button
                      onClick={() => { setSubmitted(false); setSubmittedTicketId(''); }}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-all hover:scale-105 shadow-lg shadow-purple-500/20"
                    >
                      Send Another Message
                    </button>
                  </div>
                </div>
              ) : (
                /* Form */
                <form onSubmit={handleSubmit}>
                  <div className="p-6 lg:p-8 border-b border-white/[0.04]">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      Send us a message
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Fill out the form below and we'll respond quickly.</p>
                  </div>

                  <div className="p-6 lg:p-8 space-y-5">
                    {submitError && (
                      <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                        <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <p className="text-red-400 text-sm font-medium">{submitError}</p>
                      </div>
                    )}

                    {/* Name & Phone Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Your Name</label>
                        <input
                          required
                          type="text"
                          placeholder="John Doe"
                          value={formData.name}
                          onFocus={() => setFocusedField('name')}
                          onBlur={() => setFocusedField(null)}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          className={`w-full px-4 py-3 bg-white/[0.04] border rounded-xl text-white placeholder:text-slate-600 focus:outline-none transition-all duration-300 ${
                            focusedField === 'name' ? 'border-purple-500/50 ring-1 ring-purple-500/20 bg-white/[0.06]' : 'border-white/[0.08]'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Phone</label>
                        <input
                          required
                          type="tel"
                          placeholder="+91 98765 43210"
                          value={formData.phone}
                          onFocus={() => setFocusedField('phone')}
                          onBlur={() => setFocusedField(null)}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                          className={`w-full px-4 py-3 bg-white/[0.04] border rounded-xl text-white placeholder:text-slate-600 focus:outline-none transition-all duration-300 ${
                            focusedField === 'phone' ? 'border-purple-500/50 ring-1 ring-purple-500/20 bg-white/[0.06]' : 'border-white/[0.08]'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Email Address</label>
                      <input
                        required
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className={`w-full px-4 py-3 bg-white/[0.04] border rounded-xl text-white placeholder:text-slate-600 focus:outline-none transition-all duration-300 ${
                          focusedField === 'email' ? 'border-purple-500/50 ring-1 ring-purple-500/20 bg-white/[0.06]' : 'border-white/[0.08]'
                        }`}
                      />
                    </div>

                    {/* Inquiry Type */}
                    <div>
                      <label className="block text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Inquiry Type</label>
                      <select
                        required
                        value={formData.inquiryType}
                        onFocus={() => setFocusedField('type')}
                        onBlur={() => setFocusedField(null)}
                        onChange={e => setFormData({ ...formData, inquiryType: e.target.value })}
                        className={`w-full px-4 py-3 bg-white/[0.04] border rounded-xl text-white focus:outline-none transition-all duration-300 ${
                          focusedField === 'type' ? 'border-purple-500/50 ring-1 ring-purple-500/20 bg-white/[0.06]' : 'border-white/[0.08]'
                        } ${!formData.inquiryType ? 'text-slate-600' : 'text-white'}`}
                        style={{ colorScheme: 'dark' }}
                      >
                        <option value="" disabled>Select an inquiry type</option>
                        {inquiryOptions.map((option) => (
                          <option key={option} value={option} className="bg-slate-900 text-white">{option}</option>
                        ))}
                      </select>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Message</label>
                      <textarea
                        required
                        placeholder="Tell us what's on your mind..."
                        rows={4}
                        value={formData.message}
                        onFocus={() => setFocusedField('message')}
                        onBlur={() => setFocusedField(null)}
                        onChange={e => setFormData({...formData, message: e.target.value})}
                        className={`w-full px-4 py-3 bg-white/[0.04] border rounded-xl text-white placeholder:text-slate-600 focus:outline-none transition-all duration-300 resize-none ${
                          focusedField === 'message' ? 'border-purple-500/50 ring-1 ring-purple-500/20 bg-white/[0.06]' : 'border-white/[0.08]'
                        }`}
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-[1.01] active:scale-[0.99] group"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
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
              className="group flex items-center gap-4 p-5 bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] hover:border-purple-500/30 transition-all duration-300"
            >
              <div className="w-12 h-12 bg-purple-500/15 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Mail className="w-5 h-5 text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-0.5">Email Us</p>
                <p className="text-white font-medium text-sm truncate">sticktoon.xyz@gmail.com</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </a>

            <a
              href="https://www.instagram.com/sticktoon.shop"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 p-5 bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] hover:border-pink-500/30 transition-all duration-300"
            >
              <div className="w-12 h-12 bg-pink-500/15 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Instagram className="w-5 h-5 text-pink-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-0.5">Instagram</p>
                <p className="text-white font-medium text-sm truncate">@sticktoon.shop</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-pink-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </a>

            {/* Response Time Card */}
            {/* <div className="p-5 bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/[0.06]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Quick Response</p>
                  <p className="text-slate-500 text-xs">Usually within 24 hours</p>
                </div>
              </div>
              <div className="flex gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="flex-1 text-center">
                    <div className={`h-2 rounded-full mb-1 ${day === 'Sun' ? 'bg-slate-800' : 'bg-emerald-500/30'}`} />
                    <span className={`text-[10px] font-medium ${day === 'Sun' ? 'text-slate-700' : 'text-slate-500'}`}>{day}</span>
                  </div>
                ))}
              </div>
            </div> */}

            {/* Brand Card */}
            <div className="p-6 bg-gradient-to-br from-purple-500/10 via-slate-900/60 to-indigo-500/10 backdrop-blur-xl rounded-2xl border border-white/[0.06] overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[60px]" />
              <div className="relative z-10 text-center space-y-4">
                <img
                  src="/images/STICKTOON_LONG.jpeg"
                  alt="STICKTOON"
                  className="h-14 w-auto mx-auto rounded-lg opacity-90"
                />
                <p className="text-slate-400 text-sm italic leading-relaxed">
                  "Express yourself with badges that tell your story!"
                </p>
                <div className="flex items-center justify-center gap-2 text-slate-600 text-xs">
                  <Sparkles className="w-3 h-3" />
                  <span>Premium Stickers & Badges</span>
                  <Sparkles className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* FAQ Quick Links */}
            <div className="p-5 bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/[0.06]">
              <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-purple-400" />
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
                    className="w-full text-left px-4 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/[0.1] text-slate-400 hover:text-white text-sm transition-all duration-200 group flex items-center justify-between"
                  >
                    <span>{q}</span>
                    <ArrowRight className="w-3 h-3 text-slate-700 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
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
