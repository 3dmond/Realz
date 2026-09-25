import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/store/cart";

export default function Header() {
  const count = useCart((s) => Object.keys(s.items).length);
  const navigate = useNavigate();

  return (
    <header
      className="sticky top-0 z-40 border-b border-white/[0.08] backdrop-blur-xl transition-all"
      style={{ background: "oklch(0.14 0.055 278 / 0.85)" }}
    >
      <div className="relative mx-auto flex py-3 md:py-4 max-w-[1600px] items-center justify-between px-4 sm:px-8">
        {/* Left spacer to balance layout */}
        <div className="w-12 h-12 md:w-14 md:h-14 shrink-0 pointer-events-none" aria-hidden="true" />

        {/* Brand Logo Centered */}
        <Link
          to="/"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("reset-home"));
          }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center shrink-0 z-10 select-none group text-center"
        >
          <div className="realz-logo text-3xl sm:text-4xl md:text-5xl leading-none tracking-tight text-foreground drop-shadow-[0_2px_12px_rgba(139,92,246,0.3)]">
            Rea<span className="lz text-primary">lz</span>
          </div>
          <span className="mt-1 text-[9px] sm:text-[10px] md:text-[11px] font-bold tracking-[0.22em] uppercase text-foreground/75 font-sans">
            Shop Cool Stickers
          </span>
        </Link>

        {/* Selections Cart Button */}
        <button
          onClick={() => navigate("/selections")}
          className="relative grid h-12 w-12 md:h-14 md:w-14 place-items-center rounded-full bg-white/[0.05] backdrop-blur-md border border-white/[0.12] transition-all hover:bg-white/[0.1] hover:border-primary/60 hover:shadow-[0_0_20px_rgba(139,92,246,0.35)] shrink-0 cursor-pointer"
          aria-label="Selections"
        >
          <ShoppingBag className="h-6 w-6 md:h-7 md:w-7 text-foreground/90" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 w-5 md:h-6 md:w-6 place-items-center rounded-full bg-primary text-[10px] md:text-[11px] font-black text-white shadow-[0_0_15px_rgba(139,92,246,0.6)] animate-pulse">
              {count}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
