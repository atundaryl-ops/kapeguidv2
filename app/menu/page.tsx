"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser as supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

type MenuItem = {
    id: string;
    category: string;
    name: string;
    description: string | null;
    price: number;
    tag: string | null;
    image_url: string | null;
    is_available: boolean;
};

const CATEGORIES = [
    "Klassic Kape!",
    "Indi Kape",
    "Espesyal",
    "Advocacy Drinks",
    "Matcha-Rap",
    "New Food",
    "Sandwiches and Bagels",
    "Add Ons",
];

const TAGS = ["", "NEW", "BESTSELLER", "LIMITED"];

const EMPTY_FORM = {
    category: CATEGORIES[0],
    name: "",
    description: "",
    price: "",
    tag: "",
    image_url: "",
    is_available: true,
};

export default function MenuPage() {

    const router = useRouter();

    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState("All");
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<MenuItem | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        async function checkAndLoad() {
            const { data: { user: User } } = await supabase.auth.getUser();
            if (!User) { router.push("/login"); return; }

            const { data: staffData } = await supabase
                .from("staff").select("role").eq("id", User.id).maybeSingle();

            if (!staffData) { router.push("/login"); return; }

            fetchMenu();
        }
        checkAndLoad();
    }, []);

    async function fetchMenu() {
        setLoading(true);
        const { data } = await supabase
            .from("menu").select("*").order("category").order("name");
        setItems(data ?? []);
        setLoading(false);
    }

    function openAdd() {
        setEditing(null);
        setForm({ ...EMPTY_FORM });
        setError("");
        setShowModal(true);
    }

    function openEdit(item: MenuItem) {
        setEditing(item);
        setForm({
            category: item.category,
            name: item.name,
            description: item.description ?? "",
            price: String(item.price),
            tag: item.tag ?? "",
            image_url: item.image_url ?? "",
            is_available: item.is_available,
        });
        setError("");
        setShowModal(true);
    }

    async function handleSave() {
        setError("");
        if (!form.name.trim()) { setError("Name is required."); return; }
        if (!form.price || isNaN(Number(form.price))) { setError("Enter a valid price."); return; }

        setSaving(true);
        const payload = {
            category: form.category,
            name: form.name.trim(),
            description: form.description.trim() || null,
            price: parseFloat(form.price),
            tag: form.tag || null,
            image_url: form.image_url.trim() || null,
            is_available: form.is_available,
        };

        if (editing) {
            await supabase.from("menu").update(payload).eq("id", editing.id);
        } else {
            await supabase.from("menu").insert(payload);
        }

        await fetchMenu();
        setSaving(false);
        setShowModal(false);
    }

    async function handleDelete(item: MenuItem) {
        if (!confirm(`Delete "${item.name}"?`)) return;
        await supabase.from("menu").delete().eq("id", item.id);
        await fetchMenu();
    }

    async function toggleAvailable(item: MenuItem) {
        await supabase.from("menu").update({ is_available: !item.is_available }).eq("id", item.id);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i));
    }
    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;

        const { error } = await supabase.storage
            .from("menu-images")
            .upload(fileName, file);

        if (error) {
            alert("Upload failed");
            return;
        }

        const { data } = supabase.storage
            .from("menu-images")
            .getPublicUrl(fileName);

        setForm((prev) => ({
            ...prev,
            image_url: data.publicUrl,
        }));
    }

    const displayed = filterCategory === "All"
        ? items
        : items.filter(i => i.category === filterCategory);

    const grouped = CATEGORIES.reduce((acc, cat) => {
        const catItems = displayed.filter(i => i.category === cat);
        if (catItems.length) acc[cat] = catItems;
        return acc;
    }, {} as Record<string, MenuItem[]>);

    return (
        <div className="min-h-screen" style={{ background: "var(--bg)", fontFamily: "Poppins, sans-serif" }}>
            <Navbar />
            <div className="max-w-6xl mx-auto px-4 py-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--warm-light)" }}>Management</p>
                        <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>Menu</h1>
                    </div>
                    <button onClick={openAdd}
                        className="btn btn-warm">
                        + Add Item
                    </button>
                </div>

                {/* Category filter */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
                    {["All", ...CATEGORIES].map(cat => (
                        <button key={cat} onClick={() => setFilterCategory(cat)}
                            style={{
                                fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 99,
                                border: "1px solid",
                                borderColor: filterCategory === cat ? "var(--warm)" : "var(--border)",
                                background: filterCategory === cat ? "var(--warm)" : "transparent",
                                color: filterCategory === cat ? "#FFF" : "var(--text-muted)",
                                cursor: "pointer", fontFamily: "Poppins, sans-serif",
                            }}>
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Menu items grouped by category */}
                {loading ? (
                    <div className="space-y-2">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-16 rounded animate-pulse" style={{ background: "var(--surface2)" }} />
                        ))}
                    </div>
                ) : displayed.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)", fontSize: 13 }}>
                        No items yet.{" "}
                        <button onClick={openAdd} style={{
                            background: "none", border: "none", padding: 0,
                            fontSize: 13, fontWeight: 700, color: "var(--warm-light)",
                            cursor: "pointer", fontFamily: "Poppins, sans-serif",
                            textDecoration: "underline", textUnderlineOffset: 3,
                        }}>
                            + Add Item
                        </button>{" "}
                        to get started.
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                        {Object.entries(grouped).map(([cat, catItems]) => (
                            <div key={cat}>
                                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--warm-light)", marginBottom: 10 }}>
                                    {cat}
                                </p>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {catItems.map(item => (
                                        <div key={item.id}
                                            className="surface rounded"
                                            style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", opacity: item.is_available ? 1 : 0.5 }}>

                                            {/* Image */}
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name}
                                                    style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                                            ) : (
                                                <div style={{ width: 48, height: 48, borderRadius: 8, background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20 }}>
                                                    ☕
                                                </div>
                                            )}

                                            {/* Info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{item.name}</span>
                                                    {item.tag && (
                                                        <span style={{
                                                            fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                                                            padding: "2px 7px", borderRadius: 99,
                                                            background: item.tag === "NEW" ? "#3B1F00" : "rgba(59,31,0,0.1)",
                                                            color: item.tag === "NEW" ? "#FFF" : "#3B1F00",
                                                        }}>{item.tag}</span>
                                                    )}
                                                </div>
                                                {item.description && (
                                                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 0 }}>{item.description}</p>
                                                )}
                                            </div>

                                            {/* Price */}
                                            <span style={{ fontSize: 15, fontWeight: 800, color: "var(--warm-light)", flexShrink: 0 }}>
                                                ₱{Number(item.price).toFixed(2)}
                                            </span>

                                            {/* Actions */}
                                            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                                                <button onClick={() => toggleAvailable(item)}
                                                    style={{
                                                        fontSize: 10, fontWeight: 700, padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                                                        fontFamily: "Poppins, sans-serif", border: "1px solid var(--border)",
                                                        background: item.is_available ? "var(--surface2)" : "#F0FDF4",
                                                        color: item.is_available ? "var(--text-muted)" : "#166534",
                                                    }}>
                                                    {item.is_available ? "Hide" : "Show"}
                                                </button>
                                                <button onClick={() => openEdit(item)}
                                                    style={{ fontSize: 10, fontWeight: 700, padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontFamily: "Poppins, sans-serif", border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)" }}>
                                                    Edit
                                                </button>
                                                <button onClick={() => handleDelete(item)}
                                                    style={{ fontSize: 10, fontWeight: 700, padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontFamily: "Poppins, sans-serif", border: "1px solid #FECACA", background: "transparent", color: "#DC2626" }}>
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
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
                    <div style={{ background: "var(--surface)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", fontFamily: "Poppins, sans-serif" }}>
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 20 }}>
                            {editing ? "Edit Item" : "Add Menu Item"}
                        </h2>

                        {error && (
                            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#DC2626" }}>
                                {error}
                            </div>
                        )}

                        {/* Category */}
                        <div style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>Category</label>
                            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inputStyle}>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {/* Name */}
                        <div style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>Name</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. Kapé Latte" style={inputStyle} />
                        </div>

                        {/* Description */}
                        <div style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>Description <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder="e.g. Espresso & steamed milk" style={inputStyle} />
                        </div>

                        {/* Price */}
                        <div style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>Price (₱)</label>
                            <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                                placeholder="e.g. 120" style={inputStyle} />
                        </div>

                        {/* Tag */}
                        <div style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>Tag <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                            <select value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} style={inputStyle}>
                                {TAGS.map(t => <option key={t} value={t}>{t || "None"}</option>)}
                            </select>
                        </div>

                        {/* Image URL */}
                        <div style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>
                                Image <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span>
                            </label>

                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                style={inputStyle}
                            />
                        </div>
                        {form.image_url && (
                            <img
                                src={form.image_url}
                                style={{
                                    width: 80,
                                    height: 80,
                                    objectFit: "cover",
                                    borderRadius: 8,
                                    marginTop: 8
                                }}
                            />
                        )}

                        {/* Is Available */}
                        <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
                            <input type="checkbox" id="is_available" checked={form.is_available}
                                onChange={e => setForm({ ...form, is_available: e.target.checked })}
                                style={{ width: 16, height: 16, cursor: "pointer" }} />
                            <label htmlFor="is_available" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", cursor: "pointer" }}>
                                Available (visible on menu)
                            </label>
                        </div>

                        {/* Buttons */}
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={() => setShowModal(false)}
                                style={{ flex: 1, padding: "11px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Poppins, sans-serif", color: "var(--text-muted)" }}>
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                style={{ flex: 2, padding: "11px", borderRadius: 8, border: "none", background: saving ? "#888" : "#3B1F00", color: "#FFF", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "Poppins, sans-serif" }}>
                                {saving ? "Saving…" : editing ? "Save Changes" : "Add Item"}
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