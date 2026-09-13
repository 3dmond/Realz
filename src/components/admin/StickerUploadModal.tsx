import React, { useState } from "react";
import { Sparkles, X, UploadCloud, CheckCircle2, EyeOff, Folder, ImageIcon } from "lucide-react";
import ImageDropzone from "@/components/admin/ImageDropzone";
import MediaPickerModal from "@/components/admin/MediaPickerModal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ProductStatus } from "@/lib/admin-api";

interface StickerUploadModalProps {
  open: boolean;
  onClose: () => void;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  onSave: (payload: {
    title: string;
    category_id: number;
    image_url: string;
    image_storage_key: string;
    description?: string;
    status: ProductStatus;
  }) => Promise<void>;
}

export default function StickerUploadModal({
  open,
  onClose,
  categoryId,
  categoryName,
  categorySlug,
  onSave,
}: StickerUploadModalProps) {
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [storageKey, setStorageKey] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProductStatus>("published");
  const [saving, setSaving] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  if (!open) return null;

  const inferTitleFromFilename = (filename: string): string => {
    return filename
      .replace(/\.[^/.]+$/, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  const handleImageUploaded = ({
    publicUrl,
    storageKey: key,
  }: {
    publicUrl: string;
    storageKey: string;
  }) => {
    setImageUrl(publicUrl);
    setStorageKey(key);

    const filename = key.split("/").pop() || "";
    if (!title.trim() && filename) {
      setTitle(inferTitleFromFilename(filename));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) return;
    if (!title.trim()) return;

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        category_id: categoryId,
        image_url: imageUrl.trim(),
        image_storage_key: storageKey.trim(),
        description: description.trim() || undefined,
        status,
      });
      setTitle("");
      setImageUrl("");
      setStorageKey("");
      setDescription("");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
        <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0f101f] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4 bg-[#121324]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Add Sticker to {categoryName}</h3>
                <p className="text-[11px] font-mono text-primary flex items-center gap-1 mt-0.5">
                  <Folder className="h-3 w-3" />
                  Target: stickers/{categorySlug}/
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            {/* Artwork Dropzone */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">
                  Sticker Artwork <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setMediaPickerOpen(true)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Choose from Library</span>
                </button>
              </div>

              <ImageDropzone
                folder={categorySlug}
                currentImageUrl={imageUrl}
                value={imageUrl}
                onImageUploaded={handleImageUploaded}
                onChange={(url) => setImageUrl(url)}
                onClearImage={() => {
                  setImageUrl("");
                  setStorageKey("");
                }}
              />
              {storageKey && (
                <p className="text-[10px] font-mono text-muted-foreground truncate">
                  Storage key: <span className="text-foreground">{storageKey}</span>
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
                placeholder="e.g. Cyber Samurai Holographic"
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
                placeholder="Short note or theme details..."
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
                disabled={saving || !imageUrl || !title.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <div className="h-3.5 w-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UploadCloud className="h-3.5 w-3.5" />
                )}
                Save Sticker
              </button>
            </div>
          </form>
        </div>
      </div>

      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        defaultFolder={categorySlug}
        onSelectArtwork={(artwork) => {
          setImageUrl(artwork.publicUrl);
          setStorageKey(artwork.storageKey);
          if (!title.trim()) {
            setTitle(inferTitleFromFilename(artwork.name));
          }
        }}
      />
    </>
  );
}