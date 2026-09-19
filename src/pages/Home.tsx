import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  fetchCategories,
  fetchSubcategories,
  fetchProducts,
  fetchTrendingStickerIds,
} from "@/lib/queries";
import { formatCategoryTitle, cn } from "@/lib/utils";
import ProductCard from "@/components/ui-bits/ProductCard";
import CategoryCard from "@/components/ui-bits/CategoryCard";
import PutThemEverywhere from "@/components/ui-bits/PutThemEverywhere";

export default function Home() {
  const queryClient = useQueryClient();

  const { data: cats = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
  const { data: subs = [] } = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => fetchSubcategories(),
  });
  const { data: dbProducts = [] } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });
  const { data: trendingIds = [] } = useQuery({
    queryKey: ["trending-sticker-ids"],
    queryFn: fetchTrendingStickerIds,
  });

  // Listen for admin live updates to trending drops
  useEffect(() => {
    const handleTrendingUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["trending-sticker-ids"] });
    };
    window.addEventListener("realz_trending_updated", handleTrendingUpdate);
    window.addEventListener("realz_packs_updated", handleTrendingUpdate);
    return () => {
      window.removeEventListener("realz_trending_updated", handleTrendingUpdate);
      window.removeEventListener("realz_packs_updated", handleTrendingUpdate);
    };
  }, [queryClient]);

  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string | number>("ALL");
  const [currentSubCategorySlug, setCurrentSubCategorySlug] = useState<string | null>(null);

  // Sync state with URL params
  useEffect(() => {
    const catParam = searchParams.get("category");
    if (catParam) {
      setSelectedCategory(isNaN(Number(catParam)) ? catParam : Number(catParam));
    } else {
      setSelectedCategory("ALL");
    }

    const subParam = searchParams.get("sub");
    if (subParam) {
      setCurrentSubCategorySlug(subParam);
    } else {
      setCurrentSubCategorySlug(null);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleReset = () => {
      setSearchParams({});
      setSelectedCategory("ALL");
      setCurrentSubCategorySlug(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("reset-home", handleReset);
    return () => window.removeEventListener("reset-home", handleReset);
  }, [setSearchParams]);

  const availableCategories = useMemo(() => {
    return cats.filter((c) => c.name.toLowerCase() !== "uncategorized");
  }, [cats]);

  const availableSubCategories = useMemo(() => {
    if (!subs || subs.length === 0 || selectedCategory === "ALL") return [];
    const cat = cats.find((c) => c.id === selectedCategory || c.slug === selectedCategory);
    const catId = cat ? cat.id : Number(selectedCategory);
    return subs.filter((s) => s.category_id === catId);
  }, [subs, selectedCategory, cats]);

  const subcategoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const sub of subs) {
      const count = dbProducts.filter(
        (p) =>
          (p.subcategory_id && p.subcategory_id === sub.id) ||
          (p.image_storage_key && p.image_storage_key.includes(`/${sub.slug}/`)),
      ).length;
      map.set(sub.slug, count);
    }
    return map;
  }, [dbProducts, subs]);

  const visiblePacks = useMemo(() => {
    return dbProducts.filter((p) => {
      if (selectedCategory !== "ALL") {
        const cat = cats.find((c) => c.id === selectedCategory || c.slug === selectedCategory);
        const catId = cat ? cat.id : Number(selectedCategory);
        if (p.category_id !== catId) return false;
      }
      if (currentSubCategorySlug) {
        const sub = subs.find((s) => s.slug === currentSubCategorySlug);
        const matchesId = sub && p.subcategory_id === sub.id;
        const matchesKey =
          p.image_storage_key && p.image_storage_key.includes(`/${currentSubCategorySlug}/`);
        if (!matchesId && !matchesKey) return false;
      }
      return true;
    });
  }, [dbProducts, selectedCategory, currentSubCategorySlug, subs, cats]);

  const trendingProducts = useMemo(() => {
    if (!dbProducts || dbProducts.length === 0) return [];
    if (trendingIds && trendingIds.length > 0) {
      const idMap = new Map(dbProducts.map((p) => [p.id, p]));
      const matched = trendingIds
        .map((id) => idMap.get(id))
        .filter((p): p is (typeof dbProducts)[0] => !!p);
      if (matched.length > 0) return matched;
    }
    const featured = dbProducts.filter((p) => p.is_featured);
    return featured.length > 0 ? featured.slice(0, 16) : dbProducts.slice(0, 16);
  }, [dbProducts, trendingIds]);

  const showcaseStickers = useMemo(() => {
    if (!dbProducts || dbProducts.length === 0) return [];
    const valid = dbProducts.filter((p) => p.image_url && p.image_url.trim().length > 0);
    const byCategory = new Map<number | string, (typeof dbProducts)[0]>();
    for (const p of valid) {
      if (!byCategory.has(p.category_id)) {
        byCategory.set(p.category_id, p);
      }
    }
    const diverse = Array.from(byCategory.values());
    return diverse.length >= 4 ? diverse.slice(0, 4) : valid.slice(0, 4);
  }, [dbProducts]);

  const handleCategoryClick = (catId: number | string) => {
    if (catId === "ALL") {
      setSearchParams({});
      setSelectedCategory("ALL");
    } else {
      setSearchParams({ category: String(catId) });
      setSelectedCategory(catId);
    }
    setCurrentSubCategorySlug(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubCategoryClick = (subSlug: string | null) => {
    const nextParams = new URLSearchParams(searchParams);
    if (subSlug) {
      nextParams.set("sub", subSlug);
    } else {
      nextParams.delete("sub");
    }
    setCurrentSubCategorySlug(subSlug);
    setSearchParams(nextParams);
  };

  const getCategoryName = (idOrName: string | number) => {
    if (idOrName === "ALL") return "All Stickers";
    const cat = cats.find((c) => c.id === idOrName);
    return cat ? formatCategoryTitle(cat.name) : "Category";
  };

  const getCategoryThumbnail = (categoryId: number | string) => {
    const firstProduct = dbProducts.find((p) => p.category_id === categoryId && p.image_url);
    return firstProduct?.image_url || null;
  };

  const getSubCategoryThumbnail = (slug: string) => {
    const sub = subs.find((s) => s.slug === slug);
    const prod = dbProducts.find(
      (p) =>
        p.image_url &&
        ((sub && p.subcategory_id === sub.id) ||
          p.image_storage_key?.includes(`/${slug}/`)),
    );
    return prod?.image_url || null;
  };

  const getSubCategoryName = (slug: string) => {
    const raw = subs.find((s) => s.slug === slug)?.name || slug;
    return formatCategoryTitle(raw);
  };

  const currentCategoryCount = useMemo(() => {
    if (selectedCategory === "ALL") return dbProducts.length;
    const cat = cats.find((c) => c.id === selectedCategory || c.slug === selectedCategory);
    const catId = cat ? cat.id : Number(selectedCategory);
    return dbProducts.filter((p) => p.category_id === catId).length;
  }, [dbProducts, selectedCategory, cats]);

  return (
    <div className="relative w-full flex flex-col min-h-screen bg-background overflow-hidden">
      {/* 1. Diffuse Multi-Point Atmospheric Color Wash */}
      <div
        className="fixed inset-0 pointer-events-none -z-50"
        style={{
          background: `
            radial-gradient(ellipse 90% 60% at 20% 12%, rgba(109, 40, 217, 0.15) 0%, rgba(67, 24, 140, 0.04) 55%, transparent 100%),
            radial-gradient(ellipse 80% 65% at 85% 35%, rgba(45, 60, 160, 0.13) 0%, rgba(25, 25, 80, 0.03) 60%, transparent 100%),
            radial-gradient(ellipse 85% 60% at 15% 82%, rgba(134, 25, 143, 0.09) 0%, rgba(74, 4, 78, 0.02) 55%, transparent 100%),
            radial-gradient(ellipse 65% 50% at 50% 50%, rgba(91, 33, 182, 0.07) 0%, transparent 100%)
          `,
        }}
      />

      {/* 2. Soft Edge Vignette for Spatial Atmosphere */}
      <div
        className="fixed inset-0 pointer-events-none -z-45"
        style={{
          background:
            "radial-gradient(ellipse 95% 85% at 50% 50%, transparent 52%, rgba(5, 4, 13, 0.6) 100%)",
        }}
      />

      {/* 3. Tactile Vinyl Micro-grain Overlay */}
      <div className="fixed inset-0 bg-noise pointer-events-none -z-40" />

      {/* Main Storefront */}
      <main className="relative z-10 w-full pt-2 sm:pt-4 pb-16">
        {selectedCategory === "ALL" ? (
          <>
            {/* 1. Categories Section */}
            <section className="relative mx-auto w-full max-w-[1600px] px-4 pt-2 pb-6 sm:px-8">
              {/* Localized subtle backlighting */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1200px] h-64 pointer-events-none -z-10 blur-3xl opacity-50"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(139, 92, 246, 0.08) 0%, transparent 70%)",
                }}
              />

              <div className="relative z-10 flex items-center justify-between mb-6 border-b border-white/[0.08] pb-4">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground flex items-center gap-3 font-['Caveat',cursive] tracking-wide select-none">
                  <span className="w-2.5 h-8 bg-primary rounded-full shrink-0 shadow-[0_0_14px_var(--color-primary-glow)]" />
                  Categories
                </h2>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4 text-left">
                {availableCategories.map((cat, idx) => (
                  <CategoryCard
                    key={cat.id}
                    index={idx}
                    title={cat.name}
                    image={getCategoryThumbnail(cat.id)}
                    onClick={() => handleCategoryClick(cat.id)}
                  />
                ))}
              </div>
            </section>

            {/* 2. Trending Drops Section */}
            {trendingProducts.length > 0 && (
              <section
                id="trending-section"
                className="relative mx-auto w-full max-w-[1600px] px-4 pt-2 pb-12 sm:px-8"
              >
                {/* Localized subtle illumination behind trending stickers */}
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1400px] h-96 pointer-events-none -z-10 blur-3xl opacity-45"
                  style={{
                    background:
                      "radial-gradient(ellipse at center, rgba(124, 58, 237, 0.08) 0%, transparent 70%)",
                  }}
                />

                {/* Soft atmospheric bleed connecting from Categories */}
                <div
                  className="absolute -top-10 left-1/2 -translate-x-1/2 w-3/4 h-20 pointer-events-none -z-10 blur-2xl opacity-25"
                  style={{
                    background:
                      "radial-gradient(ellipse at center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)",
                  }}
                />

                <div className="relative z-10 flex items-center justify-between mb-6 border-b border-white/[0.08] pb-4">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground flex items-center gap-3 font-['Caveat',cursive] tracking-wide select-none">
                    <span className="w-2.5 h-8 bg-primary rounded-full shrink-0 shadow-[0_0_14px_var(--color-primary-glow)]" />
                    Trending Drops
                  </h2>
                </div>

                <div className="relative z-10 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-5 md:gap-6 items-center">
                  {trendingProducts.map((pack, idx) => (
                    <div key={pack.id} className="transition-all duration-300">
                      <ProductCard product={pack} index={idx} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 3. Curated Editorial Context: PUT THEM EVERYWHERE */}
            <PutThemEverywhere stickers={showcaseStickers} />
          </>
        ) : (
          /* Filtered Category View: Subcategory vertical list on the left, stickers on the right */
          <section className="mx-auto w-full max-w-[1600px] px-4 pb-8 sm:px-8">
            {/* Category Header with Clean Title & Back Button (Breadcrumbs and extra text info removed) */}
            <div className="flex items-center justify-between mb-8 border-b border-white/[0.08] pb-4">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground flex items-center gap-3 font-['Caveat',cursive] tracking-wide select-none">
                <span className="w-2.5 h-8 bg-primary rounded-full shrink-0 shadow-[0_0_14px_var(--color-primary-glow)]" />
                {getCategoryName(selectedCategory)}
              </h2>
              <button
                onClick={() => handleCategoryClick("ALL")}
                className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest cursor-pointer"
              >
                ← Back to All Categories
              </button>
            </div>

            {/* Layout: Vertical Subcategories List on Left, Stickers Grid on Right */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Left Column: Vertical Subcategory List (Text-only pills like on top) */}
              {availableSubCategories.length > 0 && (
                <aside className="w-full md:w-60 lg:w-64 shrink-0">
                  <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none no-scrollbar">
                    <button
                      onClick={() => handleSubCategoryClick(null)}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-full md:rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none text-left shrink-0",
                        currentSubCategorySlug === null
                          ? "bg-primary text-primary-foreground shadow-[0_0_14px_var(--color-primary-glow)] font-black"
                          : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground border border-white/[0.08]",
                      )}
                    >
                      <span className="truncate">All {getCategoryName(selectedCategory)}</span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.2 rounded-full font-mono shrink-0",
                          currentSubCategorySlug === null
                            ? "bg-black/30 text-white"
                            : "bg-white/10 text-muted-foreground",
                        )}
                      >
                        {currentCategoryCount}
                      </span>
                    </button>

                    {availableSubCategories.map((sub) => {
                      const isActive = currentSubCategorySlug === sub.slug;
                      const count = subcategoryCounts.get(sub.slug) || 0;
                      return (
                        <button
                          key={sub.slug}
                          onClick={() => handleSubCategoryClick(sub.slug)}
                          className={cn(
                            "w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-full md:rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none text-left shrink-0",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-[0_0_14px_var(--color-primary-glow)] font-black"
                              : "bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground border border-white/[0.08]",
                          )}
                        >
                          <span className="truncate">{formatCategoryTitle(sub.name)}</span>
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.2 rounded-full font-mono shrink-0",
                              isActive
                                ? "bg-black/30 text-white"
                                : "bg-white/10 text-muted-foreground",
                            )}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </aside>
              )}

              {/* Right Column: Filtered Products Grid */}
              <div className="flex-1 w-full min-w-0">
                {visiblePacks.length === 0 ? (
                  <div className="text-center py-16 border border-white/[0.06] rounded-2xl bg-white/[0.01]">
                    <p className="text-muted-foreground text-sm font-medium">
                      No stickers found in this subcategory.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-5 md:gap-6 items-center">
                    {visiblePacks.map((pack, idx) => (
                      <div key={pack.id} className="transition-all duration-300">
                        <ProductCard product={pack} index={idx} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
