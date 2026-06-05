import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import { fetchCategories, fetchSubcategories, fetchProducts } from "@/lib/queries";
import ProductCard from "@/components/ui-bits/ProductCard";
import CategoryCard from "@/components/ui-bits/CategoryCard";

export default function Home() {
  const { data: cats } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: subs } = useQuery({ queryKey: ["subcategories"], queryFn: fetchSubcategories });
  const { data: dbProducts } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });

  const [selectedCategory, setSelectedCategory] = useState<string | number>("ALL");
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

  const ITEMS_PER_PAGE = 100;
  const totalPages = Math.ceil(visiblePacks.length / ITEMS_PER_PAGE);
  const paginatedPacks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return visiblePacks.slice(start, start + ITEMS_PER_PAGE);
  }, [visiblePacks, currentPage]);

  const handleCategoryClick = (catId: number) => {
    setSelectedCategory(catId);
    setCurrentSubCategorySlug(null);
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getCategoryName = (idOrName: string | number) => {
    if (idOrName === "ALL") return "ALL";
    const cat = cats?.find(c => c.id === idOrName);
    return cat ? cat.name : "Category";
  };

  const getCategoryThumbnail = (categoryId: number | string) => {
    const firstProduct = dbProducts?.find(p => p.category_id === categoryId && p.image_url);
    return firstProduct?.image_url || null;
  };

  const getSubCategoryThumbnail = (slug: string) => {
    const subId = subs?.find(s => s.slug === slug)?.id;
    const firstProduct = dbProducts?.find(p => p.subcategory_id === subId && p.image_url);
    return firstProduct?.image_url || null;
  };

  const getSubCategoryName = (slug: string) => {
    return subs?.find((s) => s.slug === slug)?.name || slug;
  };

  return (
    <div className="w-full flex flex-col min-h-screen bg-background">
      {/* Dynamic Hero Section - Sticky reveal base */}
      <section className={`sticky top-[93px] z-0 w-full flex flex-col justify-center overflow-hidden transition-all duration-300 ease-out ${selectedCategory === 'ALL' ? 'py-8 md:py-12' : 'py-2 md:py-4'}`}>
        {/* Layered Background Effect */}
        <div className="absolute inset-0 z-0 bg-neutral-950">
          {/* Layer 1: Glowing Neon Core */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.15),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.15),transparent_40%),radial-gradient(circle_at_center,rgba(236,72,153,0.1),transparent_50%)] animate-pulse [animation-duration:8s]"></div>
          
          {/* Layer 2: Texture Overlay */}
          <div className="absolute inset-0 bg-[url('/grafitti.jpg')] bg-cover bg-center bg-no-repeat opacity-55 mix-blend-screen saturate-150 contrast-110"></div>
          
          {/* Ambient Fades */}
          <div className={`absolute inset-0 bg-gradient-to-t from-background ${selectedCategory === 'ALL' ? 'via-background/40' : 'via-background/60'} to-transparent`}></div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 neon-glow"></div>

        {/* Content */}
        <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 sm:px-8 h-full">
          {/* Hero Branding - only for ALL */}
          <div className={`flex flex-col items-center text-center ${selectedCategory === 'ALL' ? '' : 'hidden'}`}>
            <div className="max-w-3xl flex flex-col justify-center items-center">
              <h1 className="mt-2 font-black uppercase leading-[1.05] tracking-tight text-6xl sm:text-7xl md:text-8xl text-cyan-100 drop-shadow-[0_0_30px_rgba(34,211,238,0.4)]">
                Stuck on <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_25px_rgba(34,211,238,0.7)]">
                  Real
                </span>
                ness.
              </h1>
              <p className="mt-6 text-balance text-lg font-bold opacity-90 sm:text-xl text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                Bring life to your phone, laptop, car, kitchen, or home spaces. Save more when you collect more.
              </p>
            </div>
          </div>

          {/* Subcategories - only for NOT ALL and only for MD+ */}
          {selectedCategory !== "ALL" && (
            <div className="hidden md:flex flex-col w-full">
              {availableSubCategories.length > 0 && (
                <div className="flex flex-col w-full">
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4 w-full">
                    <CategoryCard
                      title={`All ${getCategoryName(selectedCategory)}`}
                      image={getCategoryThumbnail(selectedCategory)}
                      onClick={() => {
                        setCurrentSubCategorySlug(null);
                        setCurrentPage(1);
                      }}
                    />
                    {availableSubCategories.map((subSlug, i) => (
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
          )}
        </div>
      </section>

      {/* Main Content Wrapper - Slides over Hero */}
      <div className="relative z-10 bg-background pt-6 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] rounded-t-3xl transition-all duration-300 ease-out">
        {/* Mobile Category Drawer Trigger and Overlay */}
        {selectedCategory !== "ALL" && (
          <>
            <button
              className="md:hidden fixed top-6 left-4 z-50 rounded-md p-2 text-foreground"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open categories"
            >
              <Menu className="h-6 w-6 text-primary" />
            </button>

            {isSidebarOpen && (
              <div className="fixed inset-0 z-50 md:hidden">
                <div
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                  onClick={() => setIsSidebarOpen(false)}
                />
                <div className="absolute left-0 top-0 h-full w-72 bg-background p-6 border-r border-border overflow-y-auto shadow-2xl">
                  <div className="flex items-center justify-between mb-8">
                    <span className="font-black uppercase tracking-[0.2em] text-sm text-cyan-100">Categories</span>
                    <button onClick={() => setIsSidebarOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-4">
                    <button
                      onClick={() => {
                        setSelectedCategory("ALL");
                        setIsSidebarOpen(false);
                      }}
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
                        onClick={() => {
                          handleCategoryClick(category.id);
                          setIsSidebarOpen(false);
                        }}
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
                </div>
              </div>
            )}
          </>
        )}

        {selectedCategory === "ALL" ? (
          <section className="mx-auto w-full max-w-[1600px] px-4 pt-4 pb-8 sm:px-8 text-center mb-8">
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4 text-left">
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
        ) : (
          <section className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-8">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Navigational Sidebar */}
              <aside className="hidden lg:flex w-64 shrink-0 flex-col gap-4 relative">
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
                    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
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
    </div>
  );
}
