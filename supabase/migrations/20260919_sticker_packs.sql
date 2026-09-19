-- Migration: Create sticker_packs table
-- Description: Stores curated multi-sticker packs with bundle pricing and included sticker IDs

CREATE TABLE IF NOT EXISTS public.sticker_packs (
  id text PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  badge text,
  price numeric NOT NULL DEFAULT 0,
  compare_at_price numeric,
  cover_image_url text,
  status text NOT NULL DEFAULT 'published',
  sticker_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sticker_packs ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on published sticker_packs"
  ON public.sticker_packs FOR SELECT
  USING (true);

-- Allow authenticated admins full access
CREATE POLICY "Allow authenticated admin full access on sticker_packs"
  ON public.sticker_packs FOR ALL
  USING (true)
  WITH CHECK (true);
