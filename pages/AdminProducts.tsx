import React, { useState, useEffect, useMemo } from "react";
import { Plus, Edit2, Trash2, X, AlertCircle, Info, CheckCircle, Upload } from "lucide-react";
import AdminBackButton from "./AdminBackButton";
import { API_BASE_URL } from "../config/api";
import { BADGES } from "../constants";

type AdminProductCategory =
  | "Positive Vibes"
  | "Moody"
  | "Sports"
  | "Religious"
  | "Entertainment"
  | "Events"
  | "Animal"
  | "Couple"
  | "Anime"
  | "Custom";

interface ComboItem {
  id: string;
  name: string;
  image: string;
}

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: AdminProductCategory;
  subcategory: string;
  image: string;
  printImage?: string;
  images?: string[];
  stock: number;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  sku?: string;
  isCombo?: boolean;
  comboItems?: ComboItem[];
  createdAt: string;
  isPlaceholder?: boolean;
}

type ComboItemForm = {
  id: string;
  name: string;
  image: string;
};

type ProductFormState = {
  name: string;
  description: string;
  price: number;
  category: AdminProductCategory;
  subcategory: string;
  image: string;
  printImage: string;
  images: string[];
  stock: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  sku: string;
  isCombo: boolean;
  comboItems: ComboItemForm[];
};

interface Toast {
  id: number;
  type: "success" | "error" | "info" | "warning";
  message: string;
  isExiting?: boolean;
}

const ADMIN_PRODUCT_CATEGORIES: AdminProductCategory[] = [
  "Positive Vibes",
  "Moody",
  "Sports",
  "Religious",
  "Entertainment",
  "Events",
  "Animal",
  "Couple",
  "Anime",
  "Custom",
];

const ADMIN_PRODUCT_CATEGORY_OPTIONS: {
  value: AdminProductCategory;
  label: string;
  emoji: string;
}[] = [
  { value: "Positive Vibes", label: "Positive Vibes", emoji: "✨" },
  { value: "Moody", label: "Moody", emoji: "😊" },
  { value: "Sports", label: "Sports", emoji: "🏆" },
  { value: "Religious", label: "Religious", emoji: "🕉️" },
  { value: "Entertainment", label: "Entertainment", emoji: "🎭" },
  { value: "Events", label: "Events", emoji: "🎉" },
  { value: "Animal", label: "Animal", emoji: "🐾" },
  { value: "Couple", label: "Couple", emoji: "💑" },
  { value: "Anime", label: "Anime", emoji: "🎌" },
  { value: "Custom", label: "Custom", emoji: "✨" },
];

const ADMIN_PRODUCT_SUBCATEGORY_SUGGESTIONS: Record<
  AdminProductCategory,
  string[]
> = {
  "Positive Vibes": ["Motivational", "Quotes", "Self Love", "Success"],
  Moody: ["Attitude", "Dark", "Introvert", "Aesthetic"],
  Sports: ["Cricket", "Football", "Gym", "Esports"],
  Religious: ["Festival", "Devotional", "Temple", "Spiritual"],
  Entertainment: ["Movies", "Music", "Memes", "Celebrities"],
  Events: ["Birthday", "Wedding", "Party", "College"],
  Animal: ["Dog", "Cat", "Bird", "Wildlife"],
  Couple: ["Anniversary", "Love Quotes", "Long Distance", "Cute"],
  Anime: ["Shonen", "Shojo", "Classic", "Manga"],
  Custom: ["Name", "Logo", "Photo", "Bulk"],
};

const normalizeCategory = (value?: string) => {
  if (!value) return value;
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  const map: Record<string, string> = {
    "positive vibe": "Positive Vibes",
    "positive vibes": "Positive Vibes",
    "positive-vibes": "Positive Vibes",
    positive_vibes: "Positive Vibes",
    moody: "Moody",
    sports: "Sports",
    religious: "Religious",
    entertainment: "Entertainment",
    events: "Events",
    animal: "Animal",
    pet: "Animal",
    couple: "Couple",
    anime: "Anime",
    custom: "Custom",
  };

  return map[lower] || trimmed;
};

const sanitizeProductSubcategory = (value?: string) => {
  if (!value) return "";
  return value.trim().slice(0, 60);
};

const sanitizeProductImagePath = (value?: string) => {
  if (!value) return "";

  let normalized = value.trim();
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized) || /^data:/i.test(normalized)) {
    return normalized;
  }

  normalized = normalized.replace(/\\/g, "/").replace(/\/+/g, "/");
  const lower = normalized.toLowerCase();

  if (lower.includes("/public/")) {
    normalized = normalized.slice(lower.lastIndexOf("/public/") + "/public".length);
  } else if (lower.startsWith("public/")) {
    normalized = normalized.slice("public".length);
  } else if (lower.startsWith("./public/")) {
    normalized = normalized.slice("./public".length);
  }

  normalized = normalized.replace(/^\.\//, "");

  if (!normalized.startsWith("/") && /^(badge|images|sticker)\//i.test(normalized)) {
    normalized = `/${normalized}`;
  }

  if (!normalized.startsWith("/")) {
    normalized = `/badge/${normalized}`;
  }

  return normalized;
};

const createDefaultProductForm = (
  category: AdminProductCategory = "Moody",
): ProductFormState => ({
  name: "",
  description: "",
  price: 0,
  category,
  subcategory: "",
  image: "",
  printImage: "",
  images: [],
  stock: 0,
  weight: 0.1,
  length: 10,
  width: 10,
  height: 5,
  sku: "",
  isCombo: false,
  comboItems: [],
});

const normalizeAdminProduct = (product: Product): Product => {
  const normalizedCategory = normalizeCategory(product.category) as
    | AdminProductCategory
    | undefined;

  return {
    ...product,
    category:
      normalizedCategory && ADMIN_PRODUCT_CATEGORIES.includes(normalizedCategory)
        ? normalizedCategory
        : "Moody",
    subcategory: sanitizeProductSubcategory(product.subcategory),
    image: sanitizeProductImagePath(product.image),
    isCombo: Boolean(product.isCombo),
    comboItems: Array.isArray(product.comboItems)
      ? product.comboItems.map((item) => ({
          ...item,
          image: sanitizeProductImagePath(item.image),
        }))
      : [],
  };
};

const PLACEHOLDER_IMAGE = "/badge/placeholder.png";

const ensureMinimumProductsPerCategory = (
  items: Product[],
  minCount = 4,
): Product[] => {
  const result: Product[] = [...items];

  ADMIN_PRODUCT_CATEGORIES.forEach((category) => {
    const current = result.filter((p) => p.category === category);
    if (current.length >= minCount) return;

    const fallbackBadges = BADGES.filter((b) => b.category === category);
    const needed = minCount - current.length;
    const existingNames = new Set(current.map((p) => p.name));
    const toAdd = fallbackBadges
      .filter((b) => !existingNames.has(b.name))
      .slice(0, needed)
      .map((b, index) => ({
        _id: `placeholder-${category}-${b.id}-${index}`,
        name: b.name,
        description: b.details || "",
        price: b.price,
        category: category as AdminProductCategory,
        image: b.image,
        stock: 0,
        createdAt: "1970-01-01T00:00:00.000Z",
        isPlaceholder: true,
      }));

    if (toAdd.length === 0 && current.length < minCount) {
      const fillerNeeded = minCount - current.length;
      for (let i = 0; i < fillerNeeded; i += 1) {
        result.push({
          _id: `placeholder-${category}-generic-${i}`,
          name: `${category} Badge`,
          description: "",
          price: 0,
          category: category as AdminProductCategory,
          image: PLACEHOLDER_IMAGE,
          stock: 0,
          createdAt: "1970-01-01T00:00:00.000Z",
          isPlaceholder: true,
        });
      }
      return;
    }

    result.push(...toAdd);
  });

  return result;
};

const ComboPackPicker = ({
  form,
  setForm,
  options,
  theme,
}: {
  form: ProductFormState;
  setForm: React.Dispatch<React.SetStateAction<ProductFormState>>;
  options: Product[];
  theme: "light" | "dark";
}) => {
  const [search, setSearch] = useState("");
  const dark = theme === "dark";

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((item) => item.name.toLowerCase().includes(query));
  }, [options, search]);

  const selectedIds = new Set(form.comboItems.map((item) => item.id));

  const toggleItem = (product: Product) => {
    setForm((prev) =>
      prev.comboItems.some((item) => item.id === product._id)
        ? {
            ...prev,
            comboItems: prev.comboItems.filter((item) => item.id !== product._id),
          }
        : {
            ...prev,
            comboItems: [
              ...prev.comboItems,
              { id: product._id, name: product.name, image: product.image },
            ],
          },
    );
  };

  return (
    <div
      className={`md:col-span-2 border-t pt-4 mt-2 ${dark ? "border-white/10" : "border-gray-200"}`}
    >
      <label className="inline-flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isCombo}
          onChange={(e) => setForm((prev) => ({ ...prev, isCombo: e.target.checked }))}
          className="w-4 h-4 accent-indigo-600 animate-none"
        />
        <span className={`text-sm font-bold ${dark ? "text-white" : "text-gray-900"}`}>
          🎁 This is a Combo Pack
        </span>
        <span className={`text-xs font-normal ${dark ? "text-gray-400" : "text-gray-500"}`}>
          (bundles several badges under one price)
        </span>
      </label>

      {form.isCombo && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search badges to include…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={
                dark
                  ? "flex-1 min-w-[200px] px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 text-sm focus:border-indigo-500 focus:outline-none"
                  : "flex-1 min-w-[200px] px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:border-indigo-500 focus:outline-none"
              }
            />
            <span
              className={`text-xs font-semibold ${dark ? "text-indigo-200" : "text-indigo-600"}`}
            >
              {form.comboItems.length} selected
            </span>
          </div>

          {options.length === 0 ? (
            <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
              No other products available to bundle yet. Add some badges first.
            </p>
          ) : (
            <div
              className={`max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 rounded-lg border p-2 ${
                dark ? "border-white/20 bg-white/5" : "border-gray-200 bg-gray-50"
              }`}
            >
              {filtered.map((product) => {
                const checked = selectedIds.has(product._id);
                return (
                  <label
                    key={product._id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer border transition-all ${
                      checked
                        ? dark
                          ? "border-indigo-400/60 bg-indigo-500/20"
                          : "border-indigo-300 bg-indigo-50"
                        : dark
                          ? "border-transparent hover:bg-white/10"
                          : "border-transparent hover:bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleItem(product)}
                      className="w-4 h-4 accent-indigo-600 shrink-0"
                    />
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-8 h-8 rounded object-cover shrink-0"
                    />
                    <span
                      className={`text-xs font-semibold truncate ${dark ? "text-gray-100" : "text-gray-800"}`}
                    >
                      {product.name}
                    </span>
                  </label>
                );
              })}
              {filtered.length === 0 && (
                <p
                  className={`col-span-full py-3 text-center text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}
                >
                  No badges match “{search}”.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const hasValidImage = (image?: string) => {
  if (!image) return false;
  const trimmed = image.trim();
  if (!trimmed) return false;
  if (trimmed === "undefined" || trimmed === "null") return false;
  return true;
};

export default function AdminProducts() {
  const token = localStorage.getItem("adminToken") || localStorage.getItem("token");

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [confirmingDeleteProduct, setConfirmingDeleteProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(createDefaultProductForm());
  const [isCustomSubcategory, setIsCustomSubcategory] = useState(false);
  const [uploadingImageField, setUploadingImageField] = useState<null | "image" | "printImage">(null);
  const [uploadingGalleryImage, setUploadingGalleryImage] = useState(false);

  // Toast notifications state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastIdCounter, setToastIdCounter] = useState(0);

  const showToast = (type: "success" | "error" | "info" | "warning", message: string) => {
    const id = toastIdCounter;
    setToastIdCounter((prev) => prev + 1);
    const newToast: Toast = { id, type, message };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 5000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  };

  const fetchProductsData = async () => {
    setLoading(true);
    try {
      const productsRes = await fetch(`${API_BASE_URL}/api/products?all=true`, {
        cache: "no-store",
      });
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(
          (Array.isArray(data.products) ? data.products : []).map((item: Product) =>
            normalizeAdminProduct(item),
          ),
        );
      } else {
        showToast("error", "❌ Failed to fetch products");
      }
    } catch (err) {
      console.error("Fetch products error:", err);
      showToast("error", "❌ Error loading products from server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsData();
  }, []);

  const productsForDisplay = ensureMinimumProductsPerCategory(products);

  const comboPickerOptions = useMemo(
    () =>
      products.filter(
        (product) =>
          !product.isPlaceholder && !product.isCombo && product._id !== editingProduct?._id,
      ),
    [products, editingProduct],
  );

  const availableSubcategories = useMemo(() => {
    const currentCategory = productForm.category;
    if (!currentCategory) return [];
    const fromProducts = products
      .filter((p) => p.category === currentCategory && p.subcategory)
      .map((p) => p.subcategory!.trim());
    const fromSuggestions = ADMIN_PRODUCT_SUBCATEGORY_SUGGESTIONS[currentCategory] || [];
    return Array.from(new Set([...fromProducts, ...fromSuggestions])).filter(Boolean);
  }, [productForm.category, products]);

  const handleProductImageUpload = async (file: File, field: "image" | "printImage") => {
    if (!token) {
      showToast("error", "❌ Session expired. Please log in again.");
      return;
    }

    setUploadingImageField(field);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("category", "badge");

      const res = await fetch(`${API_BASE_URL}/api/admin/images/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data?.success) {
        const cloudinaryUrl = data.data?.cloudinaryUrl;
        if (!cloudinaryUrl) {
          showToast("error", "❌ Cloudinary upload failed. URL not found in response.");
          return;
        }
        setProductForm((prev) => ({ ...prev, [field]: cloudinaryUrl }));
        showToast(
          "success",
          `✅ ${field === "printImage" ? "Print" : "Display"} image uploaded successfully!`,
        );
      } else {
        showToast("error", `❌ ${data?.message || "Image upload failed"}`);
      }
    } catch (err) {
      console.error("Product image upload error:", err);
      showToast("error", "❌ Image upload failed. Please try again.");
    } finally {
      setUploadingImageField(null);
    }
  };

  const handleGalleryImageUpload = async (file: File) => {
    if (!token) {
      showToast("error", "❌ Session expired. Please log in again.");
      return;
    }

    setUploadingGalleryImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("category", "badge");

      const res = await fetch(`${API_BASE_URL}/api/admin/images/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data?.success) {
        const cloudinaryUrl = data.data?.cloudinaryUrl;
        if (!cloudinaryUrl) {
          showToast("error", "❌ Cloudinary upload failed.");
          return;
        }
        setProductForm((prev) => ({ ...prev, images: [...prev.images, cloudinaryUrl] }));
        showToast("success", "✅ Gallery image uploaded successfully!");
      } else {
        showToast("error", `❌ ${data?.message || "Image upload failed"}`);
      }
    } catch (err) {
      console.error("Gallery image upload error:", err);
      showToast("error", "❌ Image upload failed. Please try again.");
    } finally {
      setUploadingGalleryImage(false);
    }
  };

  const handleRemoveGalleryImage = (index: number) => {
    setProductForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleRemoveProductImage = (field: "image" | "printImage") => {
    setProductForm((prev) => ({ ...prev, [field]: "" }));
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const payload = {
      ...productForm,
      category: normalizeCategory(productForm.category),
      subcategory: sanitizeProductSubcategory(productForm.subcategory),
      image: sanitizeProductImagePath(productForm.image),
      printImage: sanitizeProductImagePath(productForm.printImage),
      images: productForm.images.map((img) => sanitizeProductImagePath(img)).filter(Boolean),
      isCombo: productForm.isCombo,
      comboItems: productForm.isCombo ? productForm.comboItems : [],
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setProducts((prev) => [...prev, normalizeAdminProduct(data)]);
        setProductForm(createDefaultProductForm());
        setShowProductForm(false);
        showToast("success", "✅ Product added successfully!");
      } else {
        const errorData = await res.json();
        showToast("error", `❌ ${errorData.error || "Failed to add product"}`);
      }
    } catch (err) {
      console.error("Error adding product:", err);
      showToast("error", "❌ Error adding product. Please try again.");
    }
  };

  const handleUpdateProduct = async (productId: string) => {
    if (!token) return;

    const payload = {
      ...productForm,
      category: normalizeCategory(productForm.category),
      subcategory: sanitizeProductSubcategory(productForm.subcategory),
      image: sanitizeProductImagePath(productForm.image),
      printImage: sanitizeProductImagePath(productForm.printImage),
      images: productForm.images.map((img) => sanitizeProductImagePath(img)).filter(Boolean),
      isCombo: productForm.isCombo,
      comboItems: productForm.isCombo ? productForm.comboItems : [],
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setProducts((prevProducts) =>
          prevProducts.map((p) => (p._id === productId ? normalizeAdminProduct(data) : p)),
        );
        setEditingProduct(null);
        setProductForm(createDefaultProductForm());
        showToast("success", "✅ Product updated successfully!");
      } else {
        const errorData = await res.json();
        showToast("error", `❌ ${errorData.error || "Failed to update product"}`);
      }
    } catch (err) {
      console.error("Error updating product:", err);
      showToast("error", "❌ Error updating product. Please try again.");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p._id !== productId));
        setConfirmingDeleteProduct(null);
        showToast("success", "✅ Product deleted successfully!");
      } else {
        const errorData = await res.json();
        showToast("error", `❌ ${errorData.error || "Failed to delete product"}`);
      }
    } catch (err) {
      console.error("Error deleting product:", err);
      showToast("error", "❌ Error deleting product. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-10">
      <div className="max-w-[1400px] mx-auto">
        <AdminBackButton />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900">
              Product Management
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-500">
              Add, edit, and categorize Sticktoon products and bundle combos
            </p>
          </div>

          <button
            onClick={() => {
              setShowProductForm(!showProductForm);
              setEditingProduct(null);
              setProductForm(createDefaultProductForm());
              setIsCustomSubcategory(false);
            }}
            className="group flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold tracking-wide transition-all shadow-md hover:shadow-lg active:scale-95 text-sm"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            Add Product
          </button>
        </div>

        {/* Add/Edit Product Form Wrapper */}
        {(showProductForm || editingProduct) && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-md mb-8 animate-fadeIn">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                {editingProduct ? "✏️ Edit Product" : "Add New Product"}
              </h3>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingProduct) {
                  handleUpdateProduct(editingProduct._id);
                } else {
                  handleAddProduct(e);
                }
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <div>
                <label className="block text-gray-700 font-bold text-sm mb-2">
                  Product Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Anime Sticker Set"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold text-sm mb-2">
                  Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="499"
                  value={productForm.price || ""}
                  onChange={(e) =>
                    setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })
                  }
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold text-sm mb-2">
                  Category
                </label>
                <select
                  value={productForm.category}
                  onChange={(e) => {
                    const nextCategory = e.target.value as AdminProductCategory;
                    setProductForm({
                      ...productForm,
                      category: nextCategory,
                      subcategory: "",
                    });
                  }}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300 cursor-pointer"
                >
                  {ADMIN_PRODUCT_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.emoji} {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-bold text-sm mb-2">
                  Subcategory
                </label>
                <div className="space-y-3">
                  <select
                    value={isCustomSubcategory ? "custom-new" : productForm.subcategory}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "custom-new") {
                        setIsCustomSubcategory(true);
                        setProductForm({ ...productForm, subcategory: "" });
                      } else {
                        setIsCustomSubcategory(false);
                        setProductForm({ ...productForm, subcategory: val });
                      }
                    }}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300 cursor-pointer"
                  >
                    <option value="">-- No Subcategory / Select Available --</option>
                    {availableSubcategories.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                    <option value="custom-new" className="font-bold text-indigo-600">
                      ➕ Create New Subcategory
                    </option>
                  </select>

                  {isCustomSubcategory && (
                    <input
                      type="text"
                      placeholder="Type new subcategory name"
                      value={productForm.subcategory}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          subcategory: sanitizeProductSubcategory(e.target.value),
                        })
                      }
                      required
                      className="w-full px-4 py-3 bg-white border border-indigo-400 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300 animate-fadeIn"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold text-sm mb-2">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  placeholder="100"
                  value={productForm.stock || ""}
                  onChange={(e) =>
                    setProductForm({ ...productForm, stock: parseInt(e.target.value) || 0 })
                  }
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold text-sm mb-2">
                  SKU (Shiprocket)
                </label>
                <input
                  type="text"
                  placeholder="e.g., STK-ANIME-01"
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300"
                />
              </div>

              <div className="md:col-span-2 border-t border-slate-200 pt-4 mt-2">
                <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  📦 Shipping Parameters (Shiprocket)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-gray-700 font-semibold text-xs mb-1.5">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={productForm.weight}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          weight: parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold text-xs mb-1.5">
                      Length (cm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={productForm.length}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          length: parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold text-xs mb-1.5">
                      Width (cm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={productForm.width}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          width: parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold text-xs mb-1.5">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={productForm.height}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          height: parseFloat(e.target.value) || 0,
                        })
                      }
                      required
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 font-bold text-sm mb-2">
                    ADV Image <span className="font-normal text-gray-400">(shown to storefront)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="/badge/image.png or URL"
                    value={productForm.image}
                    onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300"
                  />
                  <label className="mt-2 inline-flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-indigo-700 font-semibold text-xs cursor-pointer transition-all">
                    {uploadingImageField === "image" ? "Uploading…" : "⬆ Upload ADV image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingImageField !== null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProductImageUpload(file, "image");
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {productForm.image && (
                    <div className="relative mt-2 w-20 h-20">
                      <img
                        src={productForm.image}
                        alt="ADV preview"
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveProductImage("image")}
                        title="Remove ADV image"
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-gray-700 font-bold text-sm mb-2">
                    Print Image <span className="font-normal text-gray-400">(artwork file, optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Print-ready artwork URL (optional)"
                    value={productForm.printImage}
                    onChange={(e) => setProductForm({ ...productForm, printImage: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200 outline-none transition-all duration-300"
                  />
                  <label className="mt-2 inline-flex items-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-amber-700 font-semibold text-xs cursor-pointer transition-all">
                    {uploadingImageField === "printImage" ? "Uploading…" : "⬆ Upload print image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingImageField !== null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProductImageUpload(file, "printImage");
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {productForm.printImage && (
                    <div className="relative mt-2 w-20 h-20">
                      <img
                        src={productForm.printImage}
                        alt="Print preview"
                        className="w-20 h-20 object-cover rounded-lg border border-amber-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveProductImage("printImage")}
                        title="Remove print image"
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-700 font-bold text-sm mb-2">
                  Extra Preview Images <span className="font-normal text-gray-400">(gallery display)</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {productForm.images.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20">
                      <img
                        src={img}
                        alt={`Gallery preview ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(idx)}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <label className="w-20 h-20 flex items-center justify-center gap-1 bg-indigo-50 hover:bg-indigo-100 border border-dashed border-indigo-300 rounded-lg text-indigo-700 font-semibold text-[10px] text-center cursor-pointer transition-all px-1">
                    {uploadingGalleryImage ? "Uploading…" : "⬆ Add image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingGalleryImage}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleGalleryImageUpload(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

              <ComboPackPicker
                form={productForm}
                setForm={setProductForm}
                options={comboPickerOptions}
                theme="light"
              />

              <div className="md:col-span-2">
                <label className="block text-gray-700 font-bold text-sm mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Describe the product..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none transition-all duration-300 resize-none"
                />
              </div>

              <div className="md:col-span-2 flex gap-4 mt-4">
                <button
                  type="submit"
                  className="flex-1 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-bold transition-all duration-300 shadow-md hover:shadow-lg active:scale-95"
                >
                  {editingProduct ? "💾 Update Product" : "➕ Add Product"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProductForm(false);
                    setEditingProduct(null);
                    setProductForm(createDefaultProductForm());
                    setIsCustomSubcategory(false);
                  }}
                  className="px-8 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-gray-700 font-bold transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Products Grid by Category */}
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Loading products...</p>
          </div>
        ) : products.length > 0 ? (
          <div className="space-y-8">
            {ADMIN_PRODUCT_CATEGORIES.map((category) => {
              const categoryProducts = productsForDisplay.filter(
                (p) => p.category === category && (p.isPlaceholder || hasValidImage(p.image)),
              );
              if (categoryProducts.length === 0) return null;

              return (
                <div key={category} className="animate-fadeIn">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center text-2xl">
                      {category === "Positive Vibes" && "✨"}
                      {category === "Moody" && "😊"}
                      {category === "Sports" && "🏆"}
                      {category === "Religious" && "🕉️"}
                      {category === "Entertainment" && "🎭"}
                      {category === "Events" && "🎉"}
                      {category === "Animal" && "🐾"}
                      {category === "Couple" && "💑"}
                      {category === "Anime" && "🎌"}
                      {category === "Custom" && "✨"}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{category}</h3>
                      <p className="text-gray-500 text-sm">
                        {categoryProducts.length}{" "}
                        {categoryProducts.length === 1 ? "product" : "products"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {categoryProducts.map((product) => (
                      <div
                        key={product._id}
                        className="group bg-white border border-slate-200 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] flex flex-col"
                      >
                        {/* Image Container */}
                        <div className="relative h-56 bg-gray-50 overflow-hidden">
                          <img
                            src={product.image || PLACEHOLDER_IMAGE}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                              if (e.currentTarget.src.endsWith(PLACEHOLDER_IMAGE)) return;
                              e.currentTarget.src = PLACEHOLDER_IMAGE;
                            }}
                          />
                          {/* Stock badge overlay */}
                          <div className="absolute top-3 right-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                product.stock > 0
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }`}
                            >
                              {product.isPlaceholder ? "Sample" : `${product.stock} in stock`}
                            </span>
                          </div>
                          {product.isCombo && (
                            <div className="absolute top-3 left-3">
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                🎁 Combo ({product.comboItems?.length ?? 0})
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Description Section */}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                          <div className="space-y-1">
                            <h4 className="text-gray-900 font-bold text-base line-clamp-1 leading-tight">
                              {product.name}
                            </h4>
                            <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed">
                              {product.description || "No description provided."}
                            </p>
                            {product.subcategory && (
                              <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 mt-2">
                                {product.subcategory}
                              </p>
                            )}
                          </div>

                          <div className="pt-2">
                            <p className="text-2xl font-black text-indigo-600">₹{product.price}</p>

                            {product.isPlaceholder ? (
                              <div className="mt-3 py-2 bg-gray-100 rounded-lg text-gray-500 font-bold text-xs text-center border">
                                Sample Item
                              </div>
                            ) : (
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => {
                                    setEditingProduct(product);
                                    setProductForm({
                                      name: product.name,
                                      description: product.description,
                                      price: product.price,
                                      category: product.category,
                                      subcategory: sanitizeProductSubcategory(product.subcategory),
                                      image: product.image,
                                      printImage: product.printImage ?? "",
                                      images: product.images ?? [],
                                      stock: product.stock,
                                      weight: product.weight ?? 0.1,
                                      length: product.length ?? 10,
                                      width: product.width ?? 10,
                                      height: product.height ?? 5,
                                      sku: product.sku ?? "",
                                      isCombo: Boolean(product.isCombo),
                                      comboItems: product.comboItems ?? [],
                                    });
                                    setIsCustomSubcategory(false);
                                    setShowProductForm(false);
                                  }}
                                  className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-700 font-bold text-xs transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => setConfirmingDeleteProduct(product)}
                                  className="flex-1 py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-700 font-bold text-xs transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1"
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center shadow-sm">
            <p className="text-gray-500 text-lg">
              📦 No products yet. Add your first product to get started!
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmingDeleteProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all duration-300">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center border border-red-200 text-red-500">
                <AlertCircle className="w-8 h-8" />
              </div>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-gray-900 font-bold text-xl mb-2">Delete Product?</h3>
              <p className="text-slate-600 font-semibold text-sm mb-2">
                {confirmingDeleteProduct.name}
              </p>
              <p className="text-indigo-600 font-bold text-sm">₹{confirmingDeleteProduct.price}</p>
              <p className="text-gray-500 text-xs mt-4 pt-4 border-t border-slate-100">
                ⚠️ This action cannot be undone. The product will be deleted permanently.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleDeleteProduct(confirmingDeleteProduct._id)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-bold transition-all"
              >
                Delete Permanently
              </button>
              <button
                onClick={() => setConfirmingDeleteProduct(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 border rounded-lg text-gray-700 font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications Container */}
      <div className="fixed top-4 left-3 right-3 sm:top-6 sm:left-auto sm:right-6 z-[9999] space-y-3 max-w-md sm:w-full">
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle className="w-5 h-5 text-green-500" />,
            error: <AlertCircle className="w-5 h-5 text-red-500" />,
            info: <Info className="w-5 h-5 text-blue-500" />,
            warning: <AlertCircle className="w-5 h-5 text-yellow-500" />,
          };

          const colors = {
            success: "bg-green-50 border-green-200 text-green-800 shadow-md",
            error: "bg-red-50 border-red-200 text-red-800 shadow-md",
            info: "bg-blue-50 border-blue-200 text-blue-800 shadow-md",
            warning: "bg-yellow-50 border-yellow-200 text-yellow-800 shadow-md",
          };

          return (
            <div
              key={toast.id}
              className={`
                flex items-start gap-3 border rounded-xl p-4 pr-10 relative transition-transform duration-200
                ${colors[toast.type]}
                ${toast.isExiting ? "animate-slideOutRight" : "animate-slideInRight"}
              `}
            >
              <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
              <p className="font-semibold text-sm leading-relaxed flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="absolute top-3 right-3 w-6 h-6 rounded-md hover:bg-black/5 flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4 text-gray-500 hover:text-gray-800" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
