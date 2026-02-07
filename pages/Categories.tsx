
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
      category: p.category.toLowerCase(),
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
    const categoryMap: Record<string, 'Moody' | 'Sports' | 'Religious' | 'Entertainment' | 'Events' | 'Animal' | 'Couple' | 'Anime' | 'Custom'> = {
      'moody': 'Moody',
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
        <div className="absolute -top-64 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-yellow-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-[-300px] w-[600px] h-[600px] bg-orange-400/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-[-200px] w-[500px] h-[500px] bg-red-400/10 rounded-full blur-[100px]" />
        <div className="absolute top-28 -left-8 w-24 h-24 rounded-full border-[8px] border-yellow-400/30 animate-bounce" style={{ animationDuration: '4s' }} />
        <div className="absolute top-52 -right-10 w-28 h-28 rounded-full border-[10px] border-orange-400/25 animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute bottom-36 -left-12 w-32 h-32 rounded-full border-[8px] border-red-400/20 animate-bounce" style={{ animationDuration: '5s', animationDelay: '1s' }} />
        <div className="absolute bottom-64 -right-8 w-20 h-20 rounded-full border-[6px] border-yellow-500/35 animate-pulse" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />
      </div>

      <div className="relative z-10 max-w-full mx-auto px-4 sm:px-6 lg:px-12 pt-24">
       <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center md:gap-6 mb-8 md:mb-10">

       <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900">
  Explore the Collection
</h1>

{/* <p className="mt-2 text-lg text-slate-500 max-w-xl">
  Hand-picked badge designs crafted to match every mood and moment.
</p> */}


          
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

            <div className="relative" ref={filterPanelRef}>
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 md:gap-4 font-black px-4 md:px-8 py-3 md:py-4 rounded-[1.5rem] border transition-all text-xs md:text-sm ${
                  isFilterOpen 
                  ? 'bg-slate-50 border-slate-200 text-blue-600' 
                  : 'bg-white border-slate-100 text-slate-700 hover:border-slate-200'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="uppercase tracking-widest text-[9px] md:text-[10px]">Filter: <span className="text-blue-600 truncate">{currentCategoryName}</span></span>
              </button>

              {isFilterOpen && (
                <div className="absolute left-0 md:left-auto md:right-0 mt-3 md:mt-4 w-full sm:w-72 bg-white rounded-[2rem] shadow-[0_30px_70px_rgba(0,0,0,0.12)] border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-3 space-y-1">
                    <button 
                      onClick={() => handleCategorySelect('all')}
                      className={`w-full flex items-center justify-between px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
                        activeCategory === 'all' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      All Badges
                      {activeCategory === 'all' && <Check className="w-4 h-4" />}
                    </button>
                    <div className="h-px bg-slate-100 mx-6 my-2"></div>
                    {CATEGORIES.map(cat => (
                      <button 
                        key={cat.id}
                        onClick={() => handleCategorySelect(cat.id)}
                        className={`w-full flex items-center justify-between px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
                          activeCategory === cat.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {cat.name}
                        {activeCategory === cat.id && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <button 
                onClick={() => setViewType('grid')}
                className={`p-3 rounded-xl transition-all ${viewType === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Grid2X2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setViewType('list')}
                className={`p-3 rounded-xl transition-all ${viewType === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div> */}
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
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 uppercase tracking-tight">
                      {category.icon} {category.name}
                    </h2>
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

                  {/* Category Products Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                    {categoryProducts.map((badge) => (
                      <div
                        key={badge.id}
                        className="group bg-[#0b1320] rounded-[28px] border-2 border-yellow-500/30 shadow-[0_18px_50px_rgba(15,23,42,0.45)] hover:shadow-[0_26px_70px_rgba(245,158,11,0.25)] transition-all duration-300 hover:-translate-y-2 hover:border-yellow-400/60 p-4 md:p-5 flex flex-col"
                      >
                        <Link to={`/badge/${badge.id}`} className="w-full">
                          <div className="relative w-full aspect-square rounded-2xl bg-white flex items-center justify-center mb-4 overflow-hidden border-[6px] border-slate-900/70 shadow-inner">
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

                        <div className="flex items-center justify-between mb-2 gap-2">
                          <span className="text-[10px] md:text-[11px] font-semibold tracking-[0.3em] text-yellow-400 uppercase truncate">
                            {badge.category}
                          </span>
                          <span className="text-xl md:text-2xl font-black text-white whitespace-nowrap">
                            {formatPrice(badge.price)}
                          </span>
                        </div>

                        <h3 className="text-[14px] md:text-[15px] font-extrabold text-white uppercase leading-snug mb-2">
                          {badge.name}
                        </h3>

                        {badge.tagline && (
                          <p className="text-[11px] text-yellow-200/80 italic mb-3 line-clamp-2">
                            {badge.tagline}
                          </p>
                        )}

                        <div className="my-2 h-px w-full bg-yellow-500/25" />

                        <button
                          onClick={() => addToCart(badge)}
                          className="mt-auto w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 text-[12px] font-black tracking-[0.22em] uppercase hover:from-amber-400 hover:to-orange-400 hover:shadow-lg hover:shadow-yellow-500/20 transition-all duration-300 active:scale-95"
                        >
                          Buy Now
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Show single category with Add button
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 uppercase tracking-tight">
                {CATEGORIES.find(c => c.id === activeCategory)?.icon} {currentCategoryName}
              </h2>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {filteredBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="group bg-[#0b1320] rounded-[28px] border-2 border-yellow-500/30 shadow-[0_18px_50px_rgba(15,23,42,0.45)] hover:shadow-[0_26px_70px_rgba(245,158,11,0.25)] transition-all duration-300 hover:-translate-y-2 hover:border-yellow-400/60 p-4 md:p-5 flex flex-col"
                >
                  {/* PREMIUM BADGE STAGE */}
                  <Link to={`/badge/${badge.id}`} className="w-full">
                    <div className="relative w-full aspect-square rounded-2xl bg-white flex items-center justify-center mb-4 overflow-hidden border-[6px] border-slate-900/70 shadow-inner">
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

                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="text-[10px] md:text-[11px] font-semibold tracking-[0.3em] text-yellow-400 uppercase truncate">
                      {badge.category}
                    </span>
                    <span className="text-xl md:text-2xl font-black text-white whitespace-nowrap">
                      {formatPrice(badge.price)}
                    </span>
                  </div>

                  <h3 className="text-[14px] md:text-[15px] font-extrabold text-white uppercase leading-snug mb-2">
                    {badge.name}
                  </h3>

                  {badge.tagline && (
                    <p className="text-[11px] text-yellow-200/80 italic mb-3 line-clamp-2">
                      {badge.tagline}
                    </p>
                  )}

                  {/* DIVIDER */}
                  <div className="my-2 h-px w-full bg-yellow-500/25" />

                  {viewType === 'list' && (
                    <p className="text-slate-300 mt-2 mb-8 text-xl leading-relaxed font-medium">
                      {badge.details}
                    </p>
                  )}

                  {/* CTA */}
                  <button
                    onClick={() => addToCart(badge)}
                    className="mt-auto w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 text-[12px] font-black tracking-[0.22em] uppercase hover:from-amber-400 hover:to-orange-400 hover:shadow-lg hover:shadow-yellow-500/20 transition-all duration-300 active:scale-95"
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
      </div>
    </div>
  );
}
