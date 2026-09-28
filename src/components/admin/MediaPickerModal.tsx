import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Search,
  RefreshCw,
  Folder,
  Check,
  ImageIcon,
  AlertCircle,
} from "lucide-react";
import {
  imageStorageService,
  type StorageArtworkFile,
} from "@/lib/storage-service";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelectArtwork: (artwork: StorageArtworkFile) => void;
  defaultFolder?: string;
}

export default function MediaPickerModal({
  open,
  onClose,
  onSelectArtwork,
  defaultFolder,
}: MediaPickerModalProps) {
  const [selectedFolder, setSelectedFolder] = useState<string>(defaultFolder || "ALL");
  const [search, setSearch] = useState("");

  // 1. Fetch available folders in Supabase Storage
  const { data: folders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ["admin-storage-folders"],
    queryFn: () => imageStorageService.listArtworkFolders(),
    enabled: open,
    staleTime: 60_000,
  });

  // 2. Fetch artwork in selected folder
  const {
    data: artworkFiles = [],
    isLoading: filesLoading,
    isRefetching,
    refetch,
    isError,
  } = useQuery({
    queryKey: ["admin-storage-artwork", selectedFolder, search],
    queryFn: () => imageStorageService.listArtwork(selectedFolder, { search }),
    enabled: open,
    staleTime: 30_000,
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0c0d18] border border-white/[0.08] rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/[0.06] bg-[#0e0f1b] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-xs text-foreground flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5 text-primary" />
              <span>Artwork Storage Library</span>
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Select an asset from Supabase Storage to reuse without re-uploading.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => refetch()}
              disabled={isRefetching || filesLoading}
              title="Refresh Storage contents"
              className="p-1.5 rounded-md border border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", (isRefetching || filesLoading) && "animate-spin")} />
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar: Search and Category Tabs */}
        <div className="p-3.5 border-b border-white/[0.06] bg-[#0e0f1b]/60 space-y-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              type="text"
              placeholder="Filter by filename (e.g. gtr, bart, lion)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 bg-white/[0.03] border-white/[0.08] focus:border-primary/50 rounded-md text-xs"
            />
          </div>

          {/* Folder Pills Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
            <button
              onClick={() => setSelectedFolder("ALL")}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 cursor-pointer",
                selectedFolder === "ALL"
                  ? "bg-white/[0.1] text-foreground border border-white/[0.15]"
                  : "bg-white/[0.02] text-muted-foreground hover:text-foreground hover:bg-white/[0.05] border border-white/[0.06]",
              )}
            >
              All Assets
            </button>

            {folders.map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFolder(f)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer",
                  selectedFolder === f
                    ? "bg-white/[0.1] text-foreground border border-white/[0.15]"
                    : "bg-white/[0.02] text-muted-foreground hover:text-foreground hover:bg-white/[0.05] border border-white/[0.06]",
                )}
              >
                <Folder className="w-3 h-3 opacity-60" />
                <span>{f}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Artwork Grid Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#0a0b14]">
          {filesLoading ? (
            <div className="py-20 text-center text-xs text-muted-foreground">
              <RefreshCw className="w-6 h-6 text-primary animate-spin mx-auto mb-2.5" />
              <p>Scanning Supabase Storage bucket…</p>
            </div>
          ) : isError ? (
            <div className="py-20 text-center text-rose-400 text-xs">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-80" />
              <p>Failed to load Storage artwork. Please refresh.</p>
            </div>
          ) : artworkFiles.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 rounded-md bg-white/[0.03] border border-white/[0.06] text-muted-foreground flex items-center justify-center mx-auto mb-2.5">
                <ImageIcon className="w-5 h-5 opacity-60" />
              </div>
              <p className="font-semibold text-foreground text-xs">No artwork files found</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {search
                  ? `No files matching "${search}" in ${selectedFolder === "ALL" ? "any folder" : selectedFolder}.`
                  : `Folder "${selectedFolder}" does not contain any artwork files yet.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {artworkFiles.map((file) => (
                <div
                  key={file.storageKey}
                  onClick={() => {
                    onSelectArtwork(file);
                    onClose();
                  }}
                  className="group relative rounded-lg border border-white/[0.06] bg-[#0e0f1b] hover:border-white/[0.15] transition-all cursor-pointer overflow-hidden p-2 flex flex-col"
                >
                  {/* Thumbnail with neutral dark canvas */}
                  <div className="w-full aspect-square rounded-md overflow-hidden relative flex items-center justify-center bg-[#070810] border border-white/[0.04]">
                    <img
                      src={file.publicUrl}
                      alt={file.name}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />

                    {/* Hover Overlay Button */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-primary-foreground font-medium text-[11px]">
                        <Check className="w-3 h-3" />
                        Select
                      </span>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="mt-2 space-y-0.5 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate" title={file.name}>
                      {file.name}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span className="truncate max-w-[85px]">{file.folder}</span>
                      {file.size > 0 && <span>{(file.size / 1024).toFixed(0)} KB</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Summary */}
        <div className="px-5 py-2.5 border-t border-white/[0.06] bg-[#0e0f1b] flex items-center justify-between text-xs text-muted-foreground">
          <span className="text-[11px]">
            Total <strong className="text-foreground font-mono">{artworkFiles.length}</strong> assets found
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
