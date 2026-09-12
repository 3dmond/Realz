import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  ShoppingBag,
  Search,
  Filter,
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
} from "lucide-react";
import {
  fetchOrders,
  fetchOrderDetails,
  updateOrderStatus,
  ORDER_STATUSES,
  type OrderStatus,
  type AdminOrder,
} from "@/lib/admin-api";
import { formatPrice } from "@/lib/pricing";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Selected order for detail modal
  const selectedOrderId = searchParams.get("view");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "orders", { statusFilter, search, page }],
    queryFn: () => fetchOrders({ status: statusFilter, search, page, pageSize }),
  });

  const { data: activeOrder, isLoading: activeLoading } = useQuery({
    queryKey: ["admin", "order-detail", selectedOrderId],
    queryFn: () => (selectedOrderId ? fetchOrderDetails(selectedOrderId) : null),
    enabled: Boolean(selectedOrderId),
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "order-detail", selectedOrderId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("Order status updated");
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to update order status";
      toast.error(message);
    },
  });

  const handleStatusChange = (newStatus: OrderStatus) => {
    if (!selectedOrderId) return;
    if (newStatus === "cancelled") {
      if (
        !confirm(
          "Are you sure you want to cancel this order? Any deducted inventory will be restored to stock.",
        )
      ) {
        return;
      }
    }
    updateStatusMutation.mutate({ orderId: selectedOrderId, status: newStatus });
  };

  const getStatusBadge = (status: string) => {
    const s = ORDER_STATUSES.find((item) => item.value === status) || {
      label: status,
      color: "bg-white/10 text-white border-white/20",
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${s.color}`}
      >
        {s.label}
      </span>
    );
  };

  const totalPages = Math.ceil((data?.totalCount ?? 0) / pageSize);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Order Fulfillment
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track customer requests, confirm telephone details, and dispatch sticker packs.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by customer name, phone, area…"
            className="h-10 bg-white/[0.04] border-white/[0.1] pl-9 text-xs rounded-xl text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary"
          />
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => {
              setStatusFilter("ALL");
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-primary text-primary-foreground shadow-[0_0_12px_oklch(0.58_0.25_285/0.4)]"
                : "bg-white/[0.03] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground"
            }`}
          >
            All Orders
          </button>
          {ORDER_STATUSES.map((st) => (
            <button
              key={st.value}
              onClick={() => {
                setStatusFilter(st.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                statusFilter === st.value
                  ? "bg-primary text-primary-foreground shadow-[0_0_12px_oklch(0.58_0.25_285/0.4)]"
                  : "bg-white/[0.03] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-muted-foreground">Loading orders…</div>
        ) : isError ? (
          <div className="py-20 text-center text-xs text-rose-400">
            Failed to load orders. Please check database permissions.
          </div>
        ) : data?.orders && data.orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                  <th className="py-3.5 px-4">Order Ref</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Telephone</th>
                  <th className="py-3.5 px-4">Delivery Area</th>
                  <th className="py-3.5 px-4">Items Count</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Current Status</th>
                  <th className="py-3.5 px-4">Placed Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {data.orders.map((order) => {
                  const itemCount = (order.order_items || []).reduce(
                    (acc, it) => acc + it.quantity,
                    0,
                  );
                  const dateStr = new Date(order.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => setSearchParams({ view: order.id })}
                    >
                      <td className="py-4 px-4 font-mono font-bold text-foreground">
                        #{order.id.substring(0, 8)}
                      </td>
                      <td className="py-4 px-4 font-bold text-foreground">{order.customer_name}</td>
                      <td className="py-4 px-4 font-mono text-muted-foreground">
                        {order.customer_phone}
                      </td>
                      <td className="py-4 px-4 text-muted-foreground truncate max-w-[180px]">
                        {order.delivery_place}
                      </td>
                      <td className="py-4 px-4 font-bold text-foreground">{itemCount} stickers</td>
                      <td className="py-4 px-4 font-black text-primary tabular-nums">
                        {formatPrice(Number(order.total_price))}
                      </td>
                      <td className="py-4 px-4">{getStatusBadge(order.status)}</td>
                      <td className="py-4 px-4 text-muted-foreground text-[11px]">{dateStr}</td>
                      <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSearchParams({ view: order.id })}
                          className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all cursor-pointer"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-24 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
            <h3 className="text-sm font-bold text-foreground">No orders match your criteria</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Try adjusting your search terms or filter selection.
            </p>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/[0.08] px-4 py-3 bg-white/[0.01]">
            <span className="text-xs text-muted-foreground">
              Showing page {page} of {totalPages} ({data?.totalCount} total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.1] text-muted-foreground hover:bg-white/[0.05] disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.1] text-muted-foreground hover:bg-white/[0.05] disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-white/[0.12] bg-[#0c0d18] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4 bg-white/[0.02]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Order Details
                </span>
                <h2 className="text-lg font-bold text-foreground font-mono">
                  #{selectedOrderId.substring(0, 13)}
                </h2>
              </div>
              <button
                onClick={() => setSearchParams({})}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/[0.08] hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeLoading ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Fetching order breakdown…
                </div>
              ) : activeOrder ? (
                <>
                  {/* Status Banner & Action Controls */}
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Current Status
                      </p>
                      <div className="mt-1">{getStatusBadge(activeOrder.status)}</div>
                    </div>

                    {/* Status Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      {activeOrder.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleStatusChange("confirmed")}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/20 border border-blue-500/40 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-500 hover:text-white transition-all cursor-pointer"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>Confirm Call</span>
                          </button>
                          <button
                            onClick={() => handleStatusChange("cancelled")}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Cancel Order</span>
                          </button>
                        </>
                      )}

                      {activeOrder.status === "confirmed" && (
                        <button
                          onClick={() => handleStatusChange("processing")}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-500 hover:text-white transition-all cursor-pointer"
                        >
                          <Package className="h-3.5 w-3.5" />
                          <span>Start Packing</span>
                        </button>
                      )}

                      {activeOrder.status === "processing" && (
                        <button
                          onClick={() => handleStatusChange("out_for_delivery")}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/20 border border-purple-500/40 px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500 hover:text-white transition-all cursor-pointer"
                        >
                          <Truck className="h-3.5 w-3.5" />
                          <span>Dispatch Courier</span>
                        </button>
                      )}

                      {activeOrder.status === "out_for_delivery" && (
                        <button
                          onClick={() => handleStatusChange("delivered")}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Mark Delivered</span>
                        </button>
                      )}

                      {activeOrder.status !== "delivered" &&
                        activeOrder.status !== "cancelled" &&
                        activeOrder.status !== "pending" && (
                          <button
                            onClick={() => handleStatusChange("cancelled")}
                            className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                    </div>
                  </div>

                  {/* Customer & Delivery Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Customer
                      </p>
                      <h4 className="mt-1 text-sm font-bold text-foreground">
                        {activeOrder.customer_name}
                      </h4>
                      <div className="mt-3 flex items-center gap-3">
                        <a
                          href={`tel:${activeOrder.customer_phone}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          <span>{activeOrder.customer_phone}</span>
                        </a>
                        <a
                          href={`https://wa.me/${activeOrder.customer_phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Delivery Destination
                      </p>
                      <div className="mt-2 flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-xs text-foreground font-medium leading-relaxed">
                          {activeOrder.delivery_place}
                        </p>
                      </div>
                      <p className="mt-3 text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Submitted {new Date(activeOrder.created_at).toLocaleString()}</span>
                      </p>
                    </div>
                  </div>

                  {/* Order Line Items */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      Selected Artwork Items
                    </h4>
                    <div className="rounded-xl border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden bg-white/[0.01]">
                      {activeOrder.order_items?.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3.5">
                          <div className="flex items-center gap-3">
                            {item.products?.image_url ? (
                              <img
                                src={item.products.image_url}
                                alt={item.products.title}
                                className="h-12 w-12 rounded-lg object-contain bg-black/40 p-1 border border-white/[0.08]"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-lg bg-white/5 grid place-items-center text-[10px] text-muted-foreground">
                                No Pic
                              </div>
                            )}
                            <div>
                              <h5 className="text-xs font-bold text-foreground">
                                {item.products?.title || `Product #${item.product_id}`}
                              </h5>
                              <p className="text-[10px] text-muted-foreground">
                                {item.quantity} units @ {formatPrice(Number(item.unit_price))} /
                                unit
                              </p>
                            </div>
                          </div>

                          <span className="font-mono text-xs font-black text-foreground tabular-nums">
                            {formatPrice(item.quantity * Number(item.unit_price))}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Financial Breakdown */}
                    <div className="mt-4 rounded-xl border border-white/[0.08] bg-[#090a12] p-4 flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground">
                        Authoritative Order Total
                      </span>
                      <span className="text-xl font-black text-primary tabular-nums">
                        {formatPrice(Number(activeOrder.total_price))}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-xs text-rose-400">Order not found.</div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-white/[0.08] px-6 py-3 bg-white/[0.02] flex justify-end">
              <button
                onClick={() => setSearchParams({})}
                className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-5 py-2 text-xs font-bold text-foreground hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
