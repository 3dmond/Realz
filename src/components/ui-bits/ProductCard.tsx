import { Minus, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/store/cart";
import type { Product } from "@/lib/queries";

export default function ProductCard({ product }: { product: Product }) {
  const inCart = useCart((s) => !!s.items[product.id]);
  const toggle = useCart((s) => s.toggle);

  const src = product.image_url || null;
  const isValidImage = typeof src === "string" && src.trim().length > 0;
  const computedImageSrc = isValidImage ? src : null;

  return (
    <div
      className={`group relative aspect-[4/5] overflow-hidden rounded-xl bg-card/70 hover:bg-card/90 border transition-all duration-300 flex flex-col justify-between ${
        inCart ? "neon-glow border-primary" : "border-border/40 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(249,115,22,0.12)]"
      }`}
    >
      <Link to={`/product/${product.id}`} className="flex flex-col h-full w-full justify-between p-4 z-10">
        {/* Sticker Image Container */}
        <div className="relative flex-1 w-full min-h-0 flex items-center justify-center overflow-hidden">
          {computedImageSrc ? (
            <img
              src={computedImageSrc.includes('unsplash.com') ? computedImageSrc + (computedImageSrc.includes('?') ? '&' : '?') + 'w=400&q=75&auto=format&fit=crop' : computedImageSrc}
              alt={product.title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.05]"
            />
          ) : (
            <div className="h-full w-full bg-muted/20 animate-pulse flex flex-col items-center justify-center border-0 rounded-lg">
              <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-2" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">No Asset</span>
            </div>
          )}
        </div>

        {/* Product Title & Starting Price */}
        <div className="w-full shrink-0 pt-3 border-t border-white/5 mt-2 flex flex-col pr-8">
          <span className="text-[11px] md:text-[12px] font-bold text-foreground leading-tight truncate group-hover:text-primary transition-colors">
            {product.title}
          </span>
          <span className="text-[10px] font-black text-primary/90 tracking-wider uppercase mt-0.5">
            From 15.50 KSh
          </span>
        </div>
      </Link>

      {inCart && <div className="absolute inset-0 bg-primary/5 pointer-events-none z-0" />}

      {/* Cart Add/Remove Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          toggle({ id: product.id, title: product.title, image_url: src || "" });
        }}
        aria-label={inCart ? "Remove from selections" : "Add to selections"}
        className={`absolute bottom-3 right-3 z-20 grid h-8 w-8 place-items-center rounded-full transition-all duration-200 ${
          inCart
            ? "bg-primary text-primary-foreground shadow-[0_0_18px_oklch(0.705_0.20_47/0.8)] scale-105"
            : "glass-card text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary/60"
        }`}
      >
        {inCart ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>
    </div>
  );
}
