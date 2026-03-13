import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
    try {
        const { staffId } = await req.json();
        if (!staffId) return NextResponse.json({ error: "Missing staffId" }, { status: 400 });

        // Delete from staff table first
        await supabaseAdmin.from("staff").delete().eq("id", staffId);

        // Delete auth account
        await supabaseAdmin.auth.admin.deleteUser(staffId);

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
    }
}