-- ==============================================================================
-- REALZ E-COMMERCE: SUBCATEGORIES SCHEMA, RLS, AND ADULT CARTOONS MAPPING
-- Migration: 20260917000001_subcategories_schema_and_mapping.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SUBCATEGORIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subcategories (
  id serial PRIMARY KEY,
  category_id integer NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON public.subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_slug ON public.subcategories(slug);

-- ------------------------------------------------------------------------------
-- 2. PRODUCTS EXTENSION: subcategory_id
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'products' 
      AND column_name = 'subcategory_id'
  ) THEN
    ALTER TABLE public.products ADD COLUMN subcategory_id integer REFERENCES public.subcategories(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON public.products(subcategory_id);

-- ------------------------------------------------------------------------------
-- 3. ROW-LEVEL SECURITY FOR SUBCATEGORIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- 3.1 Public can view subcategories
DROP POLICY IF EXISTS "Public can view subcategories" ON public.subcategories;
CREATE POLICY "Public can view subcategories" ON public.subcategories
  FOR SELECT USING (true);

-- 3.2 Development / Admin management policies
DROP POLICY IF EXISTS "Admins can insert subcategories" ON public.subcategories;
CREATE POLICY "Admins can insert subcategories" ON public.subcategories
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update subcategories" ON public.subcategories;
CREATE POLICY "Admins can update subcategories" ON public.subcategories
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete subcategories" ON public.subcategories;
CREATE POLICY "Admins can delete subcategories" ON public.subcategories
  FOR DELETE USING (true);

-- ------------------------------------------------------------------------------
-- 4. INSERT ADULT CARTOONS SUBCATEGORIES
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_adult_id integer;
BEGIN
  SELECT id INTO v_adult_id FROM public.categories WHERE slug = 'adult_cartoons' OR LOWER(name) = 'adult cartoons' LIMIT 1;

  IF v_adult_id IS NOT NULL THEN
    -- 1. Rick and Morty
    INSERT INTO public.subcategories (category_id, name, slug)
    VALUES (v_adult_id, 'Rick and Morty', 'rick-and-morty')
    ON CONFLICT (category_id, slug) DO UPDATE SET name = EXCLUDED.name;

    -- 2. The Simpsons
    INSERT INTO public.subcategories (category_id, name, slug)
    VALUES (v_adult_id, 'The Simpsons', 'the-simpsons')
    ON CONFLICT (category_id, slug) DO UPDATE SET name = EXCLUDED.name;

    -- 3. The Boondocks
    INSERT INTO public.subcategories (category_id, name, slug)
    VALUES (v_adult_id, 'The Boondocks', 'the-boondocks')
    ON CONFLICT (category_id, slug) DO UPDATE SET name = EXCLUDED.name;

    -- 4. Arcane
    INSERT INTO public.subcategories (category_id, name, slug)
    VALUES (v_adult_id, 'Arcane', 'arcane')
    ON CONFLICT (category_id, slug) DO UPDATE SET name = EXCLUDED.name;

    -- 5. Family Guy
    INSERT INTO public.subcategories (category_id, name, slug)
    VALUES (v_adult_id, 'Family Guy', 'family-guy')
    ON CONFLICT (category_id, slug) DO UPDATE SET name = EXCLUDED.name;

    -- 6. South Park
    INSERT INTO public.subcategories (category_id, name, slug)
    VALUES (v_adult_id, 'South Park', 'south-park')
    ON CONFLICT (category_id, slug) DO UPDATE SET name = EXCLUDED.name;

    -- 7. American Dad!
    INSERT INTO public.subcategories (category_id, name, slug)
    VALUES (v_adult_id, 'American Dad!', 'american-dad')
    ON CONFLICT (category_id, slug) DO UPDATE SET name = EXCLUDED.name;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. MAP PRODUCTS TO SUBCATEGORIES AND UPDATE STORAGE PATHS
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_adult_id integer;
  v_sub_rick integer;
  v_sub_simpsons integer;
  v_sub_boondocks integer;
  v_sub_arcane integer;
  v_sub_family_guy integer;
  v_sub_south_park integer;
  v_sub_american_dad integer;
  v_base_url text := 'https://lmwlxnjcoupqzuewpmbk.supabase.co/storage/v1/object/public/stickers/';
BEGIN
  SELECT id INTO v_adult_id FROM public.categories WHERE slug = 'adult_cartoons' OR LOWER(name) = 'adult cartoons' LIMIT 1;
  IF v_adult_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_sub_rick FROM public.subcategories WHERE category_id = v_adult_id AND slug = 'rick-and-morty';
  SELECT id INTO v_sub_simpsons FROM public.subcategories WHERE category_id = v_adult_id AND slug = 'the-simpsons';
  SELECT id INTO v_sub_boondocks FROM public.subcategories WHERE category_id = v_adult_id AND slug = 'the-boondocks';
  SELECT id INTO v_sub_arcane FROM public.subcategories WHERE category_id = v_adult_id AND slug = 'arcane';
  SELECT id INTO v_sub_family_guy FROM public.subcategories WHERE category_id = v_adult_id AND slug = 'family-guy';
  SELECT id INTO v_sub_south_park FROM public.subcategories WHERE category_id = v_adult_id AND slug = 'south-park';
  SELECT id INTO v_sub_american_dad FROM public.subcategories WHERE category_id = v_adult_id AND slug = 'american-dad';

  -- Rick and Morty (12)
  UPDATE public.products
  SET subcategory_id = v_sub_rick,
      image_storage_key = 'adult_cartoons/rick-and-morty/' || regexp_replace(image_storage_key, '^adult_cartoons/(rick-and-morty/)?', ''),
      image_url = v_base_url || 'adult_cartoons/rick-and-morty/' || regexp_replace(image_storage_key, '^adult_cartoons/(rick-and-morty/)?', '')
  WHERE category_id = v_adult_id AND (
    LOWER(title) LIKE '%rick%' OR
    LOWER(title) LIKE '%morty%' OR
    image_storage_key LIKE '%rick%' OR
    image_storage_key LIKE '%morty%'
  );

  -- The Simpsons (9)
  UPDATE public.products
  SET subcategory_id = v_sub_simpsons,
      image_storage_key = 'adult_cartoons/the-simpsons/' || regexp_replace(image_storage_key, '^adult_cartoons/(the-simpsons/)?', ''),
      image_url = v_base_url || 'adult_cartoons/the-simpsons/' || regexp_replace(image_storage_key, '^adult_cartoons/(the-simpsons/)?', '')
  WHERE category_id = v_adult_id AND (
    LOWER(title) LIKE '%simpson%' OR
    LOWER(title) LIKE '%homer%' OR
    LOWER(title) LIKE '%bart%' OR
    LOWER(title) LIKE '%lisa%' OR
    image_storage_key LIKE '%simpson%' OR
    image_storage_key LIKE '%homer%' OR
    image_storage_key LIKE '%bart%' OR
    image_storage_key LIKE '%lisa%'
  );

  -- The Boondocks (5)
  UPDATE public.products
  SET subcategory_id = v_sub_boondocks,
      image_storage_key = 'adult_cartoons/the-boondocks/' || regexp_replace(image_storage_key, '^adult_cartoons/(the-boondocks/)?', ''),
      image_url = v_base_url || 'adult_cartoons/the-boondocks/' || regexp_replace(image_storage_key, '^adult_cartoons/(the-boondocks/)?', '')
  WHERE category_id = v_adult_id AND (
    LOWER(title) LIKE '%boondocks%' OR
    LOWER(title) LIKE '%riley%' OR
    LOWER(title) LIKE '%huey%' OR
    image_storage_key LIKE '%boondocks%' OR
    image_storage_key LIKE '%riley%' OR
    image_storage_key LIKE '%huey%'
  );

  -- Arcane (5)
  UPDATE public.products
  SET subcategory_id = v_sub_arcane,
      image_storage_key = 'adult_cartoons/arcane/' || regexp_replace(image_storage_key, '^adult_cartoons/(arcane/)?', ''),
      image_url = v_base_url || 'adult_cartoons/arcane/' || regexp_replace(image_storage_key, '^adult_cartoons/(arcane/)?', '')
  WHERE category_id = v_adult_id AND (
    LOWER(title) LIKE '%jinx%' OR
    LOWER(title) LIKE '%vi %' OR
    LOWER(title) = 'vi' OR
    image_storage_key LIKE '%jinx%' OR
    image_storage_key LIKE '%vi-%'
  );

  -- Family Guy (3)
  UPDATE public.products
  SET subcategory_id = v_sub_family_guy,
      image_storage_key = 'adult_cartoons/family-guy/' || regexp_replace(image_storage_key, '^adult_cartoons/(family-guy/)?', ''),
      image_url = v_base_url || 'adult_cartoons/family-guy/' || regexp_replace(image_storage_key, '^adult_cartoons/(family-guy/)?', '')
  WHERE category_id = v_adult_id AND (
    LOWER(title) LIKE '%peter griffin%' OR
    LOWER(title) LIKE '%stewie%' OR
    image_storage_key LIKE '%peter-griffin%' OR
    image_storage_key LIKE '%stewie-griffin%'
  );

  -- South Park (2)
  UPDATE public.products
  SET subcategory_id = v_sub_south_park,
      image_storage_key = 'adult_cartoons/south-park/' || regexp_replace(image_storage_key, '^adult_cartoons/(south-park/)?', ''),
      image_url = v_base_url || 'adult_cartoons/south-park/' || regexp_replace(image_storage_key, '^adult_cartoons/(south-park/)?', '')
  WHERE category_id = v_adult_id AND (
    LOWER(title) LIKE '%butters%' OR
    LOWER(title) LIKE '%kyle%' OR
    image_storage_key LIKE '%butters%' OR
    image_storage_key LIKE '%kyle%'
  );

  -- American Dad! (1)
  UPDATE public.products
  SET subcategory_id = v_sub_american_dad,
      image_storage_key = 'adult_cartoons/american-dad/' || regexp_replace(image_storage_key, '^adult_cartoons/(american-dad/)?', ''),
      image_url = v_base_url || 'adult_cartoons/american-dad/' || regexp_replace(image_storage_key, '^adult_cartoons/(american-dad/)?', '')
  WHERE category_id = v_adult_id AND (
    LOWER(title) LIKE '%klaus%' OR
    image_storage_key LIKE '%klaus%'
  );
END $$;
