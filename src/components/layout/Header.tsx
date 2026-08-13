import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/store/cart";
import { useQuery } from "@tanstack/react-query";
import { fetchCategories } from "@/lib/queries";
import { formatCategoryTitle } from "@/lib/utils";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const count = useCart((s) => Object.keys(s.items).length);
  const navigate = useNavigate();
  const location = useLocation();

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
      className="sticky top-0 z-40 border-b border-border/50 backdrop-blur-xl transition-all"
      style={{ background: "oklch(0.135 0.025 265 / 0.85)" }}
    >
      <div className="mx-auto flex py-3 md:py-4 max-w-[1600px] items-center justify-between px-4 sm:px-8 gap-4">
        {/* 1. Mobile Burger Menu Trigger */}
        <div className="md:hidden w-10 flex items-center">
          <button
            onClick={() => setOpen(true)}
            className="relative z-50 pointer-events-auto rounded-md p-2 -ml-2 text-foreground cursor-pointer transition-colors hover:text-primary"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Brand Logo */}
        <Link
          to="/"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("reset-home"));
          }}
          className="realz-logo text-4xl sm:text-5xl md:text-6xl leading-[0.85] tracking-tight text-white drop-shadow-[0_0_15px_oklch(0.705_0.20_47/0.5)] shrink-0"
        >
          Rea<span className="lz text-primary">lz</span>
        </Link>

        {/* Search Bar UI (Visual catalog search indicator) */}
        <div className="hidden sm:flex items-center flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sticker packs (anime, tech, streetwear)..."
              className="w-full bg-card/60 border border-white/10 rounded-full py-2 pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/60 transition-all"
            />
          </div>
        </div>

        {/* Desktop Quick Category Links */}
        <nav className="hidden items-center gap-6 lg:flex">
          <button
            onClick={() => {
              navigate("/");
              window.dispatchEvent(new CustomEvent("reset-home"));
            }}
            className={`text-micro-sm transition-colors ${
              location.pathname === "/" && !location.search ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ALL STICKERS
          </button>
          <button
            onClick={() => {
              const el = document.getElementById("trending-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
              else navigate("/");
            }}
            className="text-micro-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            TRENDING
          </button>
          <button
            onClick={() => {
              const el = document.getElementById("vibe-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
              else navigate("/");
            }}
            className="text-micro-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            SHOP BY VIBE
          </button>
        </nav>

        {/* Selections Cart Button */}
        <button
          onClick={() => navigate("/selections")}
          className="relative grid h-12 w-12 md:h-14 md:w-14 place-items-center rounded-full glass-card transition-all hover:border-primary/60 hover:shadow-[0_0_15px_rgba(249,115,22,0.3)] shrink-0"
          aria-label="Selections"
        >
          <ShoppingBag className="h-6 w-6 md:h-7 md:w-7 text-foreground" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 w-5 md:h-6 md:w-6 place-items-center rounded-full bg-primary text-[10px] md:text-[11px] font-black text-primary-foreground shadow-[0_0_15px_oklch(0.705_0.20_47/0.8)] animate-pulse">
              {count}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Search Bar Row */}
      <div className="sm:hidden px-4 pb-3">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sticker packs..."
            className="w-full bg-card/60 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-all"
          />
        </div>
      </div>

      {/* Mobile Sidebar Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
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
          
          <div className="flex flex-col h-full overflow-y-auto">
            <nav className="flex flex-col gap-1 p-4">
              <p className="text-micro text-muted-foreground px-4 mb-2">STICKER COLLECTIONS</p>
              <SheetClose asChild>
                <button
                  onClick={() => {
                    navigate("/");
                    window.dispatchEvent(new CustomEvent("reset-home"));
                    setOpen(false);
                  }}
                  className={`relative z-50 pointer-events-auto flex items-center px-4 py-3 rounded-xl text-base font-black uppercase tracking-tight transition-colors ${
                    location.pathname === "/" && location.search === "" ? "text-primary bg-primary/10" : "text-foreground hover:bg-accent/50"
                  }`}
                >
                  All Stickers
                </button>
              </SheetClose>
              
              {cats?.map((cat) => (
                <SheetClose key={cat.id} asChild>
                  <button
                    onClick={() => handleCategoryClick(cat.id)}
                    className="relative z-50 pointer-events-auto flex items-center px-4 py-3 rounded-xl text-base font-black uppercase tracking-tight text-foreground transition-colors hover:bg-accent/50 text-left"
                  >
                    {formatCategoryTitle(cat.name)}
                  </button>
                </SheetClose>
              ))}
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
