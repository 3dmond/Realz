import { useState } from "react";
import { useAdminAuth } from "@/lib/admin-auth";
import { TIERS, formatPrice } from "@/lib/pricing";
import {
  ShieldCheck,
  Database,
  CheckCircle2,
  Copy,
  Check,
  Coins,
  Terminal,
  Activity,
  Server,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

const BENCHMARK_COGS = 6.0;

function CopyAction({
  text,
  itemKey,
  label,
  activeKey,
  onCopy,
  showLabel = false,
}: {
  text: string;
  itemKey: string;
  label: string;
  activeKey: string | null;
  onCopy: (text: string, key: string, label: string) => void;
  showLabel?: boolean;
}) {
  const isCopied = activeKey === itemKey;
  return (
    <button
      type="button"
      onClick={() => onCopy(text, itemKey, label)}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-white/[0.04] hover:bg-white/[0.08] text-muted-foreground hover:text-foreground border border-white/[0.06] transition-colors cursor-pointer shrink-0"
      title={`Copy ${label}`}
    >
      {isCopied ? (
        <>
          <Check className="w-3 h-3 text-emerald-400" />
          <span className="text-emerald-400 font-mono text-[10px]">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          {showLabel && <span>Copy</span>}
        </>
      )}
    </button>
  );
}

export default function AdminSettings() {
  const { user, role } = useAdminAuth();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL || "https://lmwlxnjcoupqzuewpmbk.supabase.co";
  const projectId =
    import.meta.env.VITE_SUPABASE_PROJECT_ID || "lmwlxnjcoupqzuewpmbk";
  const storageBucket = "stickers";

  const handleCopy = async (text: string, key: string, label: string) => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      toast.error(`Could not copy ${label}`);
    }
  };

  const sqlProvisionScript = `INSERT INTO public.user_roles (user_id, role)
VALUES ('${user?.id || "<USER_UUID>"}', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;`;

  return (
    <div className="space-y-6 max-w-[1300px] mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" />
          <span>Settings &amp; Infrastructure</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Operational reference, active commercial pricing rules, and cloud infrastructure diagnostics.
        </p>
      </div>

      {/* 2-Column Diagnostics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Operator Session Panel */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Operator Session</h3>
                <p className="text-[11px] text-muted-foreground">Authenticated runtime identity</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active</span>
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Authenticated Email
                </span>
                {user?.email && (
                  <CopyAction
                    text={user.email}
                    itemKey="user-email"
                    label="Email address"
                    activeKey={copiedKey}
                    onCopy={handleCopy}
                  />
                )}
              </div>
              <p className="font-mono text-xs text-foreground mt-1 select-all">
                {user?.email || "—"}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Authorization Role
              </span>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.06] border border-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <span>{role === "admin" ? "Administrator" : role || "Authenticated User"}</span>
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Enforced via Row-Level Security (RLS)
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Internal Auth UUID
                </span>
                {user?.id && (
                  <CopyAction
                    text={user.id}
                    itemKey="user-id"
                    label="User UUID"
                    activeKey={copiedKey}
                    onCopy={handleCopy}
                  />
                )}
              </div>
              <p className="font-mono text-[11px] text-muted-foreground mt-1 truncate select-all bg-white/[0.02] p-1.5 rounded border border-white/[0.04]">
                {user?.id || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Cloud Infrastructure Panel */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Cloud Infrastructure</h3>
                <p className="text-[11px] text-muted-foreground">PostgreSQL &amp; Storage proxy</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono text-muted-foreground bg-white/[0.03] border border-white/[0.06]">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>Connected</span>
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Project Reference
                </span>
                <CopyAction
                  text={projectId}
                  itemKey="project-id"
                  label="Project reference"
                  activeKey={copiedKey}
                  onCopy={handleCopy}
                />
              </div>
              <p className="font-mono text-xs text-foreground mt-1 select-all">
                {projectId}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  API Endpoint URL
                </span>
                <CopyAction
                  text={supabaseUrl}
                  itemKey="supabase-url"
                  label="API endpoint URL"
                  activeKey={copiedKey}
                  onCopy={handleCopy}
                />
              </div>
              <p className="font-mono text-[11px] text-muted-foreground mt-1 truncate select-all bg-white/[0.02] p-1.5 rounded border border-white/[0.04]">
                {supabaseUrl}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Storage Bucket Identity
                </span>
                <CopyAction
                  text={storageBucket}
                  itemKey="storage-bucket"
                  label="Bucket name"
                  activeKey={copiedKey}
                  onCopy={handleCopy}
                />
              </div>
              <div className="mt-1 flex items-center justify-between">
                <p className="font-mono text-[11px] text-foreground">
                  {storageBucket}
                </p>
                <span className="text-[10px] text-muted-foreground">
                  Public CDN Read · Admin RLS Write
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Commercial Engine: Tiered Pricing Rules */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Coins className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Tiered Pricing Rules
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Deterministic progressive stepwise parameters enforced across customer cart and studio orders
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="rounded-md bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
              Currency: KSh
            </span>
            <span className="rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-mono text-amber-400 font-medium">
              Benchmark COGS: {formatPrice(BENCHMARK_COGS)}
            </span>
          </div>
        </div>

        {/* 3 Tier Merchandising Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {TIERS.map((tier) => {
            const grossMarginSpread = tier.unitPrice - BENCHMARK_COGS;
            const marginPct = ((grossMarginSpread / tier.unitPrice) * 100).toFixed(1);

            return (
              <div
                key={tier.label}
                className="rounded-lg border border-white/[0.06] bg-black/20 p-4 relative overflow-hidden group hover:border-white/[0.12] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tier {tier.label}
                  </span>
                  <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                    +{marginPct}% margin
                  </span>
                </div>

                <div className="mt-2.5">
                  <h4 className="text-2xl font-bold text-foreground font-mono tabular-nums">
                    {formatPrice(tier.unitPrice)}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {tier.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span>Unit Spread:</span>
                  <span className="text-foreground">+{formatPrice(grossMarginSpread)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Operational Note */}
        <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 text-xs text-muted-foreground flex items-start gap-2.5">
          <Layers className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            Tier thresholds are progressive and stepwise: units 1–20 price at 15.50 KSh, units 21–45 at 13.49 KSh, and wholesale units 46+ at 10.99 KSh. All margin figures display gross return over the standard 6.00 KSh vinyl manufacturing baseline.
          </p>
        </div>
      </div>

      {/* Admin Role Provisioning Utility */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0e0f1b] p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Terminal className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Admin Role Provisioning
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Run this SQL in the Supabase SQL editor to grant the <code className="text-foreground font-mono font-bold">admin</code> role to the specified user.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCopy(sqlProvisionScript, "sql-script", "SQL grant script")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-foreground border border-white/[0.1] transition-colors cursor-pointer shrink-0"
          >
            {copiedKey === "sql-script" ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">SQL Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy SQL Query</span>
              </>
            )}
          </button>
        </div>

        <div className="relative rounded-lg bg-black/40 p-4 font-mono text-xs text-foreground/80 border border-white/[0.06] overflow-x-auto">
          <pre className="text-xs leading-relaxed text-zinc-300">
            <code>{sqlProvisionScript}</code>
          </pre>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {user?.id ? (
              <span className="text-emerald-400/90 font-mono">
                Prefilled with active operator UUID ({user.id.slice(0, 8)}…)
              </span>
            ) : (
              <span className="text-amber-400/90 font-mono">
                Using placeholder &lt;USER_UUID&gt; (Sign in to auto-populate)
              </span>
            )}
          </span>
          <span className="font-mono text-[10px]">
            Target: public.user_roles
          </span>
        </div>
      </div>
    </div>
  );
}
