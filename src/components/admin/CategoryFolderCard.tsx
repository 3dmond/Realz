import React from "react";
import { Folder, ChevronRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryFolderCardProps {
  id: number;
  name: string;
  slug?: string;
  productCount: number;
  draftCount?: number;
  previews?: string[];
  onOpen: (id: number) => void;
  onDelete?: (id: number, name: string, count: number) => void;
}

export default function CategoryFolderCard({
  id,
  name,
  slug,
  productCount,
  draftCount = 0,
  previews = [],
  onOpen,
  onDelete,
}: CategoryFolderCardProps) {
  const resolvedSlug =
    slug ||
    name
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, "_")
      .replace(/[^a-z0-9_]+/g, "");

  return (
    <div
      onClick={() => onOpen(id)}
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#0e0f1b] p-4 transition-all duration-150 cursor-pointer",
        "hover:border-white/[0.18] hover:bg-[#121324] hover:-translate-y-0.5",
      )}
    >
      {/* Top row: Folder Icon + Overlapping 3-Artwork Preview Stack */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 transition-colors group-hover:border-amber-500/40 shrink-0">
          <Folder className="h-5 w-5 fill-amber-400/20 stroke-amber-400" />
        </div>

        {/* Thumbnail Preview Stack (Visual Anchor) */}
        {previews && previews.length > 0 ? (
          <div className="flex items-center -space-x-2.5 overflow-hidden py-0.5 pl-2">
            {previews.map((url, i) => (
              <div
                key={i}
                className="relative h-9 w-9 rounded-lg bg-[#070810] border border-white/[0.1] ring-2 ring-[#0e0f1b] overflow-hidden flex items-center justify-center p-0.5 shrink-0 transition-transform duration-150 group-hover:scale-105"
                style={{ zIndex: 10 - i }}
              >
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-contain"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {onDelete && productCount === 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(id, name, productCount);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                title="Delete empty category"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <span className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground group-hover:text-foreground transition-colors">
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        )}
      </div>

      {/* Middle: Category Title & Storage Key */}
      <div className="mt-3.5 min-w-0">
        <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
          {name}
        </h3>
        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground/80">
          stickers/{resolvedSlug}/
        </p>
      </div>

      {/* Footer: Sticker Count Badges & Open Link */}
      <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-foreground/80 border border-white/[0.06]">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {productCount} {productCount === 1 ? "sticker" : "stickers"}
          </span>
          {draftCount > 0 && (
            <span className="text-[10px] text-amber-400/90 font-mono">
              ({draftCount} draft{draftCount === 1 ? "" : "s"})
            </span>
          )}
        </div>

        <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-0.5">
          <span>Open</span>
          <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}