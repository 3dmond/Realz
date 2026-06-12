# Realz

A high-performance, e-commerce platform built for a premium, custom vinyl sticker brand. Realz features progressive stepwise wholesale pricing, zero-overhead edge image optimization, and highly interactive tactile UI components.

## System Overview & Architecture

Realz is engineered as a fully decoupled Single Page Application (SPA) utilizing a modern, hardware-accelerated frontend coupled with a robust, cloud-native relational database layer. 

# Technical Architecture Stack

* **Client Interface (SPA)**
  * React 19
  * Vite 7
  * Tailwind v4
  * React Router 7

* **Local State Engine**
  * Zustand 5 (Persistent)
  * Cart Management & Local Persistence
  * Stepwise Dynamic Mathematics

* **Remote Cache Engine**
  * TanStack React Query v5
  * Asynchronous Remote Data Fetching

* **Edge & Backend Infrastructure**
  * Supabase JS v2 (PostgreSQL Relational Database)
  * Unsplash Edge Image CDN Optimizations

 # Database Schema & Relational Architecture

The backend infrastructure is built on a highly relational PostgreSQL architecture managed via Supabase JS v2. The schema enforces strict transactional integrity, data normalization, and cascade rules to support fluid order ingestion and relational data matching.

##  Database Relationships Matrix

* **categories** (`1`) ───► (`N`) **products**
  * One category (e.g., *Adult Cartoons*) maps to many individual sticker products. Removing a category is restricted if active products rely on its key constraint.
* **products** (`1`) ───► (`N`) **order_items**
  * A product can be added to multiple distinct checkout order rows.
* **orders** (`1`) ───► (`N`) **order_items**
  * One single user checkout order maps to an isolated sub-table grid of breakdown item rows. When an order is permanently cleared, its nested line items are deleted simultaneously via cascade rules (`ON DELETE CASCADE`).

---

##  Table Structural Schemes

### 1. Table: `categories`
Tracks our master high-level navigation design categories.
* `id` (uuid, Primary Key) — Unique identifier tracking the specific group.
* `name` (text) — The user-facing display string (e.g., "African", "Basketball").
* `slug` (text) — URL-safe sanitized browser route lookup key.

### 2. Table: `products`
Houses the core asset information data for individual custom stickers.
* `id` (uuid, Primary Key) — Unique item identifier.
* `title` (text) — The artwork text name.
* `thumbnail_url` (text) — CDN image asset target link.
* `keywords` (text[]) — Indexed array of search tags enabling instantaneous client-side grid matching.
* `category_id` (uuid, Foreign Key) — Relational link mapping directly back to `categories(id)`.

### 3. Table: `orders`
The direct ingestion table trapping incoming user checkout submissions.
* `id` (uuid, Primary Key) — Unique transactional invoice key.
* `customer_name` (text) — Filled out via the user's tactile notebook form.
* `phone_number` (text) — Strictly validated, zero-prefixed 10-digit delivery string.
* `location` (text) — Simplified geographical area string for shipping destination routing.
* `total_price` (numeric) — The immutable financial aggregate total processed by the stepwise engine.
* `status` (text) — Tracking workflow status, explicitly defaulting to `'Pending Call'`.
* `created_at` (timestamp) — Auto-generated registration timestamp marking incoming entries.

### 4. Table: `order_items`
The granular line-item lookup grid connecting orders to our product rows.
* `id` (uuid, Primary Key) — Isolated line row tracking identifier.
* `order_id` (uuid, Foreign Key) — Relational reference mapping to `orders(id)` with `ON DELETE CASCADE`.
* `product_id` (uuid, Foreign Key) — Relational reference mapping directly back to `products(id)`.
* `quantity` (integer) — The volume breakdown for this particular sticker choice.
* `calculated_price` (numeric) — The dynamic step-bracket price assigned at checkout confirmation.

# 📱 Client-Side Responsive Layout & Viewport Architecture

Realz enforces an adaptive, mobile-first presentation architecture. Instead of just compressing a desktop window to fit smaller screens, the client interface alters its structural layout, component trees, and navigation lifecycles depending on whether the user is browsing on a phone or PC.


##  Contextual Navigation Flow (Phone vs. PC)

The global header uses path tracking (`useLocation()`) and window break-testing to change its layout structure on-the-fly:

### PC Viewport Behavior
* **Permanent Discovery Bar:** The navigation bar stretches horizontally across the screen, layout paths and core categories are rendered as immediate action items.
* **No Side Drawer:** The hamburger menu button is completely unmounted. The desktop interface provides enough column space to show your sticker gallery grids and categories side-by-side without hiding menus behind a tap action.

### Phone Viewport Behavior
* **The Root Path Exception:** When the user is on the homepage (`/`), the header stays completely clean and minimal with only the branding logo visible. Because all category exploration links are already laid out as scrolling grid modules right on the page canvas, the hamburger button is hidden to prevent UI clutter.
* **Sub-Route Lockout:** The instant a user clicks a link and navigates into a sub-page (like `/shop`, `/product/:id`, or `/selections`), the hamburger button mounts instantly to the **top-left corner of the header**. Tapping it slides open a quick-switch mobile menu panel, allowing users to rapidly swap active product streams without returning to the home screen.

---

##  The Checkout Screen Overhaul (Selections.tsx)

On wide PC displays, the checkout screen executes a structured **60/40 Split Panel Grid Layout** to take advantage of desktop real estate. When viewed on a smartphone, this grid seamlessly stacks vertically to prioritize scanning readability and ease of input thumb targets.

### 1. The Sticker Tape Review Canvas
* **The Concept:** A visual playground that shows off selected sticker artwork right before checking out.
* **The Layout:** Images are arranged in a staggered grid. To mimic physical sticker layers overlapping on a workbench, each thumbnail component is assigned a pseudo-random rotation angle utility class (such as `rotate-[-4deg]`, `hover:rotate-0`) paired with a crisp hover-scaling animation.
* **Tactile Surface:** The background of this panel uses an integrated SVG topographic vector contour map overlay. The vector paths are protected with a `pointer-events-none` class, preventing the browser from wasting processing cycles tracking cursor hit-testing over intricate math paths during rapid scrolling.

### 2. The High-Contrast Thermal Receipt Ticket
* **The Concept:** Converts the dry, clinical checkout invoice table into a beautiful, old-school physical printout receipt.
* **The Layout:** Built using an opaque, bright `#ffffff` card block bordered by stylized jagged ticket edge cut-outs. 
* **The Details:** The pricing breakdown uses solid pitch-black text, monospace font layout systems, and custom dot-matrix dividing text strings (`---------------------`) to clearly print line counts and bracket totals with field-tested precision.

### 3. The Tactile Lined Notebook Diary Form
* **The Concept:** Bridges the gap between digital interfaces and manual creation by styling the user details entry block as an authentic ruled personal notebook sheet.
* **The Layout:** The parent wrapper uses a warm, tactile cream paper background (`#fdfbf7`). A continuous CSS `repeating-linear-gradient` rule prints crisp, evenly spaced blue/gray writing sheet lines across the layout. 
* **The Details:** An absolute border element rules a thin, vertical red margin line exactly `40px` from the left container edge. Pre-printed labels (`NAME`, `PHONE NUMBER`) sit anchored along the margin, while active text inputs use a monospace typewriter typeface styled to sit flush on top of the horizontal ruled lines, mimicking physical ink.

#  Progressive Stepwise Pricing Engine

Custom manufacturing models frequently fall into the **"Bulk Pricing Trap"**. This occurs when an application applies a flat-rate wholesale discount across the entire cart volume upon crossing a specific unit threshold. 

###  The Bulk Pricing Trap (What Realz Fixes)
Consider a flat-rate model where 1–20 stickers cost 15.50 KSh each, and 21–45 stickers cost 13.49 KSh each. 
* A customer purchasing **20 stickers** pays: $20 \times 15.50 = \mathbf{310.00\text{ KSh}}$
* A customer purchasing **21 stickers** pays: $21 \times 13.49 = \mathbf{283.29\text{ KSh}}$

> **The Flaw:** The customer is penalized for buying fewer stickers, while the platform loses revenue by dropping prices across the entire batch. Customers exploit this boundary line by padding their cart with unwanted units solely to reduce their aggregate bill.

---

##  The Continuous Accumulation Solution

Realz eliminates this paradox by utilizing a non-overlapping, sequential bracket accumulation algorithm implemented directly within the `Zustand` global cart engine store. Instead of retroactively discounting the entire cart, the item price decays *only for the specific units that cross into the next tier boundary*.

### The Mathematical Formula Matrix

Let $Q$ represent the aggregate quantity of items in the cart array.

*   **Bracket 1 (Base Tier):** Where $Q \le 20$
    $$\text{Total Price} = Q \times 15.50$$

*   **Bracket 2 (Mid-Wholesale Tier):** Where $20 < Q \le 45$
    $$\text{Total Price} = (20 \times 15.50) + ((Q - 20) \times 13.49)$$

*   **Bracket 3 (Max-Wholesale Tier):** Where $Q > 45$
    $$\text{Total Price} = (20 \times 15.50) + (25 \times 13.49) + ((Q - 45) \times 10.99)$$
    $$\text{Total Price} = 647.25 + ((Q - 45) \times 10.99)$$


##  Live Cart Store Implementation Breakdown

The calculation engine evaluates this algorithm at the store level on every quantity shift. This keeps the effective item price smoothly drifting downward as order volumes scale up, creating a transparent, predictable wholesale progression.

```typescript
// Zustand Selector Logic for Stepwise Computation
export const selectCartTotals = (state: CartState) => {
  const totalItems = state.cart.reduce((acc, item) => acc + item.quantity, 0);
  
  let totalPrice = 0;
  let remainingItems = totalItems;

  // Bracket 1 calculation: First 20 items at base rate
  const bracket1Units = Math.min(remainingItems, 20);
  totalPrice += bracket1Units * 15.50;
  remainingItems -= bracket1Units;

  // Bracket 2 calculation: Next 25 items (items 21 to 45) at mid rate
  const bracket2Units = Math.min(remainingItems, 25);
  totalPrice += bracket2Units * 13.49;
  remainingItems -= bracket2Units;

  // Bracket 3 calculation: Remaining items (46+) at wholesale rate
  if (remainingItems > 0) {
    totalPrice += remainingItems * 10.99;
  }

  // Calculate true average cost per item to push to the UI dashboard
  const effectiveAveragePrice = totalItems > 0 ? (totalPrice / totalItems) : 0;

  return {
    totalItems,
    totalPrice: Math.round(totalPrice * 100) / 100,
    effectiveAveragePrice: Math.round(effectiveAveragePrice * 100) / 100
  };
};
