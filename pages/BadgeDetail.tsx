
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BADGES } from '../constants';
import { Badge } from '../types';
import { getBadgeDescription } from '../geminiService';
import { ShoppingCart, Zap, Shield, RotateCcw, ArrowLeft, Star, Truck, Share2, Check, Sparkles, Package, ChevronRight } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

interface BadgeDetailProps {
  addToCart: (badge: Badge) => void;
}

export default function BadgeDetail({ addToCart }: BadgeDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentImage, setCurrentImage] = useState(0);
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [badgeType, setBadgeType] = useState<'pin' | 'magnetic'>('pin');
  const [activeTab, setActiveTab] = useState<'description' | 'info'>('description');
  const [badge, setBadge] = useState<Badge | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const magneticFallback = '/badge/magnectbadge.png';

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

  const normalizeBadge = (b: Badge | null) => {
    if (!b) return null;
    return {
      ...b,
      image: normalizeImagePath(b.image) || b.image,
      imageMagnetic: normalizeImagePath(b.imageMagnetic) || b.imageMagnetic,
    } as Badge;
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const loadBadge = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/products/${id}`);
        if (res.ok) {
          const p = await res.json();
          const mappedBadge: Badge = {
            id: p._id,
            name: p.name,
            category: p.category?.toLowerCase?.() ?? p.category,
            price: p.price,
            image: normalizeImagePath(p.image) || p.image,
            subcategory: p.subcategory || p.subCategory || p.sub_category,
            details: p.description || p.details || '',
            imageMagnetic: normalizeImagePath(p.imageMagnetic),
            color: p.color || 'bg-transparent',
          };
          setBadge(mappedBadge);
          return;
        }

        const fallback = BADGES.find((b) => b.id === id) || null;
        setBadge(normalizeBadge(fallback));
      } catch (err) {
        console.error('Error fetching badge:', err);
        const fallback = BADGES.find((b) => b.id === id) || null;
        setBadge(normalizeBadge(fallback));
      } finally {
        setLoading(false);
      }
    };

    loadBadge();
  }, [id]);

  useEffect(() => {
    if (badge?.name) {
      getBadgeDescription(badge.name).then(setDescription);
    }
  }, [badge]);

  useEffect(() => {
    if (badgeType === 'magnetic') {
      setCurrentImage(1);
      return;
    }
    setCurrentImage(0);
  }, [badgeType]);

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="text-center">
          <div className="w-20 h-20 bg-yellow-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">⚠️</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">Invalid badge</h2>
          <p className="text-slate-500 text-sm mt-2">This badge doesn't exist.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mb-4"></div>
          <p className="text-slate-500 font-semibold text-sm">Loading badge details...</p>
        </div>
      </div>
    );
  }

  if (!badge) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-yellow-200/40">
            <span className="text-5xl">🔍</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase">Badge not found</h2>
          <p className="text-slate-500 text-sm mt-2 mb-6">We couldn't find the badge you're looking for.</p>
          <button
            onClick={() => navigate('/categories')}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            Browse Collection
          </button>
        </div>
      </div>
    );
  }

  const handleBuyNow = () => {
    addToCart(badge);
    navigate('/checkout');
  };

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart(badge);
    }
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleShareLink = () => {
    const shareUrl = `${window.location.origin}/badge/${id}`;
    const shareText = `Check out *${badge.name}* from StickToon - ${badge.tagline || badge.details}\n\nStickToon - We Create for Soul\n\n${shareUrl}`;
    navigator.clipboard.writeText(shareText).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }).catch(() => {
      alert('Failed to copy link');
    });
  };

  const magneticImage = badge?.imageMagnetic || magneticFallback;
  const images = badgeType === 'magnetic' ? [badge.image, magneticImage] : [badge.image];
  const formatPrice = (p: number) => `₹${p}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 relative overflow-hidden">
      {/* Share Toast */}
      {shareCopied && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-500 text-white px-4 py-2.5 rounded-lg shadow-2xl shadow-emerald-500/30 flex items-center gap-2">
          <Check className="w-3.5 h-3.5" />
          <span className="text-xs font-bold">Link copied!</span>
        </div>
      )}

      {/* Cart Toast */}
      {addedToCart && (
        <div className="fixed top-5 right-5 z-50 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2.5 rounded-lg shadow-2xl shadow-yellow-500/30 flex items-center gap-2">
          <ShoppingCart className="w-3.5 h-3.5" />
          <span className="text-xs font-bold">Added to cart!</span>
        </div>
      )}

      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-yellow-400/5 rounded-full blur-[150px]" />
        <div className="absolute top-1/3 right-[-300px] w-[600px] h-[600px] bg-orange-300/4 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-[-200px] w-[500px] h-[500px] bg-amber-300/4 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-5">
          <button onClick={() => navigate('/')} className="hover:text-slate-600 transition-colors">Home</button>
          <ChevronRight className="w-2.5 h-2.5" />
          <button onClick={() => navigate('/categories')} className="hover:text-slate-600 transition-colors">Badges</button>
          <ChevronRight className="w-2.5 h-2.5" />
          <span className="text-slate-700 font-semibold truncate max-w-[180px]">{badge.name}</span>
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
                    Hot Drop
                  </span>
                  {badge.isCombo && (
                    <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-slate-900 bg-gradient-to-r from-yellow-400 to-amber-400 px-2 py-1 rounded-full">
                      <Package className="w-2.5 h-2.5" />
                      Combo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                    {badgeType === 'pin' ? 'Pin' : 'Magnetic'}
                  </span>
                  <button
                    onClick={handleShareLink}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-yellow-100 flex items-center justify-center transition-colors"
                    title="Share"
                  >
                    {shareCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Share2 className="w-3 h-3 text-slate-500" />}
                  </button>
                </div>
              </div>

              {/* Image */}
              <div className="w-full aspect-square flex items-center justify-center p-5 relative">
                {!imageLoaded && (
                  <div className="absolute inset-5 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 animate-pulse" />
                  </div>
                )}
                <img
                  src={images[currentImage]}
                  alt={badge.name}
                  loading="eager"
                  decoding="async"
                  className={`max-w-full max-h-full object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.12)] transition-all duration-500 ${
                    imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                  }`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageLoaded(true)}
                />
              </div>

              {/* Thumbnail Selector */}
              {images.length > 1 && (
                <div className="px-3 pb-3 grid grid-cols-2 gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={img}
                      onClick={() => setCurrentImage(idx)}
                      className={`relative rounded-lg border-2 p-2 flex items-center justify-center transition-all duration-200 ${
                        currentImage === idx
                          ? 'border-yellow-500 bg-yellow-50/50 shadow-sm shadow-yellow-500/10'
                          : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                      }`}
                    >
                      {currentImage === idx && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center shadow-sm">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      <img
                        src={img}
                        alt={`${badge.name} view ${idx + 1}`}
                        className="h-12 object-contain"
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description / Info Tabs (Desktop Only) */}
            <div className="hidden lg:block bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
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

              <div className="p-3">
                {activeTab === 'description' && (
                  <p className="text-slate-600 text-xs leading-relaxed">
                    {description || badge.details || `The ${badge.name} badge is crafted with premium materials, designed for durability and everyday flex.`}
                  </p>
                )}
                {activeTab === 'info' && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['Weight', '0.05 g'],
                      ['Dimensions', '5.8 × 5.8 × 1 cm'],
                      ['Material', 'Metal + gloss finish'],
                      ['Finish', 'Glossy, scratch-proof'],
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
                <span className="text-[9px] font-black tracking-[0.12em] uppercase text-orange-700">{badge.category}</span>
              </div>
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-700 font-semibold text-[11px] transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                Back
              </button>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-[2rem] font-black tracking-tight text-slate-900 leading-[1.15]">
                {badge.name}
              </h1>
              {badge.tagline && (
                <p className="text-xs md:text-sm text-slate-500 mt-1.5 font-medium italic">
                  "{badge.tagline}"
                </p>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <span className="text-[11px] font-bold text-slate-500">4.9</span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="text-[11px] font-medium text-slate-400">128 reviews</span>
            </div>

            {/* Price */}
            <div className="flex items-end gap-2.5 flex-wrap">
              <span className="text-3xl md:text-4xl font-black bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                {formatPrice(badge.price * quantity)}
              </span>
              <span className="text-base line-through text-slate-300 font-bold mb-0.5">
                {formatPrice(299 * quantity)}
              </span>
              <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full mb-0.5">
                SAVE {Math.round((1 - badge.price / 299) * 100)}%
              </span>
            </div>
            {quantity > 1 && (
              <p className="text-[11px] text-slate-400 font-medium -mt-2">{formatPrice(badge.price)} × {quantity} items</p>
            )}

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-slate-200 via-slate-200 to-transparent" />

            {/* Badge Type Selector */}
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
                Choose Badge Style
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => setBadgeType('pin')}
                  className={`relative py-2.5 rounded-lg border-2 font-bold text-xs transition-all duration-200 ${
                    badgeType === 'pin'
                      ? 'border-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50 text-slate-900 shadow-sm shadow-yellow-500/10'
                      : 'border-slate-200 text-slate-600 bg-white hover:border-slate-300'
                  }`}
                >
                  {badgeType === 'pin' && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-[11px] font-black uppercase tracking-wider">Pin Badge</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">Classic pin-back</div>
                  </div>
                </button>

                <button
                  onClick={() => setBadgeType('magnetic')}
                  className={`relative py-2.5 rounded-lg border-2 font-bold text-xs transition-all duration-200 ${
                    badgeType === 'magnetic'
                      ? 'border-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50 text-slate-900 shadow-sm shadow-yellow-500/10'
                      : 'border-slate-200 text-slate-600 bg-white hover:border-slate-300'
                  }`}
                >
                  {badgeType === 'magnetic' && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-[11px] font-black uppercase tracking-wider">Pin + Magnetic</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">No-pin attachment</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Quantity */}
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
                  <span className="text-[11px] font-bold">Limited stock!</span>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={handleAddToCart}
                className={`py-3 rounded-lg font-black uppercase tracking-wider text-xs transition-all duration-300 flex items-center justify-center gap-2 ${
                  addedToCart
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                    : 'bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white shadow-sm'
                }`}
              >
                {addedToCart ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Added!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Add to Cart
                  </>
                )}
              </button>

              <button
                onClick={handleBuyNow}
                className="py-3 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-black uppercase tracking-wider text-xs shadow-md shadow-yellow-500/25 hover:shadow-lg hover:shadow-yellow-500/30 transition-all duration-300 flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
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
                <p className="text-[9px] font-black text-slate-800 uppercase tracking-wider leading-tight">Secure Payment</p>
                <p className="text-[8px] text-slate-400 font-medium mt-0.5">256-bit encrypted</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200/80 p-2.5 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-7 h-7 rounded-md bg-rose-50 flex items-center justify-center mb-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <p className="text-[9px] font-black text-slate-800 uppercase tracking-wider leading-tight">Easy Returns</p>
                <p className="text-[8px] text-slate-400 font-medium mt-0.5">7-day window</p>
              </div>
            </div>

            {/* Mobile Description / Info Tabs */}
            <div className="lg:hidden bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden mt-3">
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

              <div className="p-3">
                {activeTab === 'description' && (
                  <p className="text-slate-600 text-xs leading-relaxed">
                    {description || badge.details || `The ${badge.name} badge is crafted with premium materials, designed for durability and everyday flex.`}
                  </p>
                )}
                {activeTab === 'info' && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['Weight', '0.05 g'],
                      ['Dimensions', '5.8 × 5.8 × 1 cm'],
                      ['Material', 'Metal + gloss finish'],
                      ['Finish', 'Glossy, scratch-proof'],
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
        </div>
      </div>
    </div>
  );
}
