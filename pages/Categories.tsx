
import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { BADGES, CATEGORIES, formatPrice } from '../constants';
import { Badge } from '../types';
import { Plus, SlidersHorizontal, Grid2X2, List, Check, ShoppingCart } from 'lucide-react';
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
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const handleImageLoad = (badgeId: string) => {
    setLoadedImages(prev => new Set(prev).add(badgeId));
  };
  
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
        // Request all products with limit=100 for better performance
        const res = await fetch(`${API_BASE_URL}/api/products?limit=100&all=true`);
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
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50/30 to-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-yellow-500/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-[-200px] w-[600px] h-[600px] bg-orange-400/6 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 left-[-200px] w-[500px] h-[500px] bg-red-400/5 rounded-full blur-[90px]" />
      </div>

      {/* Floating Badge Decorations */}
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
              All Badges
              {activeCategory === 'all' && <Check className="w-5 h-5" />}
            </button>
            
            <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent my-3"></div>

            <div className="flex flex-col flex-1 justify-between gap-2 pb-2">
              {CATEGORIES.map(cat => (
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
                Explore the Collection
              </h1>
              <p className="text-slate-600 text-sm md:text-base font-semibold mt-2">
                Discover unique badges that speak your style
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
                  className={`flex items-center gap-2 font-black px-4 md:px-6 py-2.5 md:py-3 rounded-xl shadow-sm transition-all text-xs border-2 ${
                    isFilterOpen 
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 border-black text-slate-900 shadow-[4px_4px_0px_#000]' 
                    : 'bg-white border-slate-200 text-slate-700 hover:border-yellow-500/50'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="uppercase tracking-wide">Filter: <span className="text-orange-700 truncate">{currentCategoryName}</span></span>
                </button>

                {isFilterOpen && (
                  <div className="absolute left-0 md:left-auto md:right-0 mt-3 w-full sm:w-72 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-2 border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-3 space-y-1.5">
                      <button 
                        onClick={() => handleCategorySelect('all')}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wide transition-all shadow-sm border-2 ${
                          activeCategory === 'all' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 border-black shadow-[3px_3px_0px_#000]' : 'text-slate-700 hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        All Badges
                        {activeCategory === 'all' && <Check className="w-4 h-4" />}
                      </button>
                      <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent my-2"></div>
                      {CATEGORIES.map(cat => (
                        <button 
                          key={cat.id}
                          onClick={() => handleCategorySelect(cat.id)}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wide transition-all shadow-sm border-2 ${
                            activeCategory === cat.id ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 border-black shadow-[3px_3px_0px_#000]' : 'text-slate-700 hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-sm">{cat.icon}</span>
                            <span className="truncate">{cat.name}</span>
                          </span>
                          {activeCategory === cat.id && <Check className="w-4 h-4" />}
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
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-gradient-to-r from-yellow-500 to-orange-500"></div>
            <p className="mt-6 text-slate-700 font-black text-lg uppercase tracking-wide">Loading products...</p>
          </div>
        ) : activeCategory === 'all' ? (
          // Show all categories with sections
          <div className="space-y-12">
            {CATEGORIES.map((category) => {
              const categoryProducts = productsByCategory[category.id] || [];
              if (categoryProducts.length === 0) return null;

              return (
                <div key={category.id} className="space-y-4">
                  {/* Category Header with Add Button */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-500/30 flex items-center justify-center">
                          <span className="text-3xl">{category.icon}</span>
                        </div>
                        <div>
                          <h2 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent uppercase tracking-tight">
                            {category.name}
                          </h2>
                          <p className="text-xs md:text-sm text-slate-600 font-semibold mt-1">
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
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                    {categoryProducts.map((badge) => (
                      <div
                        key={badge.id}
                        className="group bg-[#0b1320] rounded-[20px] sm:rounded-[24px] border-2 border-yellow-500/30 shadow-[0_18px_50px_rgba(15,23,42,0.45)] hover:shadow-[0_26px_70px_rgba(245,158,11,0.25)] transition-all duration-300 hover:-translate-y-2 hover:border-yellow-400/60 p-3 sm:p-4 md:p-5 flex flex-col"
                      >
                        <Link to={`/badge/${badge.id}`} className="w-full">
                          <div className="relative w-full aspect-square rounded-xl sm:rounded-2xl bg-white flex items-center justify-center mb-3 overflow-hidden border-[3px] sm:border-[4px] border-slate-900/70 shadow-inner">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.06),transparent_65%)]" />
                            
                            {!loadedImages.has(badge.id) && (
                              <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 animate-pulse" />
                            )}
                            
                            <img
                              src={badge.image}
                              alt={badge.name}
                              loading="lazy"
                              decoding="async"
                              className={`relative w-[110%] h-[110%] sm:w-[120%] sm:h-[120%] object-contain drop-shadow-[0_25px_45px_rgba(0,0,0,0.28)] transition-all duration-500 group-hover:scale-[1.06] ${
                                loadedImages.has(badge.id) ? 'opacity-100' : 'opacity-0'
                              }`}
                              onLoad={() => handleImageLoad(badge.id)}
                              onError={(e) => {
                                const target = e.currentTarget;
                                if (!target.src.startsWith('http') && !target.dataset.retried) {
                                  target.dataset.retried = 'true';
                                  const cleanPath = badge.image.startsWith('/') ? badge.image.substring(1) : badge.image;
                                  target.src = `/${cleanPath}`;
                                } else {
                                  target.style.display = 'none';
                                  handleImageLoad(badge.id);
                                }
                              }}
                            />
                          </div>
                        </Link>

                        <div className="flex items-center justify-between mb-2 gap-2">
                          <span className="text-[9px] sm:text-[10px] font-semibold tracking-[0.15em] sm:tracking-[0.2em] text-yellow-400 uppercase truncate">
                            {badge.category}
                          </span>
                          <span className="text-base sm:text-lg md:text-xl font-black text-white whitespace-nowrap">
                            {formatPrice(badge.price)}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-1.5 mb-3">
                          <h3 className="text-[11px] sm:text-[13px] md:text-[14px] font-extrabold text-white uppercase leading-tight flex-1 line-clamp-2">
                            {badge.name}
                          </h3>
                          
                          <div className="flex items-center gap-0.5 bg-slate-800 rounded-md p-0.5 sm:p-1 flex-shrink-0">
                            <button
                              onClick={() => addToCart({ ...badge, quantity: -1 })}
                              className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded flex items-center justify-center text-yellow-400 hover:bg-slate-700 transition text-[8px] sm:text-[9px] md:text-xs font-black"
                            >
                              −
                            </button>
                            <span className="w-3 sm:w-4 text-center text-white text-[8px] sm:text-[9px] md:text-xs font-black">1</span>
                            <button
                              onClick={() => addToCart({ ...badge, quantity: 1 })}
                              className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded flex items-center justify-center text-yellow-400 hover:bg-slate-700 transition text-[8px] sm:text-[9px] md:text-xs font-black"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="mt-auto">
                          <div className="flex flex-row items-center gap-2">
                            <button
                              onClick={() => addToCart({ ...badge, quantity: 1 })}
                              className="flex-1 py-2 sm:py-2.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 font-black hover:from-amber-400 hover:to-orange-400 hover:shadow-lg hover:shadow-yellow-500/20 transition-all duration-300 active:scale-95 flex items-center justify-center gap-1"
                              title="Add to cart"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span className="text-[9px] sm:text-xs font-black">ADD</span>
                            </button>

                            <Link
                              to={`/badge/${badge.id}`}
                              className="flex-1 py-2 sm:py-2.5 rounded-md border-2 border-yellow-400/50 text-yellow-200 text-[9px] sm:text-xs font-black tracking-[0.12em] hover:bg-yellow-400/10 hover:border-yellow-300 transition-all duration-300 active:scale-95 flex items-center justify-center"
                            >
                              Buy Now
                            </Link>
                          </div>
                        </div>
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
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-500/30 flex items-center justify-center">
                    <span className="text-3xl">{CATEGORIES.find(c => c.id === activeCategory)?.icon}</span>
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent uppercase tracking-tight">
                      {currentCategoryName}
                    </h2>
                    <p className="text-xs md:text-sm text-slate-600 font-semibold mt-1">
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

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {filteredBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="group bg-[#0b1320] rounded-[20px] sm:rounded-[24px] border-2 border-yellow-500/30 shadow-[0_18px_50px_rgba(15,23,42,0.45)] hover:shadow-[0_26px_70px_rgba(245,158,11,0.25)] transition-all duration-300 hover:-translate-y-2 hover:border-yellow-400/60 p-3 sm:p-4 md:p-5 flex flex-col"
                >
                  <Link to={`/badge/${badge.id}`} className="w-full">
                    <div className="relative w-full aspect-square rounded-xl sm:rounded-2xl bg-white flex items-center justify-center mb-3 overflow-hidden border-[3px] sm:border-[4px] border-slate-900/70 shadow-inner">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.06),transparent_65%)]" />
                      
                      {!loadedImages.has(badge.id) && (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 animate-pulse" />
                      )}
                      
                      <img
                        src={badge.image}
                        alt={badge.name}
                        loading="lazy"
                        decoding="async"
                        className={`relative w-[110%] h-[110%] sm:w-[120%] sm:h-[120%] object-contain drop-shadow-[0_25px_45px_rgba(0,0,0,0.28)] transition-all duration-500 group-hover:scale-[1.06] ${
                          loadedImages.has(badge.id) ? 'opacity-100' : 'opacity-0'
                        }`}
                        onLoad={() => handleImageLoad(badge.id)}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.startsWith('http') && !target.dataset.retried) {
                            target.dataset.retried = 'true';
                            const cleanPath = badge.image.startsWith('/') ? badge.image.substring(1) : badge.image;
                            target.src = `/${cleanPath}`;
                          } else {
                            target.style.display = 'none';
                            handleImageLoad(badge.id);
                          }
                        }}
                      />
                    </div>
                  </Link>

                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="text-[9px] sm:text-[10px] font-semibold tracking-[0.15em] sm:tracking-[0.2em] text-yellow-400 uppercase truncate">
                      {badge.category}
                    </span>
                    <span className="text-base sm:text-lg md:text-xl font-black text-white whitespace-nowrap">
                      {formatPrice(badge.price)}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-1.5 mb-3">
                    <h3 className="text-[11px] sm:text-[13px] md:text-[14px] font-extrabold text-white uppercase leading-tight flex-1 line-clamp-2">
                      {badge.name}
                    </h3>
                    
                    <div className="flex items-center gap-0.5 bg-slate-800 rounded-md p-0.5 sm:p-1 flex-shrink-0">
                      <button
                        onClick={() => addToCart({ ...badge, quantity: -1 })}
                        className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded flex items-center justify-center text-yellow-400 hover:bg-slate-700 transition text-[8px] sm:text-[9px] md:text-xs font-black"
                      >
                        −
                      </button>
                      <span className="w-3 sm:w-4 text-center text-white text-[8px] sm:text-[9px] md:text-xs font-black">1</span>
                      <button
                        onClick={() => addToCart({ ...badge, quantity: 1 })}
                        className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded flex items-center justify-center text-yellow-400 hover:bg-slate-700 transition text-[8px] sm:text-[9px] md:text-xs font-black"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div className="flex flex-row items-center gap-2">
                      <button
                        onClick={() => addToCart({ ...badge, quantity: 1 })}
                        className="flex-1 py-2 sm:py-2.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 font-black hover:from-amber-400 hover:to-orange-400 hover:shadow-lg hover:shadow-yellow-500/20 transition-all duration-300 active:scale-95 flex items-center justify-center gap-1"
                        title="Add to cart"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span className="text-[9px] sm:text-xs font-black">ADD</span>
                      </button>

                      <Link
                        to={`/badge/${badge.id}`}
                        className="flex-1 py-2 sm:py-2.5 rounded-md border-2 border-yellow-400/50 text-yellow-200 text-[9px] sm:text-xs font-black tracking-[0.12em] hover:bg-yellow-400/10 hover:border-yellow-300 transition-all duration-300 active:scale-95 flex items-center justify-center"
                      >
                        Buy Now
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && filteredBadges.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-32 h-32 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-yellow-500/30">
              <span className="text-6xl">🔍</span>
            </div>
            <h3 className="text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent uppercase">No badges found</h3>
            <p className="text-slate-600 mt-3 text-base max-w-sm mx-auto font-semibold">Try selecting a different category from the filter menu.</p>
          </div>
        )}
        </main>
      </div>
    </div>
  );
}
