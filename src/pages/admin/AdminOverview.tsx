import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Plus,
  FileSpreadsheet,
  Phone,
  MessageCircle,
  Check,
  Clock,
  Package,
  Truck,
  ExternalLink,
  Radio,
  FolderTree,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";
import {
  fetchAdminStats,
  fetchRecentOrders,
  fetchSalesTrends,
  updateOrderStatus,
  type OrderStatus,
  type AdminOrder,
} from "@/lib/admin-api";
import {
  ORDER_STATUS_CONFIG,
  toKenyanWhatsAppUrl,
  formatKenyanPhone,
} from "@/lib/order-utils";
import { formatPrice } from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";

export default function AdminOverview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchAdminStats,
    refetchInterval: 30_000,
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["admin", "recent-orders"],
    queryFn: () => fetchRecentOrders(10),
    refetchInterval: 30_000,
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["admin", "sales-trends"],
    queryFn: fetchSalesTrends,
  });

  // Realtime Supabase Channel
  useEffect(() => {
    const channel = supabase
      .channel("admin-overview-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            toast.info("New incoming order!", {
              description: `From ${payload.new?.customer_name || "Customer"} (${formatPrice(Number(payload.new?.total_price) || 0)})`,
            });
          }
          queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
          queryClient.invalidateQueries({ queryKey: ["admin", "recent-orders"] });
          queryClient.invalidateQueries({ queryKey: ["admin", "sales-trends"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // One-click confirmation mutation
  const confirmOrderMutation = useMutation({
    mutationFn: (orderId: string) => updateOrderStatus(orderId, "confirmed"),
    onSuccess: (_, orderId) => {
      toast.success("Order verified and queued for cutting");
      queryClient.setQueryData<AdminOrder[]>(
        ["admin", "recent-orders"],
        (old) => {
          if (!old) return [];
          return old.map((o) =>
            o.id === orderId ? { ...o, status: "confirmed" as OrderStatus } : o,
          );
        },
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to confirm order");
    },
  });

  // Triage categorization
  const pendingOrders = (recentOrders || []).filter((o) => o.status === "pending");
  const nonPendingOrders = (recentOrders || []).filter((o) => o.status !== "pending");

  const inProductionCount = stats?.inProductionOrders ?? 0;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Operational Overview
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Realtime Sync
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Store operations console, phone verification queue, and physical fulfillment stream.
          </p>
        </div>

        {/* Operational Quick Actions */}
        <div className="flex items-center gap-2">
          <Link
            to="/admin/products/import"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Bulk Import</span>
          </Link>

          <Link
            to="/admin/products?create=true"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary hover:bg-primary/90 px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Sticker</span>
          </Link>
        </div>
      </div>

      {/* 4-Column Operational Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Needs Confirmation (Immediate Operational Call Queue) */}
        <div
          className={cn(
            "rounded-xl border p-4 flex flex-col justify-between transition-colors",
            Number(stats?.pendingOrders) > 0
              ? "border-amber-500/40 bg-amber-500/[0.03]"
              : "border-white/[0.06] bg-[#0e0f1b]",
          )}
        >
          <div>
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-wider",
                  Number(stats?.pendingOrders) > 0
                    ? "text-amber-400"
                    : "text-muted-foreground",
                )}
              >
                Needs Confirmation
              </span>
              {Number(stats?.pendingOrders) > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ACTION
                </span>
              )}
            </div>
            <div
              className={cn(
                "mt-2 text-2xl sm:text-3xl font-bold tabular-nums",
                Number(stats?.pendingOrders) > 0
                  ? "text-amber-400"
                  : "text-foreground",
              )}
            >
              {statsLoading ? "—" : stats?.pendingOrders}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {Number(stats?.pendingOrders) === 0
                ? "All phone calls cleared"
                : "Pending customer calls"}
            </span>
            {Number(stats?.pendingOrders) > 0 ? (
              <Link
                to="/admin/orders?status=pending"
                className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>Verify</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              <Link
                to="/admin/orders"
                className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <span>Queue</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>

        {/* Metric 2: In Production & Dispatch */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-4 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Production & Courier
            </span>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
              {statsLoading ? "—" : inProductionCount}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-xs text-muted-foreground">
            <span>Ready for cut / In transit</span>
            <Link
              to="/admin/orders"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              <span>View</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Metric 3: Live Vinyl SKUs */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-4 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Live Vinyl SKUs
            </span>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
              {statsLoading ? "—" : stats?.activeProducts}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-xs text-muted-foreground">
            <span>{stats?.draftProducts ?? 0} drafts staged</span>
            <Link
              to="/admin/products"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              <span>Catalogue</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Metric 4: Realized Revenue */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-4 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Realized Revenue
            </span>
            <div className="mt-2 text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
              {statsLoading ? "—" : formatPrice(stats?.totalRevenue ?? 0)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-xs text-muted-foreground">
            <span>{stats?.deliveredOrders ?? 0} orders delivered</span>
            <Link
              to="/admin/analytics"
              className="text-xs font-medium text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Telemetry</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Asymmetric Main Section: 2/3 Triage Stream + 1/3 Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (2/3 width): Operational Order Triage Stream */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/[0.06]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Order Verification & Triage
                  </h3>
                  {pendingOrders.length > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {pendingOrders.length} Waiting Verification
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Confirm phone numbers and Nairobi delivery locations before committing vinyl to the cutters.
                </p>
              </div>

              <Link
                to="/admin/orders"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
              >
                <span>Full Orders Queue</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Stream Content */}
            {ordersLoading ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                Loading orders triage stream…
              </div>
            ) : !recentOrders || recentOrders.length === 0 ? (
              /* Restrained Minimal Zero-State (Model A Recommendation) */
              <div className="py-14 text-center">
                <div className="inline-flex p-3 rounded-full bg-white/[0.03] border border-white/[0.06] mb-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Recent Orders</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  No orders yet. New orders will appear here when customers complete checkout.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pt-4">
                {/* 1. Priority Verification Cards (Pending Orders) */}
                {pendingOrders.length > 0 ? (
                  <div className="space-y-2.5">
                    {pendingOrders.map((o) => {
                      const itemCount = (o.order_items || []).reduce(
                        (acc, it) => acc + (it.quantity || 1),
                        0,
                      );
                      const waUrl = toKenyanWhatsAppUrl(
                        o.customer_phone,
                        `Hi ${o.customer_name}, this is Realz Stickers regarding your order #${o.id.substring(0, 8)} for ${itemCount} stickers to ${o.delivery_place}. Please confirm if we should cut and dispatch your order today.`,
                      );

                      return (
                        <div
                          key={o.id}
                          className="rounded-lg border border-amber-500/30 bg-amber-500/[0.02] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-500/50 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-semibold text-amber-400">
                                #{o.id.substring(0, 8)}
                              </span>
                              <span className="text-xs font-semibold text-foreground">
                                {o.customer_name}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                • {formatKenyanPhone(o.customer_phone)}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span>
                                Area: <strong className="text-foreground">{o.delivery_place}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                {itemCount} {itemCount === 1 ? "sticker" : "stickers"}
                              </span>
                              <span>•</span>
                              <span className="font-mono font-bold text-foreground">
                                {formatPrice(Number(o.total_price))}
                              </span>
                            </div>
                          </div>

                          {/* Action Group */}
                          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                            <a
                              href={`tel:${o.customer_phone}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] text-xs font-medium text-foreground hover:bg-white/[0.08] transition-colors"
                              title="Direct Phone Call"
                            >
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="hidden sm:inline">Call</span>
                            </a>

                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                              title="WhatsApp Verification Slip"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </a>

                            <button
                              type="button"
                              onClick={() => confirmOrderMutation.mutate(o.id)}
                              disabled={confirmOrderMutation.isPending}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                              <span>Confirm Call</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Zero State when all calls are verified */
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.02] p-3 text-xs text-muted-foreground flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong className="text-foreground">All phone calls verified.</strong> No orders currently waiting in the verification triage.
                      </span>
                    </div>
                    <Link
                      to="/admin/orders"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View Active Cutting Queue →
                    </Link>
                  </div>
                )}

                {/* 2. Active Fulfillment Stream (Non-Pending Orders) */}
                {nonPendingOrders.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                      Fulfillment & Dispatch Stream
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/[0.06] text-muted-foreground text-[10px] uppercase font-semibold tracking-wider">
                            <th className="pb-2 font-medium">Order</th>
                            <th className="pb-2 font-medium">Customer</th>
                            <th className="pb-2 font-medium">Area</th>
                            <th className="pb-2 font-medium">Total</th>
                            <th className="pb-2 font-medium">Status</th>
                            <th className="pb-2 text-right font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {nonPendingOrders.slice(0, 5).map((o) => {
                            const cfg = ORDER_STATUS_CONFIG[o.status] || {
                              label: o.status,
                              color: "bg-white/[0.04] text-foreground border-white/[0.08]",
                            };

                            return (
                              <tr
                                key={o.id}
                                className="hover:bg-white/[0.02] transition-colors"
                              >
                                <td className="py-2.5 font-mono text-[11px] text-muted-foreground">
                                  #{o.id.substring(0, 8)}
                                </td>
                                <td className="py-2.5 font-medium text-foreground">
                                  {o.customer_name}
                                </td>
                                <td className="py-2.5 text-muted-foreground truncate max-w-[140px]">
                                  {o.delivery_place}
                                </td>
                                <td className="py-2.5 font-mono font-semibold text-foreground tabular-nums">
                                  {formatPrice(Number(o.total_price))}
                                </td>
                                <td className="py-2.5">
                                  <span
                                    className={cn(
                                      "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border",
                                      cfg.color,
                                    )}
                                  >
                                    {cfg.label}
                                  </span>
                                </td>
                                <td className="py-2.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/admin/orders?view=${o.id}`)}
                                    className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors cursor-pointer"
                                  >
                                    Manage
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3 width): Telemetry & Studio Health */}
        <div className="lg:col-span-4 space-y-4">
          {/* Revenue Dynamics Chart Card */}
          <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Revenue Dynamics</h3>
                <p className="text-xs text-muted-foreground">Daily realized sales trajectory</p>
              </div>
              <Link
                to="/admin/analytics"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <span>Analytics</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="h-44 w-full">
              {trendsLoading ? (
                <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                  Loading sales telemetry…
                </div>
              ) : trends && trends.length > 0 && trends.some((t) => t.revenue > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={trends}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="oklch(0.58 0.25 285)"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor="oklch(0.58 0.25 285)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      stroke="rgba(255,255,255,0.25)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.25)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#090a13",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        fontSize: "11px",
                        color: "#ffffff",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                      }}
                      formatter={(val) => [
                        `${formatPrice(Number(val))}`,
                        "Revenue",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="oklch(0.58 0.25 285)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#orderGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                /* Restrained Minimal Zero-State (Model A Recommendation) */
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground border border-dashed border-white/[0.06] rounded-lg">
                  <h4 className="text-xs font-semibold text-foreground">Revenue Dynamics</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 max-w-[220px]">
                    No completed orders yet. Revenue trends will appear here once orders are fulfilled.
                  </p>
                  <Link
                    to="/admin/orders"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2 font-medium"
                  >
                    <span>View Orders</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Studio Operational Shortcuts & Links */}
          <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-5 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Studio Quick Links
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/admin/products"
                className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-colors flex flex-col justify-between"
              >
                <Package className="h-4 w-4 text-muted-foreground mb-1.5" />
                <div>
                  <div className="text-xs font-semibold text-foreground">Stickers</div>
                  <div className="text-[10px] text-muted-foreground">
                    {stats?.activeProducts ?? 0} active
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/categories"
                className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-colors flex flex-col justify-between"
              >
                <FolderTree className="h-4 w-4 text-muted-foreground mb-1.5" />
                <div>
                  <div className="text-xs font-semibold text-foreground">Categories</div>
                  <div className="text-[10px] text-muted-foreground">
                    {stats?.totalCategories ?? 0} folders
                  </div>
                </div>
              </Link>

              <Link
                to="/admin/media"
                className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-colors flex flex-col justify-between"
              >
                <ImageIcon className="h-4 w-4 text-muted-foreground mb-1.5" />
                <div>
                  <div className="text-xs font-semibold text-foreground">Media Library</div>
                  <div className="text-[10px] text-muted-foreground">Storage bucket</div>
                </div>
              </Link>

              <Link
                to="/admin/orders?status=processing"
                className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-colors flex flex-col justify-between"
              >
                <Truck className="h-4 w-4 text-muted-foreground mb-1.5" />
                <div>
                  <div className="text-xs font-semibold text-foreground">Cutting/Transit</div>
                  <div className="text-[10px] text-muted-foreground">Active run</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
