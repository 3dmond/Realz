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
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#121324]/80">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            <th className="py-3 px-4 w-14 text-center">Artwork</th>
            <th className="py-3 px-4">Display Name</th>
            <th className="py-3 px-4">Storage Key</th>
            <th className="py-3 px-4 w-28 text-center">Status</th>
            <th className="py-3 px-4 w-36 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05] text-sm">
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
                  "hover:bg-white/[0.03] transition-colors group",
                  isArchived && "opacity-60",
                )}
              >
                {/* Thumbnail */}
                <td className="py-2.5 px-4">
                  <div className="h-10 w-10 rounded-lg border border-white/[0.08] overflow-hidden relative flex items-center justify-center bg-[linear-gradient(45deg,#181926_25%,transparent_25%),linear-gradient(-45deg,#181926_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#181926_75%),linear-gradient(-45deg,transparent_75%,#181926_75%)] bg-[size:8px_8px] bg-[#0d0e18]">
                    {prod.image_url ? (
                      <img
                        src={prod.image_url}
                        alt={prod.title}
                        className="h-full w-full object-contain p-0.5"
                        loading="lazy"
                      />
                    ) : (
                      <Sparkles className="h-4 w-4 text-muted-foreground/30" />
                    )}
                  </div>
                </td>

                {/* Display Name */}
                <td className="py-2.5 px-4 font-bold text-foreground text-xs">
                  <div
                    onClick={() => onEdit(prod)}
                    className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors flex-wrap"
                  >
                    <span>{prod.title}</span>
                    {prod.price && prod.price < 15.5 && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-primary text-primary-foreground shadow-sm">
                        -{Math.round(((15.5 - prod.price) / 15.5) * 100)}% ({(prod.price).toFixed(2)} KSh)
                      </span>
                    )}
                    {prod.image_storage_key?.includes("/") && prod.image_storage_key.split("/").length > 2 && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {prod.image_storage_key.split("/")[1].replace(/[-_]+/g, " ")}
                      </span>
                    )}
                  </div>
                </td>

                {/* Storage Key */}
                <td className="py-2.5 px-4 font-mono text-[11px] text-muted-foreground/80">
                  {prod.image_storage_key || filename}
                </td>

                {/* Status */}
                <td className="py-2.5 px-4 text-center">
                  {isPublished && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Live
                    </span>
                  )}
                  {isDraft && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      Draft
                    </span>
                  )}
                  {isArchived && (
                    <span className="inline-flex items-center rounded-full bg-zinc-500/10 px-2 py-0.5 text-[10px] font-bold text-zinc-400 border border-zinc-500/30">
                      Archived
                    </span>
                  )}
                </td>

                {/* Actions */}
                <td className="py-2.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() =>
                        onToggleStatus(prod.id, isPublished ? "draft" : "published")
                      }
                      title={isPublished ? "Set to Draft" : "Publish to Storefront"}
                      className={cn(
                        "p-1.5 rounded-lg border text-xs transition-colors cursor-pointer",
                        isPublished
                          ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                          : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10",
                      )}
                    >
                      {isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>

                    <button
                      onClick={() => onEdit(prod)}
                      title="Edit Sticker"
                      className="p-1.5 rounded-lg border border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => onMoveToBin(prod.id)}
                      title="Move to Bin"
                      className="p-1.5 rounded-lg border border-white/[0.08] text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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