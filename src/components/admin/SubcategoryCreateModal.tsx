import React, { useState } from "react";
import { FolderPlus, X, Folder, AlertCircle, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { extractErrorMessage } from "@/lib/utils";

interface SubcategoryCreateModalProps {
  open: boolean;
  onClose: () => void;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  onSubmit: (name: string, slug: string) => Promise<void>;
}

export default function SubcategoryCreateModal({
  open,
  onClose,
  categoryId,
  categoryName,
  categorySlug,
  onSubmit,
}: SubcategoryCreateModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const autoSlug = (raw: string) =>
    raw
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]+/g, "")
      .replace(/^-+|-+$/g, "");

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
      setError("Please enter a subcategory name");
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
      setError(extractErrorMessage(err, "Failed to create subcategory"));
    } finally {
      setLoading(false);
    }
  };

  const previewSlug = slug.trim() ? autoSlug(slug) : autoSlug(name) || "subcategory-slug";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0f101f] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4 bg-[#121324]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <FolderPlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">New Subcategory Folder</h3>
              <p className="text-[11px] text-muted-foreground">
                Inside <span className="text-primary font-semibold">{categoryName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-white/[0.05] hover:text-foreground cursor-pointer"
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
            <label className="text-xs font-bold text-foreground">Subcategory Name</label>
            <Input
              type="text"
              placeholder="e.g. Rick and Morty, The Simpsons, Anime Heroes"
              value={name}
              onChange={handleNameChange}
              autoFocus
              className="bg-white/[0.04] border-white/[0.1] rounded-xl text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Folder Slug (Path)</label>
            <Input
              type="text"
              placeholder="e.g. rick-and-morty"
              value={slug}
              onChange={(e) => setSlug(autoSlug(e.target.value))}
              className="bg-white/[0.04] border-white/[0.1] rounded-xl text-sm font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Storage destination:{" "}
              <code className="text-primary/90 bg-white/[0.05] px-1 py-0.5 rounded text-[10px]">
                stickers/{categorySlug}/{previewSlug}/
              </code>
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-white/[0.05] hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? (
                <span>Creating...</span>
              ) : (
                <>
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Create Subcategory</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
