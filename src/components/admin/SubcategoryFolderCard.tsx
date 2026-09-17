import React from "react";
import { Folder, Sparkles, ChevronRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubcategoryFolderCardProps {
  id: number;
  name: string;
  slug: string;
  categorySlug: string;
  productCount: number;
  isActive?: boolean;
  onOpen: (slug: string) => void;
  onDelete?: (id: number, name: string) => void;
}

export default function SubcategoryFolderCard({
  id,
  name,
  slug,
  categorySlug,
  productCount,
  isActive,
  onOpen,
  onDelete,
}: SubcategoryFolderCardProps) {
  return (
    <div
      onClick={() => onOpen(slug)}
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 cursor-pointer",
        isActive
          ? "border-primary bg-primary/10 shadow-[0_8px_30px_rgba(109,40,217,0.3)]"
          : "border-white/[0.08] bg-[#121324]/80 hover:border-primary/50 hover:bg-[#181930] hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:-translate-y-0.5",
      )}
    >
      {/* Top row: Folder Icon & Action */}
      <div className="flex items-start justify-between">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 transition-transform group-hover:scale-110">
          <Folder className="h-6 w-6 fill-purple-400/20 stroke-purple-400" />
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0d0e1a] border border-white/10 text-primary">
            <Sparkles className="h-2.5 w-2.5" />
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onDelete && productCount === 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id, name);
              }}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
              title="Delete empty subcategory"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground group-hover:text-primary transition-colors">
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>

      {/* Middle: Subcategory Title & Storage Key */}
      <div className="mt-3 min-w-0">
        <h4 className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">
          {name}
        </h4>
        <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground/80">
          {categorySlug}/{slug}/
        </p>
      </div>

      {/* Footer: Sticker Count Badge */}
      <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-foreground/80 border border-white/[0.06]">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
          {productCount} {productCount === 1 ? "sticker" : "stickers"}
        </span>

        <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          Explore →
        </span>
      </div>
    </div>
  );
}
