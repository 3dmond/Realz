import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Plus,
  Search,
  Sparkles,
  Layers,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  DollarSign,
  TrendingUp,
  Tag,
  Copy,
  ExternalLink,
  Flame,
  UploadCloud,
  ArrowLeft,
  ArrowRight,
  X,
  SlidersHorizontal,
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
  TRENDING_PACK_ID,
  type StickerPack,
  type ProductStatus,
  type AdminProduct,
} from "@/lib/admin-api";
import PackBuilderModal from "@/components/admin/PackBuilderModal";
import TrendingPickerModal from "@/components/admin/TrendingPickerModal";
import { imageStorageService } from "@/lib/storage-service";
import { formatStickerTitleFromFilename } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AdminPacks() {
  const queryClient = useQueryClient();

  // Navigation tab: "trending" (Homepage Trending Drops) vs "all-packs" (Custom Packs)
  const [activeTab, setActiveTab] = useState<"trending" | "all-packs">("trending");

  // Modals & Drawers
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<StickerPack | null>(null);
  const [isTrendingPickerOpen, setIsTrendingPickerOpen] = useState(false);

  // Trending Upload Drop State
  const [isTrendingDragging, setIsTrendingDragging] = useState(false);
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

  const handleMoveSticker = async (index: number, direction: -1 | 1) => {
    if (!trendingPack?.sticker_ids) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= trendingPack.sticker_ids.length) return;

    const nextIds = [...trendingPack.sticker_ids];
    const [moved] = nextIds.splice(index, 1);
    nextIds.splice(newIndex, 0, moved);

    await updateTrendingStickers(nextIds);
    queryClient.invalidateQueries({ queryKey: ["admin-trending-pack"] });
    queryClient.invalidateQueries({ queryKey: ["admin-sticker-packs"] });
    queryClient.invalidateQueries({ queryKey: ["trending-sticker-ids"] });
  };

  // Direct File Upload into Trending Picks ("just like in the upload")
  const handleFilesDroppedIntoTrending = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("Please drop valid image files (PNG, JPG, WEBP, SVG)");
      return;
    }

    setIsUploadingToTrending(true);
    let successCount = 0;

    for (const file of imageFiles) {
      try {
        // 1. Upload image to storage
        const uploadRes = await imageStorageService.uploadImage(file, { folder: "trending" });
        // 2. Format title automatically in Title Case
        const title = formatStickerTitleFromFilename(file.name);
        // 3. Create product record
        const newProduct = await createProduct({
          title,
          category_id: 49134, // Default to adult cartoons / main category
          image_url: uploadRes.publicUrl,
          image_storage_key: uploadRes.storageKey,
          stock_quantity: 100,
          price: 100,
          cost_price: 6.0,
          status: "published",
        });
        // 4. Immediately add to trending pack
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
        `Added ${successCount} new sticker${successCount === 1 ? "" : "s"} directly to Homepage Trending Drops!`,
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

  // Filtered Custom Packs (excluding the special trending pack from standard list or showing it pinned)
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

  const trendingStickersList = trendingPack?.stickers || [];
  const trendingStickerIds = trendingPack?.sticker_ids || [];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <Package className="h-6 w-6 text-primary" />
            <span>Sticker Packs &amp; Drops</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Curate multi-sticker bundles and choose the exact stickers that appear in the live Homepage Trending Drops.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <LinkToStorefront />
          <button
            onClick={() => {
              setEditingPack(null);
              setIsBuilderOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Sticker Pack</span>
          </button>
        </div>
      </div>

      {/* Main Section Navigation Switcher (Tabs) */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab("trending")}
          className={cn(
            "flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeTab === "trending"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20"
              : "bg-white/[0.03] text-muted-foreground hover:text-white hover:bg-white/[0.06] border border-white/[0.06]",
          )}
        >
          <Flame className="w-4 h-4 text-amber-400" />
          <span>Homepage Trending Picks</span>
          <span className="flex items-center gap-1.5 ml-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-[10px] font-black border border-emerald-500/30">
              {trendingStickerIds.length} Live
            </span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab("all-packs")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeTab === "all-packs"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
              : "bg-white/[0.03] text-muted-foreground hover:text-white hover:bg-white/[0.06] border border-white/[0.06]",
          )}
        >
          <Package className="w-4 h-4" />
          <span>All Sticker Packs ({customPacks.length})</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* VIEW A: HOMEPAGE TRENDING PICKS CURATION HUB */}
      {/* ==================================================================== */}
      {activeTab === "trending" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Trending Banner Hero Card */}
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-[#121324] to-[#0c0d18] p-6 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500 text-black shadow-sm">
                    <Flame className="w-3 h-3 fill-current" />
                    <span>Homepage Live Drop</span>
                  </span>
                  <span className="text-[11px] font-semibold text-amber-200/90 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Syncs directly with Realz Storefront
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Curate Your Homepage Trending Drops
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  These are the exact stickers showcased in the first row on the homepage. You can easily drag and drop new stickers to upload and feature them, or pick existing stickers from your catalogue. Click the remove icon on any sticker to unfeature it instantly.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setIsTrendingPickerOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Add from Catalogue</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Drag & Drop Upload Zone Directly into Trending */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsTrendingDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsTrendingDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsTrendingDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFilesDroppedIntoTrending(e.dataTransfer.files);
              }
            }}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.multiple = true;
              input.accept = "image/*";
              input.onchange = (ev) => {
                const target = ev.target as HTMLInputElement;
                if (target.files && target.files.length > 0) {
                  handleFilesDroppedIntoTrending(target.files);
                }
              };
              input.click();
            }}
            className={cn(
              "relative border-2 border-dashed rounded-3xl p-6 transition-all text-center cursor-pointer group",
              isTrendingDragging
                ? "border-amber-400 bg-amber-500/10 scale-[1.005] shadow-xl shadow-amber-500/20"
                : "border-white/[0.08] bg-[#121324]/50 hover:border-amber-500/40 hover:bg-amber-500/[0.03]",
            )}
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                {isUploadingToTrending ? (
                  <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>
              <div className="text-center sm:text-left">
                <p className="text-sm font-bold text-foreground">
                  {isUploadingToTrending
                    ? "Uploading and adding stickers to Trending Drops..."
                    : "Drag & drop sticker files directly here to add them to Trending"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Files are automatically titled in Title Case and instantly published to the homepage Trending Drops.
                </p>
              </div>
            </div>
          </div>

          {/* Current Trending Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Currently Trending ({trendingStickerIds.length} Stickers)</span>
              </h3>
              <span className="text-xs text-muted-foreground">
                Drag or use arrows to re-order sequence on the homepage
              </span>
            </div>

            {trendingLoading ? (
              <div className="py-24 text-center text-sm text-muted-foreground">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                Loading trending stickers...
              </div>
            ) : trendingStickersList.length === 0 ? (
              <div className="py-20 text-center rounded-2xl border border-white/[0.08] bg-[#121324]/40 p-8">
                <Flame className="w-12 h-12 text-amber-400/40 mx-auto mb-3" />
                <h4 className="font-bold text-foreground text-base">No Stickers in Trending Yet</h4>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Add stickers using the button above or drag &amp; drop artwork directly into the upload area.
                </p>
                <button
                  onClick={() => setIsTrendingPickerOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add from Catalogue</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {trendingStickersList.map((sticker, idx) => (
                  <div
                    key={sticker.id}
                    className="relative group rounded-2xl border border-white/[0.08] bg-[#121324]/80 p-3.5 flex flex-col justify-between hover:border-amber-500/40 hover:bg-[#15172c] transition-all shadow-sm"
                  >
                    {/* Position Number Pill */}
                    <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm border border-white/[0.1] text-[9px] font-black text-amber-300 font-mono">
                      #{idx + 1}
                    </div>

                    {/* Quick Remove Button (X) */}
                    <button
                      onClick={() => handleRemoveFromTrending(sticker.id)}
                      className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-rose-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:scale-110 shadow-md cursor-pointer"
                      title="Remove from Homepage Trending"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>

                    <div>
                      {/* Artwork Preview */}
                      <div className="w-full aspect-square rounded-xl bg-black/40 overflow-hidden mb-2.5 flex items-center justify-center p-2">
                        <img
                          src={sticker.image_url}
                          alt={sticker.title}
                          className="w-full h-full object-contain drop-shadow transition-transform group-hover:scale-105"
                        />
                      </div>

                      {/* Title & Info */}
                      <h4 className="text-xs font-bold text-white truncate w-full mb-0.5">
                        {sticker.title}
                      </h4>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {sticker.categories?.name || "Sticker"}
                      </p>
                    </div>

                    {/* Footer Row with Price & Reorder Buttons */}
                    <div className="pt-2.5 mt-2 border-t border-white/[0.06] flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-foreground">
                        KSh {sticker.price || 100}
                      </span>

                      {/* Reorder Arrows */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveSticker(idx, -1)}
                          className="p-1 rounded-md bg-white/[0.05] hover:bg-white/[0.15] text-muted-foreground hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                          title="Move Left"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                        <button
                          disabled={idx === trendingStickersList.length - 1}
                          onClick={() => handleMoveSticker(idx, 1)}
                          className="p-1 rounded-md bg-white/[0.05] hover:bg-white/[0.15] text-muted-foreground hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                          title="Move Right"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW B: ALL CUSTOM STICKER PACKS */}
      {/* ==================================================================== */}
      {activeTab === "all-packs" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Search and Filters Toolbar */}
          <div className="bg-[#121324]/80 border border-white/[0.08] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search packs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 bg-[#16182c] border-white/[0.08] text-xs text-foreground placeholder:text-muted-foreground/60 rounded-xl"
              />
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {(["ALL", "published", "draft", "archived"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all shrink-0 cursor-pointer",
                    statusFilter === st
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30 font-bold"
                      : "bg-white/[0.03] text-muted-foreground hover:text-foreground hover:bg-white/[0.06] border border-white/[0.06]",
                  )}
                >
                  {st === "ALL" ? "All Packs" : st}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Packs Grid */}
          {packsLoading ? (
            <div className="py-24 text-center text-sm text-muted-foreground">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading sticker packs...
            </div>
          ) : packsError ? (
            <div className="py-16 text-center text-rose-400 text-sm">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-80" />
              Failed to load sticker packs.
            </div>
          ) : customPacks.length === 0 ? (
            <div className="py-20 text-center rounded-2xl border border-white/[0.08] bg-[#121324]/40 p-8">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-4">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="font-black text-foreground text-lg">No Custom Packs Yet</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-5 max-w-md mx-auto">
                Combine multiple stickers into themed bundles (e.g. Cartoon drops, Anime packs) to offer special bundle pricing.
              </p>
              <button
                onClick={() => {
                  setEditingPack(null);
                  setIsBuilderOpen(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Pack</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                    className="group relative rounded-2xl border border-white/[0.08] bg-[#121324]/80 p-5 hover:border-primary/40 hover:bg-[#141628] transition-all flex flex-col justify-between shadow-sm"
                  >
                    <div>
                      {/* Top Row: Badge & Status */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {pack.badge && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <Tag className="w-3 h-3" />
                              {pack.badge}
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
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
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors cursor-pointer border",
                            pack.status === "published"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
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

                      {/* Visual Preview Banner / Multi-Sticker Collage */}
                      <div className="relative w-full h-40 rounded-xl bg-black/40 border border-white/[0.06] overflow-hidden mb-4 flex items-center justify-center p-3">
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
                                  className="absolute w-20 h-20 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)] transition-transform group-hover:scale-110"
                                />
                              );
                            })}
                          </div>
                        ) : pack.cover_image_url ? (
                          <img
                            src={pack.cover_image_url}
                            alt={pack.title}
                            className="w-full h-full object-contain drop-shadow"
                          />
                        ) : (
                          <Package className="w-10 h-10 text-muted-foreground/40" />
                        )}
                      </div>

                      {/* Title & Slug */}
                      <h3 className="font-bold text-foreground text-base tracking-tight truncate group-hover:text-primary transition-colors">
                        {pack.title}
                      </h3>
                      <p className="text-[11px] font-mono text-muted-foreground/80 truncate mb-3">
                        /pack/{pack.slug}
                      </p>

                      {/* Included Stickers Mini Avatar Stack */}
                      {pack.stickers && pack.stickers.length > 0 && (
                        <div className="flex items-center gap-1.5 py-1 mb-3">
                          <div className="flex -space-x-2 overflow-hidden">
                            {pack.stickers.slice(0, 4).map((s) => (
                              <img
                                key={s.id}
                                src={s.image_url}
                                alt={s.title}
                                title={s.title}
                                className="inline-block h-6 w-6 rounded-full ring-2 ring-[#121324] object-contain bg-black/60"
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-medium pl-1">
                            {pack.stickers.length} stickers included
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Pricing & Actions */}
                    <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-black text-white font-mono">
                            KSh {pack.price}
                          </span>
                          {pack.compare_at_price && pack.compare_at_price > pack.price && (
                            <span className="text-xs text-muted-foreground line-through font-mono">
                              KSh {pack.compare_at_price}
                            </span>
                          )}
                        </div>
                        {savingsPercent > 0 && (
                          <span className="text-[10px] font-bold text-emerald-400">
                            Save {savingsPercent}% vs individual
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDuplicate(pack)}
                          className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-muted-foreground hover:text-white transition-colors cursor-pointer"
                          title="Duplicate pack"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingPack(pack);
                            setIsBuilderOpen(true);
                          }}
                          className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors cursor-pointer"
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
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
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
      {/* 1. Pack Builder Modal (For creating & editing packs) */}
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

      {/* 2. Trending Sticker Picker Modal (Fast 1-click add/remove from catalogue) */}
      <TrendingPickerModal
        open={isTrendingPickerOpen}
        onClose={() => setIsTrendingPickerOpen(false)}
        currentTrendingIds={trendingStickerIds}
        onToggleSticker={handleToggleStickerTrending}
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
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
      title="View Live Trending Section on Storefront"
    >
      <ExternalLink className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">View Live Storefront</span>
    </a>
  );
}
