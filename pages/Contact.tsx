
import React, { useState } from 'react';
import { Mail, Send, Loader2, CheckCircle2, Sparkle, MessageCircle } from 'lucide-react';
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
        headers: {
          'Content-Type': 'application/json',
        },
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

  const infoCards = [
    {
      title: 'Email Us',
      value: 'sticktoon.xyz@gmail.com',
      icon: <Mail className="w-7 h-7" />,
      color: 'bg-yellow-100 text-yellow-700',
      action: 'mailto:sticktoon.xyz@gmail.com'
    },
    {
      title: 'Instagram',
      value: '@sticktoon.shop',
      icon: <Instagram className="w-7 h-7" />,
      color: 'bg-pink-100 text-pink-700',
      action: 'https://www.instagram.com/sticktoon.shop'
    }
  ];

  return (
    <div className="relative min-h-screen bg-white pt-20 pb-8 px-4 sm:px-6 lg:px-8 overflow-hidden">
      
      {/* Premium background glow - Hot Drops Theme */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-64 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-yellow-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-[-300px] w-[600px] h-[600px] bg-orange-400/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-[-200px] w-[500px] h-[500px] bg-red-400/10 rounded-full blur-[100px]" />
      </div>

      {/* Funny Floating Circles - Outer Edges Only */}
      <div className="absolute top-32 -left-8 w-24 h-24 rounded-full border-[8px] border-yellow-400/30 animate-bounce" style={{ animationDuration: '4s' }} />
      <div className="absolute top-64 -right-12 w-32 h-32 rounded-full border-[10px] border-orange-400/25 animate-pulse" style={{ animationDuration: '3s' }} />
      <div className="absolute bottom-40 -left-16 w-28 h-28 rounded-full border-[8px] border-red-400/20 animate-bounce" style={{ animationDuration: '5s', animationDelay: '1s' }} />
      <div className="absolute bottom-72 -right-8 w-20 h-20 rounded-full border-[6px] border-yellow-500/35 animate-pulse" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />
      
      <div className="relative z-10 max-w-7xl mx-auto w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 px-6 py-3 rounded-full mb-4 border-2 border-yellow-500/30">
            <span className="text-[11px] font-black text-yellow-700 uppercase tracking-widest">Get In Touch</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-yellow-700 to-orange-700 bg-clip-text text-transparent mb-2">Contact Us</h1>
          <p className="text-slate-600 text-sm md:text-base max-w-2xl mx-auto">Got a question? We'd love to hear from you!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 items-start max-w-5xl mx-auto lg:mx-auto">
          {/* Form - Left */}
          <div className="bg-gradient-to-br from-white to-yellow-50/50 backdrop-blur border-2 border-yellow-500/20 rounded-2xl shadow-sm hover:shadow-2xl hover:shadow-yellow-500/20 hover:border-yellow-500/60 transition-all duration-300 p-6 h-fit">{submitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-green-500/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Message Sent! ✨</h3>
                <p className="text-slate-600 font-semibold text-sm">Our crew will get back to you within 24 hours.</p>
                {submittedTicketId && (
                  <p className="text-sm font-bold text-indigo-700">
                    Ticket ID: {submittedTicketId}
                  </p>
                )}
                <button 
                  onClick={() => {
                    setSubmitted(false);
                    setSubmittedTicketId('');
                  }}
                  className="px-6 py-2 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600 transition-all"
                >
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-xl font-black text-slate-900 mb-6 tracking-tight">
                  Get In Touch 💬
                </h2>

                {submitError && (
                  <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                    {submitError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Your Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Name" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-white border-2 border-yellow-500/20 rounded-xl focus:border-yellow-500 focus:outline-none transition-all text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">Phone</label>
                <input
                  required
                  type="tel"
                  placeholder="Phone"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-white border-2 border-yellow-500/20 rounded-xl focus:border-yellow-500 focus:outline-none transition-all text-slate-900 placeholder:text-slate-400"
                />
              </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Email</label>
                  <input 
                    required
                    type="email" 
                    placeholder="Email" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 bg-white border-2 border-yellow-500/20 rounded-xl focus:border-yellow-500 focus:outline-none transition-all text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Inquiry Type</label>
                  <select
                    required
                    value={formData.inquiryType}
                    onChange={e => setFormData({ ...formData, inquiryType: e.target.value })}
                    className="w-full px-4 py-3 bg-white border-2 border-yellow-500/20 rounded-xl focus:border-yellow-500 focus:outline-none transition-all text-slate-900"
                  >
                    <option value="" disabled>Select an inquiry type</option>
                    {inquiryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">Message</label>
                  <textarea 
                    required
                    placeholder="Message" 
                    rows={3}
                    value={formData.message}
                    onChange={e => setFormData({...formData, message: e.target.value})}
                    className="w-full px-4 py-3 bg-white border-2 border-yellow-500/20 rounded-xl focus:border-yellow-500 focus:outline-none transition-all text-slate-900 placeholder:text-slate-400 resize-none"
                  />
                </div>

                <button 
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Send
                </button>
              </form>
            )}
          </div>

          {/* Info Cards + Our Vibes - Right */}
          <div className="space-y-4">
            {infoCards.map((card, idx) => (
              <a 
                key={idx}
                href={card.action}
                target={card.action?.startsWith('http') ? '_blank' : undefined}
                rel={card.action?.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="flex items-center gap-3 p-4 bg-gradient-to-br from-white to-yellow-50/50 backdrop-blur border-2 border-yellow-500/20 rounded-2xl hover:shadow-2xl hover:shadow-yellow-500/20 hover:border-yellow-500/60 transition-all duration-300 cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${card.color} border-2 border-yellow-500/30`}>
                  {card.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">{card.title}</h3>
                  <p className="text-sm font-semibold text-slate-700 truncate hover:text-clip">
                    {card.value}
                  </p>
                </div>
              </a>
            ))}

            {/* Logo + Quote Section */}
            <div className="p-6 bg-gradient-to-br from-white to-yellow-50/50 backdrop-blur border-2 border-yellow-500/20 rounded-2xl text-slate-900 relative overflow-hidden hover:shadow-2xl hover:shadow-yellow-500/20 hover:border-yellow-500/60 transition-all duration-300">
              <div className="relative z-10 text-center space-y-5">
                {/* Logo */}
                <img 
                  src="/images/STICKTOON_LONG.jpeg" 
                  alt="STICKTOON" 
                  className="h-16 w-auto mx-auto drop-shadow-xl filter contrast-125 brightness-105"
                />
                
                {/* Quote */}
                <p className="text-sm font-bold text-slate-900 italic leading-relaxed">
                  "Express yourself with badges that tell your story! 🎨"
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
