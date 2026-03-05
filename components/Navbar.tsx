"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const BeanIcon = () => (
  <svg width="22" height="22" viewBox="0 0 36 36" fill="none">
    <ellipse cx="18" cy="21" rx="11" ry="8" stroke="#EDEDEB" strokeWidth="1.3" fill="none"/>
    <path d="M11 18 Q18 12 25 18" stroke="#EDEDEB" strokeWidth="1.3" fill="none"/>
    <ellipse cx="18" cy="21" rx="2.5" ry="2" fill="#C8B89A" opacity="0.7"/>
    <path d="M13 10 Q14.5 7.5 13 5" stroke="#C8B89A" strokeWidth="1" fill="none" strokeLinecap="round"/>
    <path d="M18 9 Q19.5 6.5 18 4" stroke="#C8B89A" strokeWidth="1" fill="none" strokeLinecap="round"/>
    <path d="M23 10 Q24.5 7.5 23 5" stroke="#C8B89A" strokeWidth="1" fill="none" strokeLinecap="round"/>
  </svg>
);

export default function Navbar() {
  const path = usePathname();

  const links = [
    {
      href: "/dashboard", label: "Dashboard",
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    },
    {
      href: "/scan", label: "Scan",
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 7V4h3M17 4h3v3M4 17v3h3M17 20h3v-3"/>
        <rect x="8" y="8" width="8" height="8"/>
      </svg>
    },
    {
      href: "/customers", label: "Customers",
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="7" r="4"/>
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.87"/>
      </svg>
    },
  ];

  return (
    <nav className="sticky top-0 z-40" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
      <div className="max-w-6xl mx-auto px-4 h-13 flex items-center justify-between" style={{ height: 52 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div className="flex items-center gap-2">
            <BeanIcon />
            <span className="font-display font-bold text-xl" style={{ color: "var(--text)" }}>
              Kape<span style={{ color: "var(--warm)" }}>Guid</span>
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          {links.map((l) => {
            const active = path === l.href;
            return (
              <Link key={l.href} href={l.href} style={{ textDecoration: "none" }}>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition-all text-xs tracking-wider uppercase"
                  style={{
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
