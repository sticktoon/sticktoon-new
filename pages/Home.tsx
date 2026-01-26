
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
  className="
    relative
    w-full
   min-h-screen

    overflow-hidden
    flex items-center
    bg-cover
    bg-center
  "
  style={{
    backgroundImage: "url('/badge/herosection.png')",
  }}
>
  {/* ✅ OVERLAY (BELOW CONTENT) */}
  {/* <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent z-0" /> */}

  {/* ✅ CONTENT */}
  <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
    
    
    {/* LEFT CONTENT */}
    <div>
      <h1 className="relative text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-[0.17em] leading-[1.15] text-[#0f172a]
        drop-shadow-[0_14px_22px_rgba(15,23,42,0.4)]
      ">
        <span className="absolute inset-0 translate-y-[2px] text-black/20">
          WE CREATE <br /> FOR SOULS
        </span>

        <span className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/10 to-transparent bg-clip-text text-transparent">
          WE CREATE <br /> FOR SOULS
        </span>

        <span className="relative">
          WE CREATE <br /> FOR SOULS
        </span>
      </h1>

      <p className="mt-4 md:mt-6 mb-6 md:mb-10 max-w-xl text-base md:text-lg text-slate-500 font-medium leading-relaxed">
        Premium custom badges designed for creators, communities, and brands who wear their vibe.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
        <button
          onClick={() => navigate("/categories")}
          className="px-6 md:px-10 py-3 md:py-4 rounded-xl bg-[#0f172a] text-white font-bold tracking-widest uppercase shadow-lg text-sm md:text-base
          hover:bg-indigo-600 hover:shadow-indigo-300/40 transition-all w-full sm:w-auto"
        >
          View Collection
        </button>

        <button
          onClick={() => navigate("/custom-order")}
          className="px-6 md:px-10 py-3 md:py-4 rounded-xl border-2 border-[#0f172a] text-[#0f172a] font-bold tracking-widest uppercase text-sm md:text-base
          hover:bg-[#0f172a] hover:text-white transition-all w-full sm:w-auto"
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
    className="hover:scale-110 active:scale-95 transition"
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
  <section className="min-h-screen bg-white flex items-center py-12 md:py-0">
    <div className="max-w-6xl mx-auto px-4 md:px-6 w-full">

      {/* HEADER */}
      <div className="text-center mb-10">
        <span className="inline-block mb-3 px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600">
          The Craft
        </span>

        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
          How It Works
        </h2>

        <p className="mt-2 text-slate-500 text-xs md:text-sm">
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
            className="relative bg-slate-50 rounded-2xl p-6 text-center border border-slate-100 hover:shadow-md transition"
          >
            {/* STEP NUMBER */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
              {idx + 1}
            </div>

            {/* ICON */}
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600">
              <step.icon className="w-7 h-7" />
            </div>

            {/* TEXT */}
            <h3 className="text-sm font-black uppercase text-slate-900 mb-1 tracking-wide">
              {step.title}
            </h3>

            <p className="text-xs text-slate-500 leading-relaxed">
              {step.desc}
            </p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="flex justify-center">
        <Link
         to="/custom-order"
          className="inline-flex items-center gap-3 px-10 py-4 rounded-xl bg-slate-900 text-white text-sm font-black uppercase tracking-widest hover:bg-indigo-600 transition shadow-lg"
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
    <section className="bg-white py-16">
      <div className="max-w-7xl mx-auto px-6">

        {/* HEADER */}
        <div className="relative flex items-center justify-center mb-14">
          <div className="absolute left-0 right-0 h-px bg-slate-200" />
          <span className="relative z-10 bg-white px-6 py-2 text-xs font-black tracking-widest text-slate-700 border border-slate-300">
            CUSTOMISED PRODUCTS
          </span>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 justify-center">


          {products.map((item, idx) => (
            <div
              key={idx}
              className="
                relative
                flex flex-col items-center text-center px-6 py-6
                lg:col-span-2
              "
            >

              {/* Vertical Divider */}
              {idx !== products.length - 1 && (
                <div className="hidden lg:block absolute right-0 top-10 bottom-10 border-r border-dashed border-slate-300" />
              )}

              {/* IMAGE */}
              <img
                src={item.image}
                alt={item.name}
                className="w-28 h-28 object-contain mb-6"
              />

              {/* TEXT */}
              <p className="text-sm font-semibold text-slate-700 leading-snug">
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
  <section className="py-12 pb-10 bg-slate-50">
    <div className="max-w-full mx-auto px-4 sm:px-10 lg:px-20">

      {/* HEADER */}
    <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">

        <div className="max-w-4xl">
         <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4 uppercase leading-tight">
  Browse Category
</h2>

          <p className="text-lg text-slate-500 font-medium">
            Ready-to-ship collections for every subculture.
          </p>
        </div>

        <Link
          to="/categories"
          className="text-xs font-black tracking-[0.3em] text-indigo-600 uppercase flex items-center gap-3 border-b-2 border-indigo-600 pb-1"
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
    rounded-[2.2rem]
    overflow-hidden
    
    group
    bg-white
    shadow-[0_12px_35px_rgba(15,23,42,0.18)]
  "
>
  {/* BACKGROUND IMAGE */}
  <div
    className="
      absolute inset-0
      bg-cover bg-center
      transition-transform duration-500
      group-hover:scale-105
      brightness-105 contrast-105
    "
    style={{ backgroundImage: `url(${cat.image})` }}
  />

  {/* SOFT GRADIENT OVERLAY (NO BLUR) */}
  {/* <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/15 to-transparent" /> */}

  {/* TEXT CONTENT */}
 <div className="relative z-10 h-full flex flex-col justify-end p-6 pb-14">

  <span
    className="
      absolute
      bottom-1
      left-4
      bg-black/80
      text-white
      text-[11px]
      font-black
      tracking-widest
      uppercase
      px-4 py-2
      rounded-full
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
  const featuredBadges = BADGES.filter(b => b.isFeatured).slice(0, 10);
  const [flippedId, setFlippedId] = useState<string | null>(null);

const navigate = useNavigate();


  return (
<section className="relative pt-12 pb-24 overflow-hidden bg-white">

          {/* Premium background glow */}
<div className="pointer-events-none absolute inset-0">
 <div className="absolute -top-64 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-indigo-500/10 rounded-full blur-[140px]" />

  <div className="absolute top-1/3 right-[-300px] w-[600px] h-[600px] bg-sky-400/10 rounded-full blur-[120px]" />
</div>

  
      <div className="max-w-7xl mx-auto px-6 lg:px-12">

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 bg-indigo-600/5 px-6 py-2 rounded-full mb-4 border border-indigo-600/10">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Trending Now</span>
          </div>
        <h2 className="text-5xl font-black tracking-tight text-slate-900 mb-1">

  HOT DROPS
</h2>
      <p className="mt-1 text-[10px] tracking-[0.22em] text-slate-400 uppercase">
        Grab them before they disappear into the vault</p>
</div>

 <div className="
  grid
  grid-cols-3
  sm:grid-cols-4
  lg:grid-cols-5
  gap-4
  max-w-[1600px]
  mx-auto
">




          {featuredBadges.map((badge) => (
    <div 
  key={badge.id} 
className="
  group
  relative
  bg-white
  rounded-[2rem]
  p-3
  shadow-[0_18px_50px_rgba(15,23,42,0.12)]
  hover:shadow-[0_28px_70px_rgba(15,23,42,0.18)]
  transition-all
  duration-300
  border border-slate-100
  flex flex-col
"

>


             {/* <button className="
  absolute top-4 right-4
  w-10 h-10
  rounded-full
  bg-white
  border border-slate-200
  shadow-md
  flex items-center justify-center
  text-slate-300
  hover:text-rose-500
  hover:scale-110
  transition-all
  z-20
">
  <Heart className="w-5 h-5 fill-current" />
</button> */}


<div
  onClick={() => navigate(`/badge/${badge.id}`)}
  className="
    relative
    mb-6
    rounded-[22px]
    bg-[#f8fafc]
    shadow-inner
    flex
    items-center
    justify-center
    aspect-square
    cursor-pointer
  "
>


  {/* SOFT BACKGROUND PANEL (like Categories) */}
  {/* <div className="
    absolute inset-0
    rounded-[1.5rem]
    bg-gradient-to-b from-slate-50 to-white
    shadow-inner
  " /> */}

  {/* SOFT RADIAL GLOW */}
 {/* <div className="
  absolute inset-0
  rounded-[1.5rem]
  bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.08),transparent_65%)]
" /> */}


  <div
    style={{
      position: "relative",
      width: "100%",
      height: "100%",
      borderRadius: "9999px",
      overflow: "hidden",
      transformStyle: "preserve-3d",
      transition: "transform 0.7s ease",
      transform:
        flippedId === badge.id ? "rotateY(180deg)" : "rotateY(0deg)",
    }}
  >
    {/* FRONT */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        backfaceVisibility: "hidden",
      }}
    >
<img
  src={badge.image}
  alt={badge.name}
  className="
    w-[95%]
    h-[95%]
    object-contain
    transition-transform
    duration-500
    group-hover:scale-110
  "
/>


    </div>

    {/* BACK */}
    {/* <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#0f172a",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        letterSpacing: "0.2em",
        fontSize: "12px",
        transform: "rotateY(180deg)",
        backfaceVisibility: "hidden",
      }}
    >
      PIN BACK
    </div> */}
  </div>
</div>

{/* <p className="text-white">{flippedId === badge.id ? "FLIPPED" : "FRONT"}</p> */}



              <div className="mt-auto">
                <div className="flex flex-col mb-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{badge.category}</span>
                    <div className="text-2xl font-black text-slate-900 tracking-tighter leading-none">
                      {formatPrice(badge.price)}
                    </div>
                  </div>
                <h3 className="text-[15px] font-extrabold text-slate-900 uppercase tracking-tight leading-tight">

{badge.name}</h3>
                </div>

                <button 
                  onClick={() => addToCart(badge)}
                 className="w-full py-3 bg-[#0f172a] text-white font-black rounded-xl hover:bg-indigo-600 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[10px]"

                >
                  Add to Cart <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
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
