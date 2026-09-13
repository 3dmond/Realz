import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  Sparkles,
  Tags,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  BarChart3,
  Image as ImageIcon,
} from "lucide-react";
import { useAdminAuth } from "@/lib/admin-auth";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { fetchBinCount } from "@/lib/admin-api";

const NAV_ITEMS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag, end: false },
  { to: "/admin/products", label: "Stickers", icon: Sparkles, end: false },
  { to: "/admin/media", label: "Media Library", icon: ImageIcon, end: false },
  { to: "/admin/categories", label: "Categories", icon: Tags, end: false },
  { to: "/admin/analytics", label: "Analytics & BI", icon: BarChart3, end: false },
  { to: "/admin/activity", label: "Audit Trail", icon: ScrollText, end: false },
  { to: "/admin/settings", label: "Settings", icon: Settings, end: false },
];

export default function AdminLayout() {
  const { user, role, signOut } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { data: binCount = 0 } = useQuery({
    queryKey: ["admin-bin-count"],
    queryFn: fetchBinCount,
    refetchInterval: 30000,
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-white/[0.08] bg-[#0c0d18] shrink-0 sticky top-0 h-screen">
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-white/[0.08]">
          <Link to="/" className="flex items-center gap-2">
            <span className="realz-logo text-2xl tracking-tight text-white">
              Rea<span className="lz text-primary font-black">lz</span>
            </span>
            <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-black tracking-widest text-primary uppercase border border-primary/30">
              ADMIN
            </span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isStickers = item.to === "/admin/products";
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-[0_0_15px_oklch(0.58_0.25_285/0.4)]"
                      : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {isStickers && binCount > 0 && (
                  <span
                    className="flex items-center gap-1 rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-black text-rose-400 border border-rose-500/30 ml-auto"
                    title={`${binCount} sticker${binCount === 1 ? "" : "s"} in Recycle Bin`}
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                    </span>
                    <span>{binCount}</span>
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer info & Logout */}
        <div className="border-t border-white/[0.08] p-4 bg-[#0a0b14]">
          <div className="mb-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-foreground">{user?.email}</p>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-primary" />
                <span className="capitalize">{role || "Administrator"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              target="_blank"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] py-2 text-[11px] font-bold text-muted-foreground hover:bg-white/[0.08] hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Storefront</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-[#0c0d18] border-r border-white/[0.08]">
            <div className="flex h-16 items-center justify-between px-6 border-b border-white/[0.08]">
              <span className="realz-logo text-2xl tracking-tight text-white">
                Rea<span className="lz text-primary font-black">lz</span>
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isStickers = item.to === "/admin/products";
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground font-black"
                          : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {isStickers && binCount > 0 && (
                      <span
                        className="flex items-center gap-1 rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-black text-rose-400 border border-rose-500/30 ml-auto"
                        title={`${binCount} sticker${binCount === 1 ? "" : "s"} in Recycle Bin`}
                      >
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                        </span>
                        <span>{binCount}</span>
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
            <div className="border-t border-white/[0.08] p-4 bg-[#0a0b14]">
              <div className="mb-3">
                <p className="truncate text-xs font-bold text-foreground">{user?.email}</p>
                <p className="text-[10px] text-muted-foreground capitalize">
                  {role || "Administrator"}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-rose-500/10 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header Bar */}
        <header className="flex lg:hidden h-14 items-center justify-between border-b border-white/[0.08] bg-[#0c0d18] px-4 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.1] text-muted-foreground hover:text-white"
              aria-label="Open Navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="realz-logo text-xl">
              Rea<span className="lz text-primary">lz</span>
            </span>
          </div>
          <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
            ADMIN
          </span>
        </header>

        {/* Body Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
