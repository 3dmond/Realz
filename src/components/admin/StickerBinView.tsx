import React, { useState } from "react";
import {
  Trash2,
  RotateCcw,
  Layers,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminProduct } from "@/lib/admin-api";

interface StickerBinViewProps {
  products: AdminProduct[];
  isLoading: boolean;
  onBack: () => void;
  onRestore: (id: number) => Promise<void>;
  onPermanentDelete: (id: number) => Promise<void>;
  onEmptyBin: () => Promise<void>;
}

export default function StickerBinView({
  products,
  isLoading,
  onBack,
  onRestore,
  onPermanentDelete,
  onEmptyBin,
}: StickerBinViewProps) {
  const [confirmEmptyOpen, setConfirmEmptyOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [emptying, setEmptying] = useState(false);

  const handleRestore = async (id: number) => {
    setRestoringId(id);
    try {
      await onRestore(id);
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async (id: number) => {
    if (
      !window.confirm(
        "Permanently delete this sticker? Its artwork file will be removed from Supabase Storage. This action cannot be undone.",
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      await onPermanentDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEmptyBin = async () => {
    setEmptying(true);
    try {
      await onEmptyBin();
      setConfirmEmptyOpen(false);
    } finally {
      setEmptying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Content State */}
      {isLoading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading bin contents...
        </div>
      ) : products.length === 0 ? (
        /* Single, cohesive zero-state card */
        <div className="py-20 text-center rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-8 max-w-lg mx-auto my-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto mb-3">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-foreground text-sm">
            Recycle bin is clean
          </h3>
          <p className="text-xs text-muted-foreground mt-1 mb-5">
            No deleted stickers are currently stored here.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-sm"
          >
            <span>Return to Catalogue</span>
          </button>
        </div>
      ) : (
        /* Populated Bin List */
        <div className="space-y-4">
          {/* Header Action Strip */}
          <div className="flex items-center justify-between bg-[#0e0f1b] border border-white/[0.06] rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Soft-Deleted Stickers
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                {products.length} in bin
              </span>
            </div>

            <button
              type="button"
              onClick={() => setConfirmEmptyOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Empty Bin</span>
            </button>
          </div>

          {/* Grid of deleted items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {products.map((prod) => {
              const filename = prod.image_storage_key
                ? prod.image_storage_key.split("/").pop()
                : prod.image_url?.split("/").pop() || "";

              const formattedDate = prod.updated_at
                ? new Date(prod.updated_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : null;

              return (
                <div
                  key={prod.id}
                  className="group relative flex flex-col justify-between rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-3 transition-colors hover:border-white/[0.14]"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-white/[0.06] bg-[#070810] flex items-center justify-center p-2">
                    {prod.image_url ? (
                      <img
                        src={prod.image_url}
                        alt={prod.title}
                        className="h-full w-full object-contain opacity-75 group-hover:opacity-100 transition-opacity pointer-events-none"
                        loading="lazy"
                      />
                    ) : (
                      <Layers className="h-6 w-6 text-muted-foreground/30" />
                    )}
                    <span className="absolute top-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-mono font-medium text-rose-400 border border-rose-500/20">
                      Archived
                    </span>
                  </div>

                  {/* Details */}
                  <div className="mt-2.5 min-w-0">
                    <h4
                      className="truncate text-xs font-semibold text-foreground"
                      title={prod.title}
                    >
                      {prod.title}
                    </h4>
                    <div className="mt-1 flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
                      <span className="truncate">
                        {prod.categories?.name || "Sticker"}
                      </span>
                      {formattedDate && (
                        <span className="font-mono text-muted-foreground/60 shrink-0">
                          {formattedDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 pt-2.5 border-t border-white/[0.06] grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestore(prod.id)}
                      disabled={restoringId === prod.id}
                      className="inline-flex items-center justify-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer disabled:opacity-50"
                      title="Restore sticker to catalogue"
                    >
                      {restoringId === prod.id ? (
                        <div className="h-3 w-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      <span>Restore</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePermanentDelete(prod.id)}
                      disabled={deletingId === prod.id}
                      className="inline-flex items-center justify-center gap-1 rounded-md border border-rose-500/20 bg-rose-500/10 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer disabled:opacity-50"
                      title="Permanently purge record and storage asset"
                    >
                      {deletingId === prod.id ? (
                        <div className="h-3 w-3 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Empty Bin */}
      {confirmEmptyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-xl border border-white/[0.1] bg-[#0c0d18] p-5 shadow-2xl space-y-3.5 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <AlertTriangle className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Empty Recycle Bin?
                </h3>
                <p className="text-xs text-muted-foreground">
                  Permanent deletion confirmation
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This will permanently delete all {products.length} stickers currently in the bin and purge their artwork files from Supabase Storage. This action cannot be undone.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmEmptyOpen(false)}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-white/[0.04] hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={emptying}
                onClick={handleEmptyBin}
                className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {emptying ? (
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Permanently Purge All</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}