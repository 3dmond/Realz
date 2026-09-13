import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Boxes,
  Plus,
  Minus,
  Search,
  AlertTriangle,
  History,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  Package,
} from "lucide-react";
import {
  fetchAdminProducts,
  adjustInventory,
  fetchInventoryLogs,
  type AdminProduct,
} from "@/lib/admin-api";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminInventory() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"ALL" | "in_stock" | "low_stock" | "out_of_stock">("ALL");
  const [activeTab, setActiveTab] = useState<"stocks" | "movements">("stocks");

  // Adjustment Modal state
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [deltaInput, setDeltaInput] = useState(25);
  const [isAddition, setIsAddition] = useState(true);
  const [reasonInput, setReasonInput] = useState("Restocked from print batch");

  const { data: productData, isLoading: prodsLoading } = useQuery({
    queryKey: ["admin", "inventory-products", { search, stockFilter }],
    queryFn: () =>
      fetchAdminProducts({
        search,
        stockFilter,
        pageSize: 50,
      }),
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["admin", "inventory-logs"],
    queryFn: () => fetchInventoryLogs(),
    enabled: activeTab === "movements",
    refetchInterval: 15_000,
  });

  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) return;
      if (deltaInput <= 0) throw new Error("Adjustment quantity must be greater than 0");
      if (!reasonInput.trim()) throw new Error("A reason is required to maintain audit integrity");

      const delta = isAddition ? deltaInput : -deltaInput;
      await adjustInventory(selectedProduct.id, delta, reasonInput.trim());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory-logs"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("Inventory ledger updated successfully");
      setSelectedProduct(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to adjust stock";
      toast.error(message);
    },
  });

  const handleOpenAdjustment = (prod: AdminProduct, defaultDelta = 25, isAdd = true) => {
    setSelectedProduct(prod);
    setDeltaInput(defaultDelta);
    setIsAddition(isAdd);
    setReasonInput(isAdd ? "Restocked from print batch" : "Inventory adjustment / audit correction");
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Inventory & Stock Ledger
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time physical sticker availability, low-stock warnings, and transactional movement logs.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center rounded-xl border border-white/[0.08] bg-[#0f101d] p-1">
          <button
            onClick={() => setActiveTab("stocks")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "stocks"
                ? "bg-primary text-primary-foreground shadow-[0_0_10px_oklch(0.58_0.25_285/0.4)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Boxes className="h-3.5 w-3.5" />
            <span>Stock Levels</span>
          </button>
          <button
            onClick={() => setActiveTab("movements")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === "movements"
                ? "bg-primary text-primary-foreground shadow-[0_0_10px_oklch(0.58_0.25_285/0.4)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <History className="h-3.5 w-3.5" />
            <span>Movement Logs</span>
          </button>
        </div>
      </div>

      {activeTab === "stocks" ? (
        <>
          {/* Filter and Search Bar */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sticker title…"
                className="h-10 bg-white/[0.04] border-white/[0.1] pl-9 text-xs rounded-xl text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={stockFilter}
                onChange={(e) =>
                  setStockFilter(e.target.value as "ALL" | "in_stock" | "low_stock" | "out_of_stock")
                }
                className="h-10 rounded-xl border border-white/[0.1] bg-[#0c0d18] px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="ALL">All Stock Statuses</option>
                <option value="in_stock">In Stock (15+)</option>
                <option value="low_stock">Low Stock (&lt;15)</option>
                <option value="out_of_stock">Out of Stock (0)</option>
              </select>
            </div>
          </div>

          {/* Stocks Table */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] overflow-hidden shadow-xl">
            {prodsLoading ? (
              <div className="py-24 text-center text-xs text-muted-foreground">
                Loading stock levels…
              </div>
            ) : productData?.products && productData.products.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] bg-white/[0.02] text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                      <th className="py-3.5 px-4">Sticker Item</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Current Stock</th>
                      <th className="py-3.5 px-4">Health Status</th>
                      <th className="py-3.5 px-4 text-right">Quick Restock Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {productData.products.map((prod) => {
                      const stock = prod.stock_quantity ?? 100;

                      return (
                        <tr key={prod.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-white/[0.08] bg-black/40 p-1 flex items-center justify-center">
                                {prod.image_url ? (
                                  <img
                                    src={prod.image_url}
                                    alt={prod.title}
                                    className="h-full w-full object-contain"
                                    loading="lazy"
                                  />
                                ) : (
                                  <span className="text-[8px] text-muted-foreground">No img</span>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-foreground text-sm">{prod.title}</p>
                                <p className="text-[10px] font-mono text-muted-foreground">ID: #{prod.id}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="rounded-full bg-white/[0.05] border border-white/[0.08] px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase">
                              {prod.categories?.name || `Cat #${prod.category_id}`}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-black tabular-nums text-sm">
                            <span
                              className={cn(
                                stock <= 0
                                  ? "text-rose-400"
                                  : stock < 15
                                    ? "text-amber-400"
                                    : "text-emerald-400",
                              )}
                            >
                              {stock} units
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {stock <= 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 text-[9px] font-bold text-rose-400">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                <span>Depleted</span>
                              </span>
                            ) : stock < 15 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[9px] font-bold text-amber-400">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                <span>Low Inventory</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[9px] font-bold text-emerald-400">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                <span>Optimal</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Fast restock presets */}
                              <button
                                onClick={() => handleOpenAdjustment(prod, 25, true)}
                                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-mono font-bold text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer"
                                title="Add 25 units"
                              >
                                +25
                              </button>
                              <button
                                onClick={() => handleOpenAdjustment(prod, 50, true)}
                                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-mono font-bold text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer"
                                title="Add 50 units"
                              >
                                +50
                              </button>
                              <button
                                onClick={() => handleOpenAdjustment(prod, 10, true)}
                                className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-foreground hover:bg-white/[0.08] transition-colors cursor-pointer"
                              >
                                Adjust
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
              <div className="py-24 text-center">
                <Boxes className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
                <h3 className="text-sm font-bold text-foreground">No stock records found</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Adjust your search or filter parameters.
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Movement Logs Tab */
        <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] overflow-hidden shadow-xl">
          {logsLoading ? (
            <div className="py-24 text-center text-xs text-muted-foreground">
              Loading inventory movement ledger…
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Sticker Product</th>
                    <th className="py-3.5 px-4">Delta Movement</th>
                    <th className="py-3.5 px-4">Stock Transition</th>
                    <th className="py-3.5 px-4">Reason / Order Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {logs.map((log) => {
                    const isPositive = log.delta > 0;

                    return (
                      <tr key={log.id} className="hover:bg-white/[0.02]">
                        <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-foreground">
                          {log.products?.title || `Product #${log.product_id}`}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-black tabular-nums">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]",
                              isPositive
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/30",
                            )}
                          >
                            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            <span>{isPositive ? `+${log.delta}` : log.delta}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                          <span className="text-muted-foreground/60">{log.previous_stock}</span>
                          <span className="mx-1.5 text-foreground font-bold">→</span>
                          <span className="text-foreground font-bold">{log.new_stock}</span>
                        </td>

                        <td className="py-3.5 px-4 text-muted-foreground text-xs">
                          <span>{log.reason}</span>
                          {log.order_id && (
                            <span className="ml-2 font-mono text-[10px] text-primary">
                              (Order #{log.order_id.substring(0, 8)})
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-24 text-center">
              <History className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
              <h3 className="text-sm font-bold text-foreground">No inventory movements recorded</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Stock changes from orders or manual restocks will appear here in the ledger.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Manual Stock Adjustment Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#0c0d18] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Inventory Ledger Mutation
                </span>
                <h2 className="text-base font-bold text-foreground mt-0.5">
                  Adjust &quot;{selectedProduct.title}&quot;
                </h2>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:text-white"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                adjustMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-xs flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Current Stock on Record:</span>
                <span className="font-mono font-black text-foreground text-sm">
                  {selectedProduct.stock_quantity ?? 100} units
                </span>
              </div>

              {/* Add vs Subtract Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddition(true)}
                  className={cn(
                    "h-10 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                    isAddition
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                      : "bg-white/[0.03] border-white/[0.1] text-muted-foreground",
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Restock / Add (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddition(false)}
                  className={cn(
                    "h-10 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                    !isAddition
                      ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                      : "bg-white/[0.03] border-white/[0.1] text-muted-foreground",
                  )}
                >
                  <Minus className="h-3.5 w-3.5" />
                  <span>Deduct / Write-off (-)</span>
                </button>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Adjustment Units *
                </label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={deltaInput}
                  onChange={(e) => setDeltaInput(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1 h-11 bg-white/[0.04] border-white/[0.1] rounded-xl text-sm font-mono font-bold"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Mandatory Audit Reason *
                </label>
                <Input
                  required
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="e.g. Restock, Manual correction, Damaged write-off"
                  className="mt-1 h-11 bg-white/[0.04] border-white/[0.1] rounded-xl text-xs font-bold"
                />

                {/* Quick Preset Reason Pills */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {[
                    { label: "Restock", isAdd: true },
                    { label: "Manual correction", isAdd: true },
                    { label: "Damaged", isAdd: false },
                    { label: "Lost", isAdd: false },
                    { label: "Return", isAdd: true },
                    { label: "Sale", isAdd: false },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setReasonInput(preset.label);
                        setIsAddition(preset.isAdd);
                      }}
                      className={cn(
                        "rounded-lg px-2 py-0.5 text-[9px] font-bold border transition-colors cursor-pointer",
                        reasonInput === preset.label
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white/[0.04] text-muted-foreground border-white/[0.08] hover:text-foreground",
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl border border-white/[0.08] bg-black/40 p-3 text-xs flex items-center justify-between font-mono">
                <span className="text-muted-foreground">Anticipated Stock Result:</span>
                <span className="font-bold text-primary">
                  {Math.max(
                    0,
                    (selectedProduct.stock_quantity ?? 100) + (isAddition ? deltaInput : -deltaInput),
                  )}{" "}
                  units
                </span>
              </div>

              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-white/[0.08]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustMutation.isPending}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-black uppercase tracking-wider text-primary-foreground shadow-[0_0_15px_oklch(0.58_0.25_285/0.4)] hover:scale-[1.02] transition-all cursor-pointer"
                >
                  {adjustMutation.isPending ? "Committing Ledger…" : "Apply Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
