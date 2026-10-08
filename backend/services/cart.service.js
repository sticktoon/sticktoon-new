const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

/**
 * Helper to ensure a string or ObjectId is converted to an ObjectId if valid.
 */
function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (typeof id === "string" && mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return null;
}

/**
 * Add a product to the authenticated user's cart.
 * Always verifies stock, price, and existence directly from MongoDB.
 * Never trusts prices or stock supplied by AI.
 *
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} params.userId - Authenticated user ID (from req.user)
 * @param {string} params.productId - Product ID in MongoDB
 * @param {number} [params.quantity=1] - Desired quantity
 * @returns {Promise<Object>} Cart operation result
 */
async function addToCart({ userId, productId, quantity = 1 }) {
  if (!userId) {
    return {
      success: false,
      error: "AUTH_REQUIRED",
      message: "Please log in before adding products to your cart.",
    };
  }

  const userObjectId = toObjectId(userId);
  if (!userObjectId) {
    return {
      success: false,
      error: "INVALID_USER",
      message: "Please log in before adding products to your cart.",
    };
  }

  const productObjectId = toObjectId(productId);
  if (!productObjectId) {
    return {
      success: false,
      error: "INVALID_PRODUCT_ID",
      message: "Invalid product ID.",
    };
  }

  // 1. Fetch real product from MongoDB
  const product = await Product.findOne({
    _id: productObjectId,
    isActive: { $ne: false },
  }).lean();

  if (!product) {
    return {
      success: false,
      error: "PRODUCT_NOT_FOUND",
      message: "Product not found.",
    };
  }

  const availableStock = typeof product.stock === "number" ? product.stock : 0;
  if (availableStock <= 0) {
    return {
      success: false,
      error: "OUT_OF_STOCK",
      message: `Sorry, "${product.name}" is currently out of stock.`,
      availableStock: 0,
    };
  }

  const requestedQty = Math.max(1, parseInt(quantity, 10) || 1);

  // 2. Fetch or create user cart
  let cart = await Cart.findOne({ userId: userObjectId });
  if (!cart) {
    cart = new Cart({ userId: userObjectId, items: [] });
  }

  const existingItemIndex = cart.items.findIndex(
    (i) => String(i.id) === String(product._id)
  );

  const currentCartQty = existingItemIndex >= 0 ? cart.items[existingItemIndex].quantity : 0;
  const newTotalQty = currentCartQty + requestedQty;

  // 3. Stock validation against MongoDB
  if (newTotalQty > availableStock) {
    if (currentCartQty > 0) {
      return {
        success: false,
        error: "INSUFFICIENT_STOCK",
        message: `You already have ${currentCartQty} in your cart. Only ${availableStock} are currently available.`,
        availableStock,
        currentCartQty,
      };
    }
    return {
      success: false,
      error: "INSUFFICIENT_STOCK",
      message: `Only ${availableStock} are currently available.`,
      availableStock,
    };
  }

  // 4. Update cart with actual database values (price, name, image)
  const itemData = {
    id: String(product._id),
    name: product.name,
    price: product.price,
    basePrice: product.price,
    badgeStyle: "pin",
    quantity: newTotalQty,
    image: product.image || (Array.isArray(product.images) && product.images[0]) || "",
    printImage: product.printImage || "",
    category: product.category || "",
  };

  if (existingItemIndex >= 0) {
    cart.items[existingItemIndex].quantity = newTotalQty;
  } else {
    cart.items.push(itemData);
  }

  await cart.save();

  const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    success: true,
    action: "added",
    productName: product.name,
    addedQuantity: requestedQty,
    totalProductQuantity: newTotalQty,
    cart: {
      items: cart.items,
      total,
      totalItems,
    },
    message: `Done! I've added ${requestedQty > 1 ? requestedQty + " " : ""}"${product.name}" to your cart.`,
  };
}

/**
 * Remove a product from the authenticated user's cart.
 *
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @param {string} params.productId
 * @returns {Promise<Object>}
 */
async function removeFromCart({ userId, productId }) {
  if (!userId) {
    return {
      success: false,
      error: "AUTH_REQUIRED",
      message: "Please log in to manage your cart.",
    };
  }

  const userObjectId = toObjectId(userId);
  if (!userObjectId) {
    return {
      success: false,
      error: "INVALID_USER",
      message: "Please log in to manage your cart.",
    };
  }

  const cart = await Cart.findOne({ userId: userObjectId });
  if (!cart || cart.items.length === 0) {
    return {
      success: false,
      error: "CART_EMPTY",
      message: "Your cart is currently empty.",
    };
  }

  const itemIndex = cart.items.findIndex(
    (i) => String(i.id) === String(productId)
  );

  if (itemIndex < 0) {
    return {
      success: false,
      error: "ITEM_NOT_FOUND",
      message: "I couldn't find that product in your cart.",
    };
  }

  const removedItem = cart.items[itemIndex];
  cart.items.splice(itemIndex, 1);
  await cart.save();

  const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    success: true,
    action: "removed",
    productName: removedItem.name,
    cart: {
      items: cart.items,
      total,
      totalItems,
    },
    message: `Done! I've removed "${removedItem.name}" from your cart.`,
  };
}

/**
 * Get the authenticated user's cart contents.
 *
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @returns {Promise<Object>}
 */
async function getCart({ userId }) {
  if (!userId) {
    return {
      success: false,
      error: "AUTH_REQUIRED",
      message: "Please log in before viewing your cart.",
    };
  }

  const userObjectId = toObjectId(userId);
  if (!userObjectId) {
    return {
      success: false,
      error: "INVALID_USER",
      message: "Please log in before viewing your cart.",
    };
  }

  const cart = await Cart.findOne({ userId: userObjectId }).lean();
  const items = cart?.items || [];
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    success: true,
    items: items.map((i) => ({
      productId: i.id,
      id: i.id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      image: i.image,
      subtotal: i.price * i.quantity,
    })),
    total,
    totalItems,
  };
}

/**
 * Update quantity for a product in the user's cart.
 *
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} params.userId
 * @param {string} params.productId
 * @param {number} params.quantity
 * @returns {Promise<Object>}
 */
async function updateCartQuantity({ userId, productId, quantity }) {
  if (!userId) {
    return {
      success: false,
      error: "AUTH_REQUIRED",
      message: "Please log in to update your cart.",
    };
  }

  const userObjectId = toObjectId(userId);
  if (!userObjectId) {
    return {
      success: false,
      error: "INVALID_USER",
      message: "Please log in to update your cart.",
    };
  }

  const targetQty = parseInt(quantity, 10);
  if (isNaN(targetQty) || targetQty <= 0) {
    return removeFromCart({ userId, productId });
  }

  const productObjectId = toObjectId(productId);
  if (!productObjectId) {
    return {
      success: false,
      error: "INVALID_PRODUCT_ID",
      message: "Invalid product ID.",
    };
  }

  // Check product stock in MongoDB
  const product = await Product.findOne({
    _id: productObjectId,
    isActive: { $ne: false },
  }).lean();

  if (!product) {
    return {
      success: false,
      error: "PRODUCT_NOT_FOUND",
      message: "Product not found.",
    };
  }

  const availableStock = typeof product.stock === "number" ? product.stock : 0;
  if (targetQty > availableStock) {
    return {
      success: false,
      error: "INSUFFICIENT_STOCK",
      message: `Only ${availableStock} are currently available.`,
      availableStock,
    };
  }

  const cart = await Cart.findOne({ userId: userObjectId });
  if (!cart) {
    return {
      success: false,
      error: "CART_NOT_FOUND",
      message: "Cart not found.",
    };
  }

  const itemIndex = cart.items.findIndex(
    (i) => String(i.id) === String(productId)
  );

  if (itemIndex < 0) {
    return {
      success: false,
      error: "ITEM_NOT_FOUND",
      message: "I couldn't find that product in your cart.",
    };
  }

  cart.items[itemIndex].quantity = targetQty;
  await cart.save();

  const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    success: true,
    action: "updated",
    productName: cart.items[itemIndex].name,
    quantity: targetQty,
    cart: {
      items: cart.items,
      total,
      totalItems,
    },
    message: `Done! Updated quantity of "${cart.items[itemIndex].name}" to ${targetQty}.`,
  };
}

module.exports = {
  addToCart,
  removeFromCart,
  getCart,
  updateCartQuantity,
};
