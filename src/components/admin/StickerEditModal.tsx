import React, { useState, useEffect } from "react";
import {
  Edit2,
  X,
  Save,
  CheckCircle2,
  EyeOff,
  Trash2,
  Folder,
  Layers,
  Info,
} from "lucide-react";
import ImageDropzone from "@/components/admin/ImageDropzone";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AdminProduct, ProductStatus, Subcategory } from "@/lib/admin-api";

interface StickerEditModalProps {
  open: boolean;
  onClose: () => void;
  product: AdminProduct | null;
  categorySlug: string;
  subcategories?: Subcategory[];
  onSave: (
    id: number,
    payload: {
      title: string;
      description?: string;
      image_url: string;
      image_storage_key?: string;
      subcategory_id?: number | null;
      status: ProductStatus;
      price?: number;
    },
  ) => Promise<void>;
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
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [storageKey, setStorageKey] = useState("");
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [status, setStatus] = useState<ProductStatus>("published");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setTitle(product.title || "");
      setDescription(product.description || "");
      setImageUrl(product.image_url || "");
      setStorageKey(product.image_storage_key || "");
      setSubcategoryId(product.subcategory_id ?? null);
      const resStatus: ProductStatus =
        product.status || (product.is_active === false ? "archived" : "published");
      setStatus(resStatus === "archived" ? "draft" : resStatus);
    }
  }, [product]);

  if (!open || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim()) return;

    setSaving(true);
    try {
      await onSave(product.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        image_url: imageUrl.trim(),
        image_storage_key: storageKey.trim() || undefined,
        subcategory_id: subcategoryId,
        status,
        price: product.price ?? 15.5,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-xl border border-white/[0.1] bg-[#0c0d18] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5 bg-[#090a13] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08] text-primary">
              <Edit2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Edit Sticker</h3>
              <p className="text-[11px] font-mono text-muted-foreground">ID: #{product.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-white/[0.05] hover:text-foreground cursor-pointer transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Artwork Preview & Replace */}
          <div className="space-y-1.5">
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
                Storage: <span className="text-foreground">{storageKey}</span>
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Display Title <span className="text-rose-400">*</span>
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-[#090a13] border-white/[0.08] rounded-md text-xs font-medium h-8"
              placeholder="e.g. Naruto Sage Mode Cutout"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center justify-between">
              <span>Description</span>
              <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-2.5 py-1.5 rounded-md bg-[#090a13] border border-white/[0.08] text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-muted-foreground/40"
              placeholder="Sticker details or tags..."
            />
          </div>

          {/* Subcategory */}
          {subcategories.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Subcategory Folder</span>
              </label>
              <select
                value={subcategoryId || ""}
                onChange={(e) => setSubcategoryId(e.target.value ? Number(e.target.value) : null)}
                className="w-full h-8.5 px-2.5 rounded-md bg-[#090a13] border border-white/[0.08] text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="">None (Category Root: {categorySlug})</option>
                {subcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({categorySlug}/{sub.slug})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Catalogue Publication Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Catalogue State</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus("published")}
                className={cn(
                  "p-2.5 rounded-md border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
                  status === "published"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.04]",
                )}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Published (Live)</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus("draft")}
                className={cn(
                  "p-2.5 rounded-md border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer",
                  status === "draft"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                    : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.04]",
                )}
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Draft (Hidden)</span>
              </button>
            </div>
          </div>

          {/* Storefront Dynamic Tier Pricing Note */}
          <div className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-foreground">Storewide Tier Pricing Active</span>
              <p className="text-[11px] text-muted-foreground">
                Pricing is determined dynamically by cart volume: 15.50 KSh base (1–20), 13.49 KSh volume (21–45), 10.99 KSh wholesale (46+). Individual stickers do not require price overrides.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between gap-2 border-t border-white/[0.06]">
            {onMoveToBin ? (
              <button
                type="button"
                onClick={async () => {
                  if (
                    window.confirm(
                      `Move "${product.title}" to the Recycle Bin? It will be archived and hidden from the storefront.`,
                    )
                  ) {
                    await onMoveToBin(product.id);
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors cursor-pointer"
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
                className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-white/[0.04] hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !title.trim() || !imageUrl.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
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