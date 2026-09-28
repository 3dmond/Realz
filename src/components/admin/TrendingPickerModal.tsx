import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Search,
  Check,
  TrendingUp,
  Filter,
} from "lucide-react";
import {
  fetchAdminProducts,
  fetchAdminCategories,
} from "@/lib/admin-api";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TrendingPickerModalProps {
  open: boolean;
  onClose: () => void;
  currentTrendingIds: number[];
  onToggleSticker: (stickerId: number) => Promise<void>;
  targetSlotIndex?: number | null;
  onAssignToSlot?: (stickerId: number, slotIndex: number) => Promise<void>;
}

export default function TrendingPickerModal({
  open,
  onClose,
  currentTrendingIds,
  onToggleSticker,
  targetSlotIndex,
  onAssignToSlot,
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

  const handleSelect = async (prodId: number) => {
    try {
      setLoadingId(prodId);
      if (targetSlotIndex !== undefined && targetSlotIndex !== null && onAssignToSlot) {
        await onAssignToSlot(prodId, targetSlotIndex);
        onClose();
      } else {
        await onToggleSticker(prodId);
      }
    } finally {
      setLoadingId(null);
    }
  };

  if (!open) return null;

  const isSlotAssignment = targetSlotIndex !== undefined && targetSlotIndex !== null;
  const targetSlotLabel = isSlotAssignment
    ? `#${String(targetSlotIndex + 1).padStart(2, "0")}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border border-white/[0.1] bg-[#0c0d18] shadow-2xl text-foreground overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header - concise, zero onboarding prose */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-[#090a13] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                {isSlotAssignment
                  ? `Assign Sticker to Slot ${targetSlotLabel}`
                  : "Catalogue Selection — Trending"}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground border border-white/[0.08] font-mono font-medium">
                {currentTrendingIds.length} / 16 Live
              </span>
              {isSlotAssignment && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                  Target: Slot {targetSlotLabel}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-white/[0.05] hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Toolbar Filter */}
        <div className="p-3 border-b border-white/[0.06] bg-[#0e0f1b] flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search stickers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#090a13] border-white/[0.08] text-xs h-8 pl-8 text-foreground placeholder:text-muted-foreground/60 rounded-md"
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
              className="bg-[#090a13] border border-white/[0.08] text-xs h-8 rounded-md px-2.5 text-foreground focus:outline-none focus:border-primary w-full sm:w-auto cursor-pointer"
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {prodsLoading ? (
            <div className="py-16 text-center text-xs text-muted-foreground">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading stickers...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-white/[0.08] rounded-xl bg-[#0e0f1b]/50">
              No stickers found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filteredProducts.map((prod) => {
                const slotIndex = currentTrendingIds.indexOf(prod.id);
                const isTrending = slotIndex !== -1;
                const isLoadingThis = loadingId === prod.id;
                const slotLabel = isTrending ? `#${String(slotIndex + 1).padStart(2, "0")}` : null;

                return (
                  <div
                    key={prod.id}
                    onClick={() => handleSelect(prod.id)}
                    className={cn(
                      "relative rounded-lg border p-2 flex flex-col items-center text-center cursor-pointer transition-colors select-none group",
                      isTrending
                        ? "border-emerald-500/40 bg-emerald-500/[0.05]"
                        : "border-white/[0.06] bg-[#0e0f1b] hover:border-white/[0.16]",
                    )}
                  >
                    {/* Image Container */}
                    <div className="relative w-full aspect-square rounded-md bg-[#070810] border border-white/[0.04] overflow-hidden mb-1.5 flex items-center justify-center p-1.5">
                      <img
                        src={prod.image_url}
                        alt={prod.title}
                        className="w-full h-full object-contain pointer-events-none"
                        loading="lazy"
                      />

                      {/* Slot Badge if already featured */}
                      {isTrending && (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/85 text-emerald-400 text-[9px] font-mono font-bold border border-emerald-500/20 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          <span>{slotLabel} Live</span>
                        </div>
                      )}

                      {/* Hover Action Layer */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {isLoadingThis ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : isSlotAssignment ? (
                          <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-semibold">
                            Assign to {targetSlotLabel}
                          </span>
                        ) : isTrending ? (
                          <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-medium">
                            Remove
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-medium">
                            + Add to Trending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <span className="text-[11px] font-medium text-foreground truncate w-full mb-0.5">
                      {prod.title}
                    </span>

                    {/* Category Label - ZERO UNIT PRICE TAGS */}
                    <span className="text-[10px] text-muted-foreground truncate w-full">
                      {prod.categories?.name || "Sticker"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.06] bg-[#090a13] flex items-center justify-between shrink-0">
          <span className="text-xs text-muted-foreground font-medium">
            {currentTrendingIds.length} stickers currently featured
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-foreground border border-white/[0.08] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
