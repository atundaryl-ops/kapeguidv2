import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { customerId } = await req.json();

  if (!customerId) {
    return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
  }

  // Get customer to find auth_id
  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("auth_id")
    .eq("id", customerId)
    .single();

  // Delete auth user if exists
  if (customer?.auth_id) {
    await supabaseAdmin.auth.admin.deleteUser(customer.auth_id);
  }

  // Delete customer record
  const { error } = await supabaseAdmin
    .from("customers")
    .delete()
    .eq("id", customerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}