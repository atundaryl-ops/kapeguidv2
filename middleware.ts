import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const staffRoutes = ["/dashboard", "/customers", "/scan", "/checkins", "/settings"];
  const customerRoutes = ["/me"];
  const isStaffRoute = staffRoutes.some((route) => pathname.startsWith(route));
  const isCustomerRoute = customerRoutes.some((route) => pathname.startsWith(route));

  // Not logged in — redirect to login
  if ((isStaffRoute || isCustomerRoute) && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isStaffRoute) {
    // Check if user is actually staff
    const { data: staffData } = await supabase
      .from("staff")
      .select("role")
      .eq("id", user.id)
      .single();

    // Not staff — redirect to /me
    if (!staffData) {
      return NextResponse.redirect(new URL("/me", request.url));
    }
  }

  if (user && isCustomerRoute) {
    // Check if user is staff trying to access /me
    const { data: staffData } = await supabase
      .from("staff")
      .select("role")
      .eq("id", user.id)
      .single();

    // Is staff — redirect to /dashboard
    if (staffData) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Redirect away from login if already authenticated
  if ((pathname === "/login") && user) {
    const { data: staffData } = await supabase
      .from("staff")
      .select("role")
      .eq("id", user.id)
      .single();

    return NextResponse.redirect(
      new URL(staffData ? "/dashboard" : "/me", request.url)
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|api).*)"],
};