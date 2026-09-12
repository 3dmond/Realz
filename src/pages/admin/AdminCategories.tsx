import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tags, Plus, Edit2, Search, Package, Layers } from "lucide-react";
import { fetchAdminCategories, createCategory, updateCategory } from "@/lib/admin-api";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function AdminCategories() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: number; name: string } | null>(null);
  const [nameInput, setNameInput] = useState("");

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: fetchAdminCategories,
  });

  const openCreateModal = () => {
    setEditingCategory(null);
    setNameInput("");
    setModalOpen(true);
  };

  const openEditModal = (cat: { id: number; name: string }) => {
    setEditingCategory(cat);
    setNameInput(cat.name);
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!nameInput.trim()) throw new Error("Category name cannot be empty");
      if (editingCategory) {
        await updateCategory(editingCategory.id, nameInput);
      } else {
        await createCategory(nameInput);
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

  const filteredCategories = (categories || []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Category Taxonomy
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Organize sticker collections, navigation tags, and storefront filters.
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

        <span className="text-xs text-muted-foreground hidden sm:block">
          {filteredCategories.length} categories registered
        </span>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">Loading categories…</div>
      ) : filteredCategories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-5 shadow-lg flex flex-col justify-between hover:border-white/[0.15] transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">ID: #{cat.id}</span>
                  <button
                    onClick={() => openEditModal(cat)}
                    className="rounded-lg border border-white/[0.1] bg-white/[0.04] p-1.5 text-muted-foreground hover:bg-white/[0.08] hover:text-foreground transition-colors cursor-pointer"
                    title="Rename Category"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <h3 className="mt-3 text-base font-bold text-foreground capitalize">
                  {cat.name.replace(/_/g, " ")}
                </h3>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-primary" />
                  <span>{cat.product_count} active stickers</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center rounded-2xl border border-white/[0.08] bg-[#0f101d]">
          <Tags className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
          <h3 className="text-sm font-bold text-foreground">No categories found</h3>
          <p className="mt-1 text-xs text-muted-foreground">Try adjusting your search.</p>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl border border-white/[0.12] bg-[#0c0d18] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-5">
              <h2 className="text-lg font-bold text-foreground">
                {editingCategory ? "Rename Category" : "New Category"}
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
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. anime, cyberpunk, vintage"
                  className="mt-1 h-11 bg-white/[0.04] border-white/[0.1] rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
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
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-black uppercase tracking-wider text-primary-foreground shadow-[0_0_15px_oklch(0.58_0.25_285/0.4)] hover:scale-[1.02] transition-all disabled:opacity-60 cursor-pointer"
                >
                  {saveMutation.isPending ? "Saving…" : editingCategory ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
