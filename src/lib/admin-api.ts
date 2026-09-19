import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { imageStorageService } from "./storage-service";
import { DEFAULT_SUBCATEGORIES } from "./queries";
import { extractErrorMessage } from "./utils";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "failed";

export type ProductStatus = "draft" | "published" | "archived";

export const ORDER_STATUSES: {
  value: OrderStatus;
  label: string;
  color: string;
}[] = [
  {
    value: "pending",
    label: "Pending Call",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
  {
    value: "confirmed",
    label: "Confirmed",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  },
  {
    value: "processing",
    label: "Processing / Packing",
    color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  },
  {
    value: "out_for_delivery",
    label: "Out for Delivery",
    color: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  },
  {
    value: "delivered",
    label: "Delivered",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    color: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  },
  {
    value: "failed",
    label: "Failed",
    color: "bg-red-500/10 text-red-400 border-red-500/30",
  },
];

export type AdminStats = {
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  activeProducts: number;
  draftProducts: number;
  archivedProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalCategories: number;
};

export type AdminOrder = Database["public"]["Tables"]["orders"]["Row"] & {
  order_items?: (Database["public"]["Tables"]["order_items"]["Row"] & {
    products?: Database["public"]["Tables"]["products"]["Row"] | null;
  })[];
};

export type Subcategory = Database["public"]["Tables"]["subcategories"]["Row"] & {
  product_count?: number;
};

export type AdminProduct = Database["public"]["Tables"]["products"]["Row"] & {
  categories?: Database["public"]["Tables"]["categories"]["Row"] | null;
  subcategories?: Database["public"]["Tables"]["subcategories"]["Row"] | null;
  product_images?: Database["public"]["Tables"]["product_images"]["Row"][];
};

export type InventoryLogWithProduct = Database["public"]["Tables"]["inventory_logs"]["Row"] & {
  products?: { title: string } | null;
};

export type BulkProductItem = {
  title: string;
  category_id: number;
  image_url: string;
  image_storage_key?: string;
  description?: string;
  stock_quantity: number;
  price?: number;
  cost_price: number;
  status: ProductStatus;
};

// ------------------------------------------------------------------------------
// AUDIT LOG HELPER (Safe execution even if table is not yet created)
// ------------------------------------------------------------------------------
export async function recordAuditLog(
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { data: user } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      actor_id: user?.user?.id ?? null,
      actor_email: user?.user?.email ?? "admin@realz.co.ke",
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    });
  } catch (err) {
    console.warn("[AuditLog] Skipped:", err);
  }
}

// ------------------------------------------------------------------------------
// OVERVIEW & STATS
// ------------------------------------------------------------------------------

export async function fetchAdminStats(): Promise<AdminStats> {
  // Fetch orders safely
  const { data: orders, error: oErr } = await supabase
    .from("orders")
    .select("status, total_price");

  if (oErr) throw oErr;

  const totalOrders = orders?.length ?? 0;
  const pendingOrders = orders?.filter((o) => o.status === "pending").length ?? 0;
  const deliveredOrders = orders?.filter((o) => o.status === "delivered").length ?? 0;

  const totalRevenue = (orders ?? [])
    .filter((o) => o.status !== "cancelled" && o.status !== "failed")
    .reduce((acc, o) => acc + (Number(o.total_price) || 0), 0);

  // Fetch products safely without hardcoding newly added columns
  const { data: products, error: pErr } = await supabase
    .from("products")
    .select("*");

  if (pErr) throw pErr;

  let activeProducts = 0;
  let draftProducts = 0;
  let archivedProducts = 0;
  let lowStockProducts = 0;
  let outOfStockProducts = 0;

  for (const p of products || []) {
    const status = p.status || (p.is_active === false ? "archived" : "published");
    const stock = p.stock_quantity ?? 100;

    if (status === "published" || (p.is_active !== false && !p.status)) {
      activeProducts++;
    } else if (status === "draft") {
      draftProducts++;
    } else if (status === "archived") {
      archivedProducts++;
    }

    if (stock <= 0) {
      outOfStockProducts++;
    } else if (stock < 15) {
      lowStockProducts++;
    }
  }

  // Categories count
  const { count: catCount, error: cErr } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true });

  return {
    totalOrders,
    pendingOrders,
    deliveredOrders,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    activeProducts,
    draftProducts,
    archivedProducts,
    lowStockProducts,
    outOfStockProducts,
    totalCategories: cErr ? 0 : catCount ?? 0,
  };
}

export async function fetchRecentOrders(limit = 6): Promise<AdminOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*, products(*))")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as unknown as AdminOrder[]) || [];
}

export async function fetchSalesTrends(): Promise<
  { date: string; revenue: number; orders: number }[]
> {
  const { data, error } = await supabase
    .from("orders")
    .select("created_at, total_price, status")
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) return [];

  const grouped: Record<string, { revenue: number; orders: number }> = {};
  for (const o of data || []) {
    if (o.status === "cancelled" || o.status === "failed") continue;
    const date = new Date(o.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    if (!grouped[date]) grouped[date] = { revenue: 0, orders: 0 };
    grouped[date].revenue += Number(o.total_price) || 0;
    grouped[date].orders += 1;
  }

  return Object.entries(grouped).map(([date, val]) => ({
    date,
    revenue: Math.round(val.revenue * 100) / 100,
    orders: val.orders,
  }));
}

// ------------------------------------------------------------------------------
// PRODUCTS & CATALOGUE MANAGEMENT
// ------------------------------------------------------------------------------

export async function fetchAdminProducts(params: {
  categoryId?: number | "ALL";
  subcategoryId?: number | "ALL";
  search?: string;
  statusFilter?: "ALL" | "published" | "draft" | "archived";
  stockFilter?: "ALL" | "in_stock" | "low_stock" | "out_of_stock";
  incompleteOnly?: boolean;
  sortBy?: "updated_at" | "created_at" | "title" | "stock_quantity" | "price" | "id";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}): Promise<{ products: AdminProduct[]; totalCount: number }> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Query safely with join
  let query = supabase.from("products").select("*, categories(*)", { count: "exact" });

  // 1. Category Filter
  if (params.categoryId && params.categoryId !== "ALL") {
    query = query.eq("category_id", params.categoryId);
  }

  // 1b. Subcategory Filter
  if (params.subcategoryId && params.subcategoryId !== "ALL") {
    query = query.eq("subcategory_id", params.subcategoryId);
  }

  // 2. Search
  if (params.search && params.search.trim().length > 0) {
    const term = params.search.trim();
    if (!isNaN(Number(term))) {
      query = query.or(`title.ilike.%${term}%,id.eq.${term}`);
    } else {
      query = query.ilike("title", `%${term}%`);
    }
  }

  // Sorting
  const sortCol = params.sortBy || "id";
  const ascending = params.sortOrder === "asc";
  query = query.order(sortCol, { ascending });

  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  let prods = (data as unknown as AdminProduct[]) || [];

  // Client-side filtering for schema resiliency (status, stock, incomplete)
  if (params.statusFilter && params.statusFilter !== "ALL") {
    prods = prods.filter((p) => {
      const currentStatus = p.status || (p.is_active === false ? "archived" : "published");
      return currentStatus === params.statusFilter;
    });
  }

  if (params.stockFilter && params.stockFilter !== "ALL") {
    prods = prods.filter((p) => {
      const stock = p.stock_quantity ?? 100;
      if (params.stockFilter === "out_of_stock") return stock <= 0;
      if (params.stockFilter === "low_stock") return stock > 0 && stock < 15;
      if (params.stockFilter === "in_stock") return stock >= 15;
      return true;
    });
  }

  if (params.incompleteOnly) {
    prods = prods.filter(
      (p) =>
        !p.image_url ||
        (p.stock_quantity ?? 100) <= 0 ||
        !p.category_id,
    );
  }

  return {
    products: prods,
    totalCount: count ?? prods.length,
  };
}

export async function createProduct(payload: {
  title: string;
  category_id: number;
  subcategory_id?: number | null;
  image_url: string;
  image_storage_key?: string;
  description?: string;
  stock_quantity?: number;
  price?: number;
  cost_price?: number;
  status?: ProductStatus;
  is_active?: boolean;
}): Promise<AdminProduct> {
  const targetStatus = payload.status || "published";
  const isActive = targetStatus === "published";

  // Build insert payload adaptively
  const insertPayload: Record<string, unknown> = {
    title: payload.title.trim(),
    category_id: payload.category_id,
    image_url: payload.image_url.trim(),
  };

  // Only include subcategory_id if a valid positive number
  if (typeof payload.subcategory_id === "number" && payload.subcategory_id > 0) {
    insertPayload.subcategory_id = payload.subcategory_id;
  }
  if (payload.image_storage_key) insertPayload.image_storage_key = payload.image_storage_key;
  if (payload.description !== undefined && payload.description !== null) insertPayload.description = payload.description.trim();
  if (payload.stock_quantity !== undefined && payload.stock_quantity !== null) insertPayload.stock_quantity = payload.stock_quantity;
  if (payload.price !== undefined && payload.price !== null) insertPayload.price = payload.price;
  if (payload.cost_price !== undefined && payload.cost_price !== null) insertPayload.cost_price = payload.cost_price;
  insertPayload.status = targetStatus;
  insertPayload.is_active = isActive;

  let data: AdminProduct;
  try {
    const res = await supabase
      .from("products")
      .insert(insertPayload as unknown as Database["public"]["Tables"]["products"]["Insert"])
      .select("*, categories(*)")
      .single();
    if (res.error) throw res.error;
    data = res.data as unknown as AdminProduct;
  } catch (err: unknown) {
    const msg = extractErrorMessage(err);
    const errCode = (err as { code?: string })?.code;

    // If subcategory_id column is missing in remote DB, strip it and retry immediately
    if (
      "subcategory_id" in insertPayload &&
      (msg.includes("subcategory_id") || errCode === "PGRST204" || msg.includes("column"))
    ) {
      delete insertPayload.subcategory_id;
      const retry = await supabase
        .from("products")
        .insert(insertPayload as unknown as Database["public"]["Tables"]["products"]["Insert"])
        .select("*, categories(*)")
        .single();
      if (retry.error) throw new Error(extractErrorMessage(retry.error));
      data = retry.data as unknown as AdminProduct;
    } else if (msg.includes("column") || msg.includes("does not exist") || errCode === "PGRST204") {
      const baselinePayload = {
        title: payload.title.trim(),
        category_id: payload.category_id,
        image_url: payload.image_url.trim(),
        image_storage_key: payload.image_storage_key || undefined,
        stock_quantity: payload.stock_quantity ?? 100,
        price: payload.price,
        cost_price: payload.cost_price ?? 6.0,
        status: targetStatus,
        is_active: isActive,
      };
      const retry = await supabase
        .from("products")
        .insert(baselinePayload as unknown as Database["public"]["Tables"]["products"]["Insert"])
        .select("*, categories(*)")
        .single();
      if (retry.error) throw new Error(extractErrorMessage(retry.error));
      data = retry.data as unknown as AdminProduct;
    } else {
      throw new Error(msg);
    }
  }

  // Record inventory movement for initial stock
  const initialStock = payload.stock_quantity ?? 0;
  if (initialStock > 0) {
    try {
      const { data: user } = await supabase.auth.getUser();
      await supabase.from("inventory_logs").insert({
        product_id: data.id,
        delta: initialStock,
        previous_stock: 0,
        new_stock: initialStock,
        reason: "Initial stock",
        actor_id: user?.user?.id ?? null,
      });
    } catch {
      // Safe fallback if inventory_logs table not yet created
    }
  }

  // Audit trail
  await recordAuditLog("CREATE_PRODUCT", "products", String(data.id), {
    title: data.title,
    status: targetStatus,
    initialStock,
    costPrice: payload.cost_price ?? 6.00,
  });

  return data;
}

export async function updateProduct(
  id: number,
  payload: {
    title?: string;
    category_id?: number;
    subcategory_id?: number | null;
    image_url?: string;
    image_storage_key?: string | null;
    description?: string | null;
    stock_quantity?: number;
    price?: number;
    cost_price?: number;
    status?: ProductStatus;
    is_active?: boolean;
  },
): Promise<AdminProduct> {
  let previousStock: number | undefined;
  if (payload.stock_quantity !== undefined) {
    try {
      const { data: cur } = await supabase
        .from("products")
        .select("stock_quantity")
        .eq("id", id)
        .single();
      if (cur) previousStock = cur.stock_quantity ?? 0;
    } catch {
      // Ignore
    }
  }

  const updateData: Record<string, unknown> = {};
  if (payload.title !== undefined) updateData.title = payload.title.trim();
  if (payload.category_id !== undefined) updateData.category_id = payload.category_id;
  if (typeof payload.subcategory_id === "number" && payload.subcategory_id > 0) {
    updateData.subcategory_id = payload.subcategory_id;
  }
  if (payload.image_url !== undefined) updateData.image_url = payload.image_url.trim();
  if (payload.image_storage_key !== undefined) updateData.image_storage_key = payload.image_storage_key;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.stock_quantity !== undefined) updateData.stock_quantity = payload.stock_quantity;
  if (payload.price !== undefined) updateData.price = payload.price;
  if (payload.cost_price !== undefined) updateData.cost_price = payload.cost_price;

  if (payload.status !== undefined) {
    updateData.status = payload.status;
    updateData.is_active = payload.status === "published";
  } else if (payload.is_active !== undefined) {
    updateData.is_active = payload.is_active;
    updateData.status = payload.is_active ? "published" : "archived";
  }

  let data: AdminProduct;
  try {
    const res = await supabase
      .from("products")
      .update(updateData as unknown as Database["public"]["Tables"]["products"]["Update"])
      .eq("id", id)
      .select("*, categories(*)")
      .single();
    if (res.error) throw res.error;
    data = res.data as unknown as AdminProduct;
  } catch (err: unknown) {
    const msg = extractErrorMessage(err);
    const errCode = (err as { code?: string })?.code;

    // If subcategory_id column doesn't exist, strip and retry
    if (
      "subcategory_id" in updateData &&
      (msg.includes("subcategory_id") || errCode === "PGRST204" || msg.includes("column"))
    ) {
      delete updateData.subcategory_id;
      const retryRes = await supabase
        .from("products")
        .update(updateData as unknown as Database["public"]["Tables"]["products"]["Update"])
        .eq("id", id)
        .select("*, categories(*)")
        .single();
      if (retryRes.error) throw new Error(extractErrorMessage(retryRes.error));
      data = retryRes.data as unknown as AdminProduct;
    } else if (msg.includes("column") || msg.includes("does not exist") || errCode === "PGRST204") {
      const minimalUpdate: Record<string, unknown> = {};
      if (payload.title !== undefined) minimalUpdate.title = payload.title.trim();
      if (payload.category_id !== undefined) minimalUpdate.category_id = payload.category_id;
      if (payload.image_url !== undefined) minimalUpdate.image_url = payload.image_url.trim();
      const retry = await supabase
        .from("products")
        .update(minimalUpdate as unknown as Database["public"]["Tables"]["products"]["Update"])
        .eq("id", id)
        .select("*, categories(*)")
        .single();
      if (retry.error) throw new Error(extractErrorMessage(retry.error));
      data = retry.data as unknown as AdminProduct;
    } else {
      throw new Error(msg);
    }
  }

  // Record inventory movement if stock was manually altered
  if (
    payload.stock_quantity !== undefined &&
    previousStock !== undefined &&
    payload.stock_quantity !== previousStock
  ) {
    const delta = payload.stock_quantity - previousStock;
    try {
      const { data: user } = await supabase.auth.getUser();
      await supabase.from("inventory_logs").insert({
        product_id: id,
        delta,
        previous_stock: previousStock,
        new_stock: payload.stock_quantity,
        reason: "Manual correction via product edit",
        actor_id: user?.user?.id ?? null,
      });
    } catch {
      // Ignore if table not present
    }
  }

  await recordAuditLog("UPDATE_PRODUCT", "products", String(id), {
    title: payload.title,
    categoryId: payload.category_id,
    stockQuantity: payload.stock_quantity,
    costPrice: payload.cost_price,
    status: payload.status,
  });
  return data;
}

export async function deleteOrArchiveProduct(
  id: number,
): Promise<{ actionTaken: "archived" | "deleted" }> {
  await moveToBin(id);
  return { actionTaken: "archived" };
}

/**
 * Move a sticker to the Bin (sets status to archived, is_active to false).
 */
export async function moveToBin(id: number): Promise<void> {
  await updateProduct(id, { status: "archived", is_active: false });
  await recordAuditLog("MOVE_TO_BIN", "products", String(id), {
    action: "Moved sticker to Recycle Bin",
  });
}

/**
 * Restore a sticker from the Bin (sets status to published, is_active to true).
 */
export async function restoreFromBin(id: number): Promise<void> {
  await updateProduct(id, { status: "published", is_active: true });
  await recordAuditLog("RESTORE_FROM_BIN", "products", String(id), {
    action: "Restored sticker from Recycle Bin to catalogue",
  });
}

/**
 * Fetch all stickers currently in the Bin.
 */
export async function fetchBinProducts(): Promise<AdminProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(*)")
    .or("status.eq.archived,is_active.eq.false")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data as unknown as AdminProduct[]) || [];
}

/**
 * Fetch count of items in the Bin.
 */
export async function fetchBinCount(): Promise<number> {
  const { count, error } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .or("status.eq.archived,is_active.eq.false");

  if (error) return 0;
  return count || 0;
}

/**
 * Permanently delete a sticker:
 * 1. Safely preserves order_items historical records by detaching product_id while retaining title and image.
 * 2. Removes the product row from public.products.
 * 3. Permanently deletes the artwork image from Supabase Storage.
 */
export async function permanentlyDeleteProduct(id: number): Promise<void> {
  // 1. Fetch product details to retrieve storage key / image url
  const { data: prod, error: pErr } = await supabase
    .from("products")
    .select("title, image_url, image_storage_key")
    .eq("id", id)
    .single();

  if (pErr) throw pErr;

  // 2. Protect historical order line items
  try {
    await supabase
      .from("order_items")
      .update({
        product_title: prod.title,
        product_image_url: prod.image_url,
        product_id: null,
      })
      .eq("product_id", id);
  } catch {
    // Continue if column not found or no orders
  }

  // 3. Delete from database
  const { error: delErr } = await supabase.from("products").delete().eq("id", id);
  if (delErr) throw delErr;

  // 4. Delete artwork from Supabase Storage
  const storageKey = prod.image_storage_key || imageStorageService.extractStorageKey(prod.image_url);
  if (storageKey) {
    try {
      await imageStorageService.deleteImage(storageKey);
    } catch (sErr) {
      console.warn("Storage deletion notice:", sErr);
    }
  }

  await recordAuditLog("PERMANENTLY_DELETE_PRODUCT", "products", String(id), {
    title: prod.title,
    storageKey,
  });
}

/**
 * Empty the Bin: permanently deletes all trashed stickers and their storage assets.
 */
export async function emptyBin(): Promise<{ deletedCount: number }> {
  const trashed = await fetchBinProducts();
  let count = 0;
  for (const item of trashed) {
    try {
      await permanentlyDeleteProduct(item.id);
      count++;
    } catch (err) {
      console.error(`Failed to permanently delete product ${item.id}:`, err);
    }
  }
  return { deletedCount: count };
}

// ------------------------------------------------------------------------------
// BULK STICKER IMPORT ENGINE
// ------------------------------------------------------------------------------

export async function bulkCreateProducts(
  items: BulkProductItem[],
  onProgress?: (index: number, total: number) => void,
): Promise<{
  total: number;
  successful: AdminProduct[];
  failed: { item: BulkProductItem; error: string }[];
}> {
  const successful: AdminProduct[] = [];
  const failed: { item: BulkProductItem; error: string }[] = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    try {
      const prod = await createProduct({
        title: it.title,
        category_id: it.category_id,
        image_url: it.image_url,
        image_storage_key: it.image_storage_key,
        description: it.description,
        stock_quantity: it.stock_quantity,
        price: it.price,
        cost_price: it.cost_price,
        status: it.status,
      });
      successful.push(prod);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to insert record";
      failed.push({ item: it, error: errorMsg });
    }

    if (onProgress) {
      onProgress(i + 1, items.length);
    }
  }

  await recordAuditLog("BULK_IMPORT_COMPLETED", "products", null, {
    total: items.length,
    successfulCount: successful.length,
    failedCount: failed.length,
  });

  return {
    total: items.length,
    successful,
    failed,
  };
}

// ------------------------------------------------------------------------------
// CATEGORIES MANAGEMENT
// ------------------------------------------------------------------------------

export async function fetchAdminCategories(): Promise<
  (Database["public"]["Tables"]["categories"]["Row"] & {
    product_count: number;
  })[]
> {
  const { data: cats, error: cErr } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (cErr) throw cErr;

  const { data: prods, error: pErr } = await supabase
    .from("products")
    .select("category_id");

  const counts: Record<number, number> = {};
  if (!pErr && prods) {
    for (const p of prods) {
      counts[p.category_id] = (counts[p.category_id] || 0) + 1;
    }
  }

  return (cats || []).map((c) => ({
    ...c,
    product_count: counts[c.id] || 0,
  }));
}

export async function createCategory(
  name: string,
  slug?: string,
): Promise<Database["public"]["Tables"]["categories"]["Row"]> {
  const cleanName = name.trim();
  const cleanSlug =
    slug?.trim().toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_]+/g, "") ||
    cleanName.toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_]+/g, "");

  const { data, error } = await supabase
    .from("categories")
    .insert({ name: cleanName, slug: cleanSlug, is_active: true })
    .select()
    .single();

  if (error) throw error;

  try {
    await imageStorageService.createStorageFolder(cleanSlug);
  } catch (storageErr) {
    console.warn("Storage folder initialization notice:", storageErr);
  }

  await recordAuditLog("CREATE_CATEGORY", "categories", String(data.id), {
    name: cleanName,
    slug: cleanSlug,
  });

  return data;
}

export async function updateCategory(
  id: number,
  payload: { name?: string; slug?: string; is_active?: boolean },
): Promise<void> {
  const updateData: Record<string, unknown> = {};
  if (payload.name !== undefined) updateData.name = payload.name.trim().toLowerCase();
  if (payload.slug !== undefined) updateData.slug = payload.slug.trim().toLowerCase();
  if (payload.is_active !== undefined) updateData.is_active = payload.is_active;

  const { error } = await supabase.from("categories").update(updateData).eq("id", id);
  if (error) throw error;

  await recordAuditLog("UPDATE_CATEGORY", "categories", String(id), payload);
}

export async function safeDeleteCategory(
  id: number,
  reassignToCategoryId?: number,
): Promise<{ reassignedCount: number; action: "deleted" | "reassigned" }> {
  // 1. Check for assigned products
  const { data: prods, error: pErr } = await supabase
    .from("products")
    .select("id")
    .eq("category_id", id);

  if (pErr) throw pErr;

  const productCount = prods?.length || 0;

  if (productCount > 0) {
    if (!reassignToCategoryId || reassignToCategoryId === id) {
      throw new Error(
        `Cannot delete category: ${productCount} active products are currently assigned to it. Please select a replacement category to reassign them before deletion.`,
      );
    }

    // Reassign products to new category
    const { error: rErr } = await supabase
      .from("products")
      .update({ category_id: reassignToCategoryId })
      .eq("category_id", id);

    if (rErr) throw rErr;

    // Delete empty category
    const { error: dErr } = await supabase.from("categories").delete().eq("id", id);
    if (dErr) throw dErr;

    await recordAuditLog("DELETE_CATEGORY", "categories", String(id), {
      reassignedTo: reassignToCategoryId,
      reassignedProductsCount: productCount,
    });

    return { reassignedCount: productCount, action: "reassigned" };
  }

  // No products assigned, safe to delete directly
  const { error: dErr } = await supabase.from("categories").delete().eq("id", id);
  if (dErr) throw dErr;

  await recordAuditLog("DELETE_CATEGORY", "categories", String(id), {
    reassignedCount: 0,
  });

  return { reassignedCount: 0, action: "deleted" };
}

// ------------------------------------------------------------------------------
// SUBCATEGORIES MANAGEMENT
// ------------------------------------------------------------------------------

export async function fetchAdminSubcategories(categoryId?: number | unknown): Promise<Subcategory[]> {
  const numCategoryId = typeof categoryId === "number" ? categoryId : undefined;
  try {
    let customSubs: Subcategory[] = [];
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem("realz_custom_subcategories") : null;
      if (stored) customSubs = JSON.parse(stored);
    } catch {
      // Ignore
    }

    let query = supabase.from("subcategories").select("*").order("name", { ascending: true });
    if (numCategoryId) {
      query = query.eq("category_id", numCategoryId);
    }
    const { data: subs, error: sErr } = await query;
    let finalSubs = (subs as unknown as Subcategory[]) || [];
    if (sErr || finalSubs.length === 0) {
      if (sErr) console.warn("Subcategories fetch notice:", sErr.message);
      finalSubs = (numCategoryId
        ? DEFAULT_SUBCATEGORIES.filter((s) => s.category_id === numCategoryId)
        : DEFAULT_SUBCATEGORIES) as unknown as Subcategory[];
    }

    if (customSubs.length > 0) {
      for (const cs of customSubs) {
        if (!finalSubs.some((s) => s.slug === cs.slug && s.category_id === cs.category_id)) {
          if (!numCategoryId || cs.category_id === numCategoryId) {
            finalSubs.push(cs);
          }
        }
      }
    }

    // Compute product counts per subcategory
    let prods: { image_storage_key?: string | null; subcategory_id?: number | null }[] = [];
    try {
      const { data } = await supabase.from("products").select("image_storage_key");
      prods = data || [];
    } catch {
      // Ignore
    }

    return (finalSubs || []).map((s) => {
      const count = prods.filter((p) => p.image_storage_key?.includes(`/${s.slug}/`)).length;
      return {
        ...s,
        product_count: count,
      };
    });
  } catch {
    return [];
  }
}

export async function createSubcategory(
  categoryId: number,
  name: string,
  slug?: string,
  categorySlug?: string,
): Promise<Subcategory> {
  const cleanName = name.trim();
  const cleanSlug =
    slug?.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]+/g, "") ||
    cleanName.toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]+/g, "");

  // Initialize storage folder if categorySlug provided
  if (categorySlug) {
    try {
      await imageStorageService.createStorageFolder(`${categorySlug}/${cleanSlug}`);
    } catch (storageErr) {
      console.warn("Subcategory storage folder initialization notice:", storageErr);
    }
  }

  let data: Subcategory | null = null;
  try {
    const res = await supabase
      .from("subcategories")
      .insert({ category_id: categoryId, name: cleanName, slug: cleanSlug })
      .select()
      .single();

    if (res.error) throw res.error;
    data = res.data as unknown as Subcategory;
  } catch (dbErr) {
    console.warn("Subcategories table not available in DB, using persistent client storage:", dbErr);
    const fallbackId = Date.now();
    const newSub: Subcategory = {
      id: fallbackId,
      category_id: categoryId,
      name: cleanName,
      slug: cleanSlug,
      product_count: 0,
    };
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem("realz_custom_subcategories") : null;
      const list: Subcategory[] = stored ? JSON.parse(stored) : [];
      list.push(newSub);
      localStorage.setItem("realz_custom_subcategories", JSON.stringify(list));
    } catch {
      // Ignore
    }
    data = newSub;
  }

  await recordAuditLog("CREATE_SUBCATEGORY", "subcategories", String(data.id), {
    categoryId,
    name: cleanName,
    slug: cleanSlug,
  });

  return data;
}

export async function deleteSubcategory(id: number): Promise<void> {
  try {
    await supabase.from("subcategories").delete().eq("id", id);
  } catch {
    // Ignore
  }

  try {
    const stored = typeof window !== "undefined" ? localStorage.getItem("realz_custom_subcategories") : null;
    if (stored) {
      const list: Subcategory[] = JSON.parse(stored);
      const filtered = list.filter((s) => s.id !== id);
      localStorage.setItem("realz_custom_subcategories", JSON.stringify(filtered));
    }
  } catch {
    // Ignore
  }

  await recordAuditLog("DELETE_SUBCATEGORY", "subcategories", String(id), {
    action: "Deleted subcategory",
  });
}

// ------------------------------------------------------------------------------
// INVENTORY & STOCK MANAGEMENT
// ------------------------------------------------------------------------------

export async function adjustInventory(
  productId: number,
  delta: number,
  reason: string,
): Promise<void> {
  // 1. Try atomic adjust_product_inventory RPC
  try {
    const rpcFn = supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ error: Error | null }>;
    const { error: rpcErr } = await rpcFn("adjust_product_inventory", {
      p_product_id: productId,
      p_delta: delta,
      p_reason: reason,
    });
    if (!rpcErr) return;
  } catch {
    // Fall back to direct query
  }

  // 2. Direct fallback
  const { data: prod, error: pErr } = await supabase
    .from("products")
    .select("stock_quantity")
    .eq("id", productId)
    .single();

  if (pErr) throw pErr;

  const current = prod.stock_quantity ?? 100;
  const nextStock = Math.max(0, current + delta);

  const { error: uErr } = await supabase
    .from("products")
    .update({ stock_quantity: nextStock })
    .eq("id", productId);

  if (uErr) throw uErr;

  try {
    const { data: user } = await supabase.auth.getUser();
    await supabase.from("inventory_logs").insert({
      product_id: productId,
      delta,
      previous_stock: current,
      new_stock: nextStock,
      reason,
      actor_id: user?.user?.id ?? null,
    });
  } catch {
    // Ignore if table not present yet
  }

  await recordAuditLog("ADJUST_INVENTORY", "products", String(productId), {
    delta,
    previousStock: current,
    newStock: nextStock,
    reason,
  });
}

export async function fetchInventoryLogs(
  productId?: number,
  limit = 50,
): Promise<InventoryLogWithProduct[]> {
  try {
    let query = supabase
      .from("inventory_logs")
      .select("*, products(title)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (productId) {
      query = query.eq("product_id", productId);
    }

    const { data, error } = await query;
    if (error) return [];
    return (data as unknown as InventoryLogWithProduct[]) || [];
  } catch {
    return [];
  }
}

// ------------------------------------------------------------------------------
// ORDERS MANAGEMENT
// ------------------------------------------------------------------------------

export async function fetchOrders(params: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ orders: AdminOrder[]; totalCount: number }> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 15;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("orders")
    .select("*, order_items(*, products(*))", { count: "exact" })
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "ALL") {
    query = query.eq("status", params.status);
  }

  if (params.search && params.search.trim().length > 0) {
    const term = params.search.trim();
    query = query.or(
      `customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%,delivery_place.ilike.%${term}%`,
    );
  }

  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    orders: (data as unknown as AdminOrder[]) || [],
    totalCount: count ?? 0,
  };
}

export async function fetchOrderDetails(id: string): Promise<AdminOrder> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*, products(*))")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as AdminOrder;
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  notes = "",
): Promise<void> {
  // 1. Try atomic update_order_status RPC
  try {
    const rpcFn = supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ error: Error | null }>;
    const { error: rpcErr } = await rpcFn("update_order_status", {
      p_order_id: orderId,
      p_new_status: newStatus,
      p_notes: notes,
    });
    if (!rpcErr) return;
  } catch {
    // Fall back to direct update
  }

  // 2. Direct fallback update
  const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
  if (error) throw error;

  await recordAuditLog("UPDATE_ORDER_STATUS", "orders", orderId, {
    newStatus,
    notes,
  });
}

// ------------------------------------------------------------------------------
// AUDIT LOGS
// ------------------------------------------------------------------------------

export async function fetchAuditLogs(
  limit = 100,
): Promise<Database["public"]["Tables"]["audit_logs"]["Row"][]> {
  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

// ------------------------------------------------------------------------------
// FINANCIAL & BUSINESS INTELLIGENCE ANALYTICS
// ------------------------------------------------------------------------------

export type ExecutiveFinancialSummary = {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalStickersSold: number;
  totalCogs: number;
  totalGrossProfit: number;
  grossMarginPercentage: number;
};

export type ProductPerformanceMetric = {
  productId: number;
  title: string;
  categoryName: string;
  status: string;
  stock: number;
  price: number;
  unitsSold: number;
  revenue: number;
  grossProfit: number;
};

export async function fetchExecutiveFinancials(): Promise<ExecutiveFinancialSummary> {
  // 1. Try querying analytical view
  try {
    const { data, error } = await supabase
      .from("view_analytics_financial_summary" as unknown as "orders")
      .select("*")
      .single();

    if (!error && data) {
      const row = data as unknown as Database["public"]["Views"]["view_analytics_financial_summary"]["Row"];
      return {
        totalRevenue: Number(row.total_revenue) || 0,
        totalOrders: Number(row.total_orders) || 0,
        pendingOrders: Number(row.pending_orders) || 0,
        deliveredOrders: Number(row.delivered_orders) || 0,
        cancelledOrders: Number(row.cancelled_orders) || 0,
        totalStickersSold: Number(row.total_stickers_sold) || 0,
        totalCogs: Number(row.total_cogs) || 0,
        totalGrossProfit: Number(row.total_gross_profit) || 0,
        grossMarginPercentage: Number(row.gross_margin_percentage) || 0,
      };
    }
  } catch {
    // Fall back to live calculation
  }

  // 2. Authoritative client-side calculation from operational tables
  const { data: orders } = await supabase.from("orders").select("*, order_items(*)");
  const { data: products } = await supabase.from("products").select("id, cost_price");

  const costMap: Record<number, number> = {};
  for (const p of products || []) {
    costMap[p.id] = Number(p.cost_price) || 6.00; // Baseline estimated sticker print cost
  }

  let totalRevenue = 0;
  let totalOrders = 0;
  let pendingOrders = 0;
  let deliveredOrders = 0;
  let cancelledOrders = 0;
  let totalStickersSold = 0;
  let totalCogs = 0;

  for (const o of orders || []) {
    totalOrders++;
    if (o.status === "pending") pendingOrders++;
    if (o.status === "delivered") deliveredOrders++;
    if (o.status === "cancelled") {
      cancelledOrders++;
      continue;
    }

    totalRevenue += Number(o.total_price) || 0;
    for (const it of o.order_items || []) {
      const qty = Number(it.quantity) || 0;
      totalStickersSold += qty;
      const unitCost = it.product_id ? (costMap[it.product_id] ?? 6.00) : 6.00;
      totalCogs += qty * unitCost;
    }
  }

  const totalGrossProfit = Math.max(0, totalRevenue - totalCogs);
  const grossMarginPercentage =
    totalRevenue > 0 ? Math.round((totalGrossProfit / totalRevenue) * 10000) / 100 : 0;

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalOrders,
    pendingOrders,
    deliveredOrders,
    cancelledOrders,
    totalStickersSold,
    totalCogs: Math.round(totalCogs * 100) / 100,
    totalGrossProfit: Math.round(totalGrossProfit * 100) / 100,
    grossMarginPercentage,
  };
}

export async function fetchProductPerformanceLeaderboard(): Promise<ProductPerformanceMetric[]> {
  // Query orders with items and products
  const { data: orders } = await supabase
    .from("orders")
    .select("status, order_items(quantity, unit_price, product_id)");

  const { data: prods } = await supabase
    .from("products")
    .select("id, title, category_id, status, is_active, stock_quantity, price, cost_price, categories(name)");

  const performance: Record<
    number,
    { unitsSold: number; revenue: number; cogs: number }
  > = {};

  for (const o of orders || []) {
    if (o.status === "cancelled" || o.status === "failed") continue;
    for (const it of o.order_items || []) {
      if (!it.product_id) continue;
      if (!performance[it.product_id]) {
        performance[it.product_id] = { unitsSold: 0, revenue: 0, cogs: 0 };
      }
      const qty = Number(it.quantity) || 0;
      const price = Number(it.unit_price) || 15.50;
      performance[it.product_id].unitsSold += qty;
      performance[it.product_id].revenue += qty * price;
    }
  }

  return (prods || []).map((p) => {
    const stats = performance[p.id] || { unitsSold: 0, revenue: 0, cogs: 0 };
    const cost = Number(p.cost_price) || 6.00;
    const totalCost = stats.unitsSold * cost;
    const grossProfit = Math.max(0, stats.revenue - totalCost);

    return {
      productId: p.id,
      title: p.title,
      categoryName: p.categories?.name || `Category #${p.category_id}`,
      status: p.status || (p.is_active === false ? "archived" : "published"),
      stock: p.stock_quantity ?? 100,
      price: Number(p.price) || 15.50,
      unitsSold: stats.unitsSold,
      revenue: Math.round(stats.revenue * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
    };
  }).sort((a, b) => b.unitsSold - a.unitsSold);
}

// ------------------------------------------------------------------------------
// STICKER PACKS & BUNDLES
// ------------------------------------------------------------------------------

export interface StickerPack {
  id: string;
  title: string;
  slug: string;
  description?: string;
  badge?: string; // e.g. "HOT DROP", "30% OFF", "LIMITED", "BEST VALUE"
  price: number;
  compare_at_price?: number; // Sum of individual sticker prices
  cover_image_url?: string;
  status: "published" | "draft" | "archived";
  sticker_ids: number[];
  stickers?: AdminProduct[];
  created_at: string;
  updated_at?: string;
}

const PACKS_STORAGE_KEY = "realz_sticker_packs_v1";

function getStoredLocalPacks(): StickerPack[] {
  try {
    const raw = localStorage.getItem(PACKS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function setStoredLocalPacks(packs: StickerPack[]): void {
  try {
    localStorage.setItem(PACKS_STORAGE_KEY, JSON.stringify(packs));
    window.dispatchEvent(new Event("realz_packs_updated"));
  } catch (e) {
    console.error("Failed to persist packs to local storage:", e);
  }
}

export async function fetchAdminPacks(): Promise<StickerPack[]> {
  // Fetch products to map pack sticker previews
  let allProducts: AdminProduct[] = [];
  try {
    const res = await fetchAdminProducts({ pageSize: 500 });
    allProducts = res.products;
  } catch {
    // Graceful fallback
  }

  const productMap = new Map<number, AdminProduct>();
  allProducts.forEach((p) => productMap.set(p.id, p));

  let rawPacks: StickerPack[] = [];

  // 1. Try querying Supabase
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("sticker_packs")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rawPacks = data.map((item: any) => ({
        id: String(item.id),
        title: item.title,
        slug: item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: item.description || "",
        badge: item.badge || "",
        price: Number(item.price) || 0,
        compare_at_price: item.compare_at_price ? Number(item.compare_at_price) : undefined,
        cover_image_url: item.cover_image_url || "",
        status: (item.status as ProductStatus) || "published",
        sticker_ids: Array.isArray(item.sticker_ids)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? item.sticker_ids.map((x: any) => Number(x))
          : [],
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at,
      }));
    } else {
      rawPacks = getStoredLocalPacks();
    }
  } catch {
    rawPacks = getStoredLocalPacks();
  }

  // Ensure the special "Trending Picks" pack exists and contains the current homepage trending stickers
  const hasTrendingPack = rawPacks.some(
    (p) => p.id === TRENDING_PACK_ID || p.slug === TRENDING_PACK_SLUG,
  );
  if (!hasTrendingPack && allProducts.length > 0) {
    const featured = allProducts.filter((p) => p.is_featured);
    const chosen = featured.length > 0 ? featured.slice(0, 16) : allProducts.slice(0, 16);
    const initialTrendingPack: StickerPack = {
      id: TRENDING_PACK_ID,
      title: "Trending Picks",
      slug: TRENDING_PACK_SLUG,
      description: "Official curated trending drops showcased on the Realz homepage.",
      badge: "LIVE DROP",
      price: 350,
      status: "published",
      sticker_ids: chosen.map((p) => p.id),
      created_at: new Date().toISOString(),
    };
    rawPacks = [initialTrendingPack, ...rawPacks];
    setStoredLocalPacks(rawPacks);
  }

  // Populate stickers and calculate compare_at_price if not defined
  return rawPacks.map((pack) => {
    const matchedStickers = pack.sticker_ids
      .map((id) => productMap.get(id))
      .filter((s): s is AdminProduct => !!s);

    const calculatedCompareAt = matchedStickers.reduce(
      (sum, s) => sum + (Number(s.price) || 100),
      0,
    );

    return {
      ...pack,
      stickers: matchedStickers,
      compare_at_price:
        pack.compare_at_price ??
        (calculatedCompareAt > pack.price ? calculatedCompareAt : undefined),
    };
  });
}

export async function createPack(payload: {
  title: string;
  slug?: string;
  description?: string;
  badge?: string;
  price: number;
  compare_at_price?: number;
  cover_image_url?: string;
  status: "published" | "draft" | "archived";
  sticker_ids: number[];
}): Promise<StickerPack> {
  const cleanTitle = payload.title.trim();
  const cleanSlug =
    payload.slug?.trim() ||
    cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const id = `pack_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  const newPack: StickerPack = {
    id,
    title: cleanTitle,
    slug: cleanSlug,
    description: payload.description?.trim() || "",
    badge: payload.badge?.trim() || "",
    price: Number(payload.price) || 0,
    compare_at_price: payload.compare_at_price ? Number(payload.compare_at_price) : undefined,
    cover_image_url: payload.cover_image_url?.trim() || "",
    status: payload.status || "published",
    sticker_ids: payload.sticker_ids,
    created_at: now,
    updated_at: now,
  };

  // 1. Try Supabase
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("sticker_packs").insert({
      id: newPack.id,
      title: newPack.title,
      slug: newPack.slug,
      description: newPack.description,
      badge: newPack.badge,
      price: newPack.price,
      compare_at_price: newPack.compare_at_price,
      cover_image_url: newPack.cover_image_url,
      status: newPack.status,
      sticker_ids: newPack.sticker_ids,
      created_at: newPack.created_at,
      updated_at: newPack.updated_at,
    });
    if (error) throw error;
  } catch (err) {
    console.warn("[createPack] Supabase notice, saved to persistent local storage:", err);
  }

  // 2. Update local storage cache
  const existing = getStoredLocalPacks();
  setStoredLocalPacks([newPack, ...existing]);

  await recordAuditLog("CREATE_STICKER_PACK", "sticker_packs", newPack.id, {
    title: newPack.title,
    price: newPack.price,
    stickersCount: newPack.sticker_ids.length,
  });

  return newPack;
}

export async function updatePack(
  id: string,
  payload: Partial<Omit<StickerPack, "id" | "created_at" | "stickers">>,
): Promise<void> {
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { ...payload, updated_at: now };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("sticker_packs").update(updates).eq("id", id);
  } catch (err) {
    console.warn("[updatePack] Supabase notice:", err);
  }

  const existing = getStoredLocalPacks();
  const updated = existing.map((p) =>
    p.id === id ? { ...p, ...payload, updated_at: now } : p,
  );
  setStoredLocalPacks(updated);

  await recordAuditLog("UPDATE_STICKER_PACK", "sticker_packs", id, payload);
}

export async function deletePack(id: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("sticker_packs").delete().eq("id", id);
  } catch (err) {
    console.warn("[deletePack] Supabase notice:", err);
  }

  const existing = getStoredLocalPacks();
  setStoredLocalPacks(existing.filter((p) => p.id !== id));

  await recordAuditLog("DELETE_STICKER_PACK", "sticker_packs", id);
}

export async function togglePackStatus(
  id: string,
  newStatus: "published" | "draft" | "archived",
): Promise<void> {
  await updatePack(id, { status: newStatus });
}

// ------------------------------------------------------------------------------
// TRENDING PICKS PACK (HOMEPAGE CURATION)
// ------------------------------------------------------------------------------

export const TRENDING_PACK_ID = "pack_trending_picks";
export const TRENDING_PACK_SLUG = "trending-picks";

export async function fetchTrendingPack(): Promise<StickerPack> {
  const packs = await fetchAdminPacks();
  let trending = packs.find(
    (p) => p.id === TRENDING_PACK_ID || p.slug === TRENDING_PACK_SLUG,
  );

  if (!trending) {
    let initialIds: number[] = [];
    try {
      const res = await fetchAdminProducts({ pageSize: 50 });
      const prods = res.products || [];
      const featured = prods.filter((p) => p.is_featured);
      const chosen = featured.length > 0 ? featured.slice(0, 16) : prods.slice(0, 16);
      initialIds = chosen.map((p) => p.id);
    } catch {
      // Fallback
    }

    const created = await createPack({
      title: "Trending Picks",
      slug: TRENDING_PACK_SLUG,
      description: "Official curated trending drops showcased on the Realz homepage.",
      badge: "LIVE DROP",
      price: 350,
      status: "published",
      sticker_ids: initialIds,
    });

    const allStored = getStoredLocalPacks();
    const normalized = allStored.map((p) =>
      p.id === created.id ? { ...p, id: TRENDING_PACK_ID } : p,
    );
    setStoredLocalPacks(normalized);
    trending = { ...created, id: TRENDING_PACK_ID };
  }

  return trending;
}

export async function updateTrendingStickers(stickerIds: number[]): Promise<void> {
  const trending = await fetchTrendingPack();
  await updatePack(trending.id, { sticker_ids: stickerIds });

  try {
    window.dispatchEvent(new Event("realz_trending_updated"));
  } catch {
    // Ignore
  }
}

export async function addStickerToTrending(stickerId: number): Promise<void> {
  const trending = await fetchTrendingPack();
  if (!trending.sticker_ids.includes(stickerId)) {
    const nextIds = [stickerId, ...trending.sticker_ids];
    await updateTrendingStickers(nextIds);
  }
}

export async function removeStickerFromTrending(stickerId: number): Promise<void> {
  const trending = await fetchTrendingPack();
  const nextIds = trending.sticker_ids.filter((id) => id !== stickerId);
  await updateTrendingStickers(nextIds);
}
