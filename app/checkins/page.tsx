"use client";
import { Suspense } from "react";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { supabase, type Customer, type Visit, getDisplayName, getInitial } from "@/lib/supabase";
import { format, formatDistanceToNow, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import CustomerDetailModal from "@/components/CustomerDetailModal";

type VisitWithCustomer = Visit & { customers: Customer };
type DateFilter = "today" | "week" | "month" | "all";

function CheckinsContent() {
  const searchParams = useSearchParams();
  const [visits, setVisits]         = useState<VisitWithCustomer[]>([]);
  const [filtered, setFiltered]     = useState<VisitWithCustomer[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>(
    (searchParams.get("filter") as DateFilter) ?? "today"
  );
  const [selected, setSelected]     = useState<Customer | null>(null);
  const [page, setPage]             = useState(20);

  const fetchVisits = useCallback(async () => {
    const { data } = await supabase
      .from("visits")
      .select("*, customers(*)")
      .order("visited_at", { ascending: false })
      .limit(500);
    setVisits((data as any) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchVisits(); }, [fetchVisits]);

  useEffect(() => {
    const now = new Date();
    const cutoffs: Record<DateFilter, Date> = {
      today: startOfDay(now),
      week:  startOfWeek(now),
      month: startOfMonth(now),
      all:   new Date(0),
    };
    const cutoff = cutoffs[dateFilter];
    const q = search.toLowerCase();

    let list = visits.filter((v) => new Date(v.visited_at) >= cutoff);
    if (q) list = list.filter((v) =>
      getDisplayName(v.customers).toLowerCase().includes(q) ||
      v.customers?.phone?.includes(q)
    );
    setFiltered(list);
    setPage(20);
  }, [visits, dateFilter, search]);

  const shown = filtered.slice(0, page);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 animate-fade-in">
          <div>
            <Link href="/dashboard" className="flex items-center gap-1.5 mb-2"
              style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: 12, fontWeight: 600 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back to Dashboard
            </Link>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--warm-light)" }}>
              {filtered.length} Check-ins
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>Recent Check-ins</h1>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input className="input-field" style={{ paddingLeft: "2.25rem" }}
            placeholder="Search by name or phone…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Date filter tabs */}
        <div className="flex gap-2 mb-6">
          {(["today", "week", "month", "all"] as DateFilter[]).map((f) => (
            <button key={f} onClick={() => setDateFilter(f)} className="btn"
              style={{
                padding: "5px 14px", fontSize: 11,
                background: dateFilter === f ? "var(--text)" : "transparent",
                color:      dateFilter === f ? "var(--bg)"  : "var(--text-muted)",
                border:     `1px solid ${dateFilter === f ? "var(--text)" : "var(--border)"}`,
              }}>
              {f === "today" && "Today"}
              {f === "week"  && "This Week"}
              {f === "month" && "This Month"}
              {f === "all"   && "All Time"}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-16 rounded animate-pulse" style={{ background: "var(--surface)" }} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="surface rounded py-16 text-center">
            <div className="text-4xl mb-3 opacity-20">☕</div>
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>No check-ins found</p>
          </div>
        ) : (
          <>
            <div className="surface rounded overflow-hidden">
              {shown.map((v, i) => (
                <div key={v.id}
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors"
                  style={{ borderBottom: i < shown.length - 1 ? "1px solid var(--border)" : "none" }}
                  onClick={() => v.customers && setSelected(v.customers)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: "rgba(139,99,67,0.15)", color: "var(--warm-light)" }}>
                    {getInitial(v.customers)}
                  </div>

                  {/* Name + phone */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                      {getDisplayName(v.customers)}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{v.customers?.phone}</div>
                  </div>

                  
                  {/* Time */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-medium" style={{ color: "var(--warm-light)" }}>
                      {formatDistanceToNow(new Date(v.visited_at), { addSuffix: true })}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
                      {format(new Date(v.visited_at), "MMM d · h:mm a")}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load more */}
            {page < filtered.length && (
              <button className="btn btn-ghost w-full justify-center mt-4"
                onClick={() => setPage((p) => p + 20)}>
                Load More ({filtered.length - page} remaining)
              </button>
            )}
          </>
        )}
      </div>

      {selected && (
        <CustomerDetailModal
          customer={selected}
          onClose={() => setSelected(null)}
          onUpdate={() => { setSelected(null); fetchVisits(); }}
        />
      )}
    </div>
  );
}

export default function CheckinsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "var(--bg)" }} />}>
      <CheckinsContent />
    </Suspense>
  );
}