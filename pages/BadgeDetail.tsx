
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BADGES } from '../constants';
import { Badge } from '../types';
import { getBadgeDescription } from '../geminiService';
import { ShoppingCart, Zap, Shield, RotateCcw, ArrowLeft, Star, Truck, Share2, Check } from 'lucide-react';
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
  const magneticFallback = '/badge/magnectbadge.png';

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

  const normalizeBadge = (b: Badge | null) => {
    if (!b) return null;
    return {
      ...b,
      image: normalizeImagePath(b.image) || b.image,
      imageMagnetic: normalizeImagePath(b.imageMagnetic) || b.imageMagnetic,
    } as Badge;
  };

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
    return <div className="p-20 text-center">Invalid badge</div>;
  }

  if (loading) {
    return <div className="p-20 text-center">Loading badge...</div>;
  }

  if (!badge) {
    return <div className="p-20 text-center">Badge not found</div>;
  }

  const handleBuyNow = () => {
    addToCart(badge);
    navigate('/checkout');
  };

  const handleShareLink = () => {
    // Generate the share link with badge details
    const shareUrl = `${window.location.origin}/badge/${id}`;
    
    // Create a descriptive share text with website name and badge info
    const shareText = `Check out *${badge.name}* from StickToon - ${badge.tagline || badge.details}\n\nStickToon - We Create for Soul\n\n${shareUrl}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareText).then(() => {
      setShareCopied(true);
      // Reset the copied state after 2 seconds
      setTimeout(() => setShareCopied(false), 2000);
    }).catch(() => {
      alert('Failed to copy link');
    });
  };

const magneticImage = badge?.imageMagnetic || magneticFallback;
const images =
  badgeType === 'magnetic'
    ? [badge.image, magneticImage]
    : [badge.image];

 return (
  <div className="min-h-screen bg-white relative overflow-hidden">
    {/* Share Toast Notification */}
    {shareCopied && (
      <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in">
        <Check className="w-4 h-4" />
        <span className="text-sm font-semibold">Link copied to clipboard!</span>
      </div>
    )}

    {/* Premium background glow - Hot Drops Theme */}
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -top-64 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-yellow-500/10 rounded-full blur-[140px]" />
      <div className="absolute top-1/3 right-[-300px] w-[600px] h-[600px] bg-orange-400/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 left-[-200px] w-[500px] h-[500px] bg-red-400/10 rounded-full blur-[100px]" />
    </div>

    <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-8">

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold mb-4 md:mb-6 text-sm md:text-base bg-white/70 border border-slate-200 px-4 py-2 rounded-full shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Collection
      </button>

      {/* HERO SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 lg:gap-10 items-start">

        {/* IMAGE */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white/90 backdrop-blur rounded-3xl border border-slate-200 shadow-[0_24px_60px_rgba(0,0,0,0.12)] p-5 md:p-6 w-full">
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                <Zap className="w-3 h-3" />
                Hot Drop
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {badgeType === 'pin' ? 'Pin Badge' : 'Magnetic Badge'}
                </span>
                <button
                  onClick={handleShareLink}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-100 transition"
                  title="Share this product"
                >
                  {shareCopied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Share2 className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              </div>
            </div>

            <div className="w-full h-[210px] md:h-[280px] flex items-center justify-center relative">
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 animate-pulse rounded-xl" />
              )}
              <img
                src={images[currentImage]}
                alt={badge.name}
                loading="lazy"
                decoding="async"
                className={`max-w-full max-h-full object-contain transition-all duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
              />
            </div>

            {images.length > 1 && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {images.map((img, idx) => (
                  <button
                    key={img}
                    onClick={() => setCurrentImage(idx)}
                    className={`rounded-2xl border-2 p-3 flex items-center justify-center transition ${
                      currentImage === idx
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <img 
                      src={img} 
                      alt={`${badge.name} view ${idx + 1}`} 
                      className="h-16 object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

           {/* TABS — NOW BELOW IMAGE */}
  <div>
    {/* Tabs Header */}
  <div className="w-full mt-4">

<div className="grid grid-cols-2 bg-slate-300 rounded-xl p-1">
    <button
      onClick={() => setActiveTab('description')}
      className={`py-2 text-sm font-semibold rounded-lg transition
        ${activeTab === 'description'
          ? 'bg-white shadow text-slate-900'
          : 'text-slate-500'}
      `}
    >
      Description
    </button>

 <button
      onClick={() => setActiveTab('info')}
      className={`py-2 text-sm font-semibold rounded-lg transition
        ${activeTab === 'info'
          ? 'bg-white shadow text-slate-900'
          : 'text-slate-500'}
      `}
    >
      Additional Info
    </button>
</div>



    {/* Tabs Content */}
  <div className="mt-2">
    {activeTab === 'description' && (
      <div className="w-full mt-4 bg-white/95 rounded-2xl border border-slate-200 p-4 text-slate-600 text-sm leading-relaxed">
        {description || badge.details || `The ${badge.name} badge is crafted with premium materials, designed for durability and everyday flex.`}
      </div>
    )}

    {activeTab === 'info' && (
      <div className="w-full mt-4 bg-white/95 rounded-2xl border border-slate-200 text-sm overflow-hidden shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
          {[
            ['Weight', '0.05 g'],
            ['Dimensions', '5.8 × 5.8 × 1 cm'],
            ['Material', 'Metal with gloss finish'],
            ['Finish', 'Glossy + Scratch resistant'],
          ].map(([label, value]) => (
            <div key={label} className="p-4 border-b md:border-b-0 md:border-r border-slate-200 last:border-r-0">
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-500">{label}</p>
              <p className="mt-1 font-black text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>


  </div>
   </div>

        </div>
        

        {/* DETAILS */}
        <div className="lg:col-span-7 space-y-6">


          {/* Category */}
          <p className="text-xs font-black tracking-widest text-blue-600 uppercase">
            {badge.category}
          </p>

          {/* Title */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
                {badge.name}
              </h1>
              {badge.tagline && (
                <p className="text-sm md:text-base text-slate-600 mt-2 italic">
                  {badge.tagline}
                </p>
              )}
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
              ))}
            </div>
            <span className="text-xs font-bold text-slate-500">4.9 · 128 reviews</span>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-3xl md:text-4xl font-black text-slate-900">
                ₹{badge.price * quantity}
              </span>
              <span className="line-through text-slate-400">₹{299 * quantity}</span>
              <span className="text-xs font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                50% OFF
              </span>
              <span className="text-xs font-black bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                Best Seller
              </span>
            </div>
            {quantity > 1 && (
              <p className="text-xs text-slate-500">₹{badge.price} × {quantity} items</p>
            )}
          </div>

          {/* Delivery */}
          {/* <div className="flex items-center gap-3 bg-white/90 border border-slate-200 rounded-2xl px-4 py-3">
            <Truck className="w-5 h-5 text-blue-500" />
            <div className="text-sm">
              <p className="font-bold text-slate-800">Free delivery by Feb 7</p>
              <p className="text-slate-500 text-xs">Ships in 24 hours · Easy returns</p>
            </div>
          </div> */}

          {/* Badge Type */}
          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Choose Badge Style
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setBadgeType('pin')}
                className={`py-3 rounded-2xl border-2 font-black uppercase tracking-widest text-[11px] ${
                  badgeType === 'pin'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-slate-200 text-slate-700 bg-white hover:border-slate-300'
                }`}
              >
                Pin Badge
              </button>

              <button
                onClick={() => setBadgeType('magnetic')}
                className={`py-3 rounded-2xl border-2 font-black uppercase tracking-widest text-[11px] ${
                  badgeType === 'magnetic'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-slate-200 text-slate-700 bg-white hover:border-slate-300'
                }`}
              >
                Pin + Magnetic
              </button>
            </div>

            {/* <p className="text-xs text-slate-500">
              {badgeType === 'pin'
                ? 'Classic pin-back badge'
                : 'No-pin magnetic badge'}
            </p> */}
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-6">
            <div className="flex items-center border border-slate-200 bg-white rounded-xl shadow-sm">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="px-4 py-2 font-bold text-slate-700"
              >
                −
              </button>
              <span className="px-4 font-black text-slate-900">{quantity}</span>
              <button
                onClick={() => setQuantity(q => q + 1)}
                className="px-4 py-2 font-bold text-slate-700"
              >
                +
              </button>
            </div>

            <span className="text-sm font-bold text-rose-500">
              Limited stock available!
            </span>
          </div>

          {/* CTA */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => addToCart(badge)}
              className="border-2 border-slate-900 py-3 md:py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition flex items-center justify-center gap-2 bg-white text-sm"
            >
              <ShoppingCart className="w-4 h-4" />
              Add to Cart
            </button>

            <button
              onClick={handleBuyNow}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white py-3 md:py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg text-sm"
            >
              Buy Now
            </button>
          </div>

          {/* TRUST */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-3 bg-white/90 border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Truck className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Free Delivery</p>
                <p className="text-xs text-slate-500">On all orders</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/90 border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Shield className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Secure Payment</p>
                <p className="text-xs text-slate-500">256-bit protection</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/90 border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <RotateCcw className="text-rose-600" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Easy Returns</p>
                <p className="text-xs text-slate-500">7-day window</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABS
      <div className="mt-24 border-t border-slate-200 pt-16">

        <div className="flex gap-10 text-sm font-black uppercase tracking-widest border-b border-slate-200">
          <button
            onClick={() => setActiveTab('description')}
            className={`pb-4 ${
              activeTab === 'description'
                ? 'border-b-2 border-slate-900 text-slate-900'
                : 'text-slate-400'
            }`}
          >
            Description
          </button>

          <button
            onClick={() => setActiveTab('info')}
            className={`pb-4 ${
              activeTab === 'info'
                ? 'border-b-2 border-slate-900 text-slate-900'
                : 'text-slate-400'
            }`}
          >
            Additional Information
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-4 ${
              activeTab === 'reviews'
                ? 'border-b-2 border-slate-900 text-slate-900'
                : 'text-slate-400'
            }`}
          >
            Reviews
          </button>
        </div>

        <div className="mt-10 max-w-3xl">
          {activeTab === 'description' && (
            <p className="text-slate-600 leading-relaxed">
              {description || `The ${badge.name} badge is crafted with premium materials,
              designed for durability and everyday use.`}
            </p>
          )}

          {activeTab === 'info' && (
            <div className="border border-slate-200 rounded-2xl divide-y">
              {[
                ['Weight', '0.05 g'],
                ['Dimensions', '5.8 × 5.8 × 1 cm'],
                ['Size', '4.4cm & 5.8cm'],
                ['Material', 'Metal with gloss finish'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between px-6 py-4">
                  <span className="font-bold">{k}</span>
                  <span className="text-slate-600">{v}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'reviews' && (
            <p className="text-slate-500">
              Reviews coming soon.
            </p>
          )}
        </div>
      </div> */}
    </div>
  </div>
);

}
