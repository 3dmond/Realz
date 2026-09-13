import React, { useState } from "react";
import { FolderPlus, X, Folder, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

interface CategoryCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, slug: string) => Promise<void>;
}

export default function CategoryCreateModal({
  open,
  onClose,
  onSubmit,
}: CategoryCreateModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const autoSlug = (raw: string) =>
    raw
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, "_")
      .replace(/[^a-z0-9_]+/g, "");

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!slug || slug === autoSlug(name)) {
      setSlug(autoSlug(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a category name");
      return;
    }

    const finalSlug = slug.trim() ? autoSlug(slug) : autoSlug(name);
    setLoading(true);
    setError(null);

    try {
      await onSubmit(name.trim(), finalSlug);
      setName("");
      setSlug("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0f101f] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <FolderPlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">New Category Folder</h3>
              <p className="text-[11px] text-muted-foreground">Creates category and Supabase Storage folder</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Category Name</label>
            <Input
              type="text"
              placeholder="e.g. Anime, Cars, Cyberpunk"
              value={name}
              onChange={handleNameChange}
              autoFocus
              className="bg-white/[0.04] border-white/[0.1] rounded-xl text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>Storage Folder Slug</span>
              <span className="text-[10px] text-muted-foreground font-normal">Auto-generated</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. anime, cars, cyberpunk"
              value={slug}
              onChange={(e) => setSlug(autoSlug(e.target.value))}
              className="bg-white/[0.04] border-white/[0.1] rounded-xl text-xs font-mono"
            />
            {slug && (
              <p className="text-[10px] font-mono text-primary flex items-center gap-1 mt-1">
                <Folder className="h-3 w-3" />
                Target: stickers/{slug}/
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-white/[0.05] hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="h-3.5 w-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <FolderPlus className="h-3.5 w-3.5" />
              )}
              Create Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}