import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { useCart } from "@/store/cart";
import { TIERS, activeTier, formatPrice, subtotal, getBreakdown } from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const checkoutSchema = z.object({
  customer_name: z.string().trim().min(2).max(100),
  customer_phone: z
    .string()
    .trim()
    .regex(/^\d{9}$/, "Phone number must be exactly 9 digits"),
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
  const navigate = useNavigate();

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
          phone_number: "0" + parsed.data.customer_phone,
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
      setSuccess({ phone: "0" + parsed.data.customer_phone });
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
          className="mt-10 rounded-none border border-primary bg-primary/10 px-10 py-4 text-sm font-black uppercase tracking-[0.25em] text-primary transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_30px_theme(colors.primary.DEFAULT)]"
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
          className="mt-10 rounded-none border border-primary bg-primary/10 px-10 py-4 text-sm font-black uppercase tracking-[0.25em] text-primary transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_30px_theme(colors.primary.DEFAULT)]"
        >
          Browse Stickers
        </Link>
      </div>
    );
  }

  return (
    <div 
      className="relative min-h-screen w-full font-sans bg-[#0a0b14]"
      style={{
        backgroundImage: `radial-gradient(rgba(10, 11, 20, 0.85), rgba(5, 5, 10, 0.95)), url("data:image/svg+xml,%3Csvg viewBox='0%200%20200%20200'%20xmlns='http://www.w3.org/200%252fsvg'%3E%3Cfilter%20id='noiseFilter'%3E%3CfeTurbulence%20type='fractalNoise'%20baseFrequency='0.65'%20numOctaves='3'%20stitchTiles='stitch'/%3E%3C/filter%3E%3Crect%20width='100%25'%20height='100%25'%20filter='url(%23noiseFilter)'%20opacity='0.025'/%3E%3C/svg%3E")`
      }}
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-8">
        <div className="flex flex-col md:flex-row items-baseline justify-between mb-8">
        <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight">Your Selections</h1>
        <p className="mt-2 text-sm text-muted-foreground font-medium uppercase tracking-widest">
          Active tier: <span className="text-primary font-bold">{tier.label}</span> // Avg{" "}
          {formatPrice(averageUnit)}
        </p>
      </div>

      <div className="grid gap-10 md:grid-cols-[6fr_4fr] items-start">
        {/* Left Panel: Sticker Tape Review Roll */}
        <div className="flex flex-wrap content-start justify-center md:justify-start gap-6 p-4 sm:p-8 relative min-h-[500px]">
          {items.map((it, i) => {
            const computedImageSrc = it.image_url || null;
            // Generate pseudo-random but stable rotations and offsets
            const rotateAngles = ["rotate-[-4deg]", "rotate-[3deg]", "rotate-[-2deg]", "rotate-[5deg]", "rotate-[-6deg]", "rotate-[2deg]"];
            const mtOffsets = ["mt-0", "mt-4", "mt-8", "mt-2", "mt-6", "mt-0"];
            const rot = rotateAngles[i % rotateAngles.length];
            const mt = mtOffsets[i % mtOffsets.length];
            
            return (
              <div
                key={it.id}
                className={`group relative w-32 sm:w-40 aspect-[4/5] overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 shadow-black/90 shadow-2xl transition-all duration-500 hover:rotate-0 hover:scale-110 hover:z-50 ${rot} ${mt}`}
              >
                <Link to={`/product/${it.id}`} className="absolute inset-0 z-0">
                  {computedImageSrc ? (
                    <img
                      src={computedImageSrc}
                      alt={it.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 opacity-90 group-hover:opacity-100"
                    />
                  ) : (
                    <div className="h-full w-full bg-muted/20 animate-pulse" />
                  )}
                </Link>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b14] via-transparent to-transparent opacity-90 pointer-events-none" />

                <div className="absolute top-2 left-2 z-30 pointer-events-none">
                  <span className="bg-black text-primary text-[10px] font-black px-2 py-1 border border-primary/20 shadow-[0_0_10px_theme(colors.primary.DEFAULT)/0.5]">
                    {it.quantity}x
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    remove(it.id);
                  }}
                  className="absolute top-2 right-2 z-30 grid h-7 w-7 place-items-center bg-destructive/80 text-white shadow-lg transition-transform hover:scale-110 hover:bg-destructive rounded-none"
                  aria-label="Remove selection"
                >
                  <Trash2 className="h-3 w-3" />
                </button>

                <div className="absolute bottom-2 left-0 right-0 px-2 z-30 flex justify-between items-center">
                  <button
                    onClick={() => setQty(it.id, it.quantity - 1)}
                    className="grid h-7 w-7 place-items-center bg-black/60 backdrop-blur-md text-white border border-white/10 hover:bg-black/90 transition-colors rounded-none"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setQty(it.id, it.quantity + 1)}
                    className="grid h-7 w-7 place-items-center bg-black/60 backdrop-blur-md text-white border border-white/10 hover:bg-black/90 transition-colors rounded-none"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Panel: Checkout */}
        <div className="p-8 border-t-[3px] border-t-primary border-l border-r border-b border-primary/20 shadow-2xl h-fit sticky top-24 bg-[#0a0b14] backdrop-blur-xl">
          <p className="text-micro text-primary tracking-[0.2em] font-black flex items-center gap-2">
            <span className="w-2 h-2 bg-primary animate-pulse shadow-[0_0_8px_theme(colors.primary.DEFAULT)]" />
            CHECKOUT — SECURE
          </p>
          
          {/* Black-and-White Thermal Ticket Module */}
          <div className="mt-6 bg-[#f4f4f5] p-6 text-black font-mono border border-black shadow-[0_0_20px_rgba(0,0,0,0.5)] relative">
            <div className="absolute top-0 left-0 right-0 h-2 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjQiPjxwb2x5Z29uIHBvaW50cz0iMCwwIDQsNCA4LDAiIGZpbGw9IiMwYTBiMTQiLz48L3N2Zz4=')] repeat-x" />
            
            <div className="text-center mb-6 mt-2">
              <p className="text-sm font-black uppercase tracking-widest border-b-2 border-black pb-2 inline-block">ORDER SUMMARY</p>
            </div>

            <div className="flex items-baseline justify-between border-b border-dashed border-black/40 pb-4">
              <span className="text-xs font-bold uppercase tracking-widest">TOTAL ITEMS</span>
              <span className="text-xl font-black tracking-tighter">
                {totalQty}
              </span>
            </div>

            {breakdown.length > 1 && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-black/60 mb-2">RECEIPT BREAKDOWN</p>
                <div className="flex flex-col gap-1.5 font-medium tracking-wide text-xs">
                  {breakdown.map((b, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span>{b.qty} × {b.price.toFixed(2)} KSh</span>
                      <span className="font-bold">{(b.qty * b.price).toFixed(2)} KSh</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-dashed border-black/40 flex items-baseline justify-between">
              <span className="text-sm font-bold uppercase tracking-widest">TOTAL DUE</span>
              <span className="text-2xl font-black tracking-tighter">
                {formatPrice(total)}
              </span>
            </div>

            <div className="mt-6 text-center text-black/40 text-[10px] tracking-[0.4em] font-bold">
              -----------------
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjQiPjxwb2x5Z29uIHBvaW50cz0iMCw0IDQsMCA4LDQiIGZpbGw9IiMwYTBiMTQiLz48L3N2Zz4=')] repeat-x" />
          </div>

          {/* Industrial Progress-Step Pills */}
          <div className="mt-8 relative">
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/10 -translate-y-1/2 z-0" />
            <div className="relative z-10 grid grid-cols-3 gap-2">
              {TIERS.map((t) => {
                const isActive = t === tier;
                return (
                  <div
                    key={t.label}
                    className={`px-1 py-3 text-center flex flex-col justify-center transition-all border ${
                      isActive
                        ? "bg-primary border-primary text-primary-foreground font-black shadow-[0_0_20px_theme(colors.primary.DEFAULT)] scale-105"
                        : "bg-black/40 backdrop-blur-sm border-white/10 text-muted-foreground/50"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-widest">{t.label}</div>
                    <div className="mt-1 text-[10px] font-black leading-tight">{t.description}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cinematic Minimalist Form Fields */}
          <form onSubmit={handleSubmit} className="mt-10 space-y-8">
            <div className="relative group">
              <label className="text-micro text-muted-foreground group-focus-within:text-primary transition-colors block mb-1">
                NAME
              </label>
              <Input
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                className="h-10 bg-transparent border-0 border-b-2 border-white/20 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary focus-visible:shadow-[0_4px_15px_-3px_theme(colors.primary.DEFAULT)] transition-all font-medium text-lg placeholder:text-muted-foreground/30"
                placeholder="Full name"
              />
            </div>
            <div className="relative group">
              <label className="text-micro text-muted-foreground group-focus-within:text-primary transition-colors block mb-1">
                PHONE NUMBER
              </label>
              <div className="flex items-center bg-transparent border-b-2 border-white/20 group-focus-within:border-primary group-focus-within:shadow-[0_4px_15px_-3px_theme(colors.primary.DEFAULT)] transition-all">
                <span className="text-lg font-medium text-muted-foreground mr-1 select-none">0</span>
                <Input
                  value={form.customer_phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                    setForm({ ...form, customer_phone: val });
                  }}
                  className="h-10 bg-transparent border-0 rounded-none px-0 focus-visible:ring-0 transition-all font-medium text-lg placeholder:text-muted-foreground/30 flex-1"
                  placeholder="712345678"
                  inputMode="numeric"
                  maxLength={9}
                />
              </div>
            </div>
            <div className="relative group">
              <label className="text-micro text-muted-foreground group-focus-within:text-primary transition-colors block mb-1">
                LOCATION
              </label>
              <Textarea
                value={form.delivery_place}
                onChange={(e) => setForm({ ...form, delivery_place: e.target.value })}
                className="bg-transparent border-0 border-b-2 border-white/20 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary focus-visible:shadow-[0_4px_15px_-3px_theme(colors.primary.DEFAULT)] transition-all font-medium text-lg resize-none placeholder:text-muted-foreground/30"
                placeholder="Enter your general area or neighborhood (e.g. Nairobi Central, Roysambu, Westlands)"
                rows={2}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-10 w-full bg-primary py-6 text-xl font-black uppercase tracking-[0.15em] text-primary-foreground transition-all hover:scale-[1.02] hover:shadow-[0_0_40px_theme(colors.primary.DEFAULT)] disabled:opacity-60 neon-glow rounded-none"
              style={{ fontFamily: "'Archivo Black', system-ui, sans-serif" }}
            >
              {submitting ? "PROCESSING..." : "CONFIRM ORDER"}
            </button>
            <p className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mt-4">
              We'll call you within 10 min to confirm
            </p>
          </form>
        </div>
      </div>
    </div>
    </div>
  );
}
