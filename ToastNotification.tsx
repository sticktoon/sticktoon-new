import React, { useEffect } from "react";
import { CheckCircle2, ShoppingBag, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface ToastItem {
  id: string;
  name: string;
  image?: string;
  price?: number;
  variant?: string;
}

interface ToastProps {
  item: ToastItem | null;
  onClose: () => void;
}

export const ToastNotification: React.FC<ToastProps> = ({ item, onClose }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (item) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-in max-w-sm w-full bg-white/95 backdrop-blur-md border border-purple-200 rounded-2xl shadow-2xl p-4 transition-all duration-300">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl flex-shrink-0">
          <CheckCircle2 size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Added to Cart
            </h4>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3 mt-2">
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                className="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-slate-50 flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg flex-shrink-0">
                🏷️
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800 truncate">
                {item.name}
              </p>
              {item.variant && (
                <p className="text-xs text-slate-500 truncate">{item.variant}</p>
              )}
              {item.price !== undefined && (
                <p className="text-xs font-black text-purple-700 mt-0.5">
                  ₹{item.price}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              navigate("/checkout");
            }}
            className="w-full mt-3 py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:opacity-95 shadow-md transition-all"
          >
            <ShoppingBag size={14} /> View Cart / Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToastNotification;
