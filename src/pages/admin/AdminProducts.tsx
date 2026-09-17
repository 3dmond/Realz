import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link, useLocation, useNavigate } from "react-router-dom";
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
  Trash2,
  Layers,
} from "lucide-react";
import {
  fetchAdminProducts,
  fetchAdminCategories,
  fetchAdminSubcategories,
  createSubcategory,
  deleteSubcategory,
  createProduct,
  updateProduct,
  moveToBin,
  restoreFromBin,
  fetchBinProducts,
  fetchBinCount,
  permanentlyDeleteProduct,
  emptyBin,
  createCategory,
  safeDeleteCategory,
  type AdminProduct,
  type Subcategory,
  type ProductStatus,
} from "@/lib/admin-api";
import CategoryFolderCard from "@/components/admin/CategoryFolderCard";
import CategoryCreateModal from "@/components/admin/CategoryCreateModal";
import SubcategoryFolderCard from "@/components/admin/SubcategoryFolderCard";
import SubcategoryCreateModal from "@/components/admin/SubcategoryCreateModal";
import StickerUploadModal from "@/components/admin/StickerUploadModal";
import StickerEditModal from "@/components/admin/StickerEditModal";
import StickerCardGrid from "@/components/admin/StickerCardGrid";
import StickerListView from "@/components/admin/StickerListView";
import StickerBinView from "@/components/admin/StickerBinView";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn, extractErrorMessage } from "@/lib/utils";

interface AdminProductsProps {
  defaultView?: "catalogue" | "bin";
}

export default function AdminProducts({ defaultView }: AdminProductsProps = {}) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Active Category State (null = Root Folders view)
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);

  // Modals
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [createSubcategoryOpen, setCreateSubcategoryOpen] = useState(false);
  const [uploadStickerOpen, setUploadStickerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);

  // Search & View Mode
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "published" | "draft" | "archived">("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Active Subcategory from URL param ?sub=<slug>
  const activeSubcategorySlug = searchParams.get("sub");

  // View Mode: Check if URL path is /admin/bin or /admin/archive, or ?view=bin or defaultView="bin"
  const isBinView =
    defaultView === "bin" ||
    location.pathname.endsWith("/bin") ||
    location.pathname.endsWith("/archive") ||
    searchParams.get("view") === "bin";

  // Fetch Categories with counts
  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: fetchAdminCategories,
  });

  // Fetch Subcategories for active category
  const { data: subcategories = [], isLoading: subsLoading } = useQuery({
    queryKey: ["admin-subcategories", activeCategoryId],
    queryFn: () => (activeCategoryId ? fetchAdminSubcategories(activeCategoryId) : []),
    enabled: !!activeCategoryId && !isBinView,
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
    enabled: !isBinView,
  });

  const products = productsData?.products ?? [];

  // Active Subcategory object
  const activeSubcategory = useMemo(() => {
    if (!activeSubcategorySlug || subcategories.length === 0) return null;
    return subcategories.find((s) => s.slug === activeSubcategorySlug) || null;
  }, [subcategories, activeSubcategorySlug]);

  // Displayed products (filtered by active subcategory if one is active)
  const displayProducts = useMemo(() => {
    if (!activeSubcategory) return products;
    return products.filter((p) => {
      if (p.subcategory_id && p.subcategory_id === activeSubcategory.id) return true;
      if (p.image_storage_key && p.image_storage_key.includes(`/${activeSubcategory.slug}/`)) return true;
      return false;
    });
  }, [products, activeSubcategory]);

  // Fetch Bin Count
  const { data: binCount = 0 } = useQuery({
    queryKey: ["admin-bin-count"],
    queryFn: fetchBinCount,
  });

  // Fetch Bin Products (active when in bin view)
  const { data: binProducts = [], isLoading: binLoading } = useQuery({
    queryKey: ["admin-bin-products"],
    queryFn: fetchBinProducts,
    enabled: isBinView,
  });

  // Sync with URL query parameter ?folder=<slug>
  useEffect(() => {
    if (isBinView) {
      if (activeCategoryId !== null) setActiveCategoryId(null);
      return;
    }
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
  }, [searchParams, categories, isBinView]);

  const activeCategory = useMemo(() => {
    if (!activeCategoryId || isBinView) return null;
    return categories.find((c) => c.id === activeCategoryId) || null;
  }, [categories, activeCategoryId, isBinView]);

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

  // Handle entering a subcategory folder
  const handleOpenSubcategory = (subSlug: string) => {
    setSearch("");
    searchParams.set("sub", subSlug);
    setSearchParams(searchParams);
  };

  // Handle returning from subcategory to category
  const handleBackToCategory = () => {
    setSearch("");
    searchParams.delete("sub");
    setSearchParams(searchParams);
  };

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
      if (location.pathname.endsWith("/bin") || location.pathname.endsWith("/archive")) {
        navigate(`/admin/products?folder=${slug}`);
      } else {
        searchParams.delete("view");
        searchParams.delete("sub");
        searchParams.set("folder", slug);
        setSearchParams(searchParams);
      }
    }
  };

  // Handle returning to root folders
  const handleBackToRoot = () => {
    setActiveCategoryId(null);
    setSearch("");
    if (location.pathname.endsWith("/bin") || location.pathname.endsWith("/archive")) {
      navigate("/admin/products");
    } else {
      searchParams.delete("folder");
      searchParams.delete("sub");
      searchParams.delete("view");
      setSearchParams(searchParams);
    }
  };

  // Handle toggling Bin View
  const handleOpenBin = () => {
    setActiveCategoryId(null);
    setSearch("");
    navigate("/admin/bin");
  };

  const handleCloseBin = () => {
    if (location.pathname.endsWith("/bin") || location.pathname.endsWith("/archive")) {
      navigate("/admin/products");
    } else {
      searchParams.delete("view");
      setSearchParams(searchParams);
    }
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
      toast.error(extractErrorMessage(err, "Failed to create category"));
    },
  });

  const createSubcategoryMutation = useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      if (!activeCategoryId) throw new Error("No category selected");
      return createSubcategory(activeCategoryId, name, slug, activeCategorySlug);
    },
    onSuccess: (newSub) => {
      toast.success(`Subcategory "${newSub.name}" created`);
      queryClient.invalidateQueries({ queryKey: ["admin-subcategories", activeCategoryId] });
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      handleOpenSubcategory(newSub.slug);
    },
    onError: (err: unknown) => {
      toast.error(extractErrorMessage(err, "Failed to create subcategory"));
    },
  });

  const deleteSubcategoryMutation = useMutation({
    mutationFn: async (subId: number) => {
      return deleteSubcategory(subId);
    },
    onSuccess: () => {
      toast.success("Empty subcategory deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-subcategories", activeCategoryId] });
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      handleBackToCategory();
    },
    onError: (err: unknown) => {
      toast.error(extractErrorMessage(err, "Failed to delete subcategory"));
    },
  });

  const saveStickerMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      category_id: number;
      image_url: string;
      image_storage_key: string;
      subcategory_id?: number | null;
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
      toast.error(extractErrorMessage(err, "Failed to add sticker"));
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
        subcategory_id?: number | null;
        status: ProductStatus;
        price?: number;
      };
    }) => {
      return updateProduct(id, payload);
    },
    onSuccess: () => {
      toast.success("Sticker updated");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setEditingProduct(null);
    },
    onError: (err: unknown) => {
      toast.error(extractErrorMessage(err, "Failed to update sticker"));
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
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Could not update status")),
  });

  const moveToBinMutation = useMutation({
    mutationFn: async (id: number) => {
      await moveToBin(id);
    },
    onSuccess: () => {
      toast.success("Sticker moved to Recycle Bin");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bin-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Failed to move sticker to bin")),
  });

  const restoreFromBinMutation = useMutation({
    mutationFn: async (id: number) => {
      await restoreFromBin(id);
    },
    onSuccess: () => {
      toast.success("Sticker restored to catalogue");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bin-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Failed to restore sticker")),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await permanentlyDeleteProduct(id);
    },
    onSuccess: () => {
      toast.success("Sticker permanently deleted from catalogue & storage");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bin-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err: unknown) => {
      toast.error(extractErrorMessage(err, "Failed to permanently delete sticker"));
    },
  });

  const emptyBinMutation = useMutation({
    mutationFn: async () => {
      return emptyBin();
    },
    onSuccess: (res) => {
      toast.success(
        `Recycle Bin emptied (${res.deletedCount} sticker${res.deletedCount === 1 ? "" : "s"} permanently removed)`,
      );
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bin-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err: unknown) => {
      toast.error(extractErrorMessage(err, "Failed to empty bin"));
    },
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
      toast.error(extractErrorMessage(err, "Failed to delete category"));
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
                activeCategory || isBinView ? "text-muted-foreground hover:text-foreground" : "text-primary font-bold",
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Stickers</span>
            </button>

            {isBinView && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Recycle Bin</span>
                </span>
              </>
            )}

            {!isBinView && activeCategory && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                <button
                  onClick={handleBackToCategory}
                  className={cn(
                    "flex items-center gap-1.5 transition-colors cursor-pointer",
                    activeSubcategory ? "text-muted-foreground hover:text-foreground" : "text-primary font-bold",
                  )}
                >
                  <Folder className="w-3.5 h-3.5 fill-primary/20" />
                  <span>{activeCategory.name}</span>
                </button>
              </>
            )}

            {!isBinView && activeCategory && activeSubcategory && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                <span className="flex items-center gap-1.5 text-purple-400 font-bold">
                  <Folder className="w-3.5 h-3.5 fill-purple-400/20" />
                  <span>{activeSubcategory.name}</span>
                </span>
              </>
            )}
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mt-1">
            {isBinView
              ? "Recycle Bin"
              : activeSubcategory
              ? activeSubcategory.name
              : activeCategory
              ? activeCategory.name
              : "Sticker Catalogue"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
            {isBinView
              ? `${binCount} stickers in bin • Hidden from storefront`
              : activeSubcategory
              ? `stickers/${activeCategorySlug}/${activeSubcategory.slug}/ • ${displayProducts.length} stickers`
              : activeCategory
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

          {/* Bin Toggle Button */}
          <button
            onClick={() => {
              if (isBinView) {
                handleCloseBin();
              } else {
                handleOpenBin();
              }
            }}
            className={cn(
              "relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
              isBinView
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                : "bg-white/[0.04] hover:bg-white/[0.08] text-foreground border border-white/[0.08]",
            )}
            title="Recycle Bin"
          >
            <Trash2 className={cn("w-4 h-4", isBinView ? "text-rose-400" : "text-muted-foreground")} />
            <span>Bin</span>
            {binCount > 0 && (
              <span className="flex items-center gap-1.5 ml-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span className="rounded-full bg-rose-500 text-white px-1.5 py-0.5 text-[10px] font-black leading-none">
                  {binCount}
                </span>
              </span>
            )}
          </button>

          {/* Context Action: New Category vs New Subcategory + Upload Sticker */}
          {!isBinView && !activeCategory && (
            <button
              onClick={() => setCreateCategoryOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              New Category
            </button>
          )}
          {!isBinView && activeCategory && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCreateSubcategoryOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/[0.04] hover:bg-white/[0.08] text-purple-300 border border-purple-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                title="Create a new subcategory folder"
              >
                <FolderPlus className="w-4 h-4 text-purple-400" />
                <span className="hidden sm:inline">New Subcategory</span>
              </button>
              <button
                onClick={() => setUploadStickerOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Upload Sticker
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RECYCLE BIN VIEW */}
      {/* ------------------------------------------------------------- */}
      {isBinView ? (
        <StickerBinView
          products={binProducts}
          isLoading={binLoading}
          onBack={handleCloseBin}
          onRestore={async (id) => {
            await restoreFromBinMutation.mutateAsync(id);
          }}
          onPermanentDelete={async (id) => {
            await permanentDeleteMutation.mutateAsync(id);
          }}
          onEmptyBin={async () => {
            await emptyBinMutation.mutateAsync();
          }}
        />
      ) : (
        <>
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
              {/* Back button navigation */}
              <div className="mb-4">
                {activeSubcategory ? (
                  <button
                    onClick={handleBackToCategory}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to {activeCategory.name} root</span>
                  </button>
                ) : (
                  <button
                    onClick={handleBackToRoot}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to all category folders</span>
                  </button>
                )}
              </div>

              {/* Subcategories Folder Explorer (shown when in category root) */}
              {!activeSubcategory && subcategories.length > 0 && (
                <div className="mb-6 p-4 rounded-2xl border border-white/[0.08] bg-[#121324]/50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-400" />
                      <span>Subcategory Folders ({subcategories.length})</span>
                    </h3>
                    <button
                      onClick={() => setCreateSubcategoryOpen(true)}
                      className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>New Subcategory</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {subcategories.map((sub) => (
                      <SubcategoryFolderCard
                        key={sub.id}
                        id={sub.id}
                        name={sub.name}
                        slug={sub.slug}
                        categorySlug={activeCategorySlug}
                        productCount={sub.product_count || 0}
                        isActive={activeSubcategorySlug === sub.slug}
                        onOpen={handleOpenSubcategory}
                        onDelete={(id) => deleteSubcategoryMutation.mutate(id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Subcategory Filter Pills (Quick filter between all subcategories) */}
              {subcategories.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
                  <button
                    onClick={handleBackToCategory}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer",
                      !activeSubcategory
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                        : "bg-white/[0.04] text-muted-foreground hover:text-foreground hover:bg-white/[0.08] border border-white/[0.08]",
                    )}
                  >
                    All Stickers ({products.length})
                  </button>
                  {subcategories.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => handleOpenSubcategory(sub.slug)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer",
                        activeSubcategorySlug === sub.slug
                          ? "bg-purple-600 text-white shadow-sm shadow-purple-600/30"
                          : "bg-white/[0.04] text-muted-foreground hover:text-foreground hover:bg-white/[0.08] border border-white/[0.08]",
                      )}
                    >
                      {sub.name} ({sub.product_count || 0})
                    </button>
                  ))}
                </div>
              )}

              {prodsLoading ? (
                <div className="py-20 text-center text-sm text-muted-foreground">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  Loading stickers...
                </div>
              ) : isError ? (
                <div className="py-16 text-center text-rose-400 text-sm">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-80" />
                  Failed to load stickers.
                </div>
              ) : displayProducts.length === 0 ? (
                <div className="py-20 text-center rounded-2xl border border-white/[0.08] bg-[#121324]/50 p-8">
                  <Sparkles className="w-12 h-12 text-primary/40 mx-auto mb-3" />
                  <h3 className="font-bold text-foreground text-base">
                    {activeSubcategory ? `No stickers in ${activeSubcategory.name} yet` : `No stickers in ${activeCategory.name} yet`}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    Upload your first sticker into this folder.
                  </p>
                  <button
                    onClick={() => setUploadStickerOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Upload Sticker
                  </button>
                </div>
              ) : viewMode === "grid" ? (
                <StickerCardGrid
                  products={displayProducts}
                  onEdit={(prod) => setEditingProduct(prod)}
                  onToggleStatus={(id, newStatus) =>
                    toggleStatusMutation.mutate({ id, newStatus })
                  }
                  onMoveToBin={(id) => moveToBinMutation.mutate(id)}
                />
              ) : (
                <StickerListView
                  products={displayProducts}
                  onEdit={(prod) => setEditingProduct(prod)}
                  onToggleStatus={(id, newStatus) =>
                    toggleStatusMutation.mutate({ id, newStatus })
                  }
                  onMoveToBin={(id) => moveToBinMutation.mutate(id)}
                />
              )}
            </div>
          )}
        </>
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

      {/* 2. Create Subcategory Modal (Inside category level) */}
      {activeCategory && (
        <SubcategoryCreateModal
          open={createSubcategoryOpen}
          onClose={() => setCreateSubcategoryOpen(false)}
          categoryId={activeCategory.id}
          categoryName={activeCategory.name}
          categorySlug={activeCategorySlug}
          onSubmit={async (name, slug) => {
            await createSubcategoryMutation.mutateAsync({ name, slug });
          }}
        />
      )}

      {/* 3. Upload Sticker Modal (Inside active folder) */}
      {activeCategory && (
        <StickerUploadModal
          open={uploadStickerOpen}
          onClose={() => setUploadStickerOpen(false)}
          categoryId={activeCategory.id}
          categoryName={activeCategory.name}
          categorySlug={activeCategorySlug}
          subcategories={subcategories}
          defaultSubcategoryId={activeSubcategory?.id ?? null}
          onSave={async (payload) => {
            await saveStickerMutation.mutateAsync(payload);
          }}
        />
      )}

      {/* 4. Edit Sticker Modal */}
      <StickerEditModal
        open={editingProduct !== null}
        onClose={() => setEditingProduct(null)}
        product={editingProduct}
        categorySlug={activeCategorySlug || "adult_cartoons"}
        subcategories={subcategories}
        onSave={async (id, payload) => {
          await updateStickerMutation.mutateAsync({ id, payload });
        }}
        onMoveToBin={async (id) => {
          await moveToBinMutation.mutateAsync(id);
        }}
      />
    </div>
  );
}