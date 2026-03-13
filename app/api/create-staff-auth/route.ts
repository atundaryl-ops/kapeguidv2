import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            full_name, email, password, role,
            address, date_of_birth, gender, gender_other,
            phone, civil_status, religion,
        } = body;

        // Create auth account
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (authError || !authData.user) {
            return NextResponse.json({ error: authError?.message ?? "Failed to create auth account" }, { status: 400 });
        }

        // Insert into staff table
        const { error: insertError } = await supabaseAdmin.from("staff").insert({
            id: authData.user.id,
            email,
            full_name,
            role,
            address,
            date_of_birth,
            gender,
            gender_other: gender === "Others" ? gender_other : null,
            phone,
            civil_status,
            religion,
        });

        if (insertError) {
            // Rollback — delete auth account if staff insert failed
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return NextResponse.json({ error: insertError.message }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
    }
}