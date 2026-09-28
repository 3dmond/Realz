import React, { useState } from "react";
import { FolderPlus, X, Folder, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { extractErrorMessage } from "@/lib/utils";

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
      setError(extractErrorMessage(err, "Failed to create category"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-xl border border-white/[0.08] bg-[#0c0d18] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5 bg-[#0e0f1b]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 border border-primary/20 text-primary">
              <FolderPlus className="h-3.5 w-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-foreground">New Category</h3>
              <p className="text-[11px] text-muted-foreground">Creates category and storage namespace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-white/[0.04] hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Category Name</label>
            <Input
              type="text"
              placeholder="e.g. Anime, Cars, Cyberpunk"
              value={name}
              onChange={handleNameChange}
              autoFocus
              className="bg-white/[0.03] border-white/[0.08] focus:border-primary/50 rounded-md text-xs h-9"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground flex items-center justify-between">
              <span>Storage Folder Slug</span>
              <span className="text-[10px] text-muted-foreground font-normal">Auto-generated</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. anime, cars, cyberpunk"
              value={slug}
              onChange={(e) => setSlug(autoSlug(e.target.value))}
              className="bg-white/[0.03] border-white/[0.08] focus:border-primary/50 rounded-md text-xs font-mono h-9"
            />
            {slug && (
              <p className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 mt-1">
                <Folder className="h-3 w-3 text-primary/70" />
                <span>Target: stickers/{slug}/</span>
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-white/[0.04] hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="h-3.5 w-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <FolderPlus className="h-3.5 w-3.5" />
              )}
              <span>Create Category</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}