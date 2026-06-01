import { Minus, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/store/cart";
import type { Product } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

export default function ProductCard({ product }: { product: Product }) {
  const inCart = useCart((s) => !!s.items[product.id]);
  const toggle = useCart((s) => s.toggle);

  const computedImageSrc = product.image_url?.startsWith?.('http') 
    ? product.image_url 
    : product.image_url
      ? supabase.storage.from('products').getPublicUrl(product.image_url)?.data?.publicUrl || ""
      : "";

  return (
    <div
      className={`group relative aspect-[4/5] overflow-hidden rounded-xl bg-card transition ${
        inCart ? "neon-glow" : "border border-border"
      }`}
    >
      <Link to={`/product/${product.id}`} className="absolute inset-0 z-0">
        <img
          src={computedImageSrc}
          alt={product.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      </Link>
      <div className="img-fade absolute inset-0 pointer-events-none" />
      {inCart && <div className="absolute inset-0 bg-black/35 pointer-events-none" />}

      <button
        onClick={(e) => {
          e.preventDefault();
          toggle({ id: product.id, title: product.title, image_url: product.image_url });
        }}
        aria-label={inCart ? "Remove from selections" : "Add to selections"}
        className={`absolute bottom-2 right-2 z-20 grid h-9 w-9 place-items-center rounded-full transition ${
          inCart
            ? "bg-primary text-primary-foreground shadow-[0_0_18px_oklch(0.705_0.20_47/0.8)]"
            : "glass-card text-foreground hover:border-primary/60"
        }`}
      >
        {inCart ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>
    </div>
  );
}
