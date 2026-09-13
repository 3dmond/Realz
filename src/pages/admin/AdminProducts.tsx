import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import {
  Sparkles,
  Plus,
  Search,
  FolderPlus,
  UploadCloud,
  ImageIcon,
  LayoutGrid,
  List,
  Folder,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import {
  fetchAdminProducts,
  fetchAdminCategories,
  createProduct,
  updateProduct,
  deleteOrArchiveProduct,
  createCategory,
  safeDeleteCategory,
  type AdminProduct,
  type ProductStatus,
} from "@/lib/admin-api";
import CategoryFolderCard from "@/components/admin/CategoryFolderCard";
import CategoryCreateModal from "@/components/admin/CategoryCreateModal";
import StickerUploadModal from "@/components/admin/StickerUploadModal";
import StickerEditModal from "@/components/admin/StickerEditModal";
import StickerCardGrid from "@/components/admin/StickerCardGrid";
import StickerListView from "@/components/admin/StickerListView";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Category State (null = Root Folders view)
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);

  // Modals
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [uploadStickerOpen, setUploadStickerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);

  // Search & View Mode
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "published" | "draft" | "archived">("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Fetch Categories with counts
  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: fetchAdminCategories,
  });

  // Fetch Products
  const { data: productsData, isLoading: prodsLoading, isError } = useQuery({
    queryKey: ["admin-products", activeCategoryId, statusFilter, search],
    queryFn: () =>
      fetchAdminProducts({
        categoryId: activeCategoryId || undefined,
        statusFilter: statusFilter === "ALL" ? undefined : statusFilter,
        search: search.trim() || undefined,
        pageSize: 100, // Load all stickers for the active folder
      }),
  });

  const products = productsData?.products ?? [];

  // Sync with URL query parameter ?folder=<slug>
  useEffect(() => {
    const folderSlug = searchParams.get("folder");
    if (folderSlug && categories.length > 0) {
      const matched = categories.find(
        (c) =>
          (c.slug && c.slug.toLowerCase() === folderSlug.toLowerCase()) ||
          c.name.toLowerCase().replace(/[\s-]+/g, "_") === folderSlug.toLowerCase(),
      );
      if (matched && matched.id !== activeCategoryId) {
        setActiveCategoryId(matched.id);
      }
    } else if (!folderSlug && activeCategoryId !== null) {
      setActiveCategoryId(null);
    }
  }, [searchParams, categories]);

  const activeCategory = useMemo(() => {
    if (!activeCategoryId) return null;
    return categories.find((c) => c.id === activeCategoryId) || null;
  }, [categories, activeCategoryId]);

  const activeCategorySlug = useMemo(() => {
    if (!activeCategory) return "";
    return (
      activeCategory.slug ||
      activeCategory.name
        .toLowerCase()
        .trim()
        .replace(/[\s-]+/g, "_")
        .replace(/[^a-z0-9_]+/g, "")
    );
  }, [activeCategory]);

  // Handle entering a category folder
  const handleOpenFolder = (catId: number) => {
    setActiveCategoryId(catId);
    setSearch("");
    const cat = categories.find((c) => c.id === catId);
    if (cat) {
      const slug =
        cat.slug ||
        cat.name
          .toLowerCase()
          .trim()
          .replace(/[\s-]+/g, "_")
          .replace(/[^a-z0-9_]+/g, "");
      searchParams.set("folder", slug);
      setSearchParams(searchParams);
    }
  };

  // Handle returning to root folders
  const handleBackToRoot = () => {
    setActiveCategoryId(null);
    setSearch("");
    searchParams.delete("folder");
    setSearchParams(searchParams);
  };

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      return createCategory(name, slug);
    },
    onSuccess: (newCat) => {
      toast.success(`Category "${newCat.name}" and Storage folder created`);
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      // Automatically navigate into the newly created folder
      handleOpenFolder(newCat.id);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to create category");
    },
  });

  const saveStickerMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      category_id: number;
      image_url: string;
      image_storage_key: string;
      description?: string;
      status: ProductStatus;
    }) => {
      return createProduct({
        ...payload,
        stock_quantity: 100,
        cost_price: 6.0,
      });
    },
    onSuccess: (newProd) => {
      toast.success(`Sticker "${newProd.title}" added to catalogue`);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to add sticker");
    },
  });

  const updateStickerMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: {
        title: string;
        description?: string;
        image_url: string;
        image_storage_key?: string;
        status: ProductStatus;
      };
    }) => {
      return updateProduct(id, payload);
    },
    onSuccess: () => {
      toast.success("Sticker updated");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setEditingProduct(null);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to update sticker");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: number; newStatus: ProductStatus }) => {
      return updateProduct(id, {
        status: newStatus,
        is_active: newStatus === "published",
      });
    },
    onSuccess: (_, vars) => {
      toast.success(vars.newStatus === "published" ? "Sticker published (Live)" : "Sticker set to Draft");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
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
      toast.success(vars.isArchived ? "Sticker restored" : "Sticker archived");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: () => toast.error("Action failed"),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (catId: number) => {
      return safeDeleteCategory(catId);
    },
    onSuccess: () => {
      toast.success("Empty category deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete category");
    },
  });

  // Filter categories at root level by search
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.slug && c.slug.toLowerCase().includes(q)),
    );
  }, [categories, search]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ------------------------------------------------------------- */}
      {/* BREADCRUMBS & TOP BAR */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <button
              onClick={handleBackToRoot}
              className={cn(
                "flex items-center gap-1.5 transition-colors cursor-pointer",
                activeCategory ? "text-muted-foreground hover:text-foreground" : "text-primary font-bold",
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Stickers</span>
            </button>

            {activeCategory && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                <span className="flex items-center gap-1.5 text-primary font-bold">
                  <Folder className="w-3.5 h-3.5 fill-primary/20" />
                  <span>{activeCategory.name}</span>
                </span>
              </>
            )}
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mt-1">
            {activeCategory ? activeCategory.name : "Sticker Catalogue"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
            {activeCategory
              ? `stickers/${activeCategorySlug}/ • ${products.length} stickers`
              : "Organized by category folders. Enter a folder to view and upload stickers."}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/media"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-foreground border border-white/[0.08] transition-colors"
          >
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
            Media Library
          </Link>
          <Link
            to="/admin/bulk-upload"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-foreground border border-white/[0.08] transition-colors"
          >
            <UploadCloud className="w-4 h-4 text-muted-foreground" />
            Bulk Upload
          </Link>

          {/* Context Action: New Category vs Upload Sticker */}
          {!activeCategory ? (
            <button
              onClick={() => setCreateCategoryOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              New Category
            </button>
          ) : (
            <button
              onClick={() => setUploadStickerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Upload Sticker
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SEARCH & FILTER BAR */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-[#121324]/80 border border-white/[0.08] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={
              activeCategory
                ? `Search stickers in ${activeCategory.name}...`
                : "Search category folders..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 bg-white/[0.03] border-white/[0.08] rounded-xl text-sm"
          />
        </div>

        {/* Folder View Controls (Status filter & Grid/List view toggle) */}
        {activeCategory ? (
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-9 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-foreground focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="published">Live Only</option>
              <option value="draft">Drafts Only</option>
            </select>

            <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.03] p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Total Folders: <strong className="text-foreground">{categories.length}</strong>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* VIEW A: ROOT VIEW - CATEGORY FOLDERS GRID */}
      {/* ------------------------------------------------------------- */}
      {!activeCategory && (
        <div>
          {catsLoading ? (
            <div className="py-20 text-center text-sm text-muted-foreground">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading category folders...
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="py-20 text-center rounded-2xl border border-white/[0.08] bg-[#121324]/50 p-8">
              <Folder className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-bold text-foreground text-base">No Category Folders Found</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                {search ? "No categories match your search." : "Create your first category folder to start organizing stickers."}
              </p>
              <button
                onClick={() => setCreateCategoryOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                Create Category Folder
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredCategories.map((cat) => (
                <CategoryFolderCard
                  key={cat.id}
                  id={cat.id}
                  name={cat.name}
                  slug={cat.slug}
                  productCount={cat.product_count}
                  onOpen={handleOpenFolder}
                  onDelete={(id) => deleteCategoryMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW B: INSIDE CATEGORY FOLDER - STICKER GRID / LIST */}
      {/* ------------------------------------------------------------- */}
      {activeCategory && (
        <div>
          {/* Back button link */}
          <div className="mb-4">
            <button
              onClick={handleBackToRoot}
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to all folders</span>
            </button>
          </div>

          {prodsLoading ? (
            <div className="py-20 text-center text-sm text-muted-foreground">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading stickers in {activeCategory.name}...
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-rose-400 text-sm">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-80" />
              Failed to load stickers.
            </div>
          ) : products.length === 0 ? (
            <div className="py-20 text-center rounded-2xl border border-white/[0.08] bg-[#121324]/50 p-8">
              <Sparkles className="w-12 h-12 text-primary/40 mx-auto mb-3" />
              <h3 className="font-bold text-foreground text-base">
                No stickers in {activeCategory.name} yet
              </h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Upload your first sticker into this category. It will be stored directly in{" "}
                <span className="font-mono text-primary">stickers/{activeCategorySlug}/</span>.
              </p>
              <button
                onClick={() => setUploadStickerOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Upload First Sticker
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <StickerCardGrid
              products={products}
              onEdit={(prod) => setEditingProduct(prod)}
              onToggleStatus={(id, newStatus) =>
                toggleStatusMutation.mutate({ id, newStatus })
              }
              onArchive={(id, isArchived) =>
                archiveMutation.mutate({ id, isArchived })
              }
            />
          ) : (
            <StickerListView
              products={products}
              onEdit={(prod) => setEditingProduct(prod)}
              onToggleStatus={(id, newStatus) =>
                toggleStatusMutation.mutate({ id, newStatus })
              }
              onArchive={(id, isArchived) =>
                archiveMutation.mutate({ id, isArchived })
              }
            />
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODALS */}
      {/* ------------------------------------------------------------- */}
      {/* 1. Create Category Modal (At root level) */}
      <CategoryCreateModal
        open={createCategoryOpen}
        onClose={() => setCreateCategoryOpen(false)}
        onSubmit={async (name, slug) => {
          await createCategoryMutation.mutateAsync({ name, slug });
        }}
      />

      {/* 2. Upload Sticker Modal (Inside active folder) */}
      {activeCategory && (
        <StickerUploadModal
          open={uploadStickerOpen}
          onClose={() => setUploadStickerOpen(false)}
          categoryId={activeCategory.id}
          categoryName={activeCategory.name}
          categorySlug={activeCategorySlug}
          onSave={async (payload) => {
            await saveStickerMutation.mutateAsync(payload);
          }}
        />
      )}

      {/* 3. Edit Sticker Modal */}
      <StickerEditModal
        open={editingProduct !== null}
        onClose={() => setEditingProduct(null)}
        product={editingProduct}
        categorySlug={activeCategorySlug || "adult_cartoons"}
        onSave={async (id, payload) => {
          await updateStickerMutation.mutateAsync({ id, payload });
        }}
      />
    </div>
  );
}