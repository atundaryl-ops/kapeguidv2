"use client";
import { useState } from "react";
import { supabase, type Customer, getDisplayName } from "@/lib/supabase";

interface Props { onClose: () => void; onSuccess: () => void; }

function generateQRString(firstName: string, lastName: string): string {
  const slug = `${firstName}-${lastName}`.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const ts   = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `kapeguid-${slug}-${ts}${rand}`;
}

function addOneYear(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export default function AddCustomerModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [form, setForm] = useState({
    first_name: "", middle_name: "", last_name: "",
    phone: "", email: "", notes: "",
    access_code: "", card_issue_date: "", expiry_date: "", free_coffee: false,
  });
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [loading, setLoading]         = useState(false);
  const [serverError, setServerError] = useState("");
  const [newCustomer, setNewCustomer] = useState<Customer | null>(null);
  const [qrDataUrl, setQrDataUrl]     = useState("");

  function handleIssueDateChange(val: string) {
    setForm({ ...form, card_issue_date: val, expiry_date: addOneYear(val) });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.first_name.trim()) e.first_name = "First name is required";
    if (!form.last_name.trim())  e.last_name  = "Last name is required";
    if (!form.phone.trim())      e.phone      = "Phone is required";
    else if (!/^[0-9+\-\s()]{7,15}$/.test(form.phone.trim())) e.phone = "Invalid phone number";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    setServerError("");

    const qr_code    = generateQRString(form.first_name, form.last_name);
    const fullName   = `${form.first_name} ${form.middle_name ? form.middle_name + " " : ""}${form.last_name}`.trim();

    const { data, error } = await supabase.from("customers").insert({
      name:            fullName,
      first_name:      form.first_name.trim(),
      middle_name:     form.middle_name.trim() || null,
      last_name:       form.last_name.trim(),
      phone:           form.phone.trim(),
      email:           form.email.trim() || null,
      notes:           form.notes.trim() || null,
      access_code:     form.access_code.trim() || null,
      card_issue_date: form.card_issue_date || null,
      expiry_date:     form.expiry_date || null,
      free_coffee:     form.free_coffee,
      qr_code,
      is_active: true,
    }).select().single();

    if (error) {
      setServerError(error.message.includes("unique") ? "This phone number is already registered." : error.message);
      setLoading(false);
      return;
    }

    const QRCode = await import("qrcode");
    const url = await QRCode.toDataURL(qr_code, {
      width: 280, margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
      errorCorrectionLevel: "H",
    });
    setQrDataUrl(url);
    setNewCustomer(data as Customer);
    setStep("success");
    setLoading(false);
  }

  function handleDownload() {
    if (!qrDataUrl || !newCustomer) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `kapeguid-${newCustomer.last_name ?? newCustomer.name}.png`;
    a.click();
  }

  // ── Success step ──
  if (step === "success" && newCustomer) {
    return (
      <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="w-full max-w-md rounded overflow-hidden animate-slide-up"
          style={{ background: "var(--surface)", border: "1px solid var(--border2)" }}>
          <div style={{ background: "#111", padding: "20px" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "rgba(111,207,151,0.2)", border: "1px solid rgba(111,207,151,0.4)" }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6FCF97" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--green)" }}>Registered!</span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#FFF" }}>{getDisplayName(newCustomer)}</h2>
            <p className="text-xs mt-1" style={{ color: "#888" }}>{newCustomer.phone}</p>
          </div>
          <div className="p-5">
            <p className="text-xs mb-4 text-center font-medium" style={{ color: "var(--text-muted)" }}>QR code ready — download now.</p>
            <div className="flex justify-center mb-4">
              <div className="rounded overflow-hidden" style={{ background: "#FFF", padding: 16, border: "1px solid var(--border2)" }}>
                {qrDataUrl
                  ? <img src={qrDataUrl} alt="QR Code" style={{ display: "block", width: 200, height: 200 }} />
                  : <div style={{ width: 200, height: 200, background: "#F5F5F5" }} />}
              </div>
            </div>
            <button className="btn btn-ghost w-full justify-center mb-2" onClick={handleDownload}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              Download QR
            </button>
            <button className="btn btn-primary w-full justify-center" onClick={onSuccess}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form step ──
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded overflow-hidden animate-slide-up"
        style={{ background: "var(--surface)", border: "1px solid var(--border2)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>

        <div className="flex items-center justify-between p-5 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>Add Customer</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Register a new café member</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {serverError && (
            <div className="p-3 rounded text-xs" style={{ background: "rgba(235,87,87,0.08)", border: "1px solid rgba(235,87,87,0.2)", color: "var(--red)" }}>
              {serverError}
            </div>
          )}

          {/* Name fields */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-3 pb-2"
              style={{ color: "var(--warm-light)", borderBottom: "1px solid var(--border)" }}>Name</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">First Name *</label>
                  <input className="input-field" placeholder="Juan"
                    value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                  {errors.first_name && <p className="text-xs mt-1" style={{ color: "var(--red)" }}>{errors.first_name}</p>}
                </div>
                <div>
                  <label className="field-label">Middle Name</label>
                  <input className="input-field" placeholder="Santos"
                    value={form.middle_name} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="field-label">Last Name *</label>
                <input className="input-field" placeholder="Dela Cruz"
                  value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                {errors.last_name && <p className="text-xs mt-1" style={{ color: "var(--red)" }}>{errors.last_name}</p>}
              </div>
              {/* Preview */}
              {(form.first_name || form.last_name) && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Display: <span style={{ color: "var(--warm-light)", fontWeight: 600 }}>
                    {form.first_name}{form.middle_name ? ` ${form.middle_name.charAt(0).toUpperCase()}.` : ""}{form.last_name ? ` ${form.last_name}` : ""}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-3 pb-2"
              style={{ color: "var(--warm-light)", borderBottom: "1px solid var(--border)" }}>Contact</p>
            <div className="space-y-3">
              <div>
                <label className="field-label">Phone Number *</label>
                <input className="input-field" placeholder="+63 912 345 6789" type="tel"
                  value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                {errors.phone && <p className="text-xs mt-1" style={{ color: "var(--red)" }}>{errors.phone}</p>}
              </div>
              <div>
                <label className="field-label">Email Address</label>
                <input className="input-field" placeholder="juan@email.com" type="email"
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                {errors.email && <p className="text-xs mt-1" style={{ color: "var(--red)" }}>{errors.email}</p>}
              </div>
              <div>
                <label className="field-label">Notes</label>
                <textarea className="input-field" placeholder="Preferred order, allergies, etc." rows={2}
                  style={{ resize: "vertical" }} value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Membership */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-3 pb-2"
              style={{ color: "var(--warm-light)", borderBottom: "1px solid var(--border)" }}>Membership</p>
            <div className="space-y-3">
              <div>
                <label className="field-label">Access Code</label>
                <input className="input-field" placeholder="e.g. 0143"
                  value={form.access_code} onChange={(e) => setForm({ ...form, access_code: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Card Issue Date</label>
                <input className="input-field" type="date"
                  value={form.card_issue_date} onChange={(e) => handleIssueDateChange(e.target.value)} />
                {form.expiry_date && (
                  <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                    ◈ Expiry auto-set to: <span style={{ color: "var(--warm-light)", fontWeight: 600 }}>{form.expiry_date}</span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 p-3 rounded"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <input type="checkbox" id="free_coffee" checked={form.free_coffee}
                  onChange={(e) => setForm({ ...form, free_coffee: e.target.checked })}
                  style={{ width: 14, height: 14, accentColor: "var(--warm)" }} />
                <label htmlFor="free_coffee" className="text-xs font-medium cursor-pointer" style={{ color: "var(--text)" }}>
                  ☕ Free Coffee Entitlement
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-5 flex-shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
          <button className="btn btn-ghost flex-1 justify-center" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary flex-1 justify-center" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="animate-pulse">Saving…</span> : (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg> Register & Get QR</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
