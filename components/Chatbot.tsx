import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  X,
  Send,
  Bot,
  Sparkles,
  Loader2,
  ExternalLink,
  ShoppingCart,
  Package,
  Truck,
  Clock,
} from 'lucide-react';
import {
  sendChatMessage,
  streamChatMessage,
  ChatProduct,
  CartSummary,
  ChatOrder,
  ChatHistoryMessage,
} from '../services/chatService';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  products?: ChatProduct[];
  cart?: CartSummary | null;
  orders?: ChatOrder[];
  timestamp: Date;
}

interface ChatbotProps {
  addToCart?: (badge: any, quantity?: number) => void | Promise<void>;
  onOpenCart?: () => void;
}

/**
 * Clean any accidental raw Markdown markers from text (bold **, italics *, backticks `, bullets *).
 * Preserves clean plain text while keeping URLs and numbers intact.
 */
const cleanMarkdownText = (text: string): string => {
  if (!text) return '';
  return text
    // Replace **bold** with bold
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // Replace __bold__ with bold
    .replace(/__(.*?)__/g, '$1')
    // Replace ~~strikethrough~~ with strikethrough
    .replace(/~~(.*?)~~/g, '$1')
    // Replace inline `code` with code
    .replace(/`([^`]+)`/g, '$1')
    // Strip bullet points at line starts (* or -) into clean plain text
    .replace(/^[\s]*[\*\-]\s+/gm, '')
    // Replace single asterisk/underscore formatting (*word* -> word)
    .replace(/(^|\s)\*([^\*\s]+)\*(\s|$)/g, '$1$2$3')
    .replace(/(^|\s)_([^_\s]+)_(\s|$)/g, '$1$2$3')
    .trim();
};

export const Chatbot: React.FC<ChatbotProps> = ({ addToCart, onOpenCart }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "👋 Hi! I'm your StickToon AI assistant. Looking for anime stickers, cool badges, order tracking, or want to manage your cart? Ask me anything!",
      timestamp: new Date(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  const handleSend = async (messageToSend?: string) => {
    const text = (messageToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    // Extract recent conversation history (sliding window of max 6 messages)
    const history: ChatHistoryMessage[] = messages
      .filter((m) => m.id !== 'welcome')
      .slice(-6)
      .map((m) => ({
        role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.text,
      }));

    const botMsgId = `bot-${Date.now()}`;
    let accumulatedText = '';
    let hasStreamed = false;

    // Create a streaming bot placeholder
    const streamingBotMessage: Message = {
      id: botMsgId,
      sender: 'bot',
      text: '',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage, streamingBotMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      await streamChatMessage(text, history, {
        onChunk: (chunk) => {
          hasStreamed = true;
          accumulatedText += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMsgId ? { ...msg, text: cleanMarkdownText(accumulatedText) } : msg
            )
          );
        },
        onDone: (data) => {
          if (data.cart) {
            window.dispatchEvent(new Event('cart-updated'));
          }

          const rawText =
            accumulatedText ||
            data.reply ||
            (data.products && data.products.length > 0
              ? 'Here are some products from our catalog.'
              : data.orders && data.orders.length > 0
              ? `I found ${data.orders.length === 1 ? 'your order' : 'your recent orders'}.`
              : data.cart
              ? `Your cart currently has ${data.cart.totalItems || 0} item${data.cart.totalItems === 1 ? '' : 's'}.`
              : "I couldn't find any information matching your request.");

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMsgId
                ? {
                    ...msg,
                    text: cleanMarkdownText(rawText),
                    products: Array.isArray(data.products) ? data.products : [],
                    cart: data.cart || null,
                    orders: Array.isArray(data.orders) && data.orders.length > 0 ? data.orders : undefined,
                  }
                : msg
            )
          );
        },
        onError: async (err) => {
          console.warn('Stream failed or unavailable, falling back to standard POST:', err);
          if (!hasStreamed) {
            const data = await sendChatMessage(text, history);
            if (data.cart) {
              window.dispatchEvent(new Event('cart-updated'));
            }

            const rawText =
              data.reply ||
              (data.products && data.products.length > 0
                ? 'Here are some products from our catalog.'
                : data.orders && data.orders.length > 0
                ? `I found ${data.orders.length === 1 ? 'your order' : 'your recent orders'}.`
                : data.cart
                ? `Your cart currently has ${data.cart.totalItems || 0} item${data.cart.totalItems === 1 ? '' : 's'}.`
                : "I couldn't find any information matching your request.");

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMsgId
                  ? {
                      ...msg,
                      text: cleanMarkdownText(rawText),
                      products: Array.isArray(data.products) ? data.products : [],
                      cart: data.cart || null,
                      orders: Array.isArray(data.orders) && data.orders.length > 0 ? data.orders : undefined,
                    }
                  : msg
              )
            );
          }
        },
      });
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? {
                ...msg,
                text: 'Sorry, I am having trouble connecting right now. Please try again in a moment!',
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleViewProduct = (product: ChatProduct) => {
    const isSticker = (product.type || '').toLowerCase().includes('sticker');
    const path = isSticker ? `/stickers/${product.id}` : `/badge/${product.id}`;
    navigate(path);
  };

  const handleAddToCart = async (product: ChatProduct) => {
    if (addToCart) {
      await addToCart(product, 1);
    }
  };

  const quickPrompts = [
    'Show me anime stickers',
    'Where is my order?',
    "What's in my cart?",
    'Stickers under ₹150',
  ];

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-3 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 group font-bold border-2 border-black"
          aria-label="Open AI Shopping Assistant"
        >
          <div className="relative">
            <Bot className="w-6 h-6 animate-bounce" />
            <Sparkles className="w-3 h-3 text-amber-700 absolute -top-1 -right-1" />
          </div>
          <span className="hidden sm:inline text-sm font-black tracking-wide">
            Chat with AI
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[600px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border-2 border-black flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-yellow-400 px-4 py-3.5 border-b-2 border-black flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-black text-yellow-400 flex items-center justify-center font-black shadow-inner">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-black text-sm tracking-wide flex items-center gap-1.5 leading-none">
                  StickToon AI
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </h3>
                <p className="text-[11px] font-semibold text-slate-800 mt-0.5">
                  Shopping & Order Assistant
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-yellow-500 flex items-center justify-center transition-colors text-black"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                {/* Text Bubble */}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-black text-white rounded-br-xs'
                      : 'bg-white text-slate-900 border border-slate-200 shadow-xs rounded-bl-xs'
                  }`}
                >
                  {msg.sender === 'bot' && !msg.text ? (
                    <div className="flex items-center gap-1.5 py-1 px-1">
                      <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                      <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse [animation-delay:150ms]" />
                      <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse [animation-delay:300ms]" />
                    </div>
                  ) : (
                    <p className="whitespace-pre-line">{cleanMarkdownText(msg.text)}</p>
                  )}
                </div>

                {/* Structured Orders Container (rendered when msg.orders is present) */}
                {msg.orders && msg.orders.length > 0 && (
                  <div className="mt-3 w-full space-y-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">
                      {msg.orders.length === 1 ? 'Order Details' : `Found ${msg.orders.length} Orders`}
                    </p>
                    <div className="space-y-2.5 w-full">
                      {msg.orders.map((ord) => (
                        <div
                          key={ord.orderId}
                          className="bg-white border-2 border-slate-200 hover:border-yellow-400 rounded-2xl p-3.5 shadow-xs transition-all"
                        >
                          {/* Order Header */}
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Order</span>
                              <p className="font-mono font-black text-xs text-slate-900">
                                #{ord.orderNumber || ord.orderId.slice(-8).toUpperCase()}
                              </p>
                            </div>
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                ord.status === 'delivered'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : ord.status === 'shipped'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : ord.status === 'confirmed'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : ord.status === 'cancelled'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {ord.status}
                            </span>
                          </div>

                          {/* Order Details */}
                          <div className="space-y-1 text-xs text-slate-600 mb-2.5">
                            {ord.createdAt && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 text-[11px]">Placed</span>
                                <span className="font-bold text-slate-800">
                                  {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 text-[11px]">Total</span>
                              <span className="font-extrabold text-black">
                                ₹{ord.totalAmount}
                              </span>
                            </div>
                            {ord.estimatedDelivery ? (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 text-[11px]">Est. Delivery</span>
                                <span className="font-bold text-slate-800">{ord.estimatedDelivery}</span>
                              </div>
                            ) : null}
                            {ord.trackingNumber && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400 text-[11px]">Tracking ID</span>
                                <span className="font-mono text-slate-800 font-bold">{ord.trackingNumber}</span>
                              </div>
                            )}
                          </div>

                          {/* Order Items Preview */}
                          {ord.items && ord.items.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-2 mb-2.5 space-y-1">
                              {ord.items.map((it, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-800 font-medium truncate pr-2">
                                    {it.name} <span className="text-slate-400">× {it.quantity}</span>
                                  </span>
                                  <span className="font-bold text-slate-900 shrink-0">₹{it.price * it.quantity}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Order Action Buttons */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              onClick={() => navigate('/profile?tab=orders')}
                              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-[11px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors border border-slate-200 cursor-pointer"
                            >
                              <Package className="w-3 h-3 text-slate-700" />
                              <span>View Order</span>
                            </button>
                            {ord.trackingUrl && (
                              <a
                                href={ord.trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-[11px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors border border-black shadow-xs"
                              >
                                <Truck className="w-3 h-3" />
                                <span>Track</span>
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Structured Cart Summary (rendered when cart data is present) */}
                {msg.cart && (
                  <div className="mt-3 w-full bg-white border-2 border-black rounded-xl p-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                      <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                        <ShoppingCart className="w-3.5 h-3.5 text-yellow-500" />
                        Your Cart ({msg.cart.totalItems || 0} item{msg.cart.totalItems === 1 ? '' : 's'})
                      </span>
                      <span className="font-black text-xs text-black">
                        Total: ₹{msg.cart.total || 0}
                      </span>
                    </div>

                    {msg.cart.items && msg.cart.items.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {msg.cart.items.map((item, idx) => (
                          <div
                            key={`${item.productId}-${idx}`}
                            className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-b-0"
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-7 h-7 rounded object-cover border border-slate-200 shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <div className="truncate">
                                <p className="font-bold text-slate-900 truncate">{item.name}</p>
                                <p className="text-[10px] text-slate-500">
                                  ₹{item.price} × {item.quantity}
                                </p>
                              </div>
                            </div>
                            <span className="font-extrabold text-black shrink-0">
                              ₹{item.price * item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 py-1 text-center font-medium">
                        Your cart is currently empty.
                      </p>
                    )}

                    <button
                      onClick={() => {
                        if (onOpenCart) onOpenCart();
                        else navigate('/checkout');
                      }}
                      className="mt-3 w-full bg-yellow-400 hover:bg-yellow-500 text-black font-extrabold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-black shadow-xs cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>View Cart</span>
                    </button>
                  </div>
                )}

                {/* Product Cards Container (rendered when products.length > 0) */}
                {msg.products && msg.products.length > 0 && (
                  <div className="mt-3 w-full space-y-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">
                      Found {msg.products.length} Product{msg.products.length > 1 ? 's' : ''}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                      {msg.products.map((product) => {
                        const inStock = typeof product.stock === 'number' ? product.stock > 0 : true;
                        return (
                          <div
                            key={product.id}
                            className="bg-white border border-slate-200 hover:border-yellow-400 rounded-xl p-2.5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200 group"
                          >
                            {/* Product Image */}
                            <div className="relative w-full aspect-square bg-slate-100 rounded-lg overflow-hidden mb-2 flex items-center justify-center">
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    // Fallback placeholder if image path fails
                                    (e.target as HTMLImageElement).src = '/images/STICKTOON_LOGO.jpeg';
                                  }}
                                />
                              ) : (
                                <div className="text-slate-400 text-xs font-semibold">No Image</div>
                              )}
                              <span className="absolute top-1.5 left-1.5 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-black/75 text-white backdrop-blur-xs">
                                {product.type || 'Product'}
                              </span>
                            </div>

                            {/* Product Details */}
                            <div className="space-y-1">
                              <h4
                                className="font-bold text-xs text-slate-900 line-clamp-2 leading-tight"
                                title={product.name}
                              >
                                {product.name}
                              </h4>
                              <div className="flex items-center justify-between text-xs pt-0.5">
                                <span className="font-extrabold text-black">
                                  ₹{product.price}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                    inStock
                                      ? 'text-emerald-700 bg-emerald-50'
                                      : 'text-rose-700 bg-rose-50'
                                  }`}
                                >
                                  {inStock ? 'In Stock' : 'Out of Stock'}
                                </span>
                              </div>
                            </div>

                            {/* Action Buttons: [View Product] & [Add to Cart] */}
                            <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                              <button
                                onClick={() => handleViewProduct(product)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-[11px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors border border-slate-200"
                              >
                                <span>View</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleAddToCart(product)}
                                disabled={typeof product.stock === 'number' && product.stock <= 0}
                                className="bg-yellow-400 hover:bg-yellow-500 disabled:bg-slate-200 text-black disabled:text-slate-400 font-bold text-[11px] py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all border border-black disabled:border-slate-300 shadow-xs cursor-pointer"
                              >
                                <ShoppingCart className="w-3 h-3" />
                                <span>Add</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="flex items-center gap-2 text-slate-500 bg-white border border-slate-200 px-3.5 py-2.5 rounded-2xl w-fit shadow-xs">
                <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
                <span className="text-xs font-semibold">Checking orders & catalog...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts (visible if conversation is short) */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 bg-slate-100/70 border-t border-slate-200 overflow-x-auto flex gap-1.5 no-scrollbar shrink-0">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  disabled={loading}
                  className="text-[11px] font-medium bg-white hover:bg-yellow-300 text-slate-700 hover:text-black px-2.5 py-1 rounded-full border border-slate-200 whitespace-nowrap transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask to find products, manage cart, track orders..."
                disabled={loading}
                className="flex-1 bg-slate-100 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-yellow-400 focus:bg-white transition-all"
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputMessage.trim() || loading}
                className="w-10 h-10 rounded-xl bg-yellow-400 hover:bg-yellow-500 disabled:bg-slate-200 text-black disabled:text-slate-400 flex items-center justify-center transition-all font-bold shrink-0 border border-black disabled:border-slate-300"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
