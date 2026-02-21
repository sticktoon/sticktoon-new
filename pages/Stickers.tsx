import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { STICKERS, STICKER_CATEGORIES, formatPrice } from '../constants';
import { Sticker } from '../constants';
import { Check } from 'lucide-react';

interface StickersProps {
  addToCart: (sticker: Sticker) => void;
}

export default function Stickers({ addToCart }: StickersProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const catParam = searchParams.get('cat');
  const [activeCategory, setActiveCategory] = useState(catParam || 'all');
  const filterPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (catParam) setActiveCategory(catParam);
  }, [catParam]);

  const handleCategorySelect = (id: string) => {
    setActiveCategory(id);
    setSearchParams({ cat: id === 'all' ? '' : id });
  };

  const filteredStickers = activeCategory === 'all' 
    ? STICKERS 
    : STICKERS.filter(s => s.category === activeCategory);

  // Group stickers by category
  const stickersByCategory = STICKER_CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = STICKERS.filter((s) => s.category === cat.id);
    return acc;
  }, {} as Record<string, Sticker[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50/30 to-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-yellow-500/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-[-200px] w-[600px] h-[600px] bg-orange-400/6 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-[-200px] w-[500px] h-[500px] bg-red-400/5 rounded-full blur-[90px]" />
      </div>

      {/* Floating Decorations */}
      <div className="hidden lg:block absolute top-20 left-12 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-3 border-black shadow-[4px_4px_0px_#000] animate-bounce opacity-60" style={{ animationDelay: '0s', animationDuration: '3s' }}></div>
      <div className="hidden lg:block absolute top-40 right-20 w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-pink-500 border-3 border-black shadow-[4px_4px_0px_#000] animate-bounce opacity-60" style={{ animationDelay: '0.5s', animationDuration: '3.5s' }}></div>
      <div className="hidden lg:block absolute bottom-32 left-24 w-14 h-14 rounded-full bg-black border-3 border-yellow-400 shadow-[4px_4px_0px_#FFD600] animate-bounce opacity-60" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>

      <div className="relative z-10 flex">
        {/* STICKY SIDEBAR */}
        <aside className="hidden lg:flex flex-col w-64 fixed left-0 top-24 h-[calc(100vh-6rem)] pt-4 px-4 bg-white/60 backdrop-blur-sm border-r-2 border-slate-200/80 overflow-y-auto">
          <div className="flex flex-col h-full">
            <button
              onClick={() => handleCategorySelect('all')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-black uppercase tracking-wide transition-all text-sm shadow-sm ${
                activeCategory === 'all' 
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 shadow-[4px_4px_0px_#000] border-2 border-black' 
                  : 'text-slate-700 hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50 border-2 border-slate-200'
              }`}
            >
              All Stickers
              {activeCategory === 'all' && <Check className="w-5 h-5" />}
            </button>
            
            <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent my-3"></div>

            <div className="flex flex-col flex-1 justify-between gap-2 pb-2">
              {STICKER_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-black uppercase tracking-wide transition-all text-sm shadow-sm ${
                    activeCategory === cat.id 
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 shadow-[4px_4px_0px_#000] border-2 border-black' 
                      : 'text-slate-700 hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50 border-2 border-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
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
        <main className="w-full lg:ml-64 px-4 sm:px-6 lg:pl-6 lg:pr-8 pt-12 lg:pt-16">
          <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center md:gap-6 mb-6 md:mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/30 mb-3">
                <span className="text-xs font-black tracking-[0.2em] uppercase text-orange-700">Browse Collection</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-yellow-700 to-orange-700 bg-clip-text text-transparent">
                Stickers Collection
              </h1>
              <p className="text-slate-600 text-sm md:text-base font-semibold mt-2">
                Discover unique stickers that express your style
              </p>
            </div>
          </div>

          {activeCategory === 'all' ? (
            // Show all categories with sections
            <div className="space-y-12">
              {STICKER_CATEGORIES.map((category) => {
                const categoryStickers = stickersByCategory[category.id] || [];
                if (categoryStickers.length === 0) return null;

                return (
                  <div key={category.id} className="space-y-4">
                    {/* Category Header */}
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-500/30 flex items-center justify-center">
                          <span className="text-3xl">{category.icon}</span>
                        </div>
                        <div>
                          <h2 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent uppercase tracking-tight">
                            {category.name}
                          </h2>
                        </div>
                      </div>
                    </div>

                    {/* Category Products Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {categoryStickers.map((sticker) => (
                        <div
                          key={sticker.id}
                          className="bg-white rounded-2xl border-[2px] border-slate-200 overflow-hidden hover:shadow-lg hover:border-yellow-500 transition-all duration-300 group flex flex-col"
                        >
                          {/* Image Container */}
                          <div className="relative h-48 overflow-hidden bg-slate-100">
                            <img
                              src={sticker.image}
                              alt={sticker.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>

                          {/* Content */}
                          <div className="p-4 flex flex-col flex-1">
                            <h3 className="text-base font-bold text-slate-900 mb-1">
                              {sticker.name}
                            </h3>
                            <p className="text-sm text-slate-600 mb-3 line-clamp-2 flex-1">
                              {sticker.details}
                            </p>

                            {/* Price & Action */}
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-black text-yellow-600">
                                {formatPrice(sticker.price)}
                              </span>
                              <button
                                onClick={() => addToCart(sticker)}
                                className="text-yellow-600 font-semibold hover:text-yellow-700 transition-colors"
                              >
                                Add to Cart →
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Show single category
            <div className="space-y-4">
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-500/30 flex items-center justify-center">
                    <span className="text-3xl">{STICKER_CATEGORIES.find(c => c.id === activeCategory)?.icon}</span>
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent uppercase tracking-tight">
                      {STICKER_CATEGORIES.find(c => c.id === activeCategory)?.name}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Single Category Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredStickers.map((sticker) => (
                  <div
                    key={sticker.id}
                    className="bg-white rounded-2xl border-[2px] border-slate-200 overflow-hidden hover:shadow-lg hover:border-yellow-500 transition-all duration-300 group flex flex-col"
                  >
                    {/* Image Container */}
                    <div className="relative h-48 overflow-hidden bg-slate-100">
                      <img
                        src={sticker.image}
                        alt={sticker.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>

                    {/* Content */}
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="text-base font-bold text-slate-900 mb-1">
                        {sticker.name}
                      </h3>
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2 flex-1">
                        {sticker.details}
                      </p>

                      {/* Price & Action */}
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black text-yellow-600">
                          {formatPrice(sticker.price)}
                        </span>
                        <button
                          onClick={() => addToCart(sticker)}
                          className="text-yellow-600 font-semibold hover:text-yellow-700 transition-colors"
                        >
                          Add to Cart →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredStickers.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-yellow-500/30">
                <span className="text-6xl">🎲</span>
              </div>
              <h3 className="text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent uppercase">No stickers found</h3>
              <p className="text-slate-600 mt-3 text-base max-w-sm mx-auto font-semibold">Try selecting a different category from the sidebar.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
