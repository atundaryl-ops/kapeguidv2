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
  const [form, setForm] = useState({ name: customer.name, phone: customer.phone, email: customer.email ?? "", notes: customer.notes ?? "" });
  const [saving, setSaving] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [tab, setTab] = useState<"details" | "visits" | "qr">("details");

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
      name: form.name.trim(), phone: form.phone.trim(),
      email: form.email.trim() || null, notes: form.notes.trim() || null,
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
            <div className="w-11 h-11 rounded-full flex items-center justify-center font-display font-black text-xl"
              style={{ background: "var(--surface2)", color: "var(--warm)", border: "1px solid var(--border2)" }}>
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-display text-lg font-bold leading-tight" style={{ color: "var(--text)" }}>{customer.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`badge ${customer.is_active ? "badge-green" : "badge-red"}`}>
                  {customer.is_active ? "Active" : "Inactive"}
                </span>
                <span className="badge badge-warm">{customer.visit_count} visits</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-sm"
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
            <div className="space-y-4">
              {editing ? (
                <>
                  {[
                    { label: "Full Name", key: "name", type: "text", placeholder: "Juan dela Cruz" },
                    { label: "Phone", key: "phone", type: "tel", placeholder: "+63 912 345 6789" },
                    { label: "Email", key: "email", type: "email", placeholder: "juan@email.com" },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="field-label">{f.label}</label>
                      <input className="input-field" type={f.type} placeholder={f.placeholder}
                        value={(form as any)[f.key]}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                    </div>
                  ))}
                  <div>
                    <label className="field-label">Notes</label>
                    <textarea className="input-field" rows={3} style={{ resize: "vertical" }}
                      value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                </>
              ) : (
                <div className="space-y-0">
                  {[
                    { label: "Phone",        value: customer.phone },
                    { label: "Email",        value: customer.email ?? "—" },
                    { label: "Notes",        value: customer.notes ?? "—" },
                    { label: "Member Since", value: format(new Date(customer.created_at), "MMMM d, yyyy") },
                    { label: "Last Visit",   value: customer.last_visit ? format(new Date(customer.last_visit), "MMM d, yyyy · h:mm a") : "Never" },
                    { label: "Total Visits", value: `${customer.visit_count} visits` },
                  ].map((row) => (
                    <div key={row.label} className="flex gap-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                      <span className="text-xs uppercase tracking-wider w-28 flex-shrink-0 pt-0.5" style={{ color: "var(--text-muted)" }}>{row.label}</span>
                      <span className="text-xs" style={{ color: "var(--text)" }}>{row.value}</span>
                    </div>
                  ))}
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

              {/* QR preview card */}
              <div className="rounded-sm overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid var(--border2)" }}>
                {/* Mini card header */}
                <div style={{ background: "#0A0A0A", padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <svg width="14" height="14" viewBox="0 0 36 36" fill="none">
                      <ellipse cx="18" cy="21" rx="11" ry="8" stroke="#C8B89A" strokeWidth="1.5" fill="none"/>
                      <path d="M11 18 Q18 12 25 18" stroke="#C8B89A" strokeWidth="1.3" fill="none"/>
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#FFF", fontFamily: "serif" }}>
                      Kape<span style={{ color: "#C8B89A" }}>Guid</span>
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#FFF", fontFamily: "serif" }}>{customer.name}</div>
                </div>
                {/* QR image */}
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" style={{ display: "block", width: 200, height: 200, margin: "16px auto" }} />
                ) : (
                  <div className="w-48 h-48 m-4 animate-pulse rounded-sm" style={{ background: "#F5F5F5" }} />
                )}
                <div style={{ padding: "8px 16px 14px", textAlign: "center", background: "#FAFAF8" }}>
                  <p style={{ fontSize: 9, color: "#999", wordBreak: "break-all", fontFamily: "monospace" }}>
                    {customer.qr_code}
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <div className="w-full p-3 rounded-sm" style={{ background: "rgba(200,184,154,0.05)", border: "1px solid rgba(200,184,154,0.2)" }}>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  <span style={{ color: "var(--warm)" }}>How it works:</span> Give this printed card to the customer.
                  When they visit, the cashier opens <strong style={{ color: "var(--text)" }}>Scan QR</strong> and points the camera at this card to log the visit instantly.
                </p>
              </div>

              {/* Action buttons */}
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

              <p className="text-xs text-center" style={{ color: "var(--text-faint)" }}>
                Opens a full print-ready card page in a new tab
              </p>
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
