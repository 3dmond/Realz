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
    <div className="group relative aspect-[4/5] flex flex-col justify-between p-1.5 transition-all duration-300">
      <Link to={`/product/${product.id}`} className="flex flex-col h-full w-full justify-between z-10">
        {/* Physical Sticker Canvas (Transparent - No Card Border) */}
        <div className="relative flex-1 w-full min-h-0 flex items-center justify-center p-2">
          {computedImageSrc ? (
            <img
              src={computedImageSrc.includes('unsplash.com') ? computedImageSrc + (computedImageSrc.includes('?') ? '&' : '?') + 'w=400&q=75&auto=format&fit=crop' : computedImageSrc}
              alt={product.title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain filter drop-shadow-[0_10px_18px_rgba(0,0,0,0.75)] transition-all duration-300 ease-out group-hover:scale-[1.06] group-hover:-rotate-2 group-hover:-translate-y-1"
            />
          ) : (
            <div className="h-full w-full bg-muted/10 animate-pulse flex flex-col items-center justify-center border-0 rounded-lg">
              <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-2" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">No Asset</span>
            </div>
          )}
        </div>

        {/* Grounded Metadata Box */}
        <div className="w-full shrink-0 p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl backdrop-blur-sm mt-2 flex items-center justify-between z-10 transition-colors group-hover:border-primary/30">
          <div className="flex flex-col pr-2 overflow-hidden">
            <span className="text-[11px] md:text-[12px] font-bold text-foreground leading-tight truncate group-hover:text-primary transition-colors">
              {product.title}
            </span>
            <span className="text-[10px] font-black text-primary/90 tracking-wider uppercase mt-0.5">
              From 15.50 KSh
            </span>
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              toggle({ id: product.id, title: product.title, image_url: src || "" });
            }}
            aria-label={inCart ? "Remove from selections" : "Add to selections"}
            className={`shrink-0 grid h-7 w-7 place-items-center rounded-full transition-all duration-200 ${
              inCart
                ? "bg-primary text-primary-foreground shadow-[0_0_15px_oklch(0.705_0.20_47/0.8)] scale-105"
                : "bg-white/5 border border-white/10 text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary"
            }`}
          >
            {inCart ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          </button>
        </div>
      </Link>
    </div>
  );
}
