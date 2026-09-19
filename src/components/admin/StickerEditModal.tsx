import React, { useState, useEffect } from "react";
import { Sparkles, X, Save, CheckCircle2, EyeOff, Trash2, Tag, Percent, ShieldCheck } from "lucide-react";
import ImageDropzone from "@/components/admin/ImageDropzone";
import { Input } from "@/components/ui/input";
import { cn, formatStickerTitleFromFilename } from "@/lib/utils";
import type { AdminProduct, ProductStatus, Subcategory } from "@/lib/admin-api";

interface StickerEditModalProps {
  open: boolean;
  onClose: () => void;
  product: AdminProduct | null;
  categorySlug: string;
  subcategories?: Subcategory[];
  onSave: (id: number, payload: {
    title: string;
    description?: string;
    image_url: string;
    image_storage_key?: string;
    subcategory_id?: number | null;
    status: ProductStatus;
    price?: number;
  }) => Promise<void>;
  onMoveToBin?: (id: number) => Promise<void>;
}

export default function StickerEditModal({
  open,
  onClose,
  product,
  categorySlug,
  subcategories = [],
  onSave,
  onMoveToBin,
}: StickerEditModalProps) {
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [storageKey, setStorageKey] = useState("");
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [status, setStatus] = useState<ProductStatus>("published");
  const [price, setPrice] = useState<number>(15.5);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const costPrice = product?.cost_price ?? 6.0;

  useEffect(() => {
    if (product) {
      setTitle(product.title || "");
      setImageUrl(product.image_url || "");
      setStorageKey(product.image_storage_key || "");
      setSubcategoryId(product.subcategory_id ?? null);
      const resStatus: ProductStatus =
        product.status || (product.is_active === false ? "archived" : "published");
      setStatus(resStatus === "archived" ? "draft" : resStatus);

      const prodPrice = product.price ?? 15.5;
      setPrice(prodPrice);
      if (prodPrice < 15.5) {
        setDiscountPercent(Math.round(((15.5 - prodPrice) / 15.5) * 100));
      } else {
        setDiscountPercent(0);
      }
    }
  }, [product]);

  if (!open || !product) return null;

  const handleDiscountPercentChange = (pct: number) => {
    const validPct = Math.min(60, Math.max(0, Math.round(pct)));
    setDiscountPercent(validPct);
    if (validPct === 0) {
      setPrice(15.5);
    } else {
      const discounted = Number((15.5 * (1 - validPct / 100)).toFixed(2));
      setPrice(Math.max(costPrice, discounted));
    }
  };

  const handlePriceChange = (val: number) => {
    if (isNaN(val)) return;
    const clamped = Math.min(15.5, Math.max(costPrice, Number(val.toFixed(2))));
    setPrice(clamped);
    if (clamped >= 15.5) {
      setDiscountPercent(0);
    } else {
      setDiscountPercent(Math.round(((15.5 - clamped) / 15.5) * 100));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim()) return;

    setSaving(true);
    try {
      await onSave(product.id, {
        title: title.trim(),
        image_url: imageUrl.trim(),
        image_storage_key: storageKey.trim() || undefined,
        subcategory_id: subcategoryId,
        status,
        price,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0f101f] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4 bg-[#121324]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Edit Sticker</h3>
              <p className="text-[11px] font-mono text-muted-foreground">ID: #{product.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Artwork Preview & Replace */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Sticker Artwork</label>
            <ImageDropzone
              folder={categorySlug}
              currentImageUrl={imageUrl}
              value={imageUrl}
              onImageUploaded={({ publicUrl, storageKey: key }) => {
                setImageUrl(publicUrl);
                setStorageKey(key);
              }}
              onChange={(url) => setImageUrl(url)}
              onClearImage={() => {
                setImageUrl("");
                setStorageKey("");
              }}
            />
            {storageKey && (
              <p className="text-[10px] font-mono text-muted-foreground truncate">
                Key: <span className="text-foreground">{storageKey}</span>
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              Display Title <span className="text-rose-400">*</span>
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white/[0.04] border-white/[0.1] rounded-xl text-sm"
            />
          </div>

          {/* Subcategory */}
          {subcategories.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Subcategory</label>
              <select
                value={subcategoryId || ""}
                onChange={(e) => setSubcategoryId(e.target.value ? Number(e.target.value) : null)}
                className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs font-medium text-foreground focus:outline-none"
              >
                <option value="">None (Category Root)</option>
                {subcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Catalogue Status</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus("published")}
                className={cn(
                  "p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer",
                  status === "published"
                    ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400 shadow-sm"
                    : "border-white/[0.08] text-muted-foreground hover:bg-white/[0.04]",
                )}
              >
                <CheckCircle2 className="w-4 h-4" />
                Published (Live)
              </button>
              <button
                type="button"
                onClick={() => setStatus("draft")}
                className={cn(
                  "p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer",
                  status === "draft"
                    ? "bg-amber-500/15 border-amber-500/50 text-amber-400 shadow-sm"
                    : "border-white/[0.08] text-muted-foreground hover:bg-white/[0.04]",
                )}
              >
                <EyeOff className="w-4 h-4" />
                Draft (Hidden)
              </button>
            </div>
          </div>

          {/* Pricing & Discount */}
          <div className="space-y-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Sticker Pricing & Discount</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-muted-foreground">
                Base Tier 1: 15.50 KSh
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Discount Percentage */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                  <span>Discount (%)</span>
                  {discountPercent > 0 && (
                    <span className="text-[10px] font-bold text-emerald-400">
                      Saving {(15.5 - price).toFixed(2)} KSh
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    step="1"
                    value={discountPercent}
                    onChange={(e) => handleDiscountPercentChange(Number(e.target.value))}
                    className="bg-white/[0.04] border-white/[0.1] rounded-xl text-xs pr-7 font-mono font-bold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">
                    %
                  </span>
                </div>
              </div>

              {/* Discounted Price */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                  <span>Selling Price</span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Min floor {costPrice.toFixed(2)}
                  </span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min={costPrice}
                    max="15.5"
                    step="0.01"
                    value={price}
                    onChange={(e) => handlePriceChange(Number(e.target.value))}
                    className="bg-white/[0.04] border-white/[0.1] rounded-xl text-xs pr-11 font-mono font-bold text-primary"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold">
                    KSh
                  </span>
                </div>
              </div>
            </div>

            {/* Quick discount preset pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {[0, 10, 15, 20, 25, 30].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleDiscountPercentChange(pct)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                    discountPercent === pct
                      ? "bg-primary text-primary-foreground shadow-[0_0_10px_var(--color-primary-glow)] font-black"
                      : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground border border-white/[0.06]",
                  )}
                >
                  {pct === 0 ? "No Discount" : `${pct}% Off`}
                </button>
              ))}
            </div>

            {/* Price Manipulation Protection Callout */}
            <div className="text-[10px] text-muted-foreground/80 flex items-start gap-1.5 leading-snug pt-1 border-t border-white/[0.04]">
              <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <span>
                Discount is locked to Tier 1 base (15.50 KSh) to prevent client bulk-discount stacking abuse in Tier 2 and Tier 3.
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 flex items-center justify-between gap-2.5 border-t border-white/[0.08]">
            {onMoveToBin ? (
              <button
                type="button"
                onClick={async () => {
                  if (
                    window.confirm(
                      `Move "${product.title}" to the Recycle Bin? It will be hidden from the storefront.`,
                    )
                  ) {
                    await onMoveToBin(product.id);
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Move to Bin</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-white/[0.05] hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !title.trim() || !imageUrl.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <div className="h-3.5 w-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}