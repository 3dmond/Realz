import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { useCart } from "@/store/cart";
import { TIERS, activeTier, formatPrice, subtotal, unitPriceFor } from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const checkoutSchema = z.object({
  customer_name: z.string().trim().min(2).max(100),
  phone_number: z.string().trim().min(6).max(20).regex(/^[+\d\s\-()]+$/, "Invalid phone number"),
  delivery_address: z.string().trim().min(8).max(500),
});

export default function Cart() {
  const itemsMap = useCart((s) => s.items);
  const items = Object.values(itemsMap);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);

  const totalQty = items.reduce((a, b) => a + b.quantity, 0);
  const unit = unitPriceFor(totalQty);
  const total = subtotal(totalQty);
  const tier = activeTier(totalQty);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ phone: string } | null>(null);
  const [form, setForm] = useState({ customer_name: "", phone_number: "", delivery_address: "" });
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = checkoutSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    setSubmitting(true);
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          ...parsed.data,
          total_quantity: totalQty,
          total_price: total,
          status: "Pending Call",
        })
        .select()
        .single();
      if (error) throw error;

      const rows = items.map((it) => ({
        order_id: order.id,
        product_id: it.id,
        quantity: it.quantity,
        calculated_price: +(it.quantity * unit).toFixed(2),
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(rows);
      if (itemsErr) throw itemsErr;

      clear();
      setSuccess({ phone: parsed.data.phone_number });
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
        <h1 className="mt-6 text-4xl sm:text-5xl">It's locked in.</h1>
        <p className="mt-6 max-w-md text-muted-foreground">
          Order placed! We will call you on <span className="text-primary font-bold">{success.phone}</span> within 10 minutes to confirm your delivery details.
        </p>
        <button
          onClick={() => navigate("/shop")}
          className="mt-10 rounded-full bg-primary px-8 py-3 text-sm font-black uppercase tracking-[0.25em] text-primary-foreground"
        >
          Keep shopping
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
        <p className="text-micro text-muted-foreground">EMPTY</p>
        <h1 className="mt-6 text-4xl sm:text-5xl">Nothing here yet.</h1>
        <p className="mt-4 text-muted-foreground">Pick a few stickers from the shop.</p>
        <Link to="/shop" className="mt-10 rounded-full bg-primary px-8 py-3 text-sm font-black uppercase tracking-[0.25em] text-primary-foreground">
          Browse shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <h1 className="text-4xl sm:text-5xl">Your cart</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Bulk tier active: <span className="text-primary font-bold">{tier.label}</span> · {formatPrice(unit)} per sticker
      </p>

      <div className="mt-10 grid gap-10 md:grid-cols-[1.4fr_1fr]">
        {/* Items */}
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-4 rounded-xl bg-card p-3">
              <img src={it.thumbnail_url} alt={it.title} className="h-20 w-20 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{it.title}</p>
                <p className="text-xs text-muted-foreground">{formatPrice(unit)} × {it.quantity}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setQty(it.id, it.quantity - 1)} className="grid h-8 w-8 place-items-center rounded-full bg-white/5 hover:bg-white/10">
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-6 text-center text-sm font-black tabular-nums">{it.quantity}</span>
                <button onClick={() => setQty(it.id, it.quantity + 1)} className="grid h-8 w-8 place-items-center rounded-full bg-white/5 hover:bg-white/10">
                  <Plus className="h-3 w-3" />
                </button>
                <button onClick={() => remove(it.id)} className="ml-2 grid h-8 w-8 place-items-center rounded-full bg-destructive/15 text-destructive hover:bg-destructive/25">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout panel */}
        <div className="glass-panel rounded-2xl p-6">
          <p className="text-micro text-accent">CHECKOUT — PAY ON DELIVERY</p>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">{totalQty} stickers</span>
            <span className="text-3xl font-black text-primary">{formatPrice(total)}</span>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-1">
            {TIERS.map((t) => (
              <div
                key={t.label}
                className={`rounded-md px-1 py-2 text-center text-[9px] uppercase tracking-widest ${
                  t === tier ? "bg-primary text-primary-foreground font-black" : "bg-white/5 text-muted-foreground"
                }`}
              >
                <div>{t.label.split(" ")[0]}</div>
                <div className="mt-0.5 text-xs font-black">{formatPrice(t.unitPrice)}</div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <div>
              <label className="text-micro text-muted-foreground">NAME</label>
              <Input
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                className="mt-1 h-11 bg-white/5 focus-visible:ring-primary"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-micro text-muted-foreground">PHONE NUMBER</label>
              <Input
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                className="mt-1 h-11 bg-white/5 focus-visible:ring-primary"
                placeholder="+1 555 000 0000"
                inputMode="tel"
              />
            </div>
            <div>
              <label className="text-micro text-muted-foreground">DELIVERY ADDRESS</label>
              <Textarea
                value={form.delivery_address}
                onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
                className="mt-1 bg-white/5 focus-visible:ring-primary"
                placeholder="Street, city, postal code"
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-primary py-4 text-sm font-black uppercase tracking-[0.25em] text-primary-foreground transition hover:scale-[1.01] hover:shadow-[0_0_30px_oklch(0.705_0.20_47/0.7)] disabled:opacity-60"
            >
              {submitting ? "Placing order…" : "Proceed to checkout"}
            </button>
            <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
              We'll call you within 10 min to confirm
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
