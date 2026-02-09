
import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { BADGES, CATEGORIES, formatPrice } from '../constants';
import { Badge } from '../types';
import { Plus, SlidersHorizontal, Grid2X2, List, Check } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

interface CategoriesProps {
  addToCart: (badge: Badge) => void;
}

export default function Categories({ addToCart }: CategoriesProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const catParam = searchParams.get('cat');
  const [activeCategory, setActiveCategory] = useState(catParam || 'all');
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  
  // Products from database
  const [products, setProducts] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Check if user is admin
  const isAdmin = !!localStorage.getItem('adminToken');

  const normalizeImagePath = (path?: string) => {
    if (!path) return undefined;
    
    // Fix common typos: sport -> sports, entert3 -> enter3, animal.jpg -> animal1.png
    path = path.replace(/\/sport([0-9])/g, '/sports$1').replace(/^sport([0-9])/g, 'sports$1');
    path = path.replace(/\/entert3/g, '/enter3').replace(/^entert3/g, 'enter3');
    path = path.replace(/\/animal\.jpg/g, '/animal1.png').replace(/^animal\.jpg/g, 'animal1.png');
    
    // If already starts with /, return as is
    if (path.startsWith('/')) return path;
    
    // If starts with 'badge/', add leading slash
    if (path.startsWith('badge/')) return `/${path}`;
    
    // If just filename, prepend /badge/
    return `/badge/${path}`;
  };

  const mapApiProductsToBadges = (items: any[]): Badge[] =>
    items.map((p: any) => ({
      id: p._id,
      name: p.name,
      category: p.category
        .toLowerCase()
        .replace(/\s+/g, '-'), // "Positive Vibes" → "positive-vibes"
      price: p.price,
      image: normalizeImagePath(p.image) || '/badge/placeholder.png',
      imageMagnetic: normalizeImagePath(p.imageMagnetic),
      details: p.description || '',
      color: p.color || 'bg-transparent',
    }));

  const ensureMinimumPerCategory = (items: Badge[], minCount = 4): Badge[] => {
    const normalized = [...items];
    const byCategory = CATEGORIES.reduce((acc, cat) => {
      acc[cat.id] = normalized.filter((p) => p.category.toLowerCase() === cat.id.toLowerCase());
      return acc;
    }, {} as Record<string, Badge[]>);

    CATEGORIES.forEach((cat) => {
      const current = byCategory[cat.id] || [];
      if (current.length >= minCount) return;

      const fallback = BADGES.filter((b) => b.category.toLowerCase() === cat.id.toLowerCase());
      const needed = minCount - current.length;
      const existingIds = new Set(current.map((b) => b.id));
      const toAdd = fallback.filter((b) => !existingIds.has(b.id)).slice(0, needed);
      normalized.push(...toAdd);
    });

    return normalized;
  };

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/products`);
        if (res.ok) {
          const data = await res.json();
          const apiItems = Array.isArray(data) ? data : data.products || [];
          const mappedProducts = mapApiProductsToBadges(apiItems);
          setProducts(ensureMinimumPerCategory(mappedProducts));
        } else {
          // Fallback to static badges if API fails
          setProducts(ensureMinimumPerCategory(BADGES));
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        // Fallback to static badges
        setProducts(ensureMinimumPerCategory(BADGES));
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []); // Empty dependency array - fetch once on mount

  useEffect(() => {
    if (catParam) setActiveCategory(catParam);
  }, [catParam]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    if (isFilterOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFilterOpen]);

  const handleCategorySelect = (id: string) => {
    setActiveCategory(id);
    setSearchParams({ cat: id === 'all' ? '' : id });
    setIsFilterOpen(false);
  };

  const filteredBadges = activeCategory === 'all' 
    ? products 
    : products.filter(b => b.category.toLowerCase() === activeCategory.toLowerCase());

  const currentCategoryName = activeCategory === 'all' 
    ? 'All Badges' 
    : CATEGORIES.find(c => c.id === activeCategory)?.name || 'All Badges';

  const handleAddProduct = (category?: string) => {
    // Map frontend category to backend product category
    const categoryMap: Record<string, 'Moody' | 'Sports' | 'Religious' | 'Entertainment' | 'Events' | 'Animal' | 'Couple' | 'Anime' | 'Positive Vibes' | 'Custom'> = {
      'moody': 'Moody',
      'positive-vibes': 'Positive Vibes',
      'sports': 'Sports',
      'religious': 'Religious',
      'entertainment': 'Entertainment',
      'events': 'Events',
      'animal': 'Animal',
      'couple': 'Couple',
      'anime': 'Anime',
      'custom': 'Custom'
    };
    
    const targetCategory = category || activeCategory;
    const productCategory = categoryMap[targetCategory] || 'Custom';
    
    // Navigate to admin products page with category pre-selected
    navigate(`/admin/dashboard?view=products&category=${productCategory}`);
  };

  // Group products by category for section-wise display
  const productsByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = products.filter(p => p.category.toLowerCase() === cat.id.toLowerCase());
    return acc;
  }, {} as Record<string, Badge[]>);

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Premium background glow - Hot Drops Theme */}
      <div className="pointer-events-none absolute inset-0">
        {/* Main gradient blurs - responsive sizes */}
        <div className="absolute -top-32 sm:-top-48 md:-top-64 left-1/2 -translate-x-1/2 w-[500px] sm:w-[700px] md:w-[900px] h-[500px] sm:h-[700px] md:h-[900px] bg-yellow-500/10 rounded-full blur-[80px] sm:blur-[120px] md:blur-[140px]" />
        <div className="absolute top-1/4 sm:top-1/3 -right-32 sm:right-[-150px] md:right-[-300px] w-[350px] sm:w-[500px] md:w-[600px] h-[350px] sm:h-[500px] md:h-[600px] bg-orange-400/10 rounded-full blur-[80px] sm:blur-[100px] md:blur-[120px]" />
        <div className="absolute bottom-1/4 -left-24 sm:-left-32 md:left-[-200px] w-[300px] sm:w-[400px] md:w-[500px] h-[300px] sm:h-[400px] md:h-[500px] bg-red-400/10 rounded-full blur-[60px] sm:blur-[80px] md:blur-[100px]" />
        
        {/* Decorative circles - responsive sizes and positions */}
        <div className="absolute top-20 sm:top-24 md:top-28 -left-4 sm:-left-6 md:-left-8 w-16 sm:w-20 md:w-24 h-16 sm:h-20 md:h-24 rounded-full border-[6px] sm:border-[7px] md:border-[8px] border-yellow-400/30 animate-bounce" style={{ animationDuration: '4s' }} />
        <div className="absolute top-36 sm:top-44 md:top-52 -right-6 sm:-right-8 md:-right-10 w-20 sm:w-24 md:w-28 h-20 sm:h-24 md:h-28 rounded-full border-[8px] sm:border-[9px] md:border-[10px] border-orange-400/25 animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute bottom-24 sm:bottom-32 md:bottom-36 -left-6 sm:-left-10 md:-left-12 w-24 sm:w-28 md:w-32 h-24 sm:h-28 md:h-32 rounded-full border-[6px] sm:border-[7px] md:border-[8px] border-red-400/20 animate-bounce" style={{ animationDuration: '5s', animationDelay: '1s' }} />
        <div className="absolute bottom-48 sm:bottom-56 md:bottom-64 -right-4 sm:-right-6 md:-right-8 w-14 sm:w-16 md:w-20 h-14 sm:h-16 md:h-20 rounded-full border-[5px] sm:border-[5px] md:border-[6px] border-yellow-500/35 animate-pulse" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />
      </div>

      <div className="relative z-10 flex">
        {/* STICKY SIDEBAR */}
        <aside className="hidden lg:flex flex-col w-64 fixed left-0 top-24 h-[calc(100vh-6rem)] pt-4 px-4 border-r border-slate-200/60 overflow-y-auto">
          <div className="flex flex-col h-full">
            <button
              onClick={() => handleCategorySelect('all')}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl font-extrabold uppercase tracking-wide transition-all text-sm ${
                activeCategory === 'all' 
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 shadow-lg' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Badges
              {activeCategory === 'all' && <Check className="w-5 h-5" />}
            </button>
            
            <div className="h-px bg-slate-200 my-2.5"></div>

            <div className="flex flex-col flex-1 justify-between gap-2 pb-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl font-extrabold uppercase tracking-wide transition-all text-sm ${
                    activeCategory === cat.id 
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 shadow-lg' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-base flex-shrink-0">{cat.icon}</span>
                    <span className="truncate">{cat.name}</span>
                  </span>
                  {activeCategory === cat.id && <Check className="w-5 h-5 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="w-full lg:ml-64 px-4 sm:px-6 lg:pl-4 lg:pr-6 pt-16 lg:pt-20">
          <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center md:gap-6 mb-8 md:mb-10">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900">
                Explore the Collection
              </h1>
              <p className="text-slate-600 text-sm md:text-base font-semibold mt-2">
                ✨ Discover unique badges that speak your style
              </p>
            </div>

            <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto">
              {/* Admin Add Product Button */}
              {isAdmin && activeCategory !== 'all' && (
                <button
                  onClick={() => handleAddProduct()}
                  className="flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-[1.5rem] font-black text-xs md:text-sm tracking-widest uppercase transition-all shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add to {currentCategoryName}</span>
                  <span className="sm:hidden">Add</span>
                </button>
              )}

              {/* Mobile Filter Dropdown */}
              <div className="lg:hidden relative" ref={filterPanelRef}>
                <button 
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`flex items-center gap-2 md:gap-4 font-black px-4 md:px-8 py-3 md:py-4 rounded-[1.5rem] border transition-all text-xs md:text-sm ${
                    isFilterOpen 
                    ? 'bg-slate-50 border-slate-200 text-blue-600' 
                    : 'bg-white border-slate-100 text-slate-700 hover:border-slate-200'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="uppercase tracking-wide text-[9px] md:text-[10px]">Filter: <span className="text-blue-600 truncate">{currentCategoryName}</span></span>
                </button>

                {isFilterOpen && (
                  <div className="absolute left-0 md:left-auto md:right-0 mt-3 md:mt-4 w-full sm:w-72 bg-white rounded-[2rem] shadow-[0_30px_70px_rgba(0,0,0,0.12)] border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-3 space-y-1">
                      <button 
                        onClick={() => handleCategorySelect('all')}
                        className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl text-sm font-extrabold uppercase tracking-wide transition-all ${
                          activeCategory === 'all' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        All Badges
                        {activeCategory === 'all' && <Check className="w-4 h-4" />}
                      </button>
                      <div className="h-px bg-slate-100 mx-5 my-2"></div>
                      {CATEGORIES.map(cat => (
                        <button 
                          key={cat.id}
                          onClick={() => handleCategorySelect(cat.id)}
                          className={`w-full flex items-center justify-between px-5 py-3.5 rounded-xl text-sm font-extrabold uppercase tracking-wide transition-all ${
                            activeCategory === cat.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate">{cat.name}</span>
                          {activeCategory === cat.id && <Check className="w-5 h-5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        {loading ? (
          // Loading skeleton
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
            <p className="mt-4 text-slate-600 font-semibold">Loading products...</p>
          </div>
        ) : activeCategory === 'all' ? (
          // Show all categories with sections
          <div className="space-y-16">
            {CATEGORIES.map((category) => {
              const categoryProducts = productsByCategory[category.id] || [];
              if (categoryProducts.length === 0) return null;

              return (
                <div key={category.id} className="space-y-6">
                  {/* Category Header with Add Button */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-5xl">{category.icon}</span>
                        <div>
                          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 uppercase tracking-tight">
                            {category.name}
                          </h2>
                          <p className="text-sm md:text-base text-slate-600 font-semibold mt-1">
                            {category.id === 'moody' && '😊 Express Your Mood, Wear Your Vibe'}
                            {category.id === 'positive-vibes' && '✨ Spark Joy, Spread Positivity'}
                            {category.id === 'sports' && '🏆 Fuel Your Passion, Show Your Game'}
                            {category.id === 'religious' && '🙏 Faith & Devotion in Every Design'}
                            {category.id === 'entertainment' && '🎬 Pop Culture & Entertainment Icons'}
                            {category.id === 'events' && '🎉 Celebrate Every Moment in Style'}
                            {category.id === 'animal' && '🐾 Wild, Cute & Everything Nature'}
                            {category.id === 'couple' && '💕 Love Stories, Eternal Memories'}
                            {category.id === 'anime' && '⚡ Unleash Your Inner Otaku Power'}
                          </p>
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleAddProduct(category.id)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl font-bold text-xs transition-all shadow-lg"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="hidden md:inline">Add Product</span>
                          <span className="md:hidden">Add</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Category Products Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                    {categoryProducts.map((badge) => (
                      <div
                        key={badge.id}
                        className="group bg-[#0b1320] rounded-[20px] sm:rounded-[28px] border-2 border-yellow-500/30 shadow-[0_18px_50px_rgba(15,23,42,0.45)] hover:shadow-[0_26px_70px_rgba(245,158,11,0.25)] transition-all duration-300 hover:-translate-y-2 hover:border-yellow-400/60 p-3 sm:p-4 md:p-5 flex flex-col"
                      >
                        <Link to={`/badge/${badge.id}`} className="w-full">
                          <div className="relative w-full aspect-square rounded-xl sm:rounded-2xl bg-white flex items-center justify-center mb-3 sm:mb-4 overflow-hidden border-[4px] sm:border-[6px] border-slate-900/70 shadow-inner">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.06),transparent_65%)]" />
                            <img
                              src={badge.image}
                              alt={badge.name}
                              className="relative w-[125%] h-[125%] object-contain drop-shadow-[0_25px_45px_rgba(0,0,0,0.28)] transition-transform duration-500 group-hover:scale-[1.06]"
                              onError={(e) => {
                                console.log('Image failed to load:', badge.image);
                                const target = e.currentTarget;
                                // Try with absolute path if relative failed
                                if (!target.src.startsWith('http') && !target.dataset.retried) {
                                  target.dataset.retried = 'true';
                                  const cleanPath = badge.image.startsWith('/') ? badge.image.substring(1) : badge.image;
                                  target.src = `/${cleanPath}`;
                                } else {
                                  target.style.display = 'none';
                                }
                              }}
                            />
                          </div>
                        </Link>

                        <div className="flex items-center justify-between mb-1.5 sm:mb-2 gap-2">
                          <span className="text-[9px] sm:text-[10px] md:text-[11px] font-semibold tracking-[0.2em] sm:tracking-[0.3em] text-yellow-400 uppercase truncate">
                            {badge.category}
                          </span>
                          <span className="text-lg sm:text-xl md:text-2xl font-black text-white whitespace-nowrap">
                            {formatPrice(badge.price)}
                          </span>
                        </div>

                        <h3 className="text-[13px] sm:text-[14px] md:text-[15px] font-extrabold text-white uppercase leading-snug mb-1.5 sm:mb-2">
                          {badge.name}
                        </h3>

                        {badge.tagline && (
                          <p className="text-[10px] sm:text-[11px] text-yellow-200/80 italic mb-2 sm:mb-3 line-clamp-2">
                            {badge.tagline}
                          </p>
                        )}

                        <button
                          onClick={() => addToCart(badge)}
                          className="mt-auto w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 text-[11px] sm:text-[12px] font-black tracking-[0.15em] sm:tracking-[0.22em] uppercase hover:from-amber-400 hover:to-orange-400 hover:shadow-lg hover:shadow-yellow-500/20 transition-all duration-300 active:scale-95"
                        >
                          Buy Now
                        </button>
                      </div>
                    ))}
                    {isAdmin && category.id === 'positive-vibes' && (
                      <button
                        onClick={() => handleAddProduct('positive-vibes')}
                        className="group rounded-[28px] border-2 border-dashed border-yellow-400/50 bg-white/80 hover:bg-white transition-all duration-300 p-5 flex flex-col items-center justify-center min-h-[320px]"
                      >
                        <div className="w-16 h-16 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center text-3xl font-black mb-4">
                          +
                        </div>
                        <p className="text-slate-800 font-extrabold uppercase tracking-wide text-sm">Add Positive Vibes</p>
                        <p className="text-slate-500 text-xs mt-2">Create a new badge</p>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Show single category with Add button
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-5xl">{CATEGORIES.find(c => c.id === activeCategory)?.icon}</span>
                  <div>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 uppercase tracking-tight">
                      {currentCategoryName}
                    </h2>
                    <p className="text-sm md:text-base text-slate-600 font-semibold mt-1">
                      {activeCategory === 'moody' && '😊 Express Your Mood, Wear Your Vibe'}
                      {activeCategory === 'positive-vibes' && '✨ Spark Joy, Spread Positivity'}
                      {activeCategory === 'sports' && '🏆 Fuel Your Passion, Show Your Game'}
                      {activeCategory === 'religious' && '🙏 Faith & Devotion in Every Design'}
                      {activeCategory === 'entertainment' && '🎬 Pop Culture & Entertainment Icons'}
                      {activeCategory === 'events' && '🎉 Celebrate Every Moment in Style'}
                      {activeCategory === 'animal' && '🐾 Wild, Cute & Everything Nature'}
                      {activeCategory === 'couple' && '💕 Love Stories, Eternal Memories'}
                      {activeCategory === 'anime' && '⚡ Unleash Your Inner Otaku Power'}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleAddProduct()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl font-bold text-xs transition-all shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden md:inline">Add Product</span>
                    <span className="md:hidden">Add</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
              {filteredBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="group bg-[#0b1320] rounded-[20px] sm:rounded-[28px] border-2 border-yellow-500/30 shadow-[0_18px_50px_rgba(15,23,42,0.45)] hover:shadow-[0_26px_70px_rgba(245,158,11,0.25)] transition-all duration-300 hover:-translate-y-2 hover:border-yellow-400/60 p-3 sm:p-4 md:p-5 flex flex-col"
                >
                  {/* PREMIUM BADGE STAGE */}
                  <Link to={`/badge/${badge.id}`} className="w-full">
                    <div className="relative w-full aspect-square rounded-xl sm:rounded-2xl bg-white flex items-center justify-center mb-3 sm:mb-4 overflow-hidden border-[4px] sm:border-[6px] border-slate-900/70 shadow-inner">
                      {/* soft halo */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.06),transparent_65%)]" />
                      <img
                        src={badge.image}
                        alt={badge.name}
                        className="relative w-[125%] h-[125%] object-contain drop-shadow-[0_25px_45px_rgba(0,0,0,0.28)] transition-transform duration-500 group-hover:scale-[1.06]"
                        onError={(e) => {
                          console.log('Image failed to load:', badge.image);
                            const target = e.currentTarget;
                            // Try with absolute path if relative failed
                            if (!target.src.startsWith('http') && !target.dataset.retried) {
                              target.dataset.retried = 'true';
                              const cleanPath = badge.image.startsWith('/') ? badge.image.substring(1) : badge.image;
                              target.src = `/${cleanPath}`;
                            } else {
                              target.style.display = 'none';
                            }
                        }}
                      />
                    </div>
                  </Link>

                  <div className="flex items-center justify-between mb-1.5 sm:mb-2 gap-2">
                    <span className="text-[9px] sm:text-[10px] md:text-[11px] font-semibold tracking-[0.2em] sm:tracking-[0.3em] text-yellow-400 uppercase truncate">
                      {badge.category}
                    </span>
                    <span className="text-lg sm:text-xl md:text-2xl font-black text-white whitespace-nowrap">
                      {formatPrice(badge.price)}
                    </span>
                  </div>

                  <h3 className="text-[13px] sm:text-[14px] md:text-[15px] font-extrabold text-white uppercase leading-snug mb-1.5 sm:mb-2">
                    {badge.name}
                  </h3>

                  {badge.tagline && (
                    <p className="text-[10px] sm:text-[11px] text-yellow-200/80 italic mb-2 sm:mb-3 line-clamp-2">
                      {badge.tagline}
                    </p>
                  )}

                  {viewType === 'list' && (
                    <p className="text-slate-300 mt-2 mb-8 text-xl leading-relaxed font-medium">
                      {badge.details}
                    </p>
                  )}

                  {/* CTA */}
                  <button
                    onClick={() => addToCart(badge)}
                    className="mt-auto w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 text-[11px] sm:text-[12px] font-black tracking-[0.15em] sm:tracking-[0.22em] uppercase hover:from-amber-400 hover:to-orange-400 hover:shadow-lg hover:shadow-yellow-500/20 transition-all duration-300 active:scale-95"
                  >
                    Buy Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && filteredBadges.length === 0 && (
          <div className="py-40 text-center">
            <div className="w-40 h-40 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-10 border border-slate-100">
              <span className="text-6xl opacity-40">🔍</span>
            </div>
            <h3 className="text-4xl font-black text-[#1e1b4b] uppercase">No badges found</h3>
            <p className="text-slate-400 mt-4 text-xl max-w-sm mx-auto font-medium">Try selecting a different category from the filter menu.</p>
          </div>
        )}
        </main>
      </div>
    </div>
  );
}
