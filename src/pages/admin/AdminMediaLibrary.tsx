import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ImageIcon,
  Search,
  RefreshCw,
  Folder,
  Copy,
  ExternalLink,
  Plus,
  Sparkles,
  AlertCircle,
  HardDrive,
  Layers,
  Check,
} from "lucide-react";
import {
  imageStorageService,
  type StorageArtworkFile,
} from "@/lib/storage-service";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminMediaLibrary() {
  const navigate = useNavigate();
  const [selectedFolder, setSelectedFolder] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 1. Fetch available folders in Supabase Storage
  const { data: folders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ["admin-storage-folders"],
    queryFn: () => imageStorageService.listArtworkFolders(),
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
    staleTime: 30_000,
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const inferTitle = (filename: string): string => {
    return filename
      .replace(/\.[^/.]+$/, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  const handleCreateStickerFromArtwork = (file: StorageArtworkFile) => {
    const title = inferTitle(file.name);
    // Encode parameters to prefill in Add Sticker modal
    const params = new URLSearchParams({
      create: "true",
      preset_url: file.publicUrl,
      preset_key: file.storageKey,
      preset_title: title,
      preset_folder: file.folder,
    });
    navigate(`/admin/products?${params.toString()}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-primary" />
            <span>Artwork Media Library</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live reflection of sticker artwork assets stored in Supabase Storage (<code className="text-primary font-bold">stickers</code> bucket).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isRefetching || filesLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-secondary/60 hover:bg-secondary text-foreground border border-border/60 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (isRefetching || filesLoading) && "animate-spin")} />
            <span>Refresh Storage</span>
          </button>
        </div>
      </div>

      {/* KPI / Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="rounded-2xl border border-border/70 bg-card/60 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Storage Bucket</p>
            <p className="text-sm font-black text-foreground">stickers (Public)</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/60 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Discovered Folders</p>
            <p className="text-sm font-black text-foreground">{folders.length} Category Namespaces</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/60 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Current View</p>
            <p className="text-sm font-black text-foreground">{artworkFiles.length} Artwork Assets</p>
          </div>
        </div>
      </div>

      {/* Filter and Folder Navigation Bar */}
      <div className="bg-card/70 backdrop-blur-sm border border-border/70 rounded-2xl p-4 shadow-sm space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search artwork by filename (e.g. gtr, bart, bart-simpson)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 bg-background/80 border-border/60 rounded-xl text-sm"
          />
        </div>

        {/* Folder Filter Tabs */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Folder Namespaces:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              onClick={() => setSelectedFolder("ALL")}
              className={cn(
                "px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 text-xs",
                selectedFolder === "ALL"
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                  : "bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/50",
              )}
            >
              All Folders
            </button>

            {folders.map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFolder(f)}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 text-xs flex items-center gap-1.5",
                  selectedFolder === f
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                    : "bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/50",
                )}
              >
                <Folder className="w-3 h-3 opacity-60" />
                <span>{f}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Artwork Grid */}
      <div className="bg-card/70 backdrop-blur-sm border border-border/70 rounded-2xl p-5 shadow-sm min-h-[400px]">
        {filesLoading ? (
          <div className="py-28 text-center text-sm text-muted-foreground">
            <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
            <p>Querying Supabase Storage bucket…</p>
          </div>
        ) : isError ? (
          <div className="py-24 text-center text-rose-400 text-sm">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p>Failed to load Storage artwork. Please refresh.</p>
          </div>
        ) : artworkFiles.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-secondary text-muted-foreground flex items-center justify-center mx-auto mb-3">
              <ImageIcon className="w-7 h-7 opacity-60" />
            </div>
            <h3 className="font-bold text-foreground text-base">No artwork found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              {search
                ? `No files matching "${search}" found in ${selectedFolder === "ALL" ? "any folder" : selectedFolder}.`
                : `Storage folder "${selectedFolder}" does not contain any artwork files.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {artworkFiles.map((file) => (
              <div
                key={file.storageKey}
                className="group relative rounded-2xl border border-border/60 bg-card/60 hover:border-primary/60 hover:bg-secondary/30 transition-all overflow-hidden flex flex-col p-2.5 shadow-sm"
              >
                {/* Artwork Thumbnail with transparency checkerboard */}
                <div className="w-full aspect-square rounded-xl overflow-hidden relative flex items-center justify-center bg-[linear-gradient(45deg,#151624_25%,transparent_25%),linear-gradient(-45deg,#151624_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#151624_75%),linear-gradient(-45deg,transparent_75%,#151624_75%)] bg-[size:10px_10px] bg-[#0c0d18] border border-border/40">
                  <img
                    src={file.publicUrl}
                    alt={file.name}
                    className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />

                  {/* Top-Right Open in New Tab Button */}
                  <a
                    href={file.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Open full size"
                    className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Metadata */}
                <div className="mt-2.5 space-y-1 min-w-0 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold text-foreground truncate" title={file.name}>
                      {file.name}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono mt-0.5">
                      <span className="truncate max-w-[90px] font-semibold text-primary/80">{file.folder}</span>
                      {file.size > 0 && <span>{(file.size / 1024).toFixed(0)} KB</span>}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-1">
                    <button
                      onClick={() => handleCopy(file.storageKey, "Storage key")}
                      title="Copy Storage path key"
                      className="p-1.5 rounded-lg border border-border/60 hover:bg-secondary text-muted-foreground hover:text-foreground text-[10px] font-mono transition-colors flex items-center gap-1"
                    >
                      {copiedKey === file.storageKey ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Key</span>
                    </button>

                    <button
                      onClick={() => handleCreateStickerFromArtwork(file)}
                      title="Create Sticker using this artwork"
                      className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground text-[10px] font-bold transition-all flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Use</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
