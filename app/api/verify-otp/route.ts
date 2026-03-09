import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { email, code } = await req.json();
  if (!email || !code) return NextResponse.json({ error: "Email and code required" }, { status: 400 });

  const { data } = await supabase
    .from("otp_codes")
    .select("*")
    .eq("email", email)
    .single();

  if (!data) return NextResponse.json({ error: "No code found. Please request a new one." }, { status: 400 });
  if (new Date() > new Date(data.expires_at)) {
    await supabase.from("otp_codes").delete().eq("email", email);
    return NextResponse.json({ error: "Code expired. Please request a new one." }, { status: 400 });
  }
  if (data.code !== code) return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 400 });

  await supabase.from("otp_codes").delete().eq("email", email);
  return NextResponse.json({ success: true });
}