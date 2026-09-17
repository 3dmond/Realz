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
  image_storage_key?: string | null;
  category_id: number;
  subcategory_id?: number | null;
  keywords?: string[] | null;
  is_featured?: boolean | null;
  is_active?: boolean;
  status?: "draft" | "published" | "archived";
  price?: number;
  stock_quantity?: number;
  created_at?: string;
  updated_at?: string;
};

export const DEFAULT_SUBCATEGORIES: Subcategory[] = [
  { id: 1, category_id: 49134, name: "Rick and Morty", slug: "rick-and-morty" },
  { id: 2, category_id: 49134, name: "The Simpsons", slug: "the-simpsons" },
  { id: 3, category_id: 49134, name: "The Boondocks", slug: "the-boondocks" },
  { id: 4, category_id: 49134, name: "Arcane", slug: "arcane" },
  { id: 5, category_id: 49134, name: "Family Guy", slug: "family-guy" },
  { id: 6, category_id: 49134, name: "South Park", slug: "south-park" },
  { id: 7, category_id: 49134, name: "American Dad!", slug: "american-dad" },
];

type DbCategory = Database["public"]["Tables"]["categories"]["Row"] & {
  slug?: string;
};

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return ((data as DbCategory[]) || [])
    .filter((c) => c.is_active !== false)
    .map((c) => ({
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

export async function fetchSubcategories(categoryId?: number | unknown): Promise<Subcategory[]> {
  const numCategoryId = typeof categoryId === "number" ? categoryId : undefined;
  let customSubs: Subcategory[] = [];
  try {
    const stored = typeof window !== "undefined" ? localStorage.getItem("realz_custom_subcategories") : null;
    if (stored) customSubs = JSON.parse(stored);
  } catch {
    // Ignore
  }

  try {
    let query = supabase.from("subcategories").select("*").order("name", { ascending: true });
    if (numCategoryId) {
      query = query.eq("category_id", numCategoryId);
    }
    const { data, error } = await query;
    let baseList = data && data.length > 0 ? (data as Subcategory[]) : [];
    if (error || baseList.length === 0) {
      baseList = numCategoryId
        ? DEFAULT_SUBCATEGORIES.filter((s) => s.category_id === numCategoryId)
        : DEFAULT_SUBCATEGORIES;
    }

    if (customSubs.length > 0) {
      for (const cs of customSubs) {
        if (!baseList.some((s) => s.slug === cs.slug && s.category_id === cs.category_id)) {
          if (!numCategoryId || cs.category_id === numCategoryId) {
            baseList.push(cs);
          }
        }
      }
    }

    return baseList;
  } catch {
    let fallback = numCategoryId
      ? DEFAULT_SUBCATEGORIES.filter((s) => s.category_id === numCategoryId)
      : DEFAULT_SUBCATEGORIES;
    if (customSubs.length > 0) {
      for (const cs of customSubs) {
        if (!fallback.some((s) => s.slug === cs.slug && s.category_id === cs.category_id)) {
          if (!numCategoryId || cs.category_id === numCategoryId) {
            fallback.push(cs);
          }
        }
      }
    }
    return fallback;
  }
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("id", { ascending: true });

  if (error) throw error;
  return ((data as Product[]) || []).filter((p) => {
    if (p.is_active === false) return false;
    if (p.status && p.status !== "published") return false;
    return true;
  });
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
