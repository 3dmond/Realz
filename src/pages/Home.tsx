import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { Flame, Laptop, Smartphone, Car, BookOpen, ShieldCheck, Truck, Tag, ArrowDown } from "lucide-react";
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
  }, []);

  const availableCategories = useMemo(() => {
    if (!cats) return [];
    return cats;
  }, [cats]);

  const availableSubCategories = useMemo(() => {
    if (selectedCategory === "ALL" || !subs) return [];
    return subs.filter((s) => s.category_id === selectedCategory).map((s) => s.slug);
  }, [selectedCategory, subs]);

  const visiblePacks = useMemo(() => {
    if (!dbProducts || dbProducts.length === 0) return [];
    const targetSubCategoryId = currentSubCategorySlug ? subs?.find((s) => s.slug === currentSubCategorySlug)?.id : null;
    return dbProducts.filter((pack) => {
      const categoryMatch = selectedCategory === "ALL" || pack.category_id === selectedCategory;
      const subCategoryMatch = !currentSubCategorySlug || pack.subcategory_id === targetSubCategoryId;
      return categoryMatch && subCategoryMatch;
    });
  }, [dbProducts, selectedCategory, currentSubCategorySlug, subs]);

  // Deterministic hero sticker selection (top 16 products with valid image URLs for dense sticker bomb)
  const heroStickers = useMemo(() => {
    if (!dbProducts) return [];
    const valid = dbProducts.filter((p) => typeof p.image_url === "string" && p.image_url.trim().length > 0);
    return valid.length >= 16 ? valid.slice(0, 16) : valid;
  }, [dbProducts]);

  const trendingProducts = useMemo(() => {
    if (!dbProducts) return [];
    const featured = dbProducts.filter((p) => p.is_featured);
    return featured.length > 0 ? featured.slice(0, 4) : dbProducts.slice(0, 4);
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
    const el = document.getElementById("catalog-grid");
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

  // Organic Sticker Bomb Position Configurations (16 overlapping positions)
  const stickerBombPositions = [
    { top: "8%", right: "30%", width: "w-40 sm:w-52 md:w-60", rotate: "-rotate-6", zIndex: "z-30" },
    { top: "14%", right: "12%", width: "w-44 sm:w-56 md:w-64", rotate: "rotate-12", zIndex: "z-30" },
    { top: "2%", right: "-3%", width: "w-40 sm:w-52 md:w-60", rotate: "-rotate-12", zIndex: "z-20" },
    { top: "46%", right: "24%", width: "w-48 sm:w-60 md:w-68", rotate: "rotate-3", zIndex: "z-40" },
    { top: "44%", right: "2%", width: "w-44 sm:w-56 md:w-64", rotate: "-rotate-18", zIndex: "z-30" },
    { top: "4%", right: "46%", width: "w-32 sm:w-40 md:w-48", rotate: "-rotate-25", zIndex: "z-20" },
    { top: "28%", right: "38%", width: "w-36 sm:w-44 md:w-52", rotate: "rotate-18", zIndex: "z-35" },
    { top: "32%", right: "18%", width: "w-36 sm:w-44 md:w-52", rotate: "-rotate-6", zIndex: "z-25" },
    { top: "64%", right: "40%", width: "w-36 sm:w-44 md:w-52", rotate: "rotate-12", zIndex: "z-25" },
    { top: "0%", right: "22%", width: "w-28 sm:w-36 md:w-40", rotate: "rotate-6", zIndex: "z-10" },
    { top: "22%", right: "34%", width: "w-28 sm:w-32 md:w-36", rotate: "-rotate-15", zIndex: "z-15" },
    { top: "38%", right: "28%", width: "w-32 sm:w-36 md:w-44", rotate: "rotate-22", zIndex: "z-45" },
    { top: "68%", right: "16%", width: "w-32 sm:w-36 md:w-44", rotate: "-rotate-8", zIndex: "z-20" },
    { top: "62%", right: "-4%", width: "w-32 sm:w-40 md:w-48", rotate: "rotate-15", zIndex: "z-10" },
    { top: "-2%", right: "6%", width: "w-28 sm:w-36 md:w-40", rotate: "-rotate-20", zIndex: "z-10" },
    { top: "72%", right: "32%", width: "w-28 sm:w-32 md:w-40", rotate: "rotate-6", zIndex: "z-30" },
  ];

  return (
    <div className="w-full flex flex-col min-h-screen bg-background">
      {/* Full-Width Organic Sticker Bomb Hero Section */}
      <section className="relative w-full border-b border-border/40 py-4 md:py-6 overflow-hidden bg-[#0b0b0d] min-h-[75vh] h-[75vh] max-h-[720px] flex items-center">
        {/* Subtle Ambient Glow */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_70%_50%,rgba(249,115,22,0.08),transparent_65%)] pointer-events-none" />

        <div className="w-full relative z-10 px-4 sm:px-8 h-full flex items-center">
          {selectedCategory === "ALL" ? (
            <div className="relative w-full h-full flex items-center">
              {/* Left Editorial Statement Box with strong gradient backdrop */}
              <div className="relative z-30 max-w-xl lg:max-w-2xl bg-gradient-to-r from-[#0b0b0d] via-[#0b0b0d]/95 to-transparent rounded-3xl p-6 sm:p-8 backdrop-blur-[4px]">
                <h1 className="font-marker uppercase tracking-tight text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-white leading-[0.92] drop-shadow-lg -rotate-2 origin-left">
                  SLAP YOUR VIBE<br />
                  <span className="relative inline-block text-primary">
                    ON IT.
                    <svg className="absolute -bottom-2 sm:-bottom-4 left-0 w-full h-4 sm:h-6 text-primary overflow-visible" viewBox="0 0 100 12" fill="none" preserveAspectRatio="none">
                      <path d="M2 8 C 30 2, 70 12, 98 4" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                    </svg>
                  </span>
                </h1>
                <p className="mt-6 text-xs sm:text-sm text-muted-foreground/90 font-medium max-w-md leading-relaxed font-sans">
                  Premium vinyl drops. Upgrade your laptop, phone, or ride with art that actually speaks for you.
                </p>
                
                <button
                  onClick={() => {
                    const el = document.getElementById("trending-section");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-primary hover:text-white transition-colors cursor-pointer group w-fit font-sans"
                >
                  <span className="border-b-2 border-primary pb-0.5">CLAIM YOUR STICKERS</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>

              {/* Organic "Sticker Bomb" Cluster (Right Side Absolute Layering) */}
              <div className="absolute inset-0 z-10 pointer-events-auto overflow-hidden flex items-center justify-end">
                {heroStickers.length > 0 &&
                  heroStickers.map((pack, idx) => {
                    const pos = stickerBombPositions[idx % stickerBombPositions.length];
                    return (
                      <Link
                        key={pack.id}
                        to={`/product/${pack.id}`}
                        title={pack.title}
                        style={{ top: pos.top, right: pos.right }}
                        className={`absolute ${pos.zIndex} ${pos.width} ${pos.rotate} sticker-die-cut hover:-translate-y-3 hover:scale-110 hover:z-50 transition-all duration-300 pointer-events-auto`}
                      >
                        <img
                          src={pack.image_url}
                          alt={pack.title}
                          loading="eager"
                          className="w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)]"
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 w-full">
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

        {/* Minimalist Bottom Line & Sleek Scroll Indicator */}
        <div className="absolute bottom-0 left-0 w-full flex justify-center translate-y-1/2 z-40 pointer-events-auto">
          <div className="h-[1px] w-full bg-white/10 absolute top-1/2 -z-10" />
          <button
            onClick={() => {
              const el = document.getElementById("trending-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            title="Scroll to Trending Drops"
            className="bg-[#0b0b0d] border border-white/15 rounded-full p-2.5 shadow-lg animate-bounce hover:border-primary/60 transition-colors cursor-pointer group"
          >
            <ArrowDown className="w-4 h-4 text-white/80 group-hover:text-primary transition-colors" />
          </button>
        </div>
      </section>

      {/* Main Storefront & Catalog Sections */}
      <div className="relative z-10 bg-background pt-4 pb-16">
        {selectedCategory === "ALL" && (
          <>
            {/* 1. Trending Drops Spotlight */}
            {trendingProducts.length > 0 && (
              <section id="trending-section" className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-8">
                <div className="flex items-center justify-between mb-6 border-b border-border/40 pb-4">
                  <div>
                    <span className="text-micro text-primary flex items-center gap-1.5 mb-1">
                      <Flame className="h-3.5 w-3.5" /> HOT SELECTION
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-foreground">
                      Trending Drops
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      const el = document.getElementById("catalog-grid");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="text-xs font-bold uppercase tracking-widest text-accent hover:text-primary transition-colors"
                  >
                    View All →
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {trendingProducts.map((pack) => (
                    <ProductCard key={pack.id} product={pack} />
                  ))}
                </div>
              </section>
            )}

            {/* 2. Shop Your Vibe - Personality Discovery Section */}
            <section id="vibe-section" className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-8">
              <div className="flex flex-col mb-6 border-b border-border/40 pb-4">
                <span className="text-micro text-accent mb-1">EXPRESS YOURSELF</span>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-foreground">
                  Shop Your Vibe
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {cats?.slice(0, 4).map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className="group relative h-40 rounded-xl overflow-hidden cursor-pointer border border-border/40 hover:border-primary/60 transition-all duration-300 bg-card p-5 flex flex-col justify-end"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
                    {getCategoryThumbnail(cat.id) && (
                      <img
                        src={getCategoryThumbnail(cat.id)!}
                        alt={cat.name}
                        className="absolute inset-0 w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-110 opacity-70 group-hover:opacity-90"
                      />
                    )}
                    <div className="relative z-20">
                      <span className="text-xs font-black uppercase tracking-wider text-primary group-hover:text-cyan-400 transition-colors">
                        Collection
                      </span>
                      <h3 className="text-lg font-black uppercase tracking-tight text-white leading-tight">
                        {formatCategoryTitle(cat.name)}
                      </h3>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 3. Shop By Use - Application Placement */}
            <section className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-8">
              <div className="flex flex-col mb-6 border-b border-border/40 pb-4">
                <span className="text-micro text-muted-foreground mb-1">PLACEMENT GUIDE</span>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-foreground">
                  Shop By Use
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { title: "Laptop Setup", icon: Laptop, desc: "Sleek vinyl for Mac & PC" },
                  { title: "Phone & Tech", icon: Smartphone, desc: "Compact scratch-proof cutouts" },
                  { title: "Car & Skateboard", icon: Car, desc: "Weatherproof outdoor vinyl" },
                  { title: "Notebook & Desk", icon: BookOpen, desc: "Creative journal stickers" },
                ].map((use, i) => {
                  const Icon = use.icon;
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        const el = document.getElementById("catalog-grid");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="group p-5 rounded-xl bg-card/60 border border-border/40 hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between h-36"
                    >
                      <div className="flex items-center justify-between">
                        <Icon className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                        <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">→</span>
                      </div>
                      <div>
                        <h4 className="font-black text-sm uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">
                          {use.title}
                        </h4>
                        <p className="text-xs text-muted-foreground/80 mt-1">
                          {use.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 4. Featured Collections Grid */}
            <section className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-8">
              <div className="flex flex-col mb-6 border-b border-border/40 pb-4">
                <span className="text-micro text-accent mb-1">EXPLORE ALL THEMES</span>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-foreground">
                  Sticker Categories
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-left">
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

        {/* 5. Main Catalog Grid Section */}
        <section id="catalog-grid" className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-8">
          <div className="flex flex-col md:flex-row items-baseline justify-between mb-8 border-b border-border/40 pb-4">
            <div>
              <span className="text-micro text-primary">FULL CATALOG</span>
              <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-foreground mt-1">
                {getCategoryName(selectedCategory)}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-2 md:mt-0">
              Showing <span className="text-primary font-bold">{visiblePacks.length}</span> sticker packs
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Desktop Category Filter Sidebar */}
            {selectedCategory !== "ALL" && (
              <aside className="hidden lg:flex w-64 shrink-0 flex-col gap-4 relative">
                <div className="flex flex-col gap-2 sticky top-24 z-10 h-fit">
                  <button
                    onClick={() => handleCategoryClick("ALL")}
                    className={`text-left px-4 py-3 text-xs font-black uppercase tracking-[0.1em] transition-all rounded-xl ${
                      selectedCategory === "ALL"
                        ? "bg-primary text-primary-foreground shadow-[0_0_15px_oklch(0.705_0.20_47/0.8)]"
                        : "glass-card text-foreground hover:border-primary/50"
                    }`}
                  >
                    All Stickers
                  </button>
                  {availableCategories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryClick(category.id)}
                      className={`text-left px-4 py-3 text-xs font-black uppercase tracking-[0.1em] transition-all rounded-xl ${
                        selectedCategory === category.id
                          ? "bg-primary text-primary-foreground shadow-[0_0_15px_oklch(0.705_0.20_47/0.8)]"
                          : "glass-card text-foreground hover:border-primary/50"
                      }`}
                    >
                      {formatCategoryTitle(category.name)}
                    </button>
                  ))}
                </div>
              </aside>
            )}

            {/* Catalog Grid */}
            <div className="flex-1 flex flex-col gap-6">
              {visiblePacks.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {paginatedPacks.map((pack) => (
                      <ProductCard key={pack.id} product={pack} />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-12">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setCurrentPage(i + 1);
                            const el = document.getElementById("catalog-grid");
                            if (el) el.scrollIntoView({ behavior: "smooth" });
                          }}
                          className={`w-10 h-10 rounded-full text-sm font-black ${
                            currentPage === i + 1
                              ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(249,115,22,0.5)]"
                              : "bg-card hover:bg-accent text-foreground"
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="py-20 text-center text-muted-foreground glass-panel rounded-xl mt-4">
                  <p className="font-medium text-base">No packs found matching this filter criteria.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Brand Perks & Trust Features Banner */}
        <section className="mx-auto w-full max-w-[1600px] px-4 py-12 sm:px-8 mt-8 border-t border-border/40">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 grid place-items-center shrink-0">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="font-black uppercase tracking-wider text-sm text-white">Pay On Delivery</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Pay conveniently after confirming your order by phone call.</p>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-accent/10 border border-accent/20 grid place-items-center shrink-0">
                <Tag className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h4 className="font-black uppercase tracking-wider text-sm text-white">Bulk Volume Discounts</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Tiered pricing applies automatically across all cart items.</p>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 grid place-items-center shrink-0">
                <ShieldCheck className="h-6 w-6 text-fuchsia-400" />
              </div>
              <div>
                <h4 className="font-black uppercase tracking-wider text-sm text-white">High-Durability Vinyl</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Waterproof, scratch-resistant die-cut vinyl finish.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
