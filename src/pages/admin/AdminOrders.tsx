import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  ShoppingBag,
  Search,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Package,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Scissors,
  CheckSquare,
  Square,
  MinusSquare,
  AlertCircle,
  Check,
  X,
} from "lucide-react";
import {
  fetchOrders,
  fetchOrderDetails,
  updateOrderStatus,
  updateMultipleOrdersStatus,
  type OrderStatus,
  type AdminOrder,
} from "@/lib/admin-api";
import {
  ORDER_STATUS_CONFIG,
  toKenyanWhatsAppUrl,
  formatKenyanPhone,
} from "@/lib/order-utils";
import { formatPrice, activeTier } from "@/lib/pricing";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TABS: { value: string; label: string; countKey?: OrderStatus }[] = [
  { value: "ALL", label: "All Orders" },
  { value: "pending", label: "Needs Call" },
  { value: "confirmed", label: "Ready for Cut" },
  { value: "processing", label: "Cutting & Packing" },
  { value: "out_for_delivery", label: "With Courier" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Selected order for detail modal
  const selectedOrderId = searchParams.get("view");

  // Multi-selection state for batch cutting & bulk fulfillment
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const lastSelectedIndexRef = useRef<number | null>(null);

  // Fetch orders with current filter, search, page
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "orders", { statusFilter, search, page, pageSize }],
    queryFn: () => fetchOrders({ status: statusFilter, search, page, pageSize }),
  });

  // Fetch single active order detail for modal
  const { data: activeOrder, isLoading: activeLoading } = useQuery({
    queryKey: ["admin", "order-detail", selectedOrderId],
    queryFn: () => (selectedOrderId ? fetchOrderDetails(selectedOrderId) : null),
    enabled: Boolean(selectedOrderId),
  });

  // Clear batch selection when filter or page changes
  useEffect(() => {
    setSelectedOrderIds([]);
    lastSelectedIndexRef.current = null;
  }, [statusFilter, page, search]);

  // ---------------------------------------------------------------------------
  // REALTIME SYNC (Wildcard INSERT + UPDATE listeners)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        async (payload) => {
          const newOrder = payload.new as { id: string; customer_name: string; delivery_place: string };

          // Fetch full relation with items for caching
          const { data: hydrated } = await supabase
            .from("orders")
            .select("*, order_items(*, products(*))")
            .eq("id", newOrder.id)
            .single();

          if (hydrated) {
            queryClient.setQueryData(
              ["admin", "orders", { statusFilter, search, page, pageSize }],
              (old: { orders: AdminOrder[]; totalCount: number } | undefined) => {
                if (!old) return old;
                // Only prepend if status matches current tab filter or viewing ALL
                if (statusFilter === "ALL" || statusFilter === hydrated.status) {
                  const filtered = old.orders.filter((o) => o.id !== hydrated.id);
                  return {
                    orders: [hydrated as unknown as AdminOrder, ...filtered].slice(0, pageSize),
                    totalCount: old.totalCount + 1,
                  };
                }
                return { ...old, totalCount: old.totalCount + 1 };
              },
            );

            // Invalidate overview stats quietly
            queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });

            toast.info(`New Order #${hydrated.id.slice(0, 8)}`, {
              description: `${hydrated.customer_name} • ${hydrated.delivery_place}`,
              action: {
                label: "Review",
                onClick: () => setSearchParams({ view: String(hydrated.id) }),
              },
            });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const updated = payload.new as { id: string; status: OrderStatus };

          // In-place row update inside cache
          queryClient.setQueryData(
            ["admin", "orders", { statusFilter, search, page, pageSize }],
            (old: { orders: AdminOrder[]; totalCount: number } | undefined) => {
              if (!old) return old;
              return {
                ...old,
                orders: old.orders.map((o) =>
                  o.id === updated.id ? { ...o, ...updated } : o,
                ),
              };
            },
          );

          // Update active order modal if open
          queryClient.setQueryData(["admin", "order-detail", updated.id], (old: AdminOrder | null | undefined) => {
            if (!old) return old;
            return { ...old, ...updated };
          });

          // Invalidate counts
          queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, statusFilter, search, page, pageSize, setSearchParams]);

  // ---------------------------------------------------------------------------
  // MUTATIONS (Single & Batch)
  // ---------------------------------------------------------------------------
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
      notes,
    }: {
      orderId: string;
      status: OrderStatus;
      notes?: string;
    }) => {
      await updateOrderStatus(orderId, status, notes);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "order-detail", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success(`Order moved to ${ORDER_STATUS_CONFIG[variables.status]?.label || variables.status}`);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to update order status";
      toast.error(message);
    },
  });

  const batchStatusMutation = useMutation({
    mutationFn: async ({
      orderIds,
      newStatus,
    }: {
      orderIds: string[];
      newStatus: OrderStatus;
    }) => {
      await updateMultipleOrdersStatus(orderIds, newStatus);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success(
        `${variables.orderIds.length} orders updated to ${ORDER_STATUS_CONFIG[variables.newStatus]?.label || variables.newStatus}`,
      );
      setSelectedOrderIds([]);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Batch update failed";
      toast.error(message);
    },
  });

  const handleStatusChange = (newStatus: OrderStatus, orderId = selectedOrderId) => {
    if (!orderId) return;
    if (newStatus === "cancelled") {
      if (!confirm("Are you sure you want to cancel this order?")) {
        return;
      }
    }
    updateStatusMutation.mutate({ orderId, status: newStatus });
  };

  // ---------------------------------------------------------------------------
  // SELECTION HELPERS (Shift-click range & toggle)
  // ---------------------------------------------------------------------------
  const ordersList = data?.orders || [];
  const allCurrentPageSelected =
    ordersList.length > 0 && ordersList.every((o) => selectedOrderIds.includes(o.id));
  const someSelected = selectedOrderIds.length > 0;

  const handleToggleSelectAll = () => {
    if (allCurrentPageSelected) {
      // Deselect current page items
      const currentPageIds = new Set(ordersList.map((o) => o.id));
      setSelectedOrderIds((prev) => prev.filter((id) => !currentPageIds.has(id)));
    } else {
      // Select all on current page
      const combined = Array.from(new Set([...selectedOrderIds, ...ordersList.map((o) => o.id)]));
      setSelectedOrderIds(combined);
    }
  };

  const handleRowCheckbox = (id: string, index: number, event: React.MouseEvent) => {
    event.stopPropagation();

    if (event.shiftKey && lastSelectedIndexRef.current !== null) {
      // Range selection
      const start = Math.min(lastSelectedIndexRef.current, index);
      const end = Math.max(lastSelectedIndexRef.current, index);
      const rangeIds = ordersList.slice(start, end + 1).map((o) => o.id);

      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...rangeIds])));
    } else {
      // Single toggle
      setSelectedOrderIds((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
      );
      lastSelectedIndexRef.current = index;
    }
  };

  const getStatusBadge = (status: string) => {
    const s = ORDER_STATUS_CONFIG[status as OrderStatus] || {
      label: status,
      badgeStyle: "bg-white/[0.04] text-foreground border-white/[0.08]",
      dotColor: "bg-white/40",
    };
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border font-mono",
          s.badgeStyle,
        )}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.dotColor)} />
        <span>{s.label}</span>
      </span>
    );
  };

  const totalPages = Math.ceil((data?.totalCount ?? 0) / pageSize);

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Order Fulfillment</span>
            {data?.totalCount !== undefined && (
              <span className="text-xs font-mono font-medium text-muted-foreground px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]">
                {data.totalCount} total
              </span>
            )}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Voice confirmations, gang-run vinyl cutter dispatch, and delivery tracking.
          </p>
        </div>

        {/* Quick operational indicator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 rounded-md border border-white/[0.08] bg-white/[0.02] text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            Refresh Feed
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search customer, phone (+254...), area…"
            className="h-8 bg-white/[0.03] border-white/[0.08] pl-8 text-xs rounded-md text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary/50"
          />
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none text-xs">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 cursor-pointer",
                statusFilter === tab.value
                  ? "bg-white/[0.1] text-foreground border border-white/[0.15]"
                  : "bg-white/[0.02] text-muted-foreground hover:text-foreground hover:bg-white/[0.05] border border-white/[0.06]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-muted-foreground">Loading orders…</div>
        ) : isError ? (
          <div className="py-20 text-center text-xs text-rose-400 space-y-2">
            <p>Failed to load orders. Please check database connection or permissions.</p>
            <button
              onClick={() => refetch()}
              className="px-3 py-1 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs hover:bg-rose-500/20 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : ordersList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-muted-foreground text-[11px] uppercase font-medium tracking-wider bg-white/[0.01]">
                  {/* Select All Checkbox */}
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                      title={allCurrentPageSelected ? "Deselect all on page" : "Select all on page"}
                    >
                      {allCurrentPageSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : someSelected ? (
                        <MinusSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3 font-medium">Order Ref</th>
                  <th className="py-3 px-3 font-medium">Customer</th>
                  <th className="py-3 px-3 font-medium">Telephone / WhatsApp</th>
                  <th className="py-3 px-3 font-medium">Delivery Destination</th>
                  <th className="py-3 px-3 font-medium">Stickers</th>
                  <th className="py-3 px-3 font-medium">Total</th>
                  <th className="py-3 px-3 font-medium">Stage</th>
                  <th className="py-3 px-3 font-medium">Placed</th>
                  <th className="py-3 px-3 text-right font-medium">Triage / Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {ordersList.map((order, idx) => {
                  const itemCount = (order.order_items || []).reduce(
                    (acc, it) => acc + (it.quantity || 0),
                    0,
                  );
                  const isSelected = selectedOrderIds.includes(order.id);
                  const dateStr = order.created_at
                    ? new Date(order.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—";

                  // WhatsApp prefilled message
                  const waMessage = `Hi ${order.customer_name || "there"}, this is Realz Stickers regarding your order #${order.id.slice(0, 8)} (${itemCount} stickers for ${order.delivery_place}). Can we confirm your delivery details?`;
                  const waUrl = toKenyanWhatsAppUrl(order.customer_phone || "", waMessage);

                  return (
                    <tr
                      key={order.id}
                      className={cn(
                        "hover:bg-white/[0.02] transition-colors cursor-pointer",
                        isSelected && "bg-primary/[0.04]",
                      )}
                      onClick={() => setSearchParams({ view: String(order.id) })}
                    >
                      {/* Row Checkbox */}
                      <td
                        className="py-3 px-3 text-center"
                        onClick={(e) => handleRowCheckbox(order.id, idx, e)}
                      >
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 opacity-40 hover:opacity-100" />
                          )}
                        </button>
                      </td>

                      {/* Order Ref */}
                      <td className="py-3 px-3 font-mono font-medium text-foreground">
                        #{String(order.id).substring(0, 8)}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-3 font-medium text-foreground">
                        {order.customer_name || "Guest Customer"}
                      </td>

                      {/* Phone & Direct Chat Trigger */}
                      <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${order.customer_phone}`}
                            className="font-mono text-muted-foreground hover:text-foreground flex items-center gap-1"
                            title="Call customer"
                          >
                            <Phone className="w-3 h-3 text-muted-foreground/60" />
                            <span>{formatKenyanPhone(order.customer_phone || "")}</span>
                          </a>

                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white transition-colors"
                              title="Message via WhatsApp with order details"
                            >
                              <MessageCircle className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Delivery Area */}
                      <td className="py-3 px-3 text-muted-foreground truncate max-w-[160px]">
                        {order.delivery_place || "—"}
                      </td>

                      {/* Items Count */}
                      <td className="py-3 px-3 text-foreground font-mono">
                        {itemCount} units
                      </td>

                      {/* Total Price */}
                      <td className="py-3 px-3 font-mono font-medium text-foreground tabular-nums">
                        {formatPrice(Number(order.total_price || 0))}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3">{getStatusBadge(order.status || "pending")}</td>

                      {/* Placed Date */}
                      <td className="py-3 px-3 text-muted-foreground text-[11px] whitespace-nowrap">
                        {dateStr}
                      </td>

                      {/* Adaptive Row Actions */}
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1. If Pending: Prominent Confirm Button */}
                          {order.status === "pending" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange("confirmed", order.id)}
                              className="px-2.5 py-1 rounded bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:bg-blue-500 hover:text-white text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                              title="Mark phone call confirmed"
                            >
                              <Check className="w-3 h-3" />
                              <span>Confirm</span>
                            </button>
                          )}

                          {/* 2. If Confirmed: Send to Batch Cut */}
                          {order.status === "confirmed" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange("processing", order.id)}
                              className="px-2.5 py-1 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500 hover:text-white text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                              title="Send sticker artwork to vinyl plotter cut queue"
                            >
                              <Scissors className="w-3 h-3" />
                              <span>To Cutter</span>
                            </button>
                          )}

                          {/* 3. If Processing: Dispatch to Rider */}
                          {order.status === "processing" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange("out_for_delivery", order.id)}
                              className="px-2.5 py-1 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500 hover:text-white text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                              title="Hand pack to courier/rider"
                            >
                              <Truck className="w-3 h-3" />
                              <span>Dispatch</span>
                            </button>
                          )}

                          {/* 4. If Out for delivery: Mark Delivered */}
                          {order.status === "out_for_delivery" && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange("delivered", order.id)}
                              className="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500 hover:text-white text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                              title="Mark received & settled"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>Delivered</span>
                            </button>
                          )}

                          {/* General Review Drill-down */}
                          <button
                            type="button"
                            onClick={() => setSearchParams({ view: String(order.id) })}
                            className="rounded border border-white/[0.08] bg-white/[0.02] px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors cursor-pointer"
                          >
                            Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
            <h3 className="text-xs font-semibold text-foreground">No orders match your filter</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              New customer orders will automatically appear here in real time.
            </p>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2 bg-white/[0.01]">
            <span className="text-xs text-muted-foreground font-mono">
              Page {page} of {totalPages} ({data?.totalCount} total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="grid h-7 w-7 place-items-center rounded-md border border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.06] disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="grid h-7 w-7 place-items-center rounded-md border border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.06] disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* FLOATING BATCH ACTION BAR (Shown when items are checked)             */}
      {/* --------------------------------------------------------------------- */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/[0.12] bg-[#0c0d18] shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4 duration-150">
          <span className="text-xs font-mono font-medium text-foreground bg-white/[0.08] px-2 py-0.5 rounded">
            {selectedOrderIds.length} selected
          </span>

          <div className="h-4 w-px bg-white/[0.1]" />

          {/* Contextual Batch Actions */}
          {(statusFilter === "ALL" || statusFilter === "pending") && (
            <button
              onClick={() =>
                batchStatusMutation.mutate({
                  orderIds: selectedOrderIds,
                  newStatus: "confirmed",
                })
              }
              disabled={batchStatusMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500 hover:text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirm All Calls</span>
            </button>
          )}

          {(statusFilter === "ALL" || statusFilter === "confirmed") && (
            <button
              onClick={() =>
                batchStatusMutation.mutate({
                  orderIds: selectedOrderIds,
                  newStatus: "processing",
                })
              }
              disabled={batchStatusMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500 hover:text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Send to Batch Cut</span>
            </button>
          )}

          {(statusFilter === "ALL" || statusFilter === "processing") && (
            <button
              onClick={() =>
                batchStatusMutation.mutate({
                  orderIds: selectedOrderIds,
                  newStatus: "out_for_delivery",
                })
              }
              disabled={batchStatusMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500 hover:text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Dispatch with Courier</span>
            </button>
          )}

          <div className="h-4 w-px bg-white/[0.1]" />

          <button
            onClick={() => setSelectedOrderIds([])}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors cursor-pointer"
            title="Clear selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* ORDER DETAIL MODAL                                                    */}
      {/* --------------------------------------------------------------------- */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-white/[0.1] bg-[#0c0d18] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5 bg-[#0e0f1b]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Order Slip
                </span>
                <h2 className="text-base font-semibold text-foreground font-mono">
                  #{String(selectedOrderId).substring(0, 13)}
                </h2>
              </div>
              <button
                onClick={() => setSearchParams({})}
                className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {activeLoading ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Fetching order breakdown…
                </div>
              ) : activeOrder ? (
                <>
                  {/* Status Banner & Action Controls */}
                  <div className="rounded-lg border border-white/[0.06] bg-[#0e0f1b] p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Current Stage
                      </p>
                      <div className="mt-1">{getStatusBadge(activeOrder.status || "pending")}</div>
                    </div>

                    {/* Status Action Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {activeOrder.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleStatusChange("confirmed", activeOrder.id)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-500 hover:text-white transition-colors cursor-pointer"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>Confirm Call</span>
                          </button>
                          <button
                            onClick={() => handleStatusChange("cancelled", activeOrder.id)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-rose-500/20 border border-rose-500/30 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Cancel</span>
                          </button>
                        </>
                      )}

                      {activeOrder.status === "confirmed" && (
                        <button
                          onClick={() => handleStatusChange("processing", activeOrder.id)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500 hover:text-white transition-colors cursor-pointer"
                        >
                          <Scissors className="h-3.5 w-3.5" />
                          <span>Queue for Vinyl Cutter</span>
                        </button>
                      )}

                      {activeOrder.status === "processing" && (
                        <button
                          onClick={() => handleStatusChange("out_for_delivery", activeOrder.id)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-purple-500/20 border border-purple-500/30 px-3 py-1.5 text-xs font-medium text-purple-300 hover:bg-purple-500 hover:text-white transition-colors cursor-pointer"
                        >
                          <Truck className="h-3.5 w-3.5" />
                          <span>Dispatch with Courier</span>
                        </button>
                      )}

                      {activeOrder.status === "out_for_delivery" && (
                        <button
                          onClick={() => handleStatusChange("delivered", activeOrder.id)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Mark Delivered</span>
                        </button>
                      )}

                      {activeOrder.status !== "delivered" &&
                        activeOrder.status !== "cancelled" &&
                        activeOrder.status !== "pending" && (
                          <button
                            onClick={() => handleStatusChange("cancelled", activeOrder.id)}
                            className="rounded-md border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                    </div>
                  </div>

                  {/* Customer Contact & Delivery Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-white/[0.06] bg-[#0e0f1b] p-3.5 space-y-2">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Customer
                      </p>
                      <h4 className="text-sm font-semibold text-foreground">
                        {activeOrder.customer_name || "Guest Customer"}
                      </h4>
                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={`tel:${activeOrder.customer_phone}`}
                          className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.03] border border-white/[0.08] px-2.5 py-1 text-xs font-medium text-foreground hover:bg-white/[0.06] transition-colors"
                        >
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{formatKenyanPhone(activeOrder.customer_phone || "")}</span>
                        </a>

                        {(() => {
                          const totalUnits = (activeOrder.order_items || []).reduce(
                            (acc, it) => acc + (it.quantity || 0),
                            0,
                          );
                          const waUrl = toKenyanWhatsAppUrl(
                            activeOrder.customer_phone || "",
                            `Hi ${activeOrder.customer_name || "there"}, this is Realz Stickers regarding your order #${activeOrder.id.slice(0, 8)} (${totalUnits} stickers for ${activeOrder.delivery_place}). Can we confirm your delivery details?`,
                          );

                          return (
                            waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors"
                              >
                                <MessageCircle className="h-3 w-3" />
                                <span>WhatsApp</span>
                              </a>
                            )
                          );
                        })()}
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/[0.06] bg-[#0e0f1b] p-3.5 space-y-2">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Delivery Destination
                      </p>
                      <div className="flex items-start gap-2 pt-0.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-xs text-foreground font-medium leading-relaxed">
                          {activeOrder.delivery_place || "—"}
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1">
                        <Clock className="h-3 w-3" />
                        <span>Submitted {activeOrder.created_at ? new Date(activeOrder.created_at).toLocaleString() : "—"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Order Line Items & Tier Pricing */}
                  <div>
                    {(() => {
                      const totalUnits = (activeOrder.order_items || []).reduce(
                        (acc, it) => acc + (it.quantity || 0),
                        0,
                      );
                      const tier = activeTier(totalUnits);
                      const avgUnit =
                        totalUnits > 0
                          ? Number(activeOrder.total_price || 0) / totalUnits
                          : 0;

                      return (
                        <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/[0.04] p-3 mb-3 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] font-medium uppercase tracking-wider text-indigo-400 font-mono">
                              Pricing Tier Applied
                            </span>
                            <h5 className="text-xs font-semibold text-foreground">
                              Tier {tier.label} ({tier.description})
                            </h5>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Across {totalUnits} total stickers in this order
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground font-mono">
                              Avg Unit Price
                            </span>
                            <p className="text-sm font-mono font-semibold text-primary">
                              {formatPrice(avgUnit)}
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Stickers to Cut ({activeOrder.order_items?.length || 0} artwork items)
                    </h4>
                    <div className="rounded-lg border border-white/[0.06] divide-y divide-white/[0.04] overflow-hidden bg-[#0e0f1b]">
                      {activeOrder.order_items?.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-3">
                            {item.product_image_url || item.products?.image_url ? (
                              <img
                                src={item.product_image_url || item.products?.image_url || ""}
                                alt={item.product_title || item.products?.title || "Sticker"}
                                className="h-10 w-10 rounded-md object-contain bg-[#070810] p-1 border border-white/[0.04]"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-md bg-white/[0.03] grid place-items-center text-[10px] text-muted-foreground">
                                No Pic
                              </div>
                            )}
                            <div>
                              <h5 className="text-xs font-medium text-foreground">
                                {item.product_title || item.products?.title || `Sticker #${item.product_id}`}
                              </h5>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {item.quantity || 1} units @ {formatPrice(Number(item.unit_price || 0))}
                              </p>
                            </div>
                          </div>

                          <span className="font-mono text-xs font-semibold text-foreground tabular-nums">
                            {formatPrice((item.quantity || 1) * Number(item.unit_price || 0))}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Financial Summary */}
                    <div className="mt-3 rounded-lg border border-white/[0.06] bg-[#070810] p-3 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Order Total
                      </span>
                      <span className="text-base font-bold text-foreground font-mono tabular-nums">
                        {formatPrice(Number(activeOrder.total_price || 0))}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-xs text-rose-400">Order not found.</div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-white/[0.06] px-5 py-2.5 bg-[#0e0f1b] flex justify-end">
              <button
                onClick={() => setSearchParams({})}
                className="rounded-md border border-white/[0.08] bg-white/[0.02] px-4 py-1.5 text-xs font-medium text-foreground hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
