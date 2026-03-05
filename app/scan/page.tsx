"use client";
import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import { supabase, type Customer } from "@/lib/supabase";
import { format } from "date-fns";

type ScanState = "idle" | "scanning" | "loading" | "success" | "error" | "unknown";

export default function ScanPage() {
  const scannerRef = useRef<any>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ScanState>("idle");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [cameraError, setCameraError] = useState("");

  async function handleQRCode(qrCode: string) {
    if (state === "loading" || state === "success") return;
    setState("loading");
    await stopScanner();

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("qr_code", qrCode.trim())
      .single();

    if (error || !data) {
      setState("unknown");
      setErrorMsg("No customer found for this QR code.");
      return;
    }

    // Record visit
    await supabase.from("visits").insert({ customer_id: data.id, visited_at: new Date().toISOString() });

    setCustomer(data);
    setState("success");
  }

  async function startScanner() {
    setCameraError("");
    setState("scanning");

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded: string) => handleQRCode(decoded),
        undefined
      );
    } catch (e: any) {
      setCameraError("Camera access denied or unavailable. Please allow camera permissions.");
      setState("idle");
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
  }

  function reset() {
    setCustomer(null);
    setErrorMsg("");
    setState("idle");
  }

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />
      <div className="relative z-10 max-w-md mx-auto px-4 py-10">

        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-0.5 h-4" style={{ background: "var(--warm)" }} />
            <span className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Customer Check-in</span>
          </div>
          <h1 className="font-display text-3xl font-bold" style={{ color: "var(--text)" }}>Scan QR Code</h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Point the camera at a customer's QR code</p>
        </div>

        {/* Scanner states */}
        {(state === "idle" || state === "scanning") && (
          <div className="animate-slide-up">
            {/* Scanner viewport */}
            <div className="relative rounded-sm overflow-hidden mb-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", aspectRatio: "1" }}>
              <div id="qr-reader" ref={divRef} style={{ width: "100%", height: "100%" }} />

              {state === "idle" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(200,184,154,0.4)" strokeWidth="1">
                    <path d="M4 7V4h3M17 4h3v3M4 17v3h3M17 20h3v-3"/>
                    <rect x="6" y="6" width="5" height="5" rx="0.5"/><rect x="13" y="6" width="5" height="5" rx="0.5"/>
                    <rect x="6" y="13" width="5" height="5" rx="0.5"/><rect x="13" y="13" width="5" height="5" rx="0.5"/>
                  </svg>
                  <p className="text-xs tracking-wider" style={{ color: "var(--text-muted)" }}>Camera is off</p>
                </div>
              )}

              {state === "scanning" && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Corner brackets */}
                  {[["top-8 left-8","border-t border-l"],["top-8 right-8","border-t border-r"],
                    ["bottom-8 left-8","border-b border-l"],["bottom-8 right-8","border-b border-r"]].map(([pos, cls], i) => (
                    <div key={i} className={`absolute w-6 h-6 ${pos} ${cls}`}
                      style={{ borderColor: "var(--warm)", borderWidth: 2 }} />
                  ))}
                  {/* Scan line */}
                  <div className="absolute left-8 right-8 h-px opacity-60"
                    style={{ background: "var(--warm)", animation: "scanLine 2s linear infinite", top: "30%" }} />
                </div>
              )}
            </div>

            {cameraError && (
              <div className="mb-4 p-3 rounded-sm text-xs" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--red)" }}>
                {cameraError}
              </div>
            )}

            {state === "idle" ? (
              <button className="btn btn-primary w-full justify-center" onClick={startScanner} style={{ padding: "12px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2"/>
                </svg>
                Start Camera
              </button>
            ) : (
              <button className="btn btn-ghost w-full justify-center" onClick={() => { stopScanner(); setState("idle"); }} style={{ padding: "12px" }}>
                Stop Camera
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {state === "loading" && (
          <div className="surface rounded-sm p-10 text-center animate-fade-in">
            <div className="text-4xl mb-4 animate-pulse">☕</div>
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Looking up customer…</p>
          </div>
        )}

        {/* Success */}
        {state === "success" && customer && (
          <div className="animate-slide-up">
            <div className="surface rounded-sm p-6 mb-4">
              <div className="flex items-center gap-3 mb-5 pb-5" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center font-display font-black text-2xl"
                  style={{ background: "var(--surface2)", color: "var(--warm)", border: "1px solid var(--border2)" }}>
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold" style={{ color: "var(--text)" }}>{customer.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`badge ${customer.is_active ? "badge-green" : "badge-red"}`}>
                      {customer.is_active ? "● Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Phone", value: customer.phone },
                  { label: "Email", value: customer.email ?? "—" },
                  { label: "Total Visits", value: `${customer.visit_count} visits` },
                  { label: "Last Visit", value: customer.last_visit ? format(new Date(customer.last_visit), "MMM d, yyyy · h:mm a") : "—" },
                  { label: "Member Since", value: format(new Date(customer.created_at), "MMMM d, yyyy") },
                  ...(customer.notes ? [{ label: "Notes", value: customer.notes }] : []),
                ].map((row) => (
                  <div key={row.label} className="flex justify-between gap-4">
                    <span className="text-xs uppercase tracking-wider flex-shrink-0" style={{ color: "var(--text-muted)" }}>{row.label}</span>
                    <span className="text-xs text-right" style={{ color: "var(--text)" }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-sm text-center mb-4"
              style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)" }}>
              <div className="text-2xl mb-1">✓</div>
              <p className="text-xs font-medium" style={{ color: "var(--green)" }}>Visit recorded successfully</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{format(new Date(), "h:mm a")}</p>
            </div>

            <button className="btn btn-primary w-full justify-center" onClick={reset} style={{ padding: "12px" }}>
              Scan Another
            </button>
          </div>
        )}

        {/* Unknown / error */}
        {(state === "unknown" || state === "error") && (
          <div className="animate-slide-up">
            <div className="surface rounded-sm p-8 text-center mb-4">
              <div className="text-3xl mb-3 opacity-40">⚠</div>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>QR Code Not Recognised</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{errorMsg}</p>
            </div>
            <button className="btn btn-primary w-full justify-center" onClick={reset} style={{ padding: "12px" }}>
              Try Again
            </button>
          </div>
        )}

        <style>{`
          #qr-reader video { object-fit: cover; width: 100% !important; height: 100% !important; border-radius: 0; }
          #qr-reader img, #qr-reader button, #qr-reader > div:last-child { display: none !important; }
          @keyframes scanLine {
            0% { top: 30%; } 100% { top: 70%; }
          }
        `}</style>
      </div>
    </div>
  );
}
