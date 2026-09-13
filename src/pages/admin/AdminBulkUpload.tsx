import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Upload,
  Layers,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Settings2,
} from "lucide-react";
import {
  fetchAdminCategories,
  createProduct,
  type ProductStatus,
} from "@/lib/admin-api";
import {
  imageStorageService,
  type ImageValidationResult,
} from "@/lib/storage-service";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type BulkCandidate = {
  id: string;
  file: File;
  previewUrl: string;
  title: string;
  category_id: number;
  status: ProductStatus;
  validation?: ImageValidationResult;
  uploadState: "idle" | "uploading_image" | "creating_record" | "success" | "error";
  errorMessage?: string;
};

export default function AdminBulkUpload() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [candidates, setCandidates] = useState<BulkCandidate[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  // Global batch override defaults
  const [globalCategory, setGlobalCategory] = useState<number>(49134);
  const [globalStatus, setGlobalStatus] = useState<ProductStatus>("published");

  const { data: categories } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: fetchAdminCategories,
  });

  const inferTitleFromFilename = (name: string): string => {
    const base = name.replace(/\.[^/.]+$/, "");
    return base
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  const handleFilesSelected = async (files: FileList | File[]) => {
    const defaultCatId = categories?.[0]?.id ?? 49134;
    const newItems: BulkCandidate[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;

      const objectUrl = URL.createObjectURL(file);
      const title = inferTitleFromFilename(file.name);

      newItems.push({
        id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl: objectUrl,
        title,
        category_id: globalCategory || defaultCatId,
        status: globalStatus,
        uploadState: "idle",
      });
    }

    setCandidates((prev) => [...prev, ...newItems]);

    // Asynchronously validate each file in background
    for (const item of newItems) {
      imageStorageService.validateImage(item.file).then((val) => {
        setCandidates((current) =>
          current.map((c) => (c.id === item.id ? { ...c, validation: val } : c)),
        );
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const updateCandidate = (id: string, updates: Partial<BulkCandidate>) => {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const removeCandidate = (id: string) => {
    setCandidates((prev) => {
      const item = prev.find((c) => c.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((c) => c.id !== id);
    });
  };

  const clearAll = () => {
    candidates.forEach((c) => URL.revokeObjectURL(c.previewUrl));
    setCandidates([]);
    setCompletedCount(0);
  };

  // Batch property applications
  const applyCategoryToAll = () => {
    setCandidates((prev) => prev.map((c) => ({ ...c, category_id: globalCategory })));
    toast.info("Category applied to all items in batch");
  };

  const applyStatusToAll = (status: ProductStatus) => {
    setCandidates((prev) => prev.map((c) => ({ ...c, status })));
    toast.info(`Status (${status.toUpperCase()}) applied to all items`);
  };

  // Execution Engine with concurrency limit = 3
  const startBulkImport = async () => {
    const pendingItems = candidates.filter(
      (c) => c.uploadState === "idle" || c.uploadState === "error",
    );

    if (pendingItems.length === 0) {
      toast.error("No pending stickers to import.");
      return;
    }

    setIsProcessing(true);
    let done = 0;
    const concurrency = 3;

    // Queue processor
    const queue = [...pendingItems];
    const runWorker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;

        try {
          // 1. Upload media asset
          updateCandidate(item.id, { uploadState: "uploading_image" });
          const cat = categories?.find((c) => c.id === item.category_id);
          const catFolder = cat?.slug || cat?.name || "";
          const uploadRes = await imageStorageService.uploadImage(item.file, { folder: catFolder });

          // 2. Create database record
          updateCandidate(item.id, { uploadState: "creating_record" });
          await createProduct({
            title: item.title,
            category_id: item.category_id,
            image_url: uploadRes.publicUrl,
            image_storage_key: uploadRes.storageKey,
            stock_quantity: 100, // On-demand printed catalogue item default
            cost_price: 6.00,
            status: item.status,
          });

          updateCandidate(item.id, { uploadState: "success" });
          done++;
          setCompletedCount(done);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : "Failed to import";
          updateCandidate(item.id, {
            uploadState: "error",
            errorMessage: errMsg,
          });
        }
      }
    };

    const workers = Array.from({ length: concurrency }, () => runWorker());
    await Promise.all(workers);

    setIsProcessing(false);
    queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });

    const totalErrors = candidates.filter((c) => c.uploadState === "error").length;
    if (totalErrors === 0) {
      toast.success(`Successfully imported all ${pendingItems.length} stickers!`);
    } else {
      toast.error(`Import finished with ${totalErrors} failures. You can retry them.`);
    }
  };

  const successCount = candidates.filter((c) => c.uploadState === "success").length;
  const errorCount = candidates.filter((c) => c.uploadState === "error").length;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Sticker Catalogue</span>
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            <span>Bulk Sticker Artwork Upload</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Batch-upload sticker files directly into your store catalogue. Realz stickers are printed on-demand.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-3">
          {candidates.length > 0 && (
            <button
              onClick={clearAll}
              disabled={isProcessing}
              className="h-10 px-4 rounded-xl border border-white/[0.1] bg-white/[0.04] text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-colors disabled:opacity-50"
            >
              Clear Staged ({candidates.length})
            </button>
          )}

          <button
            onClick={startBulkImport}
            disabled={isProcessing || candidates.length === 0 || candidates.every((c) => c.uploadState === "success")}
            className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Importing Batch…</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Import {candidates.filter((c) => c.uploadState !== "success").length} Stickers</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative rounded-3xl border-2 border-dashed p-10 text-center cursor-pointer transition-all",
          isDragging
            ? "border-primary bg-primary/10 shadow-[0_0_25px_oklch(0.58_0.25_285/0.3)] scale-[1.01]"
            : "border-white/[0.12] bg-[#0c0d18] hover:border-white/[0.25] hover:bg-[#0f101d]",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/webp,image/png,image/jpeg,image/svg+xml"
          onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
          className="hidden"
          disabled={isProcessing}
        />

        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/[0.04] border border-white/[0.08] text-muted-foreground mx-auto mb-3">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-base font-bold text-foreground">
          Drop a batch of sticker artwork files here
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
          Select 1 to 50 transparent WebP or PNG files. Artwork names will be automatically formatted and staged for review.
        </p>
      </div>

      {/* Bulk Global Controls Bar (Shown when candidates exist) */}
      {candidates.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-4 flex flex-col xl:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-foreground">Batch Fast-Apply Tools:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* Batch Category */}
            <div className="flex items-center gap-1.5">
              <select
                value={globalCategory}
                onChange={(e) => setGlobalCategory(Number(e.target.value))}
                className="h-9 rounded-xl border border-white/[0.1] bg-[#0a0b14] px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                onClick={applyCategoryToAll}
                className="h-9 px-3 rounded-xl border border-white/[0.1] bg-white/[0.04] text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                Apply Category to All
              </button>
            </div>

            {/* Batch Status */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => applyStatusToAll("published")}
                className="h-9 px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px] font-bold hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer"
              >
                Publish All
              </button>
              <button
                onClick={() => applyStatusToAll("draft")}
                className="h-9 px-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[11px] font-bold hover:bg-amber-500 hover:text-white transition-colors cursor-pointer"
              >
                Draft All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress & Summary Bar */}
      {isProcessing && (
        <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-primary flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Importing Batch into Supabase…</span>
            </span>
            <span className="font-mono text-muted-foreground">
              {completedCount} of {candidates.length} processed
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/[0.08] overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{ width: `${(completedCount / Math.max(1, candidates.length)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Candidate Grid */}
      {candidates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Staged Stickers ({candidates.length} items)
            </span>
            <div className="flex items-center gap-3 text-xs">
              {successCount > 0 && (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{successCount} Imported</span>
                </span>
              )}
              {errorCount > 0 && (
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{errorCount} Failed</span>
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {candidates.map((item) => {
              const val = item.validation;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-2xl border bg-[#0f101d] p-4 flex gap-4 transition-all",
                    item.uploadState === "success" && "border-emerald-500/40 bg-emerald-500/[0.02]",
                    item.uploadState === "error" && "border-rose-500/40 bg-rose-500/[0.02]",
                    item.uploadState === "idle" && "border-white/[0.08]",
                    item.uploadState === "uploading_image" && "border-primary/50",
                  )}
                >
                  {/* Thumbnail with checkerboard background */}
                  <div className="relative h-24 w-24 shrink-0 rounded-xl overflow-hidden border border-white/[0.1] p-1 flex items-center justify-center bg-[linear-gradient(45deg,#121324_25%,transparent_25%),linear-gradient(-45deg,#121324_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#121324_75%),linear-gradient(-45deg,transparent_75%,#121324_75%)] bg-[size:10px_10px] bg-[#07080f]">
                    <img
                      src={item.previewUrl}
                      alt={item.title}
                      className="max-h-full max-w-full object-contain drop-shadow"
                    />

                    {item.uploadState === "success" && (
                      <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                    )}
                    {item.uploadState === "uploading_image" && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-primary">
                        <RefreshCw className="h-6 w-6 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Fields & Controls */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-1.5">
                      <Input
                        value={item.title}
                        disabled={item.uploadState === "success" || isProcessing}
                        onChange={(e) => updateCandidate(item.id, { title: e.target.value })}
                        placeholder="Artwork title…"
                        className="h-8 bg-white/[0.04] border-white/[0.1] rounded-lg text-xs font-bold text-foreground"
                      />
                      {item.uploadState !== "success" && !isProcessing && (
                        <button
                          onClick={() => removeCandidate(item.id)}
                          className="h-7 w-7 grid place-items-center rounded-lg border border-white/[0.1] text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Category */}
                      <select
                        value={item.category_id}
                        disabled={item.uploadState === "success" || isProcessing}
                        onChange={(e) => updateCandidate(item.id, { category_id: Number(e.target.value) })}
                        className="h-8 rounded-lg border border-white/[0.1] bg-[#0c0d18] px-2 text-[11px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        {categories?.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>

                      {/* Status Toggle */}
                      <button
                        type="button"
                        disabled={item.uploadState === "success" || isProcessing}
                        onClick={() =>
                          updateCandidate(item.id, {
                            status: item.status === "published" ? "draft" : "published",
                          })
                        }
                        className={cn(
                          "h-8 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 transition-colors",
                          item.status === "published"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-400",
                        )}
                      >
                        {item.status === "published" ? (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>Live</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            <span>Draft</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Validation Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[9px]">
                      {val?.width && val?.height && (
                        <span className="rounded bg-white/[0.05] border border-white/[0.08] px-1.5 py-0.5 font-mono text-muted-foreground">
                          {val.width}×{val.height}px
                        </span>
                      )}

                      {val?.hasTransparency && (
                        <span className="rounded bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 font-bold">
                          ✓ Alpha Cutout
                        </span>
                      )}
                    </div>

                    {item.errorMessage && (
                      <p className="text-[10px] text-rose-400 flex items-center gap-1 font-bold">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        <span className="truncate">{item.errorMessage}</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
