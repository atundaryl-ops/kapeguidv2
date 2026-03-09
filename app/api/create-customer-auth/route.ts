import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { email, customerId } = await req.json();

  if (!email || !customerId) {
    return NextResponse.json({ error: "Missing email or customerId" }, { status: 400 });
  }

  // Generate random password
  const tempPassword = Math.random().toString(36).slice(-8) + "Kape1!";

  // Create auth user
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Link auth_id to customer record
  await supabaseAdmin
    .from("customers")
    .update({ auth_id: data.user.id })
    .eq("id", customerId);

  return NextResponse.json({ tempPassword });
}