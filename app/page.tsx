import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative px-6 overflow-hidden" style={{ background: "var(--bg)" }}>
      <div className="relative z-10 w-full max-w-sm animate-fade-in">

        {/* Logo mark */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-5"
            style={{ border: "1px solid var(--border2)", background: "var(--surface)" }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              {/* Coffee bean */}
              <ellipse cx="18" cy="20" rx="12" ry="9" stroke="#EDEDEB" strokeWidth="1.2" fill="none"/>
              <path d="M10 17 Q18 11 26 17" stroke="#EDEDEB" strokeWidth="1.2" fill="none"/>
              <ellipse cx="18" cy="20" rx="3" ry="2.5" fill="#C8B89A" opacity="0.6"/>
              {/* Steam */}
              <path d="M13 9 Q15 6 13 3" stroke="#C8B89A" strokeWidth="1" fill="none" strokeLinecap="round"/>
              <path d="M18 8 Q20 5 18 2" stroke="#C8B89A" strokeWidth="1" fill="none" strokeLinecap="round"/>
              <path d="M23 9 Q25 6 23 3" stroke="#C8B89A" strokeWidth="1" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="font-display text-4xl font-black tracking-tight" style={{ color: "var(--text)" }}>
            Kape<span style={{ color: "var(--warm)" }}>Guid</span>
          </h1>
          <p className="mt-2 text-xs tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
            Coffee Shop · Customer System
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <span style={{ color: "var(--text-faint)", fontSize: 10 }}>◆</span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2">
          {[
            {
              href: "/dashboard",
              title: "Dashboard",
              sub: "Live overview & today's activity",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              ),
              highlight: false,
            },
            {
              href: "/scan",
              title: "Scan QR Code",
              sub: "Check in a customer visit",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C8B89A" strokeWidth="1.5">
                  <path d="M4 7V4h3M17 4h3v3M4 17v3h3M17 20h3v-3"/>
                  <rect x="7" y="7" width="4" height="4"/><rect x="13" y="7" width="4" height="4"/>
                  <rect x="7" y="13" width="4" height="4"/><rect x="13" y="13" width="4" height="4"/>
                </svg>
              ),
              highlight: true,
            },
            {
              href: "/customers",
              title: "Customers",
              sub: "Manage & register members",
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.87"/>
                </svg>
              ),
              highlight: false,
            },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <div className="flex items-center gap-4 p-4 rounded-sm transition-all group"
                style={{
                  background: item.highlight ? "rgba(200,184,154,0.05)" : "var(--surface)",
                  border: `1px solid ${item.highlight ? "rgba(200,184,154,0.3)" : "var(--border)"}`,
                }}>
                <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 rounded-sm"
                  style={{ background: "var(--surface2)", color: item.highlight ? "var(--warm)" : "var(--text-muted)" }}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium" style={{ color: item.highlight ? "var(--warm)" : "var(--text)" }}>
                    {item.title}
                  </div>
                  <div className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{item.sub}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke={item.highlight ? "var(--warm)" : "var(--text-faint)"} strokeWidth="2"
                  className="flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </Link>
          ))}
        </nav>

        <p className="text-center mt-8 text-xs" style={{ color: "var(--text-faint)" }}>
          Supabase · Next.js · Vercel
        </p>
      </div>
    </main>
  );
}
