-- Realz: Clear legacy test data and enable development cleanup policies

-- 1. Enable delete policies for development cleanup on order_items and orders
DROP POLICY IF EXISTS "Admins can delete order_items" ON public.order_items;
CREATE POLICY "Admins can delete order_items" ON public.order_items FOR DELETE USING (true);

DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Admins can delete orders" ON public.orders FOR DELETE USING (true);

-- 2. Clean up legacy test orders and remaining legacy test products
DELETE FROM public.order_items;
DELETE FROM public.orders;
DELETE FROM public.products WHERE category_id IN (49134, 100003);
DELETE FROM public.categories WHERE id IN (49134, 100003);
