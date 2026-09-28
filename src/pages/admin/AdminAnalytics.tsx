import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  DollarSign,
  BarChart3,
  ExternalLink,
  Layers,
  Info,
  CheckCircle2,
  Building2,
  KeyRound,
  Search,
  Copy,
  Check,
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
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminAnalytics() {
  const [activeTab, setActiveTab] = useState<"native" | "powerbi">("native");
  const [leaderboardSearch, setLeaderboardSearch] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const { data: financials, isLoading: finLoading } = useQuery({
    queryKey: ["admin-executive-financials"],
    queryFn: fetchExecutiveFinancials,
    refetchInterval: 60_000,
  });

  const { data: leaderboard = [], isLoading: leadLoading } = useQuery({
    queryKey: ["admin-product-performance"],
    queryFn: fetchProductPerformanceLeaderboard,
    refetchInterval: 60_000,
  });

  const { data: trends = [] } = useQuery({
    queryKey: ["admin-sales-trends"],
    queryFn: fetchSalesTrends,
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Filtered leaderboard
  const filteredLeaderboard = useMemo(() => {
    if (!leaderboardSearch.trim()) return leaderboard;
    const q = leaderboardSearch.trim().toLowerCase();
    return leaderboard.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q),
    );
  }, [leaderboard, leaderboardSearch]);

  const hasAnySales = useMemo(
    () => leaderboard.some((item) => item.unitsSold > 0),
    [leaderboard],
  );

  const powerBiEmbedUrl = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_POWER_BI_EMBED_URL;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span>Commercial Analytics &amp; BI</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Revenue telemetry, gross margin yield, and product velocity.
          </p>
        </div>

        {/* Tab switcher between Native Intelligence and Power BI */}
        <div className="flex items-center gap-1.5 border-b border-white/[0.06] pb-2 sm:pb-0 sm:border-b-0">
          <button
            onClick={() => setActiveTab("native")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5",
              activeTab === "native"
                ? "bg-white/[0.08] text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
            )}
          >
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span>Operational Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab("powerbi")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5",
              activeTab === "powerbi"
                ? "bg-white/[0.08] text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Gross Revenue */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Gross Revenue
              </span>
              <div className="mt-2.5">
                <h3 className="text-2xl font-bold text-foreground font-mono tabular-nums">
                  {finLoading ? "—" : formatPrice(financials?.totalRevenue ?? 0)}
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  From {financials?.totalOrders ?? 0} customer orders
                </p>
              </div>
            </div>

            {/* Estimated COGS */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Cost of Goods Sold (COGS)
              </span>
              <div className="mt-2.5">
                <h3 className="text-2xl font-bold text-muted-foreground font-mono tabular-nums">
                  {finLoading ? "—" : formatPrice(financials?.totalCogs ?? 0)}
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  ~6.00 KSh per vinyl sticker gang-run
                </p>
              </div>
            </div>

            {/* Gross Profit & Margin */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Gross Profit &amp; Margin
              </span>
              <div className="mt-2.5">
                <h3 className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
                  {finLoading ? "—" : formatPrice(financials?.totalGrossProfit ?? 0)}
                </h3>
                <p className="mt-1 text-[11px] font-medium text-emerald-400">
                  {finLoading ? "—" : `${financials?.grossMarginPercentage}% Gross Margin`}
                </p>
              </div>
            </div>

            {/* Total Stickers Sold */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Units Sold
              </span>
              <div className="mt-2.5">
                <h3 className="text-2xl font-bold text-foreground font-mono tabular-nums">
                  {finLoading ? "—" : financials?.totalStickersSold}
                </h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Avg order:{" "}
                  {financials && financials.totalOrders > 0
                    ? Math.round(financials.totalStickersSold / financials.totalOrders)
                    : 0}{" "}
                  stickers
                </p>
              </div>
            </div>
          </div>

          {/* Revenue Trajectory Chart */}
          <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Sales Dynamics Trajectory</h3>
                <p className="text-[11px] text-muted-foreground">Realized revenue timeline across confirmed orders</p>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                KES
              </span>
            </div>

            <div className="h-64 w-full min-h-[240px]">
              {trends && trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.58 0.25 285)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="oklch(0.58 0.25 285)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      stroke="rgba(255,255,255,0.2)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.2)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0c0d18",
                        borderColor: "rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        fontSize: "11px",
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
                <div className="h-full w-full flex flex-col items-center justify-center text-xs text-muted-foreground border border-dashed border-white/[0.06] rounded-lg">
                  <BarChart3 className="h-8 w-8 opacity-30 mb-2" />
                  <span>No completed orders recorded yet to chart revenue dynamics.</span>
                </div>
              )}
            </div>
          </div>

          {/* Product Velocity Leaderboard */}
          <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] overflow-hidden">
            <div className="p-4 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span>Product Velocity Leaderboard</span>
                  {!hasAnySales && (
                    <span className="text-[10px] text-muted-foreground/60 font-normal">
                      (No sales recorded yet across catalogue)
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Top performing stickers ranked by customer order volume and gross return
                </p>
              </div>

              {/* Inline Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Filter stickers..."
                  value={leaderboardSearch}
                  onChange={(e) => setLeaderboardSearch(e.target.value)}
                  className="bg-[#090a13] border-white/[0.08] text-xs h-7.5 pl-8 text-foreground placeholder:text-muted-foreground/60 rounded-md"
                />
              </div>
            </div>

            {leadLoading ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                Loading product velocity leaderboard…
              </div>
            ) : filteredLeaderboard.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-muted-foreground text-[10px] uppercase font-semibold tracking-wider bg-white/[0.01]">
                      <th className="py-2.5 px-3.5">Rank</th>
                      <th className="py-2.5 px-3.5">Sticker Title</th>
                      <th className="py-2.5 px-3.5">Category</th>
                      <th className="py-2.5 px-3.5">Units Sold</th>
                      <th className="py-2.5 px-3.5">Gross Revenue</th>
                      <th className="py-2.5 px-3.5">Est. Profit</th>
                      <th className="py-2.5 px-3.5">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredLeaderboard.slice(0, 20).map((item, idx) => (
                      <tr key={item.productId} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3.5 font-mono text-muted-foreground">
                          {item.unitsSold > 0 ? (
                            `#${idx + 1}`
                          ) : (
                            <span className="text-muted-foreground/40 font-mono">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 font-semibold text-foreground">
                          {item.title}
                        </td>
                        <td className="py-2.5 px-3.5 text-muted-foreground text-[11px]">
                          {item.categoryName}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-foreground tabular-nums">
                          {item.unitsSold} units
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-foreground tabular-nums">
                          {formatPrice(item.revenue)}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-emerald-400 tabular-nums">
                          {formatPrice(item.grossProfit)}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-muted-foreground tabular-nums">
                          {item.stock} in stock
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-muted-foreground">
                {leaderboardSearch ? "No stickers matching your filter." : "No product transactions recorded yet."}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Power BI Embedded Architecture Tab */
        <div className="space-y-5">
          {powerBiEmbedUrl ? (
            /* Live Embedded Report Frame */
            <div className="rounded-xl border border-white/[0.08] bg-[#0c0d18] overflow-hidden shadow-xl">
              <div className="p-3.5 border-b border-white/[0.06] flex items-center justify-between bg-[#090a13]">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    Power BI Embedded Service Report
                  </span>
                </div>
                <a
                  href={powerBiEmbedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  <span>Open in Power BI</span>
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
            <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Power BI Embedded Workspace
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    PostgreSQL views and telemetry schemas prepared for direct Power BI Desktop and Service synchronization.
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Analytical Schema Deployed</span>
                </div>
              </div>

              {/* Ready SQL Views Matrix */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pre-Computed SQL Analytical Views (Supabase PostgreSQL)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                  {[
                    {
                      view: "public.view_analytics_daily_sales",
                      desc: "Daily gross revenue, COGS, units sold, and average order value.",
                    },
                    {
                      view: "public.view_analytics_product_performance",
                      desc: "Product velocity, turnover rate, individual gross profits, and stock levels.",
                    },
                    {
                      view: "public.view_analytics_category_performance",
                      desc: "Sales breakdown by collection taxonomy and catalog coverage.",
                    },
                    {
                      view: "public.view_analytics_financial_summary",
                      desc: "High-level executive financial statement, margin %, and fulfillment metrics.",
                    },
                  ].map((v) => (
                    <div
                      key={v.view}
                      className="rounded-lg border border-white/[0.06] bg-black/20 p-3 flex flex-col justify-between gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {v.view}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(v.view, v.view)}
                          className="p-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="Copy view name"
                        >
                          {copiedText === v.view ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{v.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Power BI Configuration Guide */}
              <div className="rounded-lg border border-white/[0.06] bg-black/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  <span>Connecting Power BI to Realz Supabase:</span>
                </div>

                <ol className="list-decimal list-inside space-y-2 text-xs text-muted-foreground leading-relaxed">
                  <li>
                    In Power BI Desktop, select <strong>Get Data &gt; PostgreSQL Database</strong>.
                  </li>
                  <li className="flex items-center gap-2 flex-wrap">
                    <span>Server host:</span>
                    <code className="rounded bg-black/60 px-2 py-0.5 text-primary font-mono text-[11px] border border-white/[0.08]">
                      db.lmwlxnjcoupqzuewpmbk.supabase.co:5432
                    </code>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy("db.lmwlxnjcoupqzuewpmbk.supabase.co:5432", "Server Host")
                      }
                      className="p-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </li>
                  <li>
                    Import the <code className="font-mono text-foreground text-[11px]">view_analytics_*</code> views above into your data model.
                  </li>
                  <li>
                    Publish the report to Power BI Service and set <code className="font-mono text-foreground text-[11px]">VITE_POWER_BI_EMBED_URL</code> in your environment to render it directly here.
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
