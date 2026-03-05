"use client";
import { Suspense } from "react";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { supabase, type Customer } from "@/lib/supabase";
import { format } from "date-fns";
import AddCustomerModal from "@/components/AddCustomerModal";
import CustomerDetailModal from "@/components/CustomerDetailModal";

type FilterType = "all" | "active" | "inactive";

function CustomersContent() {
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filtered, setFiltered]   = useState<Customer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState<FilterType>(
    (searchParams.get("status") as FilterType) ?? "all"
  );
  const [showAdd, setShowAdd]     = useState(false);
  const [selected, setSelected]   = useState<Customer | null>(null);

  const fetchCustomers = useCallback(async () => {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    setCustomers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    const q = search.toLowerCase();
    let list = customers;
    if (filter === "active")   list = list.filter((c) => c.is_active);
    if (filter === "inactive") list = list.filter((c) => !c.is_active);
    if (q) list = list.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
    setFiltered(list);
  }, [search, customers, filter]);

  const counts = {
    all:      customers.length,
    active:   customers.filter((c) => c.is_active).length,
    inactive: customers.filter((c) => !c.is_active).length,
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 animate-fade-in">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-0.5 h-4" style={{ background: "var(--warm)" }} />
              <span className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                {filtered.length} of {customers.length} Members
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold" style={{ color: "var(--text)" }}>Customers</h1>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ marginTop: 4 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Add Customer
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            className="input-field"
            style={{ paddingLeft: "2.25rem" }}
            placeholder="Search by name, phone or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 mb-6">
          {(["all", "active", "inactive"] as FilterType[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className="btn"
              style={{
                padding: "5px 14px", fontSize: 11,
                background: filter === f ? "var(--text)" : "transparent",
                color:      filter === f ? "var(--bg)"  : "var(--text-muted)",
                border:     `1px solid ${filter === f ? "var(--text)" : "var(--border)"}`,
                transition: "all 0.15s",
              }}>
              {f === "all"      && `All  (${counts.all})`}
              {f === "active"   && `● Active  (${counts.active})`}
              {f === "inactive" && `○ Inactive  (${counts.inactive})`}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-16 rounded-sm animate-pulse" style={{ background: "var(--surface)" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="surface rounded-sm py-16 text-center">
            <div className="text-4xl mb-3 opacity-20">☕</div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {search ? "No customers match your search"
                : filter !== "all" ? `No ${filter} customers found`
                : "No customers yet — add your first one!"}
            </p>
            {!search && filter === "all" && (
              <button className="btn btn-primary mt-4" onClick={() => setShowAdd(true)}>Add First Customer</button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block surface rounded-sm overflow-hidden">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Customer", "Phone", "Email", "Visits", "Last Visit", "Status", ""].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left" }}>
                        <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{h}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="transition-colors cursor-pointer"
                      style={{ borderBottom: "1px solid var(--border)" }}
                      onClick={() => setSelected(c)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "12px 14px" }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm flex-shrink-0"
                            style={{ background: "var(--surface3)", color: "var(--warm)" }}>
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{c.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px" }}><span className="text-xs" style={{ color: "var(--text-muted)" }}>{c.phone}</span></td>
                      <td style={{ padding: "12px 14px" }}><span className="text-xs" style={{ color: "var(--text-muted)" }}>{c.email ?? "—"}</span></td>
                      <td style={{ padding: "12px 14px" }}><span className="badge badge-warm">{c.visit_count}</span></td>
                      <td style={{ padding: "12px 14px" }}>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {c.last_visit ? format(new Date(c.last_visit), "MMM d, yyyy") : "Never"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span className={`badge ${c.is_active ? "badge-green" : "badge-red"}`}>
                          {c.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-faint)" }}>
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {filtered.map((c) => (
                <div key={c.id} className="surface rounded-sm p-4 cursor-pointer transition-all"
                  style={{ border: "1px solid var(--border)" }}
                  onClick={() => setSelected(c)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-display font-bold"
                        style={{ background: "var(--surface2)", color: "var(--warm)" }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: "var(--text)" }}>{c.name}</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>{c.phone}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`badge ${c.is_active ? "badge-green" : "badge-red"}`}>
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                      <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{c.visit_count} visits</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showAdd && (
        <AddCustomerModal onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); fetchCustomers(); }} />
      )}
      {selected && (
        <CustomerDetailModal customer={selected} onClose={() => setSelected(null)} onUpdate={() => { setSelected(null); fetchCustomers(); }} />
      )}
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: "var(--bg)" }} />}>
      <CustomersContent />
    </Suspense>
  );
}
