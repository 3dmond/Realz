import React, { useState } from "react";
import {
  Trash2,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
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
    if (!window.confirm("Permanently delete this sticker? Its artwork will also be removed from Supabase Storage. This cannot be undone.")) {
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
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sticker Catalogue</span>
        </button>
      </div>

      {/* Info Banner */}
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              Recycle Bin ({products.length})
              {products.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/30">
                  {products.length} {products.length === 1 ? "item" : "items"}
                </span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
              Stickers in the bin are hidden from the storefront. You can restore them to their categories or permanently delete them and their artwork files from Supabase Storage.
            </p>
          </div>
        </div>

        {products.length > 0 && (
          <button
            onClick={() => setConfirmEmptyOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500 hover:text-white transition-all cursor-pointer shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Empty Bin</span>
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading bin contents...
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-white/[0.08] bg-[#121324]/50 p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-foreground text-base">Recycle Bin is Empty</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            No deleted or archived stickers found. Stickers you remove from categories will appear here.
          </p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Back to Stickers
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((prod) => {
            const filename = prod.image_storage_key
              ? prod.image_storage_key.split("/").pop()
              : prod.image_url?.split("/").pop() || "";

            return (
              <div
                key={prod.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-rose-500/20 bg-[#14101e]/80 p-3 transition-all duration-200 hover:border-rose-500/40 hover:bg-[#1a1226]"
              >
                {/* Thumbnail */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-white/[0.08] flex items-center justify-center bg-[linear-gradient(45deg,#181926_25%,transparent_25%),linear-gradient(-45deg,#181926_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#181926_75%),linear-gradient(-45deg,transparent_75%,#181926_75%)] bg-[size:10px_10px] bg-[#0d0e18]">
                  {prod.image_url ? (
                    <img
                      src={prod.image_url}
                      alt={prod.title}
                      className="h-full w-full object-contain p-2 opacity-80 group-hover:opacity-100 transition-opacity"
                      loading="lazy"
                    />
                  ) : (
                    <Sparkles className="h-6 w-6 text-muted-foreground/30" />
                  )}
                  <span className="absolute top-2 right-2 rounded-full bg-rose-500/80 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                    In Bin
                  </span>
                </div>

                {/* Details */}
                <div className="mt-3 min-w-0">
                  <h4 className="truncate text-xs font-bold text-foreground" title={prod.title}>
                    {prod.title}
                  </h4>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="rounded bg-white/[0.04] px-1.5 py-0.5 border border-white/[0.06] text-foreground/80">
                      {prod.categories?.name || "Uncategorized"}
                    </span>
                    <span className="truncate font-mono text-[10px] text-muted-foreground/70" title={filename}>
                      {filename}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-2">
                  {/* Restore */}
                  <button
                    onClick={() => handleRestore(prod.id)}
                    disabled={restoringId === prod.id}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                    title="Restore sticker to category"
                  >
                    {restoringId === prod.id ? (
                      <div className="h-3 w-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    <span>Restore</span>
                  </button>

                  {/* Permanent Delete */}
                  <button
                    onClick={() => handlePermanentDelete(prod.id)}
                    disabled={deletingId === prod.id}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                    title="Permanently delete from database and storage"
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
      )}

      {/* Confirmation Modal for Empty Bin */}
      {confirmEmptyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#120f1c] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Empty Recycle Bin?</h3>
                <p className="text-xs text-muted-foreground">Permanent destruction warning</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This will <strong className="text-rose-400">permanently delete all {products.length} stickers</strong> currently in the bin, and will permanently remove their artwork files from Supabase Storage. This action cannot be reversed.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmEmptyOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-white/[0.05] hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={emptying}
                onClick={handleEmptyBin}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-600 transition-all cursor-pointer disabled:opacity-50"
              >
                {emptying ? (
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Permanently Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}