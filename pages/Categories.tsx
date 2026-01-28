
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

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/products`);
        if (res.ok) {
          const data = await res.json();
          // Map API products to Badge format
          const mappedProducts: Badge[] = data.map((p: any) => ({
            id: p._id,
            name: p.name,
            category: p.category.toLowerCase(),
            price: p.price,
            image: p.image,
            description: p.description,
          }));
          setProducts(mappedProducts);
        } else {
          // Fallback to static badges if API fails
          setProducts(BADGES);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        // Fallback to static badges
        setProducts(BADGES);
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
    acc[cat.id] = products.filter(p => p.category === cat.id);
    return acc;
  }, {} as Record<string, Badge[]>);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.04),_transparent_60%),linear-gradient(to_bottom,#fafbff,#ffffff)]">


      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-12 pt-24">
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
                onClick={handleAddProduct}
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
                        className="group bg-white rounded-[22px] border border-slate-100 shadow-[0_8px_30px_rgba(15,23,42,0.06)] hover:shadow-[0_30px_80px_rgba(15,23,42,0.12)] transition-all duration-500 p-3 md:p-4 flex flex-col"
                      >
                        <Link to={`/badge/${badge.id}`} className="w-full">
                          <div className="relative w-full aspect-square rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center mb-4 overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.06),transparent_65%)]" />
                            <img
                              src={badge.image}
                              alt={badge.name}
                              className="relative w-[125%] h-[125%] object-contain drop-shadow-[0_25px_45px_rgba(0,0,0,0.28)] transition-transform duration-500 group-hover:scale-[1.06]"
                            />
                          </div>
                        </Link>

                        <div className="flex items-center justify-between mb-1 gap-2">
                          <span className="text-[9px] md:text-[11px] font-semibold tracking-widest text-blue-600 uppercase truncate">
                            {badge.category}
                          </span>
                          <span className="text-base md:text-lg font-extrabold text-slate-900 whitespace-nowrap">
                            {formatPrice(badge.price)}
                          </span>
                        </div>

                        <h3 className="text-[13px] md:text-[15px] font-extrabold text-slate-900 uppercase leading-snug mb-3">
                          {badge.name}
                        </h3>

                        <div className="my-3 h-px w-full bg-slate-100" />

                        <button
                          onClick={() => addToCart(badge)}
                          className="mt-auto w-full py-3 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white text-[11px] font-bold tracking-[0.22em] uppercase hover:from-blue-600 hover:to-blue-700 transition-all duration-300 active:scale-95"
                        >
                          Add to Cart
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
  className="
    group
    bg-white
    rounded-[22px]
    border border-slate-100
    shadow-[0_8px_30px_rgba(15,23,42,0.06)]
    hover:shadow-[0_30px_80px_rgba(15,23,42,0.12)]
    transition-all duration-500
    p-3 md:p-4
    flex flex-col
  "
>
 {/* PREMIUM BADGE STAGE */}
  <Link to={`/badge/${badge.id}`} className="w-full">
   <div
  className="
    relative
    w-full
    aspect-square
    rounded-2xl
    bg-gradient-to-br from-slate-50 via-white to-slate-50
    flex items-center justify-center
    mb-4
    overflow-hidden
  "
>

      {/* soft halo */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.06),transparent_65%)]" />

     <img
  src={badge.image}
  alt={badge.name}
  className="
    relative
    w-[125%]
    h-[125%]
    object-contain
    drop-shadow-[0_25px_45px_rgba(0,0,0,0.28)]
    transition-transform duration-500
    group-hover:scale-[1.06]
  "
/>

    </div>
  </Link>


              
              {/* <div className="flex-1 flex flex-col"> */}
           <div className="flex items-center justify-between mb-1 gap-2">
    <span className="text-[9px] md:text-[11px] font-semibold tracking-widest text-blue-600 uppercase truncate">
      {badge.category}
    </span>
    <span className="text-base md:text-lg font-extrabold text-slate-900 whitespace-nowrap">
      {formatPrice(badge.price)}
    </span>
  </div>

    {/* TITLE */}
   {/* TITLE */}
  <h3 className="text-[13px] md:text-[15px] font-extrabold text-slate-900 uppercase leading-snug mb-3">
    {badge.name}
  </h3>


  {/* DIVIDER */}
  <div className="my-3 h-px w-full bg-slate-100" />

                {viewType === 'list' && (
                  <p className="text-slate-500 mt-2 mb-8 text-xl leading-relaxed font-medium">
                    {badge.details}
                  </p>
                )}

                 {/* CTA */}
  {/* CTA */}
 <button
    onClick={() => addToCart(badge)}
    className="
      mt-auto
      w-full
      py-3
      rounded-xl
      bg-gradient-to-r from-slate-900 to-slate-800
      text-white
      text-[11px]
      font-bold
      tracking-[0.22em]
      uppercase
      hover:from-blue-600 hover:to-blue-700
      transition-all duration-300
      active:scale-95
    "
  >
    Add to Cart
  </button>
              {/* </div> */}
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
