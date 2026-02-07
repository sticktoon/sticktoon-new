import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StickerProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
}

const Stickers: React.FC = () => {
  const navigate = useNavigate();

  const stickerProducts: StickerProduct[] = [
    {
      id: 'sticker-1',
      name: 'Vinyl Sticker Pack',
      price: 99,
      image: '/badge/mergesticker.jpeg',
      description: 'Waterproof vinyl stickers perfect for laptops and water bottles',
    },
    {
      id: 'sticker-2',
      name: 'Custom Print Stickers',
      price: 149,
      image: '/badge/mergesticker.jpeg',
      description: 'Personalized stickers with your own design',
    },
    {
      id: 'sticker-3',
      name: 'Holographic Stickers',
      price: 199,
      image: '/badge/mergesticker.jpeg',
      description: 'Shimmering holographic effect stickers',
    },
    {
      id: 'sticker-4',
      name: 'Transparent Stickers',
      price: 79,
      image: '/badge/mergesticker.jpeg',
      description: 'Clear transparent stickers with vibrant colors',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-yellow-50/30">
      {/* Background Effects */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-yellow-500/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-100px] right-[-200px] w-[600px] h-[600px] bg-orange-400/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-[-150px] w-[500px] h-[500px] bg-red-400/6 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 pt-24 px-4 sm:px-6 lg:px-10">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-700 hover:text-slate-900 font-semibold mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-slate-900 via-yellow-700 to-orange-700 bg-clip-text text-transparent tracking-tight mb-4">
            Stickers
          </h1>
          <p className="text-lg text-slate-600 font-semibold max-w-2xl mx-auto">
            High-quality sticker designs available in various formats
          </p>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-16">
          {stickerProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => navigate(`/stickers/${product.id}`)}
              className="bg-white rounded-2xl border-[2px] border-slate-200 overflow-hidden hover:shadow-lg hover:border-yellow-500 transition-all duration-300 group text-left"
            >
              {/* Image Container */}
              <div className="relative h-48 overflow-hidden bg-slate-100">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  {product.name}
                </h3>
                <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                  {product.description}
                </p>

                {/* Price */}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-yellow-600">
                    ₹{product.price}
                  </span>
                  <span className="text-yellow-600 font-semibold">
                    View Details →
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Stickers;
