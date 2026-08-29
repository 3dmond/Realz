import { Plus, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/store/cart";
import type { Product } from "@/lib/queries";

export default function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const isInCart = useCart((s) => Boolean(s.items[product.id]));

  const src = product.image_url || null;
  const isValidImage = typeof src === "string" && src.trim().length > 0;
  const computedImageSrc = isValidImage ? src : null;

  return (
    <div className="relative group flex items-center justify-center aspect-[4/5] w-full">
      {/* Artwork Link */}
      <Link
        to={`/product/${product.id}`}
        className="relative flex items-center justify-center w-full h-full p-2 z-10"
      >
        {computedImageSrc ? (
          <img
            src={
              computedImageSrc.includes("unsplash.com")
                ? computedImageSrc + (computedImageSrc.includes("?") ? "&" : "?") + "w=400&q=75&auto=format&fit=crop"
                : computedImageSrc
            }
            alt={product.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain filter drop-shadow-[0_10px_18px_rgba(0,0,0,0.75)] transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3"
          />
        ) : (
          <div className="h-full w-full bg-muted/10 animate-pulse flex flex-col items-center justify-center border-0 rounded-lg">
            <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-2" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">No Asset</span>
          </div>
        )}
      </Link>

      {/* Floating Action Button (Quick Add with Active State) */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          add({ id: product.id, title: product.title, image_url: src || "" }, 1);
        }}
        aria-label={isInCart ? `${product.title} is selected` : `Add ${product.title} to selections`}
        className={`absolute bottom-2 right-2 z-20 w-10 h-10 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-all cursor-pointer ${
          isInCart
            ? "bg-white text-black border border-gray-200 shadow-md"
            : "bg-primary text-white hover:bg-white hover:text-black"
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
