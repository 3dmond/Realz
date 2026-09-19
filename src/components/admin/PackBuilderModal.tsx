import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Sparkles,
  Package,
  Search,
  Check,
  Plus,
  Trash2,
  Tag,
  DollarSign,
  Layers,
  Percent,
  Eye,
  EyeOff,
  Image as ImageIcon,
  AlertCircle,
} from "lucide-react";
import {
  fetchAdminProducts,
  fetchAdminCategories,
  type AdminProduct,
  type StickerPack,
  type ProductStatus,
} from "@/lib/admin-api";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PackBuilderModalProps {
  open: boolean;
  onClose: () => void;
  packToEdit?: StickerPack | null;
  onSave: (payload: {
    title: string;
    slug?: string;
    description?: string;
    badge?: string;
    price: number;
    compare_at_price?: number;
    cover_image_url?: string;
    status: ProductStatus;
    sticker_ids: number[];
  }) => Promise<void>;
}

const BADGE_PRESETS = [
  "HOT DROP",
  "BEST VALUE",
  "LIMITED EDITION",
  "STAFF PICK",
  "NEW DROP",
  "POPULAR",
];

export default function PackBuilderModal({
  open,
  onClose,
  packToEdit,
  onSave,
}: PackBuilderModalProps) {
  // Form State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [badge, setBadge] = useState("");
  const [price, setPrice] = useState<string>("350");
  const [compareAtPrice, setCompareAtPrice] = useState<string>("");
  const [status, setStatus] = useState<ProductStatus>("published");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [selectedStickerIds, setSelectedStickerIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sticker Selector Filter State
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | "ALL">("ALL");

  // Fetch available stickers from store
  const { data: productsData, isLoading: prodsLoading } = useQuery({
    queryKey: ["admin-products-for-packs"],
    queryFn: () => fetchAdminProducts({ pageSize: 300 }),
    enabled: open,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: fetchAdminCategories,
    enabled: open,
  });

  const allProducts = useMemo(() => productsData?.products || [], [productsData]);

  // Sync edit mode
  useEffect(() => {
    if (!open) return;

    if (packToEdit) {
      setTitle(packToEdit.title);
      setSlug(packToEdit.slug || "");
      setBadge(packToEdit.badge || "");
      setPrice(String(packToEdit.price || "350"));
      setCompareAtPrice(packToEdit.compare_at_price ? String(packToEdit.compare_at_price) : "");
      setStatus(packToEdit.status || "published");
      setCoverImageUrl(packToEdit.cover_image_url || "");
      setSelectedStickerIds(packToEdit.sticker_ids || []);
    } else {
      setTitle("");
      setSlug("");
      setBadge("HOT DROP");
      setPrice("350");
      setCompareAtPrice("");
      setStatus("published");
      setCoverImageUrl("");
      setSelectedStickerIds([]);
    }
  }, [open, packToEdit]);

  // Auto-generate slug from title
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!packToEdit) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
      );
    }
  };

  // Filtered Stickers for Selector
  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      if (selectedCategory !== "ALL" && p.category_id !== selectedCategory) {
        return false;
      }
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        return (
          p.title.toLowerCase().includes(query) ||
          (p.categories?.name && p.categories.name.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [allProducts, selectedCategory, search]);

  // Map of selected stickers objects
  const selectedStickers = useMemo(() => {
    return selectedStickerIds
      .map((id) => allProducts.find((p) => p.id === id))
      .filter((p): p is AdminProduct => !!p);
  }, [selectedStickerIds, allProducts]);

  // Calculate total individual sticker value
  const totalIndividualValue = useMemo(() => {
    return selectedStickers.reduce((sum, p) => sum + (Number(p.price) || 100), 0);
  }, [selectedStickers]);

  // Calculate discount percentage
  const numPrice = Number(price) || 0;
  const numCompare = Number(compareAtPrice) || totalIndividualValue;
  const savingsAmount = numCompare > numPrice ? numCompare - numPrice : 0;
  const discountPercent =
    numCompare > 0 && savingsAmount > 0
      ? Math.round((savingsAmount / numCompare) * 100)
      : 0;

  // Toggle sticker selection
  const toggleSticker = (id: number) => {
    setSelectedStickerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const removeSticker = (id: number) => {
    setSelectedStickerIds((prev) => prev.filter((item) => item !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a title for the sticker pack.");
      return;
    }

    if (selectedStickerIds.length < 2) {
      toast.error("A sticker pack must contain at least 2 stickers.");
      return;
    }

    const finalPrice = Number(price);
    if (isNaN(finalPrice) || finalPrice <= 0) {
      toast.error("Please enter a valid pack price.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        title: title.trim(),
        slug: slug.trim() || undefined,
        badge: badge.trim() || undefined,
        price: finalPrice,
        compare_at_price: numCompare > finalPrice ? numCompare : undefined,
        cover_image_url:
          coverImageUrl.trim() ||
          (selectedStickers[0]?.image_url || ""),
        status,
        sticker_ids: selectedStickerIds,
      });

      toast.success(
        packToEdit
          ? `Pack "${title}" updated successfully!`
          : `Sticker Pack "${title}" created with ${selectedStickerIds.length} stickers!`,
      );
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save sticker pack";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border border-white/[0.12] bg-[#0e0f1a] shadow-2xl shadow-purple-950/40 text-foreground overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#121324]/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/20 border border-primary/30 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>{packToEdit ? "Edit Sticker Pack" : "Create Sticker Pack"}</span>
                <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Bundle Builder
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Combine multiple stickers from your catalogue into a curated pack with bundle pricing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-muted-foreground hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Section: Pack Details & Pricing */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Title, Badge, Description */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Pack Title <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Adult Cartoons Starter 5-Pack, Tokyo Streetwear Drop..."
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  required
                  className="bg-[#16182c] border-white/[0.1] text-sm h-10 text-white placeholder:text-muted-foreground/60 focus-visible:ring-primary font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    URL Slug
                  </label>
                  <Input
                    type="text"
                    placeholder="adult-cartoons-5-pack"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="bg-[#16182c] border-white/[0.1] text-xs h-9 text-purple-300 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Promo Badge Tag
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. HOT DROP, 30% OFF..."
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    className="bg-[#16182c] border-white/[0.1] text-xs h-9 text-amber-300 font-bold"
                  />
                </div>
              </div>

              {/* Quick Badge Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">
                  Preset Badges:
                </span>
                {BADGE_PRESETS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBadge(b)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border",
                      badge === b
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-white/[0.03] text-muted-foreground border-white/[0.08] hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Right 1 Col: Pricing Engine Card */}
            <div className="rounded-2xl border border-white/[0.1] bg-[#141628]/80 p-4 space-y-3 flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                    <span>Bundle Pricing</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                    KES / KSh
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Pack Price:</span>
                    <span className="font-mono text-white font-bold">KSh {price || 0}</span>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="350"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    className="bg-[#1c1f38] border-primary/40 text-base font-black text-white h-10"
                  />
                </div>

                <div className="pt-1 text-xs space-y-1.5 text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Individual Stickers Value:</span>
                    <span className="font-mono font-semibold text-foreground">
                      KSh {totalIndividualValue}
                    </span>
                  </div>

                  {discountPercent > 0 && (
                    <div className="flex items-center justify-between text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-1">
                      <span className="flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        <span>Savings:</span>
                      </span>
                      <span>
                        Save KSh {savingsAmount} ({discountPercent}% OFF)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Toggle */}
              <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">Status:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStatus("published")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      status === "published"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Published
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("draft")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      status === "draft"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Draft
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Selected Stickers Strip */}
          <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-purple-200">
                  Selected Stickers in Pack ({selectedStickerIds.length})
                </h3>
              </div>
              {selectedStickerIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedStickerIds([])}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-bold transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {selectedStickerIds.length === 0 ? (
              <div className="py-6 text-center text-xs text-purple-300/70 border border-dashed border-purple-500/30 rounded-xl bg-purple-950/10">
                No stickers selected yet. Click any stickers in the catalogue below to combine them into this pack!
              </div>
            ) : (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                {selectedStickers.map((sticker, idx) => (
                  <div
                    key={sticker.id}
                    className="relative group shrink-0 w-24 rounded-xl border border-white/[0.12] bg-[#16182c] p-2 flex flex-col items-center text-center shadow-sm"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-black/40 mb-1.5 flex items-center justify-center">
                      <img
                        src={sticker.image_url}
                        alt={sticker.title}
                        className="w-full h-full object-contain drop-shadow"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-white truncate w-full leading-tight">
                      {sticker.title}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-mono">
                      KSh {sticker.price || 100}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSticker(sticker.id)}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md cursor-pointer hover:bg-rose-500"
                      title="Remove from pack"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 right-1 text-[8px] font-black text-muted-foreground/60">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Interactive Sticker Catalogue Picker */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Pick Stickers to Combine
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Click on stickers to add or remove them from this bundle.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative w-48 sm:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search sticker..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-[#16182c] border-white/[0.08] text-xs h-8 pl-8 text-white placeholder:text-muted-foreground/60"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) =>
                    setSelectedCategory(
                      e.target.value === "ALL" ? "ALL" : Number(e.target.value),
                    )
                  }
                  className="bg-[#16182c] border border-white/[0.08] text-xs h-8 rounded-lg px-2.5 text-muted-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sticker Grid Picker */}
            {prodsLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading sticker catalogue...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground border border-dashed border-white/[0.08] rounded-xl bg-[#141628]/30">
                No stickers found matching your search.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-72 overflow-y-auto p-1 scrollbar-thin">
                {filteredProducts.map((prod) => {
                  const isSelected = selectedStickerIds.includes(prod.id);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => toggleSticker(prod.id)}
                      className={cn(
                        "relative rounded-xl border p-2 flex flex-col items-center text-center cursor-pointer transition-all select-none group",
                        isSelected
                          ? "border-primary bg-primary/10 shadow-[0_0_12px_rgba(139,92,246,0.3)] scale-[1.02]"
                          : "border-white/[0.08] bg-[#141628]/50 hover:border-white/[0.2] hover:bg-[#181a30]",
                      )}
                    >
                      <div className="relative w-full aspect-square rounded-lg bg-black/40 overflow-hidden mb-1.5 flex items-center justify-center">
                        <img
                          src={prod.image_url}
                          alt={prod.title}
                          className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px] flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/50">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          </div>
                        )}
                      </div>

                      <span className="text-[11px] font-bold text-white truncate w-full">
                        {prod.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        KSh {prod.price || 100}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {selectedStickerIds.length < 2 ? (
                <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Select at least 2 stickers to create a pack.
                </span>
              ) : (
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  Ready to save pack with {selectedStickerIds.length} stickers!
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-white bg-white/[0.05] hover:bg-white/[0.1] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || selectedStickerIds.length < 2}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving Pack...</span>
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4" />
                    <span>{packToEdit ? "Update Sticker Pack" : "Create Sticker Pack"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
