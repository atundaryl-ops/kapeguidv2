import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY ?? "");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);



export async function POST(req: Request) {
  console.log("RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);
  console.log("SUPABASE_SERVICE_ROLE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Store in database
  await supabase.from("otp_codes").upsert({ email, code, expires_at });

  const { error } = await resend.emails.send({
    from: "KapeGuid <onboarding@resend.dev>",
    to: email,
    subject: "Your KapeGuid verification code ☕",
    html: `
      <table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;background:#FAFAFA;padding:40px 0;">
        <tr><td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#FFF;border-radius:12px;border:1px solid #E5E5E5;">
            <tr><td style="background:#0A0A0A;padding:32px;text-align:center;">
              <h1 style="color:#FFF;font-size:22px;font-weight:800;margin:0;">Verify your email ☕</h1>
              <p style="color:#888;font-size:13px;margin:8px 0 0;">KapeGuid Membership</p>
            </td></tr>
            <tr><td style="padding:40px 32px;text-align:center;">
              <p style="color:#666;font-size:14px;margin:0 0 24px;">Use this code to verify your email. Expires in 10 minutes.</p>
              <div style="background:#F5F5F5;border-radius:12px;padding:24px;display:inline-block;">
                <span style="font-size:42px;font-weight:900;color:#3B1F00;letter-spacing:0.2em;">${code}</span>
              </div>
              <p style="color:#AAA;font-size:12px;margin:24px 0 0;">If you didn't request this, ignore this email.</p>
            </td></tr>
            <tr><td style="padding:20px 32px;border-top:1px solid #F0F0F0;text-align:center;">
              <p style="font-size:11px;color:#AAA;margin:0;">© 2026 KapeGuid. All rights reserved.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    `,
  });

  if (error) return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  return NextResponse.json({ success: true });
}