"use client";
import { Suspense } from "react";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { supabase, type Customer, getDisplayName, getInitial } from "@/lib/supabase";
import { format } from "date-fns";
import AddCustomerModal from "@/components/AddCustomerModal";
import CustomerDetailModal from "@/components/CustomerDetailModal";

type FilterType = "all" | "active" | "inactive" | "pending" | "rejected";

function CustomersContent() {
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filtered, setFiltered]   = useState<Customer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState<FilterType>((searchParams.get("status") as FilterType) ?? "all");
  const [showAdd, setShowAdd]     = useState(false);
  const [selected, setSelected]   = useState<Customer | null>(null);

  const fetchCustomers = useCallback(async () => {
    const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    setCustomers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    const q = search.toLowerCase();
    let list = customers;
    if (filter === "active")   list = list.filter((c) => c.is_active);
    if (filter === "inactive") list = list.filter((c) => !c.is_active && c.payment_status !== "submitted" && c.payment_status !== "rejected");
    if (filter === "pending")  list = list.filter((c) => c.payment_status === "submitted");
    if (filter === "rejected") list = list.filter((c) => c.payment_status === "rejected");
    if (q) list = list.filter((c) =>
      getDisplayName(c).toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
    setFiltered(list);
  }, [search, customers, filter]);

  const counts = {
  all:      customers.length,
  active:   customers.filter((c) => c.is_active).length,
  inactive: customers.filter((c) => !c.is_active && c.payment_status !== "submitted" && c.payment_status !== "rejected").length,
  pending:  customers.filter((c) => c.payment_status === "submitted").length,
  rejected: customers.filter((c) => c.payment_status === "rejected").length,
};

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">

        <div className="flex items-start justify-between mb-6 animate-fade-in">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--warm-light)" }}>
              {filtered.length} of {customers.length} Members
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>Customers</h1>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ marginTop: 4 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Add Customer
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input className="input-field" style={{ paddingLeft: "2.25rem" }}
            placeholder="Search by name, phone or email…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(["all", "active", "inactive", "pending", "rejected"] as FilterType[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className="btn"
              style={{
                padding: "5px 14px", fontSize: 11,
                background: filter === f ? "var(--text)" : "transparent",
                color:      filter === f ? "var(--bg)"  : "var(--text-muted)",
                border:     `1px solid ${filter === f ? "var(--text)" : "var(--border)"}`,
              }}>
              {f === "all"      && `All (${counts.all})`}
              {f === "active"   && `● Active (${counts.active})`}
              {f === "inactive" && `○ Inactive (${counts.inactive})`}
              {f === "rejected" && `✕ Rejected (${counts.rejected})`}
              {f === "pending"  && (
                <span className="flex items-center gap-1.5">
                  ◎ Pending
                  {counts.pending > 0 && (
                    <span style={{ background: "#DC2626", color: "#FFF", borderRadius: 99, fontSize: 9, fontWeight: 700, padding: "1px 5px" }}>
                      {counts.pending}
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 rounded animate-pulse" style={{ background: "var(--surface)" }} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="surface rounded py-16 text-center">
            <div className="text-4xl mb-3 opacity-20">☕</div>
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
              {search ? "No customers match your search" : filter !== "all" ? `No ${filter} customers` : "No customers yet"}
            </p>
            {!search && filter === "all" && <button className="btn btn-primary mt-4" onClick={() => setShowAdd(true)}>Add First Customer</button>}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block surface rounded overflow-hidden">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Customer", "Phone", "Email", "Visits", "Last Visit", "Status", ""].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left" }}>
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{h}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="cursor-pointer transition-colors" style={{ borderBottom: "1px solid var(--border)" }}
                      onClick={() => setSelected(c)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "12px 14px" }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                            style={{ background: "rgba(139,99,67,0.15)", color: "var(--warm-light)" }}>
                            {getInitial(c)}
                          </div>
                          <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{getDisplayName(c)}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px" }}><span className="text-xs" style={{ color: "var(--text-muted)" }}>{c.phone}</span></td>
                      <td style={{ padding: "12px 14px" }}><span className="text-xs" style={{ color: "var(--text-muted)" }}>{c.email ?? "—"}</span></td>
                      <td style={{ padding: "12px 14px" }}><span className="badge badge-warm">{c.visit_count}</span></td>
                      <td style={{ padding: "12px 14px" }}><span className="text-xs" style={{ color: "var(--text-muted)" }}>{c.last_visit ? format(new Date(c.last_visit), "MMM d, yyyy") : "Never"}</span></td>
                      <td style={{ padding: "12px 14px" }}>
                          {(() => {
                              const expired = c.expiry_date && new Date(c.expiry_date) < new Date();
                              return (
                                <span className={`badge ${
                                  c.payment_status === "rejected" ? "badge-red" :
                                  c.payment_status === "submitted" ? "badge-amber" :
                                  expired ? "badge-red" :
                                  c.is_active ? "badge-green" : "badge-gray"
                                }`}>
                                  {c.payment_status === "rejected" ? "Rejected" :
                                  c.payment_status === "submitted" ? "Pending" :
                                  expired ? "Expired" :
                                  c.is_active ? "Active" : "Inactive"}
                                </span>
                              );
                            })()}                    </td>
                      <td style={{ padding: "12px 14px" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-faint)" }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-2">
              {filtered.map((c) => (
                <div key={c.id} className="surface rounded p-4 cursor-pointer" style={{ border: "1px solid var(--border)" }} onClick={() => setSelected(c)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold"
                        style={{ background: "rgba(139,99,67,0.15)", color: "var(--warm-light)" }}>
                        {getInitial(c)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{getDisplayName(c)}</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>{c.phone}</div>
                      </div>
                    </div>
                    <div className="text-right">
                        <span className={`badge ${
                          c.payment_status === "rejected" ? "badge-red" :
                          c.payment_status === "submitted" ? "badge-amber" :
                          c.expiry_date && new Date(c.expiry_date) < new Date() ? "badge-red" :
                          c.is_active ? "badge-green" : "badge-gray"
                        }`}>
                          {c.payment_status === "rejected" ? "Rejected" :
                          c.payment_status === "submitted" ? "Pending" :
                          c.expiry_date && new Date(c.expiry_date) < new Date() ? "Expired" :
                          c.is_active ? "Active" : "Inactive"}
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

      {showAdd && <AddCustomerModal onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); fetchCustomers(); }} />}
      {selected && <CustomerDetailModal customer={selected} onClose={() => setSelected(null)} onUpdate={() => { setSelected(null); fetchCustomers(); }} />}
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
