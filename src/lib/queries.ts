export type Category = { id: string; name: string; slug: string };
export type Subcategory = { id: string; category_id: string; name: string; slug: string };
export type Product = {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  category: string;
  subcategory_id: string | null;
  keywords: string[];
  is_featured: boolean;
  created_at: string;
};

import { supabase } from "@/integrations/supabase/client";

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('category').select('*');
  if (error) throw error;
  return data || [];
}

export async function fetchSubcategories(): Promise<Subcategory[]> {
  const { data, error } = await supabase.from('subcategories').select('*');
  if (error) throw error;
  return data || [];
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*');
  if (error) throw error;
  return data || [];
}

export async function fetchFeaturedProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').eq('is_featured', true);
  if (error) throw error;
  return data || [];
}

export async function fetchProduct(id: string): Promise<Product> {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}
