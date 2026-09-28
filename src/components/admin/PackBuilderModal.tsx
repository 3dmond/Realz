import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Package,
  Search,
  Check,
  Tag,
  Layers,
  AlertCircle,
  Filter,
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

// Realz base retail sticker tier is KSh 15.50
const BASE_STICKER_RETAIL_VALUE = 15.50;

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
    queryFn: () => fetchAdminProducts({ pageSize: 500 }),
    enabled: open,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: fetchAdminCategories,
    enabled: open,
  });

  const allProducts = useMemo(() => productsData?.products || [], [productsData]);

  // Map of products for fast O(1) lookup
  const productMap = useMemo(() => {
    const map = new Map<number, AdminProduct>();
    allProducts.forEach((p) => map.set(p.id, p));
    return map;
  }, [allProducts]);

  // Sync edit mode
  useEffect(() => {
    if (!open) return;

    if (packToEdit) {
      setTitle(packToEdit.title);
      setSlug(packToEdit.slug || "");
      setBadge(packToEdit.badge || "");
      setPrice(String(packToEdit.price || "350"));
      setStatus(packToEdit.status || "published");
      setCoverImageUrl(packToEdit.cover_image_url || "");
      setSelectedStickerIds(packToEdit.sticker_ids || []);
    } else {
      setTitle("");
      setSlug("");
      setBadge("HOT DROP");
      setPrice("350");
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

  // Selected stickers list
  const selectedStickers = useMemo(() => {
    return selectedStickerIds
      .map((id) => productMap.get(id))
      .filter((p): p is AdminProduct => !!p);
  }, [selectedStickerIds, productMap]);

  // Bundle yield & savings calculations based on Realz base tier (KSh 15.50)
  const numPrice = Number(price) || 0;
  const baseValue = Math.round(selectedStickerIds.length * BASE_STICKER_RETAIL_VALUE);
  const savingsAmount = baseValue > numPrice ? baseValue - numPrice : 0;
  const discountPercent =
    baseValue > 0 && savingsAmount > 0
      ? Math.round((savingsAmount / baseValue) * 100)
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
        compare_at_price: baseValue > finalPrice ? baseValue : undefined,
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
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* 2-Column Split Workspace */}
      <div className="relative z-10 w-full max-w-6xl h-[90vh] flex flex-col rounded-xl border border-white/[0.1] bg-[#0c0d18] shadow-2xl text-foreground overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Strip */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-[#090a13] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-primary">
              <Package className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                {packToEdit ? "Edit Sticker Pack" : "Create Sticker Pack"}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground border border-white/[0.08]">
                {selectedStickerIds.length} stickers selected
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-white/[0.05] hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 40 / 60 Split Workspace Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          {/* ================================================================ */}
          {/* LEFT 40%: Pack Envelope & Commercial Configuration (5 cols)     */}
          {/* ================================================================ */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-white/[0.06] overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#0a0b14]">
            {/* Title & Slug */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Pack Title <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Starter 5-Pack, Cyberpunk Drop..."
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="bg-[#090a13] border-white/[0.08] text-xs h-8 text-foreground rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                    URL Slug
                  </label>
                  <Input
                    type="text"
                    placeholder="pack-slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="bg-[#090a13] border-white/[0.08] text-xs h-8 text-muted-foreground font-mono rounded-md"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                    Badge Pill
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. HOT DROP"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    className="bg-[#090a13] border-white/[0.08] text-xs h-8 text-foreground rounded-md"
                  />
                </div>
              </div>

              {/* Badge Presets */}
              <div className="flex flex-wrap items-center gap-1">
                {BADGE_PRESETS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBadge(b)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer border",
                      badge === b
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "bg-white/[0.03] text-muted-foreground border-white/[0.06] hover:bg-white/[0.06] hover:text-foreground",
                    )}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Commercial Pricing Card */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <span className="text-xs font-semibold text-foreground">
                  Bundle Commercials
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  KES
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Pack Selling Price:</span>
                  <span className="font-mono text-foreground font-bold">
                    KSh {numPrice}
                  </span>
                </div>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="350"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="bg-[#090a13] border-white/[0.08] text-sm font-bold text-foreground h-8.5 rounded-md font-mono"
                />
              </div>

              {/* Yield & Savings Telemetry */}
              <div className="text-xs space-y-1.5 pt-1 text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Base Catalogue Value:</span>
                  <span className="font-mono text-foreground font-medium">
                    KSh {baseValue}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground/80">
                  {selectedStickerIds.length} stickers @ standard KSh 15.50 base tier
                </div>

                {discountPercent > 0 ? (
                  <div className="flex items-center justify-between text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2.5 py-1 text-[11px] mt-1">
                    <span>Bundle Savings:</span>
                    <span className="font-mono font-bold">
                      Save KSh {savingsAmount} ({discountPercent}%)
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground/60 py-0.5">
                    No bundle discount at this price.
                  </div>
                )}
              </div>

              {/* Status Toggle */}
              <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Storefront Status:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setStatus("published")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                      status === "published"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Published
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("draft")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                      status === "draft"
                        ? "bg-white/[0.08] text-foreground border border-white/[0.12]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Draft
                  </button>
                </div>
              </div>
            </div>

            {/* Selected Stickers Tray */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">
                    Pack Items ({selectedStickerIds.length})
                  </span>
                </div>
                {selectedStickerIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedStickerIds([])}
                    className="text-[11px] text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {selectedStickerIds.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-white/[0.08] rounded-lg bg-black/20">
                  Select at least 2 stickers from the catalogue on the right.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
                  {selectedStickers.map((sticker) => (
                    <div
                      key={sticker.id}
                      className="relative group rounded-lg border border-white/[0.06] bg-[#070810] p-1.5 flex flex-col items-center text-center"
                    >
                      <div className="w-full aspect-square rounded overflow-hidden bg-black/40 mb-1 flex items-center justify-center p-1">
                        <img
                          src={sticker.image_url}
                          alt={sticker.title}
                          className="w-full h-full object-contain pointer-events-none"
                        />
                      </div>
                      <span className="text-[10px] font-medium text-foreground truncate w-full">
                        {sticker.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSticker(sticker.id)}
                        className="absolute -top-1 -right-1 h-4.5 w-4.5 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                        title="Remove from pack"
                      >
                        <X className="w-3 h-3 stroke-[2.5]" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ================================================================ */}
          {/* RIGHT 60%: Interactive Sticker Catalogue Browser (7 cols)       */}
          {/* ================================================================ */}
          <div className="lg:col-span-7 flex flex-col min-h-0 bg-[#0c0d18]">
            {/* Filter Toolbar */}
            <div className="p-3.5 border-b border-white/[0.06] bg-[#0e0f1b] flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search stickers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-[#090a13] border-white/[0.08] text-xs h-8 pl-8 text-foreground placeholder:text-muted-foreground/60 rounded-md"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <select
                  value={selectedCategory}
                  onChange={(e) =>
                    setSelectedCategory(
                      e.target.value === "ALL" ? "ALL" : Number(e.target.value),
                    )
                  }
                  className="bg-[#090a13] border border-white/[0.08] text-xs h-8 rounded-md px-2.5 text-foreground focus:outline-none focus:border-primary w-full sm:w-auto cursor-pointer"
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

            {/* Sticker Catalogue Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {prodsLoading ? (
                <div className="py-20 text-center text-xs text-muted-foreground">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading sticker catalogue...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-white/[0.08] rounded-xl bg-[#0e0f1b]/50">
                  No stickers found matching your search.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {filteredProducts.map((prod) => {
                    const isSelected = selectedStickerIds.includes(prod.id);
                    return (
                      <div
                        key={prod.id}
                        onClick={() => toggleSticker(prod.id)}
                        className={cn(
                          "relative rounded-xl border p-2 flex flex-col items-center text-center cursor-pointer transition-all duration-150 select-none group",
                          isSelected
                            ? "border-primary bg-primary/[0.08] ring-1 ring-primary/40"
                            : "border-white/[0.06] bg-[#0e0f1b] hover:border-white/[0.16] hover:bg-[#121324]",
                        )}
                      >
                        <div className="relative w-full aspect-square rounded-lg bg-[#070810] border border-white/[0.04] overflow-hidden mb-1.5 flex items-center justify-center p-2">
                          <img
                            src={prod.image_url}
                            alt={prod.title}
                            className="w-full h-full object-contain pointer-events-none"
                            loading="lazy"
                          />

                          {/* Selected Checkmark Badge */}
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        <span className="text-[11px] font-semibold text-foreground truncate w-full mb-0.5">
                          {prod.title}
                        </span>

                        {/* Category Label - ZERO UNIT PRICE TAGS */}
                        <span className="text-[10px] text-muted-foreground truncate w-full">
                          {prod.categories?.name || "Sticker"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="px-5 py-3 border-t border-white/[0.06] bg-[#090a13] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div>
            {selectedStickerIds.length < 2 ? (
              <span className="text-amber-400 font-medium text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Select at least 2 stickers to create a pack.
              </span>
            ) : (
              <span className="text-emerald-400 font-medium text-xs flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                {selectedStickerIds.length} stickers selected ({discountPercent}% savings)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || selectedStickerIds.length < 2}
              className="flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Pack...</span>
                </>
              ) : (
                <>
                  <Package className="w-3.5 h-3.5" />
                  <span>{packToEdit ? "Update Pack" : "Save Sticker Pack"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
