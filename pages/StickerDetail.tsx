import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Zap, Shield, ArrowLeft, Star, Truck, Share2, Check, Sparkles, ChevronRight, RotateCcw } from 'lucide-react';
import { STICKERS, formatPrice } from '../constants';
import { API_BASE_URL } from '../config/api';
import { formatDate } from '../utils/formatDate';

interface StickerDetailData {
  id: string;
  name: string;
  price: number;
  image: string;
  images?: string[];
  description: string;
  category?: string;
  size?: string;
  packCount?: number;
}

interface StickerDetailUser {
  id: string;
  name?: string;
  email: string;
}

interface ProductReview {
  _id: string;
  userName?: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

// DB product (type:"sticker") -> detail shape.
const mapDbProduct = (p: any): StickerDetailData => ({
  id: p._id,
  name: p.name,
  price: p.price,
  image: p.image,
  images: Array.isArray(p.images) ? p.images : [],
  description: p.description || '',
  category: p.category,
  size: p.size || '3 x 3 inches',
  packCount: p.packCount || 0,
});

// Bundled constant sticker (fallback when the id is not a DB product).
const mapConstantSticker = (id: string): StickerDetailData | null => {
  const s = STICKERS.find((x) => x.id === id);
  if (!s) return null;
  return {
    id: s.id,
    name: s.name,
    price: s.price,
    image: s.image,
    description: s.details || '',
    category: s.category,
    size: '3 x 3 inches',
  };
};

interface StickerDetailProps {
  addToCart?: (product: any) => void;
  user?: StickerDetailUser | null;
}

export default function StickerDetail({ addToCart, user }: StickerDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [shareCopied, setShareCopied] = useState(false);
  const [sticker, setSticker] = useState<StickerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');
  const [activeTab, setActiveTab] = useState<'description' | 'info'>('description');
  const [addedToCart, setAddedToCart] = useState(false);
  const [relatedStickers, setRelatedStickers] = useState<StickerDetailData[]>([]);

  // Review states
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewStats, setReviewStats] = useState({ average: 0, count: 0 });
  const [canReview, setCanReview] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewMessageType, setReviewMessageType] = useState<'success' | 'error' | ''>('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/products/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data?._id) {
            const mapped = mapDbProduct(data);
            setSticker(mapped);
            setActiveImage(mapped.image);
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching sticker:', err);
      }
      // Fallback: bundled constant catalog
      if (!cancelled) {
        const fallback = mapConstantSticker(id);
        setSticker(fallback);
        if (fallback) setActiveImage(fallback.image);
      }
    })().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Fetch reviews & stats
  const fetchReviews = async (productId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reviews/${productId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setReviewStats({
          average: Number(data.stats?.average) || 0,
          count: Number(data.stats?.count) || 0,
        });
      }
    } catch {
      // silent catch
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchReviews(id);
  }, [id]);

  // Check review eligibility
  useEffect(() => {
    if (!id || !user) {
      setCanReview(false);
      setHasExistingReview(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`${API_BASE_URL}/api/reviews/${id}/eligibility`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setCanReview(Boolean(data.canReview));
        setHasExistingReview(Boolean(data.hasExistingReview));
      })
      .catch(() => {
        setCanReview(false);
      });
  }, [id, user]);

  // Fetch related stickers
  useEffect(() => {
    if (!sticker) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/products?type=sticker&limit=10`);
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : data.products || [];
          const mapped = items
            .map(mapDbProduct)
            .filter((s: StickerDetailData) => s.id !== sticker.id);
          if (mapped.length > 0) {
            setRelatedStickers(mapped.slice(0, 4));
            return;
          }
        }
      } catch {
        // silent
      }
      // Fallback from STICKERS constants
      const fallbackRelated = STICKERS.filter((s) => s.id !== sticker.id)
        .map((s) => ({
          id: s.id,
          name: s.name,
          price: s.price,
          image: s.image,
          description: s.details || '',
          category: s.category,
        }))
        .slice(0, 4);
      setRelatedStickers(fallbackRelated);
    })();
  }, [sticker?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mb-4"></div>
          <p className="text-slate-500 font-semibold text-sm">Loading sticker details...</p>
        </div>
      </div>
    );
  }

  if (!sticker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-yellow-200/40">
            <span className="text-5xl">🔍</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase">Sticker not found</h2>
          <p className="text-slate-500 text-sm mt-2 mb-6">We couldn't find the sticker you're looking for.</p>
          <button
            onClick={() => navigate('/stickers')}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            Browse Stickers
          </button>
        </div>
      </div>
    );
  }

  const gallery = [sticker.image, ...(sticker.images || [])].filter(Boolean);

  const handleShareLink = async () => {
    const shareUrl = `${window.location.origin}/stickers/${sticker.id}`;
    const shareText = `Check out *${sticker.name}* from StickToon - ${sticker.description}\n\nStickToon - We create for the souls\n\n${shareUrl}`;
    try {
      await navigator.clipboard.writeText(shareText);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleAddToCart = () => {
    if (addToCart) {
      for (let i = 0; i < quantity; i++) {
        addToCart({
          id: sticker.id,
          name: sticker.name,
          price: sticker.price,
          image: sticker.image,
          category: sticker.category,
          type: 'sticker',
        });
      }
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    }
  };

  const handleBuyNow = () => {
    if (addToCart) {
      addToCart({
        id: sticker.id,
        name: sticker.name,
        price: sticker.price,
        image: sticker.image,
        category: sticker.category,
        quantity,
        type: 'sticker',
      });
    }
    navigate('/checkout');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) return;
    const token = localStorage.getItem('token');
    if (!token) {
      setReviewMessage('Please log in to submit a review.');
      setReviewMessageType('error');
      return;
    }

    setSubmittingReview(true);
    setReviewMessage('');
    setReviewMessageType('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/reviews/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setReviewMessage(data?.message || 'Failed to submit review.');
        setReviewMessageType('error');
        return;
      }

      setReviewMessage('Thanks! Your review has been saved.');
      setReviewMessageType('success');
      setHasExistingReview(true);
      fetchReviews(id);
    } catch {
      setReviewMessage('Failed to submit review. Please try again.');
      setReviewMessageType('error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const originalPrice = Math.round(sticker.price * 2.5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 relative overflow-x-clip">
      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-yellow-400/5 rounded-full blur-[150px]" />
        <div className="absolute top-1/3 right-[-200px] w-[600px] h-[600px] bg-orange-300/4 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pt-24 pb-16">
        {/* BREADCRUMB */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-6">
          <button onClick={() => navigate('/')} className="hover:text-slate-600 transition-colors">Home</button>
          <ChevronRight className="w-2.5 h-2.5" />
          <button onClick={() => navigate('/stickers')} className="hover:text-slate-600 transition-colors">Stickers</button>
          <ChevronRight className="w-2.5 h-2.5" />
          <span className="text-slate-700 font-semibold truncate max-w-[180px]">{sticker.name}</span>
        </div>

        {/* HERO SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">

          {/* ===== LEFT: IMAGE COLUMN ===== */}
          <div className="lg:col-span-5 space-y-3">
            {/* Main Image Card */}
            <div className="relative bg-white rounded-xl border border-slate-200/80 shadow-md shadow-slate-200/40 overflow-hidden">
              {/* Top Bar */}
              <div className="flex items-center justify-between px-3 pt-3">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.12em] text-orange-700 bg-gradient-to-r from-yellow-100 to-orange-100 px-2 py-1 rounded-full border border-yellow-300/40">
                    <Zap className="w-2.5 h-2.5" />
                    Hot Sticker
                  </span>
                  <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-slate-900 bg-gradient-to-r from-yellow-400 to-amber-400 px-2 py-1 rounded-full">
                    Vinyl Die-Cut
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleShareLink}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-yellow-100 flex items-center justify-center transition-colors"
                    title="Share"
                  >
                    {shareCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                </div>
              </div>

              {/* Image Showcase */}
              <div className="w-full aspect-square flex items-center justify-center p-6 relative bg-gradient-to-br from-slate-50 via-white to-slate-100">
                <img
                  src={activeImage || sticker.image}
                  alt={sticker.name}
                  loading="eager"
                  decoding="async"
                  className="max-w-full max-h-full object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.15)] hover:scale-105 transition-all duration-300"
                />
              </div>

              {/* Gallery Thumbnails */}
              {gallery.length > 1 && (
                <div className="px-3 pb-3 grid grid-cols-4 gap-2">
                  {gallery.map((img, idx) => (
                    <button
                      key={img}
                      onClick={() => setActiveImage(img)}
                      className={`relative rounded-lg border-2 p-1.5 flex items-center justify-center transition-all ${
                        activeImage === img
                          ? 'border-yellow-500 bg-yellow-50/50 shadow-sm'
                          : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                      }`}
                    >
                      <img src={img} alt="" className="h-10 object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description / Specifications Tabs */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden mt-3">
              <div className="grid grid-cols-2 bg-slate-100/80 p-0.5 mx-3 mt-2.5 rounded-lg">
                <button
                  onClick={() => setActiveTab('description')}
                  className={`py-2 text-[11px] font-bold rounded-md transition-all ${
                    activeTab === 'description'
                      ? 'bg-white shadow-sm text-slate-900'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Description
                </button>
                <button
                  onClick={() => setActiveTab('info')}
                  className={`py-2 text-[11px] font-bold rounded-md transition-all ${
                    activeTab === 'info'
                      ? 'bg-white shadow-sm text-slate-900'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Specifications
                </button>
              </div>

              <div className="p-3.5">
                {activeTab === 'description' && (
                  <p className="text-slate-600 text-xs leading-relaxed font-medium">
                    {sticker.description || `The ${sticker.name} sticker is custom die-cut on ultra-durable vinyl. Waterproof, scratch-resistant, and perfect for laptops, bottles, phones, and helmets.`}
                  </p>
                )}
                {activeTab === 'info' && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['WEIGHT', '0.02 g'],
                      ['DIMENSIONS', sticker.size || '7.5 × 7.5 cm'],
                      ['MATERIAL', 'Vinyl + gloss finish'],
                      ['FINISH', 'Glossy, waterproof'],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-slate-50 rounded-lg p-2.5">
                        <p className="text-[8px] uppercase tracking-[0.12em] font-bold text-slate-400 mb-0.5">{label}</p>
                        <p className="text-xs font-bold text-slate-800">{value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===== RIGHT: DETAILS COLUMN ===== */}
          <div className="lg:col-span-7 space-y-3.5">
            {/* Category & Back */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
                <Sparkles className="w-2.5 h-2.5 text-orange-600" />
                <span className="text-[9px] font-black tracking-[0.12em] uppercase text-orange-700">
                  {sticker.category || 'Sticker'}
                </span>
              </div>
              <button
                onClick={() => navigate('/stickers')}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-700 font-semibold text-[11px] transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Stickers
              </button>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-[2rem] font-black tracking-tight text-slate-900 leading-[1.15]">
                {sticker.name}
              </h1>
              {sticker.description && (
                <p className="text-xs md:text-sm text-slate-500 mt-1 font-medium italic">
                  "{sticker.description}"
                </p>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < Math.round(reviewStats.average || 5)
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-slate-300 fill-slate-200'
                    }`}
                  />
                ))}
              </div>
              {reviewStats.count > 0 ? (
                <>
                  <span className="text-[11px] font-bold text-slate-500">
                    {reviewStats.average.toFixed(1)}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-[11px] font-medium text-slate-400">
                    {reviewStats.count} review{reviewStats.count === 1 ? '' : 's'}
                  </span>
                </>
              ) : (
                <span className="text-[11px] font-medium text-slate-400">5.0 (42 reviews)</span>
              )}
            </div>

            {/* Price */}
            <div className="flex items-end gap-2.5 flex-wrap">
              <span className="text-3xl md:text-4xl font-black bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                {formatPrice(sticker.price * quantity)}
              </span>
              <span className="text-base line-through text-slate-300 font-bold mb-0.5">
                {formatPrice(originalPrice * quantity)}
              </span>
              <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full mb-0.5">
                SAVE {Math.round((1 - sticker.price / originalPrice) * 100)}%
              </span>
            </div>
            {quantity > 1 && (
              <p className="text-[11px] text-slate-400 font-medium -mt-2">
                {formatPrice(sticker.price)} × {quantity} items
              </p>
            )}

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-slate-200 via-slate-200 to-transparent" />

            {/* Size / Pack specs */}
            {(sticker.size || (sticker.packCount ?? 0) > 0) && (
              <div className="flex flex-wrap gap-2.5">
                {sticker.size && (
                  <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Dimensions</span>
                    <span className="text-xs font-bold text-slate-800">{sticker.size}</span>
                  </div>
                )}
                {(sticker.packCount ?? 0) > 0 && (
                  <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Pack Size</span>
                    <span className="text-xs font-bold text-slate-800">{sticker.packCount} stickers included</span>
                  </div>
                )}
              </div>
            )}

            {/* Quantity Selector */}
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                Quantity
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-9 h-9 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-50 transition-colors text-base"
                  >
                    −
                  </button>
                  <span className="w-10 h-9 flex items-center justify-center font-black text-slate-900 border-x border-slate-200 text-xs">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-9 h-9 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-50 transition-colors text-base"
                  >
                    +
                  </button>
                </div>
                <div className="flex items-center gap-1 text-rose-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-[11px] font-bold">In stock & ready to ship</span>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                onClick={handleAddToCart}
                className={`py-3.5 rounded-lg font-black uppercase tracking-wider text-xs transition-all duration-300 flex items-center justify-center gap-2 ${
                  addedToCart
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                    : 'bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white shadow-sm'
                }`}
              >
                {addedToCart ? (
                  <>
                    <Check className="w-4 h-4" />
                    Added!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    Add to Cart
                  </>
                )}
              </button>

              <button
                onClick={handleBuyNow}
                className="py-3.5 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-black uppercase tracking-wider text-xs shadow-md shadow-yellow-500/25 hover:shadow-lg hover:shadow-yellow-500/30 transition-all duration-300 flex items-center justify-center gap-1.5"
              >
                <Zap className="w-4 h-4" />
                Buy Now
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-2 pt-3">
              <div className="bg-white rounded-lg border border-slate-200/80 p-2.5 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center mb-1.5">
                  <Truck className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <p className="text-[9px] font-black text-slate-800 uppercase tracking-wider leading-tight">Free Delivery</p>
                <p className="text-[8px] text-slate-400 font-medium mt-0.5">On all orders</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200/80 p-2.5 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center mb-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <p className="text-[9px] font-black text-slate-800 uppercase tracking-wider leading-tight">Waterproof</p>
                <p className="text-[8px] text-slate-400 font-medium mt-0.5">Weather-resistant</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200/80 p-2.5 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-7 h-7 rounded-md bg-rose-50 flex items-center justify-center mb-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <p className="text-[9px] font-black text-slate-800 uppercase tracking-wider leading-tight">No Residue</p>
                <p className="text-[8px] text-slate-400 font-medium mt-0.5">Easy peel off</p>
              </div>
            </div>


          </div>
        </div>

        {/* ===== REVIEWS SECTION ===== */}
        <div className="mt-8 bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">Customer Reviews</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(reviewStats.average || 5)
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-slate-300 fill-slate-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-bold text-slate-700">
                {(reviewStats.average || 5.0).toFixed(1)} ({reviewStats.count || 42})
              </span>
            </div>
          </div>

          {/* Add Review Form */}
          {user && canReview && !hasExistingReview && (
            <form onSubmit={handleSubmitReview} className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
              <p className="text-xs font-bold text-slate-800">Write a Review</p>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setReviewRating(i + 1)}
                    className="p-1"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        i < reviewRating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your thoughts about this sticker..."
                rows={3}
                className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:border-yellow-500"
              />
              <button
                type="submit"
                disabled={submittingReview}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
              {reviewMessage && (
                <p className={`text-xs font-semibold ${reviewMessageType === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {reviewMessage}
                </p>
              )}
            </form>
          )}

          {/* Reviews List */}
          {reviews.length > 0 ? (
            <div className="space-y-3 divide-y divide-slate-100">
              {reviews.map((r) => (
                <div key={r._id} className="pt-3 first:pt-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{r.userName || 'Verified Buyer'}</span>
                    <span className="text-[10px] text-slate-400">{formatDate(r.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-0.5 my-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  {r.comment && <p className="text-xs text-slate-600">{r.comment}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No customer reviews yet for this sticker.</p>
          )}
        </div>

        {/* ===== RELATED STICKERS ===== */}
        {relatedStickers.length > 0 && (
          <div className="mt-12 space-y-4">
            <h2 className="text-xl font-black text-slate-900">You Might Also Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {relatedStickers.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/stickers/${item.id}`)}
                  className="group bg-white rounded-xl border border-slate-200/80 p-3 hover:shadow-lg hover:border-yellow-400 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="aspect-square bg-slate-50 rounded-lg overflow-hidden flex items-center justify-center p-3 mb-2">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 truncate">{item.name}</h3>
                    <p className="text-xs font-black text-yellow-600 mt-0.5">{formatPrice(item.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
