"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleLogin() {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAFA", fontFamily: "Poppins, sans-serif", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: "#0A0A0A", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <span style={{ color: "#FFF", fontWeight: 900, fontSize: 24, lineHeight: 1 }}>!</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0A0A0A", letterSpacing: "-0.02em" }}>Staff Login</h1>
          <p style={{ fontSize: 13, color: "#888", marginTop: 6 }}>KapeGuid · Customer System</p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#DC2626" }}>
            {error}
          </div>
        )}

        {/* Form */}
        <div style={{ background: "#FFF", borderRadius: 12, border: "1px solid #E5E5E5", padding: 24, marginBottom: 16 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", display: "block", marginBottom: 6 }}>Email</label>
            <input
              type="email"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #DDD", fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none" }}
              placeholder="staff@kapeguid.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", display: "block", marginBottom: 6 }}>Password</label>
            <input
              type="password"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #DDD", fontSize: 13, fontFamily: "Poppins, sans-serif", outline: "none" }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>
        </div>

        <button onClick={handleLogin} disabled={loading}
          style={{
            width: "100%", padding: "13px", borderRadius: 8,
            background: loading ? "#888" : "#0A0A0A", color: "#FFF",
            border: "none", fontFamily: "Poppins, sans-serif",
            fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
          }}>
          {loading ? "Signing in…" : "Sign In"}
        </button>

        <p style={{ textAlign: "center", fontSize: 11, color: "#AAA", marginTop: 20 }}>
          Powered by KapeGuid
        </p>
      </div>
    </main>
  );
}