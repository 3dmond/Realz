import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Grid3x3, Heart, Search, Sparkles, Star, Tag } from "lucide-react";
import {
  fetchCategories,
  fetchProducts,
  fetchSubcategories,
} from "@/lib/queries";
import ProductCard from "@/components/ui-bits/ProductCard";
import FilterPill from "@/components/ui-bits/FilterPill";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 12;

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const categorySlug = params.get("category") ?? "all";
  const subcategorySlug = params.get("subcategory");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const cats = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const subs = useQuery({ queryKey: ["subcategories"], queryFn: fetchSubcategories });
  const products = useQuery({ queryKey: ["products"], queryFn: fetchProducts });

  const activeCategory = cats.data?.find((c) => c.slug === categorySlug);
  const subcatsForCategory = subs.data?.filter((s) => !activeCategory || s.category_id === activeCategory.id) ?? [];

  const filtered = useMemo(() => {
    if (!products.data) return [];
    return products.data.filter((p) => {
      if (activeCategory && p.category_id !== activeCategory.id) return false;
      if (subcategorySlug) {
        const sub = subs.data?.find((s) => s.slug === subcategorySlug);
        if (sub && p.subcategory_id !== sub.id) return false;
      }
      if (query.trim()) {
        const q = query.toLowerCase();
        const hay = [p.title, ...(p.keywords ?? [])].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [products.data, activeCategory, subcategorySlug, subs.data, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const setCategory = (slug: string) => {
    const next = new URLSearchParams(params);
    if (slug === "all") next.delete("category");
    else next.set("category", slug);
    next.delete("subcategory");
    setParams(next);
    setPage(1);
  };
  const setSubcategory = (slug: string | null) => {
    const next = new URLSearchParams(params);
    if (!slug) next.delete("subcategory");
    else next.set("subcategory", slug);
    setParams(next);
    setPage(1);
  };

  return (
    <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-8 sm:px-8">
      {/* Sidebar */}
      <aside className="sticky top-20 hidden h-[calc(100vh-6rem)] w-16 shrink-0 flex-col items-center gap-3 md:flex">
        {[
          { icon: Grid3x3, slug: "all", label: "All" },
          ...((cats.data ?? []).map((c, i) => ({
            icon: [Sparkles, Star, Tag, Heart][i % 4],
            slug: c.slug,
            label: c.name,
          }))),
        ].map(({ icon: Icon, slug, label }) => (
          <button
            key={slug}
            onClick={() => setCategory(slug)}
            title={label}
            className={`grid h-11 w-11 place-items-center rounded-lg transition ${
              (categorySlug === slug || (slug === "all" && categorySlug === "all"))
                ? "bg-white text-black"
                : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </aside>

      {/* Main */}
      <div className="min-w-0 flex-1">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search stickers, tags, themes…"
            className="h-11 bg-white/5 pl-10 text-sm placeholder:text-muted-foreground/70 focus-visible:ring-primary"
          />
        </div>

        {/* Subcat pills */}
        <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">
          <FilterPill label="All" active={!subcategorySlug} onClick={() => setSubcategory(null)} />
          {subcatsForCategory.map((s) => (
            <FilterPill
              key={s.id}
              label={s.name}
              active={subcategorySlug === s.slug}
              onClick={() => setSubcategory(s.slug)}
            />
          ))}
        </div>

        {/* Grid */}
        {products.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-card" />
            ))}
          </div>
        ) : pageItems.length === 0 ? (
          <p className="py-24 text-center text-muted-foreground">No stickers match those filters.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:gap-5">
            {pageItems.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-1.5">
            <PageBtn label="‹" disabled={page === 1} onClick={() => setPage((p) => p - 1)} />
            {Array.from({ length: totalPages }).map((_, i) => (
              <PageBtn
                key={i}
                label={`${i + 1}`}
                active={page === i + 1}
                onClick={() => setPage(i + 1)}
              />
            ))}
            <PageBtn
              label="›"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PageBtn({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-md text-xs font-black transition ${
        active
          ? "bg-primary text-primary-foreground"
          : disabled
          ? "bg-white/5 text-muted-foreground/40"
          : "glass-card text-foreground hover:border-primary/50"
      }`}
    >
      {label}
    </button>
  );
}
