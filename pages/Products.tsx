import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../config/api";

interface Product {
  _id: string;
  name: string;
  price: number;
  description: string;
  category: "Anime" | "Cartoon" | "Custom";
  image: string;
  stock: number;
}

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<"Anime" | "Cartoon" | "Custom" | "All">("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts =
    selectedCategory === "All"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  const categories = ["All", "Anime", "Cartoon", "Custom"] as const;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-2xl font-bold text-gray-600">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-black mb-2" style={{ WebkitTextStroke: '1px #6366F1' }}>
            Our Stickers Collection 🎨
          </h1>
          <p className="text-gray-600 text-lg font-medium">Awesome stickers for anime, cartoon & custom designs</p>
        </div>

        {/* Category Filter */}
        <div className="flex justify-center gap-3 mb-12 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-3 rounded-full font-bold transition-all border-2 ${
                selectedCategory === cat
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-[4px_4px_0px_#000]"
                  : "bg-white border-black text-black hover:bg-indigo-50 shadow-[2px_2px_0px_#000]"
              }`}
            >
              {cat === "Anime" && "🎌"}
              {cat === "Cartoon" && "🎬"}
              {cat === "Custom" && "✨"}
              {cat === "All" && "📦"} {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product._id}
                className="bg-white border-3 border-black rounded-2xl overflow-hidden hover:shadow-[8px_8px_0px_#000] transition-all transform hover:-translate-y-1"
              >
                {/* Image */}
                <div className="h-64 bg-gray-100 overflow-hidden border-b-3 border-black">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                  />
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  {/* Badge */}
                  <div className="flex items-center gap-2">
                    <span className="inline-block px-3 py-1 bg-indigo-100 border-2 border-indigo-600 rounded-full text-xs font-black text-indigo-600">
                      {product.category === "Anime" && "🎌"}
                      {product.category === "Cartoon" && "🎬"}
                      {product.category === "Custom" && "✨"} {product.category}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-black text-black line-clamp-2">{product.name}</h3>

                  {/* Description */}
                  <p className="text-gray-600 text-sm line-clamp-2">{product.description}</p>

                  {/* Price & Stock */}
                  <div className="flex justify-between items-center pt-2 border-t-2 border-gray-300">
                    <div>
                      <span className="text-4xl font-black text-indigo-600">₹{product.price}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600 font-bold">In Stock</p>
                      <p className={`text-2xl font-black ${product.stock > 0 ? "text-green-600" : "text-red-600"}`}>
                        {product.stock}
                      </p>
                    </div>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    disabled={product.stock === 0}
                    className={`w-full py-3 rounded-xl font-black text-white border-2 border-black transition-all shadow-[3px_3px_0px_#000] ${
                      product.stock > 0
                        ? "bg-indigo-600 hover:bg-indigo-700 hover:shadow-[5px_5px_0px_#000] cursor-pointer"
                        : "bg-gray-400 cursor-not-allowed opacity-50"
                    }`}
                  >
                    {product.stock > 0 ? "🛒 Add to Cart" : "❌ Out of Stock"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border-3 border-dashed border-gray-300">
            <p className="text-2xl font-bold text-gray-600 mb-2">📦 No products in this category</p>
            <p className="text-gray-500">Try selecting a different category</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;
