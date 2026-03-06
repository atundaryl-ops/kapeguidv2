"use client";
import { useEffect, useState } from "react";
import { supabase, type Customer, type Visit, getDisplayName, getInitial } from "@/lib/supabase";
import { format, formatDistanceToNow } from "date-fns";

interface Props { customer: Customer; onClose: () => void; onUpdate: () => void; }

function addOneYear(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export default function CustomerDetailModal({ customer, onClose, onUpdate }: Props) {
  const [visits, setVisits]               = useState<Visit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [editing, setEditing]             = useState(false);
  const [form, setForm] = useState({
    first_name:      customer.first_name ?? "",
    middle_name:     customer.middle_name ?? "",
    last_name:       customer.last_name ?? "",
    name:            customer.name ?? "",
    phone:           customer.phone,
    email:           customer.email ?? "",
    notes:           customer.notes ?? "",
    access_code:     customer.access_code ?? "",
    card_issue_date: customer.card_issue_date ?? "",
    expiry_date:     customer.expiry_date ?? "",
    free_coffee:     customer.free_coffee ?? false,
  });
  const [saving, setSaving]               = useState(false);
  const [redeemConfirm, setRedeemConfirm] = useState(false);
  const [redeeming, setRedeeming]         = useState(false);
  const [qrDataUrl, setQrDataUrl]         = useState("");
  const [tab, setTab]                     = useState<"details" | "visits" | "qr">("details");
  const [showScreenshot, setShowScreenshot] = useState(false);

  useEffect(() => {
    supabase.from("visits").select("*").eq("customer_id", customer.id)
      .order("visited_at", { ascending: false }).limit(30)
      .then(({ data }) => { setVisits(data ?? []); setLoadingVisits(false); });

    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(customer.qr_code, { width: 280, margin: 2, color: { dark: "#000", light: "#FFF" }, errorCorrectionLevel: "H" })
        .then(setQrDataUrl);
    });
  }, [customer]);

  function handleIssueDateChange(val: string) {
    setForm({ ...form, card_issue_date: val, expiry_date: addOneYear(val) });
  }

  async function handleSave() {
    setSaving(true);
    const fullName = form.first_name
      ? `${form.first_name} ${form.middle_name ? form.middle_name + " " : ""}${form.last_name}`.trim()
      : form.name;
    
    const isStillActive = form.expiry_date ? new Date(form.expiry_date) > new Date() : false;
    const { error } = await supabase.from("customers").update({
      name:            fullName,
      first_name:      form.first_name.trim() || null,
      middle_name:     form.middle_name.trim() || null,
      last_name:       form.last_name.trim() || null,
      phone:           form.phone.trim(),
      email:           form.email.trim() || null,
      notes:           form.notes.trim() || null,
      access_code:     form.access_code.trim() || null,
      card_issue_date: form.card_issue_date || null,
      expiry_date:     form.expiry_date || null,
      free_coffee:     form.free_coffee,
      is_active:       isStillActive,
    }).eq("id", customer.id);

    setSaving(false);
    if (!error) { setEditing(false); onUpdate(); }
  }

  async function handleRedeem() {
    setRedeeming(true);
    const redeemNote = `Free coffee redeemed on ${format(new Date(), "MMMM d, yyyy")}.`;
    const newNotes = customer.notes?.trim() ? `${redeemNote} ${customer.notes}` : redeemNote;
    await supabase.from("customers").update({ free_coffee: false, notes: newNotes }).eq("id", customer.id);
    setRedeeming(false);
    setRedeemConfirm(false);
    onUpdate();
  }

  async function toggleActive() {
    await supabase.from("customers").update({ is_active: !customer.is_active }).eq("id", customer.id);
    onUpdate();
  }

  async function handleRenew() {
    if (!confirm(`Renew ${getDisplayName(customer)}'s card? This sets today as the new issue date + 1 year expiry.`)) return;
    const newIssue  = new Date().toISOString().slice(0, 10);
    const newExpiry = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10);
    await supabase.from("customers").update({
      card_issue_date: newIssue,
      expiry_date:     newExpiry,
      is_active:       true,
      free_coffee:     true,
    }).eq("id", customer.id);
    onUpdate();
  }

  async function handleExtend() {
    if (!confirm(`Extend ${getDisplayName(customer)}'s card by 1 year?`)) return;
    const currentExpiry = customer.expiry_date ?? new Date().toISOString().slice(0, 10);
    const newExpiry = new Date(new Date(currentExpiry).setFullYear(new Date(currentExpiry).getFullYear() + 1)).toISOString().slice(0, 10);
    await supabase.from("customers").update({
        expiry_date: newExpiry,
        is_active:   true,
      }).eq("id", customer.id);
    onUpdate();
  }

  async function deleteCustomer() {
    if (!confirm(`Delete ${getDisplayName(customer)}? This cannot be undone.`)) return;
    await supabase.from("customers").delete().eq("id", customer.id);
    onUpdate();
  }

  function handleDownloadQR() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `kapeguid-${(customer.last_name ?? customer.name).replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  }

  const isExpired = customer.expiry_date ? new Date(customer.expiry_date) < new Date() : false;
  const displayName = getDisplayName(customer);

  const tabs = [
    { key: "details", label: "Details" },
    { key: "visits",  label: `Visits (${customer.visit_count})` },
    { key: "qr",      label: "QR Code" },
  ] as const;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded overflow-hidden animate-slide-up"
        style={{ background: "var(--surface)", border: "1px solid var(--border2)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>

        {/* Pending Payment Banner */}
                  {customer.payment_status === "submitted" && (
                    <div className="px-5 pt-4" style={{ flexShrink: 0 }}>
                      <div className="rounded p-3 flex items-center justify-between gap-3"
                        style={{ background: "rgba(180,83,9,0.08)", border: "1px solid rgba(180,83,9,0.25)" }}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--amber)" }} />
                          <span className="text-xs font-bold" style={{ color: "var(--amber)" }}>Pending Payment Approval</span>
                        </div>
                        {customer.payment_screenshot && (
                          <button className="btn" onClick={() => setShowScreenshot(true)}
                            style={{ padding: "3px 10px", fontSize: 10, background: "rgba(180,83,9,0.1)", color: "var(--amber)", border: "1px solid rgba(180,83,9,0.3)" }}>
                            View Proof
                          </button>
                        )}
                      </div>
                    </div>
                  )}

        {/* Header */}
        <div className="flex items-center justify-between p-5 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0"
              style={{ background: "rgba(139,99,67,0.2)", color: "var(--warm-light)", border: "2px solid rgba(139,99,67,0.25)" }}>
              {getInitial(customer)}
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>{displayName}</h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`badge ${
                    customer.payment_status === "rejected" ? "badge-red" :
                    isExpired ? "badge-red" :
                    customer.is_active ? "badge-green" : "badge-gray"
                  }`}>
                    {customer.payment_status === "rejected" ? "Rejected" :
                    isExpired ? "Expired" :
                    customer.is_active ? "Active" : "Inactive"}
                  </span>
                <span className="badge badge-warm">{customer.visit_count} visits</span>
                {customer.free_coffee && !isExpired && customer.payment_status !== "submitted" && customer.payment_status !== "rejected" && (
                  <span className="badge badge-amber">☕ Free Coffee</span>
                )}
                
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded flex-shrink-0"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                padding: "10px 20px", fontSize: 11, fontWeight: 600,
                letterSpacing: "0.06em", textTransform: "uppercase",
                color: tab === t.key ? "var(--text)" : "var(--text-muted)",
                background: "none", border: "none", cursor: "pointer",
                borderBottom: tab === t.key ? "2px solid var(--warm)" : "2px solid transparent",
                marginBottom: -1, transition: "all 0.15s",
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5">

          {/* ── Details ── */}
          {tab === "details" && (
            <div className="space-y-5">
              {editing ? (
                <>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3 pb-2" style={{ color: "var(--warm-light)", borderBottom: "1px solid var(--border)" }}>Name</p>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="field-label">First Name</label>
                          <input className="input-field" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                        </div>
                        <div>
                          <label className="field-label">Middle Name</label>
                          <input className="input-field" value={form.middle_name} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <label className="field-label">Last Name</label>
                        <input className="input-field" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3 pb-2" style={{ color: "var(--warm-light)", borderBottom: "1px solid var(--border)" }}>Contact</p>
                    <div className="space-y-3">
                      <div><label className="field-label">Phone</label><input className="input-field" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                      <div><label className="field-label">Email</label><input className="input-field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                      <div><label className="field-label">Notes</label><textarea className="input-field" rows={2} style={{ resize: "vertical" }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3 pb-2" style={{ color: "var(--warm-light)", borderBottom: "1px solid var(--border)" }}>Membership</p>
                    <div className="space-y-3">
                      <div><label className="field-label">Access Code</label><input className="input-field" value={form.access_code} onChange={(e) => setForm({ ...form, access_code: e.target.value })} /></div>
                      <div>
                        <label className="field-label">Card Issue Date</label>
                        <input className="input-field" type="date" value={form.card_issue_date} onChange={(e) => handleIssueDateChange(e.target.value)} />
                        {form.expiry_date && <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>◈ Expiry: <span style={{ color: "var(--warm-light)", fontWeight: 600 }}>{form.expiry_date}</span></p>}
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                        <input type="checkbox" id="fc_edit" checked={form.free_coffee}
                          onChange={(e) => setForm({ ...form, free_coffee: e.target.checked })}
                          style={{ width: 14, height: 14, accentColor: "var(--warm)" }} />
                        <label htmlFor="fc_edit" className="text-xs font-medium cursor-pointer" style={{ color: "var(--text)" }}>☕ Free Coffee Entitlement</label>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Basic info */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--warm-light)" }}>Basic Info</p>
                    <div className="rounded overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                      {[
                        { label: "First Name",   value: customer.first_name ?? "—" },
                        { label: "Middle Name",  value: customer.middle_name ?? "—" },
                        { label: "Last Name",    value: customer.last_name ?? "—" },
                        { label: "Phone",        value: customer.phone },
                        { label: "Email",        value: customer.email ?? "—" },
                        { label: "Member Since", value: customer.payment_status === "submitted" || customer.payment_status === "rejected" ? "—" : format(new Date(customer.created_at), "MMMM d, yyyy") },                        { label: "Last Visit",   value: customer.last_visit ? format(new Date(customer.last_visit), "MMM d, yyyy · h:mm a") : "Never" },
                        { label: "Notes",        value: customer.notes ?? "—" },
                      ].map((row, i, arr) => (
                        <div key={row.label} className="flex gap-4 px-4 py-2.5"
                          style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none", background: i % 2 === 0 ? "var(--surface2)" : "transparent" }}>
                          <span className="text-xs font-semibold uppercase tracking-wider w-28 flex-shrink-0 pt-0.5" style={{ color: "var(--text-muted)" }}>{row.label}</span>
                          <span className="text-xs font-medium break-words" style={{ color: "var(--text)" }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Membership */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--warm-light)" }}>Membership</p>
                    <div className="rounded overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                      {/* Access code */}
                      <div className="flex items-center gap-4 px-4 py-2.5" style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                        <span className="text-xs font-semibold uppercase tracking-wider w-28 flex-shrink-0" style={{ color: "var(--text-muted)" }}>Access Code</span>
                        {customer.access_code
                          ? <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: "var(--surface3)", color: "var(--warm-light)", border: "1px solid var(--border2)" }}>{customer.access_code}</span>
                          : <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>}
                      </div>
                      {/* Card issued */}
                          {customer.payment_status !== "rejected" && customer.payment_status !== "submitted" && (
                          <div className="flex items-center gap-4 px-4 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                           <span className="text-xs font-semibold uppercase tracking-wider w-28 flex-shrink-0" style={{ color: "var(--text-muted)" }}>Card Issued</span>
                          <span className="text-xs font-medium" style={{ color: "var(--text)" }}>{customer.card_issue_date ? format(new Date(customer.card_issue_date), "MMMM d, yyyy") : "—"}</span>
                            </div>
                          )}
                          {/* Expiry */}
                          {customer.payment_status !== "rejected" && customer.payment_status !== "submitted" && (
                            <div className="flex items-center gap-4 px-4 py-2.5" style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                              <span className="text-xs font-semibold uppercase tracking-wider w-28 flex-shrink-0" style={{ color: "var(--text-muted)" }}>Expiry</span>
                              <span className="text-xs font-medium" style={{ color: isExpired ? "var(--text-muted)" : "var(--text)" }}>
                                {customer.expiry_date ? `${format(new Date(customer.expiry_date), "MMMM d, yyyy")}${isExpired ? " · Expired" : ""}` : "—"}
                              </span>
                            </div>
                          )}
                      {/* Free coffee row */}
                      <div className="flex items-center justify-between px-4 py-2.5"
                        style={{ background: customer.free_coffee ? "rgba(242,201,76,0.04)" : "transparent" }}>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-semibold uppercase tracking-wider w-28 flex-shrink-0" style={{ color: "var(--text-muted)" }}>Free Coffee</span>
                          <span className={`badge ${customer.free_coffee && !isExpired ? "badge-amber" : "badge-gray"}`}>
                          {customer.payment_status === "submitted"
                          ? "Eligible once approved"
                          : customer.payment_status === "rejected"
                          ? "Not Eligible"
                          : isExpired
                          ? "Not Eligible"
                          : customer.free_coffee
                          ? "☕ Entitled"
                          : "✓ Redeemed This Month"}
                            </span>
                        </div>
                            {customer.free_coffee && !redeemConfirm && !isExpired && customer.payment_status !== "submitted" && customer.payment_status !== "rejected" && customer.is_active && (                          <button className="btn" style={{ padding: "4px 10px", fontSize: 10, background: "rgba(242,201,76,0.1)", color: "var(--amber)", border: "1px solid rgba(242,201,76,0.3)" }}
                            onClick={() => setRedeemConfirm(true)}>
                            Redeem ☕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Redeem confirmation */}
                    {redeemConfirm && (
                      <div className="mt-3 p-4 rounded animate-slide-up"
                        style={{ background: "rgba(242,201,76,0.05)", border: "1px solid rgba(242,201,76,0.25)" }}>
                        <p className="text-xs font-bold mb-1" style={{ color: "var(--amber)" }}>☕ Confirm Redemption</p>
                        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                          Mark <strong style={{ color: "var(--text)" }}>{displayName}</strong>'s free coffee as used? This will be noted and cannot be undone.
                        </p>
                        <div className="flex gap-2">
                          <button className="btn btn-ghost flex-1 justify-center" style={{ fontSize: 11 }} onClick={() => setRedeemConfirm(false)} disabled={redeeming}>Cancel</button>
                          <button className="btn flex-1 justify-center" style={{ fontSize: 11, background: "var(--amber)", color: "#000", border: "none", fontWeight: 700 }}
                            onClick={handleRedeem} disabled={redeeming}>
                            {redeeming ? "Saving…" : "Confirm Redemption"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Visits ── */}
          {tab === "visits" && (
            <div>
              {loadingVisits ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded animate-pulse" style={{ background: "var(--surface2)" }} />)}</div>
              ) : visits.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-3xl mb-2 opacity-20">☕</div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>No visits recorded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {visits.map((v, i) => (
                    <div key={v.id} className="flex items-center justify-between p-3 rounded"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs w-5 text-center font-bold" style={{ color: "var(--text-faint)" }}>#{visits.length - i}</span>
                        <div>
                          <div className="text-xs font-semibold" style={{ color: "var(--text)" }}>{format(new Date(v.visited_at), "EEEE, MMMM d, yyyy")}</div>
                          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{format(new Date(v.visited_at), "h:mm a")}</div>
                        </div>
                      </div>
                      <span className="text-xs font-medium flex-shrink-0" style={{ color: "var(--warm-light)" }}>
                        {formatDistanceToNow(new Date(v.visited_at), { addSuffix: true })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── QR Code ── */}
          {tab === "qr" && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded overflow-hidden" style={{ background: "#FFF", border: "1px solid var(--border2)" }}>
                <div style={{ background: "#0A0A0A", padding: "12px 16px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#FFF", fontFamily: "Poppins, sans-serif" }}>{displayName}</div>
                  {customer.access_code && <div style={{ fontSize: 10, color: "#9A9080", marginTop: 2, letterSpacing: "0.08em" }}>CODE {customer.access_code}</div>}
                </div>
                {qrDataUrl
                  ? <img src={qrDataUrl} alt="QR Code" style={{ display: "block", width: 200, height: 200, margin: "16px auto" }} />
                  : <div className="w-48 h-48 m-4 animate-pulse rounded" style={{ background: "#F5F5F5" }} />
                }
                <div style={{ padding: "8px 16px 14px", textAlign: "center", background: "#FAFAF8" }}>
                  <p style={{ fontSize: 9, color: "#999", wordBreak: "break-all", fontFamily: "monospace" }}>{customer.qr_code}</p>
                </div>
              </div>

              <button className="btn btn-ghost w-full justify-center" onClick={handleDownloadQR}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Download QR as PNG
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
            <div className="flex gap-2 p-5 flex-shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
              {editing ? (
                <>
                  <button className="btn btn-ghost flex-1 justify-center" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
                  <button className="btn btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
                </>
              ) : (
                <>

                {customer.payment_status === "submitted" && (
                   <>
                  <button className="btn btn-primary flex-1 justify-center"
                    onClick={async () => {
                      if (!confirm(`Approve ${displayName}'s membership and activate their account?`)) return;
                      await supabase.from("customers").update({
                        is_active:      true,
                        payment_status: "approved",
                      }).eq("id", customer.id);

                      // Send approval email if customer has email
                      if (customer.email) {
                        await fetch("/api/send-approval-email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            email:     customer.email,
                            firstName: customer.first_name ?? customer.name,
                            lastName:  customer.last_name ?? "",
                          }),
                        });
                      }

                      onUpdate();
                    }}>
                    ✓ Approve
                  </button>
                  <button className="btn btn-danger"
                    onClick={async () => {
                      if (!confirm(`Reject ${displayName}'s registration?`)) return;
                      await supabase.from("customers").update({
                        payment_status: "rejected",
                      }).eq("id", customer.id);
                      onUpdate();
                    }}>
                    ✗ Reject
                  </button>
                </>
              )}
                <button className="btn btn-ghost" onClick={() => setEditing(true)}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      Edit
    </button>

    {customer.payment_status !== "submitted" && (
  <>
            {isExpired ? (
              <button className="btn btn-primary flex-1 justify-center" onClick={handleRenew}>
                🔄 Renew Card
              </button>
            ) : (
              <>
                <button className="btn btn-warm flex-1 justify-center" onClick={toggleActive}>
                  {customer.is_active ? "Deactivate" : "Activate"}
                </button>
               {customer.expiry_date && customer.payment_status !== "rejected" && customer.is_active &&(
                  <button className="btn btn-ghost flex-1 justify-center" onClick={handleExtend}>
                    + Extend 1yr
                  </button>
                )}
              </>
            )}
            <button className="btn btn-danger" onClick={deleteCustomer} title="Delete">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
            </button>
          </>
        )}
            </>
          )}
        </div>
      </div>

          {/* Screenshot Lightbox */}
{showScreenshot && customer.payment_screenshot && (
  <div
    style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)",
      zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}
    onClick={() => setShowScreenshot(false)}>
    <div style={{ position: "relative", maxWidth: 420, width: "100%" }}
      onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-3">
        <span style={{ color: "#FFF", fontSize: 13, fontWeight: 700 }}>Payment Screenshot</span>
        <button onClick={() => setShowScreenshot(false)}
          style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 6, padding: "4px 10px", color: "#FFF", cursor: "pointer", fontSize: 12 }}>
          Close ✕
        </button>
      </div>
      <img src={customer.payment_screenshot} alt="Payment proof"
        style={{ width: "100%", borderRadius: 12, display: "block" }} />
    </div>
  </div>
)}
      
    </div>
  );
}
