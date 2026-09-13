import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import {
  Sparkles,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  Archive,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  CheckCircle2,
  ImageIcon,
} from "lucide-react";
import {
  fetchAdminProducts,
  createProduct,
  updateProduct,
  deleteOrArchiveProduct,
  fetchAdminCategories,
  type AdminProduct,
  type ProductStatus,
} from "@/lib/admin-api";
import ImageDropzone from "@/components/admin/ImageDropzone";
import MediaPickerModal from "@/components/admin/MediaPickerModal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "published" | "draft" | "archived">("ALL");
  const [sortBy, setSortBy] = useState<"id" | "title" | "created_at">("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 16;

  // Edit / Create Modal state
  const [modalOpen, setModalOpen] = useState(searchParams.get("create") === "true");
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    title: string;
    category_id: number | "";
    image_url: string;
    image_storage_key: string;
    description: string;
    status: ProductStatus;
  }>({
    title: "",
    category_id: "",
    image_url: "",
    image_storage_key: "",
    description: "",
    status: "published",
  });

  // Fetch Categories
  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: fetchAdminCategories,
  });

  // Calculate resolved category slug for Storage folder path
  const selectedCategory = categories.find((c) => c.id === Number(formData.category_id));
  const selectedCategorySlug = selectedCategory
    ? (selectedCategory.slug || selectedCategory.name)
        .toLowerCase()
        .trim()
        .replace(/[\s-]+/g, "_")
        .replace(/[^a-z0-9_]+/g, "")
    : "";

  // Handle URL presets (e.g. redirected from /admin/media "Use in Sticker")
  useEffect(() => {
    const presetUrl = searchParams.get("preset_url");
    const presetKey = searchParams.get("preset_key");
    const presetTitle = searchParams.get("preset_title");
    const presetFolder = searchParams.get("preset_folder");

    if (presetUrl && searchParams.get("create") === "true") {
      let matchedCatId: number | "" = "";
      if (presetFolder && categories.length > 0) {
        const match = categories.find(
          (c) =>
            (c.slug && c.slug.toLowerCase() === presetFolder.toLowerCase()) ||
            c.name.toLowerCase().replace(/[\s-]+/g, "_") === presetFolder.toLowerCase(),
        );
        if (match) matchedCatId = match.id;
      }
      if (!matchedCatId && categories.length > 0) {
        matchedCatId = categories[0].id;
      }

      setFormData({
        title: presetTitle || "",
        category_id: matchedCatId,
        image_url: presetUrl,
        image_storage_key: presetKey || "",
        description: "",
        status: "published",
      });
      setModalOpen(true);
    }
  }, [searchParams, categories]);

  // Fetch Products
  const {
    data: productsData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      "admin-products",
      {
        page,
        pageSize,
        search,
        categoryId: categoryFilter,
        statusFilter,
        sortBy,
        sortOrder,
      },
    ],
    queryFn: () =>
      fetchAdminProducts({
        page,
        pageSize,
        search,
        categoryId: categoryFilter,
        statusFilter,
        sortBy: sortBy === "created_at" ? "id" : sortBy,
        sortOrder,
      }),
  });

  const products = productsData?.products ?? [];
  const totalCount = productsData?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formData.category_id) throw new Error("Please select a category first.");
      if (!formData.title.trim()) throw new Error("Sticker name is required.");
      if (!formData.image_url.trim()) throw new Error("Sticker artwork is required.");

      if (editingProduct) {
        return updateProduct(editingProduct.id, {
          title: formData.title.trim(),
          category_id: Number(formData.category_id),
          image_url: formData.image_url.trim(),
          image_storage_key: formData.image_storage_key.trim() || undefined,
          description: formData.description.trim() || undefined,
          status: formData.status,
          is_active: formData.status === "published",
        });
      } else {
        return createProduct({
          title: formData.title.trim(),
          category_id: Number(formData.category_id),
          image_url: formData.image_url.trim(),
          image_storage_key: formData.image_storage_key.trim() || undefined,
          description: formData.description.trim() || undefined,
          status: formData.status,
          is_active: formData.status === "published",
          stock_quantity: 100, // On-demand printed catalogue item default
          cost_price: 6.0,
        });
      }
    },
    onSuccess: () => {
      toast.success(editingProduct ? "Sticker updated successfully" : "Sticker added to catalogue");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save sticker");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: number; newStatus: ProductStatus }) => {
      return updateProduct(id, {
        status: newStatus,
        is_active: newStatus === "published",
      });
    },
    onSuccess: (_, vars) => {
      toast.success(vars.newStatus === "published" ? "Sticker published" : "Sticker set to draft");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: () => toast.error("Could not update status"),
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, isArchived }: { id: number; isArchived: boolean }) => {
      if (isArchived) {
        return updateProduct(id, { status: "published", is_active: true });
      } else {
        return deleteOrArchiveProduct(id);
      }
    },
    onSuccess: (_, vars) => {
      toast.success(vars.isArchived ? "Sticker restored to catalogue" : "Sticker archived");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: () => toast.error("Action failed"),
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      title: "",
      category_id: categories.length > 0 ? categories[0].id : "",
      image_url: "",
      image_storage_key: "",
      description: "",
      status: "published",
    });
    setModalOpen(true);
  };

  const openEditModal = (p: AdminProduct) => {
    setEditingProduct(p);
    const resolvedStatus: ProductStatus =
      p.status || (p.is_active === false ? "archived" : "published");
    setFormData({
      title: p.title || "",
      category_id: p.category_id || (categories.length > 0 ? categories[0].id : ""),
      image_url: p.image_url || "",
      image_storage_key: p.image_storage_key || "",
      description: p.description || "",
      status: resolvedStatus === "archived" ? "draft" : resolvedStatus,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
    if (searchParams.get("create")) {
      searchParams.delete("create");
      searchParams.delete("preset_url");
      searchParams.delete("preset_key");
      searchParams.delete("preset_title");
      searchParams.delete("preset_folder");
      setSearchParams(searchParams);
    }
  };

  const inferTitleFromFilename = (filename: string): string => {
    return filename
      .replace(/\.[^/.]+$/, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Sticker Catalogue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your on-demand sticker designs. Upload artwork, assign categories, and publish instantly.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/media"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-secondary/60 hover:bg-secondary text-foreground border border-border/60 transition-colors"
          >
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
            Media Library
          </Link>
          <Link
            to="/admin/bulk-upload"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-secondary/60 hover:bg-secondary text-foreground border border-border/60 transition-colors"
          >
            <UploadCloud className="w-4 h-4 text-muted-foreground" />
            Bulk Upload
          </Link>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Add Sticker
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card/70 backdrop-blur-sm border border-border/70 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search sticker name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10 h-10 bg-background/80 border-border/60 rounded-xl text-sm"
            />
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => {
                const val = e.target.value;
                setCategoryFilter(val === "ALL" ? "ALL" : Number(val));
                setPage(1);
              }}
              className="w-full h-10 px-3 rounded-xl bg-background/80 border border-border/60 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full h-10 px-3 rounded-xl bg-background/80 border border-border/60 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="ALL">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Status Pill Summary */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
          <span className="font-medium">
            Showing <strong className="text-foreground">{products.length}</strong> of{" "}
            <strong className="text-foreground">{totalCount}</strong> stickers
          </span>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Sort:</span>
            <button
              onClick={() => {
                setSortBy((prev) => (prev === "id" ? "title" : "id"));
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
              }}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              {sortBy === "id" ? "Date Added" : "Title"} ({sortOrder.toUpperCase()})
            </button>
          </div>
        </div>
      </div>

      {/* Catalogue Table */}
      <div className="bg-card/70 backdrop-blur-sm border border-border/70 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading sticker catalogue...
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-rose-400 text-sm">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-80" />
            Failed to load stickers. Please refresh.
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-foreground text-base">No stickers found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
              {search || categoryFilter !== "ALL" || statusFilter !== "ALL"
                ? "Try clearing filters to view all sticker designs."
                : "Your catalogue is currently empty. Add your first sticker design to start selling!"}
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add First Sticker
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4 w-14 text-center">Artwork</th>
                  <th className="py-3 px-4">Display Name</th>
                  <th className="py-3 px-4 w-44">Category</th>
                  <th className="py-3 px-4 w-32 text-center">Status</th>
                  <th className="py-3 px-4 w-40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-sm">
                {products.map((prod) => {
                  const resolvedStatus: ProductStatus =
                    prod.status || (prod.is_active === false ? "archived" : "published");
                  const isArchived = resolvedStatus === "archived";
                  const isPublished = resolvedStatus === "published";
                  const isDraft = resolvedStatus === "draft";

                  return (
                    <tr
                      key={prod.id}
                      className={cn(
                        "hover:bg-secondary/20 transition-colors group",
                        isArchived && "opacity-60 bg-muted/10",
                      )}
                    >
                      {/* Artwork Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="w-12 h-12 rounded-xl border border-border/60 overflow-hidden relative flex items-center justify-center bg-[linear-gradient(45deg,#181926_25%,transparent_25%),linear-gradient(-45deg,#181926_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#181926_75%),linear-gradient(-45deg,transparent_75%,#181926_75%)] bg-[size:10px_10px] bg-[#12131f]">
                          {prod.image_url ? (
                            <img
                              src={prod.image_url}
                              alt={prod.title}
                              className="w-full h-full object-contain p-1 transition-transform group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <Sparkles className="w-5 h-5 text-muted-foreground/40" />
                          )}
                        </div>
                      </td>

                      {/* Display Name & Short Description */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-foreground text-sm block">
                          {prod.title}
                        </span>
                        {prod.description && (
                          <span className="text-[11px] text-muted-foreground truncate max-w-sm block mt-0.5">
                            {prod.description}
                          </span>
                        )}
                        {prod.image_storage_key && (
                          <span className="text-[9px] font-mono text-muted-foreground/70 block">
                            Key: {prod.image_storage_key}
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-secondary text-secondary-foreground border border-border/50">
                          {prod.categories?.name || "Uncategorized"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {isPublished && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Published
                          </span>
                        )}
                        {isDraft && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Draft
                          </span>
                        )}
                        {isArchived && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/30">
                            Archived
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Publish / Draft Toggle */}
                          {!isArchived && (
                            <button
                              onClick={() =>
                                statusMutation.mutate({
                                  id: prod.id,
                                  newStatus: isPublished ? "draft" : "published",
                                })
                              }
                              title={isPublished ? "Set to Draft" : "Publish to Store"}
                              className={cn(
                                "p-2 rounded-lg border text-xs font-medium transition-colors",
                                isPublished
                                  ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                                  : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10",
                              )}
                            >
                              {isPublished ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(prod)}
                            title="Edit Sticker"
                            className="p-2 rounded-lg border border-border/60 hover:border-primary/50 text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Archive / Restore */}
                          <button
                            onClick={() =>
                              archiveMutation.mutate({ id: prod.id, isArchived })
                            }
                            title={isArchived ? "Restore to Catalogue" : "Archive Sticker"}
                            className={cn(
                              "p-2 rounded-lg border text-xs font-medium transition-colors",
                              isArchived
                                ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                : "border-border/60 hover:border-rose-500/40 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10",
                            )}
                          >
                            {isArchived ? (
                              <RotateCcw className="w-3.5 h-3.5" />
                            ) : (
                              <Archive className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-secondary/20">
            <span className="text-xs text-muted-foreground">
              Page <strong className="text-foreground">{page}</strong> of{" "}
              <strong className="text-foreground">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-border/60 disabled:opacity-40 hover:bg-secondary text-xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-border/60 disabled:opacity-40 hover:bg-secondary text-xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Sticker Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-card border border-border/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  {editingProduct ? "Edit Sticker" : "Add New Sticker"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Realz stickers are on-demand catalogue items with unified store pricing.
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 rounded-lg hover:bg-secondary"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* 1. Category (Prominently First) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">
                    Category <span className="text-rose-400">*</span>
                  </label>
                  {selectedCategorySlug && (
                    <span className="text-[10px] font-mono text-primary font-semibold">
                      Storage folder: stickers/{selectedCategorySlug}/
                    </span>
                  )}
                </div>
                <select
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category_id: e.target.value ? Number(e.target.value) : "",
                    }))
                  }
                  className="w-full h-10 px-3 rounded-xl bg-background/80 border border-border/70 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="" disabled>
                    Select a category first…
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Artwork Upload & Library Picker */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">
                    Sticker Artwork <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setMediaPickerOpen(true)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Choose from Library</span>
                  </button>
                </div>
                <ImageDropzone
                  folder={selectedCategorySlug}
                  currentImageUrl={formData.image_url}
                  value={formData.image_url}
                  onImageUploaded={({ publicUrl, storageKey }) =>
                    setFormData((prev) => ({
                      ...prev,
                      image_url: publicUrl,
                      image_storage_key: storageKey,
                    }))
                  }
                  onChange={(url) => setFormData((prev) => ({ ...prev, image_url: url }))}
                  onClearImage={() =>
                    setFormData((prev) => ({ ...prev, image_url: "", image_storage_key: "" }))
                  }
                />
                {formData.image_storage_key && (
                  <p className="text-[10px] font-mono text-muted-foreground truncate">
                    Storage Key: <span className="text-foreground">{formData.image_storage_key}</span>
                  </p>
                )}
              </div>

              {/* 3. Display Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Display Name <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Cyber Samurai Holographic"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="bg-background/80 border-border/70 rounded-xl text-sm"
                />
              </div>

              {/* 4. Description (Optional) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Description</label>
                  <span className="text-[10px] text-muted-foreground">Optional</span>
                </div>
                <Textarea
                  placeholder="Short note or theme details for this sticker design..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={2}
                  className="bg-background/80 border-border/70 rounded-xl text-xs resize-none"
                />
              </div>

              {/* 5. Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Catalogue Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, status: "published" }))}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all",
                      formData.status === "published"
                        ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400 shadow-sm"
                        : "border-border/60 text-muted-foreground hover:bg-secondary/40",
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Published (Live)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, status: "draft" }))}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all",
                      formData.status === "draft"
                        ? "bg-amber-500/15 border-amber-500/50 text-amber-400 shadow-sm"
                        : "border-border/60 text-muted-foreground hover:bg-secondary/40",
                    )}
                  >
                    <EyeOff className="w-4 h-4" />
                    Draft (Hidden)
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border/60 bg-secondary/20 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saveMutation.isPending && (
                  <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                )}
                {editingProduct ? "Save Changes" : "Save Sticker"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        defaultFolder={selectedCategorySlug || "ALL"}
        onSelectArtwork={(artwork) => {
          setFormData((prev) => ({
            ...prev,
            image_url: artwork.publicUrl,
            image_storage_key: artwork.storageKey,
            title: prev.title.trim() ? prev.title : inferTitleFromFilename(artwork.name),
          }));
          toast.success(`Selected "${artwork.name}" from library`);
        }}
      />
    </div>
  );
}
