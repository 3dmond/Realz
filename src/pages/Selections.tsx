import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { z } from "zod";
import { useCart } from "@/store/cart";
import { TIERS, activeTier, formatPrice, subtotal, getBreakdown, calculateCartTotal } from "@/lib/pricing";
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

const ROTATIONS = [
  "-rotate-6",
  "rotate-3",
  "-rotate-12",
  "rotate-6",
  "-rotate-3",
  "rotate-12",
  "-rotate-8",
  "rotate-4",
  "-rotate-4",
  "rotate-8",
];

export default function Selections() {
  const itemsMap = useCart((s) => s.items);
  const items = Object.values(itemsMap);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);

  const totalQty = items.reduce((a, b) => a + b.quantity, 0);
  const { total, originalTotal, discountSavings } = calculateCartTotal(items);
  const tier = activeTier(totalQty);
  const breakdown = getBreakdown(totalQty);
  const averageUnit = totalQty > 0 ? +(total / totalQty).toFixed(2) : 0;

  // Chunk cart items into max 20 items per wall slide
  const CHUNK_SIZE = 20;
  const itemChunks = useMemo(() => {
    const chunks: (typeof items)[] = [];
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      chunks.push(items.slice(i, i + CHUNK_SIZE));
    }
    return chunks;
  }, [items]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [items, itemChunks]);

  const scrollNext = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: scrollRef.current.clientWidth, behavior: "smooth" });
    }
  };

  const scrollPrev = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -scrollRef.current.clientWidth, behavior: "smooth" });
    }
  };

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
      const formattedPhone = "0" + parsed.data.customer_phone;
      const orderItemsPayload = items.map((it) => ({
        product_id: it.id,
        quantity: it.quantity,
      }));

      // 1. Attempt authoritative atomic server RPC
      let orderCreated = false;
      try {
        const rpcFn = supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: Error | null }>;
        const { data: rpcOrder, error: rpcErr } = await rpcFn("create_verified_order", {
          p_customer_name: parsed.data.customer_name,
          p_customer_phone: formattedPhone,
          p_delivery_place: parsed.data.delivery_place,
          p_items: orderItemsPayload,
        });

        if (!rpcErr && rpcOrder) {
          orderCreated = true;
        }
      } catch {
        // Fall back to direct insertion
      }

      // 2. Direct table insert fallback if RPC not installed yet
      if (!orderCreated) {
        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .insert({
            customer_name: parsed.data.customer_name,
            customer_phone: formattedPhone,
            delivery_place: parsed.data.delivery_place,
            total_price: total,
            status: "pending",
          })
          .select()
          .single();

        if (orderErr) throw orderErr;

        if (order) {
          const orderItems = items.map((it) => ({
            order_id: order.id,
            product_id: it.id,
            quantity: it.quantity,
            unit_price: averageUnit,
          }));

          const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);

          if (itemsErr) throw itemsErr;
        }
      }

      clear();
      localStorage.removeItem("realz-cart");
      setSuccess({ phone: formattedPhone });
    } catch (err) {
      console.error(err);
      toast.error("Could not place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="relative min-h-screen w-full font-sans bg-[#0a0b14] flex flex-col items-center justify-center">
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c13.866 0 25-11.134 25-25h-2c0 12.761-10.239 23-23 23v2zm15 32c0-14.359-11.641-26-26-26v2c13.255 0 24 10.745 24 24h2zm-26 36c25.405 0 46-20.595 46-46h-2c0 24.301-19.699 44-44 44v2zm50-46c0 27.614-22.386 50-50 50v2c28.719 0 52-23.281 52-52h-2zm-50 62c34.242 0 62-27.758 62-62h-2c0 33.137-26.863 60-60 60v2zm66-62c0 36.451-29.549 66-66 66v2c37.555 0 68-30.445 68-68h-2z' fill='none' stroke='rgba(255,255,255,0.04)' stroke-width='1'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
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
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className="relative min-h-screen w-full font-sans bg-[#0a0b14] flex flex-col items-center justify-center"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c13.866 0 25-11.134 25-25h-2c0 12.761-10.239 23-23 23v2zm15 32c0-14.359-11.641-26-26-26v2c13.255 0 24 10.745 24 24h2zm-26 36c25.405 0 46-20.595 46-46h-2c0 24.301-19.699 44-44 44v2zm50-46c0 27.614-22.386 50-50 50v2c28.719 0 52-23.281 52-52h-2zm-50 62c34.242 0 62-27.758 62-62h-2c0 33.137-26.863 60-60 60v2zm66-62c0 36.451-29.549 66-66 66v2c37.555 0 68-30.445 68-68h-2z' fill='none' stroke='rgba(255,255,255,0.04)' stroke-width='1'/%3E%3C/svg%3E")`,
        }}
      >
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
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
      </div>
    );
  }

  return (
    <div
      className="relative h-screen max-h-screen overflow-hidden flex flex-col w-full font-sans bg-[#0a0b14]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c13.866 0 25-11.134 25-25h-2c0 12.761-10.239 23-23 23v2zm15 32c0-14.359-11.641-26-26-26v2c13.255 0 24 10.745 24 24h2zm-26 36c25.405 0 46-20.595 46-46h-2c0 24.301-19.699 44-44 44v2zm50-46c0 27.614-22.386 50-50 50v2c28.719 0 52-23.281 52-52h-2zm-50 62c34.242 0 62-27.758 62-62h-2c0 33.137-26.863 60-60 60v2zm66-62c0 36.451-29.549 66-66 66v2c37.555 0 68-30.445 68-68h-2z' fill='none' stroke='rgba(255,255,255,0.04)' stroke-width='1'/%3E%3C/svg%3E")`,
      }}
    >
      <div className="relative z-10 mx-auto max-w-[1700px] w-full px-4 pt-3 pb-3 sm:px-8 font-sans flex-1 h-full flex flex-col overflow-hidden">
        {/* Understated Handwritten Label */}
        <div className="mb-2 shrink-0">
          <h1
            style={{ fontFamily: "'Caveat', 'Dancing Script', 'Handlee', cursive" }}
            className="text-2xl sm:text-3xl text-purple-400 font-semibold -rotate-2 select-none origin-left leading-none drop-shadow-[0_2px_10px_rgba(168,85,247,0.35)]"
          >
            your sticker wall
          </h1>
        </div>

        <div className="grid gap-6 lg:gap-8 lg:grid-cols-[68fr_32fr] items-stretch flex-1 overflow-hidden h-full min-h-0">
          {/* Left Panel: Dynamic Sticker Wall Carousel */}
          <div className="-ml-4 sm:-ml-8 w-[calc(100%+1rem)] sm:w-[calc(100%+2rem)] h-full relative rounded-r-2xl lg:rounded-2xl bg-[#120726]/60 border-y border-r lg:border border-purple-500/20 shadow-2xl backdrop-blur-sm flex flex-col justify-between overflow-hidden">
            {/* Main horizontal scroll container with directional navigation arrows */}
            <div className="relative w-full flex-1 flex items-center overflow-hidden">
              {/* Left Directional Navigation Arrow */}
              {items.length > 20 && canScrollLeft && (
                <button
                  type="button"
                  onClick={scrollPrev}
                  aria-label="Previous wall"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-50 transition-all duration-300 bg-black/70 backdrop-blur-md text-white p-3 rounded-full hover:bg-primary cursor-pointer shadow-xl border border-white/10 hover:scale-110"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {/* Horizontal Scroll Slider */}
              <div
                ref={scrollRef}
                onScroll={checkScroll}
                className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth hide-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full h-full items-center px-12 lg:px-16"
              >
                {itemChunks.map((chunk, chunkIdx) => (
                  <div
                    key={`wall-chunk-${chunkIdx}`}
                    className="min-w-full shrink-0 snap-center p-4 sm:p-6 flex flex-col justify-center"
                  >
                    {/* Non-overlapping Grid: 20 items max (grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8 p-4) */}
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8 p-4 place-items-center">
                      {chunk.map((it, itemIdx) => {
                        const computedImageSrc = it.image_url || null;
                        const globalIdx = chunkIdx * CHUNK_SIZE + itemIdx;
                        const rotationClass = ROTATIONS[globalIdx % ROTATIONS.length];

                        return (
                          <div
                            key={it.id}
                            className={`relative group flex items-center justify-center p-2 transition-transform duration-300 hover:scale-110 hover:z-50 ${rotationClass}`}
                          >
                            {/* Layer 1 (Bottom - The Card Base): Subtle royal deep purple fill strictly behind the artwork */}
                            <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-purple-500/[0.08] border border-purple-400/30 rounded-2xl pointer-events-none shadow-xl shadow-purple-950/40" />

                            {/* Layer 2 (Middle - The Artwork): 100% crisp, unblurred sticker artwork */}
                            <Link
                              to={`/product/${it.id}`}
                              className="relative z-10 w-32 h-32 flex items-center justify-center cursor-pointer"
                            >
                              {computedImageSrc ? (
                                <img
                                  src={computedImageSrc}
                                  alt={it.title}
                                  loading="lazy"
                                  className="w-32 h-32 object-contain p-2 relative z-10 filter drop-shadow-2xl select-none"
                                />
                              ) : (
                                <div className="w-32 h-32 bg-muted/20 animate-pulse rounded-lg" />
                              )}
                            </Link>

                            {/* Layer 3 (Top - The Buttons): Absolute top layer z-20 with pointer-events-auto on interactive buttons */}
                            <div className="absolute inset-0 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-2">
                                {/* Top: Quantity Badge, Discount Badge & Delete Button */}
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-1">
                                    <span className="pointer-events-auto bg-black text-white text-xs font-black px-2 py-1 rounded shadow-md border border-white/10 select-none">
                                      {it.quantity}x
                                    </span>
                                    {it.price && it.price < 15.5 && (
                                      <span className="pointer-events-auto bg-primary text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow border border-primary/30 select-none">
                                        -{Math.round(((15.5 - it.price) / 15.5) * 100)}%
                                      </span>
                                    )}
                                  </div>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    remove(it.id);
                                  }}
                                  className="pointer-events-auto grid h-7 w-7 place-items-center bg-red-600 text-white rounded-md shadow-lg hover:bg-red-500 hover:scale-110 transition-all cursor-pointer"
                                  aria-label="Remove item"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {/* Bottom: Quantity Toggle Buttons */}
                              <div className="flex items-center justify-between w-full">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setQty(it.id, it.quantity - 1);
                                  }}
                                  className="pointer-events-auto grid h-7 w-7 place-items-center bg-black text-white border border-white/20 rounded-md hover:bg-white hover:text-black hover:scale-110 transition-all cursor-pointer"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setQty(it.id, it.quantity + 1);
                                  }}
                                  className="pointer-events-auto grid h-7 w-7 place-items-center bg-black text-white border border-white/20 rounded-md hover:bg-white hover:text-black hover:scale-110 transition-all cursor-pointer"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Directional Navigation Arrow */}
              {items.length > 20 && canScrollRight && (
                <button
                  type="button"
                  onClick={scrollNext}
                  aria-label="Next wall"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-50 transition-all duration-300 bg-black/70 backdrop-blur-md text-white p-3 rounded-full hover:bg-primary cursor-pointer shadow-xl border border-white/10 hover:scale-110"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Footer Indicator if cart > 20 */}
            {items.length > 20 && (
              <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between text-neutral-400 text-xs">
                <span className="font-mono">Showing max 20 stickers per wall slide</span>
                <span className="text-primary font-bold tracking-wide animate-pulse">
                  Swipe / Scroll for more walls →
                </span>
              </div>
            )}
          </div>

          {/* Right Panel: Checkout Column (internally scrollable on small viewports) */}
          <div className="h-full flex flex-col overflow-y-auto hide-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-4 sm:p-6 border-t-[3px] border-t-primary border-l border-r border-b border-primary/20 shadow-2xl bg-[#0a0b14] backdrop-blur-xl rounded-b-2xl">
            {/* Horizontal Flex Container for Thermal Receipt & Vertical Tier Wheel */}
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start shrink-0">
              {/* Black-and-White Thermal Ticket Module (Strictly font-mono throughout) */}
              <div className="flex-1 w-full bg-[#f4f4f5] p-5 text-black font-mono border border-black shadow-[0_0_20px_rgba(0,0,0,0.5)] relative">
                <div className="absolute top-0 left-0 right-0 h-2 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjQiPjxwb2x5Z29uIHBvaW50cz0iMCwwIDQsNCA4LDAiIGZpbGw9IiMwYTBiMTQiLz48L3N2Zz4=')] repeat-x" />

                <div className="text-center mb-4 mt-1">
                  <p className="font-mono text-xs font-black uppercase tracking-widest border-b-2 border-black pb-1.5 inline-block">
                    ORDER SUMMARY
                  </p>
                </div>

                <div className="font-mono flex items-baseline justify-between border-b border-dashed border-black/40 pb-3">
                  <span className="font-mono text-xs font-bold uppercase tracking-widest">
                    TOTAL ITEMS
                  </span>
                  <span className="font-mono text-lg font-black tracking-tighter">{totalQty}</span>
                </div>

                {breakdown.length > 1 && (
                  <div className="font-mono mt-3 animate-in fade-in slide-in-from-top-2">
                    <p className="font-mono text-[10px] font-black uppercase tracking-widest text-black/60 mb-1.5">
                      RECEIPT BREAKDOWN
                    </p>
                    <div className="font-mono flex flex-col gap-1 font-medium tracking-wide text-xs">
                      {breakdown.map((b, i) => (
                        <div key={i} className="font-mono flex justify-between items-center">
                          <span className="font-mono">
                            {b.qty} × {b.price.toFixed(2)} KSh
                          </span>
                          <span className="font-mono font-bold">
                            {(b.qty * b.price).toFixed(2)} KSh
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {discountSavings > 0 && (
                  <div className="font-mono mt-2 pt-2 border-t border-black/10 flex items-baseline justify-between text-emerald-700 font-bold">
                    <span className="font-mono text-[11px] uppercase tracking-wider">
                      DISCOUNT SAVINGS
                    </span>
                    <span className="font-mono text-sm font-black">
                      -{formatPrice(discountSavings)}
                    </span>
                  </div>
                )}

                <div className="font-mono mt-3 pt-3 border-t border-dashed border-black/40 flex items-baseline justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-widest">
                    TOTAL DUE
                  </span>
                  <span className="font-mono text-xl font-black tracking-tighter">
                    {formatPrice(total)}
                  </span>
                </div>

                <div className="font-mono mt-4 text-center text-black/40 text-[10px] tracking-[0.4em] font-bold">
                  -----------------
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-2 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjQiPjxwb2x5Z29uIHBvaW50cz0iMCw0IDQsMCA4LDQiIGZpbGw9IiMwYTBiMTQiLz48L3N2Zz4=')] repeat-x" />
              </div>

              {/* Vertical Tier Wheel Column */}
              <div className="flex flex-col gap-2.5 w-full lg:w-32 shrink-0">
                <p className="font-sans text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-0.5">
                  TIERS
                </p>
                {TIERS.map((t) => {
                  const isActive = t === tier;
                  return (
                    <div
                      key={t.label}
                      className={`h-16 px-3 py-1.5 text-center rounded-xl flex flex-col justify-center transition-all border ${
                        isActive
                          ? "bg-primary text-primary-foreground font-black shadow-[0_0_20px_oklch(0.55_0.26_285/0.7)] border-primary scale-105"
                          : "bg-white/[0.03] text-white/40 border border-white/10 hover:bg-white/[0.08] hover:text-white/70"
                      }`}
                    >
                      <div className="font-sans text-xs font-black uppercase tracking-wider">
                        {t.label}
                      </div>
                      <div className="font-mono mt-0.5 text-[11px] font-bold leading-tight">
                        {formatPrice(t.unitPrice)}
                      </div>
                    </div>
                  );
                })}

                {/* Relocated Average Price Metric */}
                <p className="text-xs font-mono text-green-500 mt-1 text-center tracking-wider">
                  AVG {formatPrice(averageUnit)}
                </p>
              </div>
            </div>

            {/* Lined Notebook Diary Sheet Form (Condensed Inline Layout) */}
            <form
              onSubmit={handleSubmit}
              className="mt-4 relative bg-[#fdfbf7] shadow-2xl border border-black/10 w-full rounded-sm overflow-hidden shrink-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(transparent, transparent 35px, #cbd5e1 35px, #cbd5e1 36px)",
                backgroundSize: "100% 36px",
                backgroundPosition: "0 0px",
              }}
            >
              {/* Red Margin Line */}
              <div className="absolute top-0 bottom-0 left-[40px] w-[1px] bg-red-400/60 z-0" />

              <div className="relative z-10 py-2 sm:py-3">
                <div className="flex flex-row items-center gap-3 sm:gap-4 border-b border-slate-300/80 py-1 px-4 pl-[50px] relative group">
                  <label className="w-24 sm:w-28 shrink-0 text-xs font-bold text-gray-900 uppercase tracking-widest leading-none font-sans">
                    NAME
                  </label>
                  <Input
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    style={{ fontFamily: "'Caveat', 'Dancing Script', 'Handlee', cursive" }}
                    className="flex-1 bg-transparent border-0 rounded-none px-0 py-0.5 h-auto focus-visible:ring-0 shadow-none text-xl sm:text-2xl font-semibold text-blue-900 placeholder:font-sans placeholder:text-gray-400 placeholder:text-sm placeholder:font-normal"
                    placeholder="Full name"
                  />
                </div>

                <div className="flex flex-row items-center gap-3 sm:gap-4 border-b border-slate-300/80 py-1 px-4 pl-[50px] relative group">
                  <label className="w-24 sm:w-28 shrink-0 text-xs font-bold text-gray-900 uppercase tracking-widest leading-none font-sans">
                    PHONE
                  </label>
                  <div className="flex-1 flex items-center">
                    <span
                      style={{ fontFamily: "'Caveat', 'Dancing Script', 'Handlee', cursive" }}
                      className="text-xl sm:text-2xl font-semibold text-blue-900 mr-1 select-none leading-none"
                    >
                      0
                    </span>
                    <Input
                      value={form.customer_phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 9);
                        setForm({ ...form, customer_phone: val });
                      }}
                      style={{ fontFamily: "'Caveat', 'Dancing Script', 'Handlee', cursive" }}
                      className="flex-1 bg-transparent border-0 rounded-none px-0 py-0.5 h-auto focus-visible:ring-0 shadow-none text-xl sm:text-2xl font-semibold text-blue-900 placeholder:font-sans placeholder:text-gray-400 placeholder:text-sm placeholder:font-normal"
                      placeholder="712345678"
                      inputMode="numeric"
                      maxLength={9}
                    />
                  </div>
                </div>

                <div className="flex flex-row items-center gap-3 sm:gap-4 border-b border-slate-300/80 py-1 px-4 pl-[50px] relative group">
                  <label className="w-24 sm:w-28 shrink-0 text-xs font-bold text-gray-900 uppercase tracking-widest leading-none font-sans">
                    LOCATION
                  </label>
                  <Input
                    value={form.delivery_place}
                    onChange={(e) => setForm({ ...form, delivery_place: e.target.value })}
                    style={{ fontFamily: "'Caveat', 'Dancing Script', 'Handlee', cursive" }}
                    className="flex-1 bg-transparent border-0 rounded-none px-0 py-0.5 h-auto focus-visible:ring-0 shadow-none text-xl sm:text-2xl font-semibold text-blue-900 placeholder:font-sans placeholder:text-gray-400 placeholder:text-sm placeholder:font-normal"
                    placeholder="Area / Neighborhood"
                  />
                </div>

                <div className="mt-3 px-4 pl-[50px]">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#0a0b14] py-3 text-lg font-black uppercase tracking-[0.15em] text-white transition-all hover:scale-[1.01] hover:shadow-xl hover:shadow-blue-900/20 disabled:opacity-60 rounded-none border border-black/20 relative z-20 cursor-pointer"
                    style={{ fontFamily: "'Archivo Black', system-ui, sans-serif" }}
                  >
                    {submitting ? "PROCESSING..." : "CONFIRM ORDER"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
