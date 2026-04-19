# Lumenskart

Production-grade Next.js ecommerce platform with:

- Storefront + Account
- Admin CMS + analytics
- Clerk auth and role-based admin protection
- MongoDB/Mongoose data model
- CMS-driven theme/content (including hero carousel)

## 1) Local setup

### Prerequisites

- Node.js 20+
- npm
- MongoDB (local or Atlas)
- Clerk account + app

### Install

```bash
npm install
```

### Configure environment

Copy `.env.example` values into `.env.local` and fill real keys.

Required core variables:

- `MONGODB_URI`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_WEBHOOK_SECRET`

Run app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## 2) Admin access setup (Clerk role)

Admin routes are protected by role checks in:

- `src/proxy.ts`
- `src/app/(admin)/layout.tsx`
- `src/lib/auth/requireAdmin.ts`

Expected role value is in Clerk session metadata:

- `metadata.role = "admin"` or
- `metadata.role = "super_admin"`

### How to set admin role in Clerk

1. Open Clerk Dashboard -> Users.
2. Open your user.
3. Add/update public metadata (or session metadata flow used in your setup) with:

```json
{
  "role": "admin"
}
```

4. Sign out and sign in again (refreshes session claims).
5. Visit `http://localhost:3000/admin/dashboard`.

If role is missing/wrong, user is redirected to `/access-denied`.

## 3) CMS hero carousel setup (text + image slider)

Hero now uses CMS-driven carousel config from `homepage.heroCarousel`:

- `autoplayMs`
- `slides[]`: `title`, `subtitle`, `ctaLabel`, `ctaHref`, `imageUrl`
- `sideCards[]`: `title`, `subtitle`, `ctaLabel`, `ctaHref`, `imageUrl`

### Where to edit

Admin -> `CMS Homepage` -> `Homepage` tab:

- `Autoplay timing in ms`
- `Hero Slides JSON`
- `Right Cards JSON`

### Sample slides JSON

```json
[
  {
    "title": "Stay With Our Advanced IC Technologies",
    "subtitle": "Reliable component sourcing for manufacturing scale.",
    "ctaLabel": "Explore Now",
    "ctaHref": "/category/all",
    "imageUrl": "/hero-placeholder.svg"
  },
  {
    "title": "High Efficiency Components",
    "subtitle": "Optimized for production reliability.",
    "ctaLabel": "Shop Now",
    "ctaHref": "/category/all",
    "imageUrl": "/hero-placeholder.svg"
  }
]
```

If `imageUrl` is empty, app automatically uses `/hero-placeholder.svg` so slides never look blank.

## 4) Admin test checklist

### Auth and route protection

- Logged-out user opening `/admin/dashboard` -> redirected to `/sign-in`.
- Logged-in non-admin user opening `/admin/dashboard` -> redirected to `/access-denied`.
- Admin user can access `/admin/*` and `/api/v1/admin/*`.

### CMS functionality

- Update navbar colors in CMS and verify storefront updates.
- Update hero slides JSON + autoplay and verify:
  - text + image change together
  - arrows work
  - drag/swipe works
  - dots work
- Update right cards JSON and verify right panel contents.

### API sanity

- `GET /api/v1/cms` returns config.
- `PATCH /api/v1/cms` persists updates.

### Build and lint

```bash
npm run lint
npm run build
```

Both should pass before deployment.

## 5) Troubleshooting

- Admin still denied after role update:
  - sign out/in again
  - verify role key is exactly `role`
  - verify value is exactly `admin` or `super_admin`
- Hero image not showing:
  - check `imageUrl` path is valid
  - for local assets, place under `public/` and use `/filename.ext`
- CMS save fails:
  - ensure JSON editors contain valid JSON arrays/objects
