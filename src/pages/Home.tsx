import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { fetchCategories, fetchSubcategories, fetchProducts } from "@/lib/queries";
import { formatCategoryTitle } from "@/lib/utils";
import ProductCard from "@/components/ui-bits/ProductCard";
import CategoryCard from "@/components/ui-bits/CategoryCard";

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
      {/* Ambient Atmospheric Glowing Orbs */}
      <div className="fixed top-[-15%] left-[-10%] w-[60vw] h-[60vw] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none -z-50 animate-pulse [animation-duration:10s]" />
      <div className="fixed top-[25%] right-[-10%] w-[55vw] h-[55vw] bg-primary/10 rounded-full blur-[140px] pointer-events-none -z-50" />
      <div className="fixed bottom-[-15%] left-[5%] w-[50vw] h-[50vw] bg-fuchsia-500/10 rounded-full blur-[140px] pointer-events-none -z-50" />

      {/* Tactile Vinyl Noise Overlay */}
      <div className="fixed inset-0 bg-noise pointer-events-none -z-40" />

      {/* Main Storefront: Categories immediately followed by Trending Drops */}
      <main className="relative z-10 w-full pt-6 sm:pt-10 pb-16">
        {selectedCategory === "ALL" ? (
          <>
            {/* 1. Categories Section (Rendered immediately at the top) */}
            <section className="mx-auto w-full max-w-[1600px] px-4 pb-8 sm:px-8">
              <div className="flex items-center justify-between mb-6 border-b border-purple-200/60 pb-4">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                  <span className="w-2.5 h-8 bg-primary rounded-full shrink-0" />
                  Categories
                </h2>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4 text-left">
                {availableCategories.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    title={cat.name}
                    image={getCategoryThumbnail(cat.id)}
                    onClick={() => handleCategoryClick(cat.id)}
                  />
                ))}
              </div>
            </section>

            {/* 2. Trending Drops Section (Directly follows Categories) */}
            {trendingProducts.length > 0 && (
              <section id="trending-section" className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-8">
                <div className="relative z-10 flex items-center justify-between mb-6 border-b border-purple-200/60 pb-4">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                    <span className="w-2.5 h-8 bg-primary rounded-full shrink-0" />
                    Trending Drops
                  </h2>
                </div>

                <div className="relative z-10 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4 items-start">
                  {trendingProducts.map((pack) => (
                    <div key={pack.id} className="transition-all duration-300">
                      <ProductCard product={pack} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          /* Filtered Category View */
          <section className="mx-auto w-full max-w-[1600px] px-4 pb-8 sm:px-8">
            <div className="flex items-center justify-between mb-6 border-b border-purple-200/60 pb-4">
              <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                <span className="w-2.5 h-8 bg-primary rounded-full shrink-0" />
                {getCategoryName(selectedCategory)}
              </h2>
              <button
                onClick={() => handleCategoryClick("ALL")}
                className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest cursor-pointer"
              >
                ← Back to All Categories
              </button>
            </div>

            {availableSubCategories.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4 w-full mb-8">
                <CategoryCard
                  title={`All ${getCategoryName(selectedCategory)}`}
                  image={getCategoryThumbnail(selectedCategory)}
                  onClick={() => {
                    setCurrentSubCategorySlug(null);
                  }}
                />
                {availableSubCategories.map((subSlug) => (
                  <CategoryCard
                    key={subSlug}
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
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4 items-start">
              {visiblePacks.map((pack) => (
                <div key={pack.id} className="transition-all duration-300">
                  <ProductCard product={pack} />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
