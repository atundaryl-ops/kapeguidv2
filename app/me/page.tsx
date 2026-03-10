"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { supabaseBrowser as supabase } from "@/lib/supabase";

type Customer = {
    id: string;
    name: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    birthdate: string;
    gender: string;
    qr_code: string;
    is_active: boolean;
    payment_status: string;
    free_coffee: boolean;
    visit_count: number;
    card_issue_date: string;
    expiry_date: string;
    access_code: string;
    password_changed: boolean | null;
};

type Tab = "membership" | "profile" | "password";

export default function MePage() {
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>("membership");
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    // Password change
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const router = useRouter();


    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser();
            console.log("ME page - user:", user?.id);
            if (!user) { router.push("/login"); return; }

            const { data: staffData } = await supabase
                .from("staff")
                .select("role")
                .eq("id", user.id)
                .single();

            console.log("ME page - staffData:", staffData);

            if (staffData) { router.push("/dashboard"); return; }

            const { data, error } = await supabase
                .from("customers")
                .select("*")
                .eq("auth_id", user.id)
                .single();

            console.log("ME page - customer:", data, "error:", error);

            if (!data) { router.push("/login"); return; }
            setCustomer(data);
            setLoading(false);
        }
        load();
    }, []);

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
    }

    async function handleChangePassword() {
        setSuccessMsg("");
        setErrorMsg("");

        if (!newPassword || newPassword.length < 6) {
            setErrorMsg("New password must be at least 6 characters.");
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
            setSaving(false);
            return;
        }

        // Mark password as changed and activate account
        if (customer && !customer.password_changed) {
            await supabase
                .from("customers")
                .update({ password_changed: true, is_active: true, free_coffee: true })
                .eq("id", customer.id);

            setCustomer({ ...customer, password_changed: true, is_active: true, free_coffee: true });
        }

        setSuccessMsg("Password updated!");
        setNewPassword("");
        setConfirmPassword("");
        setSaving(false);
    }

    function getStatus() {
        if (!customer) return { label: "Unknown", color: "#888", bg: "#F5F5F5" };
        if (customer.payment_status === "submitted") return { label: "Pending Approval", color: "#92400E", bg: "#FFF7ED" };
        if (customer.payment_status === "rejected") return { label: "Rejected", color: "#DC2626", bg: "#FEF2F2" };
        if (customer.is_active) return { label: "Active", color: "#166534", bg: "#F0FDF4" };
        return { label: "Inactive", color: "#555", bg: "#F5F5F5" };
    }

    if (loading) {
        return (
            <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAFA", fontFamily: "Poppins, sans-serif" }}>
                <p style={{ color: "#888", fontSize: 14 }}>Loading...</p>
            </main>
        );
    }

    if (!customer) return null;
    const status = getStatus();

    return (
        <main style={{ minHeight: "100vh", background: "#FAFAFA", fontFamily: "Poppins, sans-serif" }}>

            {/* ── Top Nav ── */}
            <nav style={{ background: "#FFF", borderBottom: "1px solid #E5E5E5", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 40 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 30, height: 30, background: "#0A0A0A", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#FFF", fontWeight: 900, fontSize: 16, lineHeight: 1 }}>!</span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 16, color: "#0A0A0A", letterSpacing: "-0.02em" }}>
                        Kape<span style={{ color: "#3B1F00" }}>Guid</span>
                    </span>
                </div>
                <button onClick={handleLogout}
                    style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#888", background: "transparent", border: "1px solid #E5E5E5", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontFamily: "Poppins, sans-serif" }}>
                    Sign Out
                </button>
            </nav>

            <div style={{ maxWidth: 480, margin: "0 auto", padding: "32px 20px" }}>

                {/* ── Header ── */}
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                    <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#3B1F00", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                        <span style={{ color: "#FFF", fontWeight: 800, fontSize: 24 }}>
                            {customer.first_name?.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0A0A0A", letterSpacing: "-0.02em" }}>{customer.name}</h1>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: status.bg, border: `1px solid ${status.color}30`, borderRadius: 99, padding: "4px 12px", marginTop: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: status.color }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: status.color }}>{status.label}</span>
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div style={{ display: "flex", background: "#F0F0F0", borderRadius: 8, padding: 4, marginBottom: 24 }}>
                    {([
                        { key: "membership", label: "Membership" },
                        { key: "profile", label: "Profile" },
                        { key: "password", label: "Password" },
                    ] as { key: Tab; label: string }[]).map((t) => (
                        <button key={t.key} onClick={() => { setTab(t.key); setSuccessMsg(""); setErrorMsg(""); }}
                            style={{
                                flex: 1, padding: "8px 4px", borderRadius: 6, border: "none",
                                fontSize: 11, fontWeight: 700, cursor: "pointer",
                                fontFamily: "Poppins, sans-serif",
                                background: tab === t.key ? "#FFF" : "transparent",
                                color: tab === t.key ? "#0A0A0A" : "#888",
                                boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                                transition: "all 0.2s",
                            }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── Membership Tab ── */}
                {tab === "membership" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                        {/* Status cards */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: 12, padding: 16, textAlign: "center" }}>
                                <div style={{ fontSize: 28, fontWeight: 900, color: "#3B1F00" }}>{customer.visit_count ?? 0}</div>
                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", marginTop: 4 }}>Total Visits</div>
                            </div>
                            <div style={{
                                background: customer.payment_status === "submitted" ? "#FFF7ED" : customer.free_coffee ? "#F0FDF4" : "#F5F5F5",
                                border: `1px solid ${customer.payment_status === "submitted" ? "#FED7AA" : customer.free_coffee ? "#86EFAC" : "#E5E5E5"}`,
                                borderRadius: 12, padding: 16, textAlign: "center"
                            }}>
                                <div style={{ fontSize: 28 }}>
                                    {customer.payment_status === "submitted" ? "⏳" : customer.free_coffee ? "☕" : "—"}
                                </div>
                                <div style={{
                                    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4,
                                    color: customer.payment_status === "submitted" ? "#92400E" : customer.free_coffee ? "#166534" : "#888"
                                }}>
                                    {customer.payment_status === "submitted" ? "Eligible Once Approved" : customer.free_coffee ? "Free Coffee!" : "No Free Coffee"}
                                </div>
                            </div>
                        </div>

                        {!customer.password_changed && !customer.is_active && customer.payment_status !== "submitted" && (
                            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: 16, textAlign: "center" }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "#1D4ED8" }}>🔐 One more step!</p>
                                <p style={{ fontSize: 12, color: "#1E40AF", marginTop: 4, lineHeight: 1.6 }}>
                                    To activate your account, please go to the <strong>Password</strong> tab and change your password.
                                </p>
                                <button onClick={() => setTab("password")}
                                    style={{ marginTop: 12, padding: "8px 20px", borderRadius: 6, background: "#1D4ED8", color: "#FFF", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Poppins, sans-serif" }}>
                                    Change Password →
                                </button>
                            </div>
                        )}

                        {/* Card details */}
                        <div style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: 12, padding: 20 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", marginBottom: 14 }}>Membership Card</p>
                            {[
                                ["Member Since", customer.card_issue_date ? new Date(customer.card_issue_date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "—"],
                                ["Valid Until", customer.expiry_date ? new Date(customer.expiry_date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "—"],
                                ["Access Code", customer.access_code ?? "—"],
                            ].map(([label, value]) => (
                                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid #F5F5F5" }}>
                                    <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>{label}</span>
                                    <span style={{ fontSize: 13, color: "#0A0A0A", fontWeight: 700 }}>{value}</span>
                                </div>
                            ))}
                        </div>

                        {/* QR Code */}
                        {customer.is_active && customer.qr_code && (
                            <div style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: 12, padding: 24, textAlign: "center" }}>
                                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", marginBottom: 16 }}>Your Membership QR</p>
                                <div style={{ display: "inline-block", padding: 16, background: "#FFF", borderRadius: 12, border: "1px solid #E5E5E5" }}>
                                    <QRCode value={customer.qr_code} size={160} />
                                </div>
                                <p style={{ fontSize: 11, color: "#AAA", marginTop: 12 }}>Show this to staff when you visit</p>
                            </div>
                        )}

                        {/* Pending banner */}
                        {customer.payment_status === "submitted" && (
                            <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 12, padding: 16, textAlign: "center" }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>⏳ Payment Under Review</p>
                                <p style={{ fontSize: 12, color: "#78350F", marginTop: 4, lineHeight: 1.6 }}>Your payment screenshot has been submitted. Staff will activate your membership shortly.</p>
                            </div>
                        )}

                        {/* Rejected banner */}
                        {customer.payment_status === "rejected" && (
                            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: 16, textAlign: "center" }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "#DC2626" }}>❌ Payment Rejected</p>
                                <p style={{ fontSize: 12, color: "#B91C1C", marginTop: 4, lineHeight: 1.6 }}>Your payment was rejected. Please contact the shop for assistance.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Profile Tab ── */}
                {tab === "profile" && (
                    <div style={{ background: "#FFF", border: "1px solid #E5E5E5", borderRadius: 12, padding: 20 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", marginBottom: 16 }}>Your Details</p>
                        {[
                            ["Full Name", customer.name],
                            ["Email", customer.email ?? "—"],
                            ["Phone", customer.phone ?? "—"],
                            ["Birthdate", customer.birthdate ? new Date(customer.birthdate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "—"],
                            ["Gender", customer.gender ?? "—"],
                        ].map(([label, value]) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid #F5F5F5" }}>
                                <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>{label}</span>
                                <span style={{ fontSize: 13, color: "#0A0A0A", fontWeight: 700, textAlign: "right", maxWidth: "60%" }}>{value}</span>
                            </div>
                        ))}
                        <p style={{ fontSize: 11, color: "#AAA", marginTop: 8 }}>To update your details, please visit the shop or contact staff.</p>
                    </div>
                )}

                {/* ── Password Tab ── */}
                {tab === "password" && (
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
                )}
            </div>
        </main>
    );
}