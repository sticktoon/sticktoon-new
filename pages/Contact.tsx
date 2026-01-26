
import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle2, Sparkle } from 'lucide-react';
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
      icon: <Mail className="w-6 h-6" />,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      title: 'Instagram',
      value: 'https://www.instagram.com/sticktoon.shop?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==',
      icon:   <Instagram className="w-6 h-6" />,
      color: 'bg-indigo-50 text-indigo-600',
       type: 'link'
    },
    // {
    //   title: 'Visit Us',
    //   value: 'Sticker Street, Mumbai',
    //   icon: <MapPin className="w-6 h-6" />,
    //   color: 'bg-emerald-50 text-emerald-600'
    // }
  ];

  return (
    <div className="min-h-screen bg-white pt-16 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-full mx-auto px-4 sm:px-10 lg:px-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 mb-4 tracking-tight">Contact Us</h1>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">Got a question or a custom request? We'd love to hear from you!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="bg-slate-50 rounded-[2.5rem] p-8 sm:p-12 border border-slate-100">
            {submitted ? (
              <div className="text-center py-12 space-y-6">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">Message Sent!</h3>
                <p className="text-slate-500">Our crew will get back to you within 24 hours.</p>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors"
                >
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Your Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Enter your name" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-5 py-4 bg-white border-2 border-transparent rounded-2xl focus:border-blue-400 outline-none font-bold transition-all text-slate-700"
                  />
                </div>

                <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  Phone Number
                </label>
                <input
                  required
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-5 py-4 bg-white border-2 border-transparent rounded-2xl focus:border-blue-400 outline-none font-bold transition-all text-slate-700"
                />
              </div>


                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                  <input 
                    required
                    type="email" 
                    placeholder="name@example.com" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-5 py-4 bg-white border-2 border-transparent rounded-2xl focus:border-blue-400 outline-none font-bold transition-all text-slate-700"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Message</label>
                  <textarea 
                    required
                    placeholder="How can we help?" 
                    rows={5}
                    value={formData.message}
                    onChange={e => setFormData({...formData, message: e.target.value})}
                    className="w-full px-5 py-4 bg-white border-2 border-transparent rounded-2xl focus:border-blue-400 outline-none font-bold transition-all text-slate-700 resize-none"
                  />
                </div>

                <button 
                  disabled={isSubmitting}
                  className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-5 h-5" />}
                  Send Message
                </button>
              </form>
            )}
          </div>

          <div className="space-y-8">
            {infoCards.map((card, idx) => (
              <div key={idx} className="flex items-center gap-6 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${card.color} shadow-sm`}>
                  {card.icon}
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{card.title}</h3>
                    {card.type === 'link' ? (
                      <a
                        href={card.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xl font-black text-indigo-600 tracking-tight hover:underline"
                      >
                        StickToon Instagram Page
                      </a>
                    ) : (
                      <p className="text-xl font-black text-slate-800 tracking-tight">
                        {card.value}
                      </p>
                    )}
                </div>
              </div>
            ))}
            
            <div className="mt-12 p-8 bg-blue-600 rounded-[2.5rem] text-white relative overflow-hidden group">
               <Sparkle className="absolute -top-6 -right-6 w-32 h-32 opacity-20 group-hover:rotate-12 transition-transform" />
               <h4 className="text-2xl font-black mb-2">Our Vibes</h4>
               <p className="font-medium mb-6 opacity-90">Follow us for daily drops and behind-the-scenes content!</p>
               {/* <div className="flex gap-4">
                 <button className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors">IG</button>
                 <button className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors">TW</button>
                 <button className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors">YT</button>
               </div> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
