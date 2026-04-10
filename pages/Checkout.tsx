import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, ShoppingCart, Tag, X, CheckCircle, Sparkles } from "lucide-react";
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
  const [showPromoBurst, setShowPromoBurst] = useState(false);
  const [showPromoSavePopup, setShowPromoSavePopup] = useState(false);
  const [isMobileView, setIsMobileView] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 640 : false
  );
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    cart.forEach((item) => {
      next[item.id] = String(item.quantity);
    });
    setQuantityInputs(next);
  }, [cart]);

  useEffect(() => {
    const onResize = () => {
      setIsMobileView(window.innerWidth <= 640);
    };

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!showPromoBurst) return;

    const timer = window.setTimeout(() => {
      setShowPromoBurst(false);
    }, 1850);

    return () => window.clearTimeout(timer);
  }, [showPromoBurst]);

  useEffect(() => {
    if (!showPromoSavePopup) return;

    const timer = window.setTimeout(() => {
      setShowPromoSavePopup(false);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [showPromoSavePopup]);

  const handleQuantityInputChange = (id: string, value: string) => {
    if (!/^[0-9]*$/.test(value)) return;
    setQuantityInputs((prev) => ({ ...prev, [id]: value }));
  };

  const commitQuantity = (id: string, currentQuantity: number) => {
    const raw = quantityInputs[id];
    const parsed = parseInt(raw || "", 10);
    const nextQuantity = Number.isNaN(parsed) ? currentQuantity : Math.max(1, parsed);

    setQuantityInputs((prev) => ({ ...prev, [id]: String(nextQuantity) }));
    if (nextQuantity !== currentQuantity) {
      updateQuantity(id, nextQuantity);
    }
  };

  const handleIncrement = (item: CartItem) => {
    const nextQuantity = item.quantity + 1;
    setQuantityInputs((prev) => ({ ...prev, [item.id]: String(nextQuantity) }));
    updateQuantity(item.id, nextQuantity);
  };

  const handleDecrement = (item: CartItem) => {
    const nextQuantity = Math.max(1, item.quantity - 1);
    setQuantityInputs((prev) => ({ ...prev, [item.id]: String(nextQuantity) }));
    updateQuantity(item.id, nextQuantity);
  };

  const getBurstParticleStyle = (index: number) => {
    return {
      ["--i" as "--i"]: index,
      ["--size" as "--size"]: (index % 5) + 1,
      ["--rot" as "--rot"]: `${(index * 19) % 360}deg`,
    } as React.CSSProperties;
  };

  const burstCount = isMobileView
    ? { side: 50, vertical: 34 }
    : { side: 70, vertical: 48 };

  const validatePromoRequest = async (
    code: string,
    currentSubtotal: number,
    token: string
  ) => {
    const res = await fetch(`${API_BASE_URL}/api/promo/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code, subtotal: currentSubtotal }),
    });

    const data = await res.json();
    return { res, data };
  };

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
      const { res, data } = await validatePromoRequest(promoCode, subtotal, token);

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
      setShowPromoBurst(true);
      setShowPromoSavePopup(true);
    } catch (err) {
      setPromoError("Failed to validate promo code");
    } finally {
      setPromoLoading(false);
    }
  };

  useEffect(() => {
    if (!appliedPromo?.code) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    let isCancelled = false;

    const syncPromoWithSubtotal = async () => {
      try {
        const { res, data } = await validatePromoRequest(appliedPromo.code, subtotal, token);
        if (isCancelled) return;

        if (!res.ok) {
          setAppliedPromo(null);
          setShowPromoSavePopup(false);
          setPromoError(data.message || "Promo code is no longer valid for this cart");
          return;
        }

        setAppliedPromo((prev) => {
          if (!prev) return prev;
          if (
            prev.code === data.code &&
            prev.discount === data.discount &&
            prev.description === data.description
          ) {
            return prev;
          }

          return {
            code: data.code,
            discount: data.discount,
            description: data.description,
          };
        });
        setPromoError("");
      } catch (err) {
        if (isCancelled) return;
      }
    };

    void syncPromoWithSubtotal();

    return () => {
      isCancelled = true;
    };
  }, [subtotal, appliedPromo?.code]);

  // Remove promo code
  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError("");
    setShowPromoSavePopup(false);
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

    let promoCodeForOrder: string | null = appliedPromo?.code || null;

    if (promoCodeForOrder) {
      try {
        const { res, data } = await validatePromoRequest(promoCodeForOrder, subtotal, token);

        if (!res.ok) {
          setAppliedPromo(null);
          setShowPromoSavePopup(false);
          setPromoError(data.message || "Promo code is no longer valid for this cart");
          setPaymentError("Promo code was removed because cart value is below its minimum requirement.");
          return;
        }

        setAppliedPromo({
          code: data.code,
          discount: data.discount,
          description: data.description,
        });
        promoCodeForOrder = data.code;
      } catch (err) {
        setPaymentError("Failed to validate promo code. Please try again.");
        return;
      }
    }

    setIsProcessing(true);
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
            promoCode: promoCodeForOrder,
            items: cart.map((item) => ({
              badgeId: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              image: item.image,
              printImage: item.printImage,
            })),
          }),
        }
      );

      const data = await res.json();
      
      if (!res.ok) {
        setPaymentError(data.message || "Failed to create order");
        setIsProcessing(false);
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
          setIsProcessing(true); // Ensure it's showing during verification
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
              localStorage.removeItem("guest_cart");
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
              
              // Redirect to home page with order confirmation modal
              window.location.href = `/#/?orderId=${verifyData.orderId}&orderSuccess=true`;
            } else {
              setPaymentError("Payment verification failed");
              setIsProcessing(false);
            }
          } catch (verifyErr) {
            console.error("Verify error:", verifyErr);
            setPaymentError("Payment verification failed");
            setIsProcessing(false);
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
            setIsProcessing(false);
            console.log("Payment modal closed");
          },
        },
      };

      const razorpay = new Razorpay(options);
      
      razorpay.on("payment.failed", async function (response: any) {
        console.error("Payment failed:", response.error);
        setPaymentError(response.error.description || "Payment failed");
        setIsProcessing(false);
        
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
      setIsProcessing(false);
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
          className="bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 font-black px-8 md:px-12 py-3 md:py-4 rounded-2xl text-sm md:text-base shadow-lg hover:shadow-xl hover:shadow-yellow-500/20 hover:from-yellow-400 hover:to-orange-400 transition"
        >
          Go Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-slate-50 to-yellow-50/40 pt-10 md:pt-12 pb-20 md:pb-24 px-3 sm:px-4 md:px-0">
      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-md animate-fadeIn">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-yellow-500 animate-pulse" />
          </div>
          <h2 className="mt-6 text-2xl font-black text-slate-900 tracking-tight">Processing Payment...</h2>
          <p className="mt-2 text-slate-500 font-medium">Please do not close or refresh the window.</p>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-250px] left-1/2 -translate-x-1/2 w-[920px] h-[920px] rounded-full bg-yellow-500/10 blur-[145px]" />
        <div className="absolute right-[-220px] top-[28%] w-[620px] h-[620px] rounded-full bg-orange-400/12 blur-[125px]" />
        <div className="absolute bottom-[-210px] left-[-180px] w-[580px] h-[580px] rounded-full bg-red-400/10 blur-[120px]" />
        <div className="hidden md:block absolute top-24 -left-8 w-24 h-24 rounded-full border-[6px] border-yellow-500/20 animate-bounce" style={{ animationDuration: "5s" }} />
        <div className="hidden md:block absolute top-44 -right-10 w-28 h-28 rounded-full border-[6px] border-orange-500/15 animate-pulse" style={{ animationDuration: "4s" }} />
        <div className="hidden lg:block absolute bottom-28 right-10 w-20 h-20 rounded-full border-[5px] border-red-500/15 animate-bounce" style={{ animationDuration: "6s", animationDelay: "0.8s" }} />
      </div>

      {showPromoBurst && (
        <div className="promo-page-burst-layer" aria-hidden="true">
          <div className="promo-page-burst promo-page-burst-left">
            {Array.from({ length: burstCount.side }).map((_, i) => (
              <Fragment key={`page-left-wrap-${i}`}>
                <span
                  className="promo-page-burst-particle"
                  style={getBurstParticleStyle(i)}
                />
                <span
                  className="promo-page-burst-particle promo-page-burst-particle-alt"
                  style={getBurstParticleStyle(i + 3)}
                />
              </Fragment>
            ))}
          </div>
          <div className="promo-page-burst promo-page-burst-right">
            {Array.from({ length: burstCount.side }).map((_, i) => (
              <Fragment key={`page-right-wrap-${i}`}>
                <span
                  className="promo-page-burst-particle"
                  style={getBurstParticleStyle(i)}
                />
                <span
                  className="promo-page-burst-particle promo-page-burst-particle-alt"
                  style={getBurstParticleStyle(i + 3)}
                />
              </Fragment>
            ))}
          </div>
          <div className="promo-page-burst promo-page-burst-top">
            {Array.from({ length: burstCount.vertical }).map((_, i) => (
              <Fragment key={`page-top-wrap-${i}`}>
                <span
                  className="promo-page-burst-particle"
                  style={getBurstParticleStyle(i)}
                />
                <span
                  className="promo-page-burst-particle promo-page-burst-particle-alt"
                  style={getBurstParticleStyle(i + 2)}
                />
              </Fragment>
            ))}
          </div>
          <div className="promo-page-burst promo-page-burst-bottom">
            {Array.from({ length: burstCount.vertical }).map((_, i) => (
              <Fragment key={`page-bottom-wrap-${i}`}>
                <span
                  className="promo-page-burst-particle"
                  style={getBurstParticleStyle(i)}
                />
                <span
                  className="promo-page-burst-particle promo-page-burst-particle-alt"
                  style={getBurstParticleStyle(i + 2)}
                />
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {showPromoSavePopup && appliedPromo && (
        <div className="promo-toast-overlay" role="status" aria-live="polite">
          <div className="promo-toast">
            <div className="promo-toast-icon-wrap">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="promo-toast-copy">
              <p className="promo-toast-title">Coupon Applied Successfully</p>
              <p className="promo-toast-text">
                Hurry! You saved {formatPrice(appliedPromo.discount)}
              </p>
              <p className="promo-toast-subtext">Your discount is now included in the final total.</p>
              <div className="promo-toast-progress" />
            </div>
            <div className="promo-toast-sparkle" aria-hidden="true">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-6xl mx-auto px-1 sm:px-2 md:px-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-6 md:mb-12">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-8">
            {/* ADDRESS */}
            <div
              id="delivery-form"
              className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-white/70 shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
            >
              <h3 className="text-lg md:text-xl font-black mb-6 flex items-center gap-2">
                Shipping Details <span className="text-red-500 text-xs font-bold uppercase tracking-tighter">(All Fields Required)</span>
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
            <div className="relative overflow-hidden bg-white/95 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-white/70 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              <h3 className="text-lg md:text-xl font-black mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Promo Code
              </h3>

              {showPromoBurst && (
                <div className="promo-burst-layer" aria-hidden="true">
                  <div className="promo-burst promo-burst-left">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <span key={`left-${i}`} className="promo-burst-particle" style={{ ["--i" as "--i"]: i } as React.CSSProperties} />
                    ))}
                  </div>
                  <div className="promo-burst promo-burst-right">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <span key={`right-${i}`} className="promo-burst-particle" style={{ ["--i" as "--i"]: i } as React.CSSProperties} />
                    ))}
                  </div>
                </div>
              )}

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
                  <div className="flex flex-col sm:flex-row gap-2">
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
                      className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 font-black rounded-xl shadow-lg hover:shadow-xl hover:shadow-yellow-500/25 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 transition"
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
          
<div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-white/70 shadow-[0_18px_45px_rgba(15,23,42,0.08)] space-y-6">

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
      className="border-b pb-5 last:border-b-0"
    >
      <div className="flex items-start gap-3">
        <img
          src={item.image}
          alt={item.name}
          className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg shrink-0"
        />

        <div className="flex-1 min-w-0">
          <p className="font-black truncate">{item.name}</p>
          <p className="text-sm text-gray-500">
            ₹{item.price} × {item.quantity}
          </p>
        </div>

        <button
          onClick={() => removeFromCart(item.id)}
          className="shrink-0 p-1"
          aria-label="Remove item"
        >
          <Trash2 className="text-rose-500 w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => handleDecrement(item)}
            className="w-8 h-8 rounded-full border"
        >
          −
        </button>

        <input
          type="number"
          min={1}
          step={1}
          value={quantityInputs[item.id] ?? String(item.quantity)}
          onChange={(e) => handleQuantityInputChange(item.id, e.target.value)}
          onBlur={() => commitQuantity(item.id, item.quantity)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
            className="w-14 sm:w-16 h-8 rounded-md border text-center font-bold"
          inputMode="numeric"
          aria-label="Item quantity"
        />

        <button
          onClick={() => handleIncrement(item)}
            className="w-8 h-8 rounded-full border"
        >
          +
        </button>
        </div>

        <p className="font-bold text-sm sm:text-base whitespace-nowrap">
          ₹{item.price * item.quantity}
        </p>
      </div>
    </div>
  ))}
</div>

          </div>

          {/* RIGHT */}
<div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-white/70 shadow-[0_18px_45px_rgba(15,23,42,0.08)] lg:sticky lg:top-32">

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
    className="w-full py-5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 transition text-slate-900 font-black rounded-2xl shadow-lg hover:shadow-xl hover:shadow-yellow-500/25"
  >
    PLACE ORDER NOW
  </button>
</div>

        </div>
      </div>
    </div>
  );
}
