import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { fetchProduct } from "@/lib/queries";
import { TIERS, activeTier, formatPrice, unitPriceFor } from "@/lib/pricing";
import { useCart } from "@/store/cart";
import { toast } from "sonner";

export default function Product() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => fetchProduct(productId),
    enabled: !isNaN(productId),
  });
  const [qty, setQty] = useState(1);
  const add = useCart((s) => s.add);

  if (isLoading || !product) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center text-muted-foreground">
        Loading sticker…
      </div>
    );
  }

  const unit = unitPriceFor(qty);
  const tier = activeTier(qty);

  const src = product.image_url || null;
  const isValidImage = typeof src === "string" && src.trim().length > 0;
  const computedImageSrc = isValidImage ? src : null;

  const handleBackToShop = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else if (product.category_id) {
      navigate(`/?category=${product.category_id}`);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <button
        onClick={handleBackToShop}
        className="text-micro-sm mb-8 inline-flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
      >
        <ArrowLeft className="h-3 w-3" /> Back to shop
      </button>

      <div className="grid gap-10 md:grid-cols-2">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-card border border-border/40 p-6 flex items-center justify-center">
          {computedImageSrc ? (
            <img
              src={
                computedImageSrc.includes("unsplash.com")
                  ? computedImageSrc +
                    (computedImageSrc.includes("?") ? "&" : "?") +
                    "w=800&q=80&auto=format"
                  : computedImageSrc
              }
              alt={product.title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain transition-transform duration-300 ease-out hover:scale-[1.02]"
            />
          ) : (
            <div className="h-full w-full bg-muted/20 animate-pulse rounded-xl" />
          )}
        </div>

        <div className="flex flex-col">
          <p className="text-micro text-accent">Sticker</p>
          <h1 className="mt-3 text-4xl sm:text-5xl text-foreground">{product.title}</h1>
          {product.description && (
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {product.keywords?.map((k) => (
              <span
                key={k}
                className="rounded-full bg-white/8 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
              >
                #{k}
              </span>
            ))}
          </div>

          {/* Quantity + price */}
          <div className="mt-10 glass-card rounded-2xl p-5">
            <p className="text-micro text-muted-foreground">QUANTITY</p>
            <div className="mt-3 flex items-center gap-4">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/5 hover:bg-white/10"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-12 text-center text-2xl font-black tabular-nums">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/5 hover:bg-white/10"
              >
                <Plus className="h-4 w-4" />
              </button>
              <div className="ml-auto text-right">
                <p className="text-micro text-muted-foreground">UNIT @ TIER</p>
                <div className="flex items-baseline justify-end gap-2">
                  <p className="text-2xl font-black text-primary">
                    {formatPrice(
                      product.price && product.price < 15.5
                        ? Math.min(unit, product.price)
                        : unit,
                    )}
                  </p>
                  {product.price && product.price < 15.5 && (
                    <span className="text-xs font-mono line-through text-muted-foreground">
                      {formatPrice(unit)}
                    </span>
                  )}
                </div>
                {product.price && product.price < 15.5 && (
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-primary/20 text-primary border border-primary/30">
                    -{Math.round(((15.5 - product.price) / 15.5) * 100)}% TIER 1 DISCOUNT
                  </span>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Active tier: <span className="text-foreground">{tier.label}</span>
            </p>
          </div>

          {/* Tier ladder preview */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {TIERS.map((t) => (
              <div
                key={t.label}
                className={`rounded-md px-2 py-2 text-center text-[10px] uppercase tracking-widest ${
                  t === tier
                    ? "bg-primary text-primary-foreground font-black"
                    : "bg-white/5 text-muted-foreground"
                }`}
              >
                <div>{t.label}</div>
                <div className="mt-1 text-xs font-black">{t.description}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              add(
                {
                  id: product.id,
                  title: product.title,
                  image_url: src || "",
                  price: product.price,
                },
                qty,
              );
              toast.success(`Added ${qty}× ${product.title}`);
            }}
            className="mt-8 w-full rounded-full bg-primary py-4 text-sm font-black uppercase tracking-[0.25em] text-primary-foreground transition hover:scale-[1.02] hover:shadow-[0_0_30px_oklch(0.705_0.20_47/0.7)]"
          >
            Add to selections
          </button>
        </div>
      </div>
    </div>
  );
}
