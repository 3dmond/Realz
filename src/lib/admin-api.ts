import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "failed";

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
  lowStockProducts: number;
  totalCategories: number;
};

export type AdminOrder = Database["public"]["Tables"]["orders"]["Row"] & {
  order_items?: (Database["public"]["Tables"]["order_items"]["Row"] & {
    products?: Database["public"]["Tables"]["products"]["Row"] | null;
  })[];
};

export type AdminProduct = Database["public"]["Tables"]["products"]["Row"] & {
  categories?: Database["public"]["Tables"]["categories"]["Row"] | null;
};

export type InventoryLogWithProduct = Database["public"]["Tables"]["inventory_logs"]["Row"] & {
  products?: { title: string } | null;
};

// ------------------------------------------------------------------------------
// OVERVIEW & ANALYTICS
// ------------------------------------------------------------------------------

export async function fetchAdminStats(): Promise<AdminStats> {
  // Fetch orders overview
  const { data: orders, error: oErr } = await supabase.from("orders").select("status, total_price");

  if (oErr) throw oErr;

  const totalOrders = orders?.length ?? 0;
  const pendingOrders = orders?.filter((o) => o.status === "pending").length ?? 0;
  const deliveredOrders = orders?.filter((o) => o.status === "delivered").length ?? 0;

  // Realized revenue: delivered + confirmed + processing + out_for_delivery
  const totalRevenue = (orders ?? [])
    .filter((o) => o.status !== "cancelled" && o.status !== "failed")
    .reduce((acc, o) => acc + (Number(o.total_price) || 0), 0);

  // Products overview
  const { data: products, error: pErr } = await supabase
    .from("products")
    .select("is_active, stock_quantity");

  if (pErr) throw pErr;

  const activeProducts = products?.filter((p) => p.is_active !== false).length ?? 0;
  const lowStockProducts = products?.filter((p) => (p.stock_quantity ?? 100) < 15).length ?? 0;

  // Categories overview
  const { count: catCount, error: cErr } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true });

  if (cErr) throw cErr;

  return {
    totalOrders,
    pendingOrders,
    deliveredOrders,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    activeProducts,
    lowStockProducts,
    totalCategories: catCount ?? 0,
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

  if (error) throw error;

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

  // Log to audit_logs if table exists
  try {
    const { data: user } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      actor_id: user?.user?.id ?? null,
      actor_email: user?.user?.email ?? null,
      action: "UPDATE_ORDER_STATUS",
      entity_type: "orders",
      entity_id: orderId,
      metadata: { new_status: newStatus, notes },
    });
  } catch (logErr) {
    console.warn("Audit logging skipped:", logErr);
  }
}

// ------------------------------------------------------------------------------
// PRODUCTS MANAGEMENT
// ------------------------------------------------------------------------------

export async function fetchAdminProducts(params: {
  categoryId?: number | "ALL";
  search?: string;
  statusFilter?: "ALL" | "active" | "archived";
  stockFilter?: "ALL" | "low_stock" | "out_of_stock";
  page?: number;
  pageSize?: number;
}): Promise<{ products: AdminProduct[]; totalCount: number }> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("products")
    .select("*, categories(*)", { count: "exact" })
    .order("id", { ascending: false });

  if (params.categoryId && params.categoryId !== "ALL") {
    query = query.eq("category_id", params.categoryId);
  }

  if (params.statusFilter === "active") {
    query = query.eq("is_active", true);
  } else if (params.statusFilter === "archived") {
    query = query.eq("is_active", false);
  }

  if (params.stockFilter === "low_stock") {
    query = query.lt("stock_quantity", 15).gt("stock_quantity", 0);
  } else if (params.stockFilter === "out_of_stock") {
    query = query.lte("stock_quantity", 0);
  }

  if (params.search && params.search.trim().length > 0) {
    const term = params.search.trim();
    query = query.ilike("title", `%${term}%`);
  }

  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    products: (data as unknown as AdminProduct[]) || [],
    totalCount: count ?? 0,
  };
}

export async function createProduct(payload: {
  title: string;
  category_id: number;
  image_url: string;
  description?: string;
  stock_quantity?: number;
  is_active?: boolean;
}): Promise<AdminProduct> {
  const { data, error } = await supabase
    .from("products")
    .insert({
      title: payload.title.trim(),
      category_id: payload.category_id,
      image_url: payload.image_url.trim(),
      description: payload.description?.trim() || null,
      stock_quantity: payload.stock_quantity ?? 100,
      is_active: payload.is_active ?? true,
    })
    .select("*, categories(*)")
    .single();

  if (error) throw error;

  try {
    const { data: user } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      actor_id: user?.user?.id ?? null,
      actor_email: user?.user?.email ?? null,
      action: "CREATE_PRODUCT",
      entity_type: "products",
      entity_id: String(data.id),
      metadata: payload,
    });
  } catch (logErr) {
    console.warn("Audit logging skipped:", logErr);
  }

  return data as unknown as AdminProduct;
}

export async function updateProduct(
  id: number,
  payload: {
    title?: string;
    category_id?: number;
    image_url?: string;
    description?: string | null;
    stock_quantity?: number;
    is_active?: boolean;
  },
): Promise<AdminProduct> {
  const updateData: Database["public"]["Tables"]["products"]["Update"] = {};
  if (payload.title !== undefined) updateData.title = payload.title.trim();
  if (payload.category_id !== undefined) updateData.category_id = payload.category_id;
  if (payload.image_url !== undefined) updateData.image_url = payload.image_url.trim();
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.stock_quantity !== undefined) updateData.stock_quantity = payload.stock_quantity;
  if (payload.is_active !== undefined) updateData.is_active = payload.is_active;

  const { data, error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", id)
    .select("*, categories(*)")
    .single();

  if (error) throw error;

  try {
    const { data: user } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      actor_id: user?.user?.id ?? null,
      actor_email: user?.user?.email ?? null,
      action: "UPDATE_PRODUCT",
      entity_type: "products",
      entity_id: String(id),
      metadata: payload,
    });
  } catch (logErr) {
    console.warn("Audit logging skipped:", logErr);
  }

  return data as unknown as AdminProduct;
}

export async function deleteOrArchiveProduct(
  id: number,
): Promise<{ actionTaken: "archived" | "deleted" }> {
  // Check if product is referenced in historical order_items
  const { data: orderRefs, error: refErr } = await supabase
    .from("order_items")
    .select("id")
    .eq("product_id", id)
    .limit(1);

  if (refErr) throw refErr;

  if (orderRefs && orderRefs.length > 0) {
    // Preserve financial history by soft-deleting / archiving
    await updateProduct(id, { is_active: false });
    return { actionTaken: "archived" };
  }

  // Safe to delete physically if never ordered
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;

  try {
    const { data: user } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      actor_id: user?.user?.id ?? null,
      actor_email: user?.user?.email ?? null,
      action: "DELETE_PRODUCT",
      entity_type: "products",
      entity_id: String(id),
    });
  } catch (logErr) {
    console.warn("Audit logging skipped:", logErr);
  }

  return { actionTaken: "deleted" };
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

  const { data: prods, error: pErr } = await supabase.from("products").select("category_id");

  if (pErr) throw pErr;

  const counts: Record<number, number> = {};
  for (const p of prods || []) {
    counts[p.category_id] = (counts[p.category_id] || 0) + 1;
  }

  return (cats || []).map((c) => ({
    ...c,
    product_count: counts[c.id] || 0,
  }));
}

export async function createCategory(
  name: string,
): Promise<Database["public"]["Tables"]["categories"]["Row"]> {
  const cleanName = name.trim().toLowerCase();
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: cleanName, is_active: true })
    .select()
    .single();

  if (error) throw error;

  try {
    const { data: user } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      actor_id: user?.user?.id ?? null,
      actor_email: user?.user?.email ?? null,
      action: "CREATE_CATEGORY",
      entity_type: "categories",
      entity_id: String(data.id),
      metadata: { name: cleanName },
    });
  } catch (logErr) {
    console.warn("Audit logging skipped:", logErr);
  }

  return data;
}

export async function updateCategory(id: number, name: string): Promise<void> {
  const cleanName = name.trim().toLowerCase();
  const { error } = await supabase.from("categories").update({ name: cleanName }).eq("id", id);

  if (error) throw error;

  try {
    const { data: user } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      actor_id: user?.user?.id ?? null,
      actor_email: user?.user?.email ?? null,
      action: "UPDATE_CATEGORY",
      entity_type: "categories",
      entity_id: String(id),
      metadata: { name: cleanName },
    });
  } catch (logErr) {
    console.warn("Audit logging skipped:", logErr);
  }
}

// ------------------------------------------------------------------------------
// INVENTORY MANAGEMENT
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
  } catch (logErr) {
    console.warn("Inventory logging skipped:", logErr);
  }
}

export async function fetchInventoryLogs(
  productId?: number,
  limit = 50,
): Promise<InventoryLogWithProduct[]> {
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
}

// ------------------------------------------------------------------------------
// AUDIT LOGS
// ------------------------------------------------------------------------------

export async function fetchAuditLogs(
  limit = 100,
): Promise<Database["public"]["Tables"]["audit_logs"]["Row"][]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data || [];
}

// ------------------------------------------------------------------------------
// STORAGE / MEDIA MANAGEMENT
// ------------------------------------------------------------------------------

export async function uploadStickerAsset(
  file: File,
  categoryFolder = "custom",
): Promise<{ publicUrl: string; filePath: string }> {
  // Restrict mime types
  const validMimes = ["image/webp", "image/png", "image/jpeg", "image/svg+xml"];
  if (!validMimes.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}. Allowed formats: WEBP, PNG, JPEG, SVG`);
  }

  // Max size 5MB
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File exceeds 5MB limit.");
  }

  const cleanExt = file.name.split(".").pop()?.toLowerCase() || "webp";
  const randomSlug = Math.random().toString(36).substring(2, 9);
  const cleanBaseName = file.name
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-|-$/g, "");

  const cleanFolder = categoryFolder.toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
  const filePath = `${cleanFolder}/${cleanBaseName}-${randomSlug}.${cleanExt}`;

  const { error: uploadError } = await supabase.storage.from("stickers").upload(filePath, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from("stickers").getPublicUrl(filePath);

  return {
    publicUrl: urlData.publicUrl,
    filePath,
  };
}
