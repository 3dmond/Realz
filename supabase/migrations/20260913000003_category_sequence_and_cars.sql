-- Ensure categories.id has an auto-increment sequence
DO $$
BEGIN
  CREATE SEQUENCE IF NOT EXISTS public.categories_id_seq;
  ALTER TABLE public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq');
  PERFORM setval('public.categories_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM public.categories), 0) + 1, 100000));
END $$;

-- Insert 'cars' category if it doesn't already exist
INSERT INTO public.categories (name, slug, is_active)
SELECT 'cars', 'cars', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE slug = 'cars' OR LOWER(name) = 'cars'
);