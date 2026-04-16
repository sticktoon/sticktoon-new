
import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, Link, useNavigate, useParams } from 'react-router-dom';
import { BADGES, CATEGORIES, formatPrice } from '../constants';
import { Badge } from '../types';
import { Plus, SlidersHorizontal, Check, ShoppingCart, Crown, Package, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

interface CategoriesProps {
  addToCart: (badge: Badge) => void;
  user?: any;
}

const CUSTOM_COMBO_SIZE = 4;
const CUSTOM_COMBO_PRICE = 149;

const PRODUCTS_FETCH_VERSION = 'subcat-v1';
const PRODUCTS_CACHE_KEY = `sticktoon-products-cache-${PRODUCTS_FETCH_VERSION}`;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
type ProductsCacheRecord = { data: Badge[]; timestamp: number };
let productsMemoryCache: ProductsCacheRecord | null = null;

const normalizeCategoryId = (value?: string) => {
  if (!value) return '';
  const normalized = value.toString().trim().toLowerCase().replace(/\s+/g, '-');

  if (normalized === 'animal') return 'pet';
  if (normalized === 'positive-vibe') return 'positive-vibes';

  return normalized;
};

const slugifySubcategory = (value?: string) => {
  if (!value) return '';
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const matchesSubcategorySlug = (subcategory?: string, slug?: string) => {
  if (!subcategory || !slug) return false;
  return slugifySubcategory(subcategory) === slug;
};

const buildSubcategoryRoute = (categoryId: string, subcategory?: string) => {
  const normalizedCategory = normalizeCategoryId(categoryId);
  const subcategorySlug = slugifySubcategory(subcategory);

  if (!normalizedCategory || !subcategorySlug) return '/categories';
  return `/categories/${normalizedCategory}/${subcategorySlug}`;
};

// Premium Badge Card Component (matching sticker card style)
function BadgeCard({ badge, addToCart, index }: { badge: Badge; addToCart: (b: Badge) => void; index: number }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart({ ...badge, quantity: 1 });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div
      className="group relative bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-2
        shadow-[0_1px_6px_rgba(0,0,0,0.05)] hover:shadow-[0_16px_48px_rgba(245,158,11,0.15)]
        border border-slate-200/60 hover:border-yellow-400/50"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Hover glow effect */}
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-yellow-400/0 via-orange-400/0 to-red-400/0 group-hover:from-yellow-400/15 group-hover:via-orange-400/8 group-hover:to-red-400/15 transition-all duration-500 pointer-events-none z-0" />

      {/* Image Container */}
      <Link to={`/badge/${badge.id}`} className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 z-10 block">
        {/* Shimmer loader */}
        {!imgLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-pulse" />
        )}
        <img
          src={badge.image}
          alt={badge.name}
          className={`w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-700 ease-out ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setImgLoaded(true)}
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.startsWith('http') && !target.dataset.retried) {
              target.dataset.retried = 'true';
              const cleanPath = badge.image.startsWith('/') ? badge.image.substring(1) : badge.image;
              target.src = `/${cleanPath}`;
            } else {
              target.style.display = 'none';
              setImgLoaded(true);
            }
          }}
        />
        {/* Overlay gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Featured badge */}
        {badge.isFeatured && (
          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center gap-1 shadow-lg">
            <Sparkles className="w-3 h-3 text-white" />
            <span className="text-[10px] font-black text-white uppercase tracking-wider">Featured</span>
          </div>
        )}

        {/* Quick add button on hover */}
        <button
          onClick={(e) => { e.preventDefault(); handleAdd(); }}
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
      </Link>

      {/* Content */}
      <div className="relative z-10 p-3 sm:p-3.5 flex flex-col flex-1 bg-white">
        {/* Tagline / Category */}
        {badge.tagline ? (
          <p className="text-[9px] sm:text-[10px] font-bold text-orange-600/80 uppercase tracking-widest mb-0.5 truncate">
            {badge.tagline}
          </p>
        ) : (
          <p className="text-[9px] sm:text-[10px] font-bold text-orange-600/80 uppercase tracking-widest mb-0.5 truncate">
            {badge.category}
          </p>
        )}
        {badge.subcategory && (
          <Link
            to={buildSubcategoryRoute(String(badge.category), badge.subcategory)}
            className="inline-flex items-center text-[9px] sm:text-[10px] font-bold text-yellow-700 hover:text-orange-700 transition-colors mb-1"
          >
            #{badge.subcategory}
          </Link>
        )}

        <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 mb-0.5 leading-tight tracking-tight line-clamp-1">
          {badge.name}
        </h3>
        <p className="text-[10px] sm:text-xs text-slate-500 mb-2 line-clamp-1 flex-1 font-medium">
          {badge.details}
        </p>

        {/* Price & Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-black bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              {formatPrice(badge.price)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleAdd}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300
                ${added
                  ? 'bg-green-500 text-white scale-95'
                  : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 hover:shadow-md active:scale-95'
                }`}
            >
              {added ? '✓' : 'Add'}
            </button>
            <Link
              to={`/badge/${badge.id}`}
              className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider border border-slate-200 text-slate-600 hover:border-yellow-400 hover:text-yellow-700 transition-all duration-300"
            >
              View
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Premium Combo Card Component
function ComboCard({ badge, addToCart, index }: { badge: Badge; addToCart: (b: Badge) => void; index: number }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart({ ...badge, quantity: 1 });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div
      className="group relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-2
        shadow-[0_2px_12px_rgba(245,158,11,0.15)] hover:shadow-[0_20px_60px_rgba(245,158,11,0.3)]
        border border-yellow-500/40 hover:border-yellow-400/80"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Combo label */}
      <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full shadow-lg">
        <Package className="w-3 h-3 text-slate-900" />
        <span className="text-[9px] sm:text-[10px] font-black text-slate-900 uppercase tracking-wider">Combo</span>
      </div>

      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400/5 via-transparent to-yellow-400/5 pointer-events-none z-0" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent z-0" />

      {/* Image Container */}
      <Link to={`/badge/${badge.id}`} className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 z-10 block">
        {!imgLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-100 via-amber-50 to-yellow-100 animate-pulse" />
        )}
        <img
          src={badge.image}
          alt={badge.name}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out drop-shadow-[0_4px_12px_rgba(0,0,0,0.25)] ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setImgLoaded(true)}
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.startsWith('http') && !target.dataset.retried) {
              target.dataset.retried = 'true';
              const cleanPath = badge.image.startsWith('/') ? badge.image.substring(1) : badge.image;
              target.src = `/${cleanPath}`;
            } else {
              target.style.display = 'none';
              setImgLoaded(true);
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        {/* Bold border frame */}
        <div className="absolute inset-0 border-[3px] border-yellow-400/30 rounded-sm pointer-events-none" />

        {/* Quick add */}
        <button
          onClick={(e) => { e.preventDefault(); handleAdd(); }}
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
      </Link>

      {/* Content */}
      <div className="relative z-10 p-3 sm:p-3.5 flex flex-col flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <p className="text-[9px] sm:text-[10px] font-bold text-yellow-400/80 uppercase tracking-widest mb-0.5 truncate flex items-center gap-1">
          <Crown className="w-3 h-3" /> COMBO PACK
        </p>

        <h3 className="text-xs sm:text-sm font-extrabold text-white mb-0.5 leading-tight tracking-tight line-clamp-1">
          {badge.name}
        </h3>
        <p className="text-[10px] sm:text-xs text-yellow-200/50 mb-2 line-clamp-1 flex-1 font-medium">
          {badge.details}
        </p>

        {/* Price & Action */}
        <div className="flex items-center justify-between pt-2 border-t border-yellow-500/20">
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-black bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
              {formatPrice(badge.price)}
            </span>
            <span className="text-[8px] sm:text-[9px] text-yellow-500/50 line-through font-semibold">
              {formatPrice(49 * 4)}
            </span>
          </div>
          <button
            onClick={handleAdd}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300
              ${added
                ? 'bg-green-500 text-white scale-95'
                : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 hover:from-yellow-300 hover:to-amber-400 hover:shadow-md hover:shadow-yellow-500/30 active:scale-95'
              }`}
          >
            {added ? '✓' : 'Add Combo'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Categories({ addToCart, user }: CategoriesProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { categoryId: categoryPathParam, subcategory: subcategoryPathParam } =
    useParams<{ categoryId?: string; subcategory?: string }>();
  const catParam = searchParams.get('cat');
  const [activeCategory, setActiveCategory] = useState(
    normalizeCategoryId(categoryPathParam || catParam || 'all') || 'all',
  );
  const [activeSubcategorySlug, setActiveSubcategorySlug] = useState(
    slugifySubcategory(subcategoryPathParam || ''),
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const [comboBuilderCategoryId, setComboBuilderCategoryId] = useState<string | null>(null);
  const [comboSelections, setComboSelections] = useState<Record<string, string[]>>({});
  const [comboFeedback, setComboFeedback] = useState<
    Record<string, { type: 'success' | 'error'; text: string } | null>
  >({});
  
  // Products from database
  const [products, setProducts] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  const normalizeImagePath = (path?: string) => {
    if (!path) return undefined;

    let normalized = String(path).trim();
    if (!normalized) return undefined;
    if (/^https?:\/\//i.test(normalized) || /^data:/i.test(normalized)) {
      return normalized;
    }

    normalized = normalized.replace(/\\/g, '/').replace(/\/+/g, '/');
    const lower = normalized.toLowerCase();

    if (lower.includes('/public/')) {
      normalized = normalized.slice(lower.lastIndexOf('/public/') + '/public'.length);
    } else if (lower.startsWith('public/')) {
      normalized = normalized.slice('public'.length);
    } else if (lower.startsWith('./public/')) {
      normalized = normalized.slice('./public'.length);
    } else if (lower.startsWith('../public/')) {
      normalized = normalized.slice('../public'.length);
    }

    normalized = normalized.replace(/^\.\//, '');

    // Fix common typos: sport -> sports, entert3 -> enter3, animal.jpg -> animal1.png
    normalized = normalized
      .replace(/\/sport([0-9])/g, '/sports$1')
      .replace(/^sport([0-9])/g, 'sports$1')
      .replace(/\/entert3/g, '/enter3')
      .replace(/^entert3/g, 'enter3')
      .replace(/\/animal\.jpg/g, '/animal1.png')
      .replace(/^animal\.jpg/g, 'animal1.png');

    if (!normalized.startsWith('/') && /^(badge|images|sticker)\//i.test(normalized)) {
      normalized = `/${normalized}`;
    }

    if (!normalized.startsWith('/')) {
      normalized = `/badge/${normalized}`;
    }

    return normalized;
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
      subcategory: p.subcategory || p.subCategory || p.sub_category || undefined,
      details: p.description || '',
      color: p.color || 'bg-transparent',
    }));

  const ensureMinimumPerCategory = (items: Badge[], minCount = 4): Badge[] => {
    const normalized = [...items];
    const existingIds = new Set(normalized.map((b) => b.id));

    // Always inject combo badges from static data if not already present
    const comboBadges = BADGES.filter((b) => b.isCombo && !existingIds.has(b.id));
    normalized.push(...comboBadges);
    comboBadges.forEach((b) => existingIds.add(b.id));

    const byCategory = CATEGORIES.reduce((acc, cat) => {
      acc[cat.id] = normalized.filter(
        (p) => normalizeCategoryId(String(p.category)) === normalizeCategoryId(cat.id),
      );
      return acc;
    }, {} as Record<string, Badge[]>);

    CATEGORIES.forEach((cat) => {
      const current = byCategory[cat.id] || [];
      if (current.length >= minCount) return;

      const fallback = BADGES.filter(
        (b) => normalizeCategoryId(String(b.category)) === normalizeCategoryId(cat.id),
      );
      const needed = minCount - current.length;
      const toAdd = fallback.filter((b) => !existingIds.has(b.id)).slice(0, needed);
      normalized.push(...toAdd);
      toAdd.forEach((b) => existingIds.add(b.id));
    });

    return normalized;
  };

  // Fetch products from API with caching
  useEffect(() => {
    const fetchProducts = async () => {
      const now = Date.now();

      // Check cache first
      if (productsMemoryCache && now - productsMemoryCache.timestamp < CACHE_TTL) {
        setProducts(productsMemoryCache.data);
        setLoading(false);
        return;
      }

      try {
        const cachedSessionData = sessionStorage.getItem(PRODUCTS_CACHE_KEY);
        if (cachedSessionData) {
          const parsedCache = JSON.parse(cachedSessionData) as ProductsCacheRecord;
          if (parsedCache?.data?.length && now - parsedCache.timestamp < CACHE_TTL) {
            productsMemoryCache = parsedCache;
            setProducts(parsedCache.data);
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to read product cache', error);
      }

      // Show static badges immediately while fetching from API
      if (products.length === 0) {
        setProducts(ensureMinimumPerCategory(BADGES));
      }

      try {
        setLoading(true);
        const res = await fetch(
          `${API_BASE_URL}/api/products?limit=100&all=true&v=${PRODUCTS_FETCH_VERSION}`,
          { cache: 'no-store' },
        );
        if (res.ok) {
          const data = await res.json();
          const apiItems = Array.isArray(data) ? data : data.products || [];
          const mappedProducts = mapApiProductsToBadges(apiItems);
          const finalProducts = ensureMinimumPerCategory(mappedProducts);
          setProducts(finalProducts);
          // Cache result for fast revisits.
          const nextCache: ProductsCacheRecord = {
            data: finalProducts,
            timestamp: Date.now(),
          };
          productsMemoryCache = nextCache;
          sessionStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(nextCache));
        } else {
          setProducts(ensureMinimumPerCategory(BADGES));
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        setProducts(ensureMinimumPerCategory(BADGES));
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []); // Empty dependency array - fetch once on mount

  useEffect(() => {
    if (categoryPathParam && subcategoryPathParam) {
      setActiveCategory(normalizeCategoryId(categoryPathParam) || 'all');
      setActiveSubcategorySlug(slugifySubcategory(subcategoryPathParam));
      return;
    }

    setActiveSubcategorySlug('');
    if (catParam) {
      setActiveCategory(normalizeCategoryId(catParam) || 'all');
    } else {
      setActiveCategory('all');
    }
  }, [categoryPathParam, subcategoryPathParam, catParam]);

  // Scroll to top when category changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeCategory, activeSubcategorySlug]);

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
    const normalized = normalizeCategoryId(id) || 'all';
    setActiveCategory(normalized);
    setActiveSubcategorySlug('');
    setComboBuilderCategoryId(null);
    navigate(normalized === 'all' ? '/categories' : `/categories?cat=${normalized}`);
    setIsFilterOpen(false);
  };

  const filteredBadges = activeCategory === 'all' 
    ? products 
    : products.filter(
        (b) => normalizeCategoryId(String(b.category)) === normalizeCategoryId(activeCategory),
      );

  const subcategoryFilteredBadges = activeSubcategorySlug
    ? filteredBadges.filter((b) =>
        matchesSubcategorySlug(b.subcategory, activeSubcategorySlug),
      )
    : filteredBadges;

  const currentCategoryName = activeCategory === 'all' 
    ? 'All Badges' 
    : CATEGORIES.find(c => c.id === activeCategory)?.name || 'All Badges';

  const currentSubcategoryName = activeSubcategorySlug
    ?
        filteredBadges.find((b) =>
          matchesSubcategorySlug(b.subcategory, activeSubcategorySlug),
        )?.subcategory ||
        activeSubcategorySlug
          .split('-')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ')
    : '';

  const getSubcategoryOptions = (items: Badge[]) =>
    Array.from(
      new Set(
        items
          .map((b) => (b.subcategory || '').trim())
          .filter((value) => Boolean(value)),
      ),
    ).sort((a, b) => a.localeCompare(b));

  const subcategoryOptions = getSubcategoryOptions(filteredBadges);

  const handleAddProduct = (category?: string) => {
    // Map frontend category to backend product category
    const categoryMap: Record<string, string> = {
      'moody': 'Moody',
      'positive-vibes': 'Positive Vibes',
      'sports': 'Sports',
      'religious': 'Religious',
      'entertainment': 'Entertainment',
      'events': 'Events',
      'pet': 'Animal',
      'animal': 'Animal',
      'couple': 'Couple',
      'anime': 'Anime',
      'custom': 'Custom'
    };
    const targetCategory = category || activeCategory;
    const productCategory = categoryMap[targetCategory] || 'Custom';
    navigate(`/admin/dashboard?view=products&category=${productCategory}`);
  };

  const toTitleCase = (value: string) =>
    value
      .toLowerCase()
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const getCategoryDisplayName = (categoryId: string) => {
    const normalizedCategory = normalizeCategoryId(categoryId);
    const categoryMeta = CATEGORIES.find(
      (category) => normalizeCategoryId(category.id) === normalizedCategory,
    );
    if (categoryMeta?.name) return toTitleCase(categoryMeta.name);
    return toTitleCase(String(categoryId || 'Custom').replace(/[-_]+/g, ' ').trim());
  };

  const getCategoryComboCandidates = (categoryId: string, sourceItems?: Badge[]) => {
    const normalizedCategory = normalizeCategoryId(categoryId);
    if (!normalizedCategory) return [];

    const seenIds = new Set<string>();
    const source = [
      ...(Array.isArray(sourceItems) ? sourceItems : []),
      ...products,
      ...BADGES,
    ];

    const candidates: Badge[] = [];
    source.forEach((item) => {
      if (!item?.id || item.isCombo) return;
      if (normalizeCategoryId(String(item.category)) !== normalizedCategory) return;
      if (seenIds.has(item.id)) return;

      seenIds.add(item.id);
      candidates.push({
        ...item,
        image: normalizeImagePath(item.image) || item.image,
      });
    });

    return candidates;
  };

  const handleToggleComboBuilder = (categoryId: string) => {
    const normalizedCategory = normalizeCategoryId(categoryId);
    if (!normalizedCategory) return;

    setComboBuilderCategoryId((prev) =>
      prev === normalizedCategory ? null : normalizedCategory,
    );
    setComboFeedback((prev) => ({ ...prev, [normalizedCategory]: null }));
  };

  const handleToggleComboBadge = (categoryId: string, badgeId: string) => {
    const normalizedCategory = normalizeCategoryId(categoryId);
    if (!normalizedCategory) return;

    setComboSelections((prev) => {
      const currentSelection = prev[normalizedCategory] || [];

      if (currentSelection.includes(badgeId)) {
        return {
          ...prev,
          [normalizedCategory]: currentSelection.filter((id) => id !== badgeId),
        };
      }

      if (currentSelection.length >= CUSTOM_COMBO_SIZE) {
        setComboFeedback((current) => ({
          ...current,
          [normalizedCategory]: {
            type: 'error',
            text: `You can select only ${CUSTOM_COMBO_SIZE} badges.`,
          },
        }));
        return prev;
      }

      return {
        ...prev,
        [normalizedCategory]: [...currentSelection, badgeId],
      };
    });

    setComboFeedback((prev) => ({ ...prev, [normalizedCategory]: null }));
  };

  const handleAddCustomComboFromCategory = (categoryId: string, sourceItems?: Badge[]) => {
    const normalizedCategory = normalizeCategoryId(categoryId);
    if (!normalizedCategory) return;

    const selectedBadgeIds = comboSelections[normalizedCategory] || [];
    const candidates = getCategoryComboCandidates(normalizedCategory, sourceItems);
    const byId = new Map(candidates.map((item) => [item.id, item]));
    const selectedBadges = selectedBadgeIds
      .map((id) => byId.get(id))
      .filter((item): item is Badge => Boolean(item));

    if (selectedBadges.length !== CUSTOM_COMBO_SIZE) {
      setComboFeedback((prev) => ({
        ...prev,
        [normalizedCategory]: {
          type: 'error',
          text: `Select exactly ${CUSTOM_COMBO_SIZE} badges to continue.`,
        },
      }));
      return;
    }

    const comboSeed = selectedBadges
      .map((item) => item.id)
      .sort()
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');

    addToCart({
      id: `custom-combo-${normalizedCategory}-${comboSeed}`,
      name: `${getCategoryDisplayName(normalizedCategory)} Custom Combo (Any 4)`,
      price: CUSTOM_COMBO_PRICE,
      category: selectedBadges[0].category,
      image: selectedBadges[0]?.image || '/badge/placeholder.png',
      comboItems: selectedBadges.map((item) => ({
        id: item.id,
        name: item.name,
        image: item.image,
      })),
      details: `Custom combo: ${selectedBadges.map((item) => item.name).join(', ')}`,
      color: 'bg-transparent',
      isCombo: true,
      quantity: 1,
    });

    setComboFeedback((prev) => ({
      ...prev,
      [normalizedCategory]: {
        type: 'success',
        text: 'Custom combo added to cart.',
      },
    }));
    setComboSelections((prev) => ({ ...prev, [normalizedCategory]: [] }));
  };

  const renderComboBuilder = (categoryId: string, sourceItems?: Badge[]) => {
    const normalizedCategory = normalizeCategoryId(categoryId);
    if (!normalizedCategory || comboBuilderCategoryId !== normalizedCategory) return null;

    const candidates = getCategoryComboCandidates(normalizedCategory, sourceItems);
    const selectedIds = comboSelections[normalizedCategory] || [];
    const feedback = comboFeedback[normalizedCategory];

    return (
      <div className="rounded-xl border border-yellow-200/70 bg-gradient-to-br from-yellow-50/60 to-white p-3 sm:p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-orange-700">
              Build Custom Combo
            </p>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              Pick any {CUSTOM_COMBO_SIZE} badges from this category and add combo for {formatPrice(CUSTOM_COMBO_PRICE)}.
            </p>
          </div>
          <span className={`text-[10px] font-black px-2 py-1 rounded-full ${selectedIds.length === CUSTOM_COMBO_SIZE ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            {selectedIds.length}/{CUSTOM_COMBO_SIZE}
          </span>
        </div>

        {candidates.length < CUSTOM_COMBO_SIZE ? (
          <p className="text-xs text-slate-500 font-medium">
            At least {CUSTOM_COMBO_SIZE} badges are required in this category.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {candidates.map((candidate) => {
                const isSelected = selectedIds.includes(candidate.id);

                return (
                  <button
                    key={`${normalizedCategory}-${candidate.id}`}
                    type="button"
                    onClick={() => handleToggleComboBadge(normalizedCategory, candidate.id)}
                    className={`rounded-lg border p-2 text-left transition-all ${isSelected ? 'border-yellow-500 bg-yellow-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={candidate.image}
                        alt={candidate.name}
                        className="w-10 h-10 rounded-md object-cover border border-slate-200"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-800 truncate">{candidate.name}</p>
                        <p className="text-[10px] text-slate-500">{formatPrice(candidate.price)}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => handleAddCustomComboFromCategory(normalizedCategory, sourceItems)}
              disabled={selectedIds.length !== CUSTOM_COMBO_SIZE}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-black uppercase tracking-wider shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Add Combo {formatPrice(CUSTOM_COMBO_PRICE)}
            </button>
          </>
        )}

        {feedback && (
          <p className={`text-xs font-semibold ${feedback.type === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}>
            {feedback.text}
          </p>
        )}
      </div>
    );
  };

  // Group products by category for section-wise display
  const productsByCategory = CATEGORIES.reduce((acc, cat) => {
    const catProducts = products.filter(p => normalizeCategoryId(String(p.category)) === normalizeCategoryId(cat.id));
    acc[cat.id] = catProducts.sort((a, b) => {
      if (a.isCombo && !b.isCombo) return -1;
      if (!a.isCombo && b.isCombo) return 1;
      return 0;
    });
    return acc;
  }, {} as Record<string, Badge[]>);

  // Sort filtered badges so combo appears first
  const sortedFilteredBadges = [...subcategoryFilteredBadges].sort((a, b) => {
    if (a.isCombo && !b.isCombo) return -1;
    if (!a.isCombo && b.isCombo) return 1;
    return 0;
  });

  const categoryDescriptions: Record<string, string> = {
    'moody': '😊 Express Your Mood, Wear Your Vibe',
    'positive-vibes': '✨ Spark Joy, Spread Positivity',
    'sports': '🏆 Fuel Your Passion, Show Your Game',
    'religious': '🙏 Faith & Devotion in Every Design',
    'entertainment': '🎬 Pop Culture & Entertainment Icons',
    'events': '🎉 Celebrate Every Moment in Style',
    'pet': '🐾 Wild, Cute & Everything Nature',
    'couple': '💕 Love Stories, Eternal Memories',
    'anime': '⚡ Unleash Your Inner Otaku Power',
  };

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
        <aside className="hidden lg:flex flex-col w-64 fixed left-0 top-24 h-[calc(100vh-6rem)] pt-4 px-4 bg-white/80 backdrop-blur-md border-r border-slate-200/60 overflow-y-auto">
          <div className="flex flex-col h-full">
            <button
              onClick={() => handleCategorySelect('all')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold uppercase tracking-wide transition-all duration-300 text-sm ${
                activeCategory === 'all'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg shadow-yellow-500/25 border border-yellow-400'
                  : 'text-slate-600 hover:bg-slate-100/80 border border-transparent hover:border-slate-200'
              }`}
            >
              All Badges
              {activeCategory === 'all' && <Check className="w-4 h-4" />}
            </button>

            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-3"></div>

            <div className="flex flex-col flex-1 justify-between gap-1.5 pb-2">
              {CATEGORIES.map(cat => (
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
                Explore the <span className="bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">Collection</span>
              </h1>
              <p className="text-slate-500 text-sm md:text-base font-medium mt-2">
                Discover unique badges that speak your style
              </p>
            </div>

            <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
              {/* Admin Add Product Button */}
              {isAdmin && activeCategory !== 'all' && (
                <button
                  onClick={() => handleAddProduct()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl font-bold text-xs transition-all shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add to {currentCategoryName}</span>
                  <span className="sm:hidden">Add</span>
                </button>
              )}

              {/* Custom Combo + Badge Count */}
              {activeCategory !== 'all' && (
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleToggleComboBuilder(activeCategory)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-black text-[11px] uppercase tracking-wide shadow-sm hover:shadow-md hover:from-yellow-400 hover:to-orange-400 transition-all"
                  >
                    <Package className="w-3.5 h-3.5" />
                    Custom Combo {formatPrice(149)}
                  </button>

                  <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-yellow-50 border border-yellow-200/60">
                    <span className="text-base">{CATEGORIES.find(c => c.id === activeCategory)?.icon}</span>
                    <span className="text-sm font-bold text-slate-700">{sortedFilteredBadges.length} badges</span>
                  </div>
                </div>
              )}

              {/* Mobile Filter Dropdown */}
              <div className="lg:hidden relative" ref={filterPanelRef}>
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`flex items-center gap-2 font-bold px-4 py-2.5 rounded-xl transition-all duration-300 text-xs ${
                    isFilterOpen
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg shadow-yellow-500/25 border border-yellow-400'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-yellow-400'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="uppercase tracking-wide">{currentCategoryName}</span>
                </button>

                {isFilterOpen && (
                  <div className="absolute left-0 md:left-auto md:right-0 mt-3 w-full sm:w-72 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-slate-200/60 z-50 overflow-hidden">
                    <div className="p-3 space-y-1.5">
                      <button
                        onClick={() => handleCategorySelect('all')}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
                          activeCategory === 'all' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg shadow-yellow-500/25' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        All Badges
                        {activeCategory === 'all' && <Check className="w-4 h-4" />}
                      </button>
                      <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-2"></div>
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => handleCategorySelect(cat.id)}
                          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
                            activeCategory === cat.id ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg shadow-yellow-500/25' : 'text-slate-600 hover:bg-slate-50'
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

          {loading && products.length === 0 ? (
            <div className="text-center py-24">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
              <p className="mt-6 text-slate-500 font-semibold text-sm">Loading products...</p>
            </div>
          ) : (
            <div key={activeCategory}>
              {activeCategory === 'all' ? (
                <div className="space-y-14">
                  {CATEGORIES.map((category) => {
                    const categoryProducts = productsByCategory[category.id] || [];
                    const categorySubcategoryOptions =
                      getSubcategoryOptions(categoryProducts);
                    if (categoryProducts.length === 0) return null;

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
                            <p className="text-xs text-slate-400 font-medium mt-0.5">{categoryDescriptions[category.id] || `${categoryProducts.length} badges`}</p>
                          </div>
                          <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent ml-4"></div>
                          <button
                            onClick={() => handleToggleComboBuilder(category.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white rounded-lg font-black text-[10px] uppercase tracking-wide transition-all shadow-sm"
                          >
                            <Package className="w-3 h-3" />
                            <span className="hidden md:inline">Custom Combo</span>
                            <span className="md:hidden">Combo</span>
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleAddProduct(category.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[10px] transition-all shadow-sm"
                            >
                              <Plus className="w-3 h-3" />
                              <span className="hidden md:inline">Add</span>
                            </button>
                          )}
                        </div>

                        {renderComboBuilder(category.id, categoryProducts)}

                        {categorySubcategoryOptions.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 mb-5">
                            <Link
                              to={`/categories?cat=${category.id}`}
                              className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-yellow-400 shadow-sm shadow-yellow-500/20"
                            >
                              All
                            </Link>
                            {categorySubcategoryOptions.map((subcategory) => (
                              <Link
                                key={`${category.id}-${subcategory}`}
                                to={buildSubcategoryRoute(category.id, subcategory)}
                                className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all bg-white text-slate-600 border-slate-200 hover:border-yellow-400 hover:text-yellow-700"
                              >
                                {subcategory}
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* Category Products Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                          {categoryProducts.map((badge, i) =>
                            badge.isCombo ? (
                              <ComboCard key={badge.id} badge={badge} addToCart={addToCart} index={i} />
                            ) : (
                              <BadgeCard key={badge.id} badge={badge} addToCart={addToCart} index={i} />
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-100 to-orange-100 border border-yellow-300/40 flex items-center justify-center shadow-sm">
                      <span className="text-xl">{CATEGORIES.find(c => c.id === activeCategory)?.icon}</span>
                    </div>
                    <div>
                      <h2 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight leading-none">
                        {activeSubcategorySlug
                          ? `${currentCategoryName} / ${currentSubcategoryName}`
                          : currentCategoryName}
                      </h2>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{categoryDescriptions[activeCategory] || ''}</p>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent ml-4"></div>
                    {isAdmin && (
                      <button
                        onClick={() => handleAddProduct()}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[10px] transition-all shadow-sm"
                      >
                        <Plus className="w-3 h-3" />
                        <span className="hidden md:inline">Add Product</span>
                        <span className="md:hidden">Add</span>
                      </button>
                    )}
                  </div>

                  {renderComboBuilder(activeCategory, filteredBadges)}

                  {subcategoryOptions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mb-5">
                      <Link
                        to={`/categories?cat=${activeCategory}`}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                          !activeSubcategorySlug
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-yellow-400 shadow-sm shadow-yellow-500/20'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-yellow-400 hover:text-yellow-700'
                        }`}
                      >
                        All
                      </Link>
                      {subcategoryOptions.map((subcategory) => {
                        const subcategorySlug = slugifySubcategory(subcategory);
                        const isActiveSubcategory =
                          activeSubcategorySlug === subcategorySlug;

                        return (
                          <Link
                            key={subcategory}
                            to={buildSubcategoryRoute(activeCategory, subcategory)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                              isActiveSubcategory
                                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-yellow-400 shadow-sm shadow-yellow-500/20'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-yellow-400 hover:text-yellow-700'
                            }`}
                          >
                            {subcategory}
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                    {sortedFilteredBadges.map((badge, i) =>
                      badge.isCombo ? (
                        <ComboCard key={badge.id} badge={badge} addToCart={addToCart} index={i} />
                      ) : (
                        <BadgeCard key={badge.id} badge={badge} addToCart={addToCart} index={i} />
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && sortedFilteredBadges.length === 0 && activeCategory !== 'all' && (
            <div className="py-24 text-center">
              <div className="w-28 h-28 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-yellow-200/40 shadow-sm">
                <span className="text-5xl">🔍</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 uppercase">No badges found</h3>
              <p className="text-slate-500 mt-2 text-sm max-w-sm mx-auto font-medium">Try selecting a different subcategory or category.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
