import { NextResponse } from "next/server";
import { otpStore } from "../send-otp/route";

export async function POST(req: Request) {
  const { email, code } = await req.json();
  if (!email || !code) return NextResponse.json({ error: "Email and code required" }, { status: 400 });

  const record = otpStore[email];
  if (!record) return NextResponse.json({ error: "No code found. Please request a new one." }, { status: 400 });
  if (Date.now() > record.expires) {
    delete otpStore[email];
    return NextResponse.json({ error: "Code expired. Please request a new one." }, { status: 400 });
  }
  if (record.code !== code) return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 400 });

  delete otpStore[email];
  return NextResponse.json({ success: true });
}