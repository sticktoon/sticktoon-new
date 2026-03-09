import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, Share2, Check, Star, Truck, Shield } from 'lucide-react';

interface StickerProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  details: string;
  features: string[];
}

const STICKER_PRODUCTS: StickerProduct[] = [
  {
    id: 'sticker-1',
    name: 'Vinyl Sticker Pack',
    price: 99,
    image: '/badge/mergesticker.jpeg',
    description: 'Waterproof vinyl stickers perfect for laptops and water bottles',
    details: 'Premium quality waterproof vinyl stickers that are durable and weather-resistant. Perfect for personalizing your laptop, water bottle, skateboard, or any smooth surface.',
    features: ['Waterproof & Weather-resistant', 'High-quality printing', 'Easy to apply & remove', 'Long-lasting colors']
  },
  {
    id: 'sticker-2',
    name: 'Custom Print Stickers',
    price: 149,
    image: '/badge/mergesticker.jpeg',
    description: 'Personalized stickers with your own design',
    details: 'Create your own custom stickers with your unique design. Upload your image and we will print high-quality stickers in any size you want.',
    features: ['Custom designs', 'Full color printing', 'Various sizes available', 'Fast turnaround']
  },
  {
    id: 'sticker-3',
    name: 'Holographic Stickers',
    price: 199,
    image: '/badge/mergesticker.jpeg',
    description: 'Shimmering holographic effect stickers',
    details: 'Stand out with our beautiful holographic stickers that shimmer and shine in different light. Perfect for adding a touch of magic to your belongings.',
    features: ['Holographic finish', 'Eye-catching design', 'Durable material', 'Waterproof coating']
  },
  {
    id: 'sticker-4',
    name: 'Transparent Stickers',
    price: 79,
    image: '/badge/mergesticker.jpeg',
    description: 'Clear transparent stickers with vibrant colors',
    details: 'Transparent stickers with vibrant, crystal-clear colors. Perfect for window decals, glass surfaces, and creating a premium look on any transparent material.',
    features: ['Crystal clear', 'Vibrant colors', 'UV resistant', 'Indoor & outdoor use']
  },
];

interface StickerDetailProps {
  addToCart?: (product: any) => void;
}

export default function StickerDetail({ addToCart }: StickerDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [shareCopied, setShareCopied] = useState(false);

  const sticker = STICKER_PRODUCTS.find((s) => s.id === id);

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

  const handleShareLink = async () => {
    const shareUrl = `${window.location.origin}/stickers/${sticker.id}`;
    const shareText = `Check out *${sticker.name}* from StickToon - ${sticker.description}\n\nStickToon - We Create for Soul\n\n${shareUrl}`;

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
        ...sticker,
        quantity,
        type: 'sticker'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-yellow-50/30">
      {/* Background Effects */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-yellow-500/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-100px] right-[-200px] w-[600px] h-[600px] bg-orange-400/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-[-150px] w-[500px] h-[500px] bg-red-400/6 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex">
        {/* STICKY SIDEBAR */}
        <aside className="hidden lg:flex flex-col w-64 fixed left-0 top-24 h-[calc(100vh-6rem)] pt-4 px-4 border-r border-slate-200/60 overflow-y-auto">
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
            <div className="flex items-center justify-center">
              <div className="relative w-full max-w-md">
                <div className="rounded-2xl overflow-hidden border-[3px] border-black shadow-lg">
                  <img
                    src={sticker.image}
                    alt={sticker.name}
                    className="w-full h-auto object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>
            </div>

            {/* Right: Product Info */}
            <div className="flex flex-col justify-between">
              {/* Header */}
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-2">
                      {sticker.name}
                    </h1>
                    <p className="text-lg text-slate-600 font-semibold">
                      {sticker.description}
                    </p>
                  </div>
                  <button
                    onClick={handleShareLink}
                    className="p-3 rounded-full bg-yellow-500/20 hover:bg-yellow-500/30 transition-colors"
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
                  ₹{sticker.price}
                </div>

                {/* Details */}
                <div className="bg-slate-50 rounded-xl p-6 mb-6 border-2 border-slate-200">
                  <p className="text-slate-700 font-medium leading-relaxed">
                    {sticker.details}
                  </p>
                </div>

                {/* Features */}
                <div className="mb-8">
                  <h3 className="text-lg font-black text-slate-900 mb-4">Features</h3>
                  <ul className="space-y-3">
                    {sticker.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        <Star className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                        <span className="text-slate-700 font-semibold">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
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