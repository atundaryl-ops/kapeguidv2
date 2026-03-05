"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, type Customer, type Visit } from "@/lib/supabase";
import { format, formatDistanceToNow } from "date-fns";

interface Props {
  customer: Customer;
  onClose: () => void;
  onUpdate: () => void;
}

export default function CustomerDetailModal({ customer, onClose, onUpdate }: Props) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name:            customer.name,
    phone:           customer.phone,
    email:           customer.email ?? "",
    notes:           customer.notes ?? "",
    access_code:     customer.access_code ?? "",
    card_issue_date: customer.card_issue_date ?? "",
    expiry_date:     customer.expiry_date ?? "",
    free_coffee:     customer.free_coffee ?? false,
  });
  const [saving, setSaving]       = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [tab, setTab]             = useState<"details" | "visits" | "qr">("details");

  useEffect(() => {
    supabase.from("visits").select("*").eq("customer_id", customer.id)
      .order("visited_at", { ascending: false }).limit(20)
      .then(({ data }) => { setVisits(data ?? []); setLoadingVisits(false); });

    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(customer.qr_code, {
        width: 280, margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
        errorCorrectionLevel: "H",
      }).then(setQrDataUrl);
    });
  }, [customer]);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from("customers").update({
      name:            form.name.trim(),
      phone:           form.phone.trim(),
      email:           form.email.trim() || null,
      notes:           form.notes.trim() || null,
      access_code:     form.access_code.trim() || null,
      card_issue_date: form.card_issue_date || null,
      expiry_date:     form.expiry_date || null,
      free_coffee:     form.free_coffee,
    }).eq("id", customer.id);
    setSaving(false);
    if (!error) { setEditing(false); onUpdate(); }
  }

  async function toggleActive() {
    await supabase.from("customers").update({ is_active: !customer.is_active }).eq("id", customer.id);
    onUpdate();
  }

  async function deleteCustomer() {
    if (!confirm(`Delete ${customer.name}? This cannot be undone.`)) return;
    await supabase.from("customers").delete().eq("id", customer.id);
    onUpdate();
  }

  function handleDownloadQR() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `kapeguid-${customer.name.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  }

  // Check expiry status
  const isExpired = customer.expiry_date ? new Date(customer.expiry_date) < new Date() : false;
  const expiresLabel = customer.expiry_date
    ? `${format(new Date(customer.expiry_date), "MMM d, yyyy")} ${isExpired ? "· Expired" : ""}`
    : "—";

  const tabs = [
    { key: "details", label: "Details" },
    { key: "visits",  label: `Visits (${customer.visit_count})` },
    { key: "qr",      label: "QR Code" },
  ] as const;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-sm animate-slide-up overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border2)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center font-display font-black text-xl flex-shrink-0"
              style={{ background: "var(--surface2)", color: "var(--warm)", border: "1px solid var(--border2)" }}>
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-display text-lg font-bold leading-tight" style={{ color: "var(--text)" }}>{customer.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`badge ${customer.is_active ? "badge-green" : "badge-red"}`}>
                  {customer.is_active ? "Active" : "Inactive"}
                </span>
                <span className="badge badge-warm">{customer.visit_count} visits</span>
                {customer.free_coffee && (
                  <span className="badge" style={{ background: "rgba(251,191,36,0.1)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.25)" }}>
                    ☕ Free Coffee
                  </span>
                )}
                {isExpired && (
                  <span className="badge badge-red">Expired</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-sm flex-shrink-0"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="px-5 py-3 text-xs uppercase tracking-wider transition-colors"
              style={{
                color: tab === t.key ? "var(--text)" : "var(--text-muted)",
                background: "none", border: "none", cursor: "pointer",
                borderBottom: tab === t.key ? "2px solid var(--warm)" : "2px solid transparent",
                marginBottom: -1,
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5">

          {/* ── Details tab ── */}
          {tab === "details" && (
            <div>
              {editing ? (
                <div className="space-y-4">
                  {/* Basic info section */}
                  <div>
                    <p className="text-xs uppercase tracking-widest mb-3 pb-2"
                      style={{ color: "var(--warm)", borderBottom: "1px solid var(--border)" }}>
                      Basic Info
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="field-label">Full Name</label>
                        <input className="input-field" value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      </div>
                      <div>
                        <label className="field-label">Phone</label>
                        <input className="input-field" type="tel" value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                      </div>
                      <div>
                        <label className="field-label">Email</label>
                        <input className="input-field" type="email" value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </div>
                      <div>
                        <label className="field-label">Notes</label>
                        <textarea className="input-field" rows={2} style={{ resize: "vertical" }}
                          value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* Membership section */}
                  <div>
                    <p className="text-xs uppercase tracking-widest mb-3 pb-2"
                      style={{ color: "var(--warm)", borderBottom: "1px solid var(--border)" }}>
                      Membership
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="field-label">Access Code</label>
                        <input className="input-field" placeholder="e.g. 0123" value={form.access_code}
                          onChange={(e) => setForm({ ...form, access_code: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="field-label">Card Issue Date</label>
                          <input className="input-field" type="date" value={form.card_issue_date}
                            onChange={(e) => setForm({ ...form, card_issue_date: e.target.value })} />
                        </div>
                        <div>
                          <label className="field-label">Expiry Date</label>
                          <input className="input-field" type="date" value={form.expiry_date}
                            onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-sm"
                        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                        <input type="checkbox" id="free_coffee_edit" checked={form.free_coffee}
                          onChange={(e) => setForm({ ...form, free_coffee: e.target.checked })}
                          style={{ width: 14, height: 14, accentColor: "var(--warm)" }} />
                        <label htmlFor="free_coffee_edit" className="text-xs cursor-pointer" style={{ color: "var(--text)" }}>
                          Free Coffee Entitlement
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">

                  {/* Basic info */}
                  <div>
                    <p className="text-xs uppercase tracking-widest mb-3"
                      style={{ color: "var(--warm)" }}>
                      Basic Info
                    </p>
                    <div className="rounded-sm overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                      {[
                        { label: "Phone",        value: customer.phone },
                        { label: "Email",        value: customer.email ?? "—" },
                        { label: "Member Since", value: format(new Date(customer.created_at), "MMMM d, yyyy") },
                        { label: "Last Visit",   value: customer.last_visit ? format(new Date(customer.last_visit), "MMM d, yyyy · h:mm a") : "Never" },
                        { label: "Notes",        value: customer.notes ?? "—" },
                      ].map((row, i, arr) => (
                        <div key={row.label} className="flex gap-4 px-4 py-3"
                          style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none", background: i % 2 === 0 ? "var(--surface2)" : "transparent" }}>
                          <span className="text-xs uppercase tracking-wider w-28 flex-shrink-0 pt-0.5"
                            style={{ color: "var(--text-muted)" }}>{row.label}</span>
                          <span className="text-xs break-words" style={{ color: "var(--text)" }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Membership */}
                  <div>
                    <p className="text-xs uppercase tracking-widest mb-3"
                      style={{ color: "var(--warm)" }}>
                      Membership
                    </p>
                    <div className="rounded-sm overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                      {[
                        {
                          label: "Access Code",
                          value: customer.access_code ?? "—",
                          badge: customer.access_code
                            ? <span className="font-mono text-xs px-2 py-0.5 rounded-sm"
                                style={{ background: "var(--surface3)", color: "var(--warm)", border: "1px solid var(--border2)" }}>
                                {customer.access_code}
                              </span>
                            : null,
                        },
                        {
                          label: "Card Issued",
                          value: customer.card_issue_date
                            ? format(new Date(customer.card_issue_date), "MMMM d, yyyy")
                            : "—",
                        },
                        {
                          label: "Expiry Date",
                          value: expiresLabel,
                          highlight: isExpired,
                        },
                        {
                          label: "Free Coffee",
                          value: "",
                          badge: customer.free_coffee != null
                            ? <span className={`badge ${customer.free_coffee ? "" : "badge-red"}`}
                                style={customer.free_coffee ? { background: "rgba(251,191,36,0.1)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.25)" } : {}}>
                                {customer.free_coffee ? "☕ Yes — Entitled" : "No"}
                              </span>
                            : <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>,
                        },
                      ].map((row, i, arr) => (
                        <div key={row.label} className="flex items-center gap-4 px-4 py-3"
                          style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none", background: i % 2 === 0 ? "var(--surface2)" : "transparent" }}>
                          <span className="text-xs uppercase tracking-wider w-28 flex-shrink-0"
                            style={{ color: "var(--text-muted)" }}>{row.label}</span>
                          {row.badge ?? (
                            <span className="text-xs" style={{ color: (row as any).highlight ? "var(--red)" : "var(--text)" }}>
                              {row.value}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* ── Visits tab ── */}
          {tab === "visits" && (
            <div>
              {loadingVisits ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 rounded-sm animate-pulse" style={{ background: "var(--surface2)" }} />
                  ))}
                </div>
              ) : visits.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-3xl mb-2 opacity-20">☕</div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>No visits recorded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {visits.map((v, i) => (
                    <div key={v.id} className="flex items-center justify-between p-3 rounded-sm"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs w-5 text-center" style={{ color: "var(--text-faint)" }}>
                          #{visits.length - i}
                        </span>
                        <div>
                          <div className="text-xs font-medium" style={{ color: "var(--text)" }}>
                            {format(new Date(v.visited_at), "EEEE, MMMM d, yyyy")}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {format(new Date(v.visited_at), "h:mm a")}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs flex-shrink-0" style={{ color: "var(--warm)" }}>
                        {formatDistanceToNow(new Date(v.visited_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── QR Code tab ── */}
          {tab === "qr" && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-sm overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border2)" }}>
                <div style={{ background: "#0A0A0A", padding: "12px 16px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#FFF", fontFamily: "serif" }}>{customer.name}</div>
                  {customer.access_code && (
                    <div style={{ fontSize: 10, color: "#9A9080", marginTop: 2, letterSpacing: "0.08em" }}>
                      CODE {customer.access_code}
                    </div>
                  )}
                </div>
                {qrDataUrl
                  ? <img src={qrDataUrl} alt="QR Code" style={{ display: "block", width: 200, height: 200, margin: "16px auto" }} />
                  : <div className="w-48 h-48 m-4 animate-pulse rounded-sm" style={{ background: "#F5F5F5" }} />
                }
                <div style={{ padding: "8px 16px 14px", textAlign: "center", background: "#FAFAF8" }}>
                  <p style={{ fontSize: 9, color: "#999", wordBreak: "break-all", fontFamily: "monospace" }}>
                    {customer.qr_code}
                  </p>
                </div>
              </div>

              <div className="w-full p-3 rounded-sm" style={{ background: "rgba(200,184,154,0.05)", border: "1px solid rgba(200,184,154,0.2)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  <span style={{ color: "var(--warm)" }}>How it works:</span> Give this printed card to the customer.
                  Staff scan it on the <strong style={{ color: "var(--text)" }}>Scan QR</strong> page to log visits instantly.
                </p>
              </div>

              <div className="w-full grid grid-cols-2 gap-2">
                <button className="btn btn-ghost justify-center" onClick={handleDownloadQR}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                  </svg>
                  Download PNG
                </button>
                <Link href={`/customers/${customer.id}/qr`} target="_blank"
                  className="btn btn-warm justify-center" style={{ textDecoration: "none" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                    <rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  Print Card
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-5 flex-shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
          {editing ? (
            <>
              <button className="btn btn-ghost flex-1 justify-center" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={() => setEditing(true)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </button>
              <button className="btn btn-warm flex-1 justify-center" onClick={toggleActive}>
                {customer.is_active ? "Deactivate" : "Activate"}
              </button>
              <button className="btn btn-danger" onClick={deleteCustomer} title="Delete customer">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
