"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser as supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

type StaffMember = {
    id: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
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
    first_name: "",
    middle_name: "",
    last_name: "",
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

function formatPhone(raw: string) {
    const digits = raw.replace(/\D/g, "");
    let core = digits;
    if (core.startsWith("0")) core = "63" + core.slice(1);
    if (core.startsWith("63")) core = core.slice(2);
    if (core.length > 10) core = core.slice(0, 10);
    let formatted = "+63";
    if (core.length > 0) formatted += " " + core.slice(0, 3);
    if (core.length > 3) formatted += " " + core.slice(3, 6);
    if (core.length > 6) formatted += " " + core.slice(6, 10);
    return formatted;
}

function phoneToE164(display: string) {
    const digits = display.replace(/\D/g, "");
    if (digits.startsWith("63")) return "+" + digits;
    if (digits.startsWith("0")) return "+63" + digits.slice(1);
    return "+63" + digits;
}

function isValidPhone(display: string) {
    return /^\+639\d{9}$/.test(phoneToE164(display));
}

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
    const [showConfirm, setShowConfirm] = useState(false);

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
        const { data } = await supabase.from("staff").select("*").order("last_name");
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
            first_name: member.first_name ?? "",
            middle_name: member.middle_name ?? "",
            last_name: member.last_name ?? "",
            email: member.email ?? "",
            role: member.role ?? "staff",
            address: member.address ?? "",
            date_of_birth: member.date_of_birth ?? "",
            gender: member.gender ?? "",
            gender_other: member.gender_other ?? "",
            phone: member.phone ? formatPhone(member.phone) : "",
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

    function validate() {
        if (!form.first_name.trim()) { setError("First name is required."); return false; }
        if (!form.last_name.trim()) { setError("Last name is required."); return false; }
        if (!form.email.trim()) { setError("Email is required."); return false; }
        // if (!form.address.trim()) { setError("Address is required."); return false; }
        if (!form.date_of_birth) { setError("Date of birth is required."); return false; }
        if (!form.gender) { setError("Gender is required."); return false; }
        if (form.gender === "Others" && !form.gender_other.trim()) { setError("Please specify gender."); return false; }
        if (!form.phone.trim()) { setError("Phone number is required."); return false; }
        if (!isValidPhone(form.phone)) { setError("Enter a valid PH phone number (e.g. +63 9XX XXX XXXX)."); return false; }
        if (!form.civil_status) { setError("Civil status is required."); return false; }
        if (!form.religion.trim()) { setError("Religion is required."); return false; }
        return true;
    }

    function handleCreateClick() {
        setError("");
        if (!validate()) return;
        setShowConfirm(true);
    }

    async function handleSave() {
        setShowConfirm(false);
        setSaving(true);

        const fullName = [form.first_name.trim(), form.middle_name.trim(), form.last_name.trim()]
            .filter(Boolean).join(" ");

        const payload = {
            first_name: form.first_name.trim(),
            middle_name: form.middle_name.trim() || null,
            last_name: form.last_name.trim(),
            full_name: fullName,
            email: form.email.trim(),
            role: form.role,
            address: form.address.trim(),
            date_of_birth: form.date_of_birth,
            gender: form.gender,
            gender_other: form.gender === "Others" ? form.gender_other.trim() : null,
            phone: phoneToE164(form.phone),
            civil_status: form.civil_status,
            religion: form.religion.trim(),
        };

        if (editing) {
            const { error: updateError } = await supabase
                .from("staff").update(payload).eq("id", editing.id);
            if (updateError) { setError("Failed to update staff. " + updateError.message); setSaving(false); return; }
            await fetchStaff();
            setSaving(false);
            setShowModal(false);
        } else {
            const password = generatePassword();
            const res = await fetch("/api/create-staff-auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...payload, password }),
            });
            const result = await res.json();
            if (!res.ok) { setError(result.error ?? "Failed to create staff account."); setSaving(false); setShowModal(true); return; }
            await fetchStaff();
            setSaving(false);
            setShowModal(false);
            setTempPassword(password);
            setShowTempPassword(true);
        }
    }

    async function handleDelete(member: StaffMember) {
        setSaving(true);
        await fetch("/api/delete-staff-auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId: member.id }),
        });
        await fetchStaff();
        setSaving(false);
        setDeleteConfirm(null);
    }

    if (!isOwner && !loading) return null;

    const fullNamePreview = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(" ");

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
                                <div style={{
                                    width: 40, height: 40, borderRadius: "50%", background: "var(--warm)",
                                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                }}>
                                    <span style={{ color: "#FFF", fontWeight: 800, fontSize: 16 }}>
                                        {member.first_name?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
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
                                    {member.phone && <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 1 }}>{formatPhone(member.phone)}</div>}
                                </div>
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
                    <div style={{ background: "var(--surface)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", fontFamily: "Poppins, sans-serif" }}>
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 20 }}>
                            {editing ? "Edit Staff" : "Add Staff"}
                        </h2>

                        {error && (
                            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#DC2626" }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

                            {/* First Name */}
                            <div>
                                <label style={labelStyle}>First Name *</label>
                                <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })}
                                    placeholder="e.g. Juan" style={inputStyle} />
                            </div>

                            {/* Middle Name */}
                            <div>
                                <label style={labelStyle}>Middle Name <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                                <input value={form.middle_name} onChange={e => setForm({ ...form, middle_name: e.target.value })}
                                    placeholder="e.g. Santos" style={inputStyle} />
                            </div>

                            {/* Last Name */}
                            <div style={{ gridColumn: "1 / -1" }}>
                                <label style={labelStyle}>Last Name *</label>
                                <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })}
                                    placeholder="e.g. dela Cruz" style={inputStyle} />
                            </div>

                            {/* Email */}
                            <div style={{ gridColumn: "1 / -1" }}>
                                <label style={labelStyle}>Email *</label>
                                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                                    placeholder="e.g. juan@email.com" style={inputStyle} disabled={!!editing} />
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

                            {/* Phone with PH flag */}
                            <div>
                                <label style={labelStyle}>Phone # *</label>
                                <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden", background: "var(--surface)" }}>
                                    <div style={{ padding: "10px 10px", background: "var(--surface2)", borderRight: "1px solid var(--border)", display: "flex", alignItems: "center", flexShrink: 0 }}>
                                        <span style={{ fontSize: 16 }}>🇵🇭</span>
                                        {/* <span style={{ fontSize: 13, fontWeight: 600, color: "#444", fontFamily: "Poppins, sans-serif" }}>+63</span> */}
                                    </div>
                                    <input
                                        value={form.phone}
                                        onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })}
                                        placeholder="9XX XXX XXXX" maxLength={16}
                                        style={{ ...inputStyle, border: "none", borderRadius: 0, flex: 1 }}
                                    />
                                </div>
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
                            {/* <div style={{ gridColumn: "1 / -1" }}>
                                <label style={labelStyle}>Address *</label>
                                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                                    placeholder="e.g. 123 Rizal St, Iloilo City" style={inputStyle} />
                            </div> */}
                        </div>

                        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                            <button onClick={() => setShowModal(false)}
                                style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Poppins, sans-serif", color: "var(--text-muted)" }}>
                                Cancel
                            </button>
                            <button onClick={editing ? handleSave : handleCreateClick} disabled={saving}
                                style={{ flex: 2, padding: "11px", borderRadius: 8, border: "none", background: saving ? "#888" : "#3B1F00", color: "#FFF", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "Poppins, sans-serif" }}>
                                {saving ? "Saving…" : editing ? "Save Changes" : "Create Account"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Confirm Create Modal ── */}
            {showConfirm && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                    <div style={{ background: "var(--surface)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 400, fontFamily: "Poppins, sans-serif" }}>
                        <div style={{ fontSize: 32, marginBottom: 12, textAlign: "center" }}>👤</div>
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 8, textAlign: "center" }}>Create Staff Account?</h2>
                        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6, textAlign: "center" }}>
                            You're about to create an account for:
                        </p>
                        <div style={{ background: "var(--surface2)", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>{fullNamePreview}</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{form.email}</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{form.phone}</div>
                            <div style={{
                                fontSize: 11, marginTop: 8, display: "inline-block", padding: "2px 10px", borderRadius: 99,
                                background: form.role === "owner" ? "rgba(59,31,0,0.12)" : "var(--surface)",
                                border: "1px solid var(--border)",
                                color: form.role === "owner" ? "var(--warm-light)" : "var(--text-muted)",
                                fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
                            }}>
                                {form.role === "owner" ? "👑 Owner" : "Staff"}
                            </div>
                        </div>
                        <p style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 20, textAlign: "center" }}>
                            A temporary password will be generated for this account.
                        </p>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={() => setShowConfirm(false)}
                                style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Poppins, sans-serif", color: "var(--text-muted)" }}>
                                Go Back
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                style={{ flex: 2, padding: "11px", borderRadius: 8, border: "none", background: "#3B1F00", color: "#FFF", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Poppins, sans-serif" }}>
                                {saving ? "Creating…" : "Yes, Create Account"}
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
                        <button onClick={() => navigator.clipboard.writeText(tempPassword)}
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