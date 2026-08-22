import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { Flame, Laptop, Smartphone, Car, BookOpen, ShieldCheck, Truck, Tag, ArrowDown } from "lucide-react";
import { fetchCategories, fetchSubcategories, fetchProducts } from "@/lib/queries";
import { formatCategoryTitle } from "@/lib/utils";
import ProductCard from "@/components/ui-bits/ProductCard";
import CategoryCard from "@/components/ui-bits/CategoryCard";
import Connect from "@/components/ui-bits/Connect";

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

  return (
    <div className="relative w-full flex flex-col min-h-screen bg-background overflow-hidden">
      {/* Ambient Atmospheric Glowing Orbs */}
      <div className="fixed top-[-15%] left-[-10%] w-[60vw] h-[60vw] bg-accent/15 rounded-full blur-[140px] pointer-events-none -z-50 animate-pulse [animation-duration:10s]" />
      <div className="fixed top-[25%] right-[-10%] w-[55vw] h-[55vw] bg-primary/15 rounded-full blur-[140px] pointer-events-none -z-50" />
      <div className="fixed bottom-[-15%] left-[5%] w-[50vw] h-[50vw] bg-fuchsia-500/10 rounded-full blur-[140px] pointer-events-none -z-50" />

      {/* Tactile Vinyl Noise Overlay */}
      <div className="fixed inset-0 bg-noise pointer-events-none -z-40" />

      {/* Compact Sticker-Bombed Dark Brick Wall Banner Section */}
      <section className="relative overflow-hidden w-full h-[340px] md:h-[380px] min-h-0 flex items-center justify-center py-2 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/90 via-[#0a0b12]/95 to-black shadow-[inset_0_0_100px_rgba(0,0,0,0.85)] border-b border-white/5">
        {/* Brick Texture Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] z-0" />

        <div className="w-full relative z-10 px-4 sm:px-8 h-full flex items-center justify-center">
          {selectedCategory === "ALL" ? (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Low-Profile Centered Floating Callout Placard */}
              <div className="relative z-20 max-w-xs md:max-w-sm w-full py-3 px-5 md:px-6 rounded-xl bg-slate-950/90 backdrop-blur-md border border-white/15 shadow-2xl ring-1 ring-orange-500/20 text-center md:text-left">
                <h1 className="font-black uppercase tracking-tight text-2xl md:text-3xl text-white leading-tight mb-1">
                  SLAP YOUR VIBE<br />
                  <span className="text-orange-500 underline decoration-wavy decoration-orange-500/60 inline-block mt-0.5">
                    ON IT.
                  </span>
                </h1>
                <p className="text-[11px] leading-snug text-slate-300 font-medium my-2 font-sans">
                  Premium vinyl drops. Upgrade your laptop, phone, or ride with art that actually speaks for you.
                </p>

                <button
                  onClick={() => {
                    const el = document.getElementById("trending-section");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-[10px] font-mono font-bold tracking-widest text-orange-400 hover:text-orange-300 uppercase inline-flex items-center gap-1 mt-1 transition-colors cursor-pointer group"
                >
                  <span className="border-b border-orange-500/40 pb-0.5">CLAIM YOUR STICKERS</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
              </div>

              {/* Algorithmic Full-Wall Jitter Sticker Engine */}
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
                          className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.7)]"
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
      </section>

      {/* Main Storefront & Curated Discovery Sections */}
      <div className="relative z-10 bg-transparent pt-8 pb-16">
        {selectedCategory === "ALL" && (
          <>
            {/* 1. Editorial Trending Drops Spotlight */}
            {trendingProducts.length > 0 && (
              <section id="trending-section" className="relative mx-auto w-full max-w-[1600px] px-4 py-12 sm:px-8">
                {/* Ultra-faint Watermark Typography */}
                <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 text-[13vw] font-black uppercase text-white/[0.015] pointer-events-none select-none tracking-tighter z-0">
                  TRENDING
                </div>

                {/* Editorial Streetwear Section Header */}
                <div className="relative z-10 flex items-end justify-between mb-10 border-b border-white/5 pb-4">
                  <div>
                    <span className="bg-primary/10 text-primary border border-primary/20 px-3.5 py-1 rounded-full text-xs uppercase tracking-widest font-black inline-flex items-center gap-1.5 mb-2">
                      <Flame className="h-3.5 w-3.5 fill-primary text-primary" /> HOT SELECTION
                    </span>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-marker uppercase tracking-tight text-white -rotate-1 origin-left">
                      Trending Drops
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      const el = document.getElementById("vibe-section");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="text-xs font-black uppercase tracking-widest text-accent hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>EXPLORE VIBES</span>
                    <span>→</span>
                  </button>
                </div>

                {/* Asymmetrical Staggered Product Layout */}
                <div className="relative z-10 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 items-start">
                  {trendingProducts.map((pack, idx) => (
                    <div
                      key={pack.id}
                      className={idx % 2 === 1 ? "mt-4 lg:mt-12 transition-all duration-300" : "mt-0 transition-all duration-300"}
                    >
                      <ProductCard product={pack} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 2. Shop Your Vibe - Personality Discovery Section */}
            <section id="vibe-section" className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-8">
              <div className="flex flex-col mb-6 border-b border-white/5 pb-4">
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
                    className="group relative h-40 rounded-xl overflow-hidden cursor-pointer border border-white/10 hover:border-primary/60 transition-all duration-300 bg-card/60 p-5 flex flex-col justify-end"
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
              <div className="flex flex-col mb-6 border-b border-white/5 pb-4">
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
                        const el = document.getElementById("vibe-section");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="group p-5 rounded-xl bg-card/40 border border-white/10 hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between h-36"
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
              <div className="flex flex-col mb-6 border-b border-white/5 pb-4">
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

            {/* 5. Personal Monograph Inquiry Sheet */}
            <Connect />
          </>
        )}

        {/* Brand Perks & Trust Features Banner */}
        <section className="mx-auto w-full max-w-[1600px] px-4 py-12 sm:px-8 mt-8 border-t border-white/5">
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
