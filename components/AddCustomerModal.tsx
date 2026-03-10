"use client";
import { useState } from "react";
import { supabase, type Customer, getDisplayName } from "@/lib/supabase";

interface Props { onClose: () => void; onSuccess: () => void; }

function generateQRString(firstName: string, lastName: string): string {
  const slug = `${firstName}-${lastName}`.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const ts = Date.now().toString(36);
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
    birthdate: "", gender: "", gender_other: "",
    access_code: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [newCustomer, setNewCustomer] = useState<Customer | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [tempPassword, setTempPassword] = useState("");


  function validate() {
    const e: Record<string, string> = {};
    if (!form.first_name.trim()) e.first_name = "First name is required";
    if (!form.last_name.trim()) e.last_name = "Last name is required";
    if (!form.phone.trim()) e.phone = "Phone is required";
    else if (!/^9[0-9]{9}$/.test(form.phone.trim())) e.phone = "Must start with 9 and be 10 digits";
    if (!form.email.trim()) e.email = "Email is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    setErrors(e);
    if (!form.birthdate.trim()) e.birthdate = "Birthdate is required";
    if (!form.gender.trim()) e.gender = "Please Select Your Gender";
    if (form.gender === "Others" && !form.gender_other.trim()) e.gender_other = "Please specify your gender";
    if (Object.keys(e).length > 0) return false;
    return true; 
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    setServerError("");

    // Check duplicate phone
    const { data: existingPhone } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", `+63${form.phone.trim()}`)
      .single();

    if (existingPhone) {
      setServerError("This phone number is already registered.");
      setLoading(false);
      return;
    }

    // Check duplicate email
    if (form.email.trim()) {
      const { data: existingEmail } = await supabase
        .from("customers")
        .select("id")
        .eq("email", form.email.trim())
        .single();

      if (existingEmail) {
        setServerError("This email is already registered.");
        setLoading(false);
        return;
      }
    }

    const qr_code = generateQRString(form.first_name, form.last_name);
    const fullName = `${form.first_name} ${form.middle_name ? form.middle_name + " " : ""}${form.last_name}`.trim();
    const today = new Date().toISOString().slice(0, 10);
    const expiry = addOneYear(today);
    const { data, error } = await supabase.from("customers").insert({
      name: fullName,
      first_name: form.first_name.trim(),
      middle_name: form.middle_name.trim() || null,
      last_name: form.last_name.trim(),
      phone: `+63${form.phone.trim()}`,
      email: form.email.trim() || null,
      notes: form.notes.trim() || null,
      access_code: form.access_code.trim() || null,
      card_issue_date: today,
      expiry_date: expiry,
      free_coffee: false,
      qr_code,
      is_active: false,
      password_changed: false,
      birthdate: form.birthdate || null,
      gender: form.gender === "Others" ? form.gender_other : form.gender || null,
    }).select().single();

    if (error) {
      setServerError(error.message.includes("unique") ? "This phone number is already registered." : error.message);
      setLoading(false);
      return;
    }
    // Create auth account if email provided
    if (form.email.trim()) {
      const res = await fetch("/api/create-customer-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim(), customerId: data.id }),
      });
      const authResult = await res.json();
      if (authResult.tempPassword) {
        setTempPassword(authResult.tempPassword);
      }
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
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6FCF97" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--green)" }}>Registered!</span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#FFF" }}>{getDisplayName(newCustomer)}</h2>
            <p className="text-xs mt-1" style={{ color: "#888" }}>{newCustomer.phone}</p>
          </div>
          <div className="p-5">
            <p className="text-xs mb-4 text-center font-medium" style={{ color: "var(--text-muted)" }}>QR code ready — download now.</p>
            {tempPassword && (
              <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 8, padding: "12px 16px", marginBottom: 16, textAlign: "center" }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#166534", marginBottom: 4 }}>Temporary Password</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: "#0A0A0A", letterSpacing: "0.05em" }}>{tempPassword}</p>
                <p style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Share this with the customer — they can change it after logging in.</p>
              </div>
            )}
            <div className="flex justify-center mb-4">
              <div className="rounded overflow-hidden" style={{ background: "#FFF", padding: 16, border: "1px solid var(--border2)" }}>
                {qrDataUrl
                  ? <img src={qrDataUrl} alt="QR Code" style={{ display: "block", width: 200, height: 200 }} />
                  : <div style={{ width: 200, height: 200, background: "#F5F5F5" }} />}
              </div>
            </div>
            <button className="btn btn-ghost w-full justify-center mb-2" onClick={handleDownload}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
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
                  <input className="input-field" placeholder="Dave Paul"
                    value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                  {errors.first_name && <p className="text-xs mt-1" style={{ color: "var(--red)" }}>{errors.first_name}</p>}
                </div>
                <div>
                  <label className="field-label">Middle Name</label>
                  <input className="input-field" placeholder="Bading"
                    value={form.middle_name} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="field-label">Last Name *</label>
                <input className="input-field" placeholder="Opren"
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
                <div style={{ display: "flex", border: `1px solid ${errors.phone ? "var(--red)" : "var(--border)"}`, borderRadius: 6, overflow: "hidden", background: "var(--surface)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 11px", background: "var(--surface2)", borderRight: "1px solid var(--border)", flexShrink: 0 }}>
                    <span style={{ fontSize: 16 }}>🇵🇭</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", fontFamily: "Poppins, sans-serif" }}>+63</span>
                  </div>
                  <input type="tel"
                    style={{ flex: 1, padding: "9px 11px", border: "none", fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none", background: "transparent", color: "var(--text)" }}
                    placeholder="9XX XXX XXXX" maxLength={10} value={form.phone}
                    onChange={(e) => { const val = e.target.value.replace(/\D/g, "").slice(0, 10); setForm({ ...form, phone: val }); }} />
                </div>
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
            
          {/* Personal Info */}
          <div style={{ background: "#FFF", borderRadius: 12, border: "1px solid #E5E5E5", padding: 20, marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", marginBottom: 14 }}>Personal Info</p>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", display: "block", marginBottom: 4 }}>Birthdate</label>
            <input type="date"
              style={{ width: "100%", padding: "9px 11px", borderRadius: 6, border: "1px solid #DDD", fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none" }}
              value={form.birthdate} onChange={(e) => setForm({ ...form, birthdate: e.target.value })} />
              {errors.birthdate && <p style={{ fontSize: 10, color: "#DC2626", marginTop: 3 }}>{errors.birthdate}</p>}
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", display: "block", marginBottom: 4 }}>Gender</label>
            <select style={{ width: "100%", padding: "9px 11px", borderRadius: 6, border: "1px solid #DDD", fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none", background: "#FFF" }}
              value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value, gender_other: "" })}>
              <option value="" disabled>Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Prefer not to say">Prefer not to say</option>
              <option value="Others">Others</option>
            </select>
            {form.gender === "Others" && (
              <input style={{ width: "100%", padding: "9px 11px", borderRadius: 6, border: "1px solid #DDD", fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none", marginTop: 8 }}
                placeholder="Please specify your gender"
                value={form.gender_other} onChange={(e) => setForm({ ...form, gender_other: e.target.value })} />
            )}
            {errors.gender && <p style={{ fontSize: 10, color: "#DC2626", marginTop: 3 }}>{errors.gender}</p>}  
            {errors.gender_other && <p style={{ fontSize: 10, color: "#DC2626", marginTop: 3 }}>{errors.gender_other}</p>}  
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
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-5 flex-shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
          <button className="btn btn-ghost flex-1 justify-center" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary flex-1 justify-center" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="animate-pulse">Saving…</span> : (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg> Register & Get QR</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
