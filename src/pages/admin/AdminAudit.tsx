import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Search, ShieldCheck, Clock, User, ArrowRight } from "lucide-react";
import { fetchAuditLogs } from "@/lib/admin-api";
import { Input } from "@/components/ui/input";

export default function AdminAudit() {
  const [search, setSearch] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin", "audit-logs"],
    queryFn: () => fetchAuditLogs(100),
  });

  const filteredLogs = (logs || []).filter((log) => {
    const term = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      log.entity_type.toLowerCase().includes(term) ||
      (log.actor_email || "").toLowerCase().includes(term) ||
      (log.entity_id || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Administrative Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Immutable log of operational mutations, catalog changes, order updates, and stock
            overrides.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-400">
          <ShieldCheck className="h-4 w-4" />
          <span>Append-Only Security</span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] p-4 flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, actor, or entity…"
            className="h-10 bg-white/[0.04] border-white/[0.1] pl-9 text-xs rounded-xl text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-primary"
          />
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
        </div>

        <span className="text-xs text-muted-foreground hidden sm:block">
          {filteredLogs.length} events logged
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0f101d] overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-muted-foreground">
            Loading audit records…
          </div>
        ) : filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Entity</th>
                  <th className="py-3.5 px-4">Target ID</th>
                  <th className="py-3.5 px-4">Context Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02]">
                    <td className="py-3.5 px-4 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span>{log.actor_email || "System / Migration"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground uppercase text-[10px] font-bold">
                      {log.entity_type}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground text-[11px]">
                      {log.entity_id ? `#${log.entity_id}` : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground font-mono text-[11px] max-w-xs truncate">
                      {JSON.stringify(log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-24 text-center">
            <ScrollText className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
            <h3 className="text-sm font-bold text-foreground">No audit entries found</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Administrative actions will appear here automatically as operations are performed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
