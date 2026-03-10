import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY ?? "");

export async function POST(req: Request) {
  const { email, customerId, customerName } = await req.json();

  if (!email || !customerId) {
    return NextResponse.json({ error: "Missing email or customerId" }, { status: 400 });
  }

  const tempPassword = Math.random().toString(36).slice(-8) + "Kape1!";

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabaseAdmin
    .from("customers")
    .update({ auth_id: data.user.id })
    .eq("id", customerId);

  // Try to send email but don't crash if it fails
  try {
    await resend.emails.send({
      from: "KapeGuid <onboarding@resend.dev>",
      to: email,
      subject: "Welcome to KapeGuid! Your account is ready ☕",
      html: `
        <table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;background:#FAFAFA;padding:40px 0;">
          <tr><td align="center">
            <table width="480" cellpadding="0" cellspacing="0" style="background:#FFF;border-radius:12px;border:1px solid #E5E5E5;">
              <tr><td style="background:#0A0A0A;padding:32px;text-align:center;">
                <h1 style="color:#FFF;font-size:22px;font-weight:800;margin:0;">Welcome to KapeGuid! ☕</h1>
                <p style="color:#888;font-size:13px;margin:8px 0 0;">Your membership account is ready</p>
              </td></tr>
              <tr><td style="padding:32px;">
                <p style="color:#0A0A0A;font-size:15px;margin:0 0 8px;">Hi <strong>${customerName ?? "there"}</strong>,</p>
                <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 24px;">Your KapeGuid account has been set up. Here are your login credentials:</p>
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #E5E5E5;">
                          <span style="font-size:12px;color:#888;">Email</span>
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #E5E5E5;text-align:right;">
                          <strong style="font-size:13px;color:#0A0A0A;">${email}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="font-size:12px;color:#888;">Temporary Password</span>
                        </td>
                        <td style="padding:8px 0;text-align:right;">
                          <strong style="font-size:16px;color:#3B1F00;letter-spacing:0.05em;">${tempPassword}</strong>
                        </td>
                      </tr>
                    </table>
                  </td></tr>
                </table>
                <p style="color:#888;font-size:12px;margin:0 0 24px;">⚠️ Please change your password after logging in.</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td align="center">
                    <a href="https://kapeguidv2.vercel.app/login" style="display:inline-block;background:#0A0A0A;color:#FFF;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:13px;font-weight:700;">
                      Log In to KapeGuid →
                    </a>
                  </td></tr>
                </table>
              </td></tr>
              <tr><td style="padding:20px 32px;border-top:1px solid #F0F0F0;text-align:center;">
                <p style="font-size:11px;color:#AAA;margin:0;">© 2026 KapeGuid. All rights reserved.</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      `,
    });
  } catch (emailErr) {
    console.error("Email send failed:", emailErr);
  }

  return NextResponse.json({ success: true, tempPassword });
}