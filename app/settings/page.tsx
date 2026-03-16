"use client";
import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving]                   = useState(false);
  const [successMsg, setSuccessMsg]           = useState("");
  const [errorMsg, setErrorMsg]               = useState("");
  const [showCurrent, setShowCurrent]         = useState(false);
  const [showNew, setShowNew]                 = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);

  async function handleChangePassword() {
    setSuccessMsg("");
    setErrorMsg("");

    if (!currentPassword) { setErrorMsg("Please enter your current password."); return; }
    if (!newPassword || newPassword.length < 6) { setErrorMsg("New password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setErrorMsg("Passwords do not match."); return; }
    if (currentPassword === newPassword) { setErrorMsg("New password must be different from your current password."); return; }

    setSaving(true);

    // Verify current password by re-signing in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setErrorMsg("Could not verify your account."); setSaving(false); return; }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      setErrorMsg("Current password is incorrect.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setErrorMsg("Failed to update password. Please try again.");
    } else {
      setSuccessMsg("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", fontFamily: "Poppins, sans-serif" }}>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--warm-light)" }}>Account</p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>Settings</h1>
        </div>

        <div style={{ maxWidth: 460 }}>
          <div className="surface rounded" style={{ padding: 24 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 20 }}>
              Change Password
            </p>

            {successMsg && (
              <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#166534" }}>
                ✓ {successMsg}
              </div>
            )}
            {errorMsg && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#DC2626" }}>
                {errorMsg}
              </div>
            )}

            {/* Current Password */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Current Password</label>
              <div style={inputWrapStyle}>
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  style={inputStyle}
                />
                <button type="button" onClick={() => setShowCurrent(p => !p)} style={eyeStyle}>
                  {showCurrent ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>New Password</label>
              <div style={inputWrapStyle}>
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  style={inputStyle}
                />
                <button type="button" onClick={() => setShowNew(p => !p)} style={eyeStyle}>
                  {showNew ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Confirm New Password</label>
              <div style={inputWrapStyle}>
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  style={inputStyle}
                />
                <button type="button" onClick={() => setShowConfirm(p => !p)} style={eyeStyle}>
                  {showConfirm ? "🙈" : "👁️"}
                </button>
              </div>
              {/* Password match indicator */}
              {confirmPassword.length > 0 && (
                <p style={{ fontSize: 11, marginTop: 6, color: newPassword === confirmPassword ? "#166534" : "#DC2626", fontWeight: 600 }}>
                  {newPassword === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                </p>
              )}
            </div>

            <button onClick={handleChangePassword} disabled={saving}
              style={{ width: "100%", padding: "13px", borderRadius: 8, background: saving ? "#888" : "#3B1F00", color: "#FFF", border: "none", fontFamily: "Poppins, sans-serif", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Updating…" : "Update Password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.08em", color: "var(--text-muted)",
  display: "block", marginBottom: 6,
};

const inputWrapStyle: React.CSSProperties = {
  display: "flex", alignItems: "center",
  border: "1px solid var(--border)", borderRadius: 6,
  background: "var(--surface)", overflow: "hidden",
};

const inputStyle: React.CSSProperties = {
  flex: 1, padding: "10px 12px", border: "none",
  fontSize: 13, fontFamily: "Poppins, sans-serif",
  outline: "none", background: "transparent",
  color: "var(--text)",
};

const eyeStyle: React.CSSProperties = {
  padding: "0 12px", background: "transparent", border: "none",
  cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center",
};