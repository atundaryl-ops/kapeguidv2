"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { supabaseBrowser as supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import s from "./page.module.css";

type Customer = {
    id: string;
    name: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    birthdate: string | null;
    gender: string | null;
    qr_code: string;
    is_active: boolean;
    payment_status: string;
    free_coffee: boolean;
    visit_count: number;
    card_issue_date: string;
    expiry_date: string;
    access_code: string | null;
    password_changed: boolean | null;
    created_by_staff: boolean | null;
};

type Tab = "membership" | "profile" | "password";

export default function MePage() {
    const { user, loading: authLoading, logout } = useAuth();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>("membership");
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const router = useRouter();

    useEffect(() => {
        if (authLoading) return;
        if (!user) { router.push("/login"); return; }
        if (user.role === "staff") { router.push("/dashboard"); return; }

        async function loadCustomer() {
            const { data } = await supabase
                .from("customers").select("*").eq("id", user!.customer_id).maybeSingle();
            if (!data) { router.push("/login"); return; }
            setCustomer(data);
            setLoading(false);
        }
        loadCustomer();
    }, [user, authLoading]);

    async function handleLogout() {
        await logout();
        router.push("/");
        router.refresh();
    }

    async function handleChangePassword() {
        if (!customer) return;
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
            setErrorMsg(error.status === 422
                ? "New password must be different from your current password."
                : "Failed to update password. Please try again."
            );
            setSaving(false);
            return;
        }

        if (customer.created_by_staff && !customer.password_changed) {
            await supabase.from("customers")
                .update({ password_changed: true, is_active: true, free_coffee: true })
                .eq("id", customer.id);
            setCustomer({ ...customer, password_changed: true, is_active: true, free_coffee: true });
        } else {
            await supabase.from("customers")
                .update({ password_changed: true })
                .eq("id", customer.id);
            setCustomer({ ...customer, password_changed: true });
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
        const isExpired = customer.expiry_date ? new Date(customer.expiry_date) < new Date() : false;
        if (isExpired) return { label: "Expired", color: "#DC2626", bg: "#FEF2F2" };
        if (customer.is_active) return { label: "Active", color: "#166534", bg: "#F0FDF4" };
        return { label: "Inactive", color: "#555", bg: "#F5F5F5" };
    }

    if (authLoading || loading) {
        return (
            <main className={s.loadingMain}>
                <p className={s.loadingText}>Loading...</p>
            </main>
        );
    }

    if (!customer) return null;

    const status = getStatus();
    const isExpired = customer.expiry_date ? new Date(customer.expiry_date) < new Date() : false;

    // Dynamic status card styles (driven by runtime data, kept inline)
    const statusCardBg = customer.payment_status === "submitted" ? "#FFF7ED"
        : customer.payment_status === "rejected" ? "#FEF2F2"
        : isExpired ? "#FEF2F2"
        : !customer.is_active ? "#F5F5F5"
        : customer.free_coffee ? "#F0FDF4" : "#F5F5F5";

    const statusCardBorder = customer.payment_status === "submitted" ? "#FED7AA"
        : customer.payment_status === "rejected" ? "#FECACA"
        : isExpired ? "#FECACA"
        : !customer.is_active ? "#E5E5E5"
        : customer.free_coffee ? "#86EFAC" : "#E5E5E5";

    const statusCardTextColor = customer.payment_status === "submitted" ? "#92400E"
        : customer.payment_status === "rejected" ? "#DC2626"
        : isExpired ? "#DC2626"
        : !customer.is_active ? "#888"
        : customer.free_coffee ? "#166534" : "#888";

    const statusCardText = customer.payment_status === "submitted" ? "Pending Approval"
        : customer.payment_status === "rejected" ? "Registration Rejected"
        : isExpired ? "Membership Expired"
        : !customer.is_active ? "Account Inactive"
        : customer.free_coffee ? "Free Coffee!" : "No Free Coffee";

    const statusCardIcon = customer.payment_status === "submitted" ? "⏳"
        : customer.payment_status === "rejected" ? "❌"
        : isExpired ? "❌"
        : !customer.is_active ? "—"
        : customer.free_coffee ? "☕" : "—";

    return (
        <main className={s.main}>

            {/* ── Top Nav ── */}
            <nav className={s.nav}>
                <Link href="/home" className={s.navLogo}>
                    <div className={s.navLogoIcon}>
                        <span className={s.navLogoIconText}>!</span>
                    </div>
                    <span className={s.navLogoText}>
                        kapé<span className={s.navLogoAccent}>ople.</span>
                    </span>
                </Link>
                <div className={s.navRight}>
                    <div className={s.navUser}>
                        <div className={s.avatar}>
                            <span className={s.avatarText}>
                                {customer.first_name?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <span className={s.navName}>{customer.first_name}</span>
                    </div>
                    <button onClick={handleLogout} className={s.signOutBtn}>
                        Sign Out
                    </button>
                </div>
            </nav>

            <div className={s.content}>

                {/* ── Header ── */}
                <div className={s.profileHeader}>
                    <div className={s.avatarLarge}>
                        <span className={s.avatarLargeText}>
                            {customer.first_name?.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <h1 className={s.profileName}>{customer.name}</h1>
                    <div className={s.statusBadge} style={{ background: status.bg, border: `1px solid ${status.color}30` }}>
                        <div className={s.statusDot} style={{ background: status.color }} />
                        <span className={s.statusLabel} style={{ color: status.color }}>{status.label}</span>
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div className={s.tabs}>
                    {(["membership", "profile", "password"] as Tab[]).map((t) => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`${s.tabBtn} ${tab === t ? s.tabBtnActive : ""}`}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>

                {/* ── Membership Tab ── */}
                {tab === "membership" && (
                    <div className={s.membershipTab}>

                        {/* Status cards */}
                        <div className={s.statsGrid}>
                            <div className={s.statCard}>
                                <div className={s.statValue}>{customer.visit_count ?? 0}</div>
                                <div className={s.statLabel}>Total Visits</div>
                            </div>
                            <div className={s.statCard} style={{ background: statusCardBg, border: `1px solid ${statusCardBorder}` }}>
                                <div style={{ fontSize: 28 }}>{statusCardIcon}</div>
                                <div className={s.statLabel} style={{ color: statusCardTextColor }}>{statusCardText}</div>
                            </div>
                        </div>

                        {/* Change password banner — staff-created accounts only */}
                        {customer.created_by_staff && !customer.password_changed && customer.payment_status === "approved" && (
                            <div className={`${s.bannerBase} ${s.bannerBlue}`}>
                                <p className={`${s.bannerTitle} ${s.bannerTitleBlue}`}>🔐 One more step!</p>
                                <p className={`${s.bannerBody} ${s.bannerBodyBlue}`}>
                                    To activate your account, please go to the <strong>Password</strong> tab and change your password.
                                </p>
                                <button onClick={() => setTab("password")} className={s.bannerBtn}>
                                    Change Password →
                                </button>
                            </div>
                        )}

                        {/* Card details */}
                        <div className={s.card}>
                            <p className={s.cardTitle}>Membership Card</p>
                            {customer.payment_status !== "approved" ? (
                                <p className={s.cardEmpty}>
                                    Card details will be available once your membership is approved.
                                </p>
                            ) : (
                                <>
                                    {[
                                        ["Member Since", customer.card_issue_date ? new Date(customer.card_issue_date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "—"],
                                        ["Valid Until", customer.expiry_date ? new Date(customer.expiry_date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "—"],
                                        ["Access Code", customer.access_code ?? "—"],
                                    ].map(([label, value]) => (
                                        <div key={label} className={s.cardRow}>
                                            <span className={s.cardRowLabel}>{label}</span>
                                            <span className={s.cardRowValue}>{value}</span>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>

                        {/* QR Code */}
                        {customer.is_active && customer.qr_code && (
                            <div className={s.qrCard}>
                                <p className={s.qrTitle}>Your Membership QR</p>
                                <div className={s.qrWrapper}>
                                    <QRCode value={customer.qr_code} size={160} />
                                </div>
                                <p className={s.qrHint}>Show this to staff when you visit</p>
                            </div>
                        )}

                        {/* Pending banner */}
                        {customer.payment_status === "submitted" && (
                            <div className={`${s.bannerBase} ${s.bannerOrange}`}>
                                <p className={`${s.bannerTitle} ${s.bannerTitleOrange}`}>⏳ Payment Under Review</p>
                                <p className={`${s.bannerBody} ${s.bannerBodyOrange}`}>Your payment screenshot has been submitted. Staff will activate your membership shortly.</p>
                            </div>
                        )}

                        {/* Rejected banner */}
                        {customer.payment_status === "rejected" && (
                            <div className={`${s.bannerBase} ${s.bannerRed}`}>
                                <p className={`${s.bannerTitle} ${s.bannerTitleRed}`}>❌ Payment Rejected</p>
                                <p className={`${s.bannerBody} ${s.bannerBodyRed}`}>Your payment was rejected. Please contact the shop for assistance.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Profile Tab ── */}
                {tab === "profile" && (
                    <div className={s.profileCard}>
                        <p className={s.profileCardTitle}>Your Details</p>
                        {[
                            ["Full Name", customer.name],
                            ["Email", customer.email ?? "—"],
                            ["Phone", customer.phone ?? "—"],
                            ["Birthdate", customer.birthdate ? new Date(customer.birthdate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "—"],
                            ["Gender", customer.gender ?? "—"],
                        ].map(([label, value]) => (
                            <div key={label} className={s.profileRow}>
                                <span className={s.profileRowLabel}>{label}</span>
                                <span className={s.profileRowValue}>{value}</span>
                            </div>
                        ))}
                        <p className={s.profileHint}>To update your details, please visit the shop or contact staff.</p>
                    </div>
                )}

                {/* ── Password Tab ── */}
                {tab === "password" && (
                    <div className={s.passwordCard}>
                        <p className={s.passwordCardTitle}>Change Password</p>

                        {successMsg && <div className={s.alertSuccess}>{successMsg}</div>}
                        {errorMsg && <div className={s.alertError}>{errorMsg}</div>}

                        <div className={s.fieldGroup}>
                            <label className={s.fieldLabel}>New Password</label>
                            <input type="password" className={s.fieldInput}
                                placeholder="Min. 6 characters"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)} />
                        </div>
                        <div className={s.fieldGroupLast}>
                            <label className={s.fieldLabel}>Confirm New Password</label>
                            <input type="password" className={s.fieldInput}
                                placeholder="Re-enter new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)} />
                        </div>

                        <button onClick={handleChangePassword} disabled={saving}
                            className={`${s.submitBtn} ${saving ? s.submitBtnDisabled : s.submitBtnActive}`}>
                            {saving ? "Updating…" : "Update Password"}
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}