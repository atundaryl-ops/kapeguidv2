"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { supabase, type Customer, type Visit } from "@/lib/supabase";
import { format, formatDistanceToNow, startOfDay, subDays } from "date-fns";

type VisitWithCustomer = Visit & { customers: Customer };

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, today: 0, week: 0 });
  const [recentVisits, setRecentVisits] = useState<VisitWithCustomer[]>([]);
  const [topCustomers, setTopCustomers] = useState<Customer[]>([]);

  const fetchData = useCallback(async () => {
    const now = new Date();
    const todayISO = startOfDay(now).toISOString();
    const weekISO = subDays(now, 7).toISOString();

    const [
      { count: total },
      { count: active },
      { count: today },
      { count: week },
      { data: visits },
      { data: top },
    ] = await Promise.all([
      supabase.from("customers").select("*", { count: "exact", head: true }),
      supabase.from("customers").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("visits").select("*", { count: "exact", head: true }).gte("visited_at", todayISO),
      supabase.from("visits").select("*", { count: "exact", head: true }).gte("visited_at", weekISO),
      supabase.from("visits").select("*, customers(*)").order("visited_at", { ascending: false }).limit(8),
      supabase.from("customers").select("*").order("visit_count", { ascending: false }).limit(5),
    ]);

    setStats({ total: total ?? 0, active: active ?? 0, today: today ?? 0, week: week ?? 0 });
    setRecentVisits((visits as any) ?? []);
    setTopCustomers(top ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const ch = supabase.channel("dashboard")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "visits" }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchData]);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="flex items-start justify-between mb-8 animate-fade-in">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-0.5 h-4" style={{ background: "var(--warm)" }} />
              <span className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Overview</span>
            </div>
            <h1 className="font-display text-3xl font-bold" style={{ color: "var(--text)" }}>Dashboard</h1>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {format(new Date(), "EEEE, MMMM d · h:mm a")}
            </p>
          </div>
          <Link href="/scan" className="btn btn-warm" style={{ marginTop: 4 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 7V4h3M17 4h3v3M4 17v3h3M17 20h3v-3"/><rect x="8" y="8" width="8" height="8"/>
            </svg>
            Scan QR
          </Link>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Total Members", value: stats.total, icon: "👥", sub: "registered" },
            { label: "Active Members", value: stats.active, icon: "✦", sub: "enabled" },
            { label: "Today's Visits", value: stats.today, icon: "☕", sub: "check-ins" },
            { label: "This Week", value: stats.week, icon: "◈", sub: "7 days" },
          ].map((s, i) => (
            <div key={i} className="surface p-5 rounded-sm animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="text-xl mb-3" style={{ opacity: 0.7 }}>{s.icon}</div>
              <div className="font-display text-3xl font-bold" style={{ color: "var(--text)" }}>
                {loading ? <span className="animate-pulse opacity-30">—</span> : s.value}
              </div>
              <div className="text-xs mt-1.5 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{s.label}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Recent visits */}
          <div className="lg:col-span-2 surface rounded-sm" style={{ padding: "1.25rem" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs uppercase tracking-widest font-medium" style={{ color: "var(--text-muted)" }}>
                Recent Check-ins
              </h2>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--green)" }} title="Live" />
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 rounded-sm animate-pulse" style={{ background: "var(--surface2)" }} />
                ))}
              </div>
            ) : recentVisits.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-3xl mb-2 opacity-20">☕</div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>No visits recorded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentVisits.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 p-3 rounded-sm group transition-colors"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-display font-bold text-sm"
                      style={{ background: "var(--surface3)", color: "var(--warm)" }}>
                      {v.customers?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{v.customers?.name}</div>
                      <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{v.customers?.phone}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs" style={{ color: "var(--warm)" }}>
                        {formatDistanceToNow(new Date(v.visited_at), { addSuffix: true })}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
                        {format(new Date(v.visited_at), "h:mm a")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top customers */}
          <div className="surface rounded-sm" style={{ padding: "1.25rem" }}>
            <h2 className="text-xs uppercase tracking-widest font-medium mb-4" style={{ color: "var(--text-muted)" }}>
              Top Regulars
            </h2>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 rounded-sm animate-pulse" style={{ background: "var(--surface2)" }} />
                ))}
              </div>
            ) : topCustomers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>No data yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {topCustomers.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-sm"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <span className="text-xs w-4 text-center flex-shrink-0 font-bold"
                      style={{ color: i === 0 ? "var(--warm)" : "var(--text-faint)" }}>
                      {i + 1}
                    </span>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-display font-bold text-xs"
                      style={{ background: "var(--surface3)", color: "var(--warm)" }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>{c.name}</div>
                    </div>
                    <span className="badge badge-warm flex-shrink-0">{c.visit_count} visits</span>
                  </div>
                ))}
              </div>
            )}

            <Link href="/customers" className="btn btn-ghost w-full mt-4 justify-center" style={{ fontSize: 10 }}>
              View All Members
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
