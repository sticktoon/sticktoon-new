
import React, { useState } from 'react';

import { BADGES, CATEGORIES, formatPrice } from '../constants.tsx';
import { Badge } from '../types.ts';
import { 
  ArrowRight, 
  Sparkles, 
  Smile,
  Trophy,
  Gamepad2,
  PartyPopper,
  PawPrint,
  Compass,
  ChevronRight,
  Upload,
  MessageSquare,
  Package,
  Tv,
  Wand2,
  Plus,
  Star,
  Zap
} from 'lucide-react';

import { Link, useNavigate } from "react-router-dom";


interface HomeProps {
  addToCart: (badge: Badge) => void;
}

const IconRenderer = ({ iconName, className }: { iconName: string; className?: string }) => {
  switch (iconName) {
    case 'Smile': return <Smile className={className} />;
    case 'Trophy': return <Trophy className={className} />;
    case 'Sparkles': return <Sparkles className={className} />;
    case 'Gamepad2': return <Gamepad2 className={className} />;
    case 'PartyPopper': return <PartyPopper className={className} />;
    case 'PawPrint': return <PawPrint className={className} />;
   
    case 'Tv': return <Tv className={className} />;
    default: return <Compass className={className} />;
  }
};

const PinButton: React.FC<{ 
  children?: React.ReactNode; 
  image?: string;
  className?: string; 
  style?: React.CSSProperties; 
  isBack?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isStatic?: boolean;
}> = ({ children, image, className = "", style, isBack = false, size = 'md', isStatic = false }) => {
  const sizeClasses = {
    xs: 'w-16 h-16',
    sm: 'w-24 h-24',
    md: 'w-36 h-36', // Increased from w-32
    lg: 'w-56 h-56', // Increased from w-48
    xl: 'w-80 h-80'  // Increased from w-64
  };

  return (
    <div 
      className={`pin-button-3d pin-shadow overflow-hidden 
        ${isStatic ? '' : 'animate-float-badge'}
         ${isBack ? 'pin-back-side' : 'bg-transparent'}
          ${sizeClasses[size]} 
          ${className}`}
      style={{ ...style }}
    >
      {isBack ? (
        <>
          <div className="pin-needle"></div>
          <div className="pin-clasp"></div>
          <div className="absolute top-1/2 left-[15%] w-3 h-3 bg-[#2a2a2a] rounded-full border border-[#444] -translate-y-1/2"></div>
        </>
      ) : (
       <>
  {image ? (
   <img
  src={image}
  alt="badge"
  className="w-full h-full object-contain relative z-10"
/>

  ) : (
    <div className="w-full h-full relative z-10">
      {children}
    </div>
  )}
</>

      )}
    </div>
  );
};

// 
const Hero: React.FC = () => {
  const navigate = useNavigate();

  return (
<section
  className="relative w-full min-h-screen overflow-hidden flex items-center bg-white"
>
  {/* Premium background glow - Hot Drops Theme */}
  <div className="pointer-events-none absolute inset-0">
    <div className="absolute -top-64 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-yellow-500/10 rounded-full blur-[140px]" />
    <div className="absolute top-1/3 right-[-300px] w-[600px] h-[600px] bg-orange-400/10 rounded-full blur-[120px]" />
    <div className="absolute bottom-1/4 left-[-200px] w-[500px] h-[500px] bg-red-400/10 rounded-full blur-[100px]" />
  </div>

  {/* Funny Floating Circles - Outer Edges Only */}
  <div className="absolute top-24 -left-8 w-24 h-24 rounded-full border-[8px] border-yellow-400/30 animate-bounce" style={{ animationDuration: '4s' }} />
  <div className="absolute top-48 -right-10 w-28 h-28 rounded-full border-[10px] border-orange-400/25 animate-pulse" style={{ animationDuration: '3s' }} />
  <div className="absolute bottom-36 -left-12 w-28 h-28 rounded-full border-[8px] border-red-400/20 animate-bounce" style={{ animationDuration: '5s', animationDelay: '1s' }} />
  <div className="absolute bottom-64 -right-8 w-20 h-20 rounded-full border-[6px] border-yellow-500/35 animate-pulse" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />

  {/* ✅ CONTENT */}
  <div className="relative z-10 w-full max-w-7xl mx-auto 
  
  md:px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
    
    
    {/* LEFT CONTENT */}
    <div>
      <div className="absolute -top-4 left-[450px] w-36 h-36 rounded-full border-[8px] border-yellow-300 opacity-30 pointer-events-none" />

 <div className="absolute -top-2 left-56 text-2xl opacity-50 text-yellow-300">★</div>
 <div className="absolute -top-2 left-56 text-2xl opacity-50 text-yellow-300">★</div>
  {/* RING FOR SOULS */}
  <div className="absolute top-24 left-44 w-34 h-34 rounded-full border-[8px] border-yellow-300 opacity-25 pointer-events-none" />

      <h1 className="
  text-3xl sm:text-4xl md:text-5xl lg:text-6xl
  font-black tracking-[0.17em] leading-[1.15]
  bg-gradient-to-r from-slate-900 via-yellow-700 to-orange-700
  bg-clip-text text-transparent
  drop-shadow-[0_2px_12px_rgba(245,158,11,0.25)]
">
  WE CREATE <br /> FOR SOULS
</h1>
 

  {/* Small red dot touching C */}
  <div className="absolute top-6 left-96 w-6 h-6 bg-red-500 rounded-full border-2 border-yellow-400/30 opacity-70 animate-bounce"
       style={{ animationDelay: '0.5s', animationDuration: '5s' }} />
<div className="absolute top-10 left-60 w-20 h-20 rounded-full border-[6px] border-yellow-300 opacity-30 animate-bounce"
       style={{ animationDuration: '6s' }} />

  {/* Tiny star above CREATE */}
  <div className="absolute -top-2 left-56 text-2xl opacity-50 text-yellow-300">★</div>


      <p className="mt-4 md:mt-6 mb-6 md:mb-10 max-w-xl text-base md:text-lg text-slate-600 font-medium leading-relaxed">

        Premium custom badges designed for creators, communities, and brands who wear their vibe.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
        <button
          onClick={() => navigate("/categories")}
          className="px-6 md:px-10 py-3 md:py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 font-bold tracking-widest uppercase shadow-lg hover:shadow-xl hover:shadow-yellow-500/20 text-sm md:text-base hover:from-yellow-400 hover:to-orange-400 transition-all w-full sm:w-auto"
        >
          View Collection
        </button>

        <button
          onClick={() => navigate("/custom-order")}
          className="px-6 md:px-10 py-3 md:py-4 rounded-xl border-2 border-yellow-500/40 text-slate-900 font-bold tracking-widest uppercase text-sm md:text-base bg-white/70 hover:bg-yellow-500 hover:text-slate-900 hover:border-yellow-500 transition-all w-full sm:w-auto shadow-sm hover:shadow-lg hover:shadow-yellow-500/20"
        >
          Custom Order
        </button>
      </div>
    </div>

    {/* RIGHT BADGES */}
    <div className="relative brightness-[1.08] contrast-[1.12] saturate-[1.05]
      drop-shadow-[0_18px_30px_rgba(15,23,42,0.25)]
      hover:brightness-[1.12] hover:contrast-[1.18] transition-all duration-500
    ">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 place-items-center">
       {[
  { img: "/images/a.png", cat: "animal" },
  { img: "/images/h.png", cat: "religious" },
  { img: "/images/b.png", cat: "moody" },
  { img: "/images/flag2.png", cat: "events" },
  { img: "/images/d.png", cat: "entertainment" },
  { img: "/images/e.png", cat: "couple" },
  { img: "/images/f.png", cat: "anime" },
  { img: "/images/g.png", cat: "events" },
  { img: "/images/c.png", cat: "anime" },
].map((b, i) => (
  <button
    key={i}
    onClick={() => navigate(`/categories?cat=${b.cat}`)}
    className="hover:scale-110 active:scale-95 transition hover:drop-shadow-[0_18px_35px_rgba(245,158,11,0.35)]"
  >
    <img
      src={b.img}
      className="w-24 md:w-36 md:h-36 h-24 lg:w-40 lg:h-40 object-contain drop-shadow-[0_25px_45px_rgba(0,0,0,0.25)]"
    />
  </button>
))}

      </div>
    </div>

  </div>
</section>

  );
  };



const HowItWorksSection: React.FC = () => (
  <section className="relative min-h-screen bg-gradient-to-br from-white via-slate-50 to-yellow-50/30 flex items-center py-12 md:py-0 overflow-hidden">
    
    {/* Background Effects - Same as Browse Category */}
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-yellow-500/5 rounded-full blur-[140px]" />
      <div className="absolute bottom-[-100px] right-[-200px] w-[600px] h-[600px] bg-orange-400/5 rounded-full blur-[120px]" />
      <div className="absolute top-1/2 left-[-150px] w-[500px] h-[500px] bg-red-400/5 rounded-full blur-[100px]" />
      
      {/* Floating Circles - Lighter */}
      <div className="absolute top-20 -left-8 w-24 h-24 rounded-full border-[6px] border-yellow-500/20 animate-bounce" style={{ animationDuration: '5s' }} />
      <div className="absolute top-40 -right-10 w-28 h-28 rounded-full border-[6px] border-orange-500/15 animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-32 -left-12 w-32 h-32 rounded-full border-[8px] border-red-500/15 animate-bounce" style={{ animationDuration: '6s', animationDelay: '1s' }} />
    </div>
    
    <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 w-full">

      {/* HEADER */}
      <div className="text-center mb-10">
        <span className="inline-block mb-3 px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-yellow-400/30 text-orange-700 border-3 border-black shadow-[2px_2px_0px_#000]">
          The Craft
        </span>

        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black bg-gradient-to-r from-slate-900 via-yellow-700 to-orange-700 bg-clip-text text-transparent tracking-tight drop-shadow-sm">
          How It Works
        </h2>

        <p className="mt-2 text-slate-600 text-xs md:text-sm font-semibold">
          Simple steps to getting your custom vibes manufactured.
        </p>
      </div>

      {/* STEPS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

        {[
          { icon: Upload, title: "Upload Idea", desc: "Send us any logo, photo, or text description." },
          { icon: MessageSquare, title: "AI Proofing", desc: "Gemini visualizes your pin design in seconds." },
          { icon: Package, title: "Fast Delivery", desc: "We ship your high-gloss buttons in 3–5 days." }
        ].map((step, idx) => (
          <div
            key={idx}
            className="relative bg-white rounded-3xl p-6 text-center border-4 border-black shadow-[6px_6px_0px_#000] hover:shadow-[8px_8px_0px_#000] transition-all hover:-translate-y-1"
          >
            {/* STEP NUMBER */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 text-xs font-black flex items-center justify-center shadow-lg border-3 border-black">
              {idx + 1}
            </div>

            {/* ICON */}
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg flex items-center justify-center text-slate-900 border-3 border-black">
              <step.icon className="w-7 h-7" />
            </div>

            {/* TEXT */}
            <h3 className="text-sm font-black uppercase text-slate-900 mb-1 tracking-wide">
              {step.title}
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              {step.desc}
            </p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="flex justify-center">
        <Link
         to="/custom-order"
          className="inline-flex items-center gap-3 px-10 py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 text-sm font-black uppercase tracking-widest hover:from-yellow-400 hover:to-orange-400 transition-all shadow-[6px_6px_0px_#000] border-4 border-black hover:shadow-[8px_8px_0px_#000] hover:scale-105"
        >
          Make My Badge <Sparkles className="w-5 h-5" />
        </Link>
      </div>

    </div>
  </section>
);

const CustomisedProductsSection: React.FC = () => {
  const products = [
    { name: "Pin-back Badge", image: "badge/pin-back badge.png" },
    { name: "Fridge Magnet Badge", image: "badge/fridge-badge2.png" },
    { name: "Shirt Magnet Badge", image: "badge/shirt-magnet badge.png" },
    // { name: "Keychain Badge", image: "/custom/keychain.png" },
    // { name: "Dot Socket – Mobile Holder", image: "/custom/socket.png" },
  ];

  return (
    <section className="relative bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-16 overflow-hidden">
      {/* Canva-style Background Elements */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-150px] right-[-100px] w-[500px] h-[500px] bg-purple-300/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-blue-300/20 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-pink-300/15 rounded-full blur-[90px]" />
        
        {/* Floating Shapes */}
        <div className="absolute top-20 right-20 w-16 h-16 rounded-lg bg-purple-400/10 rotate-12 animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-40 left-16 w-20 h-20 rounded-full bg-blue-400/10 animate-bounce" style={{ animationDuration: '5s' }} />
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">

        {/* HEADER */}
        <div className="text-center mb-14">
          <span className="inline-block mb-3 px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg">
            CUSTOMISED PRODUCTS
          </span>
          <h2 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent tracking-tight">
            Choose Your Style
          </h2>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {products.map((item, idx) => (
            <div
              key={idx}
              className="relative group bg-white rounded-3xl p-6 text-center border-3 border-purple-200 shadow-[4px_4px_0px_rgba(168,85,247,0.4)] hover:shadow-[6px_6px_0px_rgba(168,85,247,0.6)] transition-all hover:-translate-y-1"
            >
              {/* Gradient Accent */}
              <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full border-3 border-white shadow-lg opacity-80" />
              
              {/* IMAGE */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-4 mb-4">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-28 h-28 object-contain mx-auto transform group-hover:scale-110 transition-transform duration-300"
                />
              </div>

              {/* TEXT */}
              <p className="text-sm font-black text-slate-800 leading-snug uppercase tracking-wide">
                {item.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};


const CategoryGrid: React.FC = () => (
  <section className="relative pt-12 pb-20 overflow-hidden bg-white">
    
    {/* Premium background glow - Hot Drops Style */}
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -top-64 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-yellow-500/10 rounded-full blur-[140px]" />
      <div className="absolute top-1/3 right-[-300px] w-[600px] h-[600px] bg-orange-400/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 left-[-200px] w-[500px] h-[500px] bg-red-400/10 rounded-full blur-[100px]" />
      
      {/* Floating Circles - Outer Edges Only */}
      <div className="absolute top-20 -left-8 w-24 h-24 rounded-full border-[8px] border-yellow-400/30 animate-bounce" style={{ animationDuration: '4s' }} />
      <div className="absolute top-40 -right-10 w-28 h-28 rounded-full border-[10px] border-orange-400/25 animate-pulse" style={{ animationDuration: '3s' }} />
      <div className="absolute bottom-32 -left-12 w-32 h-32 rounded-full border-[8px] border-red-400/20 animate-bounce" style={{ animationDuration: '5s', animationDelay: '1s' }} />
      <div className="absolute bottom-64 -right-8 w-20 h-20 rounded-full border-[6px] border-yellow-500/35 animate-pulse" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />
    </div>
    
    <div className="relative z-10 max-w-full mx-auto px-4 sm:px-10 lg:px-20">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">

        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 px-6 py-3 rounded-full mb-4 border-2 border-yellow-500/30">
            <Zap className="w-5 h-5 text-yellow-600 animate-pulse" />
            <span className="text-[11px] font-black text-yellow-700 uppercase tracking-widest">All Drops</span>
            <Zap className="w-5 h-5 text-orange-600 animate-pulse" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-slate-900 via-yellow-700 to-orange-700 bg-clip-text text-transparent tracking-tight mb-3 uppercase leading-tight">
            Browse Category
          </h2>

          <p className="text-lg text-slate-600 font-semibold">
            Ready-to-ship collections for every subculture.
          </p>
        </div>

        <Link
          to="/categories"
          className="text-xs font-black tracking-[0.3em] text-orange-600 uppercase flex items-center gap-3 border-b-2 border-orange-600 pb-1 hover:text-orange-700 hover:border-orange-700 transition-colors"
        >
          Browse All Drops <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

        {CATEGORIES.map((cat) => (
        <Link
  key={cat.id}
  to={`/categories?cat=${cat.id}`}
  className="
    relative
    h-[220px]
    rounded-2xl
    overflow-hidden
    group
    bg-gradient-to-br from-slate-900 to-slate-800
    border-2 border-yellow-500/20
    shadow-[0_12px_35px_rgba(15,23,42,0.25)]
    transition-all duration-300
    hover:shadow-2xl hover:shadow-yellow-500/20 hover:-translate-y-2 hover:border-yellow-500/60
  "
>
  {/* BACKGROUND IMAGE */}
  <div
    className="
      absolute inset-0
      bg-cover bg-center
      transition-transform duration-500
      group-hover:scale-110
      brightness-105 contrast-105
      opacity-90
    "
    style={{ backgroundImage: `url(${cat.image})` }}
  />

  {/* SOFT GRADIENT OVERLAY (NO BLUR) */}
  {/* <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/15 to-transparent" /> */}

  {/* TEXT CONTENT */}
 <div className="relative z-10 h-full flex flex-col justify-end p-6 pb-12">

  <span
    className="
      absolute
      bottom-3
      left-4
      bg-black
      text-white
      text-[11px]
      font-black
      tracking-widest
      uppercase
      px-4 py-2
      rounded-full
      shadow-lg
      border-2 border-black/30
    "
  >
    {cat.name}
  </span>

    {/* <span className="
      mt-2
      text-[10px]
      font-semibold
      uppercase
      tracking-widest
      text-white/80
    ">
      {cat.count} Badges
    </span> */}
  </div>
</Link>


        ))}

      </div>
    </div>
  </section>
);


const FeaturedSection: React.FC<{ addToCart: (badge: Badge) => void }> = ({ addToCart }) => {
  const featuredBadges = BADGES.filter(b => b.isFeatured).slice(0, 8);
  const [flippedId, setFlippedId] = useState<string | null>(null);

const navigate = useNavigate();
const [quantities, setQuantities] = useState<Record<string, number>>({});

const getQty = (id: string) => quantities[id] ?? 10;

const increaseQty = (id: string) => {
  setQuantities(prev => ({
    ...prev,
    [id]: getQty(id) + 1,
  }));
};

const decreaseQty = (id: string) => {
  setQuantities(prev => ({
    ...prev,
    [id]: Math.max(1, getQty(id) - 1),
  }));
};


  return (
<section className="relative pt-12 pb-24 overflow-hidden bg-white">

          {/* Premium background glow - Logo Theme */}
<div className="pointer-events-none absolute inset-0">
 <div className="absolute -top-64 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-yellow-500/10 rounded-full blur-[140px]" />
  <div className="absolute top-1/3 right-[-300px] w-[600px] h-[600px] bg-orange-400/10 rounded-full blur-[120px]" />
  <div className="absolute bottom-1/4 left-[-200px] w-[500px] h-[500px] bg-red-400/10 rounded-full blur-[100px]" />
  
  {/* Funny Floating Circles - Outer Edges Only */}
  <div className="absolute top-32 -left-8 w-24 h-24 rounded-full border-[8px] border-yellow-400/30 animate-bounce" style={{ animationDuration: '4s' }} />
  <div className="absolute top-64 -right-12 w-32 h-32 rounded-full border-[10px] border-orange-400/25 animate-pulse" style={{ animationDuration: '3s' }} />
  <div className="absolute bottom-40 -left-16 w-28 h-28 rounded-full border-[8px] border-red-400/20 animate-bounce" style={{ animationDuration: '5s', animationDelay: '1s' }} />
  <div className="absolute bottom-72 -right-8 w-20 h-20 rounded-full border-[6px] border-yellow-500/35 animate-pulse" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />
</div>

  
      <div className="max-w-7xl mx-auto px-6 lg:px-12">

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 px-6 py-3 rounded-full mb-4 border-2 border-yellow-500/30">
            <Zap className="w-5 h-5 text-yellow-600 animate-pulse" />
            <span className="text-[11px] font-black text-yellow-700 uppercase tracking-widest">Trending Now</span>
            <Zap className="w-5 h-5 text-orange-600 animate-pulse" />
          </div>
        <h2 className="text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-yellow-700 to-orange-700 bg-clip-text text-transparent mb-2">
  HOT DROPS
</h2>
      <p className="mt-2 text-[11px] tracking-[0.22em] text-slate-600 uppercase font-bold">
        Grab them before they disappear into the vault ⚡</p>
</div>

 <div className="
grid
grid-cols-2
sm:grid-cols-2
md:grid-cols-2
lg:grid-cols-3
xl:grid-cols-4
gap-4 sm:gap-6 md:gap-8


  max-w-[1600px]
  mx-auto
">




         {featuredBadges.map((badge) => {
  const qty = getQty(badge.id);
  const total = badge.price * qty;

  return (


   <div
  key={badge.id}
  className="
  bg-gradient-to-br from-slate-900 to-slate-800
  rounded-2xl sm:rounded-3xl
  p-2 sm:p-4 md:p-6
  border-2 border-yellow-500/20
  flex flex-col
  transition-all duration-300
  hover:shadow-2xl hover:shadow-yellow-500/20 hover:-translate-y-2 hover:border-yellow-500/60
  hover:scale-105
  group
"

>
  {/* IMAGE BOX */}
  <div
    onClick={() => navigate(`/badge/${badge.id}`)}
    className="bg-white rounded-xl sm:rounded-2xl flex items-center justify-center h-32 sm:h-56 md:h-64 lg:h-72
 cursor-pointer mb-2 sm:mb-4 md:mb-5 overflow-hidden shadow-lg ring-2 sm:ring-4 ring-yellow-500/10 group-hover:ring-yellow-500/30 transition-all"

  >
   <img
  src={badge.image}
  alt={badge.name}
  className="h-28 sm:h-48 md:h-56 lg:h-64 w-28 sm:w-48 md:w-56 lg:w-64 object-contain group-hover:scale-110 transition-transform duration-300"
/>

  </div>

  {/* CATEGORY + PRICE */}
<div className="flex justify-between items-center mb-1 sm:mb-2">
  <span className="text-[9px] sm:text-[11px] md:text-[12px] font-black text-yellow-400 uppercase tracking-wider sm:tracking-widest">
    {badge.category}
  </span>
  <span className="text-sm sm:text-xl md:text-2xl font-black text-white">
    ₹{total}
  </span>
</div>

{/* NAME + QUANTITY */}
<div className="flex items-center justify-between gap-1 sm:gap-2 md:gap-3 mb-2 sm:mb-3 md:mb-4">
  <h3 className="text-[10px] sm:text-[12px] md:text-[14px] font-black text-white uppercase tracking-tight sm:tracking-wide leading-tight flex-1 truncate">
    {badge.name}
  </h3>

  <div className="flex items-center gap-1 bg-slate-700/50 border border-yellow-500/30 sm:border-2 rounded px-1 py-0.5 sm:px-2 sm:py-1 shrink-0">
    <button
      onClick={() => decreaseQty(badge.id)}
      className="w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center bg-yellow-500 hover:bg-yellow-400 rounded text-slate-900 text-xs sm:text-sm font-black transition-colors"
    >
      -
    </button>

    <span className="w-4 sm:w-6 text-center text-[10px] sm:text-[13px] font-black text-white">
      {qty}
    </span>

    <button
      onClick={() => increaseQty(badge.id)}
      className="w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center bg-yellow-500 hover:bg-yellow-400 rounded text-slate-900 text-xs sm:text-sm font-black transition-colors"
    >
      +
    </button>
  </div>
</div>

{/* BUTTONS */}
<div className="flex gap-1.5 sm:gap-2 md:gap-3 mt-auto">
  <button
    onClick={() =>
      addToCart({ ...badge, quantity: getQty(badge.id) })
    }
    className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 py-1.5 sm:py-2 md:py-3 rounded-lg sm:rounded-xl text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-wide sm:tracking-wider hover:from-yellow-400 hover:to-orange-400 transition-all shadow-lg hover:shadow-xl"
  >
    Buy Now
  </button>

  <button
    onClick={() =>
      addToCart({ ...badge, quantity: getQty(badge.id) })
    }
    className="w-8 sm:w-10 md:w-14 bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 rounded-lg sm:rounded-xl flex items-center justify-center hover:from-yellow-400 hover:to-orange-400 transition-all shadow-lg hover:shadow-xl"
  >
    <Plus className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 font-black" />
  </button>
</div>

</div>
)})}

        </div>
      </div>
    </section>
  );
};

export default function Home({ addToCart }: HomeProps) {
  return (
    <div className="bg-white">
      <Hero />
      {/* <CustomisedProductsSection /> */}
      <CategoryGrid />
      <FeaturedSection addToCart={addToCart} />
      <HowItWorksSection />
    </div>
  );
}
