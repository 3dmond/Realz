import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Tags,
  Plus,
  Edit2,
  Search,
  Package,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import {
  fetchAdminCategories,
  createCategory,
  updateCategory,
  safeDeleteCategory,
} from "@/lib/admin-api";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{
    id: number;
    name: string;
    slug?: string;
    is_active?: boolean;
  } | null>(null);

  const [nameInput, setNameInput] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [activeInput, setActiveInput] = useState(true);

  // Safe Deletion & Reassignment Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: number;
    name: string;
    product_count: number;
  } | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<number | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: fetchAdminCategories,
  });

  const openCreateModal = () => {
    setEditingCategory(null);
    setNameInput("");
    setSlugInput("");
    setActiveInput(true);
    setModalOpen(true);
  };

  const openEditModal = (cat: { id: number; name: string; slug?: string; is_active?: boolean }) => {
    setEditingCategory(cat);
    setNameInput(cat.name);
    setSlugInput(cat.slug || "");
    setActiveInput(cat.is_active !== false);
    setModalOpen(true);
  };

  const openDeleteModal = (cat: { id: number; name: string; product_count: number }) => {
    setCategoryToDelete(cat);
    // Find first alternative category for reassignment target
    const fallback = categories?.find((c) => c.id !== cat.id)?.id ?? null;
    setReassignTargetId(fallback);
    setDeleteModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!nameInput.trim()) throw new Error("Category name cannot be empty");
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: nameInput,
          slug: slugInput,
          is_active: activeInput,
        });
      } else {
        await createCategory(nameInput, slugInput);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success(editingCategory ? "Category updated" : "Category created");
      setModalOpen(false);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to save category";
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!categoryToDelete) return;
      return safeDeleteCategory(categoryToDelete.id, reassignTargetId ?? undefined);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });

      if (res?.action === "reassigned") {
        toast.success(
          `Category deleted. ${res.reassignedCount} products were safely reassigned.`,
        );
      } else {
        toast.success("Category deleted");
      }
      setDeleteModalOpen(false);
      setCategoryToDelete(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to delete category";
      toast.error(message);
    },
  });

  const filteredCategories = (categories || []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Category Taxonomy
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage sticker collection taxonomies, URL slugs, and safe product reassignments.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-black uppercase tracking-wider text-primary-foreground shadow-[0_0_15px_oklch(0.58_0.25_285/0.4)] hover:scale-[1.02] transition-all cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-4 flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories…"
            className="h-10 bg-white/[0.04] border-white/[0.1] pl-9 text-xs rounded-xl text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary"
          />
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
        </div>

        <span className="text-xs text-muted-foreground hidden sm:block font-mono font-bold">
          {filteredCategories.length} categories active
        </span>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="py-24 text-center text-xs text-muted-foreground">Loading categories…</div>
      ) : filteredCategories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-5 shadow-lg flex flex-col justify-between hover:border-white/[0.15] transition-all group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">ID: #{cat.id}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(cat)}
                      className="rounded-lg border border-white/[0.1] bg-white/[0.04] p-1.5 text-muted-foreground hover:bg-white/[0.08] hover:text-foreground transition-colors cursor-pointer"
                      title="Edit Category"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(cat)}
                      className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-1.5 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                      title="Safe Delete / Reassign"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="mt-3 text-base font-bold text-foreground capitalize">
                  {cat.name.replace(/_/g, " ")}
                </h3>
                <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                  /{cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs">
                <Link
                  to={`/admin/products?category=${cat.id}`}
                  className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <Package className="h-3.5 w-3.5 text-primary" />
                  <span className="font-bold">{cat.product_count} stickers</span>
                  <ArrowRight className="h-3 w-3 opacity-60" />
                </Link>

                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                    cat.is_active !== false
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-slate-500/10 text-slate-400 border border-slate-500/20",
                  )}
                >
                  {cat.is_active !== false ? "Active" : "Disabled"}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center rounded-2xl border border-white/[0.08] bg-[#0f101d]">
          <Tags className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
          <h3 className="text-sm font-bold text-foreground">No categories found</h3>
          <p className="mt-1 text-xs text-muted-foreground">Try adjusting your search query.</p>
        </div>
      )}

      {/* Edit / Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#0c0d18] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-5">
              <h2 className="text-lg font-bold text-foreground">
                {editingCategory ? "Edit Category Taxonomy" : "New Category"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:text-white"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Category Name *
                </label>
                <Input
                  required
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    if (!editingCategory) {
                      setSlugInput(
                        e.target.value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, ""),
                      );
                    }
                  }}
                  placeholder="e.g. Cyberpunk"
                  className="mt-1 h-11 bg-white/[0.04] border-white/[0.1] rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  URL Route Slug
                </label>
                <Input
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value)}
                  placeholder="e.g. cyberpunk"
                  className="mt-1 h-11 bg-white/[0.04] border-white/[0.1] rounded-xl text-xs font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveInput(!activeInput)}
                  className={cn(
                    "w-full h-11 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer",
                    activeInput
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-white/[0.04] border-white/[0.1] text-muted-foreground",
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{activeInput ? "Visible on Storefront Navigation" : "Hidden / Inactive"}</span>
                </button>
              </div>

              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-white/[0.08] hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-black uppercase tracking-wider text-primary-foreground shadow-[0_0_15px_oklch(0.58_0.25_285/0.4)] hover:scale-[1.02] transition-all cursor-pointer"
                >
                  {saveMutation.isPending ? "Saving…" : editingCategory ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Category Deletion & Reassignment Modal */}
      {deleteModalOpen && categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#0c0d18] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/10 border border-rose-500/30">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Delete &quot;{categoryToDelete.name}&quot;?
                </h3>
                <p className="text-[11px] text-muted-foreground">Safe category deletion guard</p>
              </div>
            </div>

            {categoryToDelete.product_count > 0 ? (
              <div className="space-y-4 text-xs">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Active Products Rely on This Category</span>
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed opacity-90">
                    There are <strong className="font-mono text-white">{categoryToDelete.product_count}</strong> sticker products currently categorized under &quot;{categoryToDelete.name}&quot;. To prevent orphaned products, select a destination category to reassign them:
                  </p>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Reassign {categoryToDelete.product_count} Products To:
                  </label>
                  <select
                    value={reassignTargetId ?? ""}
                    onChange={(e) => setReassignTargetId(Number(e.target.value))}
                    className="mt-1 w-full h-11 rounded-xl border border-white/[0.1] bg-[#0a0b14] px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {categories
                      ?.filter((c) => c.id !== categoryToDelete.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.product_count} existing)
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">
                This category has 0 products assigned. It is safe to remove completely from the taxonomy.
              </p>
            )}

            <div className="pt-5 mt-5 border-t border-white/[0.08] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-white/[0.08]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-rose-500 transition-colors cursor-pointer"
              >
                {deleteMutation.isPending
                  ? "Processing…"
                  : categoryToDelete.product_count > 0
                    ? "Reassign & Delete"
                    : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
