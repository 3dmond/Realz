import React from "react";
import { Sparkles, Edit2, Eye, EyeOff, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminProduct, ProductStatus } from "@/lib/admin-api";

interface StickerCardGridProps {
  products: AdminProduct[];
  onEdit: (product: AdminProduct) => void;
  onToggleStatus: (id: number, newStatus: ProductStatus) => void;
  onMoveToBin: (id: number) => void;
}

export default function StickerCardGrid({
  products,
  onEdit,
  onToggleStatus,
  onMoveToBin,
}: StickerCardGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {products.map((prod) => {
        const resolvedStatus: ProductStatus =
          prod.status || (prod.is_active === false ? "archived" : "published");
        const isArchived = resolvedStatus === "archived";
        const isPublished = resolvedStatus === "published";

        const filename = prod.image_storage_key
          ? prod.image_storage_key.split("/").pop()
          : prod.image_url?.split("/").pop() || "";

        return (
          <div
            key={prod.id}
            className={cn(
              "group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#121324]/80 p-3 transition-all duration-200",
              "hover:border-primary/50 hover:bg-[#181930] hover:shadow-[0_8px_25px_rgb(0,0,0,0.4)]",
              isArchived && "opacity-60",
            )}
          >
            {/* Thumbnail Canvas - Clicking opens sticker details/discount popup */}
            <div
              onClick={() => onEdit(prod)}
              className="relative aspect-square w-full rounded-xl overflow-hidden border border-white/[0.08] flex items-center justify-center bg-[linear-gradient(45deg,#181926_25%,transparent_25%),linear-gradient(-45deg,#181926_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#181926_75%),linear-gradient(-45deg,transparent_75%,#181926_75%)] bg-[size:10px_10px] bg-[#0d0e18] cursor-pointer"
            >
              {prod.image_url ? (
                <img
                  src={prod.image_url}
                  alt={prod.title}
                  className="h-full w-full object-contain p-2 transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <Sparkles className="h-6 w-6 text-muted-foreground/30" />
              )}

              {/* Status Pill Badge */}
              <div className="absolute top-2 right-2">
                {isPublished ? (
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgb(52,211,153)]" title="Published (Live)" />
                ) : (
                  <span className="flex h-2 w-2 rounded-full bg-amber-400" title="Draft (Hidden)" />
                )}
              </div>

              {/* Discount Badge */}
              {prod.price && prod.price < 15.5 && (
                <div className="absolute top-2 left-2">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-primary text-primary-foreground shadow-sm">
                    -{Math.round(((15.5 - prod.price) / 15.5) * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Sticker Title & Storage Key */}
            <div className="mt-3 min-w-0">
              <h4
                onClick={() => onEdit(prod)}
                className="truncate text-xs font-bold text-foreground group-hover:text-primary transition-colors cursor-pointer"
                title={prod.title}
              >
                {prod.title}
              </h4>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[11px] font-mono font-black text-primary">
                  {(prod.price ?? 15.5).toFixed(2)} KSh
                </span>
                {prod.price && prod.price < 15.5 && (
                  <span className="text-[10px] font-mono line-through text-muted-foreground/70">
                    15.50
                  </span>
                )}
              </div>
              {prod.image_storage_key?.includes("/") && prod.image_storage_key.split("/").length > 2 && (
                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20 truncate max-w-full">
                  {prod.image_storage_key.split("/")[1].replace(/[-_]+/g, " ")}
                </span>
              )}
              <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground/70" title={filename}>
                {filename}
              </p>
            </div>

            {/* Quick Actions Hover Bar */}
            <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
              {/* Status Toggle */}
              <button
                onClick={() =>
                  onToggleStatus(prod.id, isPublished ? "draft" : "published")
                }
                title={isPublished ? "Set to Draft" : "Publish to Storefront"}
                className={cn(
                  "p-1.5 rounded-lg border text-[11px] transition-colors cursor-pointer",
                  isPublished
                    ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                    : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10",
                )}
              >
                {isPublished ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>

              <div className="flex items-center gap-1">
                {/* Edit */}
                <button
                  onClick={() => onEdit(prod)}
                  title="Edit Details"
                  className="p-1.5 rounded-lg border border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors cursor-pointer"
                >
                  <Edit2 className="h-3 w-3" />
                </button>

                {/* Move to Bin */}
                <button
                  onClick={() => onMoveToBin(prod.id)}
                  title="Move to Bin"
                  className="p-1.5 rounded-lg border border-white/[0.08] text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors cursor-pointer"
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