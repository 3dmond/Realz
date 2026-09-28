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
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Category Taxonomy
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage sticker collection taxonomies, URL slugs, and safe product reassignments.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-3 flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories…"
            className="h-8 bg-white/[0.03] border-white/[0.08] pl-8 text-xs rounded-md text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary/50"
          />
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
        </div>

        <span className="text-xs text-muted-foreground hidden sm:block font-mono">
          {filteredCategories.length} categories active
        </span>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">Loading categories…</div>
      ) : filteredCategories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-4 flex flex-col justify-between hover:border-white/[0.12] transition-colors group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">ID: #{cat.id}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(cat)}
                      className="rounded-md border border-white/[0.08] bg-white/[0.02] p-1.5 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors cursor-pointer"
                      title="Edit Category"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(cat)}
                      className="rounded-md border border-rose-500/20 bg-rose-500/10 p-1.5 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                      title="Safe Delete / Reassign"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="mt-2.5 text-sm font-semibold text-foreground capitalize">
                  {cat.name.replace(/_/g, " ")}
                </h3>
                <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                  /{cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs">
                <Link
                  to={`/admin/products?category=${cat.id}`}
                  className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 font-medium"
                >
                  <Package className="h-3.5 w-3.5 text-primary" />
                  <span>{cat.product_count} stickers</span>
                  <ArrowRight className="h-3 w-3 opacity-60" />
                </Link>

                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[9px] font-medium uppercase",
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
        <div className="py-20 text-center rounded-xl border border-white/[0.06] bg-[#0e0f1b]">
          <Tags className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2.5" />
          <h3 className="text-xs font-semibold text-foreground">No categories found</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Try adjusting your search query.</p>
        </div>
      )}

      {/* Edit / Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-xl border border-white/[0.08] bg-[#0c0d18] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5 bg-[#0e0f1b]">
              <h2 className="text-xs font-semibold text-foreground">
                {editingCategory ? "Edit Category" : "New Category"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-white/[0.04] hover:text-foreground transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
              className="p-5 space-y-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
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
                  className="h-9 bg-white/[0.03] border-white/[0.08] focus:border-primary/50 rounded-md text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  URL Route Slug
                </label>
                <Input
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value)}
                  placeholder="e.g. cyberpunk"
                  className="h-9 bg-white/[0.03] border-white/[0.08] focus:border-primary/50 rounded-md text-xs font-mono"
                />
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setActiveInput(!activeInput)}
                  className={cn(
                    "w-full h-9 rounded-md border flex items-center justify-center gap-2 text-xs font-medium transition-colors cursor-pointer",
                    activeInput
                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                      : "bg-white/[0.03] border-white/[0.08] text-muted-foreground",
                  )}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{activeInput ? "Visible on Storefront Navigation" : "Hidden / Inactive"}</span>
                </button>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-md border border-white/[0.08] bg-white/[0.02] px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="rounded-md bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {saveMutation.isPending ? "Saving…" : editingCategory ? "Save Changes" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Category Deletion & Reassignment Modal */}
      {deleteModalOpen && categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-xl border border-white/[0.08] bg-[#0c0d18] p-5 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-400 mb-4 pb-3 border-b border-white/[0.06]">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-rose-500/10 border border-rose-500/20">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-foreground">
                  Delete &quot;{categoryToDelete.name}&quot;
                </h3>
                <p className="text-[11px] text-muted-foreground">Category deletion guard</p>
              </div>
            </div>

            {categoryToDelete.product_count > 0 ? (
              <div className="space-y-3.5 text-xs">
                <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-amber-300">
                  <p className="font-medium flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>Active Products Rely on This Category</span>
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed opacity-90">
                    There are <strong className="font-mono text-white">{categoryToDelete.product_count}</strong> stickers currently categorized under &quot;{categoryToDelete.name}&quot;. Select a destination category to reassign them before deletion:
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Reassign {categoryToDelete.product_count} Products To:
                  </label>
                  <select
                    value={reassignTargetId ?? ""}
                    onChange={(e) => setReassignTargetId(Number(e.target.value))}
                    className="w-full h-9 rounded-md border border-white/[0.08] bg-[#0e0f1b] px-2.5 text-xs font-medium text-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
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
                This category has 0 products assigned. It will be permanently removed from the taxonomy.
              </p>
            )}

            <div className="pt-3.5 mt-4 border-t border-white/[0.06] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-md border border-white/[0.08] bg-white/[0.02] px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="rounded-md bg-rose-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-rose-500 transition-colors disabled:opacity-50 cursor-pointer"
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
