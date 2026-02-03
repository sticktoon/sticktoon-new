
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Layout, Globe, Heart } from 'lucide-react';

export default function About() {
  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50 min-h-screen pt-16 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle ambient accents */}
      <div className="absolute top-24 right-10 w-48 h-48 bg-blue-200/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-32 left-12 w-56 h-56 bg-indigo-200/30 rounded-full blur-3xl"></div>
      {/* Floating circles inspired by Login page */}
      <div className="absolute top-16 left-8 w-16 h-16 bg-yellow-400 rounded-full border-4 border-black shadow-[4px_4px_0px_#000] animate-bounce opacity-60" style={{ animationDelay: '0s', animationDuration: '3.2s' }}></div>
      <div className="absolute top-36 right-16 w-14 h-14 bg-red-500 rounded-full border-4 border-black shadow-[4px_4px_0px_#000] animate-bounce opacity-60" style={{ animationDelay: '0.6s', animationDuration: '3.6s' }}></div>
      <div className="absolute bottom-28 right-28 w-12 h-12 bg-black rounded-full border-4 border-yellow-400 shadow-[4px_4px_0px_#FFD600] animate-bounce opacity-60" style={{ animationDelay: '1.1s', animationDuration: '4s' }}></div>
      
      <div className="max-w-full mx-auto px-4 sm:px-10 lg:px-20 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white/70 text-xs font-black tracking-[0.2em] uppercase text-slate-600">
            Our Story
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 mt-5 mb-4 tracking-tight">
            Designed for expression. Built for everyday wear.
          </h1>
          <p className="text-base sm:text-lg text-slate-500 font-semibold tracking-wide">
            Affordable, high‑quality badges and custom merch for every mood.
          </p>
        </div>

        <div className="space-y-12">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-black tracking-[0.2em] uppercase text-blue-600">
                Mission
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Make self‑expression affordable</h2>
              <p className="text-lg text-slate-600 leading-relaxed font-medium">
                StickToon creates pin badges and custom merch that feel premium without the premium price. Wear your personality proudly—every day.
              </p>
              <p className="text-lg text-slate-600 leading-relaxed font-medium">
                From sports and anime to moods and spirituality, we design collections that speak to every vibe and every occasion.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-white/80 rounded-2xl p-4 border border-slate-200 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  <div className="text-3xl font-black text-blue-600">200+</div>
                  <div className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Designs</div>
                </div>
                <div className="bg-white/80 rounded-2xl p-4 border border-slate-200 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  <div className="text-3xl font-black text-purple-600">₹49</div>
                  <div className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Starting</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" /> Round pin‑back badges
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-600" /> Magnetic badge options
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-700" /> Custom drops & collabs
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" /> Made for gifting
                </div>
              </div>
            </div>
            <div className="bg-white/80 border border-slate-200 rounded-[2.5rem] p-12 flex items-center justify-center relative overflow-hidden shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_60%)]" />
              <img
                src="/images/logo.png"
                alt="StickToon"
                className="relative w-[220px] sm:w-[280px] object-contain drop-shadow-[0_16px_30px_rgba(0,0,0,0.18)]"
              />
            </div>
          </section>

          <section className="bg-white/70 border border-slate-200 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden">
            {/* Floating circles for this section */}
            <div className="absolute top-8 right-12 w-12 h-12 bg-yellow-400 rounded-full border-4 border-black shadow-[4px_4px_0px_#000] animate-bounce opacity-40" style={{ animationDelay: '0.3s', animationDuration: '3.4s' }}></div>
            <div className="absolute bottom-12 left-16 w-10 h-10 bg-red-500 rounded-full border-4 border-black shadow-[4px_4px_0px_#000] animate-bounce opacity-40" style={{ animationDelay: '0.8s', animationDuration: '3.8s' }}></div>
            <div className="absolute top-1/2 right-8 w-8 h-8 bg-black rounded-full border-4 border-yellow-400 shadow-[4px_4px_0px_#FFD600] animate-bounce opacity-40" style={{ animationDelay: '1.2s', animationDuration: '4.2s' }}></div>
            
            <div className="text-center mb-10 relative z-10">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Why StickToon</h2>
              <p className="text-slate-500 font-medium mt-2">Built for creators, collectors, and everyday expression.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Layout className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Design Variety</h3>
                  <p className="text-slate-600 font-medium">Curated drops across moods, fandoms, and moments.</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Premium Quality</h3>
                  <p className="text-slate-600 font-medium">Durable pin‑backs with vibrant, lasting prints.</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Fast & Easy</h3>
                  <p className="text-slate-600 font-medium">Quick checkout and reliable delivery.</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Heart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Community‑Led</h3>
                  <p className="text-slate-600 font-medium">Built from feedback and love from our crew.</p>
                </div>
              </div>
            </div>
          </section>

          {/* <section className="text-center space-y-8">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Join the Vibe Team</h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
              We're constantly expanding our collection and looking for new artists to collaborate with. StickToon is more than a shop—it's a movement.
            </p>
            <Link to="/categories" className="inline-flex items-center gap-2 bg-blue-600 text-white font-black px-10 py-5 rounded-2xl shadow-xl shadow-blue-100 hover:scale-105 transition-transform text-lg">
              Explore The Archive
            </Link>
          </section> */}
        </div>
      </div>
    </div>
  );
}
