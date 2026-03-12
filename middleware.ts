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

  const { pathname } = request.nextUrl;

  // Skip middleware for public routes entirely
  const publicRoutes = ["/", "/login", "/signup"];
  if (publicRoutes.includes(pathname)) {
    // Only redirect away from login if already logged in
    if (pathname === "/login") {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: staffData } = await supabase
          .from("staff").select("role").eq("id", user.id).maybeSingle();
        return NextResponse.redirect(
          new URL(staffData ? "/dashboard" : "/me", request.url)
        );
      }
    }
    return supabaseResponse;
  }

  const staffRoutes = ["/dashboard", "/customers", "/scan", "/checkins", "/settings", "/menu"];
  const customerRoutes = ["/me"];
  const isStaffRoute = staffRoutes.some((r) => pathname.startsWith(r));
  const isCustomerRoute = customerRoutes.some((r) => pathname.startsWith(r));

  // Not a protected route — let it through
  if (!isStaffRoute && !isCustomerRoute) {
    return supabaseResponse;
  }

  // Get user once
  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }


  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|api).*)"],
};