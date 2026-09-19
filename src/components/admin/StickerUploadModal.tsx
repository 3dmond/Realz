import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  X,
  UploadCloud,
  CheckCircle2,
  EyeOff,
  Folder,
  ImageIcon,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Layers,
} from "lucide-react";
import MediaPickerModal from "@/components/admin/MediaPickerModal";
import { Input } from "@/components/ui/input";
import {
  cn,
  formatStickerTitleFromFilename,
  extractErrorMessage,
} from "@/lib/utils";
import { imageStorageService } from "@/lib/storage-service";
import { createProduct, type ProductStatus, type Subcategory } from "@/lib/admin-api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface StickerUploadModalProps {
  open: boolean;
  onClose: () => void;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  subcategories?: Subcategory[];
  defaultSubcategoryId?: number | null;
  initialFiles?: File[];
  onSave?: (payload: {
    title: string;
    category_id: number;
    subcategory_id?: number | null;
    image_url: string;
    image_storage_key: string;
    status: ProductStatus;
  }) => Promise<void>;
}

interface QueuedItem {
  id: string;
  file: File;
  previewUrl: string;
  title: string;
  status: "idle" | "uploading" | "success" | "error";
  errorMessage?: string;
}

export default function StickerUploadModal({
  open,
  onClose,
  categoryId,
  categoryName,
  categorySlug,
  subcategories = [],
  defaultSubcategoryId = null,
  initialFiles = [],
  onSave,
}: StickerUploadModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<QueuedItem[]>([]);
  const [libraryItem, setLibraryItem] = useState<{
    url: string;
    storageKey: string;
    title: string;
  } | null>(null);

  const [status, setStatus] = useState<ProductStatus>("published");
  const [subcategoryId, setSubcategoryId] = useState<number | null>(defaultSubcategoryId);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Sync subcategoryId and initialFiles when modal opens
  useEffect(() => {
    if (open) {
      setSubcategoryId(defaultSubcategoryId);
      setStatus("published");
      setCompletedCount(0);
      setLibraryItem(null);

      if (initialFiles && initialFiles.length > 0) {
        const queued: QueuedItem[] = initialFiles
          .filter((f) => f.type.startsWith("image/"))
          .map((file, i) => ({
            id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
            file,
            previewUrl: URL.createObjectURL(file),
            title: formatStickerTitleFromFilename(file.name),
            status: "idle" as const,
          }));
        setItems(queued);
      } else {
        setItems([]);
      }
    } else {
      // Clean up object URLs when modal is closed
      items.forEach((it) => {
        try {
          URL.revokeObjectURL(it.previewUrl);
        } catch {
          // Ignore
        }
      });
      setItems([]);
      setLibraryItem(null);
    }
  }, [open, defaultSubcategoryId, initialFiles]);

  if (!open) return null;

  const selectedSub = subcategories.find((s) => s.id === subcategoryId);
  const effectiveFolder = selectedSub
    ? `${categorySlug}/${selectedSub.slug}`
    : categorySlug;

  const addFiles = (fileList: FileList | File[]) => {
    const valid = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (valid.length === 0) return;

    const newQueued: QueuedItem[] = valid.map((file, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      title: formatStickerTitleFromFilename(file.name),
      status: "idle" as const,
    }));

    setLibraryItem(null);
    setItems((prev) => [...prev, ...newQueued]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const updateItemTitle = (id: string, newTitle: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, title: newTitle } : it)),
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target?.previewUrl) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {
          // Ignore
        }
      }
      return prev.filter((it) => it.id !== id);
    });
  };

  const handleResetAndClose = () => {
    items.forEach((it) => {
      try {
        URL.revokeObjectURL(it.previewUrl);
      } catch {
        // Ignore
      }
    });
    setItems([]);
    setLibraryItem(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 && !libraryItem) return;

    setIsSaving(true);

    // Single item from Media Library
    if (libraryItem) {
      try {
        const itemTitle = libraryItem.title.trim();
        if (onSave) {
          await onSave({
            title: itemTitle,
            category_id: categoryId,
            subcategory_id: subcategoryId,
            image_url: libraryItem.url,
            image_storage_key: libraryItem.storageKey,
            status,
          });
        } else {
          await createProduct({
            title: itemTitle,
            category_id: categoryId,
            subcategory_id: subcategoryId,
            image_url: libraryItem.url,
            image_storage_key: libraryItem.storageKey,
            status,
            stock_quantity: 100,
            cost_price: 6.0,
          });
        }
        toast.success(`Sticker "${itemTitle}" added to catalogue!`);
        queryClient.invalidateQueries({ queryKey: ["admin-products"] });
        queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
        queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
        queryClient.invalidateQueries({ queryKey: ["products"] });
        handleResetAndClose();
      } catch (err) {
        toast.error(extractErrorMessage(err, "Failed to add sticker"));
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Single file upload
    if (items.length === 1) {
      const item = items[0];
      try {
        const uploadRes = await imageStorageService.uploadImage(item.file, {
          folder: effectiveFolder,
        });
        const finalTitle = item.title.trim() || formatStickerTitleFromFilename(item.file.name);

        if (onSave) {
          await onSave({
            title: finalTitle,
            category_id: categoryId,
            subcategory_id: subcategoryId,
            image_url: uploadRes.publicUrl,
            image_storage_key: uploadRes.storageKey,
            status,
          });
        } else {
          await createProduct({
            title: finalTitle,
            category_id: categoryId,
            subcategory_id: subcategoryId,
            image_url: uploadRes.publicUrl,
            image_storage_key: uploadRes.storageKey,
            status,
            stock_quantity: 100,
            cost_price: 6.0,
          });
        }
        toast.success(`Sticker "${finalTitle}" added to catalogue!`);
        queryClient.invalidateQueries({ queryKey: ["admin-products"] });
        queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
        queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
        queryClient.invalidateQueries({ queryKey: ["products"] });
        handleResetAndClose();
      } catch (err) {
        toast.error(extractErrorMessage(err, "Failed to upload sticker"));
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Multiple files (Bulk upload)
    let done = 0;
    let failed = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status === "success") continue;

      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: "uploading" } : it)),
      );

      try {
        const uploadRes = await imageStorageService.uploadImage(item.file, {
          folder: effectiveFolder,
        });
        const finalTitle = item.title.trim() || formatStickerTitleFromFilename(item.file.name);

        await createProduct({
          title: finalTitle,
          category_id: categoryId,
          subcategory_id: subcategoryId,
          image_url: uploadRes.publicUrl,
          image_storage_key: uploadRes.storageKey,
          status,
          stock_quantity: 100,
          cost_price: 6.0,
        });

        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: "success" } : it)),
        );
        done++;
        setCompletedCount(done);
      } catch (err) {
        failed++;
        const errMsg = extractErrorMessage(err, "Upload failed");
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, status: "error", errorMessage: errMsg } : it,
          ),
        );
      }
    }

    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });

    if (failed === 0) {
      toast.success(`Successfully uploaded all ${done} stickers to ${categoryName}!`);
      handleResetAndClose();
    } else {
      toast.error(`Uploaded ${done} stickers, ${failed} failed. You can retry failed ones.`);
    }

    setIsSaving(false);
  };

  const isBulk = items.length > 1;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
        <div className="relative w-full max-w-xl rounded-2xl border border-white/[0.08] bg-[#0f101f] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4 bg-[#121324] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {isBulk
                    ? `Bulk Upload to ${categoryName} (${items.length} Stickers)`
                    : `Add Sticker to ${categoryName}`}
                </h3>
                <p className="text-[11px] font-mono text-primary flex items-center gap-1 mt-0.5">
                  <Folder className="h-3 w-3" />
                  Target: stickers/{effectiveFolder}/
                </p>
              </div>
            </div>
            <button
              onClick={handleResetAndClose}
              className="rounded-lg p-1 text-muted-foreground hover:bg-white/[0.05] hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Hidden multi-file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileInputChange}
          />

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Folder / Subcategory selector */}
            {subcategories.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>Target Subcategory Folder</span>
                </label>
                <select
                  value={subcategoryId || ""}
                  onChange={(e) =>
                    setSubcategoryId(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs font-medium text-foreground focus:outline-none"
                >
                  <option value="">None (Category Root: stickers/{categorySlug}/)</option>
                  {subcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} (stickers/{categorySlug}/{sub.slug}/)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* CASE 1: No files selected yet - Clean Drag & Drop Area */}
            {items.length === 0 && !libraryItem && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer",
                  isDragging
                    ? "border-primary bg-primary/10 scale-[1.01]"
                    : "border-white/[0.12] bg-white/[0.02] hover:border-primary/50 hover:bg-white/[0.04]",
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-3.5">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  Drag & drop sticker artwork here
                </h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Drop single stickers or drag multiple files at once for bulk upload.
                </p>
                <p className="text-[11px] text-primary/80 font-medium mt-2">
                  ✓ Titles are automatically generated from filenames in Title Case
                </p>

                <div className="mt-5 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Browse Files (Single or Bulk)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaPickerOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/[0.05] hover:bg-white/[0.1] text-foreground border border-white/[0.1] transition-all cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Choose from Library</span>
                  </button>
                </div>
              </div>
            )}

            {/* CASE 2: Single file selected */}
            {items.length === 1 && !libraryItem && (
              <div className="space-y-4">
                {/* Artwork Preview Card */}
                <div className="relative rounded-2xl border border-white/[0.08] bg-black/40 p-4 flex items-center gap-4">
                  <div className="relative h-24 w-24 rounded-xl bg-black/60 border border-white/[0.08] overflow-hidden flex items-center justify-center shrink-0">
                    <img
                      src={items[0].previewUrl}
                      alt={items[0].title}
                      className="h-full w-full object-contain p-1"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-muted-foreground truncate">
                      {items[0].file.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {(items[0].file.size / 1024).toFixed(1)} KB • Image
                    </p>
                    <p className="text-[11px] font-mono text-primary mt-1">
                      → stickers/{effectiveFolder}/{items[0].file.name.toLowerCase().replace(/[\s_]+/g, "-")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(items[0].id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Title Input (Auto-capitalized from filename) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">
                      Display Title <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[10px] text-primary/80 font-medium">
                      Auto-capitalized from filename
                    </span>
                  </div>
                  <Input
                    type="text"
                    value={items[0].title}
                    onChange={(e) => updateItemTitle(items[0].id, e.target.value)}
                    className="bg-white/[0.04] border-white/[0.1] rounded-xl text-sm font-semibold"
                    placeholder="Sticker display name"
                  />
                </div>

                {/* Add more files shortcut */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>Want to add more stickers to this batch?</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add more files</span>
                  </button>
                </div>
              </div>
            )}

            {/* CASE 3: Library item selected */}
            {libraryItem && (
              <div className="space-y-4">
                <div className="relative rounded-2xl border border-white/[0.08] bg-black/40 p-4 flex items-center gap-4">
                  <div className="relative h-24 w-24 rounded-xl bg-black/60 border border-white/[0.08] overflow-hidden flex items-center justify-center shrink-0">
                    <img
                      src={libraryItem.url}
                      alt={libraryItem.title}
                      className="h-full w-full object-contain p-1"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 text-[10px] font-bold">
                      <ImageIcon className="w-3 h-3" />
                      Media Library Asset
                    </span>
                    <p className="text-xs font-mono text-muted-foreground mt-1 truncate">
                      {libraryItem.storageKey}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLibraryItem(null)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Display Title <span className="text-rose-400">*</span>
                  </label>
                  <Input
                    type="text"
                    value={libraryItem.title}
                    onChange={(e) =>
                      setLibraryItem({ ...libraryItem, title: e.target.value })
                    }
                    className="bg-white/[0.04] border-white/[0.1] rounded-xl text-sm font-semibold"
                  />
                </div>
              </div>
            )}

            {/* CASE 4: Multiple files selected (Bulk Mode) */}
            {isBulk && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span>Batch Queue ({items.length} stickers)</span>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      Titles auto-capitalized
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add More</span>
                  </button>
                </div>

                {/* Progress bar if uploading */}
                {isSaving && (
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-primary">
                      <span>Uploading stickers...</span>
                      <span>
                        {completedCount} / {items.length}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{
                          width: `${(completedCount / items.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* List of bulk items */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className={cn(
                        "p-2.5 rounded-xl border flex items-center gap-3 transition-colors",
                        item.status === "uploading"
                          ? "bg-primary/5 border-primary/30"
                          : item.status === "success"
                          ? "bg-emerald-500/5 border-emerald-500/30"
                          : item.status === "error"
                          ? "bg-rose-500/5 border-rose-500/30"
                          : "bg-white/[0.02] border-white/[0.06]",
                      )}
                    >
                      <div className="h-10 w-10 rounded-lg bg-black/40 border border-white/[0.06] overflow-hidden flex items-center justify-center shrink-0">
                        <img
                          src={item.previewUrl}
                          alt={item.title}
                          className="h-full w-full object-contain p-0.5"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Input
                          type="text"
                          value={item.title}
                          disabled={isSaving}
                          onChange={(e) => updateItemTitle(item.id, e.target.value)}
                          className="h-7 text-xs bg-transparent border-transparent hover:border-white/[0.1] focus:border-primary px-1.5 font-medium"
                          placeholder="Sticker title"
                        />
                        <p className="text-[10px] text-muted-foreground px-1.5 truncate">
                          {item.file.name} • {(item.file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>

                      {/* Status indicator */}
                      <div className="shrink-0 flex items-center gap-2">
                        {item.status === "uploading" && (
                          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        )}
                        {item.status === "success" && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        )}
                        {item.status === "error" && (
                          <span
                            title={item.errorMessage}
                            className="text-rose-400 cursor-help"
                          >
                            <AlertCircle className="w-4 h-4" />
                          </span>
                        )}
                        {!isSaving && (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1 rounded text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status (Published / Draft) - Applicable to single or bulk */}
            {(items.length > 0 || libraryItem) && (
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-foreground">
                  Catalogue Status {isBulk && "(Applied to all in batch)"}
                </label>
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
            )}

            {/* Footer */}
            <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={handleResetAndClose}
                disabled={isSaving}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-white/[0.05] hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {(items.length > 0 || libraryItem) && (
                <button
                  type="submit"
                  disabled={isSaving || (items.length === 0 && !libraryItem)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <div className="h-3.5 w-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <UploadCloud className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {isBulk
                      ? `Upload All (${items.length} Stickers)`
                      : "Save Sticker"}
                  </span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        defaultFolder={categorySlug}
        onSelectArtwork={(artwork) => {
          setLibraryItem({
            url: artwork.publicUrl,
            storageKey: artwork.storageKey,
            title: formatStickerTitleFromFilename(artwork.name),
          });
          setItems([]);
        }}
      />
    </>
  );
}