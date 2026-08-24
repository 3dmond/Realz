import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { Flame } from "lucide-react";
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
  const [currentPage, setCurrentPage] = useState<number>(1);

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
      setCurrentPage(1);
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

  // Safe hero sticker sampling
  const heroStickers = useMemo(() => {
    if (!dbProducts) return [];
    const valid = dbProducts.filter((p) => typeof p.image_url === "string" && p.image_url.trim().length > 0);
    return valid;
  }, [dbProducts]);

  const trendingProducts = useMemo(() => {
    if (!dbProducts) return [];
    const featured = dbProducts.filter((p) => p.is_featured);
    return featured.length > 0 ? featured.slice(0, 16) : dbProducts.slice(0, 16);
  }, [dbProducts]);

  const ITEMS_PER_PAGE = 48;
  const totalPages = Math.ceil(visiblePacks.length / ITEMS_PER_PAGE);
  const paginatedPacks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return visiblePacks.slice(start, start + ITEMS_PER_PAGE);
  }, [visiblePacks, currentPage]);

  const handleCategoryClick = (catId: number | string) => {
    if (catId === "ALL") {
      setSearchParams({});
      setSelectedCategory("ALL");
    } else {
      setSearchParams({ category: String(catId) });
      setSelectedCategory(catId);
    }
    setCurrentSubCategorySlug(null);
    setCurrentPage(1);
    const el = document.getElementById("trending-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
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

  // 18 Columns x 8 Rows = 144 positions with alternating brick stagger
  const proceduralStickerPositions = useMemo(() => {
    const COLS = 18;
    const ROWS = 8;
    const items = [];
    let index = 0;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        // Row-stagger offset (shifts every odd row by half a column to break vertical lanes)
        const rowOffset = r % 2 === 1 ? (100 / COLS) / 2 : 0;
        const baseLeft = (c / COLS) * 100 + rowOffset;
        const baseTop = (r / ROWS) * 100;

        // Organic deterministic jitter
        const jitterX = ((Math.sin(index * 127.1) * 43758.5453) % 1) * 3.5 - 1.75;
        const jitterY = ((Math.cos(index * 269.5) * 43758.5453) % 1) * 4.5 - 2.25;
        const rotation = Math.floor(((Math.sin(index * 311.7) * 43758.5453) % 1) * 60) - 30; // -30deg to +30deg

        // Size tiers: varied to allow natural interlocking
        const sizeTier =
          index % 5 === 0
            ? "w-24 md:w-28 h-24 md:h-28"
            : index % 3 === 0
            ? "w-20 md:w-24 h-20 md:h-24"
            : index % 2 === 0
            ? "w-16 md:w-20 h-16 md:h-20"
            : "w-14 md:w-16 h-14 md:h-16";

        // Varied z-index for overlapping depth
        const zIndex = index % 4 === 0 ? "z-10" : "z-0";

        items.push({
          id: `sticker-dense-${index}`,
          left: `${baseLeft + jitterX}%`,
          top: `${baseTop + jitterY}%`,
          rotation: `${rotation}deg`,
          sizeTier,
          zIndex,
          mobile: index % 8 === 0,
        });
        index++;
      }
    }
    return items;
  }, []);

  // Multi-scalloped flower serrated badge shape (24 small curved petals)
  const serratedFlowerClip = useMemo(() => {
    const points = [];
    const N = 120;
    const PETALS = 24;
    for (let i = 0; i < N; i++) {
      const angle = (i / N) * 2 * Math.PI;
      const r = 45 + 3.5 * Math.cos(PETALS * angle);
      const x = 50 + r * Math.cos(angle);
      const y = 50 + r * Math.sin(angle);
      points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
    }
    return `polygon(${points.join(", ")})`;
  }, []);

  return (
    <div className="relative w-full flex flex-col min-h-screen bg-background overflow-hidden">
      {/* Ambient Atmospheric Glowing Orbs */}
      <div className="fixed top-[-15%] left-[-10%] w-[60vw] h-[60vw] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none -z-50 animate-pulse [animation-duration:10s]" />
      <div className="fixed top-[25%] right-[-10%] w-[55vw] h-[55vw] bg-primary/10 rounded-full blur-[140px] pointer-events-none -z-50" />
      <div className="fixed bottom-[-15%] left-[5%] w-[50vw] h-[50vw] bg-fuchsia-500/10 rounded-full blur-[140px] pointer-events-none -z-50" />

      {/* Tactile Vinyl Noise Overlay */}
      <div className="fixed inset-0 bg-noise pointer-events-none -z-40" />

      {/* Compact Sticker-Bombed Dark Neutral Wall Banner Section */}
      <section className="relative overflow-hidden w-full h-[340px] md:h-[380px] min-h-0 flex items-center justify-center py-2 bg-[#1a1a1a] border-b border-neutral-800">
        <div className="w-full relative z-10 px-4 sm:px-8 h-full flex items-center justify-center">
          {selectedCategory === "ALL" ? (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Serrated Flower Callout Badge (Ample Padding & Breathing Room) */}
              <div
                style={{ clipPath: serratedFlowerClip }}
                className="relative z-20 w-60 h-60 sm:w-72 sm:h-72 bg-[#faf5ff] text-purple-950 flex flex-col items-center justify-center p-8 sm:p-10 text-center rotate-[-3deg] select-none shadow-[0_15px_35px_rgba(0,0,0,0.5)]"
              >
                <h1 className="font-black uppercase tracking-tight text-xl sm:text-2xl text-purple-950 leading-tight">
                  STICK YOUR VIBE<br />
                  <span className="text-primary font-marker text-2xl sm:text-3xl inline-block mt-0.5">
                    ON IT.
                  </span>
                </h1>
              </div>

              {/* Algorithmic Full-Wall Jitter Sticker Engine (Zero Sticker Shadows) */}
              <div className="absolute inset-0 w-full h-full z-10 pointer-events-auto overflow-visible">
                {heroStickers.length > 0 &&
                  proceduralStickerPositions.map((pos, idx) => {
                    const pack = heroStickers[idx % heroStickers.length];
                    if (!pack) return null;

                    return (
                      <Link
                        key={`${pack.id}-${idx}`}
                        to={`/product/${pack.id}`}
                        title={pack.title}
                        style={{
                          left: pos.left,
                          top: pos.top,
                          transform: `rotate(${pos.rotation})`,
                        }}
                        className={`absolute ${pos.zIndex} ${pos.sizeTier} ${
                          pos.mobile ? "block" : "hidden sm:block"
                        } hover:scale-125 hover:z-30 transition-transform duration-200 cursor-pointer pointer-events-auto`}
                      >
                        <img
                          src={pack.image_url}
                          alt={pack.title}
                          loading="eager"
                          className="w-full h-full object-contain"
                        />
                      </Link>
                    );
                  })}
              </div>
            </div>
          ) : (
            /* Subcategory Header Banner when filtering a specific category */
            <div className="flex flex-col w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                  <span className="w-2 h-6 bg-primary rounded-full" />
                  {getCategoryName(selectedCategory)}
                </h2>
                <button
                  onClick={() => handleCategoryClick("ALL")}
                  className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
                >
                  ← Back to All Categories
                </button>
              </div>

              {availableSubCategories.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4 w-full">
                  <CategoryCard
                    title={`All ${getCategoryName(selectedCategory)}`}
                    image={getCategoryThumbnail(selectedCategory)}
                    onClick={() => {
                      setCurrentSubCategorySlug(null);
                      setCurrentPage(1);
                    }}
                  />
                  {availableSubCategories.map((subSlug) => (
                    <CategoryCard
                      key={subSlug}
                      title={getSubCategoryName(subSlug)}
                      image={getSubCategoryThumbnail(subSlug)}
                      onClick={() => {
                        setCurrentSubCategorySlug(subSlug);
                        setCurrentPage(1);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Main Storefront & Discovery Sections */}
      <div className="relative z-10 bg-transparent pt-8 pb-16">
        {selectedCategory === "ALL" && (
          <>
            {/* 1. Trending Drops Spotlight (High-Density Grid) */}
            {trendingProducts.length > 0 && (
              <section id="trending-section" className="relative mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-8">
                {/* Sleek Section Header */}
                <div className="relative z-10 flex items-center justify-between mb-6 border-b border-purple-200/60 pb-4">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                    <span className="w-2.5 h-8 bg-primary rounded-full shrink-0" />
                    Trending Drops
                  </h2>
                </div>

                {/* High-Density Compact Product Grid (6-8 per row on large screens) */}
                <div className="relative z-10 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4 items-start">
                  {trendingProducts.map((pack) => (
                    <div key={pack.id} className="transition-all duration-300">
                      <ProductCard product={pack} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 2. Featured Collections Grid (High-Density Grid) */}
            <section className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-8">
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
          </>
        )}
      </div>
    </div>
  );
}
