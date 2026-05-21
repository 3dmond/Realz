import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, X } from "lucide-react";
import { useCart } from "@/store/cart";
import { TIERS, activeTier, formatPrice, subtotal, unitPriceFor } from "@/lib/pricing";

export default function Selections() {
  const items = useCart((s) => Object.values(s.items));
  const remove = useCart((s) => s.remove);
  const totalQty = items.reduce((a, b) => a + b.quantity, 0);
  const unit = unitPriceFor(totalQty);
  const total = subtotal(totalQty);
  const tier = activeTier(totalQty);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="relative min-h-[calc(100vh-8rem)] overflow-hidden">
      {/* Watermark logos */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
        <div className="realz-logo absolute -left-10 top-8 text-[14rem]">Rea<span className="lz">lz</span></div>
        <div className="realz-logo absolute -right-10 bottom-8 text-[14rem]">Rea<span className="lz">lz</span></div>
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <p className="text-micro text-accent">CHECKOUT FLOW</p>
        <h1 className="mt-4 text-4xl sm:text-6xl">Your selections.</h1>

        <div className="mt-10 grid gap-6 md:grid-cols-[3fr_2fr]">
          {/* Left: pricing tiers */}
          <div className="glass-panel rounded-2xl p-6">
            <p className="text-micro text-muted-foreground">BULK PRICING TIERS</p>
            <div className="mt-4 space-y-2">
              {TIERS.map((t) => (
                <div
                  key={t.label}
                  className={`flex items-center justify-between rounded-lg border border-transparent px-4 py-3 transition ${
                    t === tier
                      ? "bg-primary/15 border-primary/40 text-foreground"
                      : "bg-secondary text-muted-foreground hover:border-primary/30 hover:text-primary"
                  }`}
                >
                  <span className="text-sm font-bold uppercase tracking-widest">{t.label}</span>
                  <span className="text-xl font-black">{formatPrice(t.unitPrice)}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-lg bg-black/30 p-4">
              <p className="text-micro text-muted-foreground">CURRENT SUBTOTAL</p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">{totalQty} stickers @ {formatPrice(unit)}</span>
                <span className="text-3xl font-black text-primary">{formatPrice(total)}</span>
              </div>
            </div>
          </div>

          {/* Right: actions */}
          <div className="glass-panel rounded-2xl p-6">
            <button
              onClick={() => setGalleryOpen(true)}
              disabled={items.length === 0}
              className="flex w-full items-center justify-between text-left text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <span>View selections ({items.length})</span>
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => navigate("/cart")}
              disabled={items.length === 0}
              className="mt-6 w-full rounded-full bg-primary py-4 text-sm font-black uppercase tracking-[0.25em] text-primary-foreground transition hover:scale-[1.01] hover:shadow-[0_0_30px_oklch(0.705_0.20_47/0.7)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Proceed to checkout
            </button>

            <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
              Pay on delivery · Phone confirmation
            </p>

            {items.length === 0 && (
              <Link
                to="/shop"
                className="mt-8 block text-center text-sm text-accent underline-offset-4 hover:underline"
              >
                Browse the shop →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Gallery modal */}
      {galleryOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-xl">
          <div className="glass-panel relative w-full max-w-4xl rounded-2xl p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl">Selections ({items.length})</h2>
              <button onClick={() => setGalleryOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white/5 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4 md:grid-cols-5">
              {items.map((it) => (
                <div key={it.id} className="relative aspect-square overflow-hidden rounded-lg bg-card">
                  <img src={it.thumbnail_url} alt={it.title} className="h-full w-full object-cover" />
                  <div className="img-fade absolute inset-0" />
                  <span className="text-micro absolute bottom-1.5 left-1.5 text-accent">{it.title}</span>
                  <button
                    onClick={() => remove(it.id)}
                    className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-destructive text-white shadow-lg"
                    aria-label={`Remove ${it.title}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
