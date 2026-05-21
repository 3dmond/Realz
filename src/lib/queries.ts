import { supabase } from "@/integrations/supabase/client";

export type Category = { id: string; name: string; slug: string };
export type Subcategory = { id: string; category_id: string; name: string; slug: string };
export type Product = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string;
  category_id: string | null;
  subcategory_id: string | null;
  keywords: string[];
  is_featured: boolean;
  created_at: string;
};

export async function fetchCategories() {
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw error;
  return data as Category[];
}

export async function fetchSubcategories() {
  const { data, error } = await supabase.from("subcategories").select("*").order("name");
  if (error) throw error;
  return data as Subcategory[];
}

export async function fetchProducts() {
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Product[];
}

export async function fetchFeaturedProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_featured", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Product[];
}

export async function fetchProduct(id: string) {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Product;
}
