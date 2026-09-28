import React, { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  EyeOff,
  TrendingUp,
  Tag,
  Copy,
  ExternalLink,
} from "lucide-react";
import {
  fetchAdminPacks,
  createPack,
  updatePack,
  deletePack,
  togglePackStatus,
  fetchTrendingPack,
  updateTrendingStickers,
  addStickerToTrending,
  removeStickerFromTrending,
  createProduct,
  fetchAdminProducts,
  TRENDING_PACK_ID,
  type StickerPack,
  type ProductStatus,
  type AdminProduct,
} from "@/lib/admin-api";
import TrendingSlotBoard from "@/components/admin/TrendingSlotBoard";
import PackBuilderModal from "@/components/admin/PackBuilderModal";
import TrendingPickerModal from "@/components/admin/TrendingPickerModal";
import { imageStorageService } from "@/lib/storage-service";
import { formatStickerTitleFromFilename } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AdminPacks() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Navigation tab: "trending" (Homepage Trending Drops) vs "all-packs" (Custom Packs)
  const [activeTab, setActiveTab] = useState<"trending" | "all-packs">("trending");

  // Modals & Drawers
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<StickerPack | null>(null);
  const [isTrendingPickerOpen, setIsTrendingPickerOpen] = useState(false);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);

  // Trending Upload State
  const [isUploadingToTrending, setIsUploadingToTrending] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ProductStatus>("ALL");

  // 1. Query all packs
  const { data: packs = [], isLoading: packsLoading, isError: packsError } = useQuery({
    queryKey: ["admin-sticker-packs"],
    queryFn: fetchAdminPacks,
  });

  // 2. Query trending pack specifically
  const { data: trendingPack, isLoading: trendingLoading } = useQuery({
    queryKey: ["admin-trending-pack"],
    queryFn: fetchTrendingPack,
  });

  // 3. Query all products for slot board hydration
  const { data: productsData } = useQuery({
    queryKey: ["admin-products-trending-board"],
    queryFn: () => fetchAdminProducts({ pageSize: 500 }),
  });
  const products = useMemo(() => productsData?.products || [], [productsData]);

  // Mutations for custom packs
  const createPackMutation = useMutation({
    mutationFn: createPack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sticker-packs"] });
    },
  });

  const updatePackMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<StickerPack> }) =>
      updatePack(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sticker-packs"] });
    },
  });

  const deletePackMutation = useMutation({
    mutationFn: deletePack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sticker-packs"] });
      toast.success("Sticker pack removed.");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProductStatus }) =>
      togglePackStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sticker-packs"] });
    },
  });

  // --------------------------------------------------------------------------
  // TRENDING PICKS ACTIONS
  // --------------------------------------------------------------------------

  const handleRemoveFromTrending = async (stickerId: number) => {
    try {
      await removeStickerFromTrending(stickerId);
      queryClient.invalidateQueries({ queryKey: ["admin-trending-pack"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sticker-packs"] });
      queryClient.invalidateQueries({ queryKey: ["trending-sticker-ids"] });
      toast.success("Removed from Homepage Trending Drops");
    } catch {
      toast.error("Failed to remove from trending.");
    }
  };

  const handleToggleStickerTrending = async (stickerId: number) => {
    if (!trendingPack) return;
    const isPresent = trendingPack.sticker_ids.includes(stickerId);
    if (isPresent) {
      await handleRemoveFromTrending(stickerId);
    } else {
      await addStickerToTrending(stickerId);
      queryClient.invalidateQueries({ queryKey: ["admin-trending-pack"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sticker-packs"] });
      queryClient.invalidateQueries({ queryKey: ["trending-sticker-ids"] });
      toast.success("Added to Homepage Trending Drops");
    }
  };

  const handleAssignToSlot = async (stickerId: number, slotIndex: number) => {
    if (!trendingPack) return;
    const currentIds = [...(trendingPack.sticker_ids || [])];
    const existingIdx = currentIds.indexOf(stickerId);
    if (existingIdx !== -1) {
      currentIds.splice(existingIdx, 1);
    }
    currentIds.splice(slotIndex, 0, stickerId);
    const nextIds = currentIds.slice(0, 16);

    await updateTrendingStickers(nextIds);
    queryClient.invalidateQueries({ queryKey: ["admin-trending-pack"] });
    queryClient.invalidateQueries({ queryKey: ["admin-sticker-packs"] });
    queryClient.invalidateQueries({ queryKey: ["trending-sticker-ids"] });
    toast.success(`Assigned to Slot #${String(slotIndex + 1).padStart(2, "0")}`);
  };

  const handleUpdateOrder = async (newIds: number[]) => {
    await updateTrendingStickers(newIds);
    queryClient.invalidateQueries({ queryKey: ["admin-trending-pack"] });
    queryClient.invalidateQueries({ queryKey: ["admin-sticker-packs"] });
    queryClient.invalidateQueries({ queryKey: ["trending-sticker-ids"] });
    toast.success("Homepage Trending slots updated.");
  };

  // Direct File Upload into Trending
  const handleFilesUploadedToTrending = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("Please drop valid image files (PNG, JPG, WEBP, SVG)");
      return;
    }

    setIsUploadingToTrending(true);
    let successCount = 0;

    for (const file of imageFiles) {
      try {
        const uploadRes = await imageStorageService.uploadImage(file, { folder: "trending" });
        const title = formatStickerTitleFromFilename(file.name);
        const newProduct = await createProduct({
          title,
          category_id: 49134,
          image_url: uploadRes.publicUrl,
          image_storage_key: uploadRes.storageKey,
          stock_quantity: 100,
          price: 100,
          cost_price: 6.0,
          status: "published",
        });
        await addStickerToTrending(newProduct.id);
        successCount++;
      } catch (err) {
        console.error("Failed to upload sticker to trending:", err);
      }
    }

    setIsUploadingToTrending(false);
    queryClient.invalidateQueries({ queryKey: ["admin-trending-pack"] });
    queryClient.invalidateQueries({ queryKey: ["admin-sticker-packs"] });
    queryClient.invalidateQueries({ queryKey: ["trending-sticker-ids"] });
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });

    if (successCount > 0) {
      toast.success(
        `Added ${successCount} new sticker${successCount === 1 ? "" : "s"} directly to Homepage Trending!`,
      );
    } else {
      toast.error("Failed to upload stickers to trending.");
    }
  };

  // Duplicate pack
  const handleDuplicate = async (pack: StickerPack) => {
    try {
      await createPackMutation.mutateAsync({
        title: `${pack.title} (Copy)`,
        slug: `${pack.slug}-copy`,
        badge: pack.badge,
        price: pack.price,
        compare_at_price: pack.compare_at_price,
        cover_image_url: pack.cover_image_url,
        status: "draft",
        sticker_ids: pack.sticker_ids,
      });
      toast.success(`Pack duplicated as "${pack.title} (Copy)"`);
    } catch {
      toast.error("Failed to duplicate pack.");
    }
  };

  // Filtered Custom Packs
  const customPacks = useMemo(() => {
    return packs.filter((pack) => {
      if (pack.id === TRENDING_PACK_ID || pack.slug === "trending-picks") return false;
      if (statusFilter !== "ALL" && pack.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          pack.title.toLowerCase().includes(q) ||
          pack.slug.toLowerCase().includes(q) ||
          (pack.badge && pack.badge.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [packs, statusFilter, search]);

  const trendingStickerIds = trendingPack?.sticker_ids || [];

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {/* Hidden File Input for Direct Upload */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFilesUploadedToTrending(e.target.files);
          }
        }}
      />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <span>Sticker Packs &amp; Drops</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Homepage hero curation &amp; bundle releases
          </p>
        </div>

        <div className="flex items-center gap-2">
          <LinkToStorefront />
          <button
            onClick={() => {
              setEditingPack(null);
              setIsBuilderOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shrink-0 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Sticker Pack</span>
          </button>
        </div>
      </div>

      {/* Navigation Switcher Tabs */}
      <div className="flex items-center gap-1.5 border-b border-white/[0.06] pb-2.5 overflow-x-auto">
        <button
          onClick={() => setActiveTab("trending")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
            activeTab === "trending"
              ? "bg-white/[0.08] text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
          )}
        >
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          <span>Homepage Trending</span>
          <span className="rounded-md bg-white/[0.06] text-muted-foreground px-1.5 py-0.5 text-[10px] font-mono border border-white/[0.06]">
            {trendingStickerIds.length} / 16 Live
          </span>
        </button>

        <button
          onClick={() => setActiveTab("all-packs")}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
            activeTab === "all-packs"
              ? "bg-white/[0.08] text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
          )}
        >
          <Package className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Sticker Packs</span>
          <span className="rounded-md bg-white/[0.06] text-muted-foreground px-1.5 py-0.5 text-[10px] font-mono border border-white/[0.06]">
            {customPacks.length}
          </span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* VIEW A: HOMEPAGE TRENDING MERCHANDISING BOARD                        */}
      {/* ==================================================================== */}
      {activeTab === "trending" && (
        <TrendingSlotBoard
          trendingPack={trendingPack ?? null}
          products={products}
          isLoading={trendingLoading}
          onUpdateOrder={handleUpdateOrder}
          onOpenPicker={(slotIdx) => {
            setTargetSlotIndex(slotIdx ?? null);
            setIsTrendingPickerOpen(true);
          }}
          onRemoveSticker={handleRemoveFromTrending}
          onUploadClick={() => fileInputRef.current?.click()}
          isUploading={isUploadingToTrending}
        />
      )}

      {/* ==================================================================== */}
      {/* VIEW B: ALL CUSTOM STICKER PACKS                                     */}
      {/* ==================================================================== */}
      {activeTab === "all-packs" && (
        <div className="space-y-4">
          {/* Search & Filters Toolbar */}
          <div className="bg-[#0e0f1b] border border-white/[0.06] rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search packs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 bg-[#090a13] border-white/[0.08] text-xs text-foreground placeholder:text-muted-foreground/60 rounded-md"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {(["ALL", "published", "draft", "archived"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors shrink-0 cursor-pointer",
                    statusFilter === st
                      ? "bg-white/[0.08] text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
                  )}
                >
                  {st === "ALL" ? "All Packs" : st}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Packs Grid */}
          {packsLoading ? (
            <div className="py-20 text-center text-xs text-muted-foreground">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading sticker packs...
            </div>
          ) : packsError ? (
            <div className="py-16 text-center text-rose-400 text-xs">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-80" />
              Failed to load sticker packs.
            </div>
          ) : customPacks.length === 0 ? (
            <div className="py-16 text-center rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-8">
              <Package className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <h3 className="font-semibold text-foreground text-sm">No Custom Packs Yet</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Create your first curated sticker bundle.
              </p>
              <button
                onClick={() => {
                  setEditingPack(null);
                  setIsBuilderOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Pack</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customPacks.map((pack) => {
                const savingsPercent =
                  pack.compare_at_price && pack.compare_at_price > pack.price
                    ? Math.round(
                        ((pack.compare_at_price - pack.price) / pack.compare_at_price) * 100,
                      )
                    : 0;

                return (
                  <div
                    key={pack.id}
                    className="group relative rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-4 hover:border-white/[0.14] transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Badge & Status */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {pack.badge && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/[0.06] text-foreground border border-white/[0.08]">
                              <Tag className="w-3 h-3 text-muted-foreground" />
                              {pack.badge}
                            </span>
                          )}
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/[0.04] text-muted-foreground border border-white/[0.06]">
                            {pack.sticker_ids.length} Stickers
                          </span>
                        </div>

                        {/* Status Pill Toggle */}
                        <button
                          onClick={() =>
                            toggleStatusMutation.mutate({
                              id: pack.id,
                              status: pack.status === "published" ? "draft" : "published",
                            })
                          }
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer border",
                            pack.status === "published"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-white/[0.04] text-muted-foreground border-white/[0.06]",
                          )}
                          title="Click to toggle status"
                        >
                          {pack.status === "published" ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Published</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3" />
                              <span>Draft</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Visual Collage Preview */}
                      <div className="relative w-full h-36 rounded-lg bg-[#070810] border border-white/[0.04] overflow-hidden mb-3 flex items-center justify-center p-3">
                        {pack.stickers && pack.stickers.length > 0 ? (
                          <div className="relative flex items-center justify-center w-full h-full">
                            {pack.stickers.slice(0, 5).map((sticker, idx) => {
                              const offset =
                                (idx - Math.min(pack.stickers!.length, 5) / 2 + 0.5) * 26;
                              const rotate =
                                (idx - Math.min(pack.stickers!.length, 5) / 2 + 0.5) * 8;
                              return (
                                <img
                                  key={sticker.id}
                                  src={sticker.image_url}
                                  alt={sticker.title}
                                  style={{
                                    transform: `translateX(${offset}px) rotate(${rotate}deg)`,
                                    zIndex: idx,
                                  }}
                                  className="absolute w-18 h-18 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] pointer-events-none"
                                />
                              );
                            })}
                          </div>
                        ) : pack.cover_image_url ? (
                          <img
                            src={pack.cover_image_url}
                            alt={pack.title}
                            className="w-full h-full object-contain pointer-events-none"
                          />
                        ) : (
                          <Package className="w-8 h-8 text-muted-foreground/30" />
                        )}
                      </div>

                      {/* Title & Slug */}
                      <h3 className="font-semibold text-foreground text-sm tracking-tight truncate group-hover:text-primary transition-colors">
                        {pack.title}
                      </h3>
                      <p className="text-[11px] font-mono text-muted-foreground/80 truncate mb-2.5">
                        /pack/{pack.slug}
                      </p>

                      {/* Included Stickers Mini Avatar Stack */}
                      {pack.stickers && pack.stickers.length > 0 && (
                        <div className="flex items-center gap-1.5 py-1 mb-2.5">
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {pack.stickers.slice(0, 4).map((s) => (
                              <img
                                key={s.id}
                                src={s.image_url}
                                alt={s.title}
                                title={s.title}
                                className="inline-block h-5 w-5 rounded-full ring-2 ring-[#0e0f1b] object-contain bg-[#070810]"
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium pl-1">
                            {pack.stickers.length} stickers included
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Commercial Price & Action Buttons */}
                    <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-bold text-foreground font-mono">
                            KSh {pack.price}
                          </span>
                          {pack.compare_at_price && pack.compare_at_price > pack.price && (
                            <span className="text-xs text-muted-foreground line-through font-mono">
                              KSh {pack.compare_at_price}
                            </span>
                          )}
                        </div>
                        {savingsPercent > 0 && (
                          <span className="text-[10px] font-medium text-emerald-400">
                            Save {savingsPercent}%
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDuplicate(pack)}
                          className="p-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="Duplicate pack"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingPack(pack);
                            setIsBuilderOpen(true);
                          }}
                          className="p-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="Edit pack"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete pack "${pack.title}"?`)) {
                              deletePackMutation.mutate(pack.id);
                            }
                          }}
                          className="p-1.5 rounded-md bg-white/[0.04] hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete pack"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODALS */}
      {/* ------------------------------------------------------------------ */}
      {/* 1. Pack Builder Modal (40/60 Split Workspace) */}
      <PackBuilderModal
        open={isBuilderOpen}
        onClose={() => {
          setIsBuilderOpen(false);
          setEditingPack(null);
        }}
        packToEdit={editingPack}
        onSave={async (payload) => {
          if (editingPack) {
            await updatePackMutation.mutateAsync({
              id: editingPack.id,
              payload,
            });
          } else {
            await createPackMutation.mutateAsync(payload);
          }
        }}
      />

      {/* 2. Trending Sticker Picker Modal */}
      <TrendingPickerModal
        open={isTrendingPickerOpen}
        onClose={() => {
          setIsTrendingPickerOpen(false);
          setTargetSlotIndex(null);
        }}
        currentTrendingIds={trendingStickerIds}
        onToggleSticker={handleToggleStickerTrending}
        targetSlotIndex={targetSlotIndex}
        onAssignToSlot={handleAssignToSlot}
      />
    </div>
  );
}

function LinkToStorefront() {
  return (
    <a
      href="/#trending-section"
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-colors"
      title="View Live Trending Section on Storefront"
    >
      <ExternalLink className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">View Live Storefront</span>
    </a>
  );
}
