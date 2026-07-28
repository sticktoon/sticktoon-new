# StickToon

Full-stack e-commerce platform for a sticker and badge brand — storefront,
custom badge designer, payments, invoicing, an admin back office, and an
influencer programme.

**Live:** https://sticktoon.shop

## Features

### Storefront
- Product catalog with categories, sticker and badge detail pages
- Cart and checkout with online payment
- Custom orders — upload artwork and order made-to-spec
- **Badge Editor** — in-browser badge designer with circular image cropping and
  AI-assisted generation via Google Gemini
- Customer accounts: Google OAuth or email/password, password reset
- Product reviews, order history, downloadable PDF invoices
- Contact form, FAQ, About, and full policy pages

### Admin
- Dashboard with revenue reporting
- Product, order and user management
- Promo code management
- Invoice generation and viewing
- Activity logs and audit trail
- Influencer management: deals, conversions, earnings, withdrawal requests
- Role-based access control

## Tech stack

**Frontend** — React 19, TypeScript, Vite, Tailwind CSS, MUI, React Router,
Axios, `html2canvas` + `jspdf` (client-side invoice/badge export)
**Backend** — Node.js, Express, MongoDB (Mongoose), JWT, bcrypt
**Payments** — Razorpay, Cashfree
**Media** — Cloudinary, Multer
**Auth** — JWT + Google OAuth (`@react-oauth/google`, `googleapis`)
**Email** — Brevo (`sib-api-v3-sdk`)
**AI** — Google Gemini (`@google/genai`) for badge generation
**PDF** — PDFKit (server-side invoices)

## Getting started

```sh
git clone https://github.com/sticktoon/sticktoon-new.git
cd sticktoon-new
npm install
cp .env.example .env     # fill in the values below
npm run dev
```

Frontend dev server and backend are run separately — the Express app lives in
`backend/`.

## Environment

### Frontend (`.env`)

Copy `.env.example` and fill in:

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend base URL (`http://localhost:5000` in dev) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client id |
| `VITE_SUPER_ADMIN_EMAIL` | Account granted super-admin access |
| `GEMINI_API_KEY` | Google Gemini key for the badge editor |

Anything prefixed `VITE_` is inlined into the browser bundle and publicly
readable. Only public identifiers belong here.

### Backend (`backend/.env`)

MongoDB connection string, JWT secret, Razorpay and Cashfree keys, Cloudinary
credentials, Google OAuth client secret, and the Brevo API key. **All secrets —
never in a `VITE_` variable.**

See [ADMIN_SETUP.md](ADMIN_SETUP.md) and
[GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) for the full setup walkthroughs.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build |

## Project structure

```
pages/            Storefront + admin screens
  Home, Products, Stickers, Categories, StickerDetail, BadgeDetail,
  CustomOrder, Checkout, OrderSuccess, Invoice, Profile, Login,
  ResetPassword, Contact, Faq, About, ProductReviews,
  Admin*, and policy pages
BadgeEditor.tsx   Badge designer
geminiService.ts  Gemini integration
backend/
  config/         db, razorpay, cashfree, invoiceProfile
  controllers/    Route handlers
  middleware/     auth, roleMiddleware
  models/         User, Product, Order, Cart, Invoice, Review,
                  PromoCode, Lead, Task, Setting, ActivityLog,
                  SupportMessage, InfluencerEarning, WithdrawalRequest
utils/, config/   Shared frontend helpers
```

## Deployment

Frontend on Vercel (`vercel.json`), backend on Render — see
[RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md). Set every environment variable in
the host dashboard; `VITE_` values are baked in at build time, so changing one
requires a rebuild.
