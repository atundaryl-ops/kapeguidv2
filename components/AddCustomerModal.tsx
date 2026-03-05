"use client";
import { useState } from "react";
import { supabase, type Customer } from "@/lib/supabase";
import Link from "next/link";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

function generateQRString(name: string): string {
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `kapeguid-${slug}-${ts}${rand}`;
}

export default function AddCustomerModal({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [newCustomer, setNewCustomer] = useState<Customer | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.phone.trim()) e.phone = "Phone is required";
    else if (!/^[0-9+\-\s()]{7,15}$/.test(form.phone.trim())) e.phone = "Invalid phone number";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    setServerError("");

    const qr_code = generateQRString(form.name);

    const { data, error } = await supabase.from("customers").insert({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      notes: form.notes.trim() || null,
      qr_code,
      is_active: true,
    }).select().single();

    if (error) {
      setServerError(error.message.includes("unique") ? "This phone number is already registered." : error.message);
      setLoading(false);
      return;
    }

    // Generate QR image right away
    const QRCode = await import("qrcode");
    const url = await QRCode.toDataURL(qr_code, {
      width: 280,
      margin: 2,
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
    a.download = `kapeguid-${newCustomer.name.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  }

  // ── Success step: show QR immediately ──
  if (step === "success" && newCustomer) {
    return (
      <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="w-full max-w-md rounded-sm animate-slide-up overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--border2)" }}>

          {/* Success header */}
          <div style={{ background: "#0A0A0A", padding: "20px", position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
              backgroundSize: "14px 14px",
            }} />
            <div style={{ position: "relative" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(74,222,128,0.2)", border: "1px solid rgba(74,222,128,0.4)" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <span className="text-xs uppercase tracking-widest" style={{ color: "var(--green)" }}>Customer Registered!</span>
              </div>
              <h2 className="font-display text-2xl font-bold" style={{ color: "#FFFFFF" }}>{newCustomer.name}</h2>
              <p className="text-xs mt-1" style={{ color: "#9A9080" }}>{newCustomer.phone}</p>
            </div>
          </div>

          {/* QR code display */}
          <div className="p-5">
            <p className="text-xs mb-4 text-center" style={{ color: "var(--text-muted)" }}>
              Their unique QR code is ready. Print or save it now.
            </p>

            {/* Mini card preview */}
            <div className="flex justify-center mb-4">
              <div className="rounded-sm overflow-hidden"
                style={{ background: "#FFFFFF", padding: 16, border: "1px solid var(--border2)", display: "inline-block" }}>
                {qrDataUrl
                  ? <img src={qrDataUrl} alt="QR Code" style={{ display: "block", width: 200, height: 200 }} />
                  : <div style={{ width: 200, height: 200, background: "#F5F5F5" }} />
                }
              </div>
            </div>

            <p className="text-center text-xs mb-4" style={{ color: "var(--text-faint)", wordBreak: "break-all", fontFamily: "monospace" }}>
              {newCustomer.qr_code}
            </p>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button className="btn btn-ghost justify-center" onClick={handleDownload}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Download QR
              </button>
              <Link href={`/customers/${newCustomer.id}/qr`} target="_blank"
                className="btn btn-warm justify-center" style={{ textDecoration: "none" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Print Card
              </Link>
            </div>

            <button className="btn btn-primary w-full justify-center" onClick={onSuccess}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form step ──
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-sm animate-slide-up"
        style={{ background: "var(--surface)", border: "1px solid var(--border2)" }}>

        <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 className="font-display text-xl font-bold" style={{ color: "var(--text)" }}>Add Customer</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Register a new café member</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-sm"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {serverError && (
            <div className="p-3 rounded-sm text-xs"
              style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--red)" }}>
              {serverError}
            </div>
          )}

          <div>
            <label className="field-label">Full Name *</label>
            <input className="input-field" placeholder="Juan dela Cruz"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {errors.name && <p className="text-xs mt-1" style={{ color: "var(--red)" }}>{errors.name}</p>}
          </div>

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
            <textarea className="input-field" placeholder="Preferred order, allergies, etc." rows={3} style={{ resize: "vertical" }}
              value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="p-3 rounded-sm" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              <span style={{ color: "var(--warm)" }}>◈</span> After saving, you'll see their QR code instantly — ready to print or download.
            </p>
          </div>
        </div>

        <div className="flex gap-3 p-5" style={{ borderTop: "1px solid var(--border)" }}>
          <button className="btn btn-ghost flex-1 justify-center" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary flex-1 justify-center" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="animate-pulse">Generating…</span> : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Register & Get QR
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
