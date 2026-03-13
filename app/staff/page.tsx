"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser as supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

type StaffMember = {
    id: string;
    full_name: string;
    email: string;
    role: "owner" | "staff";
    address: string | null;
    date_of_birth: string | null;
    gender: string | null;
    gender_other: string | null;
    phone: string | null;
    civil_status: string | null;
    religion: string | null;
};

const EMPTY_FORM = {
    full_name: "",
    email: "",
    role: "staff" as "owner" | "staff",
    address: "",
    date_of_birth: "",
    gender: "",
    gender_other: "",
    phone: "",
    civil_status: "",
    religion: "",
};

export default function StaffPage() {
    const router = useRouter();
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<StaffMember | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [tempPassword, setTempPassword] = useState("");
    const [showTempPassword, setShowTempPassword] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<StaffMember | null>(null);

    useEffect(() => {
        async function checkAndLoad() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/login"); return; }

            const { data: staffData } = await supabase
                .from("staff").select("role").eq("id", user.id).maybeSingle();

            if (!staffData) { router.push("/login"); return; }
            if (staffData.role !== "owner") { router.push("/dashboard"); return; }

            setIsOwner(true);
            fetchStaff();
        }
        checkAndLoad();
    }, []);

    async function fetchStaff() {
        setLoading(true);
        const { data } = await supabase
            .from("staff").select("*").order("full_name");
        setStaffList(data ?? []);
        setLoading(false);
    }

    function openAdd() {
        setEditing(null);
        setForm({ ...EMPTY_FORM });
        setTempPassword("");
        setError("");
        setShowModal(true);
    }

    function openEdit(member: StaffMember) {
        setEditing(member);
        setForm({
            full_name: member.full_name ?? "",
            email: member.email ?? "",
            role: member.role ?? "staff",
            address: member.address ?? "",
            date_of_birth: member.date_of_birth ?? "",
            gender: member.gender ?? "",
            gender_other: member.gender_other ?? "",
            phone: member.phone ?? "",
            civil_status: member.civil_status ?? "",
            religion: member.religion ?? "",
        });
        setTempPassword("");
        setError("");
        setShowModal(true);
    }

    function generatePassword() {
        const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!";
        return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    }

    async function handleSave() {
        setError("");

        // Validation
        if (!form.full_name.trim()) { setError("Full name is required."); return; }
        if (!form.email.trim()) { setError("Email is required."); return; }
        if (!form.address.trim()) { setError("Address is required."); return; }
        if (!form.date_of_birth) { setError("Date of birth is required."); return; }
        if (!form.gender) { setError("Gender is required."); return; }
        if (form.gender === "Others" && !form.gender_other.trim()) { setError("Please specify gender."); return; }
        if (!form.phone.trim()) { setError("Phone number is required."); return; }
        if (!/^(09|\+639)\d{9}$/.test(form.phone.replace(/\s/g, ""))) { setError("Enter a valid PH phone number (e.g. 09171234567)."); return; }
        if (!form.civil_status) { setError("Civil status is required."); return; }
        if (!form.religion.trim()) { setError("Religion is required."); return; }

        setSaving(true);

        const payload = {
            full_name: form.full_name.trim(),
            email: form.email.trim(),
            role: form.role,
            address: form.address.trim(),
            date_of_birth: form.date_of_birth,
            gender: form.gender,
            gender_other: form.gender === "Others" ? form.gender_other.trim() : null,
            phone: form.phone.trim(),
            civil_status: form.civil_status,
            religion: form.religion.trim(),
        };

        if (editing) {
            // Update existing staff info only
            const { error: updateError } = await supabase
                .from("staff").update(payload).eq("id", editing.id);
            if (updateError) { setError("Failed to update staff. " + updateError.message); setSaving(false); return; }
            await fetchStaff();
            setSaving(false);
            setShowModal(false);
        } else {
            // Create new staff — call API route to create auth account
            const password = generatePassword();
            const res = await fetch("/api/create-staff-auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...payload, password }),
            });

            const result = await res.json();
            if (!res.ok) { setError(result.error ?? "Failed to create staff account."); setSaving(false); return; }

            await fetchStaff();
            setSaving(false);
            setShowModal(false);
            setTempPassword(password);
            setShowTempPassword(true);
        }
    }

    async function handleDelete(member: StaffMember) {
        setSaving(true);
        await fetch("/api/delete-staff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId: member.id }),
        });
        await fetchStaff();
        setSaving(false);
        setDeleteConfirm(null);
    }

    if (!isOwner && !loading) return null;

    return (
        <div className="min-h-screen" style={{ background: "var(--bg)", fontFamily: "Poppins, sans-serif" }}>
            <Navbar />
            <div className="max-w-6xl mx-auto px-4 py-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--warm-light)" }}>Management</p>
                        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>Staff</h1>
                    </div>
                    <button onClick={openAdd} className="btn btn-warm">+ Add Staff</button>
                </div>

                {/* Staff list */}
                {loading ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-16 rounded animate-pulse" style={{ background: "var(--surface2)" }} />
                        ))}
                    </div>
                ) : staffList.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: 13 }}>
                        No staff yet. Click <strong>+ Add Staff</strong> to get started.
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {staffList.map((member) => (
                            <div key={member.id} className="surface rounded"
                                style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px" }}>

                                {/* Avatar */}
                                <div style={{
                                    width: 40, height: 40, borderRadius: "50%", background: "var(--warm)",
                                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                }}>
                                    <span style={{ color: "#FFF", fontWeight: 800, fontSize: 16 }}>
                                        {member.full_name?.charAt(0).toUpperCase()}
                                    </span>
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{member.full_name}</span>
                                        <span style={{
                                            fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 99,
                                            background: member.role === "owner" ? "rgba(59,31,0,0.12)" : "var(--surface2)",
                                            color: member.role === "owner" ? "var(--warm-light)" : "var(--text-muted)",
                                            textTransform: "uppercase",
                                        }}>{member.role === "owner" ? "👑 Owner" : "Staff"}</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{member.email}</div>
                                    {member.phone && <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 1 }}>{member.phone}</div>}
                                </div>

                                {/* Actions */}
                                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                                    <button onClick={() => openEdit(member)}
                                        style={{ fontSize: 10, fontWeight: 700, padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontFamily: "Poppins, sans-serif", border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)" }}>
                                        Edit
                                    </button>
                                    <button onClick={() => setDeleteConfirm(member)}
                                        style={{ fontSize: 10, fontWeight: 700, padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontFamily: "Poppins, sans-serif", border: "1px solid #FECACA", background: "transparent", color: "#DC2626" }}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Add/Edit Modal ── */}
            {showModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div style={{ background: "var(--surface)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", fontFamily: "Poppins, sans-serif" }}>
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 20 }}>
                            {editing ? "Edit Staff" : "Add Staff"}
                        </h2>

                        {error && (
                            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#DC2626" }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

                            {/* Full Name */}
                            <div style={{ gridColumn: "1 / -1" }}>
                                <label style={labelStyle}>Full Name *</label>
                                <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                                    placeholder="e.g. Juan dela Cruz" style={inputStyle} />
                            </div>

                            {/* Email */}
                            <div style={{ gridColumn: "1 / -1" }}>
                                <label style={labelStyle}>Email *</label>
                                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                                    placeholder="e.g. juan@email.com" style={inputStyle}
                                    disabled={!!editing} />
                                {editing && <p style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 4 }}>Email cannot be changed after creation.</p>}
                            </div>

                            {/* Role */}
                            <div>
                                <label style={labelStyle}>Role *</label>
                                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as "owner" | "staff" })} style={inputStyle}>
                                    <option value="staff">Staff</option>
                                    <option value="owner">Owner</option>
                                </select>
                            </div>

                            {/* Phone */}
                            <div>
                                <label style={labelStyle}>Phone # *</label>
                                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                                    placeholder="09171234567" style={inputStyle} />
                            </div>

                            {/* Date of Birth */}
                            <div>
                                <label style={labelStyle}>Date of Birth *</label>
                                <input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} style={inputStyle} />
                            </div>

                            {/* Gender */}
                            <div>
                                <label style={labelStyle}>Gender *</label>
                                <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value, gender_other: "" })} style={inputStyle}>
                                    <option value="">Select gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Prefer not to say">Prefer not to say</option>
                                    <option value="Others">Others</option>
                                </select>
                            </div>

                            {/* Gender Other */}
                            {form.gender === "Others" && (
                                <div style={{ gridColumn: "1 / -1" }}>
                                    <label style={labelStyle}>Please specify *</label>
                                    <input value={form.gender_other} onChange={e => setForm({ ...form, gender_other: e.target.value })}
                                        placeholder="Please specify" style={inputStyle} />
                                </div>
                            )}

                            {/* Civil Status */}
                            <div>
                                <label style={labelStyle}>Civil Status *</label>
                                <select value={form.civil_status} onChange={e => setForm({ ...form, civil_status: e.target.value })} style={inputStyle}>
                                    <option value="">Select status</option>
                                    <option value="Single">Single</option>
                                    <option value="Married">Married</option>
                                    <option value="Divorced">Divorced</option>
                                    <option value="Cohabiting">Cohabiting</option>
                                </select>
                            </div>

                            {/* Religion */}
                            <div>
                                <label style={labelStyle}>Religion *</label>
                                <input value={form.religion} onChange={e => setForm({ ...form, religion: e.target.value })}
                                    placeholder="e.g. Roman Catholic" style={inputStyle} />
                            </div>

                            {/* Address */}
                            <div style={{ gridColumn: "1 / -1" }}>
                                <label style={labelStyle}>Address *</label>
                                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                                    placeholder="e.g. 123 Rizal St, Iloilo City" style={inputStyle} />
                            </div>
                        </div>

                        {/* Buttons */}
                        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                            <button onClick={() => setShowModal(false)}
                                style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Poppins, sans-serif", color: "var(--text-muted)" }}>
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                style={{ flex: 2, padding: "11px", borderRadius: 8, border: "none", background: saving ? "#888" : "#3B1F00", color: "#FFF", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "Poppins, sans-serif" }}>
                                {saving ? "Saving…" : editing ? "Save Changes" : "Create Account"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Temp Password Modal ── */}
            {showTempPassword && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                    <div style={{ background: "var(--surface)", borderRadius: 16, padding: 32, width: "100%", maxWidth: 400, textAlign: "center", fontFamily: "Poppins, sans-serif" }}>
                        <div style={{ fontSize: 36, marginBottom: 16 }}>🔑</div>
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Account Created!</h2>
                        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>
                            Share this temporary password with the staff member. They should change it on first login.
                        </p>
                        <div style={{
                            background: "var(--surface2)", border: "1px solid var(--border)",
                            borderRadius: 8, padding: "14px 20px", marginBottom: 20,
                            fontSize: 20, fontWeight: 800, letterSpacing: "0.1em", color: "var(--warm-light)",
                            fontFamily: "monospace",
                        }}>
                            {tempPassword}
                        </div>
                        <button onClick={() => { navigator.clipboard.writeText(tempPassword); }}
                            style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Poppins, sans-serif", color: "var(--text-muted)", marginBottom: 10 }}>
                            Copy Password
                        </button>
                        <button onClick={() => setShowTempPassword(false)}
                            style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: "#3B1F00", color: "#FFF", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Poppins, sans-serif" }}>
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm Modal ── */}
            {deleteConfirm && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                    <div style={{ background: "var(--surface)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 380, fontFamily: "Poppins, sans-serif" }}>
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Delete Staff Account?</h2>
                        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.6 }}>
                            This will permanently delete <strong>{deleteConfirm.full_name}</strong>'s account. This cannot be undone.
                        </p>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={() => setDeleteConfirm(null)}
                                style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Poppins, sans-serif", color: "var(--text-muted)" }}>
                                Cancel
                            </button>
                            <button onClick={() => handleDelete(deleteConfirm)} disabled={saving}
                                style={{ flex: 1, padding: "11px", borderRadius: 8, border: "none", background: "#DC2626", color: "#FFF", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "Poppins, sans-serif" }}>
                                {saving ? "Deleting…" : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.08em", color: "var(--text-muted)",
    display: "block", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 6,
    border: "1px solid var(--border)", fontSize: 13,
    fontFamily: "Poppins, sans-serif", outline: "none",
    background: "var(--surface)", color: "var(--text)",
    boxSizing: "border-box",
};