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
} from "lucide-react";
import {
  fetchAdminStats,
  fetchRecentOrders,
  fetchSalesTrends,
  ORDER_STATUSES,
} from "@/lib/admin-api";
import { formatPrice } from "@/lib/pricing";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

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
            Real-time telemetry, orders ingestion, catalogue availability, and fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/products?create=true"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-black uppercase tracking-wider text-primary-foreground shadow-[0_0_15px_oklch(0.58_0.25_285/0.4)] hover:scale-[1.02] transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Sticker</span>
          </Link>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-foreground hover:bg-white/[0.08] transition-colors"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Manage Orders</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Total Revenue
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
              {statsLoading ? "—" : formatPrice(stats?.totalRevenue ?? 0)}
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              From confirmed & fulfilled orders
            </p>
          </div>
        </div>

        {/* Orders Awaiting Action */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-5 shadow-lg">
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
            <p className="mt-1 text-[11px] text-muted-foreground">
              Pending phone verification calls
            </p>
          </div>
        </div>

        {/* Total Volume */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Total Orders
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-foreground">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
              {statsLoading ? "—" : stats?.totalOrders}
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {statsLoading ? "—" : `${stats?.deliveredOrders} completed deliveries`}
            </p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Stock Warnings
            </span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-rose-500/10 text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
              {statsLoading ? "—" : stats?.lowStockProducts}
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Products with &lt; 15 units remaining
            </p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-foreground">Revenue Dynamics (KSh)</h3>
            <p className="text-xs text-muted-foreground">Daily gross order volume trajectory</p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
            Authoritative Ledger
          </span>
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

      {/* Recent Orders Section */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-foreground">Recent Order Submissions</h3>
            <p className="text-xs text-muted-foreground">Latest incoming customer selections</p>
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
                  <th className="pb-3">Phone</th>
                  <th className="pb-3">Delivery Area</th>
                  <th className="pb-3">Items</th>
                  <th className="pb-3">Total</th>
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
                      <td className="py-3.5 font-black text-primary tabular-nums">
                        {formatPrice(Number(o.total_price))}
                      </td>
                      <td className="py-3.5">{getStatusBadge(o.status)}</td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => navigate(`/admin/orders?view=${o.id}`)}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.1] bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold text-muted-foreground hover:bg-white/[0.08] hover:text-foreground transition-colors cursor-pointer"
                        >
                          Details
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
