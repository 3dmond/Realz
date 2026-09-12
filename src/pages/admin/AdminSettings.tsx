import { useAdminAuth } from "@/lib/admin-auth";
import { TIERS } from "@/lib/pricing";
import { ShieldCheck, Database, Key, Server, CheckCircle2, AlertCircle } from "lucide-react";

export default function AdminSettings() {
  const { user, role } = useAdminAuth();

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "Connected via client proxy";
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "lmwlxnjcoupqzuewpmbk";

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          System & Security Settings
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Operational infrastructure, pricing engine configuration, and security parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Administrator Profile Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-6 shadow-lg space-y-4">
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Active Admin Session</h3>
              <p className="text-[11px] text-muted-foreground">Authenticated via Supabase Auth</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Email Address
              </span>
              <p className="font-mono font-bold text-foreground mt-0.5">{user?.email}</p>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Assigned Role
              </span>
              <div className="mt-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{role || "Administrator"}</span>
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Internal User ID
              </span>
              <p className="font-mono text-[11px] text-muted-foreground truncate mt-0.5">
                {user?.id}
              </p>
            </div>
          </div>
        </div>

        {/* Database & Infrastructure Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-6 shadow-lg space-y-4">
          <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Cloud Database</h3>
              <p className="text-[11px] text-muted-foreground">PostgreSQL & Supabase Storage</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Supabase Project Ref
              </span>
              <p className="font-mono text-foreground mt-0.5">{projectId}</p>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Endpoint URL
              </span>
              <p className="font-mono text-[11px] text-muted-foreground truncate mt-0.5">
                {supabaseUrl}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Storage Bucket
              </span>
              <p className="font-mono text-[11px] text-emerald-400 mt-0.5">
                stickers (public read, authenticated admin write)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Matrix Overview */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Progressive Stepwise Wholesale Engine
            </h3>
            <p className="text-xs text-muted-foreground">
              Active volume pricing matrix enforced on storefront cart and server orders
            </p>
          </div>
          <span className="rounded bg-primary/10 border border-primary/20 px-2.5 py-1 text-[10px] font-bold text-primary">
            Currency: KSh
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TIERS.map((tier) => (
            <div
              key={tier.label}
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-center"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Tier {tier.label}
              </span>
              <h4 className="mt-2 text-2xl font-black text-primary font-mono">
                {tier.unitPrice.toFixed(2)} KSh
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">{tier.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Operational Guidelines & Instructions */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-6 shadow-lg space-y-3">
        <h3 className="text-sm font-bold text-foreground">Administrative Role Assignment</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          To assign administrative privileges to a new user account, execute the following query in
          your Supabase SQL editor:
        </p>
        <div className="rounded-xl bg-black/60 p-4 font-mono text-xs text-primary/90 border border-white/[0.08] overflow-x-auto">
          <code>
            {`INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_UUID_FROM_AUTH_USERS>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;`}
          </code>
        </div>
      </div>
    </div>
  );
}
