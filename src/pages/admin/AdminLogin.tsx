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
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#0a0b14] px-4 py-12 font-sans selection:bg-primary selection:text-white">
      {/* Ambient background decoration */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 z-0"
        style={{
          backgroundImage: `radial-gradient(ellipse 60% 50% at 50% 0%, oklch(0.58 0.25 285 / 0.18), transparent 100%)`,
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Banner */}
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block">
            <h1 className="realz-logo text-5xl tracking-tight text-white drop-shadow-[0_2px_16px_rgba(139,92,246,0.3)]">
              Rea<span className="lz text-primary">lz</span>
            </h1>
          </Link>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
            <ShieldCheck className="h-3 w-3" />
            <span>OPERATIONAL MANAGEMENT</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground font-medium">
            Authorized administrative access only
          </p>
        </div>

        {/* Login Panel */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d]/90 p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMsg && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 font-medium">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Admin Email
              </label>
              <div className="relative mt-1">
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@realz.co.ke"
                  className="h-12 bg-white/[0.04] border-white/[0.1] pl-10 text-foreground placeholder:text-muted-foreground/50 rounded-xl focus-visible:ring-primary"
                  autoComplete="email"
                />
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Password
              </label>
              <div className="relative mt-1">
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="h-12 bg-white/[0.04] border-white/[0.1] pl-10 text-foreground placeholder:text-muted-foreground/50 rounded-xl focus-visible:ring-primary"
                  autoComplete="current-password"
                />
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_20px_oklch(0.58_0.25_285/0.4)] transition-all hover:scale-[1.01] hover:shadow-[0_0_30px_oklch(0.58_0.25_285/0.7)] disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <span>Authenticate Session</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Instant 1-Click Access Option */}
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={handleInstantEnter}
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-black uppercase tracking-wider transition hover:bg-emerald-500/20 cursor-pointer"
            >
              <Zap className="h-4 w-4" />
              <span>Instant Access (No Login Required)</span>
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Return to Realz Storefront
            </Link>
          </div>
        </div>

        {/* Security Note */}
        <p className="mt-6 text-center text-[11px] text-muted-foreground/60">
          All administrative sessions and actions are logged for security and compliance.
        </p>
      </div>
    </div>
  );
}
