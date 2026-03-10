
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Layout, Globe, Heart, Sparkles, Star, Trophy } from 'lucide-react';

export default function About() {
  return (
    <div className="bg-white min-h-screen pt-6 sm:pt-8 pb-8 sm:pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-yellow-500/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-[-200px] w-[600px] h-[600px] bg-orange-400/8 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-[-200px] w-[500px] h-[500px] bg-red-400/5 rounded-full blur-[90px]" />
      </div>

      {/* Floating Badge Decorations */}
      <div className="hidden lg:block absolute top-20 left-12 w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-4 border-black shadow-[6px_6px_0px_#000] animate-bounce opacity-70" style={{ animationDelay: '0s', animationDuration: '3s' }}></div>
      <div className="hidden lg:block absolute top-32 right-20 w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-pink-500 border-4 border-black shadow-[6px_6px_0px_#000] animate-bounce opacity-70" style={{ animationDelay: '0.5s', animationDuration: '3.5s' }}></div>
      <div className="hidden lg:block absolute bottom-24 right-28 w-10 h-10 rounded-full bg-black border-4 border-yellow-400 shadow-[6px_6px_0px_#FFD600] animate-bounce opacity-70" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
      <div className="hidden lg:block absolute bottom-36 left-20 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border-4 border-black shadow-[6px_6px_0px_#000] animate-bounce opacity-70" style={{ animationDelay: '1.5s', animationDuration: '3.2s' }}></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/30 mb-3">
            <Sparkles className="w-3 h-3 text-yellow-600 animate-pulse" />
            <span className="text-xs font-black tracking-[0.2em] uppercase text-orange-700">Our Story</span>
            <Star className="w-3 h-3 text-orange-600 animate-pulse" />
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-3 sm:mb-4 tracking-tight leading-tight bg-gradient-to-r from-slate-900 via-yellow-700 to-orange-700 bg-clip-text text-transparent">
            Designed for Expression.<br className="hidden sm:block" /> Built for Everyday Wear.
          </h1>
          
          <p className="text-sm sm:text-base lg:text-lg text-slate-600 font-semibold max-w-3xl mx-auto leading-relaxed">
            Affordable, high‑quality Sticktoon badges and stickers, designed for every mood , moment, and vibe.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="space-y-6 sm:space-y-8">
          {/* Mission Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            <div className="space-y-4 order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg">
                <Trophy className="w-3 h-3" />
                <span className="text-xs font-black tracking-[0.2em] uppercase">Our Mission</span>
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Make Self‑Expression Affordable & Accessible
              </h2>
              
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
               Sticktoon creates pin badges and stickers that feel premium without the premium price tag. We believe self-expression should be easy, affordable, and accessible to everyone. Express yourself proudly and wear your personality every day — with no compromises.
              </p>
              
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
               From sports and anime to moods and spirituality, Sticktoon designs collections that speak to every vibe, every passion, and every moment that truly matters to you.
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-3 sm:p-4 border-2 border-yellow-500/30 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">200+</div>
                  <div className="text-xs font-black text-slate-600 uppercase tracking-[0.2em] mt-1">Designs</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-3 sm:p-4 border-2 border-orange-500/30 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">₹49</div>
                  <div className="text-xs font-black text-slate-600 uppercase tracking-[0.2em] mt-1">Starting</div>
                </div>
              </div>

              {/* Features List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {[
                  { text: 'Round pin‑back badges', color: 'yellow' },
                  { text: 'Magnetic badge options', color: 'orange' },
                  { text: 'Custom drops & collabs', color: 'red' },
                  { text: 'Perfect for gifting', color: 'amber' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 group">
                    <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r from-${item.color}-500 to-${item.color}-600 group-hover:scale-125 transition-transform`} />
                    <span className="text-xs sm:text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Image/Logo Section */}
            <div className="order-1 lg:order-2 bg-gradient-to-br from-white to-yellow-50/50 border-2 border-yellow-500/20 rounded-2xl p-6 sm:p-10 lg:p-12 min-h-[280px] sm:min-h-[320px] flex items-center justify-center relative overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-500">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.1),_transparent_70%)]" />
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-400/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-400/20 rounded-full blur-3xl" />
              <img
                src="/images/logo.png"
                alt="StickToon"
                className="relative w-[220px] sm:w-[280px] lg:w-[340px] max-w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.2)] hover:scale-105 transition-transform duration-500"
              />
            </div>
          </section>

          {/* Why StickToon Section */}
          <section className="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-2xl p-4 sm:p-6 lg:p-8 relative overflow-hidden shadow-lg">
            {/* Decorative Elements */}
            <div className="absolute top-6 right-10 w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-3 border-black shadow-[4px_4px_0px_#000] animate-bounce opacity-30" style={{ animationDelay: '0.3s', animationDuration: '3.4s' }}></div>
            <div className="absolute bottom-8 left-12 w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-pink-500 border-3 border-black shadow-[4px_4px_0px_#000] animate-bounce opacity-30" style={{ animationDelay: '0.8s', animationDuration: '3.8s' }}></div>
            
            <div className="text-center mb-4 sm:mb-6 relative z-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mb-2">
                Why StickToon?
              </h2>
              <p className="text-slate-600 font-semibold text-sm sm:text-base">Built for creators, collectors, and everyday expression.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 relative z-10">
              {[
                { icon: Layout, title: 'Design Variety', desc: 'Curated drops across moods, fandoms, and moments.', color: 'from-blue-500 to-indigo-500', bg: 'bg-blue-50' },
                { icon: Shield, title: 'Premium Quality', desc: 'Durable pin‑backs with vibrant, lasting prints.', color: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50' },
                { icon: Zap, title: 'Fast & Easy', desc: 'Quick checkout and reliable delivery.', color: 'from-yellow-500 to-orange-500', bg: 'bg-yellow-50' },
                { icon: Heart, title: 'Community‑Led', desc: 'Built from feedback and love from our crew.', color: 'from-rose-500 to-pink-500', bg: 'bg-rose-50' }
              ].map((item, idx) => (
                <div key={idx} className="bg-white rounded-xl p-3 sm:p-4 border-2 border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
                  <div className="flex gap-3 items-start">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                      <div className={`bg-gradient-to-r ${item.color} rounded-lg p-2`}>
                        <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 mb-0.5 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-yellow-600 group-hover:to-orange-600 transition-all">
                        {item.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center space-y-3 sm:space-y-4 py-4 sm:py-6">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Ready to Express Yourself?
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto font-semibold leading-relaxed">
              Join thousands of creators and collectors. Start building your badge collection today.
            </p>
            <Link 
              to="/categories" 
              className="inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 font-black px-6 sm:px-10 py-3 sm:py-4 rounded-xl shadow-[6px_6px_0px_#000] hover:shadow-[8px_8px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all text-sm sm:text-base border-3 border-black uppercase tracking-wide"
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              Explore Collection
              <Star className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}

