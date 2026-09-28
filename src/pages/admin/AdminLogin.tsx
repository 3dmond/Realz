import { useState } from "react";
import { useNavigate, useLocation, Link, Navigate } from "react-router-dom";
import { Lock, Mail, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { useAdminAuth } from "@/lib/admin-auth";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function AdminLogin() {
  const { signIn, user } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/admin";

  // If already authenticated, redirect directly without render errors
  if (user) {
    return <Navigate to={from} replace />;
  }

  const handleInstantEnter = async () => {
    setLoading(true);
    await signIn(); // default dev instant login
    setLoading(false);
    toast.success("Welcome to Realz Operations Dashboard");
    navigate(from, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please enter email and password, or click Quick Access below");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      setErrorMsg(error);
      toast.error(error);
    } else {
      toast.success("Welcome back to Realz Operations");
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#070810] px-4 py-12 font-sans selection:bg-primary selection:text-white">
      {/* Ambient background decoration */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30 z-0"
        style={{
          backgroundImage: `radial-gradient(ellipse 50% 40% at 50% 0%, oklch(0.58 0.25 285 / 0.12), transparent 100%)`,
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Brand Banner */}
        <div className="mb-6 text-center">
          <Link to="/" className="inline-block">
            <h1 className="realz-logo text-4xl tracking-tight text-white drop-shadow-[0_2px_12px_rgba(139,92,246,0.25)]">
              Rea<span className="lz text-primary">lz</span>
            </h1>
          </Link>
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-mono uppercase text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-primary" />
            <span>OPERATIONS CONSOLE</span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Authorized administrative access only
          </p>
        </div>

        {/* Login Panel */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0e0f1b] p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="rounded-md border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs text-rose-300 font-medium">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Admin Email
              </label>
              <div className="relative">
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@realz.co.ke"
                  className="h-9 bg-white/[0.03] border-white/[0.08] pl-8 text-xs text-foreground placeholder:text-muted-foreground/40 rounded-md focus-visible:ring-primary/50"
                  autoComplete="email"
                />
                <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="h-9 bg-white/[0.03] border-white/[0.08] pl-8 text-xs text-foreground placeholder:text-muted-foreground/40 rounded-md focus-visible:ring-primary/50"
                  autoComplete="current-password"
                />
                <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full h-9 flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Instant 1-Click Access Option */}
          <div className="mt-4 pt-3.5 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={handleInstantEnter}
              disabled={loading}
              className="w-full h-9 flex items-center justify-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-medium transition hover:bg-emerald-500/15 cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Instant Access (No Login Required)</span>
            </button>
          </div>

          <div className="mt-4 text-center">
            <Link
              to="/"
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Return to Storefront
            </Link>
          </div>
        </div>

        {/* Security Note */}
        <p className="mt-4 text-center text-[11px] text-muted-foreground/50">
          All administrative sessions and actions are logged in the audit ledger.
        </p>
      </div>
    </div>
  );
}
