"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser as supabase } from "@/lib/supabase";
import MenuSection from "@/components/MenuSection";
import s from "./home.module.css";

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

    if (loading) {
        return (
            <div className={s.loading}>
                <div className={s.loadingDots}>
                    <div className={s.loadingDot} />
                    <div className={s.loadingDot} />
                    <div className={s.loadingDot} />
                </div>
            </div>
        );
    }

    if (!customer) return null;

    return (
        <div className={s.page}>

            {/* ── Navbar ── */}
            <nav className={`${s.nav} ${scrolled ? s.navScrolled : ""}`}>
                <Link href="/home" className={s.logo}>
                    <div className={s.logoDot}>
                        <div className={s.logoDotInner} />
                    </div>
                    <span className={s.logoText}>
                        kapé<span className={s.logoAccent}>ople.</span>
                    </span>
                </Link>

                <div className={s.navLinks}>
                    {["Menu", "Membership", "About"].map((l) => (
                        <a key={l} href={`#${l.toLowerCase()}`} className={s.navLink}>{l}</a>
                    ))}
                </div>

                <div className={s.navActions}>
                    <Link href="/me" className={s.navAvatar}>
                        <div className={s.avatarCircle}>
                            <span className={s.avatarLetter}>
                                {customer.first_name?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <span className={s.avatarName}>{customer.first_name}</span>
                    </Link>
                    <button onClick={handleLogout} className={s.signOutBtn}>Sign Out</button>
                </div>
            </nav>

            {/* ── Hero ── */}
            <section className={s.hero}>
                <div className={s.heroBg} />
                <div className={s.heroInner}>
                    <div className={s.heroBadge}>
                        <div className={s.heroBadgeDot} />
                        <span className={s.heroBadgeText}>Welcome back, member</span>
                    </div>
                    <h1 className={s.heroTitle}>
                        Good to<br />see you,{" "}
                        <span className={s.heroAccent}>{customer.first_name}.</span>
                    </h1>
                    <div className={s.heroCtas}>
                        <Link href="/me" className={s.ctaPrimary}>View Membership</Link>
                        {customer.is_active && customer.qr_code && (
                            <Link href="/me" className={s.ctaSecondary}>Show QR ↗</Link>
                        )}
                        <a href="#menu" className={s.ctaSecondary}>Our Menu ↓</a>
                    </div>
                </div>
            </section>

            <div className={s.divider} />

            {/* ── Menu ── */}
            <MenuSection />

            <div className={s.divider} />

            {/* ── Membership Perks ── */}
            <section id="membership" className={s.perks}>
                <div className={s.perksBg} />
                <div className={s.perksInner}>
                    <p className={s.sectionLabel}>Membership Perks</p>
                    <h2 className={s.sectionTitleDark}>
                        More than<br />just coffee.<br />
                        <span className={s.sectionTitleDarkAccent}>It's a lifestyle.</span>
                    </h2>
                    <div className={s.perksGrid}>
                        {benefits.map((b) => (
                            <div key={b.title} className={s.perkCard}>
                                <span className={s.perkIcon}>{b.icon}</span>
                                <h3 className={s.perkTitle}>{b.title}</h3>
                                <p className={s.perkDesc}>{b.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── About ── */}
            <section id="about" className={s.about}>
                <div className={s.aboutInner}>
                    <div className={s.aboutLeft}>
                        <p className={s.sectionLabelLight}>Our Story</p>
                        <h2 className={s.sectionTitleLight}>
                            Born from a<br />love of good<br />coffee.
                        </h2>
                        <p className={s.aboutText}>
                            KapéoPle started as a small corner in Iloilo City where locals could gather, slow down, and enjoy a well-crafted cup. We believe coffee is best shared — with friends, with strangers, and with the community.
                        </p>
                        <p className={s.aboutText}>
                            Our membership program was born out of that same spirit — to reward the people who make our shop feel alive every single day.
                        </p>
                    </div>
                    <div className={s.aboutRight}>
                        {[["2022", "Established"], ["Iloilo", "City"], ["100%", "Local & Independent"]].map(([val, label]) => (
                            <div key={label} className={s.statRow}>
                                <span className={s.statVal}>{val}</span>
                                <span className={s.statLabel}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className={s.footer}>
                <div className={s.footerInner}>
                    <div className={s.footerLogo}>
                        <div className={s.footerLogoDot}>
                            <div className={s.footerLogoDotInner} />
                        </div>
                        <span className={s.footerLogoText}>
                            kapé<span className={s.footerLogoAccent}>ople.</span>
                        </span>
                    </div>
                    <p className={s.footerCopy}>© 2026 KapéoPle. All rights reserved.</p>
                    <Link href="/me" className={s.footerLink}>My Account</Link>
                </div>
            </footer>
        </div>
    );
}