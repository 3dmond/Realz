-- ==============================================================================
-- REALZ E-COMMERCE: DEVELOPMENT ADMIN CATALOGUE & STORAGE ACCESS POLICIES
-- Migration: 20260913000002_dev_admin_catalogue_rls.sql
--
-- PURPOSE:
-- Customer and admin authentication is deferred during this development phase.
-- The dashboard operates using the Supabase anonymous publishable key without a
-- Supabase Auth JWT.
--
-- This migration establishes the minimal development RLS policies for:
-- 1. Storage bucket 'stickers' (upload, update, delete artwork)
-- 2. Products table (insert, update, delete catalogue items, and view all items)
-- 3. Categories table (insert, update, delete categories, and view all categories)
--
-- All tables retain Row-Level Security ENABLED.
-- Orders and order_items remain untouched.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SUPABASE STORAGE ('stickers' bucket)
-- ------------------------------------------------------------------------------
-- Ensure 'stickers' bucket exists and is public
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('stickers', 'stickers', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 1.1 Public read access for sticker assets
DROP POLICY IF EXISTS "Public can view sticker assets" ON storage.objects;
CREATE POLICY "Public can view sticker assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'stickers');

-- 1.2 Development upload policy for 'stickers' bucket
DROP POLICY IF EXISTS "Admins can upload sticker assets" ON storage.objects;
CREATE POLICY "Admins can upload sticker assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'stickers');

-- 1.3 Development update policy for 'stickers' bucket
DROP POLICY IF EXISTS "Admins can update sticker assets" ON storage.objects;
CREATE POLICY "Admins can update sticker assets" ON storage.objects
  FOR UPDATE USING (bucket_id = 'stickers');

-- 1.4 Development delete policy for 'stickers' bucket
DROP POLICY IF EXISTS "Admins can delete sticker assets" ON storage.objects;
CREATE POLICY "Admins can delete sticker assets" ON storage.objects
  FOR DELETE USING (bucket_id = 'stickers');

-- ------------------------------------------------------------------------------
-- 2. PRODUCTS TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 2.1 View products
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
DROP POLICY IF EXISTS "Public can view products" ON public.products;
CREATE POLICY "Public can view products" ON public.products
  FOR SELECT USING (true);

-- 2.2 Development insert policy for products
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products" ON public.products
  FOR INSERT WITH CHECK (true);

-- 2.3 Development update policy for products
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products" ON public.products
  FOR UPDATE USING (true) WITH CHECK (true);

-- 2.4 Development delete policy for products
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE USING (true);

-- ------------------------------------------------------------------------------
-- 3. CATEGORIES TABLE
-- ------------------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 3.1 View categories
DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories" ON public.categories
  FOR SELECT USING (true);

-- 3.2 Development insert policy for categories
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories" ON public.categories
  FOR INSERT WITH CHECK (true);

-- 3.3 Development update policy for categories
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories" ON public.categories
  FOR UPDATE USING (true) WITH CHECK (true);

-- 3.4 Development delete policy for categories
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can delete categories" ON public.categories
  FOR DELETE USING (true);
