"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";


export default function SettingsPage() {
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving]                   = useState(false);
  const [successMsg, setSuccessMsg]           = useState("");
  const [errorMsg, setErrorMsg]               = useState("");
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleChangePassword() {
    setSuccessMsg("");
    setErrorMsg("");

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setErrorMsg("Failed to update password. Please try again.");
    } else {
      setSuccessMsg("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSaving(false);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#FAFAFA", fontFamily: "Poppins, sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0A0A0A", letterSpacing: "-0.02em", marginBottom: 6 }}>Settings</h1>
        <p style={{ fontSize: 13, color: "#888", marginBottom: 28 }}>Manage your staff account</p>

        <div style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: 12, padding: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", marginBottom: 20 }}>Change Password</p>

          {successMsg && (
            <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#166534" }}>
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#DC2626" }}>
              {errorMsg}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", display: "block", marginBottom: 6 }}>New Password</label>
            <input type="password"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #DDD", fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none" }}
              placeholder="Min. 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", display: "block", marginBottom: 6 }}>Confirm New Password</label>
            <input type="password"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #DDD", fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none" }}
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>

          <button onClick={handleChangePassword} disabled={saving}
            style={{ width: "100%", padding: "13px", borderRadius: 8, background: saving ? "#888" : "#0A0A0A", color: "#FFF", border: "none", fontFamily: "Poppins, sans-serif", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Updating…" : "Update Password"}
          </button>
        </div>
      </div>
    </main>
  );
}