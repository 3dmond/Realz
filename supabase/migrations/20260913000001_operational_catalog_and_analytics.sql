-- ==============================================================================
-- REALZ E-COMMERCE: OPERATIONAL CATALOGUE, ANALYTICS & SECURITY MIGRATION
-- Migration: 20260913000001_operational_catalog_and_analytics.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SAFE TABLE EXTENSIONS (Idempotent)
-- ------------------------------------------------------------------------------

-- Products: extend schema with lifecycle, stock, pricing, and media reference
DO $$
BEGIN
  -- Lifecycle status: 'draft', 'published', 'archived'
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'status') THEN
    ALTER TABLE public.products ADD COLUMN status text NOT NULL DEFAULT 'published';
  END IF;

  -- Backward-compatible active flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'is_active') THEN
    ALTER TABLE public.products ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;

  -- Inventory quantity
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'stock_quantity') THEN
    ALTER TABLE public.products ADD COLUMN stock_quantity integer NOT NULL DEFAULT 100;
  END IF;

  -- Base unit price (KSh)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'price') THEN
    ALTER TABLE public.products ADD COLUMN price numeric(10,2) NOT NULL DEFAULT 15.50;
  END IF;

  -- Production / unit cost price (for gross profit calculation)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'cost_price') THEN
    ALTER TABLE public.products ADD COLUMN cost_price numeric(10,2) NOT NULL DEFAULT 6.00;
  END IF;

  -- Storage key / path
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'image_storage_key') THEN
    ALTER TABLE public.products ADD COLUMN image_storage_key text;
  END IF;

  -- Description
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'description') THEN
    ALTER TABLE public.products ADD COLUMN description text;
  END IF;

  -- Timestamps
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'created_at') THEN
    ALTER TABLE public.products ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'updated_at') THEN
    ALTER TABLE public.products ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- Categories: extend schema
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'is_active') THEN
    ALTER TABLE public.categories ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'slug') THEN
    ALTER TABLE public.categories ADD COLUMN slug text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'updated_at') THEN
    ALTER TABLE public.categories ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- Order items: add historical snapshot fields so past orders remain intact if products change
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'product_title') THEN
    ALTER TABLE public.order_items ADD COLUMN product_title text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'product_image_url') THEN
    ALTER TABLE public.order_items ADD COLUMN product_image_url text;
  END IF;
END $$;

-- Backfill existing categories slug if empty
UPDATE public.categories
SET slug = lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

-- Backfill status and is_active sync
UPDATE public.products
SET is_active = (status = 'published')
WHERE is_active IS NULL;

-- ------------------------------------------------------------------------------
-- 2. CONSTRAINTS & DATA INTEGRITY
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_status_valid') THEN
    ALTER TABLE public.products ADD CONSTRAINT chk_products_status_valid CHECK (status IN ('draft', 'published', 'archived'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_stock_quantity_non_negative') THEN
    ALTER TABLE public.products ADD CONSTRAINT chk_products_stock_quantity_non_negative CHECK (stock_quantity >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_price_non_negative') THEN
    ALTER TABLE public.products ADD CONSTRAINT chk_products_price_non_negative CHECK (price >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_cost_price_non_negative') THEN
    ALTER TABLE public.products ADD CONSTRAINT chk_products_cost_price_non_negative CHECK (cost_price >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_title_non_empty') THEN
    ALTER TABLE public.products ADD CONSTRAINT chk_products_title_non_empty CHECK (length(trim(title)) > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_categories_name_non_empty') THEN
    ALTER TABLE public.categories ADD CONSTRAINT chk_categories_name_non_empty CHECK (length(trim(name)) > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_status_valid') THEN
    ALTER TABLE public.orders ADD CONSTRAINT chk_orders_status_valid CHECK (status IN ('pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered', 'cancelled', 'failed'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_total_price_non_negative') THEN
    ALTER TABLE public.orders ADD CONSTRAINT chk_orders_total_price_non_negative CHECK (total_price >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_order_items_quantity_positive') THEN
    ALTER TABLE public.order_items ADD CONSTRAINT chk_order_items_quantity_positive CHECK (quantity > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_order_items_unit_price_non_negative') THEN
    ALTER TABLE public.order_items ADD CONSTRAINT chk_order_items_unit_price_non_negative CHECK (unit_price >= 0);
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. NEW OPERATIONAL TABLES
-- ------------------------------------------------------------------------------

-- Multiple product images support
CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id int8 NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  url text NOT NULL,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_sort ON public.product_images(product_id, sort_order);

-- User Roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'catalog_manager', 'order_manager', 'inventory_manager', 'analyst')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_roles_user_role UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Audit Logs (append-only)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- Inventory Movement Ledger
CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id int8 NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  previous_stock integer NOT NULL,
  new_stock integer NOT NULL,
  reason text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_product ON public.inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON public.inventory_logs(created_at DESC);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- ------------------------------------------------------------------------------
-- 4. ANALYTICAL VIEWS FOR POWER BI & BUSINESS INTELLIGENCE
-- ------------------------------------------------------------------------------

-- View: Daily Sales & Gross Profit Summary
CREATE OR REPLACE VIEW public.view_analytics_daily_sales AS
SELECT
  date_trunc('day', o.created_at)::date AS order_date,
  count(DISTINCT o.id) AS total_orders,
  count(DISTINCT CASE WHEN o.status IN ('confirmed', 'processing', 'out_for_delivery', 'delivered') THEN o.id END) AS fulfilled_orders,
  count(DISTINCT CASE WHEN o.status = 'cancelled' THEN o.id END) AS cancelled_orders,
  coalesce(sum(CASE WHEN o.status != 'cancelled' THEN oi.quantity ELSE 0 END), 0) AS total_units_sold,
  coalesce(sum(CASE WHEN o.status != 'cancelled' THEN (oi.quantity * oi.unit_price) ELSE 0 END), 0)::numeric(10,2) AS gross_revenue,
  coalesce(sum(CASE WHEN o.status != 'cancelled' THEN (oi.quantity * coalesce(p.cost_price, 6.00)) ELSE 0 END), 0)::numeric(10,2) AS estimated_cogs,
  (
    coalesce(sum(CASE WHEN o.status != 'cancelled' THEN (oi.quantity * oi.unit_price) ELSE 0 END), 0) -
    coalesce(sum(CASE WHEN o.status != 'cancelled' THEN (oi.quantity * coalesce(p.cost_price, 6.00)) ELSE 0 END), 0)
  )::numeric(10,2) AS gross_profit,
  CASE
    WHEN count(DISTINCT CASE WHEN o.status != 'cancelled' THEN o.id END) > 0
    THEN (
      sum(CASE WHEN o.status != 'cancelled' THEN (oi.quantity * oi.unit_price) ELSE 0 END) /
      count(DISTINCT CASE WHEN o.status != 'cancelled' THEN o.id END)
    )::numeric(10,2)
    ELSE 0
  END AS average_order_value
FROM public.orders o
LEFT JOIN public.order_items oi ON o.id = oi.order_id
LEFT JOIN public.products p ON oi.product_id = p.id
GROUP BY date_trunc('day', o.created_at)::date
ORDER BY order_date DESC;

-- View: Product Performance Leaderboard
CREATE OR REPLACE VIEW public.view_analytics_product_performance AS
SELECT
  p.id AS product_id,
  p.title AS product_title,
  c.name AS category_name,
  p.status AS product_status,
  p.stock_quantity AS current_stock,
  p.price AS list_price,
  p.cost_price AS unit_cost,
  coalesce(sum(CASE WHEN o.status != 'cancelled' THEN oi.quantity ELSE 0 END), 0) AS units_sold,
  coalesce(sum(CASE WHEN o.status != 'cancelled' THEN (oi.quantity * oi.unit_price) ELSE 0 END), 0)::numeric(10,2) AS total_revenue,
  (
    coalesce(sum(CASE WHEN o.status != 'cancelled' THEN (oi.quantity * oi.unit_price) ELSE 0 END), 0) -
    coalesce(sum(CASE WHEN o.status != 'cancelled' THEN (oi.quantity * coalesce(p.cost_price, 6.00)) ELSE 0 END), 0)
  )::numeric(10,2) AS gross_profit,
  count(DISTINCT CASE WHEN o.status != 'cancelled' THEN o.id END) AS order_appearances
FROM public.products p
LEFT JOIN public.categories c ON p.category_id = c.id
LEFT JOIN public.order_items oi ON p.id = oi.product_id
LEFT JOIN public.orders o ON oi.order_id = o.id
GROUP BY p.id, p.title, c.name, p.status, p.stock_quantity, p.price, p.cost_price
ORDER BY units_sold DESC;

-- View: Category Performance
CREATE OR REPLACE VIEW public.view_analytics_category_performance AS
SELECT
  c.id AS category_id,
  c.name AS category_name,
  count(DISTINCT p.id) AS total_catalog_products,
  count(DISTINCT CASE WHEN p.status = 'published' THEN p.id END) AS published_products,
  coalesce(sum(CASE WHEN o.status != 'cancelled' THEN oi.quantity ELSE 0 END), 0) AS total_units_sold,
  coalesce(sum(CASE WHEN o.status != 'cancelled' THEN (oi.quantity * oi.unit_price) ELSE 0 END), 0)::numeric(10,2) AS total_revenue
FROM public.categories c
LEFT JOIN public.products p ON c.id = p.category_id
LEFT JOIN public.order_items oi ON p.id = oi.product_id
LEFT JOIN public.orders o ON oi.order_id = o.id
GROUP BY c.id, c.name
ORDER BY total_revenue DESC;

-- View: Executive Financial Summary
CREATE OR REPLACE VIEW public.view_analytics_financial_summary AS
SELECT
  coalesce(sum(CASE WHEN status != 'cancelled' THEN total_price ELSE 0 END), 0)::numeric(10,2) AS total_revenue,
  coalesce(count(id), 0) AS total_orders,
  coalesce(count(CASE WHEN status = 'pending' THEN 1 END), 0) AS pending_orders,
  coalesce(count(CASE WHEN status = 'delivered' THEN 1 END), 0) AS delivered_orders,
  coalesce(count(CASE WHEN status = 'cancelled' THEN 1 END), 0) AS cancelled_orders,
  coalesce((SELECT sum(quantity) FROM public.order_items oi JOIN public.orders o ON oi.order_id = o.id WHERE o.status != 'cancelled'), 0) AS total_stickers_sold,
  coalesce((SELECT sum(quantity * coalesce(p.cost_price, 6.00)) FROM public.order_items oi JOIN public.orders o ON oi.order_id = o.id LEFT JOIN public.products p ON oi.product_id = p.id WHERE o.status != 'cancelled'), 0)::numeric(10,2) AS total_cogs,
  (
    coalesce(sum(CASE WHEN status != 'cancelled' THEN total_price ELSE 0 END), 0) -
    coalesce((SELECT sum(quantity * coalesce(p.cost_price, 6.00)) FROM public.order_items oi JOIN public.orders o ON oi.order_id = o.id LEFT JOIN public.products p ON oi.product_id = p.id WHERE o.status != 'cancelled'), 0)
  )::numeric(10,2) AS total_gross_profit,
  CASE
    WHEN sum(CASE WHEN status != 'cancelled' THEN total_price ELSE 0 END) > 0 THEN
      round((
        (
          coalesce(sum(CASE WHEN status != 'cancelled' THEN total_price ELSE 0 END), 0) -
          coalesce((SELECT sum(quantity * coalesce(p.cost_price, 6.00)) FROM public.order_items oi JOIN public.orders o ON oi.order_id = o.id LEFT JOIN public.products p ON oi.product_id = p.id WHERE o.status != 'cancelled'), 0)
        ) / sum(CASE WHEN status != 'cancelled' THEN total_price ELSE 0 END) * 100
      ), 2)
    ELSE 0
  END AS gross_margin_percentage
FROM public.orders;

-- ------------------------------------------------------------------------------
-- 5. SECURITY DEFINER HELPER FUNCTIONS
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND (
        role = 'super_admin'
        OR role = required_role
        OR (required_role = 'admin' AND role IN ('super_admin', 'admin'))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'order_manager', 'catalog_manager', 'inventory_manager', 'analyst')
  );
$$;

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Synchronize is_active with status on products
CREATE OR REPLACE FUNCTION public.sync_product_status_and_is_active()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'published' THEN
    NEW.is_active = true;
  ELSE
    NEW.is_active = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_status ON public.products;
CREATE TRIGGER trg_sync_product_status
BEFORE INSERT OR UPDATE OF status ON public.products
FOR EACH ROW EXECUTE FUNCTION public.sync_product_status_and_is_active();

-- ------------------------------------------------------------------------------
-- 6. ATOMIC BUSINESS FUNCTIONS
-- ------------------------------------------------------------------------------

-- Authoritative server-side order calculation and atomic creation with snapshot
CREATE OR REPLACE FUNCTION public.create_verified_order(
  p_customer_name text,
  p_customer_phone text,
  p_delivery_place text,
  p_items jsonb -- array of { product_id: int8, quantity: int }
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_total_qty integer := 0;
  v_item record;
  v_product record;
  v_unit_price numeric(10,2);
  v_total_price numeric(10,2) := 0;
  v_order_id uuid;
  v_b1_qty integer := 0;
  v_b2_qty integer := 0;
  v_b3_qty integer := 0;
  v_subtotal numeric(10,2) := 0;
  v_order jsonb;
BEGIN
  -- Input Validation
  IF p_customer_name IS NULL OR length(trim(p_customer_name)) < 2 THEN
    RAISE EXCEPTION 'Customer name must be at least 2 characters';
  END IF;

  IF p_customer_phone IS NULL OR length(trim(p_customer_phone)) < 9 THEN
    RAISE EXCEPTION 'Invalid customer phone number';
  END IF;

  IF p_delivery_place IS NULL OR length(trim(p_delivery_place)) < 3 THEN
    RAISE EXCEPTION 'Delivery address must be provided';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  -- 1. Validate items and stock
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id int8, quantity int) LOOP
    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be positive';
    END IF;

    SELECT id, title, is_active, stock_quantity, image_url INTO v_product
    FROM public.products
    WHERE id = v_item.product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found', v_item.product_id;
    END IF;

    IF NOT v_product.is_active THEN
      RAISE EXCEPTION 'Product "%" is currently not available for purchase', v_product.title;
    END IF;

    IF v_product.stock_quantity < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product "%" (Available: %, Requested: %)',
        v_product.title, v_product.stock_quantity, v_item.quantity;
    END IF;

    v_total_qty := v_total_qty + v_item.quantity;
  END LOOP;

  -- 2. Progressive Wholesale Pricing Engine (Realz Rules)
  IF v_total_qty > 0 THEN
    v_b1_qty := LEAST(v_total_qty, 20);
    v_subtotal := v_subtotal + (v_b1_qty * 15.50);
  END IF;

  IF v_total_qty > 20 THEN
    v_b2_qty := LEAST(v_total_qty - 20, 25);
    v_subtotal := v_subtotal + (v_b2_qty * 13.49);
  END IF;

  IF v_total_qty > 45 THEN
    v_b3_qty := v_total_qty - 45;
    v_subtotal := v_subtotal + (v_b3_qty * 10.99);
  END IF;

  v_total_price := ROUND(v_subtotal, 2);
  v_unit_price := ROUND(v_total_price / v_total_qty, 2);

  -- 3. Create Order
  INSERT INTO public.orders (
    customer_name,
    customer_phone,
    delivery_place,
    total_price,
    status
  ) VALUES (
    trim(p_customer_name),
    trim(p_customer_phone),
    trim(p_delivery_place),
    v_total_price,
    'pending'
  )
  RETURNING id INTO v_order_id;

  -- 4. Create Order Items & Decrement Stock
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id int8, quantity int) LOOP
    SELECT id, title, image_url, stock_quantity INTO v_product
    FROM public.products
    WHERE id = v_item.product_id;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      quantity,
      unit_price,
      product_title,
      product_image_url
    ) VALUES (
      v_order_id,
      v_item.product_id,
      v_item.quantity,
      v_unit_price,
      v_product.title,
      v_product.image_url
    );

    UPDATE public.products
    SET stock_quantity = stock_quantity - v_item.quantity
    WHERE id = v_item.product_id;

    INSERT INTO public.inventory_logs (
      product_id,
      delta,
      previous_stock,
      new_stock,
      reason,
      order_id
    ) VALUES (
      v_item.product_id,
      -v_item.quantity,
      v_product.stock_quantity,
      v_product.stock_quantity - v_item.quantity,
      'Order checkout placement',
      v_order_id
    );
  END LOOP;

  SELECT row_to_json(o)::jsonb INTO v_order
  FROM public.orders o
  WHERE o.id = v_order_id;

  RETURN v_order;
END;
$$;

-- Atomic status transition with audit log and stock restore on cancellation
CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_order record;
  v_actor_email text;
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only administrative accounts can change order status';
  END IF;

  IF p_new_status NOT IN ('pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered', 'cancelled', 'failed') THEN
    RAISE EXCEPTION 'Invalid order status: %', p_new_status;
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  -- Validate state transition
  IF v_order.status = 'delivered' AND p_new_status != 'delivered' THEN
    RAISE EXCEPTION 'Cannot modify an already delivered order';
  END IF;

  IF v_order.status = 'cancelled' AND p_new_status != 'cancelled' THEN
    RAISE EXCEPTION 'Cannot modify an already cancelled order';
  END IF;

  -- If status is changing to cancelled, restore product stock
  IF p_new_status = 'cancelled' AND v_order.status != 'cancelled' THEN
    DECLARE
      v_item record;
      v_prev_stock int;
      v_new_stock int;
    BEGIN
      FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id LOOP
        SELECT stock_quantity INTO v_prev_stock FROM public.products WHERE id = v_item.product_id;
        v_new_stock := v_prev_stock + v_item.quantity;

        UPDATE public.products SET stock_quantity = v_new_stock WHERE id = v_item.product_id;

        INSERT INTO public.inventory_logs (
          product_id, delta, previous_stock, new_stock, reason, order_id, actor_id
        ) VALUES (
          v_item.product_id, v_item.quantity, v_prev_stock, v_new_stock, 'Order cancelled - stock restored', p_order_id, auth.uid()
        );
      END LOOP;
    END;
  END IF;

  UPDATE public.orders
  SET status = p_new_status
  WHERE id = p_order_id
  RETURNING row_to_json(orders.*)::jsonb INTO v_result;

  SELECT email INTO v_actor_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.audit_logs (
    actor_id, actor_email, action, entity_type, entity_id, metadata
  ) VALUES (
    auth.uid(),
    v_actor_email,
    'UPDATE_ORDER_STATUS',
    'orders',
    p_order_id::text,
    jsonb_build_object('previous_status', v_order.status, 'new_status', p_new_status, 'notes', p_notes)
  );

  RETURN v_result;
END;
$$;

-- Atomic inventory adjustment with audit log
CREATE OR REPLACE FUNCTION public.adjust_product_inventory(
  p_product_id int8,
  p_delta integer,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_prev_stock integer;
  v_new_stock integer;
  v_actor_email text;
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can adjust stock inventory';
  END IF;

  IF p_delta = 0 THEN
    RAISE EXCEPTION 'Inventory delta must not be zero';
  END IF;

  SELECT stock_quantity INTO v_prev_stock
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product % not found', p_product_id;
  END IF;

  v_new_stock := v_prev_stock + p_delta;
  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'Stock adjustment would result in negative inventory (Current: %, Delta: %)', v_prev_stock, p_delta;
  END IF;

  UPDATE public.products
  SET stock_quantity = v_new_stock
  WHERE id = p_product_id
  RETURNING row_to_json(products.*)::jsonb INTO v_result;

  SELECT email INTO v_actor_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.inventory_logs (
    product_id, delta, previous_stock, new_stock, reason, actor_id
  ) VALUES (
    p_product_id, p_delta, v_prev_stock, v_new_stock, p_reason, auth.uid()
  );

  INSERT INTO public.audit_logs (
    actor_id, actor_email, action, entity_type, entity_id, metadata
  ) VALUES (
    auth.uid(),
    v_actor_email,
    'ADJUST_INVENTORY',
    'products',
    p_product_id::text,
    jsonb_build_object('delta', p_delta, 'previous_stock', v_prev_stock, 'new_stock', v_new_stock, 'reason', p_reason)
  );

  RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

-- Categories
DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view active categories" ON public.categories
  FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories" ON public.categories
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories" ON public.categories
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can delete categories" ON public.categories
  FOR DELETE USING (public.is_admin());

-- Products
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
DROP POLICY IF EXISTS "Public can view products" ON public.products;
CREATE POLICY "Public can view active products" ON public.products
  FOR SELECT USING ((status = 'published' AND is_active = true) OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products" ON public.products
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products" ON public.products
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE USING (public.is_admin());

-- Product Images
DROP POLICY IF EXISTS "Public can view product images" ON public.product_images;
CREATE POLICY "Public can view product images" ON public.product_images
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images;
CREATE POLICY "Admins can manage product images" ON public.product_images
  FOR ALL USING (public.is_admin());

-- Orders
DROP POLICY IF EXISTS "Public can place orders" ON public.orders;
CREATE POLICY "Public can place orders" ON public.orders
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view orders" ON public.orders;
CREATE POLICY "Admins can view orders" ON public.orders
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Super admins can delete orders" ON public.orders;
CREATE POLICY "Super admins can delete orders" ON public.orders
  FOR DELETE USING (public.has_role('super_admin'));

-- Order Items
DROP POLICY IF EXISTS "Public can add order items" ON public.order_items;
CREATE POLICY "Public can add order items" ON public.order_items
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view order items" ON public.order_items;
CREATE POLICY "Admins can view order items" ON public.order_items
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
CREATE POLICY "Admins can manage order items" ON public.order_items
  FOR ALL USING (public.is_admin());

-- User Roles
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;
CREATE POLICY "Super admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role('super_admin')) WITH CHECK (public.has_role('super_admin'));

-- Audit Logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (public.is_admin());

-- Inventory Logs
DROP POLICY IF EXISTS "Admins can view inventory logs" ON public.inventory_logs;
CREATE POLICY "Admins can view inventory logs" ON public.inventory_logs
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert inventory logs" ON public.inventory_logs;
CREATE POLICY "Admins can insert inventory logs" ON public.inventory_logs
  FOR INSERT WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 8. STORAGE POLICIES ('stickers' bucket)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('stickers', 'stickers', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DROP POLICY IF EXISTS "Public can view sticker assets" ON storage.objects;
CREATE POLICY "Public can view sticker assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'stickers');

DROP POLICY IF EXISTS "Admins can upload sticker assets" ON storage.objects;
CREATE POLICY "Admins can upload sticker assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'stickers' AND (public.is_admin() OR auth.role() = 'service_role'));

DROP POLICY IF EXISTS "Admins can update sticker assets" ON storage.objects;
CREATE POLICY "Admins can update sticker assets" ON storage.objects
  FOR UPDATE USING (bucket_id = 'stickers' AND (public.is_admin() OR auth.role() = 'service_role'));

DROP POLICY IF EXISTS "Admins can delete sticker assets" ON storage.objects;
CREATE POLICY "Admins can delete sticker assets" ON storage.objects
  FOR DELETE USING (bucket_id = 'stickers' AND (public.is_admin() OR auth.role() = 'service_role'));

-- ==============================================================================
-- END OF MIGRATION
-- ==============================================================================
