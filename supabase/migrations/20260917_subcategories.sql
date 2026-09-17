-- ==============================================================================
-- Optional Supabase Migration: Subcategories Schema
-- Run this in your Supabase SQL Editor if you want to store subcategories in DB
-- ==============================================================================

-- 1. Create subcategories table
CREATE TABLE IF NOT EXISTS public.subcategories (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, slug)
);

-- 2. Add subcategory_id column to products table if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'subcategory_id'
  ) THEN
    ALTER TABLE public.products ADD COLUMN subcategory_id BIGINT REFERENCES public.subcategories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Enable RLS and public read policy (matching categories table)
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on subcategories"
  ON public.subcategories FOR SELECT
  USING (true);

CREATE POLICY "Allow all on subcategories for anon/service"
  ON public.subcategories FOR ALL
  USING (true)
  WITH CHECK (true);
