import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Category = {
  id: number;
  name: string;
  slug: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Subcategory = {
  id: number;
  category_id: number;
  name: string;
  slug: string;
};

export type Product = {
  id: number;
  title: string;
  description?: string | null;
  image_url: string;
  category_id: number;
  subcategory_id?: number | null;
  keywords?: string[] | null;
  is_featured?: boolean | null;
  is_active?: boolean;
  stock_quantity?: number;
  created_at?: string;
  updated_at?: string;
};

type DbCategory = Database["public"]["Tables"]["categories"]["Row"] & {
  slug?: string;
};

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return ((data as DbCategory[]) || []).map((c) => ({
    ...c,
    slug:
      c.slug ||
      c.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
  }));
}

export async function fetchSubcategories(): Promise<Subcategory[]> {
  return [];
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("id", { ascending: true });

  if (error) throw error;
  return ((data as Product[]) || []).filter((p) => p.is_active !== false);
}

export async function fetchFeaturedProducts(): Promise<Product[]> {
  const all = await fetchProducts();
  return all.slice(0, 16);
}

export async function fetchProduct(id: number): Promise<Product> {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).single();

  if (error) throw error;
  return data as Product;
}
