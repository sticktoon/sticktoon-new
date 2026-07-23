# StickToon — Website Fix Backlog

Tracking of issues from `website fix.docx`. Status as of 2026-07-23.

## ✅ Done
- **#1** Badges + Stickers manageable in admin + storefront (magnets pending — see #18)
- **#9** Stickers clickable → detail page (DB-backed, shows size/pack/description)
- **#16** Brand tagline "Soul" → "souls"
- **#20** Sticker size / pack-count fields (admin add/edit + detail page)
- **#23** Admin products search bar (collapse still pending)

## 🔜 In progress / next
- **#29 + #30 + #31 + Profile** — Login required at checkout (minimal fields: name/email/phone/password signup, email-or-phone + password signin), saved **address book** (add / select / edit / delete / default) like Zomato, Checkout shows selected address details, Profile shows all user details + all addresses. Login/Signup UI polish.
- **#2** Home badge click → that specific badge; show priority, else "out of stock".
- **#3** Add-to-cart feedback (mini-cart / toast so user sees what's added without opening cart).
- **#4** Independent scroll: scrolling the sidebar must NOT scroll the right-side content, and vice-versa (currently broken on sidebar pages).
- **#14 / #15** Custom badge image persists after logout; add option to delete the uploaded image.
- **#22** All popup/modal windows must stay inside the screen (some overflow off-screen). Fix for ALL modals.
- **#24 / #25** Duplicate dashboards / inconsistent UI — scan whole codebase, keep ONE CRM dashboard with proper redirects. **Do carefully.**
- **#26** Back button everywhere in admin.
- Profile/orders: canceled order still shows, "my orders" redirect/remove, track order, remove repeated options, remove "upload photo" → allow toons as profile pic.

## 🟡 Needs external access / big AI task — DEFERRED
- **#6 / #7 / #8 / #17 — Instagram integration.** Requires **Instagram Graph API access** (business account + webhook setup). Blocked until that is provided.
  - #6: clicking "place order" from Insta page directly places an order in Insta chat — should not.
  - #7: bot to ask "want to order? how many?" → better redirect to the specific product on the website.
  - #8: DM only for questions/inquiries, not orders. Decide how DM orders are tracked.
  - #17: after unsending the "place order" message it still shows "waiting for confirmation".
  - **Doable without API now:** only the "redirect Insta CTA → website product" part.
- **#21 — Bunch price == single price.** Correct pricing needs analysing each product image to decide a per-product price (AI image analysis over the whole catalog). Deferred as a separate batch task; confirm before running (could touch every product).

## ❓ Needs a specific screen / repro from user
- **#10** Custom order on mobile: zoom / rotate / visibility issues → touch-based editing. (Scoped: mobile custom-badge editor rework.)
- **#13** Hover popup appears even when element isn't clickable.
- **#5 / #18 / #19 / #27** Fridge magnets as a product (badge + magnet variant); "fridge magnets" opens badges; tell customers magnets = badges + a magnet. Needs magnet-variant data model decision.
