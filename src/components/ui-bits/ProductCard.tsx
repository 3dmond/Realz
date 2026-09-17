import { Plus, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/store/cart";
import type { Product } from "@/lib/queries";

export type SpatialProfile = {
  rotate: string;
  translateY: string;
  translateX: string;
  scale: string;
  shadow: string;
};

// Curated deterministic physical profiles for trending sticker artwork
export const TRENDING_PROFILES: SpatialProfile[] = [
  // 0: Opening Anchor — Bold hero standout, slightly grounded, slight left tilt
  {
    rotate: "-rotate-[1deg] sm:-rotate-[3deg]",
    translateY: "translate-y-0 sm:-translate-y-2",
    translateX: "translate-x-0 sm:translate-x-1",
    scale: "scale-[1.03] sm:scale-[1.10]",
    shadow: "drop-shadow-[0_16px_28px_rgba(0,0,0,0.9)]",
  },
  // 1: Companion — Airy, floated high, right tilt
  {
    rotate: "rotate-[1deg] sm:rotate-[3.5deg]",
    translateY: "-translate-y-1 sm:-translate-y-6",
    translateX: "translate-x-0 sm:-translate-x-1.5",
    scale: "scale-[0.97] sm:scale-[0.92]",
    shadow: "drop-shadow-[0_20px_32px_rgba(0,0,0,0.85)]",
  },
  // 2: Low Rest — Resting lower, gentle negative tilt
  {
    rotate: "-rotate-[0.5deg] sm:-rotate-[1.5deg]",
    translateY: "translate-y-1 sm:translate-y-4",
    translateX: "translate-x-0",
    scale: "scale-[1.0] sm:scale-[1.02]",
    shadow: "drop-shadow-[0_12px_20px_rgba(0,0,0,0.85)]",
  },
  // 3: Mid-Float Breather — Medium scale, slight right tilt, subtle right nudge
  {
    rotate: "rotate-[1deg] sm:rotate-[2.5deg]",
    translateY: "-translate-y-0.5 sm:-translate-y-3",
    translateX: "translate-x-0 sm:translate-x-1.5",
    scale: "scale-[0.98] sm:scale-[0.97]",
    shadow: "drop-shadow-[0_14px_24px_rgba(0,0,0,0.86)]",
  },
  // 4: Mid-Row Hero Anchor — Larger, prominent, left tilt
  {
    rotate: "-rotate-[1.5deg] sm:-rotate-[3.5deg]",
    translateY: "translate-y-0.5 sm:translate-y-2",
    translateX: "translate-x-0 sm:-translate-x-2",
    scale: "scale-[1.03] sm:scale-[1.08]",
    shadow: "drop-shadow-[0_18px_30px_rgba(0,0,0,0.92)]",
  },
  // 5: High Floater — Compact, lofty elevation, gentle right tilt
  {
    rotate: "rotate-[1deg] sm:rotate-[2deg]",
    translateY: "-translate-y-1.5 sm:-translate-y-7",
    translateX: "translate-x-0 sm:translate-x-1",
    scale: "scale-[0.96] sm:scale-[0.91]",
    shadow: "drop-shadow-[0_22px_36px_rgba(0,0,0,0.8)]",
  },
  // 6: Grounded Center — Natural rest, gentle negative tilt
  {
    rotate: "-rotate-[0.5deg] sm:-rotate-[2deg]",
    translateY: "translate-y-1 sm:translate-y-3",
    translateX: "translate-x-0",
    scale: "scale-[1.0] sm:scale-[1.01]",
    shadow: "drop-shadow-[0_12px_22px_rgba(0,0,0,0.85)]",
  },
  // 7: Row 1 Climax — Medium-large, elevated, right tilt
  {
    rotate: "rotate-[1deg] sm:rotate-[3deg]",
    translateY: "-translate-y-1 sm:-translate-y-4",
    translateX: "translate-x-0 sm:-translate-x-1",
    scale: "scale-[1.02] sm:scale-[1.04]",
    shadow: "drop-shadow-[0_16px_28px_rgba(0,0,0,0.88)]",
  },
  // 8: Row 2 Entry — Lower shelf rest, slight left tilt
  {
    rotate: "-rotate-[0.5deg] sm:-rotate-[2deg]",
    translateY: "translate-y-1 sm:translate-y-5",
    translateX: "translate-x-0 sm:translate-x-1",
    scale: "scale-[0.99] sm:scale-[0.98]",
    shadow: "drop-shadow-[0_12px_20px_rgba(0,0,0,0.85)]",
  },
  // 9: Row 2 Focal Star — Big, expressive hero piece, right tilt
  {
    rotate: "rotate-[1deg] sm:rotate-[2deg]",
    translateY: "translate-y-0 sm:-translate-y-2",
    translateX: "translate-x-0 sm:-translate-x-1.5",
    scale: "scale-[1.04] sm:scale-[1.10]",
    shadow: "drop-shadow-[0_18px_32px_rgba(0,0,0,0.92)]",
  },
  // 10: Peak Floater — Dainty collectible, highest elevation, left tilt
  {
    rotate: "-rotate-[1.5deg] sm:-rotate-[3.5deg]",
    translateY: "-translate-y-2 sm:-translate-y-8",
    translateX: "translate-x-0 sm:translate-x-1",
    scale: "scale-[0.95] sm:scale-[0.90]",
    shadow: "drop-shadow-[0_22px_36px_rgba(0,0,0,0.8)]",
  },
  // 11: Mid-Shelf Rest — Moderate elevation, gentle positive tilt
  {
    rotate: "rotate-[0.5deg] sm:rotate-[1.5deg]",
    translateY: "translate-y-0.5 sm:translate-y-3",
    translateX: "translate-x-0",
    scale: "scale-[1.01] sm:scale-[1.03]",
    shadow: "drop-shadow-[0_14px_24px_rgba(0,0,0,0.85)]",
  },
  // 12: Negative Tilt Accent — Compact, slight lift
  {
    rotate: "-rotate-[1deg] sm:-rotate-[2.5deg]",
    translateY: "-translate-y-1 sm:-translate-y-3",
    translateX: "translate-x-0 sm:-translate-x-1",
    scale: "scale-[0.98] sm:scale-[0.97]",
    shadow: "drop-shadow-[0_16px_26px_rgba(0,0,0,0.86)]",
  },
  // 13: Grounded Shelf — Resting lower, right tilt
  {
    rotate: "rotate-[1.5deg] sm:rotate-[3.5deg]",
    translateY: "translate-y-1.5 sm:translate-y-4",
    translateX: "translate-x-0 sm:translate-x-1.5",
    scale: "scale-[1.0] sm:scale-[1.01]",
    shadow: "drop-shadow-[0_12px_20px_rgba(0,0,0,0.85)]",
  },
  // 14: Dynamic Counterpoint — Larger piece, dynamic left tilt
  {
    rotate: "-rotate-[1.5deg] sm:-rotate-[3deg]",
    translateY: "-translate-y-0.5 sm:-translate-y-2",
    translateX: "translate-x-0 sm:-translate-x-1",
    scale: "scale-[1.03] sm:scale-[1.07]",
    shadow: "drop-shadow-[0_16px_30px_rgba(0,0,0,0.9)]",
  },
  // 15: Concluding Collectible — Balanced finish, gentle right tilt
  {
    rotate: "rotate-[1deg] sm:rotate-[2.5deg]",
    translateY: "translate-y-1 sm:translate-y-2",
    translateX: "translate-x-0",
    scale: "scale-[0.97] sm:scale-[0.96]",
    shadow: "drop-shadow-[0_14px_22px_rgba(0,0,0,0.85)]",
  },
];

export default function ProductCard({
  product,
  index,
  spatialProfile,
}: {
  product: Product;
  index?: number;
  spatialProfile?: SpatialProfile;
}) {
  const add = useCart((s) => s.add);
  const remove = useCart((s) => s.remove);
  const isInCart = useCart((s) => Boolean(s.items[product.id]));

  const src = product.image_url || null;
  const isValidImage = typeof src === "string" && src.trim().length > 0;
  const computedImageSrc = isValidImage ? src : null;

  const profile =
    spatialProfile ||
    (typeof index === "number" ? TRENDING_PROFILES[index % TRENDING_PROFILES.length] : undefined);

  return (
    <div className="relative group flex items-center justify-center aspect-[4/5] w-full overflow-visible select-none">
      {/* Ambient Lighting Response (Awakens on Hover / Focus) */}
      <div className="absolute inset-4 rounded-full bg-primary/[0.09] blur-xl opacity-0 transition-opacity duration-300 pointer-events-none group-hover:opacity-100 group-focus-within:opacity-100" />

      {/* Artwork Link (Physical Sticker Object) */}
      <Link
        to={`/product/${product.id}`}
        className="relative flex items-center justify-center w-full h-full p-2 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
      >
        {computedImageSrc ? (
          <img
            src={
              computedImageSrc.includes("unsplash.com")
                ? computedImageSrc +
                  (computedImageSrc.includes("?") ? "&" : "?") +
                  "w=400&q=75&auto=format&fit=crop"
                : computedImageSrc
            }
            alt={product.title}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-contain filter origin-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              profile
                ? `${profile.rotate} ${profile.translateY} ${profile.translateX} ${profile.scale} ${profile.shadow}`
                : "drop-shadow-[0_12px_20px_rgba(0,0,0,0.85)]"
            } motion-safe:group-hover:scale-[1.04] motion-safe:group-hover:rotate-0 motion-safe:group-hover:-translate-y-2.5 motion-safe:group-focus-within:scale-[1.04] motion-safe:group-focus-within:rotate-0 motion-safe:group-focus-within:-translate-y-2.5 group-hover:drop-shadow-[0_22px_32px_rgba(0,0,0,0.85)] group-hover:drop-shadow-[0_6px_12px_rgba(0,0,0,0.6)] group-focus-within:drop-shadow-[0_22px_32px_rgba(0,0,0,0.85)] motion-reduce:transform-none`}
          />
        ) : (
          <div className="h-full w-full bg-white/[0.04] border border-white/[0.06] animate-pulse flex flex-col items-center justify-center rounded-lg">
            <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-2" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
              No Asset
            </span>
          </div>
        )}
      </Link>

      {/* Discount Badge */}
      {product.price && product.price < 15.5 && (
        <div className="absolute top-2 left-2 z-20 pointer-events-none">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary text-primary-foreground shadow-[0_0_12px_var(--color-primary-glow)]">
            -{Math.round(((15.5 - product.price) / 15.5) * 100)}%
          </span>
        </div>
      )}

      {/* Floating Action Button (Integrated Object Touchpoint) */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isInCart) {
            remove(product.id);
          } else {
            add({ id: product.id, title: product.title, image_url: src || "", price: product.price }, 1);
          }
        }}
        aria-label={
          isInCart
            ? `Remove ${product.title} from selections`
            : `Add ${product.title} to selections`
        }
        className={`absolute bottom-2 right-2 z-20 min-w-[40px] min-h-[40px] w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-90 active:transition-transform active:duration-75 ${
          isInCart
            ? "bg-white text-black border border-white shadow-[0_0_16px_rgba(255,255,255,0.45)] hover:scale-110 hover:shadow-[0_0_20px_rgba(255,255,255,0.65)]"
            : "bg-black/40 backdrop-blur-md border border-white/20 text-white/75 shadow-md group-hover:bg-primary group-hover:text-white group-hover:border-primary/60 group-hover:shadow-[0_0_16px_rgba(139,92,246,0.5)] group-focus-within:bg-primary group-focus-within:text-white group-focus-within:border-primary/60 hover:!bg-white hover:!text-black hover:!border-white hover:scale-110 hover:!shadow-[0_0_20px_rgba(255,255,255,0.65)]"
        }`}
      >
        {isInCart ? (
          <Check className="h-5 w-5 stroke-[2.5]" />
        ) : (
          <Plus className="h-5 w-5 stroke-[2.5]" />
        )}
      </button>
    </div>
  );
}
