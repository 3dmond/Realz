import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  DollarSign,
  PieChart,
  BarChart3,
  ShieldAlert,
  ExternalLink,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  RefreshCw,
  Building2,
  KeyRound,
  FileCode2,
} from "lucide-react";
import {
  fetchExecutiveFinancials,
  fetchProductPerformanceLeaderboard,
  fetchSalesTrends,
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

export default function AdminAnalytics() {
  const [activeTab, setActiveTab] = useState<"native" | "powerbi">("native");

  const { data: financials, isLoading: finLoading, refetch: refetchFin } = useQuery({
    queryKey: ["admin", "executive-financials"],
    queryFn: fetchExecutiveFinancials,
    refetchInterval: 60_000,
  });

  const { data: leaderboard, isLoading: leadLoading } = useQuery({
    queryKey: ["admin", "product-performance"],
    queryFn: fetchProductPerformanceLeaderboard,
    refetchInterval: 60_000,
  });

  const { data: trends } = useQuery({
    queryKey: ["admin", "sales-trends"],
    queryFn: fetchSalesTrends,
  });

  const powerBiEmbedUrl = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_POWER_BI_EMBED_URL;

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Business Intelligence & Analytics
            </h1>
            <span className="rounded-full bg-primary/20 border border-primary/30 px-2.5 py-0.5 text-[10px] font-black tracking-widest text-primary uppercase">
              Financial Layer
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Authoritative revenue analytics, gross profit modeling, product velocity, and Power BI integration.
          </p>
        </div>

        {/* Tab switcher between Native Intelligence and Power BI */}
        <div className="flex items-center rounded-xl border border-white/[0.08] bg-[#0f101d] p-1">
          <button
            onClick={() => setActiveTab("native")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "native"
                ? "bg-primary text-primary-foreground shadow-[0_0_10px_oklch(0.58_0.25_285/0.4)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Operational Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab("powerbi")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "powerbi"
                ? "bg-primary text-primary-foreground shadow-[0_0_10px_oklch(0.58_0.25_285/0.4)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Power BI Embedded</span>
          </button>
        </div>
      </div>

      {activeTab === "native" ? (
        <>
          {/* Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Gross Revenue */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Gross Revenue
                </span>
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl sm:text-3xl font-black text-foreground font-mono tabular-nums">
                  {finLoading ? "—" : formatPrice(financials?.totalRevenue ?? 0)}
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  From {financials?.totalOrders ?? 0} total customer orders
                </p>
              </div>
            </div>

            {/* Estimated COGS */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Cost of Goods Sold (COGS)
                </span>
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-500/10 text-slate-400">
                  <Layers className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl sm:text-3xl font-black text-muted-foreground font-mono tabular-nums">
                  {finLoading ? "—" : formatPrice(financials?.totalCogs ?? 0)}
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Estimated at ~6.00 KSh per vinyl sticker
                </p>
              </div>
            </div>

            {/* Gross Profit & Margin */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.02] p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  Gross Profit & Margin
                </span>
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tabular-nums">
                  {finLoading ? "—" : formatPrice(financials?.totalGrossProfit ?? 0)}
                </h3>
                <p className="mt-1 text-[11px] font-bold text-emerald-500">
                  {finLoading ? "—" : `${financials?.grossMarginPercentage}% Gross Margin`}
                </p>
              </div>
            </div>

            {/* Total Stickers Sold */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Stickers Sold (Units)
                </span>
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-foreground">
                  <PieChart className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl sm:text-3xl font-black text-foreground font-mono tabular-nums">
                  {finLoading ? "—" : financials?.totalStickersSold}
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Average order size:{" "}
                  {financials && financials.totalOrders > 0
                    ? Math.round(financials.totalStickersSold / financials.totalOrders)
                    : 0}{" "}
                  stickers
                </p>
              </div>
            </div>
          </div>

          {/* Financial Transparency Disclosure Banner */}
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5 flex items-start gap-3.5">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-foreground">Financial Calculation Transparency</h4>
              <p className="text-muted-foreground leading-relaxed">
                Profit figures above reflect <strong>Gross Margin</strong> calculated from sticker wholesale sale price minus unit manufacturing cost (defaults to 6.00 KSh / unit). Fixed operational overhead, shipping dispatch courier fees, and marketing customer acquisition costs are not factored here. Full P&amp;L reconciliation is supported through the <strong>Power BI</strong> analytical views.
              </p>
            </div>
          </div>

          {/* Revenue Trajectory Chart */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-foreground">Sales Dynamics Trajectory</h3>
                <p className="text-xs text-muted-foreground">Authoritative order volume over time</p>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.08]">
                Currency: KSh
              </span>
            </div>

            <div className="h-64 w-full">
              {trends && trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1">
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
                      fill="url(#finGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-xs text-muted-foreground">
                  <BarChart3 className="h-8 w-8 opacity-40 mb-2" />
                  <span>Insufficient transaction history to chart trends.</span>
                </div>
              )}
            </div>
          </div>

          {/* Product Performance Leaderboard */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] overflow-hidden shadow-lg">
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Product Velocity Leaderboard
                </h3>
                <p className="text-xs text-muted-foreground">
                  Top performing stickers ranked by customer order volume and gross return
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-muted-foreground">
                {leaderboard?.length ?? 0} Catalogued Items
              </span>
            </div>

            {leadLoading ? (
              <div className="py-20 text-center text-xs text-muted-foreground">
                Loading product velocity leaderboard…
              </div>
            ) : leaderboard && leaderboard.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-muted-foreground text-[10px] uppercase font-black tracking-widest bg-white/[0.01]">
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Sticker Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Units Sold</th>
                      <th className="py-3 px-4">Gross Revenue</th>
                      <th className="py-3 px-4">Est. Profit</th>
                      <th className="py-3 px-4">Stock on Hand</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {leaderboard.slice(0, 15).map((item, idx) => (
                      <tr key={item.productId} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-mono font-bold text-muted-foreground">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-4 font-bold text-foreground">
                          {item.title}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground uppercase text-[10px]">
                          {item.categoryName}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-primary tabular-nums">
                          {item.unitsSold} units
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-foreground tabular-nums">
                          {formatPrice(item.revenue)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400 tabular-nums">
                          {formatPrice(item.grossProfit)}
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground tabular-nums">
                          {item.stock} in stock
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-muted-foreground">
                No product transactions recorded yet.
              </div>
            )}
          </div>
        </>
      ) : (
        /* Power BI Embedded Architecture Tab */
        <div className="space-y-6">
          {powerBiEmbedUrl ? (
            /* Live Embedded Report Frame */
            <div className="rounded-3xl border border-white/[0.12] bg-[#0c0d18] overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0a0b14]">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Power BI Embedded Service Report
                  </span>
                </div>
                <a
                  href={powerBiEmbedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                >
                  <span>Open in Power BI Service</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <iframe
                title="Realz Power BI Analytics"
                src={powerBiEmbedUrl}
                className="w-full h-[750px] border-none"
                allowFullScreen
              />
            </div>
          ) : (
            /* Power BI Architectural Preparation & Blueprint Container */
            <div className="rounded-3xl border border-white/[0.1] bg-[#0f101d] p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-black text-foreground">
                      Power BI Embedded Workspace Ready
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    The backend database views and analytical data models are prepared for direct Power BI integration.
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Analytical Schema Deployed</span>
                </div>
              </div>

              {/* Ready SQL Views Matrix */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Pre-Computed SQL Analytical Views (Supabase System of Record)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-primary">
                        public.view_analytics_daily_sales
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">Ready</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Aggregated daily gross revenue, COGS, units sold, and average order value.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-primary">
                        public.view_analytics_product_performance
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">Ready</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Product velocity, turnover rate, individual gross profits, and stock levels.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-primary">
                        public.view_analytics_category_performance
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">Ready</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Sales breakdown by collection taxonomy and catalog coverage.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-primary">
                        public.view_analytics_financial_summary
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">Ready</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      High-level executive financial statement, margin %, and fulfillment metrics.
                    </p>
                  </div>
                </div>
              </div>

              {/* Power BI Configuration Guide */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0a0b14] p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <span>How to Embed Your Power BI Report in Realz Admin:</span>
                </div>

                <ol className="list-decimal list-inside space-y-2 text-xs text-muted-foreground leading-relaxed">
                  <li>
                    Connect Power BI Desktop to PostgreSQL using your Supabase database host:{" "}
                    <code className="rounded bg-black/60 px-1.5 py-0.5 text-primary font-mono text-[11px]">
                      db.lmwlxnjcoupqzuewpmbk.supabase.co:5432
                    </code>
                  </li>
                  <li>
                    Import the <code className="font-mono text-foreground">view_analytics_*</code> views above into your Power BI report model.
                  </li>
                  <li>
                    Publish the report to your Power BI Workspace and generate a secure Embed URL.
                  </li>
                  <li>
                    Add <code className="font-mono text-foreground">VITE_POWER_BI_EMBED_URL=&quot;https://app.powerbi.com/reportEmbed?...&quot;</code> to your <code className="font-mono text-foreground">.env</code> file.
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
