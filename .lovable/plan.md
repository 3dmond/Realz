# Realz — Build Plan

A dark, cinematic sticker e-commerce SPA. Vite + React + React Router + Tailwind, backed by Lovable Cloud (Supabase) with mock seed data.

## 1. Framework migration (TanStack Start → Vite SPA)

Strip the current TanStack scaffolding and rebuild as a plain Vite SPA:

- Remove: `src/routes/`, `src/router.tsx`, `src/routeTree.gen.ts`, `src/start.ts`, `src/server.ts`, `wrangler.jsonc`, TanStack/Cloudflare deps, `@lovable.dev/vite-tanstack-config`.
- Add: `react-router-dom`, `@supabase/supabase-js`, `framer-motion`, `lucide-react` (already present via shadcn).
- New entry: `index.html` + `src/main.tsx` + `src/App.tsx` mounting `<BrowserRouter>` with all routes.
- Replace `vite.config.ts` with a minimal React + Tailwind v4 config (`@vitejs/plugin-react`, `@tailwindcss/vite`).
- Keep `src/styles.css`, all `src/components/ui/*`, `src/hooks/use-mobile.tsx`, `src/lib/utils.ts`.

## 2. Design system (`src/styles.css`)

Override the existing oklch tokens with the Realz palette:

- `--background` deep navy `#0a0b14`, `--card` `#0d1117`, `--foreground` pure white.
- `--primary` neon orange `#f97316` + `--primary-glow`.
- `--accent` electric cyan `#00fbff`.
- `--footer` pitch black `#030712`.
- Custom utilities: `.glass-panel` (black/45% + orange border + glow), `.text-micro` (9px / 0.3em tracking / 900 weight / uppercase), `.img-fade` (linear-gradient overlay), `.neon-glow` shadow.
- Fonts: Inter for body, a heavy display face (e.g. `Archivo Black` via Google Fonts) for headings/logo.

## 3. Lovable Cloud schema

Enable Cloud, then a single migration creates:

- `categories` (id, name unique, slug unique, created_at)
- `subcategories` (id, category_id FK CASCADE, name, slug, created_at)
- `products` (id, title, description, thumbnail_url, category_id FK, subcategory_id FK, keywords text[], is_featured bool, created_at)
- `orders` (id, customer_name, phone_number, delivery_address, total_quantity, total_price numeric, status default 'Pending Call', created_at)
- `order_items` (id, order_id FK CASCADE, product_id FK, quantity, calculated_price numeric)

RLS: public SELECT on categories/subcategories/products; public INSERT on orders/order_items; admin route uses a simple password gate (no auth system requested) — orders SELECT/UPDATE limited via a service-role edge approach is out of scope, so we'll allow public SELECT/UPDATE on orders for the demo admin dashboard and call this out.

Seed: ~6 categories, ~3 subcategories each, ~40 products with Unsplash thumbnail URLs.

## 4. Routes & pages

| Path           | File                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `/`            | `src/pages/Home.tsx` — hero, categories grid, packs grid, services masonry, featured stickers                            |
| `/shop`        | `src/pages/Shop.tsx` — sidebar icons, subcategory pill filters, keyword search, product grid w/ select state, pagination |
| `/product/:id` | `src/pages/Product.tsx` — large image, metadata, quantity selector with live tier preview                                |
| `/cart`        | `src/pages/Cart.tsx` — line items, tiered pricing engine, Pay-on-Delivery form, success screen                           |
| `/selections`  | `src/pages/Selections.tsx` — 60/40 glass panels, bulk tier list, checkout accordion, gallery modal                       |
| `/admin`       | `src/pages/Admin.tsx` — metrics grid + orders table with status toggle                                                   |
| `*`            | `NotFound.tsx`                                                                                                           |

Shared: `Header` (sticky translucent, hamburger drawer on mobile, cart badge), `Footer` (pitch-black thin bar).

## 5. Components

- `ProductCard` — 4:5 image, cyan micro-title, circular `+`/`−` glass button, selected state (orange border + glow + dim).
- `CategoryCard` — 4:5 image with hover zoom + cyan corner title.
- `ExploreMoreButton` — split white/orange text with animated underline.
- `FilterPill` — active (cyan solid) / inactive (white/10) variants.
- `SectionTitle` — spaced uppercase orange heading.
- `GlassPanel`, `Pagination` (square buttons), `SelectionsModal` (backdrop blur + grid + X buttons).

## 6. Cart & pricing engine

- Cart state in Zustand (lightweight) persisted to `localStorage`.
- `calcUnitPrice(qty)` returns 1.9 / 1.5 / 1.2 / 0.8 by tier; subtotal = sum(unitPrice(totalQty) × qty per line).
- Live tier preview on `/product/:id` and `/cart`.
- Checkout: zod-validated form (name, phone, address) → `orders` insert → map cart to `order_items` insert → clear cart → success screen.

## 7. Admin dashboard

- Metrics: total orders, total revenue, total stickers sold, top 3 subcategories (aggregated client-side from joined query).
- Orders table: id, customer, phone, qty, total, created_at, status dropdown (`Pending Call` → `Confirmed` → `Delivered` → `Cancelled`) updating via Supabase.
- Simple password gate (`localStorage` flag, password compared client-side) — documented as demo-grade.

## 8. Order of execution

1. Enable Lovable Cloud + run migration + seed.
2. Rip out TanStack files, install Vite SPA deps, write `vite.config.ts`, `index.html`, `main.tsx`, `App.tsx`.
3. Apply design tokens + utility classes in `styles.css`, wire fonts.
4. Build `Header`, `Footer`, shared components.
5. Build `Home` → `Shop` → `Product` → `Cart` → `Selections` → `Admin`.
6. Wire cart store, pricing engine, checkout submission.
7. Visual QA pass: tighten spacing, hover states, mobile layouts.

## Technical notes

- Supabase client: `@/integrations/supabase/client` with publishable key (auto-generated by Cloud).
- All images: Unsplash `?w=800&q=80` URLs for stable mock content.
- No SSR, no edge functions — pure client SPA hitting Supabase directly.
- Existing `src/components/ui/*` shadcn primitives are reused (Button, Input, Dialog, Drawer, Sheet, Accordion).
- Admin RLS caveat: public UPDATE on `orders` is intentional for the demo; in production this should move behind auth.
