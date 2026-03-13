"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser as supabase } from "@/lib/supabase";
import MenuSection from "@/components/MenuSection";

type Customer = {
    id: string;
    first_name: string;
    name: string;
    is_active: boolean;
    payment_status: string;
    free_coffee: boolean;
    visit_count: number;
    expiry_date: string | null;
    qr_code: string | null;
};

const benefits = [
    { icon: "☕", title: "Free Coffee Monthly", desc: "Every member gets one free coffee every month, no strings attached." },
    { icon: "✦", title: "Priority Service", desc: "Skip the queue on busy days. Members always come first." },
    { icon: "◈", title: "Visit Tracking", desc: "We remember every visit. Your loyalty never goes unnoticed." },
    { icon: "♡", title: "Exclusive Promos", desc: "Members-only deals, seasonal discounts, and surprise rewards." },
];

export default function HomePage() {
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [scrolled, setScrolled] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener("scroll", onScroll);

        async function load() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push("/"); return; }

            const { data: staffData } = await supabase
                .from("staff").select("role").eq("id", user.id).maybeSingle();
            if (staffData) { router.push("/dashboard"); return; }

            const { data } = await supabase
                .from("customers")
                .select("id, first_name, name, is_active, payment_status, free_coffee, visit_count, expiry_date, qr_code")
                .eq("auth_id", user.id)
                .maybeSingle();

            if (!data) { router.push("/"); return; }
            setCustomer(data);
            setLoading(false);
        }
        load();

        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
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

    if (loading) {
        return (
            <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAFA", fontFamily: "Poppins, sans-serif" }}>
                <p style={{ color: "#888", fontSize: 14 }}>Loading...</p>
            </main>
        );
    }

    if (!customer) return null;

    const status = getStatus();
    const isExpired = customer.expiry_date ? new Date(customer.expiry_date) < new Date() : false;

    return (
        <div style={{ fontFamily: "Poppins, sans-serif", background: "#FAFAFA", color: "#0A0A0A", overflowX: "hidden" }}>

            {/* ── Navbar ── */}
            <nav style={{
                position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
                background: scrolled ? "rgba(250,250,250,0.95)" : "transparent",
                backdropFilter: scrolled ? "blur(12px)" : "none",
                borderBottom: scrolled ? "1px solid rgba(0,0,0,0.08)" : "none",
                transition: "all 0.3s ease",
                padding: "0 24px", height: 64,
                display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
                <Link href="/home" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, background: "#3B1F00", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#FFF", fontWeight: 900, fontSize: 18, lineHeight: 1 }}>!</span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 18, color: "#0A0A0A", letterSpacing: "-0.02em" }}>
                        kapé<span style={{ color: "#3B1F00" }}>ople.</span>
                    </span>
                </Link>

                <div className="hidden md:flex" style={{ gap: 32, alignItems: "center" }}>
                    {["Menu", "Membership", "About"].map((l) => (
                        <a key={l} href={`#${l.toLowerCase()}`}
                            style={{ fontSize: 12, fontWeight: 600, color: "#666", textDecoration: "none", letterSpacing: "0.06em", textTransform: "uppercase", transition: "color 0.2s" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#3B1F00")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}>
                            {l}
                        </a>
                    ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 160, justifyContent: "flex-end" }}>
                    <Link href="/me" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#3B1F00", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ color: "#FFF", fontWeight: 800, fontSize: 13 }}>
                                {customer.first_name?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A" }}>{customer.first_name}</span>
                    </Link>
                    <button onClick={handleLogout}
                        style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#888", background: "transparent", border: "1px solid rgba(0,0,0,0.15)", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontFamily: "Poppins, sans-serif" }}>
                        Sign Out
                    </button>
                </div>
            </nav>

            {/* ── Personalized Hero ── */}
            <section style={{
                minHeight: "80vh", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", textAlign: "center",
                padding: "80px 24px",
                background: "radial-gradient(ellipse at 50% 0%, rgba(59,31,0,0.08) 0%, transparent 70%)",
                position: "relative",
            }}>
                <div style={{
                    position: "absolute", inset: 0, zIndex: 0,
                    backgroundImage: "radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                }} />
                <div style={{ position: "relative", zIndex: 1, maxWidth: 680 }}>
                   
                    <h1 style={{
                        fontSize: "clamp(36px, 7vw, 64px)", fontWeight: 900,
                        color: "#0A0A0A", letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: 32,
                    }}>
                        Good to see you <span style={{ color: "#3B1F00" }}>{customer.first_name}.</span>
                    </h1>


                    {/* CTAs */}
                    <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                        <Link href="/me" style={{
                            textDecoration: "none", padding: "13px 28px", borderRadius: 8,
                            background: "#3B1F00", color: "#FFF", fontWeight: 700, fontSize: 13,
                        }}>View My Membership</Link>
                        {customer.is_active && customer.qr_code && (
                            <Link href="/me" style={{
                                textDecoration: "none", padding: "13px 28px", borderRadius: 8,
                                background: "transparent", color: "#0A0A0A", fontWeight: 700, fontSize: 13,
                                border: "1px solid rgba(0,0,0,0.15)",
                            }}>Show My QR ↗</Link>
                        )}
                        <a href="#menu" style={{
                            textDecoration: "none", padding: "13px 28px", borderRadius: 8,
                            background: "transparent", color: "#0A0A0A", fontWeight: 700, fontSize: 13,
                            border: "1px solid rgba(0,0,0,0.15)",
                        }}>See Our Menu ↓</a>
                    </div>
                </div>
            </section>

            {/* ── Menu ── */}
            <MenuSection />

            {/* ── Membership Perks ── */}
            <section id="membership" style={{ padding: "100px 24px", background: "#0A0A0A", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
                <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
                    <div style={{ textAlign: "center", marginBottom: 64 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#C8A882", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>Membership Perks</p>
                        <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, color: "#FFF", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                            More than just coffee.<br /><span style={{ color: "#C8A882" }}>It's a lifestyle.</span>
                        </h2>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
                        {benefits.map((b) => (
                            <div key={b.title} style={{
                                background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 28,
                                border: "1px solid rgba(255,255,255,0.08)", transition: "all 0.2s",
                            }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}>
                                <div style={{ fontSize: 28, marginBottom: 16 }}>{b.icon}</div>
                                <h3 style={{ fontSize: 15, fontWeight: 800, color: "#FFF", marginBottom: 8 }}>{b.title}</h3>
                                <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6 }}>{b.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── About ── */}
            <section id="about" style={{ padding: "100px 24px", background: "#FFF" }}>
                <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#3B1F00", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>Our Story</p>
                    <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, color: "#0A0A0A", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 24 }}>
                        Born from a love<br />of good coffee.
                    </h2>
                    <p style={{ fontSize: 15, color: "#666", lineHeight: 1.8, marginBottom: 20 }}>
                        KapéoPle started as a small corner in Iloilo City where locals could gather, slow down, and enjoy a well-crafted cup. We believe coffee is best shared — with friends, with strangers, and with the community.
                    </p>
                    <p style={{ fontSize: 15, color: "#666", lineHeight: 1.8, marginBottom: 48 }}>
                        Our membership program was born out of that same spirit — to reward the people who make our shop feel alive every single day.
                    </p>
                    <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                        {[["2022", "Est."], ["Iloilo", "City"], ["100%", "Local"]].map(([val, label]) => (
                            <div key={label} style={{ background: "#FAFAFA", border: "1px solid #EEE", borderRadius: 12, padding: "20px 32px", textAlign: "center" }}>
                                <div style={{ fontSize: 28, fontWeight: 900, color: "#3B1F00" }}>{val}</div>
                                <div style={{ fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>{label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer style={{ background: "#0A0A0A", padding: "48px 24px" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 28, height: 28, background: "#3B1F00", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ color: "#FFF", fontWeight: 900, fontSize: 16, lineHeight: 1 }}>!</span>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: 16, color: "#FFF", letterSpacing: "-0.02em" }}>kapé<span style={{ color: "#C8A882" }}>ople.</span></span>
                    </div>
                    <p style={{ fontSize: 12, color: "#555" }}>© 2026 KapéoPle. All rights reserved.</p>
                    <div style={{ display: "flex", gap: 24 }}>
                        <Link href="/me" style={{ fontSize: 12, color: "#C8A882", textDecoration: "none", fontWeight: 600 }}>My Account</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}