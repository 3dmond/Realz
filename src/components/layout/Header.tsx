import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/store/cart";

export default function Header() {
  const count = useCart((s) => Object.keys(s.items).length);
  const navigate = useNavigate();

  return (
    <header
      className="sticky top-0 z-40 border-b border-purple-200/50 backdrop-blur-xl transition-all"
      style={{ background: "oklch(0.975 0.02 285 / 0.88)" }}
    >
      <div className="mx-auto flex py-3 md:py-4 max-w-[1600px] items-center justify-between px-4 sm:px-8">
        {/* Brand Logo */}
        <Link
          to="/"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("reset-home"));
          }}
          className="realz-logo text-4xl sm:text-5xl md:text-6xl leading-[0.85] tracking-tight text-foreground drop-shadow-[0_2px_10px_rgba(126,34,206,0.15)] shrink-0"
        >
          Rea<span className="lz text-primary">lz</span>
        </Link>

        {/* Selections Cart Button */}
        <button
          onClick={() => navigate("/selections")}
          className="relative grid h-12 w-12 md:h-14 md:w-14 place-items-center rounded-full glass-card border border-purple-200/80 transition-all hover:border-primary/60 hover:shadow-[0_0_15px_rgba(126,34,206,0.3)] shrink-0 cursor-pointer"
          aria-label="Selections"
        >
          <ShoppingBag className="h-6 w-6 md:h-7 md:w-7 text-foreground" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 w-5 md:h-6 md:w-6 place-items-center rounded-full bg-primary text-[10px] md:text-[11px] font-black text-primary-foreground shadow-[0_0_15px_rgba(126,34,206,0.5)] animate-pulse">
              {count}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
