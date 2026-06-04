import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, Menu } from "lucide-react";
import { fetchCategories, fetchSubcategories, fetchProducts } from "@/lib/queries";
import ProductCard from "@/components/ui-bits/ProductCard";
import SectionTitle from "@/components/ui-bits/SectionTitle";
import CategoryCard from "@/components/ui-bits/CategoryCard";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default function Home() {
  const { data: cats } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: subs } = useQuery({ queryKey: ["subcategories"], queryFn: fetchSubcategories });
  const { data: dbProducts } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [currentSubCategorySlug, setCurrentSubCategorySlug] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  useEffect(() => {
    const handleReset = () => {
      setSelectedCategory("ALL");
      setCurrentSubCategorySlug(null);
      setCurrentPage(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("reset-home", handleReset);
    return () => window.removeEventListener("reset-home", handleReset);
  }, []);

  // Dynamic derivations based on Categories from the DB
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

  const featuredPacks = useMemo(() => {
    if (!dbProducts) return [];
    return dbProducts.filter(p => p.is_featured && (p.thumbnail_url || p.image_url)).slice(0, 3);
  }, [dbProducts]);

  const ITEMS_PER_PAGE = 100;
  const totalPages = Math.ceil(visiblePacks.length / ITEMS_PER_PAGE);
  const paginatedPacks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return visiblePacks.slice(start, start + ITEMS_PER_PAGE);
  }, [visiblePacks, currentPage]);

  const handleCategoryClick = (catId: string) => {
    setSelectedCategory(catId);
    setCurrentSubCategorySlug(null);
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getCategoryName = (idOrName: string) => {
    if (idOrName === "ALL") return "ALL";
    const cat = cats?.find(c => c.id === idOrName);
    return cat ? cat.name : "Category";
  };

  const getSubCategoryName = (slug: string) => {
    return subs?.find((s) => s.slug === slug)?.name || slug;
  };

  return (
    <div className="w-full flex flex-col min-h-screen bg-background">
      {selectedCategory === "ALL" && (
        <section className="relative flex flex-col justify-center overflow-hidden">
          {/* Full-bleed background image with vibrant gradient fade */}
          <div className="absolute inset-0 z-0 bg-muted/10">
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-violet-950/40 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 neon-glow"></div>

          {/* Content */}
          <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 sm:px-8 h-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center py-4 md:py-6">
              {/* Left-aligned content */}
              <div className="max-w-xl flex flex-col justify-center">
                <p className="text-micro text-cyan-400 drop-shadow-md">Vol. 04 — Drop 26</p>
                <h1 className="mt-2 font-black uppercase leading-[1.05] tracking-tight text-5xl sm:text-6xl md:text-7xl text-cyan-100 drop-shadow-lg">
                  Stuck on <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_25px_rgba(34,211,238,0.7)]">
                    Real
                  </span>
                  ness.
                </h1>
                <p className="mt-5 text-balance text-base font-medium opacity-90 sm:text-lg text-fuchsia-200 drop-shadow-md">
                  Bring life to your phone, laptop, car, kitchen, or home spaces. Save more when you collect more.
                </p>
              </div>

              {/* Right-aligned Packs Grid */}
              <div className="hidden lg:flex flex-col items-end justify-center w-full">
                <div className="w-full flex flex-col pl-4 lg:pl-16 pr-8 lg:pr-12">
                  <h3 className="text-base font-black uppercase tracking-[0.25em] text-cyan-100 drop-shadow-md mb-2">
                    Featured Packs
                  </h3>

                  {/* Featured Packs Grid */}
                  <div className="grid grid-cols-3 gap-4 w-full">
                    {featuredPacks.map((pack) => (
                      <ProductCard key={pack.id} product={pack} />
                    ))}
                  </div>
                  {featuredPacks.length === 0 && (
                    <div className="grid grid-cols-3 gap-4 w-full opacity-20">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="aspect-[4/5] rounded-xl bg-card border border-border animate-pulse flex items-center justify-center">
                          <span className="text-[10px] tracking-widest font-black text-muted-foreground/40">DROP {i+1}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex justify-end w-full">
                    <button
                      onClick={() => {
                        setSelectedCategory("ALL");
                        setCurrentSubCategorySlug(null);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="group explore-underline text-micro-sm inline-flex items-baseline gap-1 transition-colors"
                    >
                      <span className="text-white group-hover:text-orange-500 transition-colors duration-300">
                        EXPLORE&nbsp;
                      </span>
                      <span className="text-orange-500 group-hover:text-white transition-colors duration-300">
                        MORE
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Category Hero Section for other pages */}
      {selectedCategory !== "ALL" && (
        <section className="relative flex flex-col justify-center overflow-hidden py-12">
          {/* Full-bleed background image with vibrant gradient fade */}
          <div className="absolute inset-0 z-0 bg-muted/10">
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-violet-950/40 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background"></div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 neon-glow"></div>

          <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 sm:px-8">
            {availableSubCategories.length > 0 && (
              <div className="flex flex-col w-full">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 w-full">
                  <CategoryCard
                    title={`All ${getCategoryName(selectedCategory)}`}
                    onClick={() => {
                      setCurrentSubCategorySlug(null);
                      setCurrentPage(1);
                    }}
                  />
                  {availableSubCategories.map((subSlug, i) => (
                    <CategoryCard
                      key={subSlug}
                      title={getSubCategoryName(subSlug)}
                      onClick={() => {
                        setCurrentSubCategorySlug(subSlug);
                        setCurrentPage(1);
                      }}
                    />
                  ))}
                </div>
                <div className="mt-8 flex justify-end w-full">
                  <button
                    onClick={() => {
                      setCurrentSubCategorySlug(null);
                      setCurrentPage(1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="group explore-underline text-micro-sm inline-flex items-baseline gap-1 transition-colors uppercase"
                  >
                    <span className="text-white group-hover:text-orange-500 transition-colors duration-300">
                      EXPLORE MORE&nbsp;
                    </span>
                    <span className="text-orange-500 group-hover:text-white transition-colors duration-300">
                      {getCategoryName(selectedCategory)} PACKS
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {selectedCategory === "ALL" ? (
        <section className="mx-auto w-full max-w-[1600px] px-4 pt-4 pb-8 sm:px-8 text-center mb-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 text-left">
            {availableCategories.map((cat) => (
              <CategoryCard
                key={cat.id}
                title={cat.name}
                onClick={() => handleCategoryClick(cat.id)}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Navigational Sidebar */}
            <aside className="lg:w-64 shrink-0 flex flex-col gap-4 relative">
              <div className="flex flex-row flex-wrap lg:flex-col gap-2 sticky top-24 z-10 h-fit">
                <button
                  onClick={() => setSelectedCategory("ALL")}
                  className={`text-left px-4 py-3 text-sm font-black uppercase tracking-[0.1em] transition-all rounded-lg ${
                    selectedCategory === "ALL"
                      ? "bg-primary text-primary-foreground shadow-[0_0_15px_oklch(0.705_0.20_47/0.8)]"
                      : "glass-card text-foreground hover:border-primary/50"
                  }`}
                >
                  ALL
                </button>
                {availableCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.id)}
                    className={`text-left px-4 py-3 text-sm font-black uppercase tracking-[0.1em] transition-all rounded-lg ${
                      selectedCategory === category.id
                        ? "bg-primary text-primary-foreground shadow-[0_0_15px_oklch(0.705_0.20_47/0.8)]"
                        : "glass-card text-foreground hover:border-primary/50"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col gap-6">
              {/* Pack Asset Grid */}
              {visiblePacks.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-y-8">
                    {paginatedPacks.map((pack) => (
                      <ProductCard key={pack.id} product={pack} />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-8">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setCurrentPage(i + 1);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className={`w-10 h-10 rounded-full text-sm font-bold ${
                            currentPage === i + 1
                              ? "bg-primary text-primary-foreground"
                              : "bg-card hover:bg-accent"
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
                  <p>No packs found matching this filter criteria.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
