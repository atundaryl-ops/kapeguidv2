"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase";

type MenuItem = {
    id: string;
    category: string;
    name: string;
    description: string | null;
    price: number;
    tag: string | null;
    image_url: string | null;
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

export default function MenuSection() {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [activeCategory, setActiveCategory] = useState("Klassic Kape!");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMenu() {
            const { data } = await supabase
                .from("menu")
                .select("id, category, name, description, price, tag, image_url")
                .eq("is_available", true)
                .order("category")
                .order("name");
            setItems(data ?? []);
            setLoading(false);
        }
        fetchMenu();
    }, []);

    const availableCategories = CATEGORIES.filter(cat => items.some(i => i.category === cat));
    const displayed = items.filter(i => i.category === activeCategory);

    return (
        <section id="menu" style={{ padding: "100px 24px", background: "#FFF", fontFamily: "Poppins, sans-serif" }}>
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>

                {/* Heading */}
                <div style={{ textAlign: "center", marginBottom: 48 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#3B1F00", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
                        What We Serve
                    </p>
                    <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, color: "#0A0A0A", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                        Crafted with love,<br />served with care.
                    </h2>
                </div>

                {/* Category tabs */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 40 }}>
                    {availableCategories.map(cat => (
                        <button key={cat} onClick={() => setActiveCategory(cat)}
                            style={{
                                fontSize: 11, fontWeight: 700, padding: "7px 16px", borderRadius: 99,
                                border: "1px solid",
                                borderColor: activeCategory === cat ? "#3B1F00" : "rgba(0,0,0,0.12)",
                                background: activeCategory === cat ? "#3B1F00" : "transparent",
                                color: activeCategory === cat ? "#FFF" : "#555",
                                cursor: "pointer", fontFamily: "Poppins, sans-serif",
                            }}>
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Items grid */}
                {loading ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
                        {[...Array(4)].map((_, i) => (
                            <div key={i} style={{ height: 160, borderRadius: 12, background: "#F0F0F0", animation: "pulse 1.5s infinite" }} />
                        ))}
                    </div>
                ) : displayed.length === 0 ? (
                    <p style={{ textAlign: "center", color: "#888", fontSize: 13 }}>No items in this category yet.</p>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
                        {displayed.map(item => (
                            <div key={item.id}
                                style={{ background: "#FAFAFA", borderRadius: 12, border: "1px solid #EEE", overflow: "hidden", position: "relative", transition: "transform 0.2s, border-color 0.2s" }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(59,31,0,0.3)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#EEE"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>

                                {/* Image or placeholder */}
                                {item.image_url ? (
                                    <img src={item.image_url} alt={item.name}
                                        style={{ width: "100%", height: 160, objectFit: "cover" }} />
                                ) : (
                                    <div style={{ width: "100%", height: 120, background: "rgba(59,31,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>
                                        ☕
                                    </div>
                                )}

                                <div style={{ padding: 18 }}>
                                    {/* Tag */}
                                    {item.tag && (
                                        <span style={{
                                            position: "absolute", top: 12, right: 12,
                                            fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                                            padding: "3px 8px", borderRadius: 99,
                                            background: item.tag === "NEW" ? "#3B1F00" : "rgba(59,31,0,0.08)",
                                            color: item.tag === "NEW" ? "#FFF" : "#3B1F00",
                                        }}>{item.tag}</span>
                                    )}

                                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0A0A0A", marginBottom: 4 }}>{item.name}</h3>
                                    {item.description && (
                                        <p style={{ fontSize: 12, color: "#888", marginBottom: 12, lineHeight: 1.5 }}>{item.description}</p>
                                    )}
                                    <div style={{ fontSize: 18, fontWeight: 900, color: "#3B1F00" }}>₱{Number(item.price).toFixed(2)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}