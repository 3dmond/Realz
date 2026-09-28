import React from "react";
import { Sparkles, Edit2, Eye, EyeOff, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminProduct, ProductStatus } from "@/lib/admin-api";

interface StickerListViewProps {
  products: AdminProduct[];
  onEdit: (product: AdminProduct) => void;
  onToggleStatus: (id: number, newStatus: ProductStatus) => void;
  onMoveToBin: (id: number) => void;
}

export default function StickerListView({
  products,
  onEdit,
  onToggleStatus,
  onMoveToBin,
}: StickerListViewProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-[#0e0f1b]">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/[0.06] bg-white/[0.01] text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            <th className="py-2.5 px-3.5 w-12 text-center font-medium">Artwork</th>
            <th className="py-2.5 px-3.5 font-medium">Display Name</th>
            <th className="py-2.5 px-3.5 font-medium">Storage Key</th>
            <th className="py-2.5 px-3.5 w-24 text-center font-medium">Status</th>
            <th className="py-2.5 px-3.5 w-32 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04] text-xs">
          {products.map((prod) => {
            const resolvedStatus: ProductStatus =
              prod.status || (prod.is_active === false ? "archived" : "published");
            const isArchived = resolvedStatus === "archived";
            const isPublished = resolvedStatus === "published";
            const isDraft = resolvedStatus === "draft";

            const filename = prod.image_storage_key
              ? prod.image_storage_key.split("/").pop()
              : prod.image_url?.split("/").pop() || "";

            return (
              <tr
                key={prod.id}
                className={cn(
                  "hover:bg-white/[0.02] transition-colors group",
                  isArchived && "opacity-60",
                )}
              >
                {/* Thumbnail */}
                <td className="py-2 px-3.5 text-center">
                  <div className="h-9 w-9 rounded-md border border-white/[0.06] overflow-hidden relative inline-flex items-center justify-center bg-[#070810]">
                    {prod.image_url ? (
                      <img
                        src={prod.image_url}
                        alt={prod.title}
                        className="h-full w-full object-contain p-0.5"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-[9px] text-muted-foreground/40 font-mono">None</div>
                    )}
                  </div>
                </td>

                {/* Display Name */}
                <td className="py-2 px-3.5 font-semibold text-foreground text-xs">
                  <div
                    onClick={() => onEdit(prod)}
                    className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors flex-wrap"
                  >
                    <span>{prod.title}</span>
                    {prod.image_storage_key?.includes("/") && prod.image_storage_key.split("/").length > 2 && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-white/[0.04] text-muted-foreground border border-white/[0.06]">
                        {prod.image_storage_key.split("/")[1].replace(/[-_]+/g, " ")}
                      </span>
                    )}
                  </div>
                </td>

                {/* Storage Key */}
                <td className="py-2 px-3.5 font-mono text-[11px] text-muted-foreground">
                  {prod.image_storage_key || filename}
                </td>

                {/* Status */}
                <td className="py-2 px-3.5 text-center">
                  {isPublished && (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Live
                    </span>
                  )}
                  {isDraft && (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      Draft
                    </span>
                  )}
                  {isArchived && (
                    <span className="inline-flex items-center rounded bg-zinc-500/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-400 border border-zinc-500/20">
                      Archived
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="py-2 px-3.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() =>
                        onToggleStatus(prod.id, isPublished ? "draft" : "published")
                      }
                      title={isPublished ? "Set to Draft" : "Publish to Storefront"}
                      className={cn(
                        "p-1 rounded-md border text-xs transition-colors cursor-pointer",
                        isPublished
                          ? "border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                          : "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10",
                      )}
                    >
                      {isPublished ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>

                    <button
                      onClick={() => onEdit(prod)}
                      title="Edit Sticker"
                      className="p-1 rounded-md border border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>

                    <button
                      onClick={() => onMoveToBin(prod.id)}
                      title="Move to Bin"
                      className="p-1 rounded-md border border-white/[0.08] text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}