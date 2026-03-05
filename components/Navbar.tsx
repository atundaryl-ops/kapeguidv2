"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Logo = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    {/* Exclamation mark logo inspired by brand */}
    <div style={{
      width: 32, height: 32, borderRadius: "50%",
      background: "var(--warm)", display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
    <span style={{ color: "#FFFFFF", fontFamily: "Poppins, sans-serif", fontWeight: 900, fontSize: 18, lineHeight: 1, marginTop: -1 }}>!</span>    </div>
    <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 18, color: "var(--text)", letterSpacing: "-0.02em" }}>
      kape<span style={{ color: "var(--warm-light)" }}>guid.</span>
    </span>
  </div>
);

export default function Navbar() {
  const path = usePathname();

  const links = [
    {
      href: "/dashboard", label: "Dashboard",
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    },
    {
      href: "/scan", label: "Scan",
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 7V4h3M17 4h3v3M4 17v3h3M17 20h3v-3"/>
        <rect x="8" y="8" width="8" height="8"/>
      </svg>
    },
    {
      href: "/customers", label: "Customers",
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="7" r="4"/>
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.87"/>
      </svg>
    },
  ];

  return (
    <nav className="sticky top-0 z-40" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between" style={{ height: 56 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <Logo />
        </Link>

        <div className="flex items-center gap-1">
          {links.map((l) => {
            const active = path === l.href;
            return (
              <Link key={l.href} href={l.href} style={{ textDecoration: "none" }}>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded transition-all"
                  style={{
                    fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
                    color: active ? "var(--text)" : "var(--text-muted)",
                    background: active ? "var(--surface2)" : "transparent",
                    border: active ? "1px solid var(--border2)" : "1px solid transparent",
                  }}>
                  {l.icon}
                  <span className="hidden sm:inline">{l.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
