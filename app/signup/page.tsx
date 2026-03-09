"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

function generateQRString(firstName: string, lastName: string): string {
  const slug = `${firstName}-${lastName}`.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const ts   = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `kapeguid-${slug}-${ts}${rand}`;
}

function addOneYear(dateStr: string): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

type Step = "form" | "payment" | "success";

export default function RegisterPage() {
  const [step, setStep]               = useState<Step>("form");
  const [uploading, setUploading]     = useState(false);
  const [serverError, setServerError] = useState("");
  const [registeredName, setRegisteredName] = useState("");
  const [screenshot, setScreenshot]   = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [form, setForm] = useState({
    first_name: "", middle_name: "", last_name: "",
    phone: "", email: "",
    birthdate: "", gender: "", gender_other: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!form.first_name.trim()) e.first_name = "First name is required";
    if (!form.last_name.trim())  e.last_name  = "Last name is required";
    if (!form.phone.trim())           e.phone = "Phone number is required";
    else if (!/^9[0-9]{9}$/.test(form.phone.trim())) e.phone = "Must start with 9 and be 10 digits (e.g. 9171234567)";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    setStep("payment");
  }

  function handleScreenshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
  }

  async function handleUploadProof() {
    if (!screenshot) return;
    setUploading(true);
    setServerError("");

    const today       = new Date().toISOString().slice(0, 10);
    const expiry      = addOneYear(today);
    const qr_code     = generateQRString(form.first_name, form.last_name);
    const fullName    = `${form.first_name} ${form.middle_name ? form.middle_name + " " : ""}${form.last_name}`.trim();
    const displayName = `${form.first_name}${form.middle_name ? " " + form.middle_name.charAt(0).toUpperCase() + "." : ""} ${form.last_name}`.trim();

    // Step 1 — Save customer as pending
    const { data, error } = await supabase.from("customers").insert({
      name:            fullName,
      first_name:      form.first_name.trim(),
      middle_name:     form.middle_name.trim() || null,
      last_name:       form.last_name.trim(),
      phone:            `+63${form.phone.trim()}`,
      email:           form.email.trim() || null,
      qr_code,
      card_issue_date: today,
      expiry_date:     expiry,
      free_coffee:     true,
      is_active:       false,
      visit_count:     0,
      payment_status:  "submitted",
      birthdate:       form.birthdate || null,
        gender:          form.gender === "Others" ? form.gender_other : form.gender || null,
    }).select().single();

    if (error) {
      setServerError(
        error.message.includes("unique")
          ? "This phone number is already registered."
          : "Something went wrong. Please try again."
      );
      setUploading(false);
      return;
    }

    // Step 2 — Upload screenshot
    const ext      = screenshot.name.split(".").pop();
    const filePath = `payment-proofs/${data.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("kapeguid-uploads")
      .upload(filePath, screenshot, { upsert: true });

    if (uploadError) {
      // Cleanup customer record if upload fails
      await supabase.from("customers").delete().eq("id", data.id);
      setServerError("Failed to upload screenshot. Please try again.");
      setUploading(false);
      return;
    }

    // Step 3 — Save screenshot URL to customer
    const { data: urlData } = supabase.storage
      .from("kapeguid-uploads")
      .getPublicUrl(filePath);

    await supabase.from("customers").update({
      payment_screenshot: urlData.publicUrl,
    }).eq("id", data.id);

    setRegisteredName(displayName);
    setStep("success");
    setUploading(false);
  }

  // ── Success screen ──
  if (step === "success") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
        style={{ background: "#FAFAFA", fontFamily: "Poppins, sans-serif" }}>
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "#F0FDF4", border: "2px solid #86EFAC" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0A0A0A", letterSpacing: "-0.02em" }}>
            Payment Submitted!
          </h1>
          <p style={{ fontSize: 13, color: "#666", marginTop: 8, lineHeight: 1.6 }}>
            Thank you, <strong style={{ color: "#0A0A0A" }}>{registeredName}</strong>!{" "}
            Your payment proof has been sent to our staff for verification.
            Once approved, your membership will be activated.
          </p>

          <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 12, padding: 16, marginTop: 24, textAlign: "left" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#92400E", marginBottom: 8 }}>What happens next?</p>
            <ul style={{ fontSize: 12, color: "#78350F", lineHeight: 2, paddingLeft: 16 }}>
              <li>Staff will verify your GCash payment</li>
              <li>Your membership will be activated within the day</li>
              <li>Visit the shop to get your QR membership card</li>
            </ul>
          </div>

          <p style={{ fontSize: 11, color: "#AAA", marginTop: 24 }}>Powered by KapeGuid</p>
        </div>
      </main>
    );
  }

  // ── Payment screen ──
  if (step === "payment") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
        style={{ background: "#FAFAFA", fontFamily: "Poppins, sans-serif" }}>
        <div className="w-full max-w-sm">

          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <span style={{ color: "#FFF", fontSize: 22, fontWeight: 900 }}>!</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0A0A0A", letterSpacing: "-0.02em" }}>
              Complete Payment
            </h1>
            <p style={{ fontSize: 13, color: "#666", marginTop: 6 }}>
              Pay <strong style={{ color: "#0A0A0A" }}>₱500</strong> via QR to activate your membership
            </p>
          </div>

          {/* GCash QR */}
            <div style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: 12, padding: 20, marginBottom: 16, textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", marginBottom: 4 }}>
                Scan to Pay via QR
            </p>
            <p style={{ fontSize: 20, fontWeight: 800, color: "#0A0A0A", marginBottom: 14 }}>₱500.00</p>
            <img src="/images/gcash-qr.png" alt="Payment QR Code"
                style={{ width: 220, height: 220, objectFit: "contain", borderRadius: 8, margin: "0 auto", display: "block" }} />
            <p style={{ fontSize: 12, color: "#888", marginTop: 12 }}>
                Scan QR → Enter <strong style={{ color: "#0A0A0A" }}>₱500</strong> → Pay
            </p>
            </div>
          {/* Instructions */}
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: 14, marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: "#166534", lineHeight: 1.7 }}>
              1. Open your <strong>PREFERRED APPLICATION</strong><br/>
              2. SCAN THE <strong>QR CODE</strong><br/>
              3. Take a <strong>screenshot</strong> of the confirmation<br/>
              4. Upload the screenshot below
            </p>
          </div>

          {/* Screenshot upload */}
          <div style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", marginBottom: 14 }}>
              Upload Payment Screenshot *
            </p>
            <label style={{
              display: "block", border: `2px dashed ${screenshot ? "#86EFAC" : "#DDD"}`,
              borderRadius: 8, padding: 20, textAlign: "center", cursor: "pointer",
              background: screenshot ? "#F0FDF4" : "#FAFAFA", transition: "all 0.2s",
            }}>
              <input type="file" accept="image/*" onChange={handleScreenshotChange} style={{ display: "none" }} />
              {screenshotPreview ? (
                <img src={screenshotPreview} alt="Preview" style={{ maxHeight: 200, maxWidth: "100%", borderRadius: 6, margin: "0 auto" }} />
              ) : (
                <>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="1.5" style={{ margin: "0 auto 8px" }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                  <p style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>Tap to upload screenshot</p>
                  <p style={{ fontSize: 11, color: "#AAA", marginTop: 4 }}>JPG, PNG accepted</p>
                </>
              )}
            </label>
          </div>

          {serverError && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#DC2626" }}>
              {serverError}
            </div>
          )}

          <button onClick={handleUploadProof} disabled={!screenshot || uploading}
            style={{
              width: "100%", padding: "14px", borderRadius: 8,
              background: !screenshot || uploading ? "#CCC" : "#0A0A0A",
              color: "#FFF", border: "none",
              fontFamily: "Poppins, sans-serif", fontSize: 13, fontWeight: 700,
              cursor: !screenshot || uploading ? "not-allowed" : "pointer",
            }}>
            {uploading ? "Submitting…" : "Submit Payment Proof"}
          </button>

          {/* Back button */}
          <button onClick={() => setStep("form")} disabled={uploading}
            style={{
              width: "100%", padding: "12px", borderRadius: 8, marginTop: 10,
              background: "transparent", color: "#888", border: "1px solid #DDD",
              fontFamily: "Poppins, sans-serif", fontSize: 13, fontWeight: 600,
              cursor: "pointer",
            }}>
            ← Go Back
          </button>

          <p style={{ textAlign: "center", fontSize: 11, color: "#AAA", marginTop: 16 }}>
            Powered by KapeGuid
          </p>
        </div>
      </main>
    );
  }

  // ── Registration form ──
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
      style={{ background: "#FAFAFA", fontFamily: "Poppins, sans-serif" }}>
      <div className="w-full max-w-sm">

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src="/images/logo.jpg" alt="KapeGuid" style={{ width: 80, height: 80, objectFit: "contain", borderRadius: 12, margin: "0 auto 14px" }} />
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0A0A0A", letterSpacing: "-0.02em" }}>
        Join <span style={{ color: "#3B1F00" }}>kapéople.</span>
        </h1>
          <p style={{ fontSize: 13, color: "#666", marginTop: 6 }}>
            Register as a member and get free coffee every month!
          </p>
          
        </div>

        {serverError && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#DC2626" }}>
            {serverError}
          </div>
        )}

        <div style={{ background: "#FFF", borderRadius: 12, border: "1px solid #E5E5E5", padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", marginBottom: 14 }}>Your Name</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", display: "block", marginBottom: 4 }}>First Name *</label>
              <input
                style={{ width: "100%", padding: "9px 11px", borderRadius: 6, border: `1px solid ${errors.first_name ? "#FCA5A5" : "#DDD"}`, fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none" }}
                placeholder="Juan" value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              {errors.first_name && <p style={{ fontSize: 10, color: "#DC2626", marginTop: 3 }}>{errors.first_name}</p>}
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", display: "block", marginBottom: 4 }}>Middle Name</label>
              <input
                style={{ width: "100%", padding: "9px 11px", borderRadius: 6, border: "1px solid #DDD", fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none" }}
                placeholder="Santos" value={form.middle_name}
                onChange={(e) => setForm({ ...form, middle_name: e.target.value })} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", display: "block", marginBottom: 4 }}>Last Name *</label>
            <input
              style={{ width: "100%", padding: "9px 11px", borderRadius: 6, border: `1px solid ${errors.last_name ? "#FCA5A5" : "#DDD"}`, fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none" }}
              placeholder="Dela Cruz" value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            {errors.last_name && <p style={{ fontSize: 10, color: "#DC2626", marginTop: 3 }}>{errors.last_name}</p>}
          </div>
        </div>

        <div style={{ background: "#FFF", borderRadius: 12, border: "1px solid #E5E5E5", padding: 20, marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", marginBottom: 14 }}>Contact Info</p>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", display: "block", marginBottom: 4 }}>Phone Number *</label>
            <div style={{ display: "flex", border: `1px solid ${errors.phone ? "#FCA5A5" : "#DDD"}`, borderRadius: 6, overflow: "hidden", background: "#FFF" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 11px", background: "#F5F5F5", borderRight: "1px solid #DDD", flexShrink: 0 }}>
                        <span style={{ fontSize: 16 }}>🇵🇭</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#444", fontFamily: "Poppins, sans-serif" }}>+63</span>
                    </div>
                    <input type="tel"
                        style={{ flex: 1, padding: "9px 11px", border: "none", fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none" }}
                        placeholder="9XX XXX XXXX"
                        maxLength={10}
                        value={form.phone}
                        onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setForm({ ...form, phone: val });
                        }} />
                    </div>
            {errors.phone && <p style={{ fontSize: 10, color: "#DC2626", marginTop: 3 }}>{errors.phone}</p>}
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", display: "block", marginBottom: 4 }}>Email Address</label>
            <input type="email"
              style={{ width: "100%", padding: "9px 11px", borderRadius: 6, border: `1px solid ${errors.email ? "#FCA5A5" : "#DDD"}`, fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none" }}
              placeholder="juan@email.com" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {errors.email && <p style={{ fontSize: 10, color: "#DC2626", marginTop: 3 }}>{errors.email}</p>}
        </div>
</div>

            {/* Personal Info */}
            <div style={{ background: "#FFF", borderRadius: 12, border: "1px solid #E5E5E5", padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", marginBottom: 14 }}>Personal Info</p>

            {/* Birthdate */}
            <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", display: "block", marginBottom: 4 }}>Birthdate</label>
                <input type="date"
                style={{ width: "100%", padding: "9px 11px", borderRadius: 6, border: "1px solid #DDD", fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none" }}
                value={form.birthdate}
                onChange={(e) => setForm({ ...form, birthdate: e.target.value })} />
            </div>

            {/* Gender */}
                <div>
                <label style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", display: "block", marginBottom: 4 }}>Gender</label>
                <select
                    style={{ width: "100%", padding: "9px 11px", borderRadius: 6, border: "1px solid #DDD", fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none", background: "#FFF", color: form.gender ? "#0A0A0A" : "#AAA" }}
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value, gender_other: "" })}>
                    <option value="" disabled>Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                    <option value="Others">Others</option>
                </select>
                {form.gender === "Others" && (
                    <input
                    style={{ width: "100%", padding: "9px 11px", borderRadius: 6, border: "1px solid #DDD", fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none", marginTop: 8 }}
                    placeholder="Please specify your gender"
                    value={form.gender_other}
                    onChange={(e) => setForm({ ...form, gender_other: e.target.value })} />
                )}
                </div>
            </div>

            <button onClick={handleSubmit}
          style={{
            width: "100%", padding: "14px", borderRadius: 8,
            background: "#0A0A0A", color: "#FFF", border: "none",
            fontFamily: "Poppins, sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>
          Continue to Payment →
        </button>

        <p style={{ textAlign: "center", fontSize: 11, color: "#AAA", marginTop: 16 }}>
          Powered by KapeGuid
        </p>
      </div>
    </main>
  );
}