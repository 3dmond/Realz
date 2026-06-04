export type Category = { 
  id: number; // Matched with int8
  name: string; 
  slug: string; 
};

export type Subcategory = { 
  id: number; // Matched with int8
  category_id: number; 
  name: string; 
  slug: string; 
};

export type Product = {
  id: number; // Matched with int8
  title: string;
  description: string | null;
  image_url: string; // Restored from thumbnail_url
  category_id: number; // Matched with int8
  subcategory_id: number | null;
  keywords?: string[] | null;
  is_featured?: boolean | null;
  created_at: string;
};
import { supabase } from "@/integrations/supabase/client";

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*');
  if (error) throw error;
  return (data as any) || [];
}

export async function fetchSubcategories(): Promise<Subcategory[]> {
  const { data, error } = await supabase.from('subcategories').select('*');
  if (error) throw error;
  return (data as any) || [];
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*');
  if (error) throw error;
  return (data as any) || [];
}

export async function fetchFeaturedProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').eq('is_featured', true);
  if (error) throw error;
  return (data as any) || [];
}

export async function fetchProduct(id: number): Promise<Product> {
  const { data, error } = await supabase.from('products').select('*').eq('id', id as any).single();
  if (error) throw error;
  return data as any;
}
