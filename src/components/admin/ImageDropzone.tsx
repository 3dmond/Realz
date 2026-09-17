import { useState, useRef, useCallback } from "react";
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  X,
  FileCheck,
  Eye,
} from "lucide-react";
import {
  imageStorageService,
  type ImageValidationResult,
  type ImageUploadResult,
} from "@/lib/storage-service";
import { cn, extractErrorMessage } from "@/lib/utils";

interface ImageDropzoneProps {
  currentImageUrl?: string;
  value?: string;
  onImageUploaded?: (result: { publicUrl: string; storageKey: string }) => void;
  onChange?: (url: string) => void;
  onClearImage?: () => void;
  folder?: string;
  productId?: number;
  className?: string;
  label?: string;
}

export default function ImageDropzone({
  currentImageUrl,
  value,
  onImageUploaded,
  onChange,
  onClearImage,
  folder,
  productId,
  className,
  label = "Upload sticker artwork",
}: ImageDropzoneProps) {
  const activeImageUrl = currentImageUrl || value;
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validation, setValidation] = useState<ImageValidationResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!folder && !productId) {
        setUploadError("Please select a category above before uploading artwork.");
        return;
      }

      setIsUploading(true);
      setUploadProgress(25);
      setUploadError(null);

      const timer = setInterval(() => {
        setUploadProgress((p) => (p < 85 ? p + 20 : p));
      }, 150);

      try {
        let result: ImageUploadResult;
        if (activeImageUrl) {
          result = await imageStorageService.replaceImage(activeImageUrl, file, {
            folder,
            productId,
          });
        } else {
          result = await imageStorageService.uploadImage(file, {
            folder,
            productId,
          });
        }

        clearInterval(timer);
        setUploadProgress(100);

        if (typeof onImageUploaded === "function") {
          onImageUploaded({
            publicUrl: result.publicUrl,
            storageKey: result.storageKey,
          });
        }

        if (typeof onChange === "function") {
          onChange(result.publicUrl);
        }

        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 300);
      } catch (err: unknown) {
        clearInterval(timer);
        const msg = extractErrorMessage(err, "Failed to upload artwork");
        setUploadError(msg);
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [activeImageUrl, folder, productId, onImageUploaded, onChange],
  );

  const processFile = useCallback(
    async (file: File) => {
      setSelectedFile(file);
      setUploadError(null);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      try {
        const val = await imageStorageService.validateImage(file);
        setValidation(val);
        if (val.status !== "rejected") {
          await uploadFile(file);
        }
      } catch {
        setValidation({
          status: "rejected",
          mimeType: file.type,
          fileSize: file.size,
          issues: [{ type: "error", message: "Failed to read file." }],
        });
      }
    },
    [uploadFile],
  );

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

    if (!folder && !productId && !activeDisplayUrl) {
      setUploadError("Please select a category above before uploading artwork.");
      return;
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleStartUpload = async () => {
    if (selectedFile) {
      await uploadFile(selectedFile);
    }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setValidation(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (typeof onClearImage === "function") onClearImage();
    if (typeof onChange === "function") onChange("");
  };

  const activeDisplayUrl = previewUrl || activeImageUrl;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
          {label}
        </label>
        {activeDisplayUrl && onClearImage && !selectedFile && (
          <button
            type="button"
            onClick={onClearImage}
            className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
          >
            Remove Current Asset
          </button>
        )}
      </div>

      {/* Main Upload / Preview Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (isUploading) return;
          if (!folder && !productId && !activeDisplayUrl) {
            setUploadError("Please select a category above before uploading artwork.");
            return;
          }
          fileInputRef.current?.click();
        }}
        className={cn(
          "relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden p-5 flex flex-col items-center justify-center min-h-[220px]",
          isDragging
            ? "border-primary bg-primary/10 shadow-[0_0_25px_oklch(0.58_0.25_285/0.3)] scale-[1.01]"
            : "border-white/[0.12] bg-[#090a12] hover:border-white/[0.25] hover:bg-[#0c0d18]",
          uploadError && "border-rose-500/50 bg-rose-500/[0.04]",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/webp,image/png,image/jpeg,image/svg+xml"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploading}
        />

        {activeDisplayUrl ? (
          <div className="w-full flex flex-col sm:flex-row items-center gap-5">
            {/* Artwork Preview Canvas with Transparency Checkerboard */}
            <div className="relative h-36 w-36 sm:h-40 sm:w-40 shrink-0 rounded-xl overflow-hidden border border-white/[0.15] shadow-inner flex items-center justify-center bg-[linear-gradient(45deg,#121324_25%,transparent_25%),linear-gradient(-45deg,#121324_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#121324_75%),linear-gradient(-45deg,transparent_75%,#121324_75%)] bg-[size:16px_16px] bg-[#07080f]">
              <img
                src={activeDisplayUrl}
                alt="Artwork preview"
                className="max-h-full max-w-full object-contain p-2 drop-shadow-md transition-transform hover:scale-105"
              />
              {selectedFile && (
                <span className="absolute bottom-2 left-2 right-2 rounded bg-black/80 backdrop-blur-sm py-0.5 text-center text-[9px] font-mono font-bold text-primary border border-white/10">
                  New Selection
                </span>
              )}
            </div>

            {/* Metadata & Validation Card */}
            <div className="flex-1 min-w-0 space-y-3 text-left w-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground truncate max-w-[220px]">
                    {selectedFile ? selectedFile.name : "Sticker Artwork"}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    {selectedFile
                      ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                      : "Sticker Design Ready"}
                  </p>
                </div>

                {activeDisplayUrl && !isUploading && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="grid h-7 w-7 place-items-center rounded-lg border border-white/[0.1] bg-white/[0.04] text-muted-foreground hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                    title="Remove artwork"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status / Validation Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                {!isUploading && activeDisplayUrl && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    <span>Artwork Ready</span>
                  </span>
                )}

                {validation?.width && validation?.height && (
                  <span className="rounded-full bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-[9px] font-mono font-bold text-muted-foreground">
                    {validation.width} × {validation.height}px
                  </span>
                )}
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-primary">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Uploading sticker artwork…</span>
                    </span>
                    <span className="font-mono font-bold">{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Replace helper */}
              {!isUploading && activeDisplayUrl && (
                <p className="text-[10px] text-muted-foreground pt-1">
                  Click box or drag another file to replace artwork.
                </p>
              )}
            </div>
          </div>
        ) : !folder && !productId ? (
          /* Missing Category State */
          <div className="py-6 text-center space-y-2">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-400">
                Please select a category above
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                A category is required to store artwork in the correct Storage folder.
              </p>
            </div>
          </div>
        ) : (
          /* Empty / Unselected State with Category Ready */
          <div className="py-6 text-center space-y-2">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.04] border border-white/[0.08] text-muted-foreground mx-auto group-hover:text-primary transition-colors">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                Drop sticker artwork here, or <span className="text-primary underline">browse</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Target Storage folder: <code className="font-mono text-primary font-bold">stickers/{folder}/</code>
              </p>
            </div>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Upload Failed</p>
              <p className="text-[11px] opacity-90">{uploadError}</p>
            </div>
          </div>
          {selectedFile && (
            <button
              type="button"
              onClick={handleStartUpload}
              className="rounded-lg bg-rose-500/20 px-2.5 py-1 text-[10px] font-bold text-rose-300 hover:bg-rose-500 hover:text-white transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
