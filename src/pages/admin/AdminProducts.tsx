import React, { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Sparkles,
  Plus,
  Search,
  FolderPlus,
  UploadCloud,
  LayoutGrid,
  List,
  Folder,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  Trash2,
  Layers,
  Check,
  EyeOff,
  Eye,
  X,
  CheckSquare,
  Square,
} from "lucide-react";
import {
  fetchAdminProducts,
  fetchAdminCategories,
  fetchAdminSubcategories,
  createSubcategory,
  deleteSubcategory,
  createProduct,
  updateProduct,
  updateMultipleProductsStatus,
  moveMultipleProductsToBin,
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
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);

  // Multi-Selection State
  const [selectedStickerIds, setSelectedStickerIds] = useState<number[]>([]);

  // Search & View Mode
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "published" | "draft" | "archived">("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [canvasStyle, setCanvasStyle] = useState<"dark" | "checkerboard">("dark");

  // Window-level Drag Overlay State
  const [isWindowDragging, setIsWindowDragging] = useState(false);
  const dragCounterRef = useRef(0);

  // Active Subcategory from URL param ?sub=<slug>
  const activeSubcategorySlug = searchParams.get("sub");

  // View Mode: Check if URL path is /admin/bin or /admin/archive, or ?view=bin or defaultView="bin"
  const isBinView =
    defaultView === "bin" ||
    location.pathname.endsWith("/bin") ||
    location.pathname.endsWith("/archive") ||
    searchParams.get("view") === "bin";

  // Fetch Categories with counts & thumbnail previews (1 single query, zero N+1)
  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: fetchAdminCategories,
  });

  // Fetch Subcategories for active category
  const { data: subcategories = [] } = useQuery({
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
      setSelectedStickerIds([]);
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
        setSelectedStickerIds([]);
      }
    } else if (!folderSlug && activeCategoryId !== null) {
      setActiveCategoryId(null);
      setSelectedStickerIds([]);
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

  // Window-level Drag and Drop Listener (Active when inside a folder)
  useEffect(() => {
    if (!activeCategory || isBinView) return;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current++;
      if (e.dataTransfer && e.dataTransfer.types.includes("Files")) {
        setIsWindowDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current--;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsWindowDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsWindowDragging(false);

      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const validFiles = Array.from(e.dataTransfer.files).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (validFiles.length > 0) {
          setDroppedFiles(validFiles);
          setUploadStickerOpen(true);
        } else {
          toast.error("Please drop image files (PNG, JPG, WEBP, SVG)");
        }
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [activeCategory, isBinView]);

  // Selection handlers
  const handleToggleSelect = (id: number) => {
    setSelectedStickerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAllOnPage = () => {
    if (selectedStickerIds.length === displayProducts.length) {
      setSelectedStickerIds([]);
    } else {
      setSelectedStickerIds(displayProducts.map((p) => p.id));
    }
  };

  // Navigation handlers
  const handleOpenSubcategory = (subSlug: string) => {
    setSearch("");
    setSelectedStickerIds([]);
    searchParams.set("sub", subSlug);
    setSearchParams(searchParams);
  };

  const handleBackToCategory = () => {
    setSearch("");
    setSelectedStickerIds([]);
    searchParams.delete("sub");
    setSearchParams(searchParams);
  };

  const handleOpenFolder = (catId: number) => {
    setActiveCategoryId(catId);
    setSearch("");
    setSelectedStickerIds([]);
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

  const handleBackToRoot = () => {
    setActiveCategoryId(null);
    setSearch("");
    setSelectedStickerIds([]);
    if (location.pathname.endsWith("/bin") || location.pathname.endsWith("/archive")) {
      navigate("/admin/products");
    } else {
      searchParams.delete("folder");
      searchParams.delete("sub");
      searchParams.delete("view");
      setSearchParams(searchParams);
    }
  };

  const handleOpenBin = () => {
    setActiveCategoryId(null);
    setSearch("");
    setSelectedStickerIds([]);
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
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setCreateCategoryOpen(false);
    },
    onError: (err: unknown) => {
      toast.error(extractErrorMessage(err, "Failed to create category"));
    },
  });

  const createSubcategoryMutation = useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      if (!activeCategoryId) throw new Error("No active category selected");
      return createSubcategory(activeCategoryId, name, slug, activeCategorySlug);
    },
    onSuccess: (newSub) => {
      toast.success(`Subcategory "${newSub.name}" created`);
      queryClient.invalidateQueries({ queryKey: ["admin-subcategories", activeCategoryId] });
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      setCreateSubcategoryOpen(false);
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
      toast.success("Subcategory deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-subcategories", activeCategoryId] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      if (activeSubcategorySlug) {
        handleBackToCategory();
      }
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
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
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
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
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
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
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
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bin-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Failed to move sticker to bin")),
  });

  // Batch Mutations
  const batchUpdateStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: number[]; status: ProductStatus }) => {
      await updateMultipleProductsStatus(ids, status);
    },
    onSuccess: (_, vars) => {
      toast.success(
        vars.status === "published"
          ? `${vars.ids.length} stickers published (Live)`
          : `${vars.ids.length} stickers set to Draft`,
      );
      setSelectedStickerIds([]);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Batch update failed")),
  });

  const batchMoveToBinMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await moveMultipleProductsToBin(ids);
    },
    onSuccess: (_, ids) => {
      toast.success(`${ids.length} stickers moved to Recycle Bin`);
      setSelectedStickerIds([]);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bin-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: unknown) => toast.error(extractErrorMessage(err, "Batch move to bin failed")),
  });

  const restoreFromBinMutation = useMutation({
    mutationFn: async (id: number) => {
      await restoreFromBin(id);
    },
    onSuccess: () => {
      toast.success("Sticker restored to catalogue");
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
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
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
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
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
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
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
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
    <div className="space-y-6 max-w-7xl mx-auto pb-16 relative">
      {/* ------------------------------------------------------------- */}
      {/* WINDOW-LEVEL DRAG OVERLAY */}
      {/* ------------------------------------------------------------- */}
      {isWindowDragging && (
        <div className="fixed inset-0 z-50 bg-[#0c0d18]/85 backdrop-blur-xs border-2 border-dashed border-primary flex flex-col items-center justify-center pointer-events-none transition-all">
          <div className="h-16 w-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary mb-3 animate-pulse">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            Drop sticker artwork to upload
          </h3>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Target folder: stickers/{activeCategorySlug}/
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* BREADCRUMBS & TOP BAR */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <button
              onClick={handleBackToRoot}
              className={cn(
                "flex items-center gap-1.5 transition-colors cursor-pointer",
                activeCategory || isBinView ? "hover:text-foreground" : "text-foreground font-semibold",
              )}
            >
              <Layers className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Stickers</span>
            </button>

            {isBinView && (
              <>
                <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                <span className="flex items-center gap-1 text-rose-400 font-semibold">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Recycle Bin</span>
                </span>
              </>
            )}

            {!isBinView && activeCategory && (
              <>
                <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                <button
                  onClick={handleBackToCategory}
                  className={cn(
                    "flex items-center gap-1 transition-colors cursor-pointer",
                    activeSubcategory ? "hover:text-foreground" : "text-foreground font-semibold",
                  )}
                >
                  <Folder className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{activeCategory.name}</span>
                </button>
              </>
            )}

            {!isBinView && activeCategory && activeSubcategory && (
              <>
                <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                <span className="flex items-center gap-1 text-foreground font-semibold">
                  <Folder className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{activeSubcategory.name}</span>
                </span>
              </>
            )}
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            {isBinView
              ? "Recycle Bin"
              : activeSubcategory
              ? activeSubcategory.name
              : activeCategory
              ? activeCategory.name
              : "Sticker Catalogue"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isBinView
              ? `${binCount} stickers in bin • Soft-deleted from storefront`
              : activeSubcategory
              ? `stickers/${activeCategorySlug}/${activeSubcategory.slug}/ • ${displayProducts.length} stickers`
              : activeCategory
              ? `stickers/${activeCategorySlug}/ • ${products.length} stickers`
              : "Organized by category folders. Select a folder to view and upload stickers."}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <Link
            to="/admin/bulk-upload"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white/[0.02] hover:bg-white/[0.06] text-muted-foreground hover:text-foreground border border-white/[0.08] transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Bulk Upload</span>
          </Link>

          {/* Bin Toggle Button (visible when in catalogue view) */}
          {!isBinView && (
            <button
              onClick={handleOpenBin}
              className="relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer bg-white/[0.02] hover:bg-white/[0.06] text-muted-foreground hover:text-foreground border border-white/[0.08]"
              title="Recycle Bin"
            >
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Bin</span>
              {binCount > 0 && (
                <span className="rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.2 text-[10px] font-mono font-semibold ml-0.5">
                  {binCount}
                </span>
              )}
            </button>
          )}

          {/* Context Action: New Category vs New Subcategory + Upload Sticker */}
          {!isBinView && !activeCategory && (
            <button
              onClick={() => setCreateCategoryOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>New Category</span>
            </button>
          )}
          {!isBinView && activeCategory && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCreateSubcategoryOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white/[0.02] hover:bg-white/[0.06] text-foreground border border-white/[0.08] transition-colors cursor-pointer"
                title="Create a new subcategory folder"
              >
                <FolderPlus className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">New Subcategory</span>
              </button>
              <button
                onClick={() => {
                  setDroppedFiles([]);
                  setUploadStickerOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload Sticker</span>
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
          <div className="bg-[#0e0f1b] border border-white/[0.06] rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                type="text"
                placeholder={
                  activeCategory
                    ? `Search stickers in ${activeCategory.name}…`
                    : "Search category folders…"
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 bg-white/[0.03] border-white/[0.08] rounded-md text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>

            {/* Folder View Controls (Status filter, Canvas Toggle, Grid/List view toggle) */}
            {activeCategory ? (
              <div className="flex items-center justify-between w-full sm:w-auto gap-2 flex-wrap">
                {/* Select All on Page Button */}
                {displayProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllOnPage}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-xs font-medium text-foreground transition-colors cursor-pointer"
                  >
                    {selectedStickerIds.length === displayProducts.length ? (
                      <CheckSquare className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <span>
                      {selectedStickerIds.length === displayProducts.length
                        ? "Deselect All"
                        : "Select All"}
                    </span>
                  </button>
                )}

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="h-9 px-2.5 rounded-md bg-white/[0.03] border border-white/[0.08] text-xs font-medium text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="published">Live Only</option>
                  <option value="draft">Drafts Only</option>
                </select>

                {/* Die-Cut Inspection Canvas Background Toggle */}
                <div className="flex items-center rounded-md border border-white/[0.08] bg-white/[0.02] p-0.5">
                  <button
                    type="button"
                    onClick={() => setCanvasStyle("dark")}
                    className={cn(
                      "px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1",
                      canvasStyle === "dark"
                        ? "bg-white/[0.1] text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    title="Studio Dark Canvas"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-[#070810] border border-white/20" />
                    <span className="hidden md:inline">Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCanvasStyle("checkerboard")}
                    className={cn(
                      "px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1",
                      canvasStyle === "checkerboard"
                        ? "bg-white/[0.1] text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    title="Alpha Transparency Grid (Die-Cut Inspection)"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-transparency-grid border border-white/20" />
                    <span className="hidden md:inline">Alpha Grid</span>
                  </button>
                </div>

                {/* Grid / List View Mode Toggle */}
                <div className="flex items-center rounded-md border border-white/[0.08] bg-white/[0.02] p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "p-1.5 rounded transition-colors cursor-pointer",
                      viewMode === "grid"
                        ? "bg-white/[0.1] text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "p-1.5 rounded transition-colors cursor-pointer",
                      viewMode === "list"
                        ? "bg-white/[0.1] text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
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
                <div className="py-20 text-center text-xs text-muted-foreground">
                  Loading category folders…
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="py-16 text-center rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-8">
                  <Folder className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <h3 className="font-semibold text-foreground text-sm">No Category Folders Found</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-4">
                    {search ? "No categories match your search." : "Create your first category folder to start organizing stickers."}
                  </p>
                  <button
                    onClick={() => setCreateCategoryOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Create Category Folder</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {filteredCategories.map((cat) => (
                    <CategoryFolderCard
                      key={cat.id}
                      id={cat.id}
                      name={cat.name}
                      slug={cat.slug}
                      productCount={cat.product_count}
                      draftCount={cat.draft_count}
                      previews={cat.previews}
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
              <div className="mb-3">
                {activeSubcategory ? (
                  <button
                    onClick={handleBackToCategory}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to {activeCategory.name} root</span>
                  </button>
                ) : (
                  <button
                    onClick={handleBackToRoot}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to all category folders</span>
                  </button>
                )}
              </div>

              {/* Subcategories Folder Explorer (shown when in category root) */}
              {!activeSubcategory && subcategories.length > 0 && (
                <div className="mb-5 p-4 rounded-xl border border-white/[0.06] bg-[#0e0f1b]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      <span>Subcategory Folders ({subcategories.length})</span>
                    </h3>
                    <button
                      onClick={() => setCreateSubcategoryOpen(true)}
                      className="text-xs font-medium text-primary hover:underline transition-colors flex items-center gap-1 cursor-pointer"
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
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none">
                  <button
                    onClick={handleBackToCategory}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-medium shrink-0 transition-colors cursor-pointer",
                      !activeSubcategory
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "bg-white/[0.02] text-muted-foreground hover:text-foreground hover:bg-white/[0.05] border border-white/[0.08]",
                    )}
                  >
                    All Stickers ({products.length})
                  </button>
                  {subcategories.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => handleOpenSubcategory(sub.slug)}
                      className={cn(
                        "px-3 py-1 rounded-md text-xs font-medium shrink-0 transition-colors cursor-pointer",
                        activeSubcategorySlug === sub.slug
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "bg-white/[0.02] text-muted-foreground hover:text-foreground hover:bg-white/[0.05] border border-white/[0.08]",
                      )}
                    >
                      {sub.name} ({sub.product_count || 0})
                    </button>
                  ))}
                </div>
              )}

              {/* Stickers Collection Display */}
              {prodsLoading ? (
                <div className="py-20 text-center text-xs text-muted-foreground">
                  Loading stickers…
                </div>
              ) : isError ? (
                <div className="py-16 text-center text-rose-400 text-xs">
                  <AlertCircle className="w-6 h-6 mx-auto mb-1.5 opacity-80" />
                  Failed to load stickers.
                </div>
              ) : displayProducts.length === 0 ? (
                <div className="py-16 text-center rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-8">
                  <Layers className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <h3 className="font-semibold text-foreground text-sm">
                    {activeSubcategory ? `No stickers in ${activeSubcategory.name} yet` : `No stickers in ${activeCategory.name} yet`}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-4">
                    Upload your first sticker into this folder.
                  </p>
                  <button
                    onClick={() => {
                      setDroppedFiles([]);
                      setUploadStickerOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload Sticker</span>
                  </button>
                </div>
              ) : viewMode === "grid" ? (
                <StickerCardGrid
                  products={displayProducts}
                  selectedIds={selectedStickerIds}
                  onToggleSelect={handleToggleSelect}
                  canvasStyle={canvasStyle}
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
      {/* FLOATING BATCH ACTION BAR */}
      {/* ------------------------------------------------------------- */}
      {selectedStickerIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/[0.12] bg-[#0c0d18]/95 backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 pr-3 border-r border-white/[0.08]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {selectedStickerIds.length}
            </span>
            <span className="text-xs font-semibold text-foreground">
              Selected
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                batchUpdateStatusMutation.mutate({ ids: selectedStickerIds, status: "published" })
              }
              disabled={batchUpdateStatusMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Publish All</span>
            </button>

            <button
              type="button"
              onClick={() =>
                batchUpdateStatusMutation.mutate({ ids: selectedStickerIds, status: "draft" })
              }
              disabled={batchUpdateStatusMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              <EyeOff className="h-3.5 w-3.5" />
              <span>Set Draft</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    `Move ${selectedStickerIds.length} stickers to the Recycle Bin? They will be hidden from the storefront.`,
                  )
                ) {
                  batchMoveToBinMutation.mutate(selectedStickerIds);
                }
              }}
              disabled={batchMoveToBinMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Move to Bin</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSelectedStickerIds([])}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-colors ml-1 cursor-pointer"
            title="Clear Selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODALS */}
      {/* ------------------------------------------------------------- */}
      <CategoryCreateModal
        open={createCategoryOpen}
        onClose={() => setCreateCategoryOpen(false)}
        onSubmit={async (payload) => {
          await createCategoryMutation.mutateAsync(payload);
        }}
      />

      {activeCategory && (
        <SubcategoryCreateModal
          open={createSubcategoryOpen}
          onClose={() => setCreateSubcategoryOpen(false)}
          categoryName={activeCategory.name}
          categorySlug={activeCategorySlug}
          onSubmit={async (payload) => {
            await createSubcategoryMutation.mutateAsync(payload);
          }}
        />
      )}

      {activeCategory && (
        <StickerUploadModal
          open={uploadStickerOpen}
          onClose={() => {
            setUploadStickerOpen(false);
            setDroppedFiles([]);
          }}
          categoryId={activeCategory.id}
          categoryName={activeCategory.name}
          categorySlug={activeCategorySlug}
          subcategories={subcategories}
          defaultSubcategoryId={activeSubcategory?.id ?? null}
          initialFiles={droppedFiles}
          onSave={async (payload) => {
            await saveStickerMutation.mutateAsync(payload);
          }}
        />
      )}

      <StickerEditModal
        open={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        product={editingProduct}
        categorySlug={activeCategorySlug}
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