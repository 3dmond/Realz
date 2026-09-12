-- ==============================================================================
-- REALZ E-COMMERCE: PRODUCTION ADMIN DASHBOARD & SECURITY MIGRATION
-- Migration: 20260912000001_admin_dashboard_security.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTEND EXISTING TABLES WITH OPERATIONAL COLUMNS (Idempotent & Safe)
-- ------------------------------------------------------------------------------

-- Products: add is_active, stock_quantity, description, timestamps
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'is_active') THEN
    ALTER TABLE public.products ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'stock_quantity') THEN
    ALTER TABLE public.products ADD COLUMN stock_quantity integer NOT NULL DEFAULT 100;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'description') THEN
    ALTER TABLE public.products ADD COLUMN description text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'created_at') THEN
    ALTER TABLE public.products ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'updated_at') THEN
    ALTER TABLE public.products ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- Categories: add is_active, updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'is_active') THEN
    ALTER TABLE public.categories ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'updated_at') THEN
    ALTER TABLE public.categories ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. CONSTRAINTS & DATA INTEGRITY
-- ------------------------------------------------------------------------------

-- Ensure non-negative stock on products
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_stock_quantity_non_negative') THEN
    ALTER TABLE public.products ADD CONSTRAINT chk_products_stock_quantity_non_negative CHECK (stock_quantity >= 0);
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
-- 3. NEW TABLES: ROLES, AUDIT LOGGING, INVENTORY LEDGER
-- ------------------------------------------------------------------------------

-- User Roles table linking to auth.users
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'order_manager', 'catalog_manager')),
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
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- ------------------------------------------------------------------------------
-- 4. SECURITY DEFINER HELPER FUNCTIONS (Prevent RLS recursion)
-- ------------------------------------------------------------------------------

-- Check if current authenticated user has an active admin/manager role
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
      AND role IN ('super_admin', 'admin', 'order_manager', 'catalog_manager')
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

-- ------------------------------------------------------------------------------
-- 5. ATOMIC BUSINESS FUNCTIONS
-- ------------------------------------------------------------------------------

-- Authoritative server-side order calculation and atomic creation
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

  IF p_delivery_place IS NULL OR length(trim(p_delivery_place)) < 4 THEN
    RAISE EXCEPTION 'Delivery address must be provided';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;

  -- 1. Validate items, stock, and calculate total quantity
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id int8, quantity int) LOOP
    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be positive';
    END IF;

    SELECT id, title, is_active, stock_quantity INTO v_product
    FROM public.products
    WHERE id = v_item.product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found', v_item.product_id;
    END IF;

    IF NOT v_product.is_active THEN
      RAISE EXCEPTION 'Product "%" is currently inactive', v_product.title;
    END IF;

    IF v_product.stock_quantity < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product "%" (Available: %, Requested: %)',
        v_product.title, v_product.stock_quantity, v_item.quantity;
    END IF;

    v_total_qty := v_total_qty + v_item.quantity;
  END LOOP;

  -- 2. Calculate Authoritative Progressive Wholesale Pricing
  -- Realz pricing rules:
  -- Tier 1: 1–20 units @ 15.50 KSh
  -- Tier 2: 21–45 units @ 13.49 KSh
  -- Tier 3: 46+ units @ 10.99 KSh
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
    INSERT INTO public.order_items (
      order_id,
      product_id,
      quantity,
      unit_price
    ) VALUES (
      v_order_id,
      v_item.product_id,
      v_item.quantity,
      v_unit_price
    );

    -- Decrement stock and record inventory movement
    UPDATE public.products
    SET stock_quantity = stock_quantity - v_item.quantity
    WHERE id = v_item.product_id
    RETURNING stock_quantity + v_item.quantity, stock_quantity INTO v_product.stock_quantity, v_product.stock_quantity;

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
      v_product.stock_quantity + v_item.quantity,
      v_product.stock_quantity,
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

-- Atomic status transition with audit log
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

  -- Validate state transition logic
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

  -- Fetch actor email
  SELECT email INTO v_actor_email FROM auth.users WHERE id = auth.uid();

  -- Record audit log
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
-- 6. ROW LEVEL SECURITY (RLS) POLICIES — STRICT LEAST PRIVILEGE
-- ------------------------------------------------------------------------------

-- Ensure RLS is enabled on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

-- 6.1 CATEGORIES
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view active categories" ON public.categories
  FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can insert categories" ON public.categories
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update categories" ON public.categories
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete categories" ON public.categories
  FOR DELETE USING (public.is_admin());

-- 6.2 PRODUCTS
DROP POLICY IF EXISTS "Public can view products" ON public.products;
CREATE POLICY "Public can view active products" ON public.products
  FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can insert products" ON public.products
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update products" ON public.products
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE USING (public.is_admin());

-- 6.3 ORDERS (LOCK DOWN DEMO POLICIES TO PREVENT PII LEAKS)
DROP POLICY IF EXISTS "Public can view orders (demo)" ON public.orders;
DROP POLICY IF EXISTS "Public can update orders (demo)" ON public.orders;
DROP POLICY IF EXISTS "Public can place orders" ON public.orders;

-- Public can only place an order (or call create_verified_order RPC)
CREATE POLICY "Public can place orders" ON public.orders
  FOR INSERT WITH CHECK (true);

-- Only verified administrators can view orders
CREATE POLICY "Admins can view orders" ON public.orders
  FOR SELECT USING (public.is_admin());

-- Only verified administrators can update orders
CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Only super admins can delete orders if ever required
CREATE POLICY "Super admins can delete orders" ON public.orders
  FOR DELETE USING (public.has_role('super_admin'));

-- 6.4 ORDER ITEMS
DROP POLICY IF EXISTS "Public can view order items (demo)" ON public.order_items;
DROP POLICY IF EXISTS "Public can add order items" ON public.order_items;

CREATE POLICY "Public can add order items" ON public.order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view order items" ON public.order_items
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage order items" ON public.order_items
  FOR ALL USING (public.is_admin());

-- 6.5 USER ROLES
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;
CREATE POLICY "Super admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role('super_admin')) WITH CHECK (public.has_role('super_admin'));

-- 6.6 AUDIT LOGS (Append-only)
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (public.is_admin());

-- 6.7 INVENTORY LOGS
DROP POLICY IF EXISTS "Admins can view inventory logs" ON public.inventory_logs;
CREATE POLICY "Admins can view inventory logs" ON public.inventory_logs
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert inventory logs" ON public.inventory_logs;
CREATE POLICY "Admins can insert inventory logs" ON public.inventory_logs
  FOR INSERT WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 7. STORAGE POLICIES (Supabase Storage: stickers bucket)
-- ------------------------------------------------------------------------------
-- Public can read images from stickers bucket
-- Admins can upload and delete images in stickers bucket
DO $$
BEGIN
  -- Insert bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('stickers', 'stickers', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Policies on storage.objects for 'stickers'
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
