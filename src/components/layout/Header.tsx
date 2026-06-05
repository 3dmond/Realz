import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/store/cart";
import { useQuery } from "@tanstack/react-query";
import { fetchCategories } from "@/lib/queries";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV: { to: string; label: string }[] = [];

export default function Header() {
  const [open, setOpen] = useState(false);
  const count = useCart((s) => Object.keys(s.items).length);
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  const { data: cats } = useQuery({ 
    queryKey: ["categories"], 
    queryFn: fetchCategories 
  });

  const handleCategoryClick = (catId: number) => {
    navigate(`/?category=${catId}`);
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header
      className="sticky top-0 z-40 border-b border-border/50 backdrop-blur-xl"
      style={{ background: "oklch(0.135 0.025 265 / 0.7)" }}
    >
      <div className="mx-auto flex py-4 max-w-[1600px] items-center justify-between px-4 sm:px-8">
        {/* Mobile menu - Contextual Visibility */}
        <div className="md:hidden w-10 flex items-center">
          {!isHomePage && (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button
                  className="rounded-md p-2 -ml-2 text-foreground cursor-pointer transition-colors hover:text-primary"
                  aria-label="Open menu"
                >
                  <Menu className="h-6 w-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] border-r border-border/50 bg-background/95 backdrop-blur-xl p-0">
                <SheetHeader className="p-6 border-b border-border/50">
                  <SheetTitle className="text-left">
                    <SheetClose asChild>
                      <Link
                        to="/"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent("reset-home"));
                          setOpen(false);
                        }}
                        className="relative z-50 pointer-events-auto realz-logo text-4xl leading-tight text-white"
                      >
                        Rea<span className="lz text-primary">lz</span>
                      </Link>
                    </SheetClose>
                  </SheetTitle>
                </SheetHeader>
                
                <div className="flex flex-col h-full">
                  <nav className="flex flex-col gap-1 p-4">
                    <p className="text-micro text-muted-foreground px-4 mb-2">COLLECTIONS</p>
                    <SheetClose asChild>
                      <button
                        onClick={() => {
                          navigate("/");
                          window.dispatchEvent(new CustomEvent("reset-home"));
                          setOpen(false);
                        }}
                        className={`relative z-50 pointer-events-auto flex items-center px-4 py-3 rounded-xl text-lg font-black uppercase tracking-tight transition-colors ${
                          location.pathname === "/" ? "text-primary bg-primary/10" : "text-foreground hover:bg-accent/50"
                        }`}
                      >
                        All Stickers
                      </button>
                    </SheetClose>
                    
                    {cats?.map((cat) => (
                      <SheetClose key={cat.id} asChild>
                        <button
                          onClick={() => handleCategoryClick(cat.id)}
                          className="relative z-50 pointer-events-auto flex items-center px-4 py-3 rounded-xl text-lg font-black uppercase tracking-tight text-foreground transition-colors hover:bg-accent/50 text-left"
                        >
                          {cat.name}
                        </button>
                      </SheetClose>
                    ))}
                  </nav>

                  <nav className="mt-auto border-t border-border/50 p-4 mb-10">
                    {NAV.map((n) => (
                      <SheetClose key={n.to} asChild>
                        <NavLink
                          to={n.to}
                          onClick={() => setOpen(false)}
                          className={({ isActive }) =>
                            `relative z-50 pointer-events-auto flex items-center px-4 py-3 text-lg font-black uppercase tracking-tight transition-colors ${
                              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            }`
                          }
                        >
                          {n.label}
                        </NavLink>
                      </SheetClose>
                    ))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>

        {/* Logo */}
        <Link
          to="/"
          onClick={() => {
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
          className="relative grid h-14 w-14 place-items-center rounded-full glass-card transition hover:border-primary/50"
          aria-label="Selections"
        >
          <ShoppingBag className="h-8 w-8" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-primary text-[11px] font-black text-primary-foreground shadow-[0_0_15px_oklch(0.705_0.20_47/0.8)]">
              {count}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

