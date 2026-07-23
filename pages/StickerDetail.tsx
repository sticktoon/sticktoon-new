import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, Share2, Check, Truck, Shield } from 'lucide-react';
import { STICKERS, formatPrice } from '../constants';
import { API_BASE_URL } from '../config/api';

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

// DB product (type:"sticker") -> detail shape.
const mapDbProduct = (p: any): StickerDetailData => ({
  id: p._id,
  name: p.name,
  price: p.price,
  image: p.image,
  images: Array.isArray(p.images) ? p.images : [],
  description: p.description || '',
  category: p.category,
  size: p.size || '',
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
  };
};

interface StickerDetailProps {
  addToCart?: (product: any) => void;
}

export default function StickerDetail({ addToCart }: StickerDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [shareCopied, setShareCopied] = useState(false);
  const [sticker, setSticker] = useState<StickerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');

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
      // Fallback: bundled constant catalog (older string ids).
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500" />
      </div>
    );
  }

  if (!sticker) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Sticker not found</h1>
          <button
            onClick={() => navigate('/stickers')}
            className="text-yellow-600 font-semibold hover:text-yellow-700"
          >
            Back to Stickers
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-yellow-50/30">
      {/* Background Effects */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-yellow-500/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-100px] right-[-200px] w-[600px] h-[600px] bg-orange-400/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-[50] flex">
        {/* STICKY SIDEBAR */}
        <aside className="hidden lg:flex flex-col w-64 fixed left-0 top-24 h-[calc(100vh-6rem)] pt-4 px-4 border-r border-slate-200/60 overflow-y-auto z-[60]">
          <button
            onClick={() => navigate('/stickers')}
            className="w-full flex items-center gap-2 px-4 py-3.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition-all text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Stickers
          </button>
        </aside>

        {/* MAIN CONTENT */}
        <main className="w-full lg:ml-64 px-4 sm:px-6 lg:pl-4 lg:pr-6 pt-24 py-8">
          {/* Back Button (Mobile) */}
          <button
            onClick={() => navigate('/stickers')}
            className="lg:hidden flex items-center gap-2 text-slate-700 hover:text-slate-900 font-semibold mb-8 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Stickers
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Left: Image */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-full max-w-md">
                <div className="rounded-2xl overflow-hidden border-[3px] border-black shadow-lg">
                  <img
                    src={activeImage || sticker.image}
                    alt={sticker.name}
                    className="w-full h-auto object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>
              {gallery.length > 1 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {gallery.map((img) => (
                    <button
                      key={img}
                      onClick={() => setActiveImage(img)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        activeImage === img ? 'border-yellow-500' : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Product Info */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-2">
                      {sticker.name}
                    </h1>
                    {sticker.description && (
                      <p className="text-lg text-slate-600 font-semibold">
                        {sticker.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleShareLink}
                    className="p-3 rounded-full bg-yellow-500/20 hover:bg-yellow-500/30 transition-colors flex-shrink-0"
                  >
                    {shareCopied ? (
                      <Check className="w-6 h-6 text-green-600" />
                    ) : (
                      <Share2 className="w-6 h-6 text-yellow-600" />
                    )}
                  </button>
                </div>

                {/* Price */}
                <div className="text-5xl font-black text-yellow-600 mb-6">
                  {formatPrice(sticker.price)}
                </div>

                {/* Specs: size / pack count */}
                {(sticker.size || (sticker.packCount ?? 0) > 0) && (
                  <div className="flex flex-wrap gap-3 mb-6">
                    {sticker.size && (
                      <div className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Size</span>
                        <p className="text-sm font-bold text-slate-900">{sticker.size}</p>
                      </div>
                    )}
                    {(sticker.packCount ?? 0) > 0 && (
                      <div className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">In this pack</span>
                        <p className="text-sm font-bold text-slate-900">{sticker.packCount} stickers</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Details */}
                {sticker.description && (
                  <div className="bg-slate-50 rounded-xl p-6 mb-6 border-2 border-slate-200">
                    <p className="text-slate-700 font-medium leading-relaxed">
                      {sticker.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="space-y-4">
                {/* Info Boxes */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 text-center border-2 border-green-200">
                    <Truck className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-green-900">Free Shipping</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center border-2 border-blue-200">
                    <Shield className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-blue-900">Secure Payment</p>
                  </div>
                </div>

                {/* Quantity & Add to Cart */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center border-2 border-slate-300 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-4 py-2 hover:bg-slate-100 font-bold text-slate-900"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center font-bold text-slate-900 border-0 focus:outline-none"
                      min="1"
                    />
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-4 py-2 hover:bg-slate-100 font-bold text-slate-900"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={handleAddToCart}
                    className="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 font-black uppercase tracking-widest shadow-lg hover:shadow-xl hover:shadow-yellow-500/20 transition-all flex items-center justify-center gap-3"
                  >
                    <ShoppingCart className="w-6 h-6" />
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
