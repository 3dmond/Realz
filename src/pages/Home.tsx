import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { fetchCategories, fetchSubcategories, fetchProducts } from "@/lib/queries";
import { formatCategoryTitle } from "@/lib/utils";
import ProductCard from "@/components/ui-bits/ProductCard";
import CategoryCard from "@/components/ui-bits/CategoryCard";
import PutThemEverywhere from "@/components/ui-bits/PutThemEverywhere";

export default function Home() {
  const { data: cats } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: subs } = useQuery({ queryKey: ["subcategories"], queryFn: fetchSubcategories });
  const { data: dbProducts } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });

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
    if (!cats) return [];
    return cats.filter((c) => c.name.toLowerCase() !== "uncategorized");
  }, [cats]);

  const availableSubCategories = useMemo(() => {
    if (!subs || selectedCategory === "ALL") return [];
    return subs
      .filter((s) => s.category_id === selectedCategory)
      .map((s) => s.slug);
  }, [subs, selectedCategory]);

  const visiblePacks = useMemo(() => {
    if (!dbProducts) return [];
    return dbProducts.filter((p) => {
      if (selectedCategory !== "ALL" && p.category_id !== selectedCategory) return false;
      if (currentSubCategorySlug) {
        const sub = subs?.find((s) => s.slug === currentSubCategorySlug);
        if (sub && p.subcategory_id !== sub.id) return false;
      }
      return true;
    });
  }, [dbProducts, selectedCategory, currentSubCategorySlug, subs]);

  const trendingProducts = useMemo(() => {
    if (!dbProducts) return [];
    const featured = dbProducts.filter((p) => p.is_featured);
    return featured.length > 0 ? featured.slice(0, 16) : dbProducts.slice(0, 16);
  }, [dbProducts]);

  const showcaseStickers = useMemo(() => {
    if (!dbProducts || dbProducts.length === 0) return [];
    // Select visually distinct stickers across different categories for physical showcase
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

  const getCategoryName = (idOrName: string | number) => {
    if (idOrName === "ALL") return "All Stickers";
    const cat = cats?.find((c) => c.id === idOrName);
    return cat ? formatCategoryTitle(cat.name) : "Category";
  };

  const getCategoryThumbnail = (categoryId: number | string) => {
    const firstProduct = dbProducts?.find((p) => p.category_id === categoryId && p.image_url);
    return firstProduct?.image_url || null;
  };

  const getSubCategoryThumbnail = (slug: string) => {
    const subId = subs?.find((s) => s.slug === slug)?.id;
    const firstProduct = dbProducts?.find((p) => p.subcategory_id === subId && p.image_url);
    return firstProduct?.image_url || null;
  };

  const getSubCategoryName = (slug: string) => {
    const raw = subs?.find((s) => s.slug === slug)?.name || slug;
    return formatCategoryTitle(raw);
  };

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
          `
        }}
      />

      {/* 2. Soft Edge Vignette for Spatial Atmosphere */}
      <div
        className="fixed inset-0 pointer-events-none -z-45"
        style={{
          background: "radial-gradient(ellipse 95% 85% at 50% 50%, transparent 52%, rgba(5, 4, 13, 0.6) 100%)"
        }}
      />

      {/* 3. Tactile Vinyl Micro-grain Overlay */}
      <div className="fixed inset-0 bg-noise pointer-events-none -z-40" />

      {/* Main Storefront: Categories immediately followed by Trending Drops */}
      <main className="relative z-10 w-full pt-6 sm:pt-10 pb-16">
        {selectedCategory === "ALL" ? (
          <>
            {/* 1. Categories Section (Rendered immediately at the top) */}
            <section className="relative mx-auto w-full max-w-[1600px] px-4 pb-8 sm:px-8">
              {/* Localized subtle backlighting */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1200px] h-64 pointer-events-none -z-10 blur-3xl opacity-50"
                style={{
                  background: "radial-gradient(ellipse at center, rgba(139, 92, 246, 0.08) 0%, transparent 70%)"
                }}
              />

              <div className="flex items-center justify-between mb-6 border-b border-white/[0.08] pb-4">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
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

            {/* 2. Trending Drops Section (Directly follows Categories with continuous atmospheric flow) */}
            {trendingProducts.length > 0 && (
              <section id="trending-section" className="relative mx-auto w-full max-w-[1600px] px-4 pt-4 pb-12 sm:px-8">
                {/* Localized subtle illumination behind trending stickers */}
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1400px] h-96 pointer-events-none -z-10 blur-3xl opacity-45"
                  style={{
                    background: "radial-gradient(ellipse at center, rgba(124, 58, 237, 0.08) 0%, transparent 70%)"
                  }}
                />

                {/* Soft atmospheric bleed connecting from Categories */}
                <div
                  className="absolute -top-10 left-1/2 -translate-x-1/2 w-3/4 h-20 pointer-events-none -z-10 blur-2xl opacity-25"
                  style={{
                    background: "radial-gradient(ellipse at center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)"
                  }}
                />

                <div className="relative z-10 flex items-center justify-between mb-6 border-b border-white/[0.08] pb-4">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
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
          /* Filtered Category View */
          <section className="mx-auto w-full max-w-[1600px] px-4 pb-8 sm:px-8">
            <div className="flex items-center justify-between mb-6 border-b border-white/[0.08] pb-4">
              <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
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

            {availableSubCategories.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4 w-full mb-8">
                <CategoryCard
                  title={`All ${getCategoryName(selectedCategory)}`}
                  image={getCategoryThumbnail(selectedCategory)}
                  index={0}
                  onClick={() => {
                    setCurrentSubCategorySlug(null);
                  }}
                />
                {availableSubCategories.map((subSlug, idx) => (
                  <CategoryCard
                    key={subSlug}
                    index={idx + 1}
                    title={getSubCategoryName(subSlug)}
                    image={getSubCategoryThumbnail(subSlug)}
                    onClick={() => {
                      setCurrentSubCategorySlug(subSlug);
                    }}
                  />
                ))}
              </div>
            )}

            {/* Filtered Products Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-5 md:gap-6 items-center">
              {visiblePacks.map((pack, idx) => (
                <div key={pack.id} className="transition-all duration-300">
                  <ProductCard product={pack} index={idx} />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
