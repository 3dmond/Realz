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
      <div className="mx-auto flex py-3 md:py-4 max-w-[1600px] items-center justify-between px-4 sm:px-8">
        {/* Brand Logo */}
        <Link
          to="/"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("reset-home"));
          }}
          className="realz-logo text-4xl sm:text-5xl md:text-6xl leading-[0.85] tracking-tight text-white drop-shadow-[0_2px_12px_rgba(139,92,246,0.3)] shrink-0"
        >
          Rea<span className="lz text-primary">lz</span>
        </Link>

        {/* Selections Cart Button */}
        <button
          onClick={() => navigate("/selections")}
          className="relative grid h-12 w-12 md:h-14 md:w-14 place-items-center rounded-full bg-white/[0.05] backdrop-blur-md border border-white/[0.12] transition-all hover:bg-white/[0.1] hover:border-primary/60 hover:shadow-[0_0_20px_rgba(139,92,246,0.35)] shrink-0 cursor-pointer"
          aria-label="Selections"
        >
          <ShoppingBag className="h-6 w-6 md:h-7 md:w-7 text-white/90" />
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
