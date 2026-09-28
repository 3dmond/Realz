import React from "react";
import { Edit2, Eye, EyeOff, Trash2, Check, Square, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminProduct, ProductStatus } from "@/lib/admin-api";

interface StickerCardGridProps {
  products: AdminProduct[];
  selectedIds?: number[];
  onToggleSelect?: (id: number) => void;
  canvasStyle?: "dark" | "checkerboard";
  onEdit: (product: AdminProduct) => void;
  onToggleStatus: (id: number, newStatus: ProductStatus) => void;
  onMoveToBin: (id: number) => void;
}

export default function StickerCardGrid({
  products,
  selectedIds = [],
  onToggleSelect,
  canvasStyle = "dark",
  onEdit,
  onToggleStatus,
  onMoveToBin,
}: StickerCardGridProps) {
  const isSelected = (id: number) => selectedIds.includes(id);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {products.map((prod) => {
        const resolvedStatus: ProductStatus =
          prod.status || (prod.is_active === false ? "archived" : "published");
        const isArchived = resolvedStatus === "archived";
        const isPublished = resolvedStatus === "published";
        const selected = isSelected(prod.id);

        const filename = prod.image_storage_key
          ? prod.image_storage_key.split("/").pop()
          : prod.image_url?.split("/").pop() || "";

        return (
          <div
            key={prod.id}
            className={cn(
              "group relative flex flex-col justify-between rounded-xl border p-2.5 transition-all duration-150",
              selected
                ? "border-primary/60 bg-primary/[0.03] ring-1 ring-primary/40"
                : "border-white/[0.06] bg-[#0e0f1b] hover:border-white/[0.16] hover:bg-[#121323]",
              isArchived && "opacity-60",
            )}
          >
            {/* Thumbnail Canvas */}
            <div
              onClick={() => onEdit(prod)}
              className={cn(
                "relative aspect-square w-full rounded-lg overflow-hidden border border-white/[0.06] flex items-center justify-center cursor-pointer transition-colors",
                canvasStyle === "checkerboard" ? "bg-transparency-grid" : "bg-[#070810]",
              )}
            >
              {prod.image_url ? (
                <img
                  src={prod.image_url}
                  alt={prod.title}
                  className="h-full w-full object-contain p-2 transition-transform duration-150 group-hover:scale-102"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="text-[11px] text-muted-foreground/40 font-mono">No Image</div>
              )}

              {/* Multi-Select Checkbox Trigger */}
              {onToggleSelect && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(prod.id);
                  }}
                  className={cn(
                    "absolute top-2 left-2 z-10 h-6 w-6 rounded-md flex items-center justify-center transition-all cursor-pointer",
                    selected
                      ? "bg-primary text-primary-foreground opacity-100 shadow-md"
                      : "bg-black/60 backdrop-blur-xs text-white/70 border border-white/20 opacity-0 group-hover:opacity-100 focus-within:opacity-100 hover:border-white/50",
                  )}
                  title={selected ? "Deselect sticker" : "Select sticker"}
                >
                  {selected ? (
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  ) : (
                    <span className="h-2 w-2 rounded-xs border border-white/50" />
                  )}
                </button>
              )}

              {/* Status Indicator Pill */}
              <div className="absolute top-2 right-2">
                {isPublished ? (
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-black/40" title="Published (Live)" />
                ) : (
                  <span className="flex h-2 w-2 rounded-full bg-amber-400 ring-2 ring-black/40" title="Draft (Hidden)" />
                )}
              </div>

              {/* Subcategory badge if inside parent */}
              {prod.image_storage_key?.includes("/") &&
                prod.image_storage_key.split("/").length > 2 && (
                  <div className="absolute bottom-2 left-2 max-w-[85%]">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-black/70 backdrop-blur-xs text-white/80 border border-white/10 truncate max-w-full">
                      {prod.image_storage_key.split("/")[1].replace(/[-_]+/g, " ")}
                    </span>
                  </div>
                )}
            </div>

            {/* Sticker Title & Storage Key */}
            <div className="mt-2.5 min-w-0">
              <h4
                onClick={() => onEdit(prod)}
                className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors cursor-pointer"
                title={prod.title}
              >
                {prod.title}
              </h4>
              <p
                className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground/60"
                title={filename}
              >
                {filename}
              </p>
            </div>

            {/* Quick Actions Hover Bar (subdued to hover/focus-within) */}
            <div className="mt-2.5 pt-2 border-t border-white/[0.04] flex items-center justify-between opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
              {/* Status Toggle */}
              <button
                type="button"
                onClick={() =>
                  onToggleStatus(prod.id, isPublished ? "draft" : "published")
                }
                title={isPublished ? "Set to Draft" : "Publish to Storefront"}
                className={cn(
                  "p-1.5 rounded-md border text-[11px] transition-colors cursor-pointer",
                  isPublished
                    ? "border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                    : "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10",
                )}
              >
                {isPublished ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>

              <div className="flex items-center gap-1">
                {/* Edit */}
                <button
                  type="button"
                  onClick={() => onEdit(prod)}
                  title="Edit Details"
                  className="p-1.5 rounded-md border border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  <Edit2 className="h-3 w-3" />
                </button>

                {/* Move to Bin */}
                <button
                  type="button"
                  onClick={() => onMoveToBin(prod.id)}
                  title="Move to Bin"
                  className="p-1.5 rounded-md border border-white/[0.08] text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}