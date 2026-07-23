import { Fragment, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, ShoppingCart, Tag, X, CheckCircle, Sparkles, MapPin } from "lucide-react";
import { CartItem, ComboItemPreview } from "../types";
import { BADGES, formatPrice } from "../constants";
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

/* =========================
   INTERNATIONAL ORDERS
   Pricing outside India differs (shipping + duties), so online checkout is
   India-only and overseas buyers are routed to sales.
========================== */
const HOME_COUNTRY = "India";
const INTERNATIONAL_SALES_PHONE = "+91 8956667277";
const INTERNATIONAL_SALES_EMAIL = "sticktoon.xyz@gmail.com";

const COUNTRIES = [
  HOME_COUNTRY,
  "Australia",
  "Bangladesh",
  "Canada",
  "Germany",
  "Nepal",
  "Singapore",
  "Sri Lanka",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Other (outside India)",
];

const normalizeCategoryKey = (value?: string) => {
  if (!value) return "";

  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (normalized === "animal") return "pet";
  if (normalized === "positive-vibe") return "positive-vibes";

  return normalized;
};

const sanitizeComboItems = (items?: ComboItemPreview[]) => {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item?.id && item?.name)
    .map((item) => ({
      id: String(item.id),
      name: String(item.name),
      image: item?.image ? String(item.image) : undefined,
    }));
};

const parseComboId = (comboId: string) => {
  const trimmed = String(comboId || "");
  const knownPrefixes = ["custom-combo-", "local-combo-"];
  const matchedPrefix = knownPrefixes.find((prefix) => trimmed.startsWith(prefix));
  if (!matchedPrefix) return null;

  const remainder = trimmed.slice(matchedPrefix.length);
  if (!remainder) return null;

  const categoryKeys = Array.from(
    new Set(
      BADGES.filter((badge) => !badge.isCombo)
        .map((badge) => normalizeCategoryKey(String(badge.category)))
        .filter(Boolean),
    ),
  ).sort((a, b) => b.length - a.length);

  for (const categoryKey of categoryKeys) {
    const categoryPrefix = `${categoryKey}-`;
    if (remainder.startsWith(categoryPrefix)) {
      return {
        categoryKey,
        encodedSeed: remainder.slice(categoryPrefix.length),
      };
    }
  }

  const firstDashIndex = remainder.indexOf("-");
  if (firstDashIndex <= 0) return null;

  return {
    categoryKey: normalizeCategoryKey(remainder.slice(0, firstDashIndex)),
    encodedSeed: remainder.slice(firstDashIndex + 1),
  };
};

const decodeComboItemsFromCartId = (item: CartItem) => {
  const parsedComboId = parseComboId(String(item?.id || ""));
  if (!parsedComboId) return [];

  const idCategoryKey = normalizeCategoryKey(parsedComboId.categoryKey);
  const encodedSeed = String(parsedComboId.encodedSeed || "").toLowerCase();
  const categoryKey = idCategoryKey || normalizeCategoryKey(String(item?.category || ""));
  if (!categoryKey) return [];

  const candidates = BADGES.filter(
    (badge) => !badge.isCombo && normalizeCategoryKey(String(badge.category)) === categoryKey,
  );

  if (candidates.length < 4) return [];

  // O(N) direct seed ID matching
  const seedParts = encodedSeed.split(/[^a-z0-9]+/g).filter(Boolean);
  const matched = candidates.filter((b) =>
    seedParts.some((part) => b.id.toLowerCase().includes(part) || part.includes(b.id.toLowerCase()))
  );

  if (matched.length >= 4) {
    return matched.slice(0, 4).map((badge) => ({
      id: badge.id,
      name: badge.name,
      image: badge.image,
    }));
  }

  // Capped candidates array (max 12) fallback
  const safeCandidates = candidates.slice(0, 12);
  for (let i = 0; i < safeCandidates.length - 3; i += 1) {
    for (let j = i + 1; j < safeCandidates.length - 2; j += 1) {
      for (let k = j + 1; k < safeCandidates.length - 1; k += 1) {
        for (let l = k + 1; l < safeCandidates.length; l += 1) {
          const comboSet = [safeCandidates[i], safeCandidates[j], safeCandidates[k], safeCandidates[l]];
          const seed = comboSet
            .map((badge) => badge.id)
            .sort()
            .join("-")
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "");

          if (seed === encodedSeed) {
            return comboSet.map((badge) => ({
              id: badge.id,
              name: badge.name,
              image: badge.image,
            }));
          }
        }
      }
    }
  }

  return safeCandidates.slice(0, 4).map((badge) => ({
    id: badge.id,
    name: badge.name,
    image: badge.image,
  }));
};

const getComboItemsForDisplay = (item: CartItem) => {
  const directItems = sanitizeComboItems(item.comboItems);
  if (directItems.length > 0) return directItems;

  return decodeComboItemsFromCartId(item);
};

// Persist the in-progress checkout (shipping details + applied promo) so it
// survives navigating away to log in and coming back.
const CHECKOUT_DRAFT_KEY = "checkout_draft";

const loadCheckoutDraft = () => {
  try {
    const raw = localStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
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
  } | null>(() => loadCheckoutDraft()?.appliedPromo ?? null);

  const discount = appliedPromo?.discount || 0;
  const total = subtotal + deliveryCharges - discount;

  const [address, setAddress] = useState<{
    label: string;
    name: string;
    email: string;
    street: string;
    phone: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  }>(() => {
    const draft = loadCheckoutDraft();
    return {
      label: "Home",
      name: "",
      email: "",
      street: "",
      phone: "",
      city: "",
      state: "",
      pincode: "",
      country: HOME_COUNTRY,
      ...(draft?.address || {}),
    };
  });

  const isInternational = address.country !== HOME_COUNTRY;

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    street: "",
    phone: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [paymentError, setPaymentError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  // Saved address book (only for logged-in users).
  type SavedAddress = {
    _id: string;
    label?: string;
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    isDefault?: boolean;
  };
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);
  const [savingAddressNow, setSavingAddressNow] = useState(false);
  const [saveAddressSuccess, setSaveAddressSuccess] = useState("");

  // "Login & Continue": remember to come back to checkout after login,
  // then send the user to the login page. The guest cart is merged into the
  // account on the next app load, so nothing in the cart is lost.
  const handleLoginAndContinue = () => {
    localStorage.setItem("postLoginRedirect", "/checkout");
    navigate("/login");
  };

  // Copy a saved address into the live form/order state and select it.
  const applySavedAddress = (a: SavedAddress) => {
    setSelectedAddressId(a._id);
    setShowAddressForm(false);
    setAddress((prev) => ({
      ...prev,
      label: a.label || "Home",
      name: a.fullName || "",
      phone: a.phone || "",
      street: a.street || "",
      city: a.city || "",
      state: a.state || "",
      pincode: a.pincode || "",
      country: a.country || prev.country,
    }));
  };

  const handleSetDefaultAddressInCheckout = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/addresses/${id}/default`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list: SavedAddress[] = Array.isArray(data.addresses) ? data.addresses : [];
        setSavedAddresses(list);
      }
    } catch (err) {
      console.error("Failed to set default address", err);
    }
  };

  const handleManualSaveAddress = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login to save addresses to your account.");
      return;
    }

    if (!address.name || !address.phone || !address.street || !address.city || !address.state || !address.pincode) {
      alert("Please fill in all address fields before saving.");
      return;
    }

    setSavingAddressNow(true);
    setSaveAddressSuccess("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          label: address.label || "Home",
          fullName: address.name,
          phone: address.phone,
          street: address.street,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          country: address.country || HOME_COUNTRY,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const list: SavedAddress[] = Array.isArray(data.addresses) ? data.addresses : [];
        setSavedAddresses(list);
        const newlyCreated = list[list.length - 1] || list[0];
        if (newlyCreated) {
          setSelectedAddressId(newlyCreated._id);
        }
        setSaveAddressSuccess("Address saved to your account!");
        setTimeout(() => setSaveAddressSuccess(""), 3500);
      } else {
        const errData = await res.json();
        alert(errData.message || "Failed to save address.");
      }
    } catch (err) {
      console.error("Save address error:", err);
      alert("Failed to save address. Please check network connection.");
    } finally {
      setSavingAddressNow(false);
    }
  };

  // Load the user's saved addresses; auto-select the default.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/addresses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const list: SavedAddress[] = Array.isArray(data.addresses) ? data.addresses : [];
        if (cancelled) return;
        setSavedAddresses(list);
        if (list.length > 0) {
          applySavedAddress(list.find((a) => a.isDefault) || list[0]);
        } else {
          setShowAddressForm(true);
        }
      } catch {
        // ignore — form stays available
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist a newly typed address to the account before paying, so it appears
  // in the address book next time. No-op for guests or when re-using a saved one.
  const persistNewAddressIfNeeded = async () => {
    const token = localStorage.getItem("token");
    if (!token || !saveAddress || selectedAddressId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          label: address.label || "Home",
          fullName: address.name,
          phone: address.phone,
          street: address.street,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          country: address.country,
          isDefault: savedAddresses.length === 0,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSavedAddresses(Array.isArray(data.addresses) ? data.addresses : []);
      }
    } catch {
      // ignore — order placement continues
    }
  };

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
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser?.email) {
          // Don't clobber an email the user already typed / that was restored.
          setAddress((prev) =>
            prev.email ? prev : { ...prev, email: String(parsedUser.email) }
          );
        }
      } catch {
        // ignore invalid user data
      }
    }
  }, []);

  // Persist the checkout draft so shipping details + promo survive a
  // navigate-away-to-login round trip.
  useEffect(() => {
    try {
      localStorage.setItem(
        CHECKOUT_DRAFT_KEY,
        JSON.stringify({ address, appliedPromo })
      );
    } catch {
      // ignore storage errors (e.g. quota / private mode)
    }
  }, [address, appliedPromo]);

  useEffect(() => {
    setIsLoggedIn(Boolean(localStorage.getItem("token")));
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
    token?: string
  ) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}/api/promo/validate`, {
      method: "POST",
      headers,
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
    setPromoLoading(true);
    setPromoError("");

    try {
      const { res, data } = await validatePromoRequest(promoCode, subtotal, token || undefined);

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
        const { res, data } = await validatePromoRequest(appliedPromo.code, subtotal, token || undefined);
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
    const e = {
      name: "",
      email: "",
      street: "",
      phone: "",
      city: "",
      state: "",
      pincode: "",
    };

    if (!address.name.trim()) e.name = "Name is required";
    else if (/\d/.test(address.name))
      e.name = "Name must not contain numbers";

    if (!address.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email.trim()))
      e.email = "Enter a valid email address";

    if (!address.street.trim()) e.street = "Address is required";

    if (!address.phone.trim()) e.phone = "Receiver's phone number is required";
    else if (!/^\d+$/.test(address.phone))
      e.phone = "Receiver's phone must contain only numbers";
    else if (address.phone.length < 10)
      e.phone = "Receiver's phone must be at least 10 digits";

    if (!address.city.trim()) e.city = "City is required";
    if (!address.state.trim()) e.state = "State is required";

    if (!address.pincode.trim()) e.pincode = "Pincode is required";
    else if (!/^\d{6}$/.test(address.pincode.trim()))
      e.pincode = "Pincode must be exactly 6 digits";

    setErrors(e);
    return (
      !e.name &&
      !e.email &&
      !e.street &&
      !e.phone &&
      !e.city &&
      !e.state &&
      !e.pincode
    );
  };

  const handlePlaceOrder = async () => {
    setPaymentError("");

    // Overseas pricing is quoted manually — never let an international order
    // through the Razorpay (INR) flow.
    if (isInternational) {
      setPaymentError(
        `We can't process orders outside India online yet. Call or WhatsApp ${INTERNATIONAL_SALES_PHONE} for international pricing.`
      );
      document
        .getElementById("delivery-form")
        ?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (!validate()) {
      document
        .getElementById("delivery-form")
        ?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    // Save a freshly typed address to the account before paying.
    await persistNewAddressIfNeeded();

    const token = localStorage.getItem("token");

    let promoCodeForOrder: string | null = appliedPromo?.code || null;

    if (promoCodeForOrder) {
      try {
        const { res, data } = await validatePromoRequest(promoCodeForOrder, subtotal, token || undefined);

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
      const createOrderHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        createOrderHeaders.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(
        `${API_BASE_URL}/api/razorpay/create-order`,
        {
          method: "POST",
          headers: createOrderHeaders,
          body: JSON.stringify({
            amount: total,
            address,
            email: address.email,
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
            const verifyHeaders: Record<string, string> = {
              "Content-Type": "application/json",
            };
            if (token) {
              verifyHeaders.Authorization = `Bearer ${token}`;
            }

            const verifyRes = await fetch(
              `${API_BASE_URL}/api/razorpay/verify-payment`,
              {
                method: "POST",
                headers: verifyHeaders,
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
              localStorage.removeItem(CHECKOUT_DRAFT_KEY);
              
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
          const failedHeaders: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (token) {
            failedHeaders.Authorization = `Bearer ${token}`;
          }

          await fetch(`${API_BASE_URL}/api/razorpay/payment-failed`, {
            method: "POST",
            headers: failedHeaders,
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

              {/* Saved address book (logged-in users) */}
              {isLoggedIn && savedAddresses.length > 0 && !showAddressForm && (
                <div className="mb-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-yellow-600" />
                      Select Delivery Address ({savedAddresses.length})
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAddressId(null);
                        setShowAddressForm(true);
                        setAddress((prev) => ({
                          ...prev,
                          label: "Home",
                          name: "",
                          phone: "",
                          street: "",
                          city: "",
                          state: "",
                          pincode: "",
                        }));
                      }}
                      className="px-3 py-1.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-900 text-xs font-black transition-all shadow-sm flex items-center gap-1"
                    >
                      ＋ Add New Address
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {savedAddresses.map((a) => {
                      const selected = selectedAddressId === a._id;
                      return (
                        <div
                          key={a._id}
                          onClick={() => applySavedAddress(a)}
                          className={`cursor-pointer text-left p-4 rounded-2xl border-2 transition-all relative flex flex-col justify-between ${
                            selected
                              ? "border-yellow-500 bg-yellow-50/70 shadow-md ring-2 ring-yellow-400/20"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2 gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  type="radio"
                                  checked={selected}
                                  onChange={() => applySavedAddress(a)}
                                  className="w-4 h-4 text-yellow-600 accent-yellow-500"
                                />
                                <span className="font-black text-slate-900 text-sm truncate">
                                  {a.fullName || "Saved Address"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {a.label && (
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                    {a.label === "Home" ? "🏠 Home" : a.label === "Work" ? "💼 Work" : a.label === "Office" ? "📍 Office" : `🏷️ ${a.label}`}
                                  </span>
                                )}
                                {a.isDefault && (
                                  <span className="text-[10px] font-black uppercase tracking-wider text-yellow-800 bg-yellow-200 px-2 py-0.5 rounded-md border border-yellow-300">
                                    ⭐ Default
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed font-medium pl-6">
                              {a.street}, {a.city}, {a.state} - {a.pincode}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 pl-6">📞 {a.phone}</p>
                          </div>

                          {!a.isDefault && (
                            <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                              <button
                                type="button"
                                onClick={(e) => handleSetDefaultAddressInCheckout(a._id, e)}
                                className="text-[11px] font-bold text-yellow-700 hover:text-yellow-900 hover:underline"
                              >
                                Set as Default
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(!isLoggedIn || showAddressForm || savedAddresses.length === 0) && (
                <div className="space-y-4">
                  {/* Cancel / Back to Saved Addresses Button */}
                  {isLoggedIn && savedAddresses.length > 0 && (
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                      <p className="text-sm font-bold text-slate-800">Add New Delivery Address</p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddressForm(false);
                          const def = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
                          if (def) applySavedAddress(def);
                        }}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 underline"
                      >
                        ← Back to Saved Addresses
                      </button>
                    </div>
                  )}

                  {/* Save Address As Label Field */}
                  <div>
                    <label className="block mb-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Save Address As (Label)
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {["Home", "Work", "Office", "Other"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAddress({ ...address, label: preset })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            address.label === preset
                              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                              : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                          }`}
                        >
                          {preset === "Home" && "🏠 "}
                          {preset === "Work" && "💼 "}
                          {preset === "Office" && "📍 "}
                          {preset === "Other" && "🏷️ "}
                          {preset}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium focus:border-yellow-500 focus:outline-none"
                      placeholder="e.g. Home, Work, Mom's Place"
                      value={address.label}
                      onChange={(e) => setAddress({ ...address, label: e.target.value })}
                    />
                  </div>

                  <div className="mb-4">
                    <label
                      htmlFor="country"
                      className="block mb-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider"
                    >
                      Country
                    </label>
                    <select
                      id="country"
                      className="w-full p-3 rounded-xl border bg-white text-sm font-medium"
                      value={address.country}
                      onChange={(e) =>
                        setAddress({ ...address, country: e.target.value })
                      }
                    >
                      {COUNTRIES.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isInternational && (
                    <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4">
                      <p className="text-sm font-black text-amber-900">
                        International orders (outside India)
                      </p>
                      <p className="mt-1 text-sm text-amber-800">
                        Pricing for international customers is different from the
                        prices shown here, because of shipping and customs duties.
                        We can't take these orders online yet.
                      </p>
                      <p className="mt-3 text-sm font-bold text-amber-900">
                        Call or WhatsApp{" "}
                        <a
                          href={`tel:${INTERNATIONAL_SALES_PHONE.replace(/\s/g, "")}`}
                          className="underline"
                        >
                          {INTERNATIONAL_SALES_PHONE}
                        </a>{" "}
                        or email{" "}
                        <a
                          href={`mailto:${INTERNATIONAL_SALES_EMAIL}?subject=International order enquiry`}
                          className="underline"
                        >
                          {INTERNATIONAL_SALES_EMAIL}
                        </a>{" "}
                        for a quote.
                      </p>
                    </div>
                  )}

                  {(["name", "email", "street", "city", "state", "pincode", "phone"] as const).map(
                    (field) => (
                      <div key={field} className="mb-4">
                        <label className="block text-slate-900 text-xs font-black uppercase tracking-wider mb-1.5">
                          {field === "name"
                            ? "Receiver's Full Name"
                            : field === "email"
                            ? "Email Address"
                            : field === "street"
                            ? "Street Address"
                            : field === "city"
                            ? "City"
                            : field === "state"
                            ? "State"
                            : field === "pincode"
                            ? "Pincode"
                            : "Receiver's Phone Number"}
                        </label>
                        <input
                          className={`w-full p-3.5 rounded-xl border-2 bg-white text-slate-900 placeholder:text-slate-500 font-semibold text-sm focus:outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-400/20 shadow-sm transition-all ${
                            errors[field] ? "border-red-500 ring-2 ring-red-200" : "border-slate-300 hover:border-slate-400"
                          }`}
                          placeholder={
                            field === "name"
                              ? "Receiver's Full Name"
                              : field === "email"
                              ? "Email Address (for order updates)"
                              : field === "street"
                              ? "Street Address (House No, Building, Area)"
                              : field === "city"
                              ? "City"
                              : field === "state"
                              ? "State"
                              : field === "pincode"
                              ? "Pincode (6 digits)"
                              : "Receiver's Phone Number (for delivery updates)"
                          }
                          value={address[field]}
                          onChange={(e) =>
                            setAddress({
                              ...address,
                              [field]:
                                field === "phone"
                                  ? e.target.value.replace(/\D/g, "")
                                  : field === "pincode"
                                  ? e.target.value.replace(/\D/g, "").slice(0, 6)
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

                  {/* Save Address Buttons & Actions */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {isLoggedIn ? (
                        <>
                          <button
                            type="button"
                            onClick={handleManualSaveAddress}
                            disabled={savingAddressNow}
                            className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                          >
                            💾 {savingAddressNow ? "Saving Address..." : "Save Address"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAddressId(null);
                              setShowAddressForm(true);
                              setAddress((prev) => ({
                                ...prev,
                                label: "Home",
                                name: "",
                                phone: "",
                                street: "",
                                city: "",
                                state: "",
                                pincode: "",
                              }));
                            }}
                            className="px-4 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-900 text-xs font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5"
                          >
                            ＋ Add New Address
                          </button>
                        </>
                      ) : (
                        <p className="text-xs text-slate-600 font-medium">
                          💡 <button type="button" onClick={handleLoginAndContinue} className="text-yellow-700 font-bold underline">Login</button> to save addresses to your profile for faster checkout.
                        </p>
                      )}
                    </div>

                    {isLoggedIn && (
                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={saveAddress}
                          onChange={(e) => setSaveAddress(e.target.checked)}
                          className="w-4 h-4 rounded text-yellow-600 accent-yellow-500"
                        />
                        <span className="text-xs font-bold text-slate-600">
                          Auto-save this address to account on order completion
                        </span>
                      </label>
                    )}

                    {saveAddressSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-fadeIn">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{saveAddressSuccess}</span>
                      </div>
                    )}
                  </div>
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
  {cart.map((item) => {
    const comboItems = getComboItemsForDisplay(item);

    return (
      <div
        key={item.id}
        className="border-b pb-5 last:border-b-0"
      >
        <div className="flex items-start gap-3">
          <img
            src={item.image}
            alt={item.name}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/images/STICKTOON_LONG.jpeg";
            }}
            className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg shrink-0 border border-slate-200"
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

        {comboItems.length > 0 && (
          <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50/80 p-2.5">
            <summary className="cursor-pointer select-none text-xs font-black uppercase tracking-wide text-slate-700">
              View combo badges ({comboItems.length})
            </summary>
            <div className="mt-2 space-y-2">
              {comboItems.map((comboBadge) => (
                <div
                  key={`${item.id}-${comboBadge.id}`}
                  className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5"
                >
                  <img
                    src={comboBadge.image || item.image}
                    alt={comboBadge.name}
                    className="w-8 h-8 rounded-md object-cover shrink-0"
                  />
                  <p className="text-xs font-semibold text-slate-700 truncate">
                    {comboBadge.name}
                  </p>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    );
  })}
</div>

          </div>

          {/* RIGHT */}
<div className="space-y-8 lg:sticky lg:top-32">

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
            className="flex-1 min-w-0 p-3 rounded-xl border uppercase"
          />
          <button
            onClick={handleApplyPromo}
            disabled={promoLoading}
            className="w-full sm:w-auto shrink-0 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 font-black rounded-xl shadow-lg hover:shadow-xl hover:shadow-yellow-500/25 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-50 transition"
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

  {/* PRICE DETAILS CARD */}
  <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-white/70 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">

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
  {isInternational ? (
    <a
      href={`tel:${INTERNATIONAL_SALES_PHONE.replace(/\s/g, "")}`}
      className="block w-full py-5 text-center bg-slate-900 text-white font-black rounded-2xl shadow-lg hover:bg-slate-800 transition"
    >
      CONTACT US FOR INTERNATIONAL PRICING
    </a>
  ) : isLoggedIn ? (
    <button
      onClick={handlePlaceOrder}
      className="w-full py-5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 transition text-slate-900 font-black rounded-2xl shadow-lg hover:shadow-xl hover:shadow-yellow-500/25"
    >
      PLACE ORDER NOW
    </button>
  ) : (
    <div className="space-y-3">
      {/* Login required before payment — orders must be tied to an account
          so they can be saved, tracked, and delivered to a saved address. */}
      <button
        onClick={handleLoginAndContinue}
        className="w-full py-5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 transition text-slate-900 font-black rounded-2xl shadow-lg hover:shadow-xl hover:shadow-yellow-500/25"
      >
        LOGIN &amp; CONTINUE
      </button>

      <p className="text-center text-xs text-slate-500">
        Please log in to place your order — it lets you save your address, track
        the order, and see it in your profile. Your cart stays intact.
      </p>
    </div>
  )}
  </div>
</div>

        </div>
      </div>
    </div>
  );
}
