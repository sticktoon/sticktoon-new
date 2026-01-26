
import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkle, Shield, Zap, Layout, Globe, Heart } from 'lucide-react';

export default function About() {
  return (
    <div className="bg-white min-h-screen pt-16 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-full mx-auto px-4 sm:px-10 lg:px-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 mb-4 tracking-tight uppercase">Our Story</h1>
          <p className="text-xl text-slate-500 font-bold uppercase tracking-widest">Wear your vibe every single day.</p>
        </div>

        <div className="space-y-16">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">The Mission</h2>
              <p className="text-lg text-slate-600 leading-relaxed font-medium">
                StickToon was founded by a group of sticker enthusiasts who wanted to bring high-quality, expressive designs to everyone. We believe that small details like a badge on your jacket or a sticker on your laptop tell a big story about who you are.
              </p>
              <p className="text-lg text-slate-600 leading-relaxed font-medium">
                Our marketplace is a hub where creativity meets community. We curated thousands of designs to ensure there's something for every personality, mood, and style.
              </p>
            </div>
            <div className="bg-blue-50 rounded-[3rem] p-12 flex items-center justify-center relative overflow-hidden">
              <Sparkle className="w-32 h-32 text-blue-600 animate-float opacity-20 absolute" />
              <Sparkle className="w-24 h-24 text-blue-400 fill-blue-100" />
            </div>
          </section>

          <section className="bg-slate-50 rounded-[3rem] p-10 md:p-16 border border-slate-100">
            <h2 className="text-3xl font-black text-slate-900 mb-12 text-center tracking-tight">What Makes Us Special?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm text-blue-600">
                  <Zap className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-800">AI Innovation</h3>
                <p className="text-slate-500 font-medium">Using Gemini AI to generate custom mockups instantly.</p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm text-emerald-600">
                  <Shield className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-800">Premium Quality</h3>
                <p className="text-slate-500 font-medium">Durable, waterproof, and vibrant die-cut materials.</p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm text-rose-600">
                  <Heart className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-800">Community First</h3>
                <p className="text-slate-500 font-medium">Driven by feedback and love from our vibe-loving crew.</p>
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
