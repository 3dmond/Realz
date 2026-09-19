import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Search,
  Check,
  Plus,
  Flame,
  Layers,
  Sparkles,
  Filter,
} from "lucide-react";
import {
  fetchAdminProducts,
  fetchAdminCategories,
  type AdminProduct,
} from "@/lib/admin-api";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TrendingPickerModalProps {
  open: boolean;
  onClose: () => void;
  currentTrendingIds: number[];
  onToggleSticker: (stickerId: number) => Promise<void>;
}

export default function TrendingPickerModal({
  open,
  onClose,
  currentTrendingIds,
  onToggleSticker,
}: TrendingPickerModalProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | "ALL">("ALL");
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const { data: productsData, isLoading: prodsLoading } = useQuery({
    queryKey: ["admin-products-trending-picker"],
    queryFn: () => fetchAdminProducts({ pageSize: 500 }),
    enabled: open,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: fetchAdminCategories,
    enabled: open,
  });

  const allProducts = useMemo(() => productsData?.products || [], [productsData]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      if (selectedCategory !== "ALL" && p.category_id !== selectedCategory) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          (p.categories?.name && p.categories.name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allProducts, selectedCategory, search]);

  const handleToggle = async (id: number) => {
    try {
      setLoadingId(id);
      await onToggleSticker(id);
    } finally {
      setLoadingId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl border border-white/[0.12] bg-[#0e0f1a] shadow-2xl shadow-purple-950/50 text-foreground overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#121324]/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Add Stickers to Homepage Trending</span>
                <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {currentTrendingIds.length} Currently Live
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Click any sticker to immediately add or remove it from the homepage Trending Drops.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-muted-foreground hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Toolbar Filter */}
        <div className="p-4 border-b border-white/[0.08] bg-[#121324]/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search sticker title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#16182c] border-white/[0.08] text-xs h-9 pl-9 text-white placeholder:text-muted-foreground/60 rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(
                  e.target.value === "ALL" ? "ALL" : Number(e.target.value),
                )
              }
              className="bg-[#16182c] border border-white/[0.08] text-xs h-9 rounded-xl px-3 text-muted-foreground focus:outline-none focus:border-primary w-full sm:w-auto cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stickers Grid */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {prodsLoading ? (
            <div className="py-20 text-center text-xs text-muted-foreground">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading stickers...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground border border-dashed border-white/[0.08] rounded-2xl bg-[#141628]/30">
              No stickers found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3.5">
              {filteredProducts.map((prod) => {
                const isTrending = currentTrendingIds.includes(prod.id);
                const isLoadingThis = loadingId === prod.id;

                return (
                  <div
                    key={prod.id}
                    onClick={() => handleToggle(prod.id)}
                    className={cn(
                      "relative rounded-2xl border p-3 flex flex-col items-center text-center cursor-pointer transition-all select-none group",
                      isTrending
                        ? "border-amber-500/50 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                        : "border-white/[0.08] bg-[#141628]/60 hover:border-white/[0.2] hover:bg-[#181a32]",
                    )}
                  >
                    {/* Image Container */}
                    <div className="relative w-full aspect-square rounded-xl bg-black/40 overflow-hidden mb-2 flex items-center justify-center p-2">
                      <img
                        src={prod.image_url}
                        alt={prod.title}
                        className="w-full h-full object-contain drop-shadow transition-transform group-hover:scale-105"
                      />

                      {/* Trending Overlay Badge */}
                      {isTrending && (
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-amber-500 text-black text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow">
                          <Flame className="w-2.5 h-2.5" />
                          <span>Trending</span>
                        </div>
                      )}

                      {/* Action Icon on Hover */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {isLoadingThis ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : isTrending ? (
                          <span className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold shadow">
                            Remove
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold shadow">
                            + Add to Trending
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-white truncate w-full mb-0.5">
                      {prod.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      KSh {prod.price || 100}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/[0.08] bg-[#121324]/90 flex items-center justify-between shrink-0">
          <span className="text-xs text-muted-foreground font-medium">
            {currentTrendingIds.length} stickers currently featured on the homepage
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
