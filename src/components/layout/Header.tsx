import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/store/cart";

const NAV: { to: string; label: string }[] = [];

export default function Header() {
  const [open, setOpen] = useState(false);
  const count = useCart((s) => Object.keys(s.items).length);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header
      className="sticky top-0 z-40 border-b border-border/50 backdrop-blur-xl"
      style={{ background: "oklch(0.135 0.025 265 / 0.7)" }}
    >
      <div className="mx-auto flex py-4 max-w-[1600px] items-center justify-between px-4 sm:px-8">
        {/* Mobile menu placeholder/button */}
        <div className="md:hidden w-10 flex items-center">
          {location.pathname !== "/" && (
            <button
              className="rounded-md p-2 -ml-2 text-foreground"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Logo */}
        <Link
          to="/"
          onClick={() => {
            setOpen(false);
            window.dispatchEvent(new CustomEvent("reset-home"));
          }}
          className="realz-logo text-5xl sm:text-6xl md:text-7xl leading-[0.85] tracking-tight text-white drop-shadow-[0_0_15px_oklch(0.705_0.20_47/0.5)]"
        >
          Rea<span className="lz text-primary">lz</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `text-micro-sm transition ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        {/* Selections */}
        <button
          onClick={() => navigate("/selections")}
          className="relative grid h-9 w-9 place-items-center rounded-full glass-card transition hover:border-primary/50"
          aria-label="Selections"
        >
          <ShoppingBag className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-primary text-[9px] font-black text-primary-foreground shadow-[0_0_12px_oklch(0.705_0.20_47/0.8)]">
              {count}
            </span>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-white p-6 text-black shadow-2xl">
            <div className="flex items-center justify-between">
              <Link
                to="/"
                onClick={() => setOpen(false)}
                className="realz-logo text-3xl text-black"
              >
                Rea<span className="lz">lz</span>
              </Link>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="mt-10 flex flex-col gap-6">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `text-2xl font-black uppercase tracking-tight transition active:text-primary ${
                      isActive ? "text-primary" : "text-black"
                    }`
                  }
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
