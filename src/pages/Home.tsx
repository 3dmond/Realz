import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  fetchCategories,
  fetchFeaturedProducts,
  fetchSubcategories,
} from "@/lib/queries";
import SectionTitle from "@/components/ui-bits/SectionTitle";
import ExploreMore from "@/components/ui-bits/ExploreMore";
import CategoryCard from "@/components/ui-bits/CategoryCard";
import ProductCard from "@/components/ui-bits/ProductCard";

// Stable Unsplash photos for category cards (kept separate from DB thumbnails to vary visuals).
const CATEGORY_VISUALS: Record<string, string> = {
  anime: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80",
  tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
  minimalist: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&q=80",
  streetwear: "https://images.unsplash.com/photo-1520209759809-a9bcb6cb3241?w=800&q=80",
  gaming: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&q=80",
  nature: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
};

const SERVICE_IMAGES = [
  "https://images.unsplash.com/photo-1503602642458-232111445657?w=1200&q=80",
  "https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=1200&q=80",
  "https://images.unsplash.com/photo-1561089489-f13d5e730d72?w=800&q=80",
  "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80",
];

export default function Home() {
  const cats = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const subs = useQuery({ queryKey: ["subcategories"], queryFn: fetchSubcategories });
  const feat = useQuery({ queryKey: ["featured"], queryFn: fetchFeaturedProducts });

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-8">
      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center py-20 sm:py-32 md:py-40 text-center">
        <p className="text-micro text-accent">DROP 01 / 2026</p>
        <h1
          className="mt-6 text-6xl sm:text-8xl md:text-[10rem] leading-[0.85] realz-logo"
        >
          Rea<span className="lz">lz</span>
        </h1>
        <p className="mt-6 max-w-xl text-balance text-sm sm:text-base text-muted-foreground">
          Cinematic sticker drops — anime, tech, streetwear, minimal.
          Bulk pricing, pay on delivery, cult quality.
        </p>
        <Link
          to="/shop"
          className="mt-10 rounded-full bg-primary px-8 py-3 text-sm font-black uppercase tracking-[0.25em] text-primary-foreground transition hover:scale-105 hover:shadow-[0_0_30px_oklch(0.705_0.20_47/0.7)]"
        >
          Shop the drop
        </Link>
      </section>

      {/* CATEGORIES */}
      <section className="py-16 sm:py-24">
        <SectionTitle>C A T E G O R I E S</SectionTitle>
        <div className="mt-10 grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6 lg:gap-6">
          {cats.data?.map((c) => (
            <CategoryCard
              key={c.id}
              title={c.name}
              image={CATEGORY_VISUALS[c.slug] ?? CATEGORY_VISUALS.anime}
              to={`/shop?category=${c.slug}`}
            />
          ))}
        </div>
        <ExploreMore />
      </section>

      {/* PACKS (subcategories grid) */}
      <section className="py-16 sm:py-24">
        <SectionTitle>P A C K S</SectionTitle>
        <div className="mt-10 grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-5 md:gap-4 lg:grid-cols-6 lg:gap-6">
          {subs.data?.slice(0, 12).map((s, i) => (
            <CategoryCard
              key={s.id}
              title={s.name}
              image={`https://images.unsplash.com/photo-15${String(20000000 + i * 4321).slice(0, 8)}?w=600&q=80`}
              to={`/shop?subcategory=${s.slug}`}
            />
          ))}
        </div>
        <ExploreMore />
      </section>

      {/* SERVICES masonry */}
      <section className="py-16 sm:py-24">
        <SectionTitle>S E R V I C E S</SectionTitle>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <ServiceCard image={SERVICE_IMAGES[0]} label="Custom Drops" tall />
          <div className="grid gap-4">
            <ServiceCard image={SERVICE_IMAGES[1]} label="Brand Packs" wide />
            <div className="grid grid-cols-2 gap-4">
              <ServiceCard image={SERVICE_IMAGES[2]} label="Bulk Print" />
              <ServiceCard image={SERVICE_IMAGES[3]} label="Holo Series" />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="py-16 sm:py-24">
        <SectionTitle>F E A T U R E D</SectionTitle>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-5">
          {feat.data?.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        <ExploreMore />
      </section>
    </div>
  );
}

function ServiceCard({
  image,
  label,
  tall,
  wide,
}: {
  image: string;
  label: string;
  tall?: boolean;
  wide?: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-xl bg-card ${
        tall ? "aspect-square md:aspect-auto md:h-full md:min-h-[520px]" : wide ? "aspect-[16/9]" : "aspect-square"
      }`}
    >
      <img
        src={image}
        alt={label}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
      />
      <div className="img-fade absolute inset-0" />
      <span
        className="absolute bottom-4 left-4 text-3xl font-black uppercase tracking-tight text-white transition-colors group-hover:text-primary md:text-5xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {label}
      </span>
    </div>
  );
}
