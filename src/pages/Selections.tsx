import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { z } from "zod";
import { useCart } from "@/store/cart";
import { TIERS, activeTier, formatPrice, subtotal, unitPriceFor, getBreakdown } from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ProductCard from "@/components/ui-bits/ProductCard";

const checkoutSchema = z.object({
  customer_name: z.string().trim().min(2).max(100),
  customer_phone: z
    .string()
    .trim()
    .min(6)
    .max(20)
    .regex(/^[+\d\s\-()]+$/, "Invalid phone number"),
  delivery_place: z.string().trim().min(8).max(500),
});

export default function Selections() {
  const itemsMap = useCart((s) => s.items);
  const items = Object.values(itemsMap);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);

  const totalQty = items.reduce((a, b) => a + b.quantity, 0);
  const total = subtotal(totalQty);
  const tier = activeTier(totalQty);
  const breakdown = getBreakdown(totalQty);
  const averageUnit = totalQty > 0 ? +(total / totalQty).toFixed(2) : 0;

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ phone: string } | null>(null);
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", delivery_place: "" });
  const [showGrid, setShowGrid] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return items.slice(start, start + ITEMS_PER_PAGE);
  }, [items, currentPage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = checkoutSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    if (items.length === 0) {
      toast.error("Your selections are empty");
      return;
    }
    setSubmitting(true);
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          customer_name: parsed.data.customer_name,
          phone_number: parsed.data.customer_phone,
          delivery_address: parsed.data.delivery_place,
          total_price: total,
          total_quantity: totalQty,
        })
        .select()
        .single();
      
      console.log("Order submission response:", { order, error });
      
      if (error) throw error;

      if (order) {
        const orderItems = items.map((it) => ({
          order_id: order.id,
          product_id: it.id,
          quantity: it.quantity,
          unit_price: averageUnit,
        }));

        const { error: itemsErr } = await supabase
          .from("order_items")
          .insert(orderItems as any);

        if (itemsErr) throw itemsErr;
      }

      clear();
      localStorage.removeItem("realz-cart");
      setSuccess({ phone: parsed.data.customer_phone });
    } catch (err) {
      console.error(err);
      toast.error("Could not place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
        <p className="text-micro text-accent">ORDER CONFIRMED</p>
        <h1 className="mt-6 text-4xl sm:text-5xl font-black uppercase tracking-tight">
          It's locked in.
        </h1>
        <p className="mt-6 max-w-md text-muted-foreground font-medium">
          Order placed! We will call you on{" "}
          <span className="text-primary font-bold">{success.phone}</span> within 10 minutes to
          confirm your delivery details.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-10 rounded-full bg-primary px-8 py-3 text-sm font-black uppercase tracking-[0.25em] text-primary-foreground neon-glow transition-transform hover:scale-105"
        >
          Explore More Stickers
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
        <p className="text-micro text-muted-foreground">EMPTY</p>
        <h1 className="mt-6 text-4xl sm:text-5xl font-black uppercase tracking-tight">
          Nothing here yet.
        </h1>
        <p className="mt-4 text-muted-foreground font-medium">
          Pick a few stickers from the catalog.
        </p>
        <Link
          to="/"
          className="mt-10 rounded-full bg-primary px-8 py-3 text-sm font-black uppercase tracking-[0.25em] text-primary-foreground neon-glow transition-transform hover:scale-105"
        >
          Browse Stickers
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight">Your Selections</h1>
      <p className="mt-2 text-sm text-muted-foreground font-medium">
        Active tier: <span className="text-primary font-bold">{tier.label}</span> · Avg{" "}
        {formatPrice(averageUnit)} per sticker
      </p>

      <div className="mt-10 grid gap-10 md:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-6">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className="flex items-center justify-between w-full p-6 bg-card border border-border rounded-2xl hover:bg-accent/5 transition-colors group"
          >
            <span className="text-lg font-black uppercase tracking-widest text-foreground group-hover:text-primary transition-colors">
              {showGrid ? "Hide Selections" : "View Selections"}
            </span>
            {showGrid ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
          </button>

          {showGrid && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {paginatedItems.map((it) => {
                  const computedImageSrc = it.image_url || null;
                  
                  return (
                    <div
                      key={it.id}
                      className="group relative aspect-[4/5] overflow-hidden rounded-xl bg-card border border-border transition"
                    >
                      <Link to={`/product/${it.id}`} className="absolute inset-0 z-0">
                        {computedImageSrc ? (
                          <img
                            src={computedImageSrc}
                            alt={it.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div className="h-full w-full bg-muted/20 animate-pulse" />
                        )}
                      </Link>
                    <div className="img-fade absolute inset-0 pointer-events-none" />

                    <div className="absolute top-2 left-2 z-30 pointer-events-none">
                      <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-black px-2 py-1 rounded-full border border-white/10 shadow-lg">
                        QTY: {it.quantity}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        remove(it.id);
                      }}
                      className="absolute top-2 right-2 z-30 grid h-8 w-8 place-items-center rounded-full bg-destructive/80 text-white shadow-lg transition-transform hover:scale-110 hover:bg-destructive"
                      aria-label="Remove selection"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="absolute bottom-3 left-0 right-0 px-3 z-30 flex justify-center items-center gap-3">
                      <button
                        onClick={() => setQty(it.id, it.quantity - 1)}
                        className="grid h-7 w-7 place-items-center rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-[1.5rem] text-center text-xs font-black text-white drop-shadow-md">
                        {it.quantity}
                      </span>
                      <button
                        onClick={() => setQty(it.id, it.quantity + 1)}
                        className="grid h-7 w-7 place-items-center rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-10 h-10 rounded-full text-sm font-bold transition-all ${
                        currentPage === i + 1
                          ? "bg-primary text-primary-foreground shadow-[0_0_15px_oklch(0.705_0.20_47/0.5)]"
                          : "bg-card hover:bg-accent text-foreground"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Checkout panel */}
        <div className="glass-panel rounded-2xl p-6 border border-primary/10 shadow-2xl h-fit sticky top-24">
          <p className="text-micro text-accent tracking-[0.2em] font-black">
            CHECKOUT — PAY ON DELIVERY
          </p>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground font-medium">{totalQty} stickers</span>
            <span className="text-3xl font-black text-primary drop-shadow-[0_0_15px_oklch(0.705_0.20_47/0.3)]">
              {formatPrice(total)}
            </span>
          </div>

          {breakdown.length > 1 && (
            <div className="mt-3 px-4 py-3 bg-black/20 rounded-xl border border-white/5 text-xs text-muted-foreground animate-in fade-in slide-in-from-top-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Receipt Breakdown</p>
              <div className="flex flex-col gap-1.5 font-medium">
                {breakdown.map((b, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span>{b.qty} × {b.price.toFixed(2)} KSh</span>
                    <span className="text-foreground/80">{(b.qty * b.price).toFixed(2)} KSh</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-1.5">
            {TIERS.map((t) => (
              <div
                key={t.label}
                className={`rounded-lg px-2 py-2 text-center flex flex-col justify-center transition-all ${
                  t === tier
                    ? "bg-primary text-primary-foreground font-black shadow-[0_0_15px_oklch(0.705_0.20_47/0.4)] scale-[1.02]"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                <div className="text-[10px] uppercase tracking-widest opacity-90">{t.label}</div>
                <div className="mt-1 text-[10px] font-black leading-tight">{t.description}</div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                NAME
              </label>
              <Input
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                className="mt-1 h-12 bg-white/5 border-border/50 focus-visible:ring-primary rounded-xl"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                PHONE NUMBER
              </label>
              <Input
                value={form.customer_phone}
                onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                className="mt-1 h-12 bg-white/5 border-border/50 focus-visible:ring-primary rounded-xl"
                placeholder="+254..."
                inputMode="tel"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                DELIVERY ADDRESS
              </label>
              <Textarea
                value={form.delivery_place}
                onChange={(e) => setForm({ ...form, delivery_place: e.target.value })}
                className="mt-1 bg-white/5 border-border/50 focus-visible:ring-primary rounded-xl p-4"
                placeholder="Area, building, house number..."
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-primary py-4 text-sm font-black uppercase tracking-[0.25em] text-primary-foreground transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_oklch(0.705_0.20_47/0.7)] disabled:opacity-60 neon-glow"
            >
              {submitting ? "Processing…" : "Confirm Order"}
            </button>
            <p className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              We'll call you within 10 min to confirm
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

