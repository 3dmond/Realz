import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  TrendingUp,
  Package,
  AlertTriangle,
  Clock,
  ArrowRight,
  Boxes,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  Phone,
  BarChart3,
  ExternalLink,
  Sparkles,
  Tags,
} from "lucide-react";
import {
  fetchAdminStats,
  fetchRecentOrders,
  fetchSalesTrends,
  ORDER_STATUSES,
} from "@/lib/admin-api";
import { formatPrice } from "@/lib/pricing";
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

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchAdminStats,
    refetchInterval: 30_000,
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["admin", "recent-orders"],
    queryFn: () => fetchRecentOrders(6),
    refetchInterval: 30_000,
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ["admin", "sales-trends"],
    queryFn: fetchSalesTrends,
  });

  const getStatusBadge = (status: string) => {
    const s = ORDER_STATUSES.find((item) => item.value === status) || {
      label: status,
      color: "bg-white/10 text-white border-white/20",
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.color}`}
      >
        {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Operational Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time telemetry, incoming orders, and sticker catalogue operations.
          </p>
        </div>

        {/* Operational Quick Actions */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/products/import"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.12] bg-white/[0.04] px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-foreground hover:bg-white/[0.08] transition-all cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
            <span>Bulk Import</span>
          </Link>

          <Link
            to="/admin/products?create=true"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-black uppercase tracking-wider text-primary-foreground shadow-[0_0_15px_oklch(0.58_0.25_285/0.4)] hover:scale-[1.02] transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Sticker</span>
          </Link>
        </div>
      </div>

      {/* Operational KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Needs Confirmation (Immediate Operational Action) */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.03] p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
              Needs Confirmation
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl sm:text-3xl font-black text-amber-400 tabular-nums">
              {statsLoading ? "—" : stats?.pendingOrders}
            </h3>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">Pending phone calls</p>
              {Number(stats?.pendingOrders) > 0 && (
                <Link
                  to="/admin/orders?status=pending"
                  className="text-[10px] font-bold text-amber-400 hover:underline flex items-center gap-0.5"
                >
                  <span>Review</span>
                  <ArrowRight className="h-2.5 w-2.5" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Sticker Catalogue */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Live Stickers
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
              {statsLoading ? "—" : stats?.activeProducts}
            </h3>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                {stats?.draftProducts ?? 0} drafts staged
              </p>
              <Link
                to="/admin/products"
                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
              >
                <span>Catalogue</span>
                <ArrowRight className="h-2.5 w-2.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Fulfilled Orders */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Fulfilled Orders
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
              {statsLoading ? "—" : stats?.deliveredOrders}
            </h3>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                of {stats?.totalOrders ?? 0} total orders
              </p>
              <Link
                to="/admin/orders"
                className="text-[10px] font-bold text-emerald-400 hover:underline flex items-center gap-0.5"
              >
                <span>Orders</span>
                <ArrowRight className="h-2.5 w-2.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Total Gross Revenue */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Total Revenue (KSh)
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
              {statsLoading ? "—" : formatPrice(stats?.totalRevenue ?? 0)}
            </h3>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                {stats?.deliveredOrders ?? 0} fulfilled
              </p>
              <Link
                to="/admin/analytics"
                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
              >
                <span>Analytics</span>
                <ArrowRight className="h-2.5 w-2.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Dynamics Trajectory Chart */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-foreground">Revenue Dynamics (KSh)</h3>
            <p className="text-xs text-muted-foreground">Daily gross order volume trajectory</p>
          </div>
          <Link
            to="/admin/analytics"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Detailed BI Breakdown</span>
          </Link>
        </div>

        <div className="h-64 w-full">
          {trendsLoading ? (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
              Loading sales trend chart…
            </div>
          ) : trends && trends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.58 0.25 285)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="oklch(0.58 0.25 285)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.3)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.3)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0c0d18",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "#ffffff",
                  }}
                  formatter={(val) => [`${formatPrice(Number(val))}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="oklch(0.58 0.25 285)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#orderGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center text-xs text-muted-foreground">
              <Boxes className="h-8 w-8 opacity-40 mb-2" />
              <span>No completed orders yet to graph trends.</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders Ingestion Section */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Recent Order Ingestions</h3>
            <p className="text-xs text-muted-foreground">Latest incoming customer checkout requests</p>
          </div>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
          >
            <span>View All Orders</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {ordersLoading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Loading recent orders…
          </div>
        ) : recentOrders && recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-muted-foreground text-[10px] uppercase font-black tracking-widest">
                  <th className="pb-3">Order ID</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Telephone</th>
                  <th className="pb-3">Delivery Area</th>
                  <th className="pb-3">Pack Items</th>
                  <th className="pb-3">Gross Total</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {recentOrders.map((o) => {
                  const itemCount = (o.order_items || []).reduce((acc, it) => acc + it.quantity, 0);
                  return (
                    <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 font-mono text-[11px] text-muted-foreground">
                        #{o.id.substring(0, 8)}
                      </td>
                      <td className="py-3.5 font-bold text-foreground">{o.customer_name}</td>
                      <td className="py-3.5 font-mono text-muted-foreground">{o.customer_phone}</td>
                      <td className="py-3.5 text-muted-foreground truncate max-w-[150px]">
                        {o.delivery_place}
                      </td>
                      <td className="py-3.5 font-bold text-foreground">{itemCount} stickers</td>
                      <td className="py-3.5 font-black text-primary tabular-nums font-mono">
                        {formatPrice(Number(o.total_price))}
                      </td>
                      <td className="py-3.5">{getStatusBadge(o.status)}</td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => navigate(`/admin/orders?view=${o.id}`)}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.1] bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold text-muted-foreground hover:bg-white/[0.08] hover:text-foreground transition-colors cursor-pointer"
                        >
                          Fulfill
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-muted-foreground">
            No orders found in the database.
          </div>
        )}
      </div>
    </div>
  );
}
