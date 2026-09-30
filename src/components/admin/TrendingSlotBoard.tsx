import React, { useState } from "react";
import {
  ArrowLeftRight,
  X,
  Plus,
  Layers,
  Sparkles,
  ExternalLink,
  GripVertical,
  UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminProduct, StickerPack } from "@/lib/admin-api";

interface TrendingSlotBoardProps {
  trendingPack: StickerPack | null;
  products: AdminProduct[];
  isLoading: boolean;
  onUpdateOrder: (newIds: number[]) => Promise<void>;
  onOpenPicker: (targetSlotIndex?: number) => void;
  onRemoveSticker: (stickerId: number) => Promise<void>;
  onUploadClick?: () => void;
  isUploading?: boolean;
  title?: string;
  badgeLabel?: string;
  subtitle?: string;
  uploadLabel?: string;
  uploadTitle?: string;
  previewUrl?: string;
  previewLabel?: string;
  removeTitle?: string;
  totalSlots?: number;
}

export default function TrendingSlotBoard({
  trendingPack,
  products,
  isLoading,
  onUpdateOrder,
  onOpenPicker,
  onRemoveSticker,
  onUploadClick,
  isUploading,
  title = "Homepage Slots",
  badgeLabel = "Live",
  subtitle = "Drag cards to reorder sequence on live homepage",
  uploadLabel = "Upload Direct",
  uploadTitle = "Upload artwork directly",
  previewUrl = "/#trending-section",
  previewLabel = "Preview Hero",
  removeTitle = "Remove sticker",
  totalSlots = 16,
}: TrendingSlotBoardProps) {

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [swapActiveSlot, setSwapActiveSlot] = useState<number | null>(null);

  const rawIds = trendingPack?.sticker_ids || [];

  // Filter out any orphan/deleted products from the ID array
  const productsMap = new Map<number, AdminProduct>();
  products.forEach((p) => {
    if (p.status === "published" && p.is_active !== false) {
      productsMap.set(p.id, p);
    }
  });

  const validStickerIds = rawIds.filter((id) => productsMap.has(id));

  // Build slot array based on totalSlots prop
  const slots: (AdminProduct | null)[] = Array.from({ length: totalSlots }).map(
    (_, idx) => {
      const id = validStickerIds[idx];
      return id ? productsMap.get(id) || null : null;
    },
  );

  const filledCount = slots.filter(Boolean).length;

  // Swap logic
  const handleSwap = async (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= totalSlots || toIdx >= totalSlots) {
      setSwapActiveSlot(null);
      return;
    }

    const currentIds = [...validStickerIds];
    const fromId = currentIds[fromIdx];
    const toId = currentIds[toIdx];

    if (!fromId && !toId) {
      setSwapActiveSlot(null);
      return;
    }

    if (fromId && toId) {
      currentIds[fromIdx] = toId;
      currentIds[toIdx] = fromId;
    } else if (fromId && !toId) {
      currentIds.splice(fromIdx, 1);
      currentIds.splice(toIdx, 0, fromId);
    }

    setSwapActiveSlot(null);
    await onUpdateOrder(currentIds.filter(Boolean));
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }
    const sourceIndex = draggedIndex;
    setDraggedIndex(null);
    await handleSwap(sourceIndex, targetIndex);
  };

  return (
    <div className="space-y-4">
      {/* Control Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0e0f1b] border border-white/[0.06] rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
              {title}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
              {filledCount} / {totalSlots} {badgeLabel}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground hidden md:inline">
            {subtitle}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onUploadClick && (
            <button
              type="button"
              onClick={onUploadClick}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-foreground border border-white/[0.08] transition-colors cursor-pointer disabled:opacity-50"
              title={uploadTitle}
            >
              {isUploading ? (
                <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <UploadCloud className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <span>{isUploading ? "Uploading..." : uploadLabel}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenPicker()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add from Catalogue</span>
          </button>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white/[0.02] hover:bg-white/[0.06] text-muted-foreground hover:text-foreground border border-white/[0.08] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{previewLabel}</span>
          </a>
        </div>
      </div>

      {/* 16-Slot Visual Grid (4x4 on desktop, mirrors Home.tsx scanning) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {slots.map((prod, slotIdx) => {
          const slotLabel = `#${String(slotIdx + 1).padStart(2, "0")}`;
          const isSwapTarget = swapActiveSlot === slotIdx;

          if (!prod) {
            // EMPTY SLOT
            return (
              <div
                key={`empty-slot-${slotIdx}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, slotIdx)}
                className={cn(
                  "relative aspect-square rounded-xl border border-dashed flex flex-col items-center justify-center p-3 transition-all duration-150 group",
                  draggedIndex !== null
                    ? "border-primary/40 bg-primary/[0.03]"
                    : "border-white/[0.1] bg-[#0e0f1b]/40 hover:border-primary/40 hover:bg-[#0e0f1b]",
                )}
              >
                <span className="absolute top-2 left-2 text-[10px] font-mono font-bold text-muted-foreground/60">
                  {slotLabel}
                </span>

                <button
                  type="button"
                  onClick={() => onOpenPicker(slotIdx)}
                  className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground group-hover:text-primary transition-colors cursor-pointer p-2"
                >
                  <div className="h-7 w-7 rounded-lg bg-white/[0.03] border border-white/[0.08] group-hover:border-primary/40 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] font-medium tracking-tight">Assign</span>
                </button>
              </div>
            );
          }

          // OCCUPIED SLOT
          const isDraggingThis = draggedIndex === slotIdx;

          return (
            <div
              key={prod.id}
              draggable
              onDragStart={(e) => handleDragStart(e, slotIdx)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, slotIdx)}
              className={cn(
                "group relative flex flex-col justify-between rounded-xl border p-2.5 transition-all duration-150 cursor-grab active:cursor-grabbing",
                isDraggingThis && "opacity-40 scale-95 border-dashed border-primary",
                isSwapTarget
                  ? "border-primary ring-2 ring-primary/30 bg-primary/[0.04]"
                  : "border-white/[0.08] bg-[#0e0f1b] hover:border-white/[0.18] hover:bg-[#121324]",
              )}
            >
              {/* Artwork Canvas */}
              <div className="relative aspect-square w-full rounded-lg bg-[#070810] border border-white/[0.06] overflow-hidden flex items-center justify-center p-2">
                <img
                  src={prod.image_url}
                  alt={prod.title}
                  className="h-full w-full object-contain pointer-events-none"
                  loading="lazy"
                  decoding="async"
                />

                {/* Slot Badge */}
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono font-bold border border-white/10">
                  {slotLabel}
                </span>

                {/* Remove Micro-Action */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveSticker(prod.id);
                  }}
                  className="absolute top-1.5 right-1.5 h-5 w-5 rounded-md bg-black/70 backdrop-blur-xs text-muted-foreground hover:text-rose-400 hover:bg-rose-500/20 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all cursor-pointer"
                  title={removeTitle}
                >
                  <X className="h-3 w-3 stroke-[2.5]" />
                </button>
              </div>


              {/* Title & Category Chip */}
              <div className="mt-2 min-w-0">
                <h4
                  className="truncate text-[11px] font-semibold text-foreground"
                  title={prod.title}
                >
                  {prod.title}
                </h4>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <span className="truncate text-[10px] text-muted-foreground">
                    {prod.categories?.name || "General"}
                  </span>

                  {/* Micro-Swap Popover Trigger */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSwapActiveSlot(isSwapTarget ? null : slotIdx);
                      }}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
                      title="Move to Slot"
                    >
                      <ArrowLeftRight className="h-3 w-3" />
                    </button>

                    {/* Quick Slot Selector Popover */}
                    {isSwapTarget && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-full right-0 mb-1 z-30 w-36 rounded-lg border border-white/[0.12] bg-[#0c0d18] shadow-xl p-2 text-xs animate-in fade-in zoom-in-95 duration-100"
                      >
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                          Move to Slot
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {Array.from({ length: totalSlots }).map((_, targetSlot) => (
                            <button
                              key={targetSlot}
                              type="button"
                              onClick={() => handleSwap(slotIdx, targetSlot)}
                              className={cn(
                                "h-6 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer",
                                targetSlot === slotIdx
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground border border-white/[0.06]",
                              )}
                            >
                              {String(targetSlot + 1).padStart(2, "0")}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
