import React, { useState, useEffect } from "react";
import { Sparkles, X, Save, CheckCircle2, EyeOff } from "lucide-react";
import ImageDropzone from "@/components/admin/ImageDropzone";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AdminProduct, ProductStatus } from "@/lib/admin-api";

interface StickerEditModalProps {
  open: boolean;
  onClose: () => void;
  product: AdminProduct | null;
  categorySlug: string;
  onSave: (id: number, payload: {
    title: string;
    description?: string;
    image_url: string;
    image_storage_key?: string;
    status: ProductStatus;
  }) => Promise<void>;
}

export default function StickerEditModal({
  open,
  onClose,
  product,
  categorySlug,
  onSave,
}: StickerEditModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [storageKey, setStorageKey] = useState("");
  const [status, setStatus] = useState<ProductStatus>("published");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setTitle(product.title || "");
      setDescription(product.description || "");
      setImageUrl(product.image_url || "");
      setStorageKey(product.image_storage_key || "");
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
        status,
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

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">Description</label>
              <span className="text-[10px] text-muted-foreground">Optional</span>
            </div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="bg-white/[0.04] border-white/[0.1] rounded-xl text-xs resize-none"
            />
          </div>

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

          {/* Footer */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-white/[0.08]">
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
        </form>
      </div>
    </div>
  );
}