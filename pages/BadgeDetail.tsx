
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BADGES, formatPrice } from '../constants';
import { Badge } from '../types';
import { getBadgeDescription } from '../geminiService';
import { ShoppingCart, Zap, Shield, RotateCcw, ArrowLeft, Star, Heart, Truck } from 'lucide-react';

interface BadgeDetailProps {
  addToCart: (badge: Badge) => void;
}

export default function BadgeDetail({ addToCart }: BadgeDetailProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
if (!id) {
  return <div className="p-20 text-center">Invalid badge</div>;
}

const badge = BADGES.find(b => b.id === id);
const [currentImage, setCurrentImage] = useState(0);


  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [badgeType, setBadgeType] = useState<'pin' | 'magnetic'>('pin');
const [activeTab, setActiveTab] = useState<'description' | 'info'>('description');


  useEffect(() => {
    if (badge) {
      getBadgeDescription(badge.name).then(setDescription);
    }
  }, [badge]);

  if (!badge) {
    return <div className="p-20 text-center">Badge not found</div>;
  }

  const handleBuyNow = () => {
    addToCart(badge);
    navigate('/checkout');
  };
const images =
  badgeType === 'magnetic'
    ? [badge.image, badge.imageMagnetic || badge.image]
    : [badge.image];

 return (
  <div className="bg-white min-h-[calc(100vh-64px)]">
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold mb-6 md:mb-10 text-sm md:text-base"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Collection
      </button>

      {/* HERO SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 lg:gap-14 items-start">

        {/* IMAGE */}
        <div className="lg:col-span-5">
          
        <div className="bg-white rounded-2xl border border-slate-500 
                p-4 md:p-6 w-full flex justify-center">


 <div className="w-[180px] md:w-[260px] h-[180px] md:h-[260px] flex items-center justify-center">
  <img
    src={
      badgeType === 'pin'
        ? badge.image
        : badge.imageMagnetic || badge.image
    }
    alt={badge.name}
    className="max-w-full max-h-full object-contain transition-all duration-300"
  />
</div>



</div>

           {/* TABS — NOW BELOW IMAGE */}
  <div>
    {/* Tabs Header */}
   <div className="w-full mt-6">

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
   <p className="w-full mt-4 bg-white rounded-xl 
                border border-slate-700 p-3 text-slate-600 text-sm leading-relaxed">

      A premium die-cut sticker badge designed to show off your unique
      personality and style.
    </p>
  )}

  {activeTab === 'info' && (
  <div className="w-full mt-4 bg-white rounded-xl 
                border border-slate-700 divide-y text-sm">

  <div className="flex justify-between px-5 py-3">
    <span className="font-medium text-slate-700">Weight</span>
    <span className="text-slate-900">0.05 g</span>
  </div>

  <div className="flex justify-between px-4 py-3">
    <span className="font-medium text-slate-900">Dimensions</span>
    <span className="text-slate-600">5.8 × 5.8 × 1 cm</span>
  </div>
</div>

  )}
</div>


  </div>
   </div>

        </div>
        

        {/* DETAILS */}
        <div className="lg:col-span-7 space-y-8">


          {/* Category */}
          <p className="text-xs font-black tracking-widest text-blue-600 uppercase">
            {badge.category}
          </p>

          {/* Title */}
          <h1 className="text-4xl font-extrabold text-slate-900">
            {badge.name}
          </h1>

          {/* Price */}
          <div className="flex items-center gap-4">
            <span className="text-4xl font-black text-slate-900">
              ₹{badge.price}
            </span>
            <span className="line-through text-slate-400">₹299</span>
            <span className="text-xs font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
              50% OFF
            </span>
          </div>

          {/* Badge Type */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Choose Badge Style
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setBadgeType('pin')}
                className={`py-3 rounded-xl border-2 font-bold ${
                  badgeType === 'pin'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-300 text-slate-700'
                }`}
              >
                Pin Badge
              </button>

              <button
                onClick={() => setBadgeType('magnetic')}
                className={`py-3 rounded-xl border-2 font-bold ${
                  badgeType === 'magnetic'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-300 text-slate-700'
                }`}
              >
                Pin + Fridge  Magnetic Badge
              </button>
            </div>

            <p className="text-xs text-slate-500">
              {badgeType === 'pin'
                ? 'Classic pin-back badge'
                : 'No-pin magnetic badge'}
            </p>
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-6">
            <div className="flex items-center border border-slate-300 rounded-xl">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="px-4 py-2 font-bold"
              >
                −
              </button>
              <span className="px-4 font-black">{quantity}</span>
              <button
                onClick={() => setQuantity(q => q + 1)}
                className="px-4 py-2 font-bold"
              >
                +
              </button>
            </div>

            <span className="text-sm font-bold text-rose-500">
              Only 12 left
            </span>
          </div>

          {/* CTA */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => addToCart(badge)}
              className="border-2 border-slate-900 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition"
            >
              Add to Cart
            </button>

            <button
              onClick={handleBuyNow}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg"
            >
              Buy Now
            </button>
          </div>

          {/* TRUST */}
          <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-200 text-center">
            <div className="space-y-2">
              <Truck className="mx-auto text-blue-500" />
              <p className="text-xs font-bold text-slate-500">Free Shipping</p>
            </div>
            <div className="space-y-2">
              <Shield className="mx-auto text-emerald-500" />
              <p className="text-xs font-bold text-slate-500">Secure Payment</p>
            </div>
            <div className="space-y-2">
              <RotateCcw className="mx-auto text-rose-500" />
              <p className="text-xs font-bold text-slate-500">Easy Returns</p>
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
