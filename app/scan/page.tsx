"use client";
import { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import { supabase, type Customer, getDisplayName, getInitial } from "@/lib/supabase";
import { format } from "date-fns";

type ScanState = "idle" | "scanning" | "loading" | "success" | "error" | "unknown";

export default function ScanPage() {
  const scannerRef = useRef<any>(null);
  const divRef     = useRef<HTMLDivElement>(null);
  const [state, setState]           = useState<ScanState>("idle");
  const [customer, setCustomer]     = useState<Customer | null>(null);
  const [errorMsg, setErrorMsg]     = useState("");
  const [cameraError, setCameraError] = useState("");
  const [redeeming, setRedeeming]   = useState(false);
  const [redeemed, setRedeemed]     = useState(false);

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
    // Block if card is expired
    const isExpired = data.expiry_date && new Date(data.expiry_date) < new Date();
    if (isExpired) {
      setState("unknown");
      setErrorMsg(`${data.first_name ?? data.name}'s card expired on ${new Date(data.expiry_date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}. Please renew their membership.`);
      return;
    }

    // Record visit
    await supabase.from("visits").insert({ customer_id: data.id, visited_at: new Date().toISOString() });
    setCustomer(data);
    setRedeemed(false);
    setState("success");
      }

  async function handleRedeemCoffee() {
    if (!customer) return;
    setRedeeming(true);
    const redeemNote = `Free coffee redeemed on ${format(new Date(), "MMMM d, yyyy")}.`;
    const newNotes = customer.notes ? `${redeemNote} ${customer.notes}` : redeemNote;
    await supabase.from("customers").update({
      free_coffee: false,
      notes: newNotes,
    }).eq("id", customer.id);
    setCustomer({ ...customer, free_coffee: false, notes: newNotes });
    setRedeemed(true);
    setRedeeming(false);
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
    setRedeemed(false);
    setState("idle");
  }

  useEffect(() => { return () => { stopScanner(); }; }, []);

  // Free coffee status helpers
  const freeCoffeeActive    = customer?.free_coffee === true;
  const freeCoffeeInactive  = customer?.free_coffee === false;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar />
      <div className="relative z-10 max-w-md mx-auto px-4 py-10">

        <div className="mb-8 animate-fade-in">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--warm-light)" }}>Customer Check-in</p>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>Scan QR Code</h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Point the camera at a customer's QR card</p>
        </div>

        {/* Scanner */}
        {(state === "idle" || state === "scanning") && (
          <div className="animate-slide-up">
            <div className="relative rounded overflow-hidden mb-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", aspectRatio: "1" }}>
              <div id="qr-reader" ref={divRef} style={{ width: "100%", height: "100%" }} />

              {state === "idle" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(139,99,67,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(196,154,108,0.5)" strokeWidth="1.5">
                      <path d="M4 7V4h3M17 4h3v3M4 17v3h3M17 20h3v-3"/>
                      <rect x="6" y="6" width="5" height="5" rx="0.5"/><rect x="13" y="6" width="5" height="5" rx="0.5"/>
                      <rect x="6" y="13" width="5" height="5" rx="0.5"/><rect x="13" y="13" width="5" height="5" rx="0.5"/>
                    </svg>
                  </div>
                  <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Camera is off</p>
                </div>
              )}

              {state === "scanning" && (
                <div className="absolute inset-0 pointer-events-none">
                  {[["top-6 left-6","border-t border-l"],["top-6 right-6","border-t border-r"],
                    ["bottom-6 left-6","border-b border-l"],["bottom-6 right-6","border-b border-r"]].map(([pos, cls], i) => (
                    <div key={i} className={`absolute w-7 h-7 ${pos} ${cls}`}
                      style={{ borderColor: "var(--warm-light)", borderWidth: 2 }} />
                  ))}
                  <div className="absolute left-6 right-6 h-px opacity-70"
                    style={{ background: "var(--warm-light)", animation: "scanLine 2s linear infinite", top: "20%" }} />
                </div>
              )}
            </div>

            {cameraError && (
              <div className="mb-4 p-3 rounded text-xs" style={{ background: "rgba(235,87,87,0.08)", border: "1px solid rgba(235,87,87,0.2)", color: "var(--red)" }}>
                {cameraError}
              </div>
            )}

            {state === "idle" ? (
              <button className="btn btn-primary w-full justify-center" onClick={startScanner} style={{ padding: "13px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2"/>
                </svg>
                Start Camera
              </button>
            ) : (
              <button className="btn btn-ghost w-full justify-center" onClick={() => { stopScanner(); setState("idle"); }} style={{ padding: "13px" }}>
                Stop Camera
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {state === "loading" && (
          <div className="surface rounded p-10 text-center animate-fade-in">
            <div className="text-4xl mb-4 animate-pulse">☕</div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Looking up customer…</p>
          </div>
        )}

        {/* Success */}
        {state === "success" && customer && (
          <div className="animate-slide-up space-y-3">

            {/* Customer card */}
            <div className="surface rounded p-5">
              <div className="flex items-center gap-4 mb-5 pb-5" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-2xl flex-shrink-0"
                  style={{ background: "rgba(139,99,67,0.2)", color: "var(--warm-light)", border: "2px solid rgba(139,99,67,0.3)" }}>
                  {getInitial(customer)}
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{getDisplayName(customer)}</h2>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`badge ${customer.is_active ? "badge-green" : "badge-gray"}`}>
                      {customer.is_active ? "● Active" : "Inactive"}
                    </span>
                    <span className="badge badge-warm">{customer.visit_count} visits</span>
                  </div>
                </div>
              </div>

              {/* Customer info rows */}
              <div className="space-y-3">
                {[
                  { label: "Phone",        value: customer.phone },
                  { label: "Email",        value: customer.email ?? "—" },
                  { label: "Member Since", value: format(new Date(customer.created_at), "MMMM d, yyyy") },
                  { label: "Last Visit",   value: customer.last_visit ? format(new Date(customer.last_visit), "MMM d, yyyy") : "—" },
                  ...(customer.access_code ? [{ label: "Access Code", value: customer.access_code }] : []),
                ].map((row) => (
                  <div key={row.label} className="flex justify-between gap-4">
                    <span className="text-xs font-semibold uppercase tracking-wider flex-shrink-0" style={{ color: "var(--text-muted)" }}>{row.label}</span>
                    <span className="text-xs text-right font-medium" style={{ color: "var(--text)" }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Free Coffee Section ── */}
            <div className="rounded p-4" style={{
              background: freeCoffeeActive
                ? "rgba(139,99,67,0.08)"
                : "rgba(255,255,255,0.03)",
              border: `1px solid ${freeCoffeeActive ? "rgba(139,99,67,0.35)" : "var(--border)"}`,
            }}>
              {/* Already redeemed just now */}
              {redeemed ? (
                <div className="text-center py-1">
                  <div className="text-2xl mb-1">☕</div>
                  <p className="text-sm font-bold" style={{ color: "var(--warm-light)" }}>Free Coffee Redeemed!</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Marked as used for this month.</p>
                </div>
              ) : freeCoffeeActive ? (
                /* Eligible — show redeem button */
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">☕</span>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--warm-light)" }}>Free Coffee Available</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>This customer is eligible this month</p>
                    </div>
                  </div>
                  <button
                    className="btn w-full justify-center"
                    style={{ background: "var(--warm)", color: "#000", border: "none", padding: "10px", fontWeight: 700 }}
                    onClick={handleRedeemCoffee}
                    disabled={redeeming}>
                    {redeeming ? "Saving…" : "☕ Redeem Free Coffee"}
                  </button>
                </div>
              ) : (
                /* Not eligible */
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-faint)" }}>
                      <circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>Not Eligible for Free Coffee</p>
                    <p className="text-xs" style={{ color: "var(--text-faint)" }}>Resets at the start of next month</p>
                  </div>
                </div>
              )}
            </div>

            {/* Visit confirmed */}
            <div className="rounded p-4 text-center"
              style={{ background: "rgba(111,207,151,0.06)", border: "1px solid rgba(111,207,151,0.2)" }}>
              <p className="text-sm font-bold" style={{ color: "var(--green)" }}>✓ Visit Recorded</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{format(new Date(), "EEEE, MMMM d · h:mm a")}</p>
            </div>

            <button className="btn btn-primary w-full justify-center" onClick={reset} style={{ padding: "13px" }}>
              Scan Another
            </button>
          </div>
        )}

        {/* Unknown */}
        {(state === "unknown" || state === "error") && (
          <div className="animate-slide-up">
            <div className="surface rounded p-8 text-center mb-4">
              <div className="text-3xl mb-3 opacity-30">⚠</div>
              <p className="text-sm font-bold mb-1" style={{ color: "var(--text)" }}>QR Code Not Recognised</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{errorMsg}</p>
            </div>
            <button className="btn btn-primary w-full justify-center" onClick={reset} style={{ padding: "13px" }}>
              Try Again
            </button>
          </div>
        )}

       <style dangerouslySetInnerHTML={{ __html: `
          #qr-reader video { object-fit: cover; width: 100% !important; height: 100% !important; border-radius: 0; }
          #qr-reader img, #qr-reader button, #qr-reader > div:last-child { display: none !important; }
        `}} />
      </div>
    </div>
  );
}
