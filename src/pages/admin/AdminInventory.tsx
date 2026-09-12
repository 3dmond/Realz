import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Boxes, Plus, Minus, Search, AlertTriangle, History, ArrowUpDown } from "lucide-react";
import {
  fetchAdminProducts,
  adjustInventory,
  fetchInventoryLogs,
  type AdminProduct,
} from "@/lib/admin-api";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function AdminInventory() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"ALL" | "low_stock" | "out_of_stock">("ALL");
  const [activeTab, setActiveTab] = useState<"stocks" | "movements">("stocks");

  // Adjustment Modal
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [deltaInput, setDeltaInput] = useState(10);
  const [isAddition, setIsAddition] = useState(true);
  const [reasonInput, setReasonInput] = useState("Restocked from printer batch");

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
  });

  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) return;
      if (deltaInput <= 0) throw new Error("Adjustment quantity must be greater than 0");
      if (!reasonInput.trim()) throw new Error("Reason is required for inventory audit trail");

      const delta = isAddition ? deltaInput : -deltaInput;
      await adjustInventory(selectedProduct.id, delta, reasonInput.trim());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "inventory-logs"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("Stock level updated successfully");
      setSelectedProduct(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to adjust stock";
      toast.error(message);
    },
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Inventory & Stock Ledger
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time physical sticker availability, low-stock warnings, and transactional movement
            history.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center rounded-xl border border-white/[0.08] bg-[#0f101d] p-1">
          <button
            onClick={() => setActiveTab("stocks")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "stocks"
                ? "bg-primary text-primary-foreground shadow-[0_0_10px_oklch(0.58_0.25_285/0.4)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Stock Levels
          </button>
          <button
            onClick={() => setActiveTab("movements")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "movements"
                ? "bg-primary text-primary-foreground shadow-[0_0_10px_oklch(0.58_0.25_285/0.4)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
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
                  setStockFilter(e.target.value as "ALL" | "low_stock" | "out_of_stock")
                }
                className="h-10 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL" className="bg-[#0c0d18]">
                  All Stock Statuses
                </option>
                <option value="low_stock" className="bg-[#0c0d18]">
                  Low Stock (&lt;15)
                </option>
                <option value="out_of_stock" className="bg-[#0c0d18]">
                  Out of Stock (0)
                </option>
              </select>
            </div>
          </div>

          {/* Stocks Table */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] overflow-hidden shadow-xl">
            {prodsLoading ? (
              <div className="py-20 text-center text-xs text-muted-foreground">
                Loading inventory levels…
              </div>
            ) : productData?.products && productData.products.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] bg-white/[0.02] text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                      <th className="py-3.5 px-4">Sticker Item</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Available Inventory</th>
                      <th className="py-3.5 px-4">Status Indicator</th>
                      <th className="py-3.5 px-4 text-right">Adjust Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {productData.products.map((prod) => {
                      const stock = prod.stock_quantity ?? 100;
                      return (
                        <tr key={prod.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {prod.image_url && (
                                <img
                                  src={prod.image_url}
                                  alt={prod.title}
                                  className="h-10 w-10 rounded-lg object-contain bg-black/40 p-1 border border-white/[0.08]"
                                />
                              )}
                              <div>
                                <h4 className="font-bold text-foreground text-xs">{prod.title}</h4>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  #{prod.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="rounded-full bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">
                              {prod.categories?.name || `Cat #${prod.category_id}`}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-mono font-black text-sm tabular-nums text-foreground">
                              {stock} units
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {stock <= 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-black text-rose-400 border border-rose-500/30">
                                <AlertTriangle className="h-3 w-3" />
                                <span>OUT OF STOCK</span>
                              </span>
                            ) : stock < 15 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black text-amber-400 border border-amber-500/30">
                                <AlertTriangle className="h-3 w-3" />
                                <span>LOW STOCK</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black text-emerald-400 border border-emerald-500/30">
                                OPTIMAL
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedProduct(prod);
                                setDeltaInput(10);
                                setIsAddition(true);
                                setReasonInput("Restocked from printer batch");
                              }}
                              className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                            >
                              Update Stock
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
                <Boxes className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                <h3 className="text-sm font-bold text-foreground">No inventory records found</h3>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Movements Log Tab */
        <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] overflow-hidden shadow-xl">
          {logsLoading ? (
            <div className="py-20 text-center text-xs text-muted-foreground">
              Loading movement logs…
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02] text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                    <th className="py-3.5 px-4">Date / Time</th>
                    <th className="py-3.5 px-4">Product</th>
                    <th className="py-3.5 px-4">Stock Movement</th>
                    <th className="py-3.5 px-4">Previous → Result</th>
                    <th className="py-3.5 px-4">Operational Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        {log.products?.title || `Item #${log.product_id}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-mono font-black tabular-nums text-xs ${
                            log.delta > 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {log.delta > 0 ? `+${log.delta}` : log.delta} units
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">
                        {log.previous_stock} →{" "}
                        <span className="font-bold text-foreground">{log.new_stock}</span>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">{log.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-24 text-center text-xs text-muted-foreground">
              No inventory movement records logged yet.
            </div>
          )}
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#0c0d18] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Inventory Adjustment
                </span>
                <h2 className="text-base font-bold text-foreground">{selectedProduct.title}</h2>
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
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Current Stock in Warehouse:</span>
                <span className="font-mono font-black text-foreground text-sm">
                  {selectedProduct.stock_quantity ?? 100} units
                </span>
              </div>

              {/* Adjustment Mode */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddition(true)}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isAddition
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-white/[0.04] text-muted-foreground"
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Stock</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddition(false)}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    !isAddition
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                      : "bg-white/[0.04] text-muted-foreground"
                  }`}
                >
                  <Minus className="h-3.5 w-3.5" />
                  <span>Deduct Stock</span>
                </button>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Quantity Change *
                </label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={deltaInput}
                  onChange={(e) => setDeltaInput(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1 h-11 bg-white/[0.04] border-white/[0.1] rounded-xl text-sm font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Audit Reason *
                </label>
                <Input
                  required
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="e.g. Supplier delivery, damaged in transit, count adjustment"
                  className="mt-1 h-11 bg-white/[0.04] border-white/[0.1] rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-white/[0.08] hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustMutation.isPending}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-black uppercase tracking-wider text-primary-foreground shadow-[0_0_15px_oklch(0.58_0.25_285/0.4)] hover:scale-[1.02] transition-all disabled:opacity-60 cursor-pointer"
                >
                  {adjustMutation.isPending ? "Updating…" : "Apply Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
