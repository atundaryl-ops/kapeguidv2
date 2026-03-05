import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { qr_code } = await req.json();
  if (!qr_code) return NextResponse.json({ error: "qr_code required" }, { status: 400 });

  const { data: customer, error } = await supabase
    .from("customers").select("*").eq("qr_code", qr_code.trim()).single();

  if (error || !customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const { error: visitError } = await supabase.from("visits").insert({
    customer_id: customer.id,
    visited_at: new Date().toISOString(),
  });

  if (visitError) return NextResponse.json({ error: visitError.message }, { status: 500 });

  return NextResponse.json({ customer, message: "Visit recorded" });
}
