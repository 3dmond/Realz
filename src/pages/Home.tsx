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

const CATEGORY_VISUALS: Record<string, string> = {
  anime: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80",
  tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
  minimalist: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&q=80",
  streetwear: "https://images.unsplash.com/photo-1520209759809-a9bcb6cb3241?w=800&q=80",
  gaming: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&q=80",
  nature: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
};

export default function Home() {
  const { data: cats } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: subs } = useQuery({ queryKey: ["subcategories"], queryFn: fetchSubcategories });
  const { data: dbProducts } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });

  const [currentCategorySlug, setCurrentCategorySlug] = useState<string>("All");
  const [currentSubCategorySlug, setCurrentSubCategorySlug] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  useEffect(() => {
    const handleReset = () => {
      setCurrentCategorySlug("All");
      setCurrentSubCategorySlug(null);
      setCurrentPage(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("reset-home", handleReset);
    return () => window.removeEventListener("reset-home", handleReset);
  }, []);

  // Dynamic derivations based on Categories from the DB
  const availableCategories = useMemo(() => {
    if (!cats) return ["All"];
    return ["All", ...cats.map((c) => c.slug)];
  }, [cats]);

  const availableSubCategories = useMemo(() => {
    if (currentCategorySlug === "All" || !subs) return [];
    if (currentCategorySlug === "AllPacks") return subs.map((s) => s.slug);
    return subs.filter((s) => s.category_id === currentCategorySlug).map((s) => s.slug);
  }, [currentCategorySlug, subs]);

  const visiblePacks = useMemo(() => {
    if (!dbProducts) return [];
    return dbProducts.filter((pack) => {
      const categoryMatch =
        currentCategorySlug === "All" ||
        currentCategorySlug === "AllPacks" ||
        pack.category_id === currentCategorySlug;
      const subCategoryMatch =
        !currentSubCategorySlug || pack.subcategory_id === currentSubCategorySlug;
      return categoryMatch && subCategoryMatch;
    });
  }, [dbProducts, currentCategorySlug, currentSubCategorySlug]);

  const ITEMS_PER_PAGE = 100;
  const totalPages = Math.ceil(visiblePacks.length / ITEMS_PER_PAGE);
  const paginatedPacks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return visiblePacks.slice(start, start + ITEMS_PER_PAGE);
  }, [visiblePacks, currentPage]);

  const handleCategoryClick = (catSlug: string) => {
    setCurrentCategorySlug(catSlug);
    setCurrentSubCategorySlug(null);
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getCategoryName = (slug: string) => {
    if (slug === "All") return "All";
    if (slug === "AllPacks") return "Packs";
    return cats?.find((c) => c.slug === slug)?.name || slug;
  };

  const getSubCategoryName = (slug: string) => {
    return subs?.find((s) => s.slug === slug)?.name || slug;
  };

  return (
    <div className="w-full flex flex-col min-h-screen bg-background">
      {currentCategorySlug === "All" && (
        <section className="relative flex min-h-[15vh] flex-col justify-center overflow-hidden">
          {/* Full-bleed background image with vibrant gradient fade */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2564&auto=format&fit=crop"
              alt="Sticker Hero"
              className="h-full w-full object-cover opacity-70 mix-blend-screen"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-violet-950 via-fuchsia-900/60 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 sm:px-8 h-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center py-6 sm:py-8 md:py-10">
              {/* Left-aligned content */}
              <div className="max-w-xl flex flex-col justify-center">
                <p className="text-micro text-cyan-400 drop-shadow-md">Vol. 04 — Drop 26</p>
                <h1 className="mt-6 font-black uppercase leading-[0.85] tracking-tight text-7xl sm:text-8xl md:text-9xl text-cyan-100 drop-shadow-lg">
                  Stuck on <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_25px_rgba(34,211,238,0.7)]">
                    Real
                  </span>
                  ness.
                </h1>
                <p className="mt-8 text-balance text-base font-medium opacity-90 sm:text-lg text-fuchsia-200 drop-shadow-md">
                  Cinematic sticker drops — anime, tech, streetwear, minimal. Bulk pricing, pay on
                  delivery, cult quality.
                </p>
              </div>

              {/* Right-aligned Packs Grid */}
              <div className="hidden lg:flex flex-col items-end justify-center w-full">
                <div className="w-full flex flex-col pl-4 lg:pl-16 pr-8 lg:pr-12">
                  <h3 className="text-base font-black uppercase tracking-[0.25em] text-cyan-100 drop-shadow-md mb-6">
                    Featured Packs
                  </h3>

                  {/* Static Grid */}
                  <div className="grid grid-cols-3 gap-4 w-full">
                    {subs?.slice(0, 3).map((s, i) => (
                      <CategoryCard
                        key={s.id}
                        title={s.name}
                        image={`https://images.unsplash.com/photo-15${String(20000000 + i * 4321).slice(0, 8)}?w=600&q=80`}
                        onClick={() => {
                          setCurrentCategorySlug(s.category_id);
                          setCurrentSubCategorySlug(s.slug);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
                    ))}
                  </div>

                  <div className="mt-8 flex justify-end w-full">
                    <button
                      onClick={() => {
                        setCurrentCategorySlug("AllPacks");
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
      {currentCategorySlug !== "All" && (
        <section className="relative flex flex-col justify-center overflow-hidden py-12">
          {/* Full-bleed background image with vibrant gradient fade */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2564&auto=format&fit=crop"
              alt="Category Hero"
              className="h-full w-full object-cover opacity-50 mix-blend-screen"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-violet-950 via-fuchsia-900/40 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background"></div>
          </div>

          <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 sm:px-8">
            {availableSubCategories.length > 0 && (
              <div className="flex flex-col w-full">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 w-full">
                  <CategoryCard
                    title={`All ${getCategoryName(currentCategorySlug)}`}
                    image="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80"
                    onClick={() => {
                      setCurrentSubCategorySlug(null);
                      setCurrentPage(1);
                    }}
                  />
                  {availableSubCategories.map((subSlug, i) => (
                    <CategoryCard
                      key={subSlug}
                      title={getSubCategoryName(subSlug)}
                      image={`https://images.unsplash.com/photo-15${String(30000000 + i * 4321).slice(0, 8)}?w=600&q=80`}
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
                      {getCategoryName(currentCategorySlug)} PACKS
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Navigational Sidebar */}
          {currentCategorySlug !== "All" && (
            <aside className="lg:w-64 shrink-0 flex flex-col gap-4 relative">
              <div className="flex flex-row flex-wrap lg:flex-col gap-2 sticky top-24 z-10 h-fit">
                {availableCategories.map((catSlug) => (
                  <button
                    key={catSlug}
                    onClick={() => {
                      handleCategoryClick(catSlug);
                    }}
                    className={`text-left px-4 py-3 text-sm font-black uppercase tracking-[0.1em] transition-all rounded-lg ${
                      currentCategorySlug === catSlug
                        ? "bg-primary text-primary-foreground shadow-[0_0_15px_oklch(0.705_0.20_47/0.8)]"
                        : "glass-card text-foreground hover:border-primary/50"
                    }`}
                  >
                    {getCategoryName(catSlug)}
                  </button>
                ))}
              </div>
            </aside>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col gap-6">
            {currentCategorySlug === "All" ? (
              <>
                {/* CATEGORIES */}
                <section className="text-center">
                  <div className="mt-10 grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 text-left">
                    <CategoryCard
                      title="All Stickers"
                      image="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80"
                      onClick={() => {
                        setCurrentCategorySlug("AllPacks");
                        setCurrentSubCategorySlug(null);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    />
                    {cats?.map((c) => (
                      <CategoryCard
                        key={c.id}
                        title={c.name}
                        image={CATEGORY_VISUALS[c.slug] ?? CATEGORY_VISUALS.anime}
                        onClick={() => handleCategoryClick(c.slug)}
                      />
                    ))}
                    <CategoryCard
                      title="All Stickers"
                      image="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80"
                      onClick={() => {
                        setCurrentCategorySlug("AllPacks");
                        setCurrentSubCategorySlug(null);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    />
                  </div>
                </section>
              </>
            ) : (
              <>
                {/* Pack Asset Grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-y-8">
                  {paginatedPacks.map((pack) => (
                    <ProductCard key={pack.id} product={pack} />
                  ))}
                </div>

                {visiblePacks.length === 0 && (
                  <div className="py-20 text-center text-muted-foreground glass-panel rounded-xl mt-4">
                    <p>No packs found matching this filter criteria.</p>
                  </div>
                )}

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
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
