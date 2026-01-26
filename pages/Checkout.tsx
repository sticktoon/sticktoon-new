import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, ShoppingCart, Tag, X, CheckCircle } from "lucide-react";
import { CartItem } from "../types";
import { formatPrice } from "../constants";
import { API_BASE_URL } from "../config/api";

/* =========================
   RAZORPAY LOADER
========================== */
const loadRazorpay = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) {
      resolve((window as any).Razorpay);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => resolve((window as any).Razorpay);
    script.onerror = () => reject("Razorpay SDK failed to load");

    document.body.appendChild(script);
  });
};

interface CheckoutProps {
  cart: CartItem[];
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, q: number) => void;
}

export default function Checkout({
  cart,
  removeFromCart,
  updateQuantity,
}: CheckoutProps) {
  const subtotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const deliveryCharges = subtotal > 0 ? 99 : 0;

  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount: number;
    description: string;
  } | null>(null);

  const discount = appliedPromo?.discount || 0;
  const total = subtotal + deliveryCharges - discount;

  const [address, setAddress] = useState({
    name: "",
    street: "",
    phone: "",
  });

  const [errors, setErrors] = useState({
    name: "",
    street: "",
    phone: "",
  });

  const [paymentError, setPaymentError] = useState("");

  // Apply promo code
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      setPromoError("Enter a promo code");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setPromoError("Please login to apply promo code");
      return;
    }

    setPromoLoading(true);
    setPromoError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/promo/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: promoCode, subtotal }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPromoError(data.message || "Invalid promo code");
        return;
      }

      setAppliedPromo({
        code: data.code,
        discount: data.discount,
        description: data.description,
      });
      setPromoCode("");
    } catch (err) {
      setPromoError("Failed to validate promo code");
    } finally {
      setPromoLoading(false);
    }
  };

  // Remove promo code
  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError("");
  };

  const validate = () => {
    const e = { name: "", street: "", phone: "" };

    if (!address.name.trim()) e.name = "Name is required";
    else if (/\d/.test(address.name))
      e.name = "Name must not contain numbers";

    if (!address.street.trim()) e.street = "Address is required";

    if (!address.phone.trim()) e.phone = "Phone number is required";
    else if (!/^\d+$/.test(address.phone))
      e.phone = "Phone must contain only numbers";
    else if (address.phone.length < 10)
      e.phone = "Phone must be at least 10 digits";

    setErrors(e);
    return !e.name && !e.street && !e.phone;
  };

  const handlePlaceOrder = async () => {
    setPaymentError("");
    
    if (!validate()) {
      document
        .getElementById("delivery-form")
        ?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setPaymentError("Please login to continue");
      return;
    }

    try {
      const Razorpay = await loadRazorpay();

      // Create order on backend
      const res = await fetch(
        `${API_BASE_URL}/api/razorpay/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: total,
            address,
            promoCode: appliedPromo?.code || null,
            items: cart.map((item) => ({
              badgeId: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              image: item.image,
            })),
          }),
        }
      );

      const data = await res.json();
      
      if (!res.ok) {
        setPaymentError(data.message || "Failed to create order");
        return;
      }

      // Open Razorpay checkout
      const options = {
        key: data.keyId,
        amount: data.amount * 100,
        currency: data.currency,
        name: "StickToon",
        description: "Custom Stickers & Badges",
        order_id: data.razorpayOrderId,
        handler: async function (response: any) {
          // Verify payment on backend
          try {
            const verifyRes = await fetch(
              `${API_BASE_URL}/api/razorpay/verify-payment`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  orderId: data.orderId,
                }),
              }
            );

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              // Payment successful - clear cart from localStorage and DB
              localStorage.removeItem("cart");
              
              // Clear cart from database
              try {
                await fetch(`${API_BASE_URL}/api/cart/clear`, {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                });
              } catch (e) {
                console.error("Failed to clear cart from DB");
              }
              
              // Redirect to success page
              window.location.href = `/#/order-success?orderId=${verifyData.orderId}`;
            } else {
              setPaymentError("Payment verification failed");
            }
          } catch (verifyErr) {
            console.error("Verify error:", verifyErr);
            setPaymentError("Payment verification failed");
          }
        },
        prefill: {
          name: address.name,
          contact: address.phone,
        },
        theme: {
          color: "#3B82F6",
        },
        modal: {
          ondismiss: function () {
            console.log("Payment modal closed");
          },
        },
      };

      const razorpay = new Razorpay(options);
      
      razorpay.on("payment.failed", async function (response: any) {
        console.error("Payment failed:", response.error);
        setPaymentError(response.error.description || "Payment failed");
        
        // Mark order as failed
        try {
          await fetch(`${API_BASE_URL}/api/razorpay/payment-failed`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              orderId: data.orderId,
              error: response.error,
            }),
          });
        } catch (e) {
          console.error("Failed to update order status");
        }
      });

      razorpay.open();
    } catch (err) {
      console.error("Payment error:", err);
      setPaymentError("Payment processing failed. Please try again.");
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-4">
        <ShoppingCart className="w-16 md:w-24 h-16 md:h-24 text-slate-200 mb-4 md:mb-6" />
        <h2 className="text-2xl md:text-4xl font-black mb-4">
          Your cart is empty
        </h2>
        <Link
          to="/categories"
          className="bg-blue-600 text-white px-8 md:px-12 py-3 md:py-4 rounded-2xl text-sm md:text-base"
        >
          Go Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pt-12 pb-24 px-4 md:px-0">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <h1 className="text-2xl md:text-4xl font-black mb-8 md:mb-12">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-8">
            {/* ADDRESS */}
            <div
              id="delivery-form"
              className="bg-white rounded-3xl p-6 md:p-8 border"
            >
              <h3 className="text-lg md:text-xl font-black mb-6">
                Deliver to:
              </h3>

              {(["name", "street", "phone"] as const).map(
                (field) => (
                  <div key={field} className="mb-4">
                    <input
                      className={`w-full p-3 rounded-xl border ${
                        errors[field] ? "border-red-500" : ""
                      }`}
                      placeholder={
                        field === "name"
                          ? "Full Name"
                          : field === "street"
                          ? "Street Address"
                          : "Phone Number"
                      }
                      value={address[field]}
                      onChange={(e) =>
                        setAddress({
                          ...address,
                          [field]:
                            field === "phone"
                              ? e.target.value.replace(/\D/g, "")
                              : e.target.value,
                        })
                      }
                    />
                    {errors[field] && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors[field]}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>

            {/* PROMO CODE */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border">
              <h3 className="text-lg md:text-xl font-black mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Promo Code
              </h3>

              {appliedPromo ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-bold text-green-700">{appliedPromo.code}</p>
                      <p className="text-sm text-green-600">
                        {appliedPromo.description || `You save ₹${appliedPromo.discount}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemovePromo}
                    className="p-2 hover:bg-green-100 rounded-full transition"
                  >
                    <X className="w-4 h-4 text-green-700" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value.toUpperCase());
                        setPromoError("");
                      }}
                      placeholder="Enter promo code"
                      className="flex-1 p-3 rounded-xl border uppercase"
                    />
                    <button
                      onClick={handleApplyPromo}
                      disabled={promoLoading}
                      className="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 transition"
                    >
                      {promoLoading ? "..." : "Apply"}
                    </button>
                  </div>
                  {promoError && (
                    <p className="text-red-500 text-sm mt-2">{promoError}</p>
                  )}
                </div>
              )}
            </div>

            {/* CART ITEMS */}
          
<div className="bg-white rounded-3xl p-6 md:p-8 border space-y-6">

  {/* ✅ HEADER (Repo1 style) */}
  <div className="flex items-center justify-between">
    <h2 className="text-lg font-black text-slate-900">
      Your Items ({cart.length})
    </h2>
  </div>

  {/* ITEMS LIST */}
  {cart.map((item) => (
    <div
      key={item.id}
      className="flex items-center justify-between gap-4 border-b pb-6 last:border-b-0"
    >
      <img
        src={item.image}
        alt={item.name}
        className="w-16 h-16 object-cover rounded-lg"
      />

      <div className="flex-1">
        <p className="font-black">{item.name}</p>
        <p className="text-sm text-gray-500">
          ₹{item.price} × {item.quantity}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() =>
            updateQuantity(item.id, Math.max(1, item.quantity - 1))
          }
          className="w-8 h-8 rounded-full border"
        >
          −
        </button>

        <span className="font-bold w-6 text-center">
          {item.quantity}
        </span>

        <button
          onClick={() =>
            updateQuantity(item.id, item.quantity + 1)
          }
          className="w-8 h-8 rounded-full border"
        >
          +
        </button>

        <button onClick={() => removeFromCart(item.id)}>
          <Trash2 className="text-rose-500" />
        </button>
      </div>

      <p className="font-bold">
        ₹{item.price * item.quantity}
      </p>
    </div>
  ))}
</div>

          </div>

          {/* RIGHT */}
<div className="bg-white rounded-3xl p-8 border sticky top-32">

  {/* PRICE DETAILS HEADER */}
  <div className="flex items-center justify-between mb-6">
    <h3 className="text-lg font-black">
      Price Details <span className="text-sm font-semibold text-slate-400">(INR)</span>
    </h3>
  </div>

  {/* PRICE BREAKUP */}
  <div className="space-y-3 mb-6 text-sm">
    <div className="flex justify-between text-slate-600">
      <span>Subtotal</span>
      <span>₹{subtotal}</span>
    </div>

    <div className="flex justify-between text-slate-600">
      <span>Delivery</span>
      <span>₹{deliveryCharges}</span>
    </div>

    {appliedPromo && (
      <div className="flex justify-between text-green-600 font-semibold">
        <span>Discount ({appliedPromo.code})</span>
        <span>-₹{discount}</span>
      </div>
    )}

    <div className="flex justify-between font-black text-lg pt-2">
      <span>Total</span>
      <span className="text-blue-600">
        {formatPrice(total)}
      </span>
    </div>
  </div>

  {/* GREEN GUARANTEE BOX */}
  <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
    <p className="text-xs font-semibold text-emerald-700">
      Your purchase is protected by <br />
      <span className="font-black">StickToon Buyer Guarantee.</span>
    </p>
  </div>

  {/* ERROR MESSAGE */}
  {paymentError && (
    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <p className="text-sm font-semibold text-red-600">{paymentError}</p>
    </div>
  )}

  {/* CTA */}
  <button
    onClick={handlePlaceOrder}
    className="w-full py-5 bg-blue-600 hover:bg-blue-700 transition text-white font-black rounded-2xl"
  >
    PLACE ORDER NOW
  </button>
</div>

        </div>
      </div>
    </div>
  );
}
