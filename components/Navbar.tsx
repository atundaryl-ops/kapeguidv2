"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { createBrowserClient } from "@supabase/ssr";

const Logo = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{
      width: 32, height: 32, borderRadius: "50%",
      background: "var(--warm)", display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <span style={{ color: "#FFF", fontFamily: "Poppins, sans-serif", fontWeight: 900, fontSize: 18, lineHeight: 1, marginTop: -1 }}>!</span>
    </div>
    <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: 800, fontSize: 18, color: "var(--text)", letterSpacing: "-0.02em" }}>
      Kape<span style={{ color: "var(--warm-light)" }}>Guid</span>
    </span>
  </div>
);

export default function Navbar() {
  const path = usePathname();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);

  const supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleLogout() {
    await supabaseClient.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    async function fetchPending() {
      const { count } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("payment_status", "submitted");
      setPendingCount(count ?? 0);
    }

    fetchPending();

    const ch = supabase.channel("navbar-pending")
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, fetchPending)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  const links = [
    {
      href: "/dashboard", label: "Dashboard",
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>,
      badge: 0,
    },
    {
      href: "/scan", label: "Scan",
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 7V4h3M17 4h3v3M4 17v3h3M17 20h3v-3" />
        <rect x="8" y="8" width="8" height="8" />
      </svg>,
      badge: 0,
    },
    {
      href: "/customers", label: "Customers",
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.87" />
      </svg>,
      badge: pendingCount,
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
                <div className="flex items-center gap-1.5 px-3 py-2 rounded transition-all relative"
                  style={{
                    fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
                    color: active ? "var(--text)" : "var(--text-muted)",
                    background: active ? "var(--surface2)" : "transparent",
                    border: active ? "1px solid var(--border2)" : "1px solid transparent",
                  }}>
                  {l.icon}
                  <span className="hidden sm:inline">{l.label}</span>
                  {l.badge > 0 && (
                    <div style={{
                      position: "absolute", top: -4, right: -4,
                      minWidth: 16, height: 16, borderRadius: 99,
                      background: "#DC2626", color: "#FFF",
                      fontSize: 9, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 4px", border: "2px solid var(--surface)",
                    }}>
                      {l.badge > 99 ? "99+" : l.badge}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
           <Link href="/settings" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", textDecoration: "none", padding: "6px 12px" }}>
            Settings
          </Link>
          {/* Sign Out */}
          <button onClick={handleLogout}
            style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
              color: "var(--text-muted)", background: "transparent", border: "1px solid transparent",
              borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontFamily: "Poppins, sans-serif",
            }}>
            Sign Out
          </button>
         
        </div>
      </div>
    </nav>
  );
}