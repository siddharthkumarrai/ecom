You are continuing development on **Lumenskart** — a production-grade, full-stack 
e-commerce platform built with Next.js 15 App Router. The project is already 
substantially built. Do NOT reinitialize or overwrite existing files unless 
explicitly asked. Always read existing files before modifying them.

---

## 🏗️ WHAT HAS ALREADY BEEN BUILT

### Core Platform
- Full storefront at `src/app/(store)/*`
- Admin CMS dashboard at `src/app/(admin)/*`
- REST APIs at `src/app/api/v1/*`
- Webhooks at `src/app/api/webhooks/*` (Razorpay HMAC-verified, Clerk svix-verified)

### Authentication
- Clerk auth with role-based middleware in `src/proxy.ts`
- Admin guard in `src/lib/auth/requireAdmin.ts` (role: `admin` | `super_admin`)
- Admin layout guard in `src/app/(admin)/layout.tsx`
- Clerk webhook → MongoDB user sync at `src/app/api/webhooks/clerk/route.ts`

### Database Models (MongoDB + Mongoose) — all in `src/lib/db/models/`
- `Product.model.ts` — with `costPrice`, `sellingPrice` (→`basePrice`), `images[]`, 
  `productDeliveryCharge`, `specifications`, `technicalDocuments`, `averageRating`, 
  `reviewCount`, `isCODEnabled`, `isPrepaidOnly`, `stock`, `minOrderQty`, `maxOrderQty`
- `Category.model.ts` — full CRUD with slug auto-gen
- `Brand.model.ts`
- `Order.model.ts` — with `paymentStatus` enum including `"abandoned"`, 
  `trackingEvents[]`, `taxAmount`, `shiprocketShipmentId`, `awbCode`, `trackingUrl`
- `User.model.ts` — with `wishlist[]`, `addresses[]` (with `_id` for CRUD), `role`
- `SiteConfig.model.ts` — THE CMS BRAIN:
  - `announcement` (scrolling bar, multi-message, colors)
  - `heroBanner` (slides with image, title, CTA)
  - `homepageSections[]` (type, order, enabled, config)
  - `homepage.categorySections[]` (dynamic category product sections after hero)
  - `shipping` (freeShippingThreshold, codCharge, codEnabled, taxPercent, zones, express)
  - `payment` (activeProvider, razorpay config, UPI, bank transfer)
  - `promotions.coupons[]` (full coupon model — see below)
  - `branding` (storeName, logoUrl)
  - `navigation`, `seo`, `footer`
- `ProductReview.model.ts` — verified purchase only, unique (product, user)
- `Coupon.model.ts` (via SiteConfig) — with `appliesTo`, `targetIds`, `usageLimit`, 
  `perUserLimit`, `startsAt`, `endsAt`, `firstOrderOnly`, status chips
- `SupportTicket.model.ts`
- `Wishlist` — stored on `User.wishlist[]`

### Admin CMS Pages — all at `src/app/(admin)/admin/`
- `dashboard/` — analytics (revenue, orders, fraud alerts, low stock)
- `products/` — full CRUD, image upload via Cloudinary, inline delivery charge edit,
  image reorder (up/down/remove), thumbnail in table, edit page
- `categories/` — full CRUD, slug auto-gen with manual override
- `brands/` — CRUD
- `orders/` — order list, status management
- `tracking/` — shipment management (Create Shipment, Sync Tracking, Manage inline editor 
  for AWB/courier/trackingUrl/deliveryStatus, mock mode badge, activity log drawer)
- `coupons/` — Shopify-style coupon manager (no raw JSON), with status chips 
  (Scheduled/Active/Expired/Limit Reached), product-wise + category-wise scope
- `shipping/` (renamed to "Delivery Charges" in sidebar) — tax%, COD, free shipping 
  threshold, product delivery charge, zones, express shipping
- `cms/homepage/` — full CMS builder:
  - Announcement bar (messages, colors, scroll speed)
  - Hero banner slides
  - Category sections after hero (add/remove/reorder/toggle)
  - Appearance (button colors, store name, logo upload via Cloudinary)
  - Live preview (iframe, localhost/production/custom URL toggle, auto-refresh after save)
  - "Open full preview page" → `/admin/cms/preview`
- `cms/preview/` — full-width storefront preview page
- `support/` — ticket management

### Storefront Pages — all at `src/app/(store)/`
- `page.tsx` — CMS-driven homepage with dynamic category sections, hero carousel
- `products/[slug]/` — full PDP:
  - Multi-image gallery with thumbnail switching
  - ProductImageGallery component
  - Pricing: costPrice (strikethrough) + sellingPrice + discount % badge
  - Out-of-stock modal popup
  - Add-to-cart / Buy Now success popup ("Back to shopping" / "Proceed")
  - Wishlist heart (green fill, WishlistHeartButton component)
  - ProductDetailTabs (Description / Specification / Reviews / Technical Documents)
  - RelatedProductsRow
  - Reviews section (purchased customers only)
  - Yellow theme buttons with darker hover
- `category/[slug]/` — DB-backed product listing
- `brands/[slug]/` — DB-backed
- `cart/` — CartClient with table layout (Qty/Product/Price/Total/Remove), coupon input, 
  tax/delivery/total breakdown, yellow CTA
- `checkout/shipping/` — product summary table (image, qty, price, tax, remove), 
  shipping address form, prefilled from saved address / localStorage
- `checkout/billing/` — "Same as shipping" option, order summary card
- `checkout/payment/` — styled payment method cards, order summary, Razorpay modal, 
  abandon on modal dismiss
- `checkout/confirmation/` — order ID, full breakdown (subtotal/tax/delivery/discount/total),
  payment method/status/delivery status with color-coded badges, Track Order button
- `account/dashboard/` — real data (spend, cart count, wishlist count, orders count)
- `account/orders/` — real DB orders, color-coded status badges, AWB display, Track Order button
- `account/orders/[orderId]/` — Amazon-style tracking page:
  - White/yellow theme
  - Real-time polling (10s/20s/off auto-refresh)
  - "Last updated X ago" relative time badge
  - Manual "Refresh Live" button (triggers provider sync)
  - Vertical progress timeline (real events or status-based fallback)
  - Delivery address, AWB, courier, order snapshot
- `account/orders/[orderId]/track/` — redirect handler (auto-creates shipment if missing)
- `account/wishlist/` — real data, remove items
- `account/profile/` — AddressManager component (add/edit/delete/set default addresses),
  phone, photo, password update

### Key Components
- `src/components/store/layout/Header.tsx` — CMS branding (logo/name), cart badge, 
  wishlist badge, responsive mobile hamburger
- `src/components/store/layout/AnnouncementBar.tsx` — CMS-driven scrolling ticker
- `src/components/store/layout/Footer.tsx` — CMS-driven, responsive
- `src/components/store/layout/AllCategoryMenu.tsx` — responsive dropdown
- `src/components/store/home/HeroBanner.tsx` — autoplay carousel with arrows/dots/swipe
- `src/components/store/home/HomeCategorySection.tsx` — product cards (image, price, 
  discount badge, low-stock red label, wishlist heart, star rating)
- `src/components/store/product/ProductCard.tsx` — same features
- `src/components/store/product/ProductDetailClient.tsx` — qty controls, Add to Cart, 
  Buy Now (replaceCart:true), success popup, out-of-stock modal, CMS button colors
- `src/components/store/product/ProductDetailTabs.tsx`
- `src/components/store/product/ProductImageGallery.tsx`
- `src/components/store/product/RelatedProductsRow.tsx`
- `src/components/store/product/ProductReviews.tsx`
- `src/components/store/product/RatingStars.tsx`
- `src/components/store/wishlist/WishlistHeartButton.tsx` — fills on mount (GET check), 
  green fill
- `src/components/store/cart/CartClient.tsx`
- `src/components/store/account/OrderTrackingLiveClient.tsx` — live polling, relative time
- `src/components/store/account/AddressManager.tsx`

### Payment (Modular Provider Pattern)
- Interface: `src/lib/providers/payment/PaymentProvider.interface.ts`
- Razorpay: `src/lib/providers/payment/RazorpayProvider.ts`
- Secure flow: order created as `pending` → finalized ONLY on verified payment success
- Finalization: `src/lib/orders/finalizePaidOrder.ts` (stock decrement, cart clear, status)
- Abandon on modal dismiss: calls `/api/v1/orders/abandon`
- Webhook (HMAC/SHA256): `src/app/api/webhooks/razorpay/route.ts`
- Amount ALWAYS recalculated server-side (never trusted from client)

### Shipping (Modular Provider Pattern)
- Interface: `src/lib/providers/shipping/ShippingProvider.interface.ts`
- Shiprocket: `src/lib/providers/shipping/ShiprocketProvider.ts`
  - Auto-token refresh (9-day cache)
  - Supports `SHIPROCKET_API_EMAIL` / `SHIPROCKET_API_PASSWORD` (preferred over legacy vars)
  - Mock mode: `SHIPROCKET_MOCK_MODE=true` for local testing
  - Returns `trackingEvents[]` for timeline
- Order lifecycle: pending → (admin creates shipment) → confirmed → shipped → delivered
- Shipment creation sets `deliveryStatus: "confirmed"` (NOT payment success)

### Cart & Pricing Engine
- `src/lib/cart/pricing.ts` — coupon validation (scope, dates, usage limits, first-order-only),
  product-wise delivery charge, dynamic tax%, global shipping rules
- Cart stored in MongoDB for auth users, localStorage for guests
- Merge on login

### Cloudinary
- Utility: `src/lib/media/cloudinary.ts`
- Upload API: `src/app/api/v1/admin/uploads/image/route.ts`
- Used for: product images (multi-image, CRUD with delete on replace/remove), 
  store logo upload from CMS

### Performance & Caching
- ISR: homepage 60s, products 300s
- `export const dynamic = "force-dynamic"` on tracking API
- MongoDB lean queries, compound indexes

---

## 🔧 ENV VARIABLES NEEDED

```env
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
MONGODB_URI=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
SHIPROCKET_API_EMAIL=
SHIPROCKET_API_PASSWORD=
SHIPROCKET_MOCK_MODE=false
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_PRODUCTION_URL=
```

---

## ⚠️ KNOWN NON-BLOCKING ISSUES (do not fix unless asked)

- Lint warning in `HeroBanner.tsx`: `<img>` should be `next/image` — kept for animation
- Build warning: duplicate mongoose index on `User.email`
- CMS homepage `<img>` warning — existing, unrelated to feature work

---

## 📋 RULES FOR THIS SESSION

1. **Read before writing** — always check the existing file before modifying it
2. **Never reinitialize** — do not run create-next-app or overwrite project structure
3. **Maintain provider pattern** — payment/shipping providers are swappable interfaces
4. **CMS-first** — nothing on storefront should be hardcoded; all content from SiteConfig
5. **Security** — always verify payment server-side; never trust client amounts
6. **After every change**: run `npm run lint` and `npm run build` and report results
7. **Yellow theme** — primary CTA color `#f5c400`, hover `#ffd84d` (unless CMS overrides)
8. **Hydration safety** — never use `Date.now()`, `Math.random()`, or `window` in initial 
   render; always use `useEffect` + null initial state for client-only values

---