"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { supabase, type Customer, type Visit, getDisplayName, getInitial } from "@/lib/supabase";
import { format, formatDistanceToNow, startOfDay, subDays } from "date-fns";
import CustomerDetailModal from "@/components/CustomerDetailModal";

type VisitWithCustomer = Visit & { customers: Customer };

export default function Dashboard() {
  const [loading, setLoading]               = useState(true);
  const [stats, setStats]                   = useState({ total: 0, active: 0, today: 0, week: 0 });
  const [recentVisits, setRecentVisits]     = useState<VisitWithCustomer[]>([]);
  const [topCustomers, setTopCustomers]     = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const fetchData = useCallback(async () => {
    const now = new Date();
    const todayISO = startOfDay(now).toISOString();
    const weekISO  = subDays(now, 7).toISOString();

    const [
      { count: total }, { count: active },
      { count: today }, { count: week },
      { data: visits }, { data: top },
    ] = await Promise.all([
      supabase.from("customers").select("*", { count: "exact", head: true }),
      supabase.from("customers").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("visits").select("*", { count: "exact", head: true }).gte("visited_at", todayISO),
      supabase.from("visits").select("*", { count: "exact", head: true }).gte("visited_at", weekISO),
      supabase.from("visits").select("*, customers(*)").order("visited_at", { ascending: false }).limit(20),
      supabase.from("customers").select("*").order("visit_count", { ascending: false }).limit(10),
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

  const statCards = [
    { label: "Total Members",  value: stats.total,  icon: "👥", sub: "registered",  href: "/customers" },
    { label: "Active Members", value: stats.active, icon: "✦",  sub: "Customers",     href: "/customers?status=active" },
    { label: "Today's Visits", value: stats.today,  icon: "☕", sub: "check-ins",   href: "/checkins?filter=today" },
    { label: "This Week",      value: stats.week,   icon: "◈",  sub: "7 days",      href: "/customers" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 animate-fade-in">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--warm-light)" }}>Overview</p>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>Dashboard</h1>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {format(new Date(), "EEEE, MMMM d · h:mm a")}
            </p>
          </div>
          <Link href="/scan" className="btn btn-warm" style={{ marginTop: 4 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7V4h3M17 4h3v3M4 17v3h3M17 20h3v-3"/><rect x="8" y="8" width="8" height="8"/>
            </svg>
            Scan QR
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {statCards.map((s, i) => (
            <Link key={i} href={s.href} style={{ textDecoration: "none" }}>
              <div className="surface p-5 rounded animate-slide-up transition-all group"
                style={{ animationDelay: `${i * 60}ms`, cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--warm)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
                <div className="text-xl mb-3" style={{ opacity: 0.6 }}>{s.icon}</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
                  {loading ? <span className="animate-pulse opacity-20">—</span> : s.value}
                </div>
                <div className="text-xs font-semibold uppercase tracking-wider mt-1.5" style={{ color: "var(--text-muted)" }}>{s.label}</div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs" style={{ color: "var(--text-faint)" }}>{s.sub}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    className="opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: "var(--warm-light)" }}>
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">

          {/* Recent Check-ins — scrollable */}
          <div className="lg:col-span-2 surface rounded" style={{ padding: "1.25rem", display: "flex", flexDirection: "column" }}>
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Recent Check-ins</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--green)" }} title="Live" />
                <span className="text-xs" style={{ color: "var(--text-faint)" }}>Live</span>
              </div>
            </div>

            {/* Fixed height scrollable list */}
            <div style={{ height: 380, overflowY: "auto", paddingRight: 4 }}>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => <div key={i} className="h-14 rounded animate-pulse" style={{ background: "var(--surface2)" }} />)}
                </div>
              ) : recentVisits.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-3xl mb-2 opacity-20">☕</div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>No visits recorded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentVisits.map((v) => (
                    <div key={v.id}
                      className="flex items-center gap-3 p-3 rounded transition-all cursor-pointer group"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                      onClick={() => v.customers && setSelectedCustomer(v.customers)}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--warm)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                        style={{ background: "var(--surface3)", color: "var(--warm-light)" }}>
                        {v.customers ? getInitial(v.customers) : "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate group-hover:underline"
                          style={{ color: "var(--text)", textUnderlineOffset: 3 }}>
                          {v.customers ? getDisplayName(v.customers) : "Unknown"}
                        </div>
                        <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{v.customers?.phone}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs font-medium" style={{ color: "var(--warm-light)" }}>
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
          </div>

          {/* Top Regulars — scrollable, top 10 */}
          <div className="surface rounded" style={{ padding: "1.25rem", display: "flex", flexDirection: "column" }}>
            <h2 className="text-xs font-bold uppercase tracking-widest mb-4 flex-shrink-0" style={{ color: "var(--text-muted)" }}>
              Top Regulars
            </h2>

            <div style={{ height: 380, overflowY: "auto", paddingRight: 4 }}>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded animate-pulse" style={{ background: "var(--surface2)" }} />)}
                </div>
              ) : topCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>No data yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {topCustomers.map((c, i) => (
                    <div key={c.id}
                      className="flex items-center gap-3 p-2.5 rounded transition-all cursor-pointer group"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                      onClick={() => setSelectedCustomer(c)}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--warm)")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
                      <span className="text-xs w-5 text-center flex-shrink-0 font-bold"
                        style={{ color: i === 0 ? "var(--warm-light)" : i < 3 ? "var(--text-muted)" : "var(--text-faint)" }}>
                        {i + 1}
                      </span>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs"
                        style={{ background: i === 0 ? "rgba(139,99,67,0.3)" : "var(--surface3)", color: "var(--warm-light)" }}>
                        {getInitial(c)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate group-hover:underline"
                          style={{ color: "var(--text)", textUnderlineOffset: 3 }}>
                          {getDisplayName(c)}
                        </div>
                      </div>
                      <span className="badge badge-warm flex-shrink-0">{c.visit_count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Link href="/customers" className="btn btn-ghost w-full mt-4 justify-center flex-shrink-0" style={{ fontSize: 10 }}>
              View All Members
            </Link>
          </div>
        </div>
      </div>

      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onUpdate={() => { setSelectedCustomer(null); fetchData(); }}
        />
      )}
    </div>
  );
}
