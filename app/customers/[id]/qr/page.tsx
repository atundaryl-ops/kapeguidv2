"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase, type Customer } from "@/lib/supabase";
import { format } from "date-fns";

export default function QRCardPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setCustomer(data);

      const QRCode = await import("qrcode");
      const url = await QRCode.toDataURL(data.qr_code, {
        width: 320,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
        errorCorrectionLevel: "H",
      });
      setQrDataUrl(url);
      setLoading(false);
    }
    load();
  }, [id]);

  function handlePrint() { window.print(); }

  async function handleDownload() {
    if (!qrDataUrl || !customer) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `kapeguid-${customer.name.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">☕</div>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Generating QR…</p>
      </div>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="text-center">
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Customer not found.</p>
        <Link href="/customers" className="btn btn-ghost">← Back to Customers</Link>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Screen UI (hidden when printing) ── */}
      <div className="no-print min-h-screen" style={{ background: "var(--bg)" }}>
        {/* Top bar */}
        <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <div className="max-w-2xl mx-auto px-4 h-13 flex items-center justify-between" style={{ height: 52 }}>
            <Link href="/customers" className="flex items-center gap-2 btn btn-ghost" style={{ padding: "6px 12px" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Customers
            </Link>
            <div className="flex items-center gap-2">
              <button className="btn btn-ghost" onClick={handleDownload}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Download PNG
              </button>
              <button className="btn btn-primary" onClick={handlePrint}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Print Card
              </button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="mb-6 animate-fade-in">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-0.5 h-4" style={{ background: "var(--warm)" }} />
              <span className="text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>QR Member Card</span>
            </div>
            <h1 className="font-display text-2xl font-bold" style={{ color: "var(--text)" }}>{customer!.name}</h1>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Print this card and give it to the customer. Staff scan it on every visit.
            </p>
          </div>

          {/* Card preview */}
          <div className="animate-slide-up flex justify-center">
            <QRCard customer={customer!} qrDataUrl={qrDataUrl} />
          </div>

          <div className="mt-6 p-4 rounded-sm animate-fade-in"
            style={{ background: "rgba(200,184,154,0.05)", border: "1px solid rgba(200,184,154,0.2)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              <span style={{ color: "var(--warm)" }}>◈ Tip:</span> Print on thick card stock (A6 or business card size) and laminate for durability.
              The QR code encodes a unique ID — only your KapeGuid system can read it.
            </p>
          </div>
        </div>
      </div>

      {/* ── Print layout (only shown when printing) ── */}
      <div className="print-only">
        <QRCard customer={customer!} qrDataUrl={qrDataUrl} printMode />
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: flex !important; align-items: center; justify-content: center; min-height: 100vh; }
          body { background: white !important; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>
    </>
  );
}

function QRCard({ customer, qrDataUrl, printMode = false }: { customer: Customer; qrDataUrl: string; printMode?: boolean }) {
  const visits = customer.visit_count;
  const beans = Math.min(visits, 10);

  return (
    <div style={{
      width: printMode ? "85.6mm" : 340,
      background: "#FFFFFF",
      borderRadius: printMode ? 8 : 4,
      overflow: "hidden",
      boxShadow: printMode ? "none" : "0 0 0 1px #e5e5e5, 0 8px 40px rgba(0,0,0,0.4)",
      fontFamily: "'DM Mono', monospace",
      color: "#0A0A0A",
    }}>
      {/* Card header */}
      <div style={{ background: "#0A0A0A", padding: "18px 20px 14px", position: "relative", overflow: "hidden" }}>
        {/* Subtle dot pattern */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            {/* Bean icon */}
            <svg width="20" height="20" viewBox="0 0 36 36" fill="none">
              <ellipse cx="18" cy="21" rx="11" ry="8" stroke="#C8B89A" strokeWidth="1.3" fill="none"/>
              <path d="M11 18 Q18 12 25 18" stroke="#C8B89A" strokeWidth="1.3" fill="none"/>
              <ellipse cx="18" cy="21" rx="2.5" ry="2" fill="#C8B89A" opacity="0.7"/>
              <path d="M13 10 Q14.5 7.5 13 5" stroke="#C8B89A" strokeWidth="1" fill="none" strokeLinecap="round"/>
              <path d="M18 9 Q19.5 6.5 18 4" stroke="#C8B89A" strokeWidth="1" fill="none" strokeLinecap="round"/>
              <path d="M23 10 Q24.5 7.5 23 5" stroke="#C8B89A" strokeWidth="1" fill="none" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.01em", fontFamily: "'Playfair Display', serif" }}>
              Kape<span style={{ color: "#C8B89A" }}>Guid</span>
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#FFFFFF", fontFamily: "'Playfair Display', serif", lineHeight: 1.2 }}>
            {customer.name}
          </div>
          <div style={{ fontSize: 10, color: "#9A9080", marginTop: 3, letterSpacing: "0.06em" }}>
            MEMBER CARD
          </div>
        </div>
      </div>

      {/* QR Code */}
      <div style={{ padding: "20px", display: "flex", justifyContent: "center", background: "#FFFFFF" }}>
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR Code" style={{ width: 200, height: 200, display: "block" }} />
        ) : (
          <div style={{ width: 200, height: 200, background: "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, color: "#999" }}>Loading…</span>
          </div>
        )}
      </div>

      {/* Bean loyalty tracker */}
      <div style={{ padding: "0 20px 16px", background: "#FFFFFF" }}>
        <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#888", marginBottom: 8 }}>
          Visit Progress · {visits} total
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{ width: 22, height: 22 }}>
              {i < beans ? (
                <svg viewBox="0 0 36 36" fill="none" style={{ width: "100%", height: "100%" }}>
                  <ellipse cx="18" cy="21" rx="11" ry="8" stroke="#0A0A0A" strokeWidth="1.5" fill="#0A0A0A" fillOpacity="0.08"/>
                  <path d="M11 18 Q18 12 25 18" stroke="#0A0A0A" strokeWidth="1.5" fill="none"/>
                  <ellipse cx="18" cy="21" rx="2.5" ry="2" fill="#0A0A0A" opacity="0.5"/>
                </svg>
              ) : (
                <svg viewBox="0 0 36 36" fill="none" style={{ width: "100%", height: "100%" }}>
                  <ellipse cx="18" cy="21" rx="11" ry="8" stroke="#E0E0E0" strokeWidth="1.5" fill="none"/>
                  <path d="M11 18 Q18 12 25 18" stroke="#E0E0E0" strokeWidth="1.5" fill="none"/>
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer info */}
      <div style={{ padding: "12px 20px", background: "#F8F7F5", borderTop: "1px solid #EBEBEB" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888" }}>Phone</div>
            <div style={{ fontSize: 11, color: "#222", marginTop: 1 }}>{customer.phone}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888" }}>Since</div>
            <div style={{ fontSize: 11, color: "#222", marginTop: 1 }}>
              {format(new Date(customer.created_at), "MMM yyyy")}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px dashed #E0E0E0", fontSize: 8, color: "#BBBBBB", letterSpacing: "0.05em", wordBreak: "break-all" }}>
          {customer.qr_code}
        </div>
      </div>
    </div>
  );
}
