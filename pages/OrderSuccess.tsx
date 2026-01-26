import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, Package, ArrowRight } from "lucide-react";

const OrderSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
          Order Confirmed!
        </h1>

        <p className="text-slate-600 mb-6">
          Thank you for your order. We've sent a confirmation email with your order details.
        </p>

        {/* Order ID */}
        {orderId && (
          <div className="bg-white border-2 border-green-200 rounded-2xl p-4 mb-8">
            <p className="text-sm text-slate-500 mb-1">Order ID</p>
            <p className="text-xl font-mono font-bold text-slate-900">
              #{orderId.slice(-8).toUpperCase()}
            </p>
          </div>
        )}

        {/* What's Next */}
        <div className="bg-white rounded-2xl p-6 border mb-8 text-left">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            What happens next?
          </h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">1</span>
              <span>We'll start preparing your order</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">2</span>
              <span>You'll receive tracking info via email</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">3</span>
              <span>Your items will arrive in 5-7 business days</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/"
            className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            Continue Shopping
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
