import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Upload,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  fetchAdminProducts,
  createProduct,
  updateProduct,
  deleteOrArchiveProduct,
  uploadStickerAsset,
  fetchAdminCategories,
  type AdminProduct,
} from "@/lib/admin-api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "active" | "archived">("ALL");
  const [stockFilter, setStockFilter] = useState<"ALL" | "low_stock" | "out_of_stock">("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Edit / Create Modal state
  const [modalOpen, setModalOpen] = useState(searchParams.get("create") === "true");
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<number>(49134);
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStock, setFormStock] = useState(100);
  const [formActive, setFormActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: fetchAdminCategories,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "products", { categoryFilter, statusFilter, stockFilter, search, page }],
    queryFn: () =>
      fetchAdminProducts({
        categoryId: categoryFilter,
        statusFilter,
        stockFilter,
        search,
        page,
        pageSize,
      }),
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormTitle("");
    setFormCategory(categories?.[0]?.id ?? 49134);
    setFormImageUrl("");
    setFormDescription("");
    setFormStock(100);
    setFormActive(true);
    setModalOpen(true);
  };

  const openEditModal = (p: AdminProduct) => {
    setEditingProduct(p);
    setFormTitle(p.title);
    setFormCategory(p.category_id);
    setFormImageUrl(p.image_url);
    setFormDescription(p.description || "");
    setFormStock(p.stock_quantity ?? 100);
    setFormActive(p.is_active !== false);
    setModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const catName = categories?.find((c) => c.id === formCategory)?.name || "general";
    setUploading(true);
    try {
      const { publicUrl } = await uploadStickerAsset(file, catName);
      setFormImageUrl(publicUrl);
      toast.success("Image uploaded to Supabase Storage");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload image";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formTitle.trim()) throw new Error("Title is required");
      if (!formImageUrl.trim()) throw new Error("Product image is required");

      if (editingProduct) {
        return updateProduct(editingProduct.id, {
          title: formTitle,
          category_id: formCategory,
          image_url: formImageUrl,
          description: formDescription,
          stock_quantity: formStock,
          is_active: formActive,
        });
      } else {
        return createProduct({
          title: formTitle,
          category_id: formCategory,
          image_url: formImageUrl,
          description: formDescription,
          stock_quantity: formStock,
          is_active: formActive,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(editingProduct ? "Product updated" : "Product created");
      setModalOpen(false);
      setSearchParams({});
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to save product";
      toast.error(message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      await updateProduct(id, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Catalog visibility updated");
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to toggle status";
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return deleteOrArchiveProduct(id);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (result.actionTaken === "archived") {
        toast.info(
          "Product is referenced in historical orders and was archived instead of deleted to protect order history.",
        );
      } else {
        toast.success("Product permanently deleted");
      }
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to delete product";
      toast.error(message);
    },
  });

  const handleDelete = (p: AdminProduct) => {
    if (
      confirm(
        `Are you sure you want to remove "${p.title}"? If it has historical order records, it will be safely archived.`,
      )
    ) {
      deleteMutation.mutate(p.id);
    }
  };

  const totalPages = Math.ceil((data?.totalCount ?? 0) / pageSize);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Product Catalogue
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage stickers, media assets, category links, inventory levels, and visibility.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-black uppercase tracking-wider text-primary-foreground shadow-[0_0_15px_oklch(0.58_0.25_285/0.4)] hover:scale-[1.02] transition-all cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Sticker Artwork</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full lg:w-80">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search sticker title…"
            className="h-10 bg-white/[0.04] border-white/[0.1] pl-9 text-xs rounded-xl text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary"
          />
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Category dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value));
              setPage(1);
            }}
            className="h-10 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL" className="bg-[#0c0d18]">
              All Categories
            </option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#0c0d18]">
                {c.name} ({c.product_count})
              </option>
            ))}
          </select>

          {/* Status dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "ALL" | "active" | "archived");
              setPage(1);
            }}
            className="h-10 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL" className="bg-[#0c0d18]">
              All Visibility
            </option>
            <option value="active" className="bg-[#0c0d18]">
              Active Only
            </option>
            <option value="archived" className="bg-[#0c0d18]">
              Archived Only
            </option>
          </select>

          {/* Stock filter */}
          <select
            value={stockFilter}
            onChange={(e) => {
              setStockFilter(e.target.value as "ALL" | "low_stock" | "out_of_stock");
              setPage(1);
            }}
            className="h-10 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL" className="bg-[#0c0d18]">
              All Inventory
            </option>
            <option value="low_stock" className="bg-[#0c0d18]">
              Low Stock (&lt;15)
            </option>
            <option value="out_of_stock" className="bg-[#0c0d18]">
              Out of Stock (0)
            </option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-muted-foreground">Loading products…</div>
        ) : data?.products && data.products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                  <th className="py-3.5 px-4">Sticker</th>
                  <th className="py-3.5 px-4">Title</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Inventory Stock</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {data.products.map((prod) => {
                  const stock = prod.stock_quantity ?? 100;
                  const isActive = prod.is_active !== false;

                  return (
                    <tr key={prod.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        {prod.image_url ? (
                          <img
                            src={prod.image_url}
                            alt={prod.title}
                            className="h-12 w-12 rounded-lg object-contain bg-black/40 p-1 border border-white/[0.08]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-white/5 grid place-items-center text-[10px] text-muted-foreground">
                            No Asset
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-foreground text-sm">{prod.title}</span>
                        <p className="text-[10px] font-mono text-muted-foreground">
                          ID: #{prod.id}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="rounded-full bg-white/[0.06] border border-white/[0.08] px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase">
                          {prod.categories?.name || `Cat #${prod.category_id}`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-black tabular-nums text-xs ${
                              stock <= 0
                                ? "text-rose-400"
                                : stock < 15
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                            }`}
                          >
                            {stock} in stock
                          </span>
                          {stock < 15 && stock > 0 && (
                            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 border border-amber-500/30">
                              Low
                            </span>
                          )}
                          {stock <= 0 && (
                            <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold text-rose-400 border border-rose-500/30">
                              Out
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() =>
                            toggleActiveMutation.mutate({ id: prod.id, is_active: !isActive })
                          }
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                            isActive
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                              : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"
                          }`}
                        >
                          {isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          <span>{isActive ? "Active" : "Archived"}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(prod)}
                            className="rounded-lg border border-white/[0.1] bg-white/[0.04] p-2 text-muted-foreground hover:bg-white/[0.08] hover:text-foreground transition-colors cursor-pointer"
                            title="Edit Sticker"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(prod)}
                            className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                            title="Delete / Archive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-24 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
            <h3 className="text-sm font-bold text-foreground">No stickers found</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Try adjusting your search terms or create a new sticker artwork.
            </p>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/[0.08] px-4 py-3 bg-white/[0.01]">
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages} ({data?.totalCount} total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.1] text-muted-foreground hover:bg-white/[0.05] disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.1] text-muted-foreground hover:bg-white/[0.05] disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.12] bg-[#0c0d18] p-6 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  {editingProduct ? "Edit Product" : "New Sticker Entry"}
                </span>
                <h2 className="text-lg font-bold text-foreground">
                  {editingProduct ? editingProduct.title : "Add New Artwork"}
                </h2>
              </div>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setSearchParams({});
                }}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/[0.08] hover:text-white"
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
                  Artwork Title *
                </label>
                <Input
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Cyber Samurai"
                  className="mt-1 h-11 bg-white/[0.04] border-white/[0.1] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Category *
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(Number(e.target.value))}
                  className="mt-1 w-full h-11 rounded-xl border border-white/[0.1] bg-[#0c0d18] px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#0c0d18]">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Image Upload & URL */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Sticker Artwork Image *
                </label>
                <div className="mt-1 flex items-center gap-3">
                  <div className="h-16 w-16 shrink-0 rounded-xl border border-white/[0.1] bg-black/40 p-1 flex items-center justify-center overflow-hidden">
                    {formImageUrl ? (
                      <img
                        src={formImageUrl}
                        alt="Preview"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60">No Pic</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/webp,image/png,image/jpeg,image/svg+xml"
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] py-2 text-xs font-bold text-foreground hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>
                        {uploading ? "Uploading to Storage…" : "Upload Sticker File (WebP/PNG)"}
                      </span>
                    </button>
                    <Input
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      placeholder="Or paste image URL directly…"
                      className="h-9 bg-white/[0.04] border-white/[0.1] rounded-xl text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Stock Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Initial Stock
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(Math.max(0, parseInt(e.target.value) || 0))}
                    className="mt-1 h-11 bg-white/[0.04] border-white/[0.1] rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Storefront Active
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormActive(!formActive)}
                    className={`mt-1 w-full h-11 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      formActive
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-white/[0.04] border-white/[0.1] text-muted-foreground"
                    }`}
                  >
                    {formActive ? <Check className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    <span>{formActive ? "Visible in Shop" : "Hidden / Archived"}</span>
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Description
                </label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Collector details, finish, artwork notes…"
                  rows={3}
                  className="mt-1 bg-white/[0.04] border-white/[0.1] rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setSearchParams({});
                  }}
                  className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-white/[0.08] hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending || uploading}
                  className="rounded-xl bg-primary px-5 py-2 text-xs font-black uppercase tracking-wider text-primary-foreground shadow-[0_0_15px_oklch(0.58_0.25_285/0.4)] hover:scale-[1.02] transition-all disabled:opacity-60 cursor-pointer"
                >
                  {saveMutation.isPending
                    ? "Saving…"
                    : editingProduct
                      ? "Update Sticker"
                      : "Create Sticker"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
