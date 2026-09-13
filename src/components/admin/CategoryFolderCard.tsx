import React from "react";
import { Folder, Sparkles, ChevronRight, MoreVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryFolderCardProps {
  id: number;
  name: string;
  slug?: string;
  productCount: number;
  onOpen: (id: number) => void;
  onDelete?: (id: number, name: string, count: number) => void;
}

export default function CategoryFolderCard({
  id,
  name,
  slug,
  productCount,
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
        "group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#121324]/80 p-5 transition-all duration-200 cursor-pointer",
        "hover:border-primary/50 hover:bg-[#181930] hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:-translate-y-0.5",
      )}
    >
      {/* Top row: Folder Icon & Menu */}
      <div className="flex items-start justify-between">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 transition-transform group-hover:scale-110">
          <Folder className="h-7 w-7 fill-amber-400/20 stroke-amber-400" />
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#0d0e1a] border border-white/10 text-primary">
            <Sparkles className="h-3 w-3" />
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onDelete && productCount === 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id, name, productCount);
              }}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all"
              title="Delete empty category"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <span className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground group-hover:text-primary transition-colors">
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>

      {/* Middle: Category Title & Storage Key */}
      <div className="mt-4 min-w-0">
        <h3 className="truncate text-base font-bold text-foreground group-hover:text-primary transition-colors">
          {name}
        </h3>
        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground/80">
          stickers/{resolvedSlug}/
        </p>
      </div>

      {/* Footer: Sticker Count Badge */}
      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-foreground/80 border border-white/[0.06]">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {productCount} {productCount === 1 ? "sticker" : "stickers"}
        </span>

        <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          Open folder →
        </span>
      </div>
    </div>
  );
}