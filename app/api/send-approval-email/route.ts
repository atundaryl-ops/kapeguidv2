import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const { email, firstName, lastName } = await req.json();

  if (!email) return NextResponse.json({ error: "No email provided" }, { status: 400 });

  const { error } = await resend.emails.send({
    from: "KapeGuid <onboarding@resend.dev>",
    to: email,
    subject: "🎉 Your KapeGuid Membership is Approved!",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Membership Approved</title>
        </head>
        <body style="margin:0; padding:0; background:#F5F5F5; font-family: 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F5; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background:#0A0A0A; padding: 32px; text-align:center;">
                      <table cellpadding="0" cellspacing="0" style="margin:0 auto 12px auto;">
                        <tr>
                          <td style="width:48px; height:48px; background:#FFFFFF; border-radius:50%; text-align:center; vertical-align:middle;">
                            <span style="font-size:24px; font-weight:900; color:#0A0A0A; line-height:48px;">!</span>
                          </td>
                        </tr>
                      </table>
                      <h1 style="margin:0; color:#FFFFFF; font-size:22px; font-weight:800; letter-spacing:-0.02em;">KapeGuid</h1>
                      <p style="margin:4px 0 0; color:#888888; font-size:12px; letter-spacing:0.08em; text-transform:uppercase;">Coffee Shop · Customer System</p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px 32px;">
                      
                      <!-- Success icon -->
                      <div style="text-align:center; margin-bottom:24px;">
                        <div style="width:64px; height:64px; background:#F0FDF4; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; border: 2px solid #86EFAC;">
                          <span style="font-size:28px;">✓</span>
                        </div>
                      </div>

                      <h2 style="margin:0 0 8px; text-align:center; font-size:22px; font-weight:800; color:#0A0A0A; letter-spacing:-0.02em;">
                        You're officially a member!
                      </h2>
                      <p style="margin:0 0 28px; text-align:center; font-size:14px; color:#666666; line-height:1.6;">
                        Hi <strong style="color:#0A0A0A;">${firstName}</strong>, your KapeGuid membership has been approved and your account is now active!
                      </p>

                      <!-- Details card -->
                      <div style="background:#F9F9F9; border-radius:12px; padding:20px; margin-bottom:28px; border:1px solid #EEEEEE;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding:8px 0; border-bottom:1px solid #EEEEEE;">
                              <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#999;">Member Name</span>
                            </td>
                            <td style="padding:8px 0; border-bottom:1px solid #EEEEEE; text-align:right;">
                              <span style="font-size:13px; font-weight:700; color:#0A0A0A;">${firstName} ${lastName}</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:8px 0; border-bottom:1px solid #EEEEEE;">
                              <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#999;">Status</span>
                            </td>
                            <td style="padding:8px 0; border-bottom:1px solid #EEEEEE; text-align:right;">
                              <span style="font-size:12px; font-weight:700; color:#16A34A; background:#F0FDF4; padding:3px 10px; border-radius:20px; border:1px solid #BBF7D0;">● Active</span>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:8px 0;">
                              <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#999;">Free Coffee</span>
                            </td>
                            <td style="padding:8px 0; text-align:right;">
                              <span style="font-size:13px; color:#0A0A0A;">☕ Entitled this month!</span>
                            </td>
                          </tr>
                        </table>
                      </div>

                      <!-- What's next -->
                      <div style="background:#FFF7ED; border-radius:12px; padding:20px; margin-bottom:28px; border:1px solid #FED7AA;">
                        <p style="margin:0 0 10px; font-size:12px; font-weight:700; color:#92400E; text-transform:uppercase; letter-spacing:0.08em;">What's Next?</p>
                        <ul style="margin:0; padding-left:18px; font-size:13px; color:#78350F; line-height:2;">
                          <li>Visit the shop and show your QR card to the staff</li>
                          <li>Enjoy your <strong>free coffee</strong> this month!</li>
                          <li>Your membership renews every year</li>
                        </ul>
                      </div>

                      <!-- CTA -->
                      <div style="text-align:center;">
                        <p style="font-size:13px; color:#666; margin:0;">
                          Welcome to the KapeGuid family, <strong style="color:#0A0A0A;">${firstName}</strong>! ☕
                        </p>
                      </div>

                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background:#F9F9F9; padding:20px 32px; text-align:center; border-top:1px solid #EEEEEE;">
                      <p style="margin:0; font-size:11px; color:#AAAAAA;">Powered by KapeGuid · Coffee Shop Customer System</p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });

  if (error) console.error("Approval email failed:", error);
  return NextResponse.json({ success: true });
}
