
import React, { useState } from 'react';
import { Mail, Send, Loader2, CheckCircle2, Sparkle, MessageCircle } from 'lucide-react';
import { Instagram } from "lucide-react";

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setFormData({ name: '', email: '', phone: '', message: '' });
    }, 1500);
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
    <div className="relative min-h-screen bg-gradient-to-br from-white via-slate-50 to-yellow-50/30 pt-20 pb-8 px-4 sm:px-6 lg:px-8 overflow-hidden">
      
      {/* Background Effects - Light */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-yellow-500/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-100px] right-[-150px] w-[500px] h-[500px] bg-orange-400/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 left-[-100px] w-[400px] h-[400px] bg-red-400/8 rounded-full blur-[100px]" />
        
        {/* Floating Circles - Light */}
        <div className="absolute top-40 -left-8 w-20 h-20 rounded-full border-[6px] border-yellow-400/20 animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-32 -right-10 w-24 h-24 rounded-full border-[8px] border-orange-400/15 animate-bounce" style={{ animationDuration: '5s' }} />
        <div className="absolute top-1/2 -left-12 w-28 h-28 rounded-full border-[8px] border-red-400/15 animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl lg:text-4xl font-black bg-gradient-to-r from-slate-900 via-yellow-700 to-orange-700 bg-clip-text text-transparent mb-2 tracking-tight">Contact Us</h1>
          <p className="text-slate-600 text-sm lg:text-base max-w-xl mx-auto font-semibold">Got a question? We'd love to hear from you!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 items-start max-w-5xl mx-auto lg:mx-auto">
          {/* Form - Left */}
          <div className="bg-white rounded-3xl p-6 border-4 border-black shadow-[6px_6px_0px_#000] h-fit hover:shadow-[8px_8px_0px_#000] transition-all">
            {submitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-black shadow-[4px_4px_0px_#000]">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Message Sent! ✨</h3>
                <p className="text-slate-600 font-semibold text-sm">Our crew will get back to you within 24 hours.</p>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="px-6 py-2 bg-yellow-400 text-black font-black rounded-lg border-2 border-black hover:bg-yellow-300 transition-all shadow-[3px_3px_0px_#000]"
                >
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-xl font-black text-black mb-6 tracking-tight" style={{ WebkitTextStroke: '0.5px #FFD600' }}>
                  Get In Touch 💬
                </h2>

                <div>
                  <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest">Your Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Name" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-yellow-50 border-3 border-black rounded-xl focus:border-red-500 focus:outline-none font-bold transition-all text-slate-900 placeholder:text-slate-400 shadow-[3px_3px_0px_#FFD600] focus:shadow-[3px_3px_0px_#FF0000]"
                  />
                </div>

                <div>
                <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest">Phone</label>
                <input
                  required
                  type="tel"
                  placeholder="Phone"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-yellow-50 border-3 border-black rounded-xl focus:border-red-500 focus:outline-none font-bold transition-all text-slate-900 placeholder:text-slate-400 shadow-[3px_3px_0px_#FFD600] focus:shadow-[3px_3px_0px_#FF0000]"
                />
              </div>

                <div>
                  <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest">Email</label>
                  <input 
                    required
                    type="email" 
                    placeholder="Email" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 bg-yellow-50 border-3 border-black rounded-xl focus:border-red-500 focus:outline-none font-bold transition-all text-slate-900 placeholder:text-slate-400 shadow-[3px_3px_0px_#FFD600] focus:shadow-[3px_3px_0px_#FF0000]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-black mb-2 uppercase tracking-widest">Message</label>
                  <textarea 
                    required
                    placeholder="Message" 
                    rows={3}
                    value={formData.message}
                    onChange={e => setFormData({...formData, message: e.target.value})}
                    className="w-full px-4 py-3 bg-yellow-50 border-3 border-black rounded-xl focus:border-red-500 focus:outline-none font-bold transition-all text-slate-900 placeholder:text-slate-400 shadow-[3px_3px_0px_#FFD600] focus:shadow-[3px_3px_0px_#FF0000] resize-none"
                  />
                </div>

                <button 
                  disabled={isSubmitting}
                  className="w-full py-3 bg-red-500 text-white font-black rounded-xl shadow-[4px_4px_0px_#000] border-3 border-black hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-widest text-sm"
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
                className="flex items-center gap-3 p-4 bg-white rounded-2xl border-3 border-black hover:shadow-[4px_4px_0px_#000] transition-all cursor-pointer shadow-[3px_3px_0px_#FFD600]"
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${card.color} border-2 border-black`}>
                  {card.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-black uppercase tracking-widest">{card.title}</h3>
                  <p className="text-sm font-bold text-slate-800 truncate hover:text-clip">
                    {card.value}
                  </p>
                </div>
              </a>
            ))}

            {/* Logo + Quote Section */}
            <div className="p-6 bg-gradient-to-br from-yellow-50 via-yellow-100 to-orange-50 rounded-3xl text-slate-900 relative overflow-hidden shadow-[6px_6px_0px_#000] border-4 border-black hover:shadow-[8px_8px_0px_#000] transition-all">
              <div className="relative z-10 text-center space-y-5">
                {/* Logo */}
                <img 
                  src="/images/STICKTOON_LONG.jpeg" 
                  alt="STICKTOON" 
                  className="h-16 w-auto mx-auto drop-shadow-xl filter contrast-125 brightness-105"
                />
                
                {/* Quote */}
                <p className="text-sm font-black text-slate-900 italic leading-relaxed">
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
