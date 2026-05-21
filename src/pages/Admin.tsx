import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchSubcategories } from "@/lib/queries";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const ADMIN_PW = "realz";
const STATUSES = ["Pending Call", "Confirmed", "Delivered", "Cancelled"] as const;

type Order = {
  id: string;
  customer_name: string;
  phone_number: string;
  delivery_address: string;
  total_quantity: number;
  total_price: number;
  status: string;
  created_at: string;
};

type OrderItem = {
  order_id: string;
  product_id: string | null;
  quantity: number;
  calculated_price: number;
  products: { subcategory_id: string | null } | null;
};

export default function Admin() {
  const [auth, setAuth] = useState(() => typeof window !== "undefined" && localStorage.getItem("realz-admin") === "1");
  const [pw, setPw] = useState("");

  useEffect(() => {
    if (auth) localStorage.setItem("realz-admin", "1");
  }, [auth]);

  if (!auth) {
    return (
      <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4">
        <div className="glass-panel w-full rounded-2xl p-8">
          <p className="text-micro text-accent">ADMIN</p>
          <h1 className="mt-4 text-3xl">Dashboard access</h1>
          <p className="mt-2 text-sm text-muted-foreground">Demo password gate. (Password: <code className="text-primary">realz</code>)</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (pw === ADMIN_PW) setAuth(true);
              else toast.error("Wrong password");
            }}
            className="mt-6 space-y-3"
          >
            <Input value={pw} onChange={(e) => setPw(e.target.value)} type="password" placeholder="Password" className="h-11 bg-white/5 focus-visible:ring-primary" />
            <button type="submit" className="w-full rounded-full bg-primary py-3 text-sm font-black uppercase tracking-[0.25em] text-primary-foreground">
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const qc = useQueryClient();
  const orders = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });
  const items = useQuery({
    queryKey: ["admin", "order_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("order_id, product_id, quantity, calculated_price, products(subcategory_id)");
      if (error) throw error;
      return (data ?? []) as unknown as OrderItem[];
    },
  });
  const subs = useQuery({ queryKey: ["subcategories"], queryFn: fetchSubcategories });

  const metrics = useMemo(() => {
    const data = orders.data ?? [];
    return {
      totalOrders: data.length,
      totalRevenue: data.reduce((a, o) => a + Number(o.total_price), 0),
      totalStickers: data.reduce((a, o) => a + o.total_quantity, 0),
    };
  }, [orders.data]);

  const topSubs = useMemo(() => {
    const counts: Record<string, number> = {};
    (items.data ?? []).forEach((it) => {
      const sid = it.products?.subcategory_id;
      if (!sid) return;
      counts[sid] = (counts[sid] ?? 0) + it.quantity;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([sid, qty]) => ({ name: subs.data?.find((s) => s.id === sid)?.name ?? "Unknown", qty }));
  }, [items.data, subs.data]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Status updated");
    qc.invalidateQueries({ queryKey: ["admin", "orders"] });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8">
      <p className="text-micro text-accent">ADMIN DASHBOARD</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">Operations</h1>

      {/* Metrics */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total orders" value={metrics.totalOrders.toString()} />
        <Metric label="Revenue" value={`$${metrics.totalRevenue.toFixed(2)}`} accent />
        <Metric label="Stickers sold" value={metrics.totalStickers.toString()} />
        <div className="glass-card rounded-xl p-5">
          <p className="text-micro text-muted-foreground">TOP SUBCATEGORIES</p>
          <div className="mt-3 space-y-1.5">
            {topSubs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data yet</p>
            ) : (
              topSubs.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <span>{s.name}</span>
                  <span className="font-black text-primary">{s.qty}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Orders table */}
      <div className="mt-10 glass-card overflow-hidden rounded-xl">
        <div className="border-b border-border px-5 py-3">
          <p className="text-micro text-muted-foreground">INBOUND ORDERS</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.data?.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No orders yet — place one from the cart to see it here.</td></tr>
              ) : (
                orders.data?.map((o) => (
                  <tr key={o.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 font-bold">{o.customer_name}</td>
                    <td className="px-4 py-3 text-primary">{o.phone_number}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{o.total_quantity}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-black">${Number(o.total_price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                        <SelectTrigger className="h-8 w-[150px] bg-white/5 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="glass-card rounded-xl p-5">
      <p className="text-micro text-muted-foreground">{label}</p>
      <p className={`mt-3 text-3xl font-black ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
