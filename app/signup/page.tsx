"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { supabaseBrowser as supabase } from "@/lib/supabase";

function generateQRString(firstName: string, lastName: string): string {
  const slug = `${firstName}-${lastName}`.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `kapeguid-${slug}-${ts}${rand}`;
}

function addOneYear(dateStr: string): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

type Step = "details" | "account" | "verify" | "payment" | "success";


export default function SignupPage() {
  const [step, setStep] = useState<Step>("details");
  const [uploading, setUploading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [registeredName, setRegisteredName] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [userId, setuserId] = useState("");

  const [form, setForm] = useState({
    first_name: "", middle_name: "", last_name: "",
    phone: "", email: "", password: "", confirmPassword: "",
    birthdate: "", gender: "", gender_other: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function validateDetails() {
    const e: Record<string, string> = {};
    if (!form.first_name.trim()) e.first_name = "First name is required";
    if (!form.last_name.trim()) e.last_name = "Last name is required";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    else if (!/^9[0-9]{9}$/.test(form.phone.trim())) e.phone = "Must start with 9 and be 10 digits";
    setErrors(e);
    if (!form.birthdate.trim()) e.birthdate = "Birthdate is required";
    if (!form.gender.trim()) e.gender = "Please Select Your Gender";
    if (form.gender === "Others" && !form.gender_other.trim()) e.gender_other = "Please specify your gender";
    if (Object.keys(e).length > 0) return false;

    // Check duplicate phone
    const { data: existingPhone } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", `+63${form.phone.trim()}`)
      .maybeSingle();

    if (existingPhone) {
      setServerError("This phone number is already registered. Please use a different one.");
      setUploading(false);
      return;
    }
    return true;
  }

  function validateAccount() {
    const e: Record<string, string> = {};
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 6) e.password = "Password must be at least 6 characters";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleCreateAccount() {
    if (!validateAccount()) return;
    setUploading(true);
    setServerError("");

    // Just check if email already exists in customers table
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("email", form.email.trim())
      .maybeSingle();

    if (existing) {
      setServerError("This email is already registered. Please log in instead.");
      setUploading(false);
      return;
    }

    setStep("payment");
    setUploading(false);
  }

  async function handleVerify() {
    setUploading(true);
    setServerError("");

    const { error } = await supabase.auth.verifyOtp({
      email: form.email.trim(),
      token: verifyCode.trim(),
      type: "signup",
    });

    if (error) {
      setServerError("Invalid or expired code. Please check your email and try again.");
      setUploading(false);
      return;
    }

    setStep("payment");
    setUploading(false);
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

    // Create auth user here
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
    });

    if (authError) {
      setServerError("Something went wrong creating your account. Please go back and try again.");
      setUploading(false);
      return;
    }

    const userId = authData.user?.id ?? null;

    const today = new Date().toISOString().slice(0, 10);
    const expiry = addOneYear(today);
    const qr_code = generateQRString(form.first_name, form.last_name);
    const fullName = `${form.first_name} ${form.middle_name ? form.middle_name + " " : ""}${form.last_name}`.trim();
    const displayName = `${form.first_name}${form.middle_name ? " " + form.middle_name.charAt(0).toUpperCase() + "." : ""} ${form.last_name}`.trim();

    const { data, error } = await supabase.from("customers").insert({
      name: fullName,
      first_name: form.first_name.trim(),
      middle_name: form.middle_name.trim() || null,
      last_name: form.last_name.trim(),
      phone: `+63${form.phone.trim()}`,
      email: form.email.trim(),
      qr_code,
      card_issue_date: today,
      expiry_date: expiry,
      free_coffee: true,
      is_active: false,
      visit_count: 0,
      payment_status: "submitted",
      birthdate: form.birthdate || null,
      gender: form.gender === "Others" ? form.gender_other : form.gender || null,
      auth_id: userId,
    }).select().single();

    if (error) {
      setServerError(
        error.code === "23505"
          ? "This phone number or email is already registered. Please log in instead."
          : "Something went wrong. Please try again."
      );
      setUploading(false);
      return;
    }

    const ext = screenshot.name.split(".").pop();
    const filePath = `payment-proofs/${data.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("kapeguid-uploads")
      .upload(filePath, screenshot, { upsert: true });

    if (uploadError) {
      await supabase.from("customers").delete().eq("id", data.id);
      setServerError("Failed to upload screenshot. Please try again.");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("kapeguid-uploads").getPublicUrl(filePath);
    await supabase.from("customers").update({ payment_screenshot: urlData.publicUrl }).eq("id", data.id);

    setRegisteredName(displayName);
    setStep("success");
    setUploading(false);
  }

  // ── Success ──
  if (step === "success") {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", background: "#FAFAFA", fontFamily: "Poppins, sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F0FDF4", border: "2px solid #86EFAC", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0A0A0A", letterSpacing: "-0.02em" }}>Payment Submitted!</h1>
          <p style={{ fontSize: 13, color: "#666", marginTop: 8, lineHeight: 1.6 }}>
            Thank you, <strong style={{ color: "#0A0A0A" }}>{registeredName}</strong>! Your payment proof has been sent to our staff. Once approved, your membership will be activated.
          </p>
          <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 12, padding: 16, marginTop: 24, textAlign: "left" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#92400E", marginBottom: 8 }}>What happens next?</p>
            <ul style={{ fontSize: 12, color: "#78350F", lineHeight: 2, paddingLeft: 16 }}>
              <li>Staff will verify your GCash payment</li>
              <li>Your membership will be activated within the day</li>
              <li>Log in to view your membership card</li>
            </ul>
          </div>
          <a href="/login" style={{ display: "block", marginTop: 24, padding: "13px", borderRadius: 8, background: "#0A0A0A", color: "#FFF", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
            Go to Login
          </a>
          <p style={{ fontSize: 11, color: "#AAA", marginTop: 16 }}>Powered by KapeGuid</p>
        </div>
      </main>
    );
  }

  // ── Verify email ──
  if (step === "verify") {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", background: "#FAFAFA", fontFamily: "Poppins, sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0A0A0A", letterSpacing: "-0.02em" }}>Check your email</h1>
            <p style={{ fontSize: 13, color: "#666", marginTop: 6, lineHeight: 1.6 }}>
              We sent a verification code to<br />
              <strong style={{ color: "#0A0A0A" }}>{form.email}</strong>
            </p>
          </div>

          {serverError && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#DC2626" }}>
              {serverError}
            </div>
          )}

          <div style={{ background: "#FFF", borderRadius: 12, border: "1px solid #E5E5E5", padding: 24, marginBottom: 16 }}>
            <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", display: "block", marginBottom: 6 }}>Verification Code</label>
            <input
              style={{ width: "100%", padding: "12px", borderRadius: 6, border: "1px solid #DDD", fontSize: 20, fontFamily: "Poppins, sans-serif", outline: "none", textAlign: "center", letterSpacing: "0.2em", fontWeight: 700 }}
              placeholder="000000"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>

          <button onClick={handleVerify} disabled={verifyCode.length < 6 || uploading}
            style={{
              width: "100%", padding: "13px", borderRadius: 8,
              background: verifyCode.length < 6 || uploading ? "#CCC" : "#0A0A0A",
              color: "#FFF", border: "none", fontFamily: "Poppins, sans-serif",
              fontSize: 13, fontWeight: 700, cursor: verifyCode.length < 6 || uploading ? "not-allowed" : "pointer",
              marginBottom: 12,
            }}>
            {uploading ? "Verifying…" : "Verify Email"}
          </button>

          <button onClick={() => setStep("account")}
            style={{ width: "100%", padding: "12px", borderRadius: 8, background: "transparent", color: "#888", border: "1px solid #DDD", fontFamily: "Poppins, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            ← Go Back
          </button>
          <p style={{ textAlign: "center", fontSize: 11, color: "#AAA", marginTop: 16 }}>Powered by KapeGuid</p>
        </div>
      </main>
    );
  }

  // ── Payment ──
  if (step === "payment") {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", background: "#FAFAFA", fontFamily: "Poppins, sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <span style={{ color: "#FFF", fontSize: 22, fontWeight: 900 }}>!</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0A0A0A", letterSpacing: "-0.02em" }}>Complete Payment</h1>
            <p style={{ fontSize: 13, color: "#666", marginTop: 6 }}>Pay <strong style={{ color: "#0A0A0A" }}>₱500</strong> via GCash to activate your membership</p>
          </div>

          <div style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: 12, padding: 20, marginBottom: 16, textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", marginBottom: 4 }}>Scan to Pay via GCash</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: "#0A0A0A", marginBottom: 14 }}>₱500.00</p>
            <img src="/images/gcash-qr.png" alt="GCash QR Code" style={{ width: 220, height: 220, objectFit: "contain", borderRadius: 8, margin: "0 auto", display: "block" }} />
            <p style={{ fontSize: 12, color: "#888", marginTop: 12 }}>Open GCash → Scan QR → Enter <strong style={{ color: "#0A0A0A" }}>₱500</strong> → Pay</p>
          </div>

          <div style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", marginBottom: 14 }}>Upload Payment Screenshot *</p>
            <label style={{ display: "block", border: `2px dashed ${screenshot ? "#86EFAC" : "#DDD"}`, borderRadius: 8, padding: 20, textAlign: "center", cursor: "pointer", background: screenshot ? "#F0FDF4" : "#FAFAFA" }}>
              <input type="file" accept="image/*" onChange={handleScreenshotChange} style={{ display: "none" }} />
              {screenshotPreview ? (
                <img src={screenshotPreview} alt="Preview" style={{ maxHeight: 200, maxWidth: "100%", borderRadius: 6, margin: "0 auto" }} />
              ) : (
                <>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#AAA" strokeWidth="1.5" style={{ margin: "0 auto 8px" }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
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
            style={{ width: "100%", padding: "14px", borderRadius: 8, background: !screenshot || uploading ? "#CCC" : "#0A0A0A", color: "#FFF", border: "none", fontFamily: "Poppins, sans-serif", fontSize: 13, fontWeight: 700, cursor: !screenshot || uploading ? "not-allowed" : "pointer", marginBottom: 10 }}>
            {uploading ? "Submitting…" : "Submit Payment Proof"}
          </button>

          <p style={{ textAlign: "center", fontSize: 11, color: "#AAA", marginTop: 16 }}>Powered by KapeGuid</p>
        </div>
      </main>
    );
  }

  // ── Account step ──
  if (step === "account") {
    return (
      <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", background: "#FAFAFA", fontFamily: "Poppins, sans-serif" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0A0A0A", letterSpacing: "-0.02em" }}>Create your account</h1>
            <p style={{ fontSize: 13, color: "#666", marginTop: 6 }}>Set up your email and password</p>
          </div>

          {serverError && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#DC2626" }}>
              {serverError}
            </div>
          )}

          <div style={{ background: "#FFF", borderRadius: 12, border: "1px solid #E5E5E5", padding: 24, marginBottom: 16 }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", display: "block", marginBottom: 6 }}>Email *</label>
              <input type="email"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: `1px solid ${errors.email ? "#FCA5A5" : "#DDD"}`, fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none" }}
                placeholder="juan@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
              {errors.email && <p style={{ fontSize: 10, color: "#DC2626", marginTop: 3 }}>{errors.email}</p>}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", display: "block", marginBottom: 6 }}>Password *</label>
              <input type="password"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: `1px solid ${errors.password ? "#FCA5A5" : "#DDD"}`, fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none" }}
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
              {errors.password && <p style={{ fontSize: 10, color: "#DC2626", marginTop: 3 }}>{errors.password}</p>}
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", display: "block", marginBottom: 6 }}>Confirm Password *</label>
              <input type="password"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: `1px solid ${errors.confirmPassword ? "#FCA5A5" : "#DDD"}`, fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none" }}
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
              {errors.confirmPassword && <p style={{ fontSize: 10, color: "#DC2626", marginTop: 3 }}>{errors.confirmPassword}</p>}
            </div>
          </div>

          <button onClick={handleCreateAccount} disabled={uploading}
            style={{ width: "100%", padding: "13px", borderRadius: 8, background: uploading ? "#888" : "#0A0A0A", color: "#FFF", border: "none", fontFamily: "Poppins, sans-serif", fontSize: 13, fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer", marginBottom: 10 }}>
            {uploading ? "Creating account…" : "Create Account →"}
          </button>

          <button onClick={() => setStep("details")}
            style={{ width: "100%", padding: "12px", borderRadius: 8, background: "transparent", color: "#888", border: "1px solid #DDD", fontFamily: "Poppins, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            ← Go Back
          </button>
          <p style={{ textAlign: "center", fontSize: 11, color: "#AAA", marginTop: 16 }}>Powered by KapeGuid</p>
        </div>
      </main>
    );
  }

  // ── Details step (default) ──
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", background: "#FAFAFA", fontFamily: "Poppins, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src="/images/logo.jpg" alt="KapeGuid" style={{ width: 80, height: 80, objectFit: "contain", borderRadius: 12, margin: "0 auto 14px" }} />
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0A0A0A", letterSpacing: "-0.02em" }}>
            Join <span style={{ color: "#3B1F00" }}>kapéople.</span>
          </h1>
          <p style={{ fontSize: 13, color: "#666", marginTop: 6 }}>Register as a member and get free coffee every month!</p>
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
              <input style={{ width: "100%", padding: "9px 11px", borderRadius: 6, border: `1px solid ${errors.first_name ? "#FCA5A5" : "#DDD"}`, fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none" }}
                placeholder="Juan" value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              {errors.first_name && <p style={{ fontSize: 10, color: "#DC2626", marginTop: 3 }}>{errors.first_name}</p>}
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", display: "block", marginBottom: 4 }}>Middle Name</label>
              <input style={{ width: "100%", padding: "9px 11px", borderRadius: 6, border: "1px solid #DDD", fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none" }}
                placeholder="Santos" value={form.middle_name}
                onChange={(e) => setForm({ ...form, middle_name: e.target.value })} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", display: "block", marginBottom: 4 }}>Last Name *</label>
            <input style={{ width: "100%", padding: "9px 11px", borderRadius: 6, border: `1px solid ${errors.last_name ? "#FCA5A5" : "#DDD"}`, fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none" }}
              placeholder="Dela Cruz" value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            {errors.last_name && <p style={{ fontSize: 10, color: "#DC2626", marginTop: 3 }}>{errors.last_name}</p>}
          </div>
        </div>

        <div style={{ background: "#FFF", borderRadius: 12, border: "1px solid #E5E5E5", padding: 20, marginBottom: 16 }}>
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
                placeholder="9XX XXX XXXX" maxLength={10} value={form.phone}
                onChange={(e) => { const val = e.target.value.replace(/\D/g, "").slice(0, 10); setForm({ ...form, phone: val }); }} />
            </div>
            {errors.phone && <p style={{ fontSize: 10, color: "#DC2626", marginTop: 3 }}>{errors.phone}</p>}
          </div>
        </div>

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

        <button onClick={async () => { setServerError(""); if (await validateDetails()) setStep("account"); }}
          style={{ width: "100%", padding: "14px", borderRadius: 8, background: "#0A0A0A", color: "#FFF", border: "none", fontFamily: "Poppins, sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          Continue →
        </button>

        <p style={{ textAlign: "center", fontSize: 12, color: "#888", marginTop: 16 }}>
          Already have an account?{" "}
          <a href="/login" style={{ color: "#3B1F00", fontWeight: 700, textDecoration: "none" }}>Log in</a>
        </p>
        <p style={{ textAlign: "center", fontSize: 11, color: "#AAA", marginTop: 8 }}>Powered by KapeGuid</p>
      </div>
    </main>
  );
}