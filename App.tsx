import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { 
  ShoppingCart, 
  User as UserIcon, 
  Menu, 
  X, 
  Search, 
  Heart, 
  Instagram, 
  Twitter, 
  Youtube,
  ArrowRight,
  Sparkles,
  ChevronDown,
  Mail,
  ContactIcon,
  Contact2
} from 'lucide-react';

import { Badge, CartItem, User as UserType } from './types.ts';
import { CATEGORIES } from "./constants";
import Home from "./pages/Home";
import Categories from "./pages/Categories";
import BadgeDetail from "./pages/BadgeDetail";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import CustomOrder from "./pages/CustomOrder";
import Contact from "./pages/Contact";
import About from "./pages/About";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminOrders from "./pages/AdminOrders";
import AdminRevenue from "./pages/AdminRevenue";
import AdminUserOrders from "./pages/AdminUserOrders";
import AdminInvoice from "./pages/AdminInvoice";
import AdminPromo from "./pages/AdminPromo";
import AdminInfluencerManage from "./pages/AdminInfluencerManage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";
import RefundCancellation from "./pages/RefundCancellation";
import Faq from "./pages/Faq";
import Influencer from "./pages/Influencer";
import Admin from "./pages/Admin";
import OrderSuccess from "./pages/OrderSuccess";
import Profile from "./pages/Profile";




/* =======================
   AUTH USER (Mongo-based)
======================= */
type AuthUser = {
  id: string;
  name?: string;
  email: string;
  avatar?: string;
  role?: string; // ✅ ADD THIS
};


/* =======================
   LOGO
======================= */
const Logo: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const scale = size === 'sm' ? 0.7 : size === 'lg' ? 1.2 : 1;
  
  return (
    <div className="perspective-container w-full flex justify-center select-none"
style={{ transform: `scale(${scale})` }}>
      <div className="relative">
       <img 
  src="/images/STICKTOON_LONG.jpeg" 
  alt="STICKTOON" 
  className="h-10 sm:h-12 w-auto max-w-[140px] sm:max-w-none object-contain mx-auto"
/>

        
        {/* Blinking Eyes Overlay - Adjusted to cover original eyes */}
        <div className="absolute top-[58%] left-[60.9%] -translate-y-1/2 flex gap-[0.5px]">
          {[1, 2].map((i) => (
            <div key={i} className="w-[19.5px] h-[20px] rounded-full bg-white flex items-center justify-end overflow-hidden shadow-inner pr-[1px]">
              <div className="eye-blink w-[9px] h-[11px] bg-black rounded-full"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
/* =======================
   NAVBAR
======================= */
const Navbar: React.FC<{ cartCount: number; user: AuthUser | null }> = ({
  cartCount,
  user,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { name: "HOME", path: "/" },
    { name: "CATEGORIES", path: "/categories" },
    { name: "CUSTOMIZE", path: "/custom-order" },
    { name: "CONTACT", path: "/contact" },
  ];

  return (
<nav
  className={`fixed top-0 left-0 right-0 z-50
    bg-black
    shadow-[0_6px_20px_rgba(0,0,0,0.5)]
    transition-all duration-300
    h-[80px] ${scrolled ? "h-[52px]" : ""}
  `}
>





<div className="px-6 lg:px-12 h-full flex items-center justify-between">


<div className="flex lg:hidden justify-start">
  <button
    onClick={() => setIsOpen(!isOpen)}
    className="p-2 rounded-xl text-white hover:bg-slate-800 transition"
  >
    {isOpen ? <X size={26} /> : <Menu size={26} />}
  </button>
</div>


    {/* LOGO */}
    <div className="flex justify-center lg:justify-start">
  <Link to="/">
    <Logo />
  </Link>
</div>


    {/* NAV LINKS */}
    <div className="hidden lg:flex items-center space-x-16">
      {navLinks.map((link) => (
        <div key={link.name} className="relative group">
          <Link
            to={link.path}
            className={`
              relative flex items-center gap-2
             text-sm font-extrabold tracking-[0.18em] uppercase

              transition-all
             ${
  location.pathname === link.path
    ? "text-yellow-400"
    : "text-slate-300 hover:text-white"
}

            `}
          >
            {link.name}

            {link.name === "CATEGORIES" && (
              <ChevronDown
                className="
                  w-5 h-5
                  transition-transform duration-300
                  group-hover:rotate-180
                "
              />
            )}

            {/* underline */}
            <span
              className={`absolute -bottom-1 left-0 w-full h-[2px] bg-yellow-400
                transform origin-left transition-transform duration-300
                ${
                  location.pathname === link.path
                    ? "scale-x-100"
                    : "scale-x-0 group-hover:scale-x-100"
                }`}
            />
          </Link>

          {/* 🔽 CATEGORIES DROPDOWN */}
          {link.name === "CATEGORIES" && (
            <div
              className="
                absolute top-full left-0 pt-6
                opacity-0 translate-y-4 pointer-events-none
                group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto
                transition-all duration-300 ease-out z-50
              "
            >
              <div className="
                bg-white rounded-3xl
                shadow-[0_40px_80px_-15px_rgba(67,56,202,0.15)]
                border border-indigo-50
                w-64 py-4
              ">
                {CATEGORIES.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/categories?cat=${cat.id}`}
                    className="
                      flex items-center justify-between
                      px-8 py-4
                      text-sm font-black uppercase tracking-widest
                      text-slate-500 hover:text-indigo-600
                      hover:bg-indigo-50/50
                      border-l-4 border-transparent hover:border-indigo-600
                      transition-all
                    "
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>


    {/* RIGHT ICONS */}
   {/* RIGHT ICONS */}
<div className="flex items-center gap-4 justify-end min-w-[90px] sm:min-w-0">

  {/* 🛒 CART — ALWAYS VISIBLE */}
  <Link
    to="/checkout"
     className="relative p-2 sm:p-3 rounded-2xl text-slate-300 hover:bg-slate-800 hover:text-white transition"
  >
    <ShoppingCart className="w-6 h-6" />

    {cartCount > 0 && (
    <span className="
  absolute 
  -top-1 -right-1
  sm:top-1 sm:right-1
  w-5 h-5 rounded-full
  bg-indigo-600 text-white text-[9px] font-black
  flex items-center justify-center
  border-2 border-white
">

        {cartCount}
      </span>
    )}
  </Link>
<div className="hidden lg:block">
  {/* 👤 USER */}
  {user ? (
    <div className="relative group">
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name || user.email}
          className="w-10 h-10 rounded-full object-cover cursor-pointer border-2 border-transparent group-hover:border-indigo-500"
        />
      ) : (
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black uppercase cursor-pointer group-hover:bg-indigo-700">
          {(user.email?.charAt(0) || "U").toUpperCase()}
        </div>
      )}

      {/* DROPDOWN */}
      <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-lg border border-slate-100 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all origin-top-right z-50">
        <div className="px-4 py-3 border-b">
          <p className="font-bold">{user.name || "User"}</p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>

        <Link to="/profile" className="block px-4 py-3 text-sm font-bold hover:bg-indigo-50">
          My Profile
        </Link>

        {user.role === "admin" && (
          <Link to="/admin" className="block px-4 py-3 text-sm font-bold hover:bg-indigo-50">
            Admin Panel
          </Link>
        )}

        <button
          onClick={handleLogout}
          className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50"
        >
          Logout
        </button>
      </div>
    </div>
  ) : (
    <Link
      to="/login"
      className="p-3 rounded-2xl text-slate-300 hover:bg-slate-800 hover:text-white transition"
    >
      <UserIcon className="w-6 h-6" />
    </Link>
  )}
  </div>
</div>

  </div>

  {/* MOBILE MENU DROPDOWN */}
   <div
        className={`fixed inset-x-0 top-[72px] bg-black border-b border-slate-800 transition-all duration-300 lg:hidden ${
          isOpen
            ? "opacity-100 translate-y-0 visible"
            : "opacity-0 -translate-y-4 invisible pointer-events-none"
        }`}
      >
        <div className="flex flex-col p-6 space-y-4">

          {/* 👤 PROFILE SECTION (MOBILE) */}
          <div className="border-b border-slate-800 pb-4 mb-4">
            {user ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="block text-lg font-bold text-white"
                >
                  My Profile
                </Link>

                {user.role === "admin" && (
                  <Link
                    to="/admin"
                    onClick={() => setIsOpen(false)}
                    className="block mt-3 text-lg font-bold text-white"
                  >
                    Admin Panel
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="block mt-3 text-lg font-bold text-red-500"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="block text-lg font-bold text-white"
              >
                Login
              </Link>
            )}
          </div>

          {/* NAV LINKS */}
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={`block text-lg font-extrabold uppercase ${
                location.pathname === link.path
                  ? "text-yellow-400"
                  : "text-white"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>

  );
};

/* =======================
   FOOTER
======================= */
const Footer: React.FC = () => (
<footer className="bg-slate-900 text-white pt-8 pb-4 relative z-50">






   <div className="absolute bottom-0 right-1/4 w-[420px] h-[420px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none" />

    {/* <div className="w-full relative z-10"> */}
<div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">


   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-y-10 gap-x-12 mb-10">




      <div className="text-left">


      <Link
  to="/"
  className="inline-block mx-auto sm:mx-0 transition-transform duration-300 hover:scale-105"
>


            <Logo size="md" />
          </Link>
          <p className="text-slate-400 max-w-xs leading-relaxed font-medium">
            Premium die-cut badges for the digital generation.
          </p>
        </div>

        <div className="text-center sm:text-left">

         <div className="mb-5">
  <h4 className="font-black text-xs tracking-[0.2em] text-white/70">
    ARCHIVE
  </h4>
 <div className="mt-2 w-6 h-[2px] bg-white/20 rounded-full"></div>

</div>

          <ul className="space-y-3">
            <li><Link to="/about" className="text-sm font-bold text-slate-300 hover:text-white transition-colors">OUR STORY</Link></li>
            <li><Link to="/categories" className="text-sm font-bold text-slate-300 hover:text-white transition-colors">ALL DROPS</Link></li>
            {/* <li><Link to="/custom-order" className="text-sm font-bold text-slate-300 hover:text-white transition-colors">CUSTOM MOCKUPS</Link></li> */}
          </ul>
        </div>
{/* INFORMATION */}
<div className="text-center sm:text-left">

 <div className="mb-8">
  <h4 className="font-black text-xs tracking-[0.2em] text-white/70">
    INFORMATION
  </h4>
  <div className="mt-2 w-6 h-[2px] bg-white/30 rounded-full"></div>
</div>


  <ul className="space-y-5">
    <li>
     <Link
  to="/privacy-policy"
  className="
    inline-block
    py-1
    text-sm
    font-bold
    text-slate-300
    hover:text-white
    transition-colors
  "
>
  PRIVACY POLICY
</Link>

    </li>

    <li>
      <Link
        to="/terms-conditions"
        className="text-sm font-bold text-slate-300 hover:text-white transition-colors"
      >
        TERMS & CONDITIONS
      </Link>
    </li>

    <li>
      <Link
        to="/refund-cancellation"
      className="
    inline-block
    py-1
    text-sm
    font-bold
    text-slate-300
    hover:text-white
    transition-colors
  "
      >
        REFUND POLICY
      </Link>
    </li>
  </ul>
</div>

      <div className="text-left">


        <div className="mb-8">
  <h4 className="font-black text-xs tracking-[0.2em] text-white/70">
    SUPPORT
  </h4>
  <div className="mt-3 w-8 h-[2px] bg-white/30 rounded-full"></div>


</div>

          <ul className="space-y-5">
            {/* <li><button className="text-sm font-bold text-slate-300 hover:text-white transition-colors">TRACK ORDER</button></li>
            <li><button className="text-sm font-bold text-slate-300 hover:text-white transition-colors">SHIPPING POLICY</button></li> */}
            <li><Link to="/custom-order" className="
    inline-block
    py-1
    text-sm
    font-bold
    text-slate-300
    hover:text-white
    transition-colors
  ">CUSTOM ORDER</Link></li>
            <li><Link to="/contact" className="
    inline-block
    py-1
    text-sm
    font-bold
    text-slate-300
    hover:text-white
    transition-colors
  ">GET IN TOUCH</Link></li>

             {/* ✅ FAQ LINK */}
    <li>
      <Link
        to="/faq"
        className="
    inline-block
    py-1
    text-sm
    font-bold
    text-slate-300
    hover:text-white
    transition-colors
  "
      >
        FAQ
      </Link>
    </li>
{/* ✅ PRIVACY POLICY — EXACTLY BELOW FAQ
    <li>
      <Link
        to="/privacy-policy"
        className="text-sm font-bold text-slate-300 hover:text-white transition-colors"
      >
        PRIVACY POLICY
      </Link>
    </li> */}
    {/* <li>
    <Link to="/terms-conditions">TERMS & CONDITIONS</Link>
  </li>
  <li>
    <Link to="/refund-cancellation">
      REFUND & CANCELLATION POLICY
    </Link>
  </li> */}
          </ul>
        </div>
      

     <div>
      <div className="mb-8">
  <h4 className="font-black text-xs tracking-[0.2em] text-white/70">
    FOLLOW
  </h4>
  <div className="mt-2 w-6 h-[2px] bg-white/30 rounded-full"></div>
</div>

       <div className="flex justify-center sm:justify-start gap-4">

          {/* Instagram */}
          <a
            href="https://www.instagram.com/sticktoon.shop"
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-indigo-600 hover:scale-110 transition-all"
          >
            <Instagram className="w-5 h-5 text-white" />
          </a>

          {/* Mail */}
          <a
            href="mailto:sticktoon.xyz@gmail.com" role = "link"
            className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-indigo-600 hover:scale-110 transition-all"
          >
            <Mail className="w-5 h-5 text-white" />
          </a>
        </div>
      </div>


      </div>
      {/* <div className=" pt-6 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black tracking-widest text-slate-500 uppercase"> */}

        {/* <span>© 2024 STICKTOON MARKETPLACE</span> */}
        {/* Footer Bottom Bar */}
{/* BOTTOM STRIP */}
{/* FOOTER BOTTOM STRIP */}
<div className="mt-10 pt-4 border-t border-white/5">
  <div className="w-full px-4 lg:px-16 py-2">

<div className="
  grid
  grid-cols-1
  md:grid-cols-[auto_1fr_auto]
  gap-y-6
  items-center
  w-full
">


      {/* LEFT */}
     <div className="text-xs tracking-widest text-slate-400 uppercase text-center md:text-left">

        <p>© 2026 StickToon</p>
        <p className="mt-1">Where design meets personal identity.</p>
      </div>

      {/* SPACER (forces separation) */}
      <div />

      {/* RIGHT — TRUE RIGHT EDGE */}
      <div className="flex flex-col md:flex-row items-center gap-4 md:justify-end">

        <span className="text-xs font-bold tracking-widest text-slate-300 uppercase whitespace-nowrap">
          100% Secure Payments
        </span>

        <div className="flex flex-wrap justify-center md:justify-end gap-2">

          {[, "VISA", "MASTERCARD", "UPI", "GPAY", "PAYTM", "RUPAY"].map(
            (method) => (
             <span
  key={method}
  className="
    px-3 py-1 rounded-md
    bg-white/5 border border-white/10
    text-[10px] font-bold text-white/80
    cursor-pointer
    transition-all duration-200 ease-out
    hover:bg-indigo-500/20
    hover:border-indigo-400/40
    hover:text-white
    hover:-translate-y-[1px]
    hover:shadow-[0_6px_18px_rgba(99,102,241,0.25)]
  "
>
  {method}
</span>

            )
          )}
        </div>

      </div>
    </div>

  </div>
</div>



   {/* <div className="flex gap-8">
  <Link
    to="/privacy-policy"
    className="hover:text-white transition-colors"
  >
    PRIVACY POLICY
  </Link>
</div> */}


      </div>
    {/* </div> */}
  </footer>
);

/* =======================
   APP
======================= */
const API_BASE_URL = import.meta.env.VITE_API_URL;

export default function App() {
  // Load cart from localStorage on initial load (for guests)
  const [cart, setCart] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem("cart");
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [cartLoaded, setCartLoaded] = useState(false);

  // Save cart to localStorage whenever it changes (for guests or as backup)
  useEffect(() => {
    if (cartLoaded) {
      localStorage.setItem("cart", JSON.stringify(cart));
    }
  }, [cart, cartLoaded]);

  /* 🔐 JWT AUTH CHECK + CART SYNC */
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (token && savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);

        // Sync cart with database for logged-in users
        try {
          const localCart = JSON.parse(localStorage.getItem("cart") || "[]");
          const res = await fetch(`${API_BASE_URL}/api/cart/sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ localCart }),
          });

          if (res.ok) {
            const data = await res.json();
            setCart(data.items || []);
            // Clear localStorage cart after sync (DB is source of truth)
            localStorage.removeItem("cart");
          }
        } catch (err) {
          console.error("Cart sync error:", err);
        }
      }
      setCartLoaded(true);
    };

    initAuth();
  }, []);

  /* =======================
   CART MANAGEMENT (Prevent Multiplication)
======================= */
  const syncCartWithDatabase = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("User is not authenticated");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/cart`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setCart(data.items || []); // Replace cart state instead of appending
      } else {
        console.error("Failed to fetch cart", await res.json());
      }
    } catch (err) {
      console.error("Error fetching cart", err);
    }
  };

  useEffect(() => {
    if (!cartLoaded) {
      syncCartWithDatabase();
      setCartLoaded(true); // Prevent multiple syncs
    }
  }, [cartLoaded]);

 const addToCart = async (badge: any) => {
  const qty = badge.quantity || 10;

    const token = localStorage.getItem("token");
    if (!token) {
      setShowLoginPrompt(true);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/cart/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          item: {
            id: badge.id,
            name: badge.name,
            price: badge.price,
            image: badge.image,
            category: badge.category,
          },
          quantity: qty,
        }),
      });
      if (res.ok) {
        await syncCartWithDatabase();
      } else {
        console.error("Failed to add to cart", await res.json());
      }
    } catch (err) {
      console.error("Error adding to cart", err);
    }
  };

  const removeFromCart = async (id: string) => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("User is not authenticated");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/cart/remove/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        await syncCartWithDatabase();
      } else {
        console.error("Failed to remove from cart", await res.json());
      }
    } catch (err) {
      console.error("Error removing from cart", err);
    }
  };

  const updateQuantity = async (id: string, q: number) => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("User is not authenticated");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/cart/update/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity: q }),
      });

      if (res.ok) {
        await syncCartWithDatabase();
      } else {
        console.error("Failed to update cart quantity", await res.json());
      }
    } catch (err) {
      console.error("Error updating cart quantity", err);
    }
  };

  const updateAvatar = async (newAvatar: string) => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("User is not authenticated");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/upload-avatar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatar: newAvatar }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser((prev) => (prev ? { ...prev, avatar: data.avatar } : null));
      } else {
        console.error("Failed to update avatar", await res.json());
      }
    } catch (err) {
      console.error("Error updating avatar", err);
    }
  };

  useEffect(() => {
    syncCartWithDatabase();
  }, []);

  return (
    <BrowserRouter>
      <Navbar
        cartCount={cart.reduce((a, b) => a + b.quantity, 0)}
        user={user}
      />

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full text-center">
            <h2 className="text-xl font-bold mb-4">Login Required</h2>
            <p className="mb-6">Please log in to add items to your cart.</p>
            <Link
              to="/login"
              className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition"
              onClick={() => setShowLoginPrompt(false)}
            >
              Go to Login
            </Link>
            <button
              className="block mt-4 text-slate-500 hover:text-slate-800 text-sm mx-auto"
              onClick={() => setShowLoginPrompt(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <main className="flex-grow pt-20">
        <Routes>
          <Route path="/" element={<Home addToCart={addToCart} />} />
          <Route path="/categories" element={<Categories addToCart={addToCart} />} />
          <Route path="/badge/:id" element={<BadgeDetail addToCart={addToCart} />} />
          <Route
            path="/checkout"
            element={
              <Checkout
                cart={cart}
                removeFromCart={removeFromCart}
                updateQuantity={updateQuantity}
              />
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/custom-order" element={<CustomOrder addToCart={addToCart} />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/Faq" element={< Faq/>} />
          <Route path="/privacypolicy" element={<PrivacyPolicy />} />
          <Route path="/termsconditions" element={<TermsConditions />} />
          <Route path="/returnsandrefunds" element={<RefundCancellation />} />
          <Route path="/about" element={<About />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/revenue" element={<AdminRevenue />} />
          <Route path="/admin/user-orders" element={<AdminUserOrders />} />
          <Route path="/admin/invoice/:id" element={<AdminInvoice />} />
          <Route path="/admin/promo" element={<AdminPromo />} />
          <Route path="/admin/influencers" element={<AdminInfluencerManage />} />
          {/* Admin Routes - Unified */}
          <Route path="/admin/login" element={<Admin />} />
          <Route path="/admin/dashboard" element={<Admin />} />
          <Route path="/admin/influencers" element={<Admin />} />
          <Route path="/admin/withdrawals" element={<Admin />} />
          <Route path="/admin/products" element={<Admin />} />
          {/* Influencer Portal Routes - Unified */}
          <Route path="/influencer/login" element={<Influencer />} />
          <Route path="/influencer/signup" element={<Influencer />} />
          <Route path="/influencer/dashboard" element={<Influencer />} />
          <Route path="/influencer/promo" element={<Influencer />} />
          <Route path="/influencer/withdraw" element={<Influencer />} />
          <Route path="/influencer/profile" element={<Influencer />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-conditions" element={<TermsConditions />} />
          <Route path="/refund-cancellation" element={<RefundCancellation />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
