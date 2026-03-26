import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { STICKERS, STICKER_CATEGORIES, formatPrice } from '../constants';
import { Sticker } from '../constants';
import { Check, ShoppingCart, Sparkles } from 'lucide-react';

interface StickersProps {
  addToCart: (sticker: Sticker) => void;
}

// Premium Sticker Card Component
function StickerCard({ sticker, addToCart, index }: { sticker: Sticker; addToCart: (s: Sticker) => void; index: number }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart(sticker);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div
      className="group relative bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-1.5
        shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)]
        border border-slate-200/80 hover:border-yellow-400/60"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Hover glow effect */}
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-yellow-400/0 via-orange-400/0 to-red-400/0 group-hover:from-yellow-400/20 group-hover:via-orange-400/10 group-hover:to-red-400/20 transition-all duration-500 pointer-events-none z-0" />

      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 z-10">
        {/* Shimmer loader */}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse" />
        )}
        <img
          src={sticker.image}
          alt={sticker.name}
          className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setImgLoaded(true)}
        />
        {/* Overlay gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Featured badge */}
        {sticker.isFeatured && (
          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center gap-1 shadow-lg">
            <Sparkles className="w-3 h-3 text-white" />
            <span className="text-[10px] font-black text-white uppercase tracking-wider">Featured</span>
          </div>
        )}

        {/* Quick add button on hover */}
        <button
          onClick={handleAdd}
          className={`absolute bottom-3 right-3 p-2.5 rounded-xl transition-all duration-300 shadow-lg
            ${added 
              ? 'bg-green-500 scale-110' 
              : 'bg-white/90 backdrop-blur-sm opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:bg-yellow-500 hover:scale-110'
            }`}
        >
          {added 
            ? <Check className="w-4 h-4 text-white" /> 
            : <ShoppingCart className="w-4 h-4 text-slate-700 group-hover:text-slate-900" />
          }
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 p-3.5 sm:p-4 flex flex-col flex-1 bg-white">
        {/* Category pill */}
        {sticker.tagline && (
          <p className="text-[10px] font-bold text-orange-600/80 uppercase tracking-widest mb-1 truncate">
            {sticker.tagline}
          </p>
        )}

        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mb-0.5 leading-tight tracking-tight line-clamp-1">
          {sticker.name}
        </h3>
        <p className="text-xs text-slate-500 mb-3 line-clamp-1 flex-1 font-medium">
          {sticker.details}
        </p>

        {/* Price & Action */}
        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-black bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              {formatPrice(sticker.price)}
            </span>
          </div>
          <button
            onClick={handleAdd}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300
              ${added
                ? 'bg-green-500 text-white scale-95'
                : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 hover:shadow-md active:scale-95'
              }`}
          >
            {added ? '✓ Added' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Stickers({ addToCart }: StickersProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const catParam = searchParams.get('cat');
  const [activeCategory, setActiveCategory] = useState(catParam || 'all');
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (catParam) setActiveCategory(catParam);
    else setActiveCategory('all');
  }, [catParam]);

  // Scroll to top when category changes
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeCategory]);

  const handleCategorySelect = (id: string) => {
    setActiveCategory(id);
    setSearchParams(id === 'all' ? {} : { cat: id });
  };

  const filteredStickers = activeCategory === 'all' 
    ? STICKERS.filter(s => s.category !== 'sticker-pack')
    : STICKERS.filter(s => s.category === activeCategory);

  // Group stickers by category (exclude packs from "all" view)
  const stickersByCategory = STICKER_CATEGORIES.filter(cat => cat.id !== 'sticker-pack').reduce((acc, cat) => {
    acc[cat.id] = STICKERS.filter((s) => s.category === cat.id);
    return acc;
  }, {} as Record<string, Sticker[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 relative overflow-hidden">
      {/* Subtle Background Effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-yellow-400/5 rounded-full blur-[150px]" />
        <div className="absolute top-1/3 right-[-200px] w-[600px] h-[600px] bg-orange-300/4 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-[-200px] w-[500px] h-[500px] bg-amber-300/4 rounded-full blur-[100px]" />
        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>

      <div className="relative z-10 flex">
        {/* STICKY SIDEBAR */}
        <aside className="hidden lg:flex flex-col w-64 fixed left-0 top-24 h-[calc(100vh-6rem)] pt-4 px-4 bg-white/80 backdrop-blur-md border-r border-slate-200/60 overflow-y-auto z-[60]">
          <div className="flex flex-col h-full">
            <button
              onClick={() => handleCategorySelect('all')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold uppercase tracking-wide transition-all duration-300 text-sm ${
                activeCategory === 'all' 
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg shadow-yellow-500/25 border border-yellow-400' 
                  : 'text-slate-600 hover:bg-slate-100/80 border border-transparent hover:border-slate-200'
              }`}
            >
              All Stickers
              {activeCategory === 'all' && <Check className="w-4 h-4" />}
            </button>
            
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-3"></div>

            <div className="flex flex-col flex-1 justify-between gap-1.5 pb-2">
              {STICKER_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-bold uppercase tracking-wide transition-all duration-300 text-sm ${
                    activeCategory === cat.id 
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg shadow-yellow-500/25 border border-yellow-400' 
                      : 'text-slate-600 hover:bg-slate-100/80 border border-transparent hover:border-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base flex-shrink-0">{cat.icon}</span>
                    <span className="truncate text-xs">{cat.name}</span>
                  </span>
                  {activeCategory === cat.id && <Check className="w-4 h-4 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main ref={mainRef} className="w-full lg:ml-64 px-4 sm:px-6 lg:pl-8 lg:pr-10 pt-10 lg:pt-14 pb-16">
          {/* Header */}
          <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-end md:gap-6 mb-8 md:mb-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 mb-3">
                <Sparkles className="w-3 h-3 text-orange-600" />
                <span className="text-[10px] font-black tracking-[0.2em] uppercase text-orange-700">Premium Collection</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900">
                Stickers <span className="bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">Collection</span>
              </h1>
              <p className="text-slate-500 text-sm md:text-base font-medium mt-2">
                Discover unique stickers that express your style
              </p>
            </div>
            {activeCategory !== 'all' && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-50 border border-yellow-200/60">
                <span className="text-base">{STICKER_CATEGORIES.find(c => c.id === activeCategory)?.icon}</span>
                <span className="text-sm font-bold text-slate-700">{filteredStickers.length} stickers</span>
              </div>
            )}
          </div>

          {/* Content with key to force remount on category change */}
          <div key={activeCategory}>
            {activeCategory === 'all' ? (
              // Show all categories with sections
              <div className="space-y-14">
                {STICKER_CATEGORIES.filter(c => c.id !== 'sticker-pack').map((category) => {
                  const categoryStickers = stickersByCategory[category.id] || [];
                  if (categoryStickers.length === 0) return null;

                  return (
                    <div key={category.id} className="space-y-5">
                      {/* Category Header */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-100 to-orange-100 border border-yellow-300/40 flex items-center justify-center shadow-sm">
                          <span className="text-xl">{category.icon}</span>
                        </div>
                        <div>
                          <h2 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight leading-none">
                            {category.name}
                          </h2>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">{categoryStickers.length} stickers</p>
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent ml-4"></div>
                      </div>

                      {/* Category Products Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                        {categoryStickers.map((sticker, i) => (
                          <StickerCard key={sticker.image} sticker={sticker} addToCart={addToCart} index={i} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Show single category
              <div className="space-y-5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-100 to-orange-100 border border-yellow-300/40 flex items-center justify-center shadow-sm">
                    <span className="text-xl">{STICKER_CATEGORIES.find(c => c.id === activeCategory)?.icon}</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight">
                    {STICKER_CATEGORIES.find(c => c.id === activeCategory)?.name}
                  </h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent ml-4"></div>
                </div>

                {/* Single Category Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                  {filteredStickers.map((sticker, i) => (
                    <StickerCard key={sticker.image} sticker={sticker} addToCart={addToCart} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {filteredStickers.length === 0 && activeCategory !== 'all' && (
            <div className="py-24 text-center">
              <div className="w-28 h-28 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-yellow-200/40 shadow-sm">
                <span className="text-5xl">🎲</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 uppercase">No stickers found</h3>
              <p className="text-slate-500 mt-2 text-sm max-w-sm mx-auto font-medium">Try selecting a different category from the sidebar.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
