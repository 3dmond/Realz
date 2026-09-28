import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  Layers,
  Package,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  BarChart3,
  Trash2,
} from "lucide-react";
import { useAdminAuth } from "@/lib/admin-auth";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { fetchBinCount } from "@/lib/admin-api";

const NAV_ITEMS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag, end: false },
  { to: "/admin/products", label: "Stickers", icon: Layers, end: false },
  { to: "/admin/packs", label: "Sticker Packs", icon: Package, end: false },
  { to: "/admin/analytics", label: "Analytics & BI", icon: BarChart3, end: false },
  { to: "/admin/bin", label: "Bin", icon: Trash2, end: false },
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
    <div className="flex min-h-screen bg-background text-foreground antialiased">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 flex-col border-r border-white/[0.06] bg-[#090a13] shrink-0 sticky top-0 h-screen select-none">
        {/* Brand Header */}
        <div className="flex h-14 items-center justify-between px-5 border-b border-white/[0.06]">
          <Link
            to="/admin"
            onClick={(e) => {
              e.preventDefault();
              navigate("/admin");
            }}
            className="flex items-center gap-2 cursor-pointer group focus:outline-none"
            title="Realz Admin"
          >
            <span className="realz-logo text-xl tracking-tight text-white group-hover:opacity-90 transition-opacity">
              Rea<span className="lz text-primary font-bold">lz</span>
            </span>
            <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-muted-foreground uppercase border border-white/[0.08]">
              Admin
            </span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isBin = item.to === "/admin/bin";
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                    isActive
                      ? isBin
                        ? "bg-rose-500/10 text-rose-300 font-semibold border-l-2 border-rose-500 rounded-l-none"
                        : "bg-primary/10 text-white font-semibold border-l-2 border-primary rounded-l-none"
                      : isBin && binCount > 0
                      ? "text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                  )
                }
              >
                <Icon className={cn("h-4 w-4 shrink-0", isBin && binCount > 0 && "text-rose-400")} />
                <span className="flex-1">{item.label}</span>
                {isBin && binCount > 0 && (
                  <span
                    className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-rose-400 border border-rose-500/20 ml-auto"
                    title={`${binCount} sticker${binCount === 1 ? "" : "s"} in Recycle Bin`}
                  >
                    {binCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer info & Logout */}
        <div className="border-t border-white/[0.06] p-3.5 bg-[#080911]">
          <div className="mb-3 flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="truncate text-xs font-semibold text-foreground/90">{user?.email}</p>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                <span className="capitalize">{role || "Administrator"}</span>
              </div>
            </div>
            <Link
              to="/admin/settings"
              title="Store Settings"
              className="p-1.5 rounded-md border border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors shrink-0"
            >
              <Settings className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              target="_blank"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.02] py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-white/[0.06] hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Storefront</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center rounded-md border border-rose-500/20 bg-rose-500/10 p-1.5 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
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
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-[#090a13] border-r border-white/[0.08]">
            <div className="flex h-14 items-center justify-between px-5 border-b border-white/[0.08]">
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2"
              >
                <span className="realz-logo text-xl tracking-tight text-white">
                  Rea<span className="lz text-primary font-bold">lz</span>
                </span>
                <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-muted-foreground uppercase border border-white/[0.08]">
                  Admin
                </span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isBin = item.to === "/admin/bin";
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                        isActive
                          ? isBin
                            ? "bg-rose-500/10 text-rose-300 font-semibold border-l-2 border-rose-500 rounded-l-none"
                            : "bg-primary/10 text-white font-semibold border-l-2 border-primary rounded-l-none"
                          : isBin && binCount > 0
                          ? "text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                          : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                      )
                    }
                  >
                    <Icon className={cn("h-4 w-4", isBin && binCount > 0 && "text-rose-400")} />
                    <span className="flex-1">{item.label}</span>
                    {isBin && binCount > 0 && (
                      <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-rose-400 border border-rose-500/20 ml-auto">
                        {binCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
            <div className="border-t border-white/[0.08] p-3.5 bg-[#080911]">
              <div className="mb-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{user?.email}</p>
                  <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                    {role || "Administrator"}
                  </p>
                </div>
                <Link
                  to="/admin/settings"
                  onClick={() => setMobileOpen(false)}
                  title="Store Settings"
                  className="p-1.5 rounded-md border border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors shrink-0 ml-2"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Link>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-rose-500/10 border border-rose-500/20 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0c0d18]">
        {/* Mobile Header Bar */}
        <header className="flex lg:hidden h-14 items-center justify-between border-b border-white/[0.06] bg-[#090a13] px-4 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="grid h-8 w-8 place-items-center rounded-md border border-white/[0.08] text-muted-foreground hover:text-white"
              aria-label="Open Navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <Link to="/admin" className="flex items-center gap-2">
              <span className="realz-logo text-lg tracking-tight text-white">
                Rea<span className="lz text-primary font-bold">lz</span>
              </span>
              <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground border border-white/[0.08]">
                Admin
              </span>
            </Link>
          </div>
        </header>

        {/* Body Outlet */}
        <main className="flex-1 p-5 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
