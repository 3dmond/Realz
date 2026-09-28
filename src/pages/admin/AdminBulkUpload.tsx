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
  Settings2,
  Grid3X3,
  Square,
  Folder,
  Sliders,
  CheckCheck,
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
import { cn, formatStickerTitleFromFilename, extractErrorMessage } from "@/lib/utils";

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
  const [canvasStyle, setCanvasStyle] = useState<"dark" | "grid">("dark");

  // Global batch override defaults
  const [globalCategory, setGlobalCategory] = useState<number | null>(null);
  const [globalStatus, setGlobalStatus] = useState<ProductStatus>("published");

  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: fetchAdminCategories,
  });

  // Effective destination category ID (defaults to first available category if not selected)
  const effectiveCategoryId = globalCategory ?? categories[0]?.id ?? 49134;

  const handleFilesSelected = async (files: FileList | File[]) => {
    const targetCatId = effectiveCategoryId;
    const newItems: BulkCandidate[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;

      const objectUrl = URL.createObjectURL(file);
      const title = formatStickerTitleFromFilename(file.name);

      newItems.push({
        id: `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl: objectUrl,
        title,
        category_id: targetCatId,
        status: globalStatus,
        uploadState: "idle",
      });
    }

    if (newItems.length === 0) {
      toast.error("Please drop valid image files (PNG, WebP, JPG, SVG)");
      return;
    }

    setCandidates((prev) => [...prev, ...newItems]);
    toast.success(`Staged ${newItems.length} sticker${newItems.length === 1 ? "" : "s"}`);

    // Asynchronously validate each file for dimensions & alpha cutout
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

  // Batch fast-apply actions
  const applyCategoryToAll = () => {
    setCandidates((prev) => prev.map((c) => ({ ...c, category_id: effectiveCategoryId })));
    toast.info("Destination category applied to all staged items");
  };

  const applyStatusToAll = (status: ProductStatus) => {
    setCandidates((prev) => prev.map((c) => ({ ...c, status })));
    toast.info(`Status (${status.toUpperCase()}) applied to all staged items`);
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

    const queue = [...pendingItems];
    const runWorker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;

        try {
          // 1. Upload media asset into Supabase storage folder
          updateCandidate(item.id, { uploadState: "uploading_image" });
          const cat = categories.find((c) => c.id === item.category_id);
          const catFolder =
            cat?.slug || cat?.name?.toLowerCase().replace(/[\s-]+/g, "_") || "general";
          const uploadRes = await imageStorageService.uploadImage(item.file, { folder: catFolder });

          // 2. Create product database record (printed on-demand defaults)
          updateCandidate(item.id, { uploadState: "creating_record" });
          await createProduct({
            title: item.title,
            category_id: item.category_id,
            image_url: uploadRes.publicUrl,
            image_storage_key: uploadRes.storageKey,
            stock_quantity: 100,
            cost_price: 6.0,
            status: item.status,
          });

          updateCandidate(item.id, { uploadState: "success" });
          done++;
          setCompletedCount(done);
        } catch (err: unknown) {
          const errMsg = extractErrorMessage(err, "Failed to import");
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
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });

    const totalErrors = candidates.filter((c) => c.uploadState === "error").length;
    if (totalErrors === 0) {
      toast.success(`Successfully imported all ${pendingItems.length} stickers!`);
    } else {
      toast.error(`Import completed with ${totalErrors} failures. You can retry them.`);
    }
  };

  const pendingCount = candidates.filter((c) => c.uploadState === "idle" || c.uploadState === "error").length;
  const successCount = candidates.filter((c) => c.uploadState === "success").length;
  const errorCount = candidates.filter((c) => c.uploadState === "error").length;

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto pb-24">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/webp,image/png,image/jpeg,image/svg+xml"
        onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
        className="hidden"
        disabled={isProcessing}
      />

      {/* Header & Breadcrumb Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div>
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-1 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Stickers Catalogue</span>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <span>Bulk Sticker Artwork Upload</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Stage, validate, and batch-import transparent vinyl artwork directly into your store catalogue.
          </p>
        </div>

        {/* Global Toolbar Strip */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Canvas Style Toggle (Studio Dark vs Alpha Grid) */}
          <div className="flex items-center bg-[#0e0f1b] border border-white/[0.08] rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setCanvasStyle("dark")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer",
                canvasStyle === "dark"
                  ? "bg-white/[0.1] text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Studio Dark canvas"
            >
              <Square className="w-3 h-3" />
              <span>Studio</span>
            </button>
            <button
              type="button"
              onClick={() => setCanvasStyle("grid")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer",
                canvasStyle === "grid"
                  ? "bg-white/[0.1] text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Alpha Cutout Grid (check vinyl cutline boundaries)"
            >
              <Grid3X3 className="w-3 h-3" />
              <span>Alpha</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Select Files</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* ZERO-STATE: 55/45 SPLIT INTAKE LAYOUT (When no files are staged)      */}
      {/* ==================================================================== */}
      {candidates.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 my-4">
          {/* Left 55% (7 cols): Active Drag & Drop Intake Target */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "lg:col-span-7 rounded-xl border border-dashed flex flex-col items-center justify-center p-8 sm:p-14 text-center cursor-pointer transition-all group",
              isDragging
                ? "border-primary bg-primary/[0.06]"
                : "border-white/[0.12] bg-[#0e0f1b]/50 hover:border-white/[0.22] hover:bg-[#0e0f1b]",
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/40 transition-colors mb-3">
              <Upload className="h-6 w-6" />
            </div>

            <h3 className="text-base font-semibold text-foreground">
              Drop sticker artwork files here
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Drag and drop up to 50 artwork files to start staging, or click anywhere to browse from your device.
            </p>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Browse Artwork Files</span>
            </button>

            {/* Accepted Formats */}
            <div className="mt-6 flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
              <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                PNG
              </span>
              <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                WEBP
              </span>
              <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                SVG
              </span>
              <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                JPG
              </span>
            </div>
          </div>

          {/* Right 45% (5 cols): Batch Intake & Destination Settings Card */}
          <div className="lg:col-span-5 rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-5 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
                <Sliders className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Batch Target Settings
                </h3>
              </div>

              {/* Destination Category Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  Destination Category
                </label>
                <div className="relative">
                  <select
                    value={effectiveCategoryId}
                    onChange={(e) => setGlobalCategory(Number(e.target.value))}
                    className="w-full h-9 rounded-md border border-white/[0.08] bg-[#090a13] px-3 text-xs font-medium text-foreground focus:outline-none focus:border-primary cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.product_count !== undefined ? `· ${c.product_count} stickers` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Staged files will automatically be routed to this collection upon upload.
                </p>
              </div>

              {/* Default Storefront Publication State */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-medium text-foreground block">
                  Initial Storefront Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGlobalStatus("published")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors border cursor-pointer",
                      globalStatus === "published"
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold"
                        : "bg-white/[0.02] text-muted-foreground border-white/[0.06] hover:text-foreground",
                    )}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Live (Published)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGlobalStatus("draft")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors border cursor-pointer",
                      globalStatus === "draft"
                        ? "bg-white/[0.08] text-foreground border-white/[0.16] font-semibold"
                        : "bg-white/[0.02] text-muted-foreground border-white/[0.06] hover:text-foreground",
                    )}
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Draft Review</span>
                  </button>
                </div>
              </div>

              {/* Pipeline Intake Rules */}
              <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3.5 space-y-2 pt-3">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Automated Pipeline Intake Rules
                </h4>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-1.5">
                    <CheckCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Filenames formatted automatically to Title Case</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>Alpha channel transparent cutout detection</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>On-demand print defaults assigned</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground border-t border-white/[0.06] pt-3">
              Drop artwork files on the left to start staging and verifying items.
            </div>
          </div>
        </div>
      ) : (
        /* ==================================================================== */
        /* STAGING WORKBENCH (Activated as soon as files are dropped)           */
        /* ==================================================================== */
        <div className="space-y-4">
          {/* Quick Add Drop Strip */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "rounded-xl border border-dashed p-4 text-center cursor-pointer transition-colors group",
              isDragging
                ? "border-primary bg-primary/[0.06]"
                : "border-white/[0.1] bg-[#0e0f1b]/40 hover:border-white/[0.18] hover:bg-[#0e0f1b]",
            )}
          >
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground group-hover:text-foreground">
              <Upload className="w-4 h-4 text-primary" />
              <span>Drop more files to add to staging, or click to browse</span>
            </div>
          </div>

          {/* Fast-Apply Action Bar */}
          <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Settings2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-semibold text-foreground">Fast-Apply to All Staged:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={applyCategoryToAll}
                disabled={isProcessing}
                className="h-7 px-2.5 rounded-md border border-white/[0.08] bg-white/[0.04] text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                Apply Selected Category
              </button>
              <button
                type="button"
                onClick={() => applyStatusToAll("published")}
                disabled={isProcessing}
                className="h-7 px-2.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors cursor-pointer"
              >
                Set All Live
              </button>
              <button
                type="button"
                onClick={() => applyStatusToAll("draft")}
                disabled={isProcessing}
                className="h-7 px-2.5 rounded-md border border-white/[0.08] bg-white/[0.04] text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Set All Draft
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={isProcessing}
                className="h-7 px-2.5 rounded-md border border-white/[0.08] bg-white/[0.04] text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                Clear Staged ({candidates.length})
              </button>
            </div>
          </div>

          {/* Batch Progress Bar (While uploading) */}
          {isProcessing && (
            <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span>Importing Batch into Catalogue…</span>
                </span>
                <span className="font-mono text-muted-foreground text-[11px] font-bold">
                  {completedCount} of {candidates.length} processed
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${(completedCount / Math.max(1, candidates.length)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Staged Cards Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Staged Artwork ({candidates.length} items)
              </span>
              <div className="flex items-center gap-3 text-xs">
                {successCount > 0 && (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{successCount} Imported</span>
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="text-rose-400 font-medium flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>{errorCount} Failed</span>
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {candidates.map((item) => {
                const val = item.validation;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-xl border bg-[#0e0f1b] p-3 flex gap-3 transition-colors",
                      item.uploadState === "success" && "border-emerald-500/30 bg-emerald-500/[0.03]",
                      item.uploadState === "error" && "border-rose-500/30 bg-rose-500/[0.03]",
                      item.uploadState === "idle" && "border-white/[0.06] hover:border-white/[0.14]",
                      item.uploadState === "uploading_image" && "border-primary/50 bg-primary/[0.03]",
                    )}
                  >
                    {/* Thumbnail with selected canvas style */}
                    <div
                      className={cn(
                        "relative h-20 w-20 shrink-0 rounded-lg overflow-hidden border border-white/[0.08] p-1.5 flex items-center justify-center",
                        canvasStyle === "grid" ? "bg-transparency-grid" : "bg-[#070810]",
                      )}
                    >
                      <img
                        src={item.previewUrl}
                        alt={item.title}
                        className="max-h-full max-w-full object-contain pointer-events-none"
                      />

                      {item.uploadState === "success" && (
                        <div className="absolute inset-0 bg-[#0c0d18]/80 backdrop-blur-xs flex items-center justify-center text-emerald-400">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                      )}
                      {item.uploadState === "uploading_image" && (
                        <div className="absolute inset-0 bg-[#0c0d18]/80 flex items-center justify-center text-primary">
                          <RefreshCw className="h-5 w-5 animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Form Fields */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <Input
                          value={item.title}
                          disabled={item.uploadState === "success" || isProcessing}
                          onChange={(e) => updateCandidate(item.id, { title: e.target.value })}
                          placeholder="Artwork title…"
                          className="h-7 bg-[#090a13] border-white/[0.08] rounded-md text-xs font-semibold text-foreground px-2"
                        />
                        {item.uploadState !== "success" && !isProcessing && (
                          <button
                            type="button"
                            onClick={() => removeCandidate(item.id)}
                            className="h-6 w-6 grid place-items-center rounded border border-white/[0.08] text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        {/* Category Dropdown */}
                        <select
                          value={item.category_id}
                          disabled={item.uploadState === "success" || isProcessing}
                          onChange={(e) =>
                            updateCandidate(item.id, { category_id: Number(e.target.value) })
                          }
                          className="h-6.5 rounded border border-white/[0.08] bg-[#090a13] px-1.5 text-[11px] font-medium text-foreground focus:outline-none cursor-pointer truncate"
                        >
                          {categories.map((c) => (
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
                            "h-6.5 rounded border text-[10px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer",
                            item.status === "published"
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                              : "border-white/[0.08] bg-white/[0.04] text-muted-foreground",
                          )}
                        >
                          {item.status === "published" ? (
                            <>
                              <Eye className="w-2.5 h-2.5" />
                              <span>Live</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-2.5 h-2.5" />
                              <span>Draft</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Metadata Validation Tags */}
                      <div className="flex flex-wrap items-center gap-1 text-[9px]">
                        {val?.width && val?.height && (
                          <span className="rounded bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.2 font-mono text-muted-foreground">
                            {val.width}×{val.height}px
                          </span>
                        )}

                        {val?.hasTransparency && (
                          <span className="rounded bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.2 font-medium">
                            Alpha Cutout
                          </span>
                        )}
                      </div>

                      {item.errorMessage && (
                        <p className="text-[10px] text-rose-400 flex items-center gap-1 font-medium">
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
        </div>
      )}

      {/* Floating Bottom Execution Bar (When items are staged) */}
      {candidates.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/[0.12] bg-[#0c0d18]/95 backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 pr-3 border-r border-white/[0.08]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {pendingCount}
            </span>
            <span className="text-xs font-semibold text-foreground">
              Ready to Import
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearAll}
              disabled={isProcessing}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={startBulkImport}
              disabled={isProcessing || pendingCount === 0}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Uploading {completedCount} / {candidates.length}</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Import {pendingCount} Stickers</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
