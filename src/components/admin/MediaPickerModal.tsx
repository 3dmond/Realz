import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Search,
  RefreshCw,
  Folder,
  Check,
  ImageIcon,
  Sparkles,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-card border border-border/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" />
              <span>Choose from Artwork Library</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select existing artwork stored in Supabase Storage to reuse without re-uploading.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isRefetching || filesLoading}
              title="Refresh Storage contents"
              className="p-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4", (isRefetching || filesLoading) && "animate-spin")} />
            </button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 rounded-lg hover:bg-secondary"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Toolbar: Search and Category Pills */}
        <div className="p-4 border-b border-border/50 bg-secondary/15 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter by filename (e.g. gtr, bart, lion)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-background/80 border-border/60 rounded-xl text-xs"
            />
          </div>

          {/* Folder Pills Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              onClick={() => setSelectedFolder("ALL")}
              className={cn(
                "px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 text-xs",
                selectedFolder === "ALL"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/40",
              )}
            >
              All Artwork
            </button>

            {folders.map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFolder(f)}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 text-xs flex items-center gap-1.5",
                  selectedFolder === f
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/40",
                )}
              >
                <Folder className="w-3 h-3 opacity-60" />
                <span>{f}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Artwork Grid Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {filesLoading ? (
            <div className="py-24 text-center text-sm text-muted-foreground">
              <RefreshCw className="w-8 h-8 border-primary animate-spin mx-auto mb-3 text-primary" />
              <p>Scanning Supabase Storage bucket…</p>
            </div>
          ) : isError ? (
            <div className="py-20 text-center text-rose-400 text-sm">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-80" />
              <p>Failed to load Storage artwork. Please refresh.</p>
            </div>
          ) : artworkFiles.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 rounded-2xl bg-secondary/80 text-muted-foreground flex items-center justify-center mx-auto mb-3">
                <ImageIcon className="w-6 h-6" />
              </div>
              <p className="font-bold text-foreground text-sm">No artwork files found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search
                  ? `No files matching "${search}" in ${selectedFolder === "ALL" ? "any folder" : selectedFolder}.`
                  : `Folder "${selectedFolder}" does not contain any artwork files yet.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {artworkFiles.map((file) => (
                <div
                  key={file.storageKey}
                  onClick={() => {
                    onSelectArtwork(file);
                    onClose();
                  }}
                  className="group relative rounded-2xl border border-border/60 bg-card/60 hover:border-primary hover:bg-secondary/40 transition-all cursor-pointer overflow-hidden p-2 flex flex-col"
                >
                  {/* Thumbnail with checkerboard background */}
                  <div className="w-full aspect-square rounded-xl overflow-hidden relative flex items-center justify-center bg-[linear-gradient(45deg,#151624_25%,transparent_25%),linear-gradient(-45deg,#151624_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#151624_75%),linear-gradient(-45deg,transparent_75%,#151624_75%)] bg-[size:10px_10px] bg-[#0c0d18] border border-border/40">
                    <img
                      src={file.publicUrl}
                      alt={file.name}
                      className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />

                    {/* Hover Overlay Button */}
                    <div className="absolute inset-0 bg-primary/20 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-bold text-[11px] shadow-md">
                        <Check className="w-3 h-3" />
                        Select
                      </span>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="mt-2 space-y-0.5 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate" title={file.name}>
                      {file.name}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span className="truncate max-w-[90px]">{file.folder}</span>
                      {file.size > 0 && <span>{(file.size / 1024).toFixed(0)} KB</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Summary */}
        <div className="px-6 py-3 border-t border-border/60 bg-secondary/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Found <strong className="text-foreground">{artworkFiles.length}</strong> artwork files in Storage
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
