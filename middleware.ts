import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  console.log("MIDDLEWARE HIT:", request.nextUrl.pathname);
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


  // With this:
  if (publicRoutes.includes(pathname)) {
    if (pathname === "/login" || pathname === "/") {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: staffData } = await supabase
          .from("staff").select("role").eq("id", user.id).maybeSingle();
        return NextResponse.redirect(
          new URL(staffData ? "/dashboard" : "/home", request.url)
        );
      }
    }
    return supabaseResponse;
  }

  const staffRoutes = ["/dashboard", "/customers", "/scan", "/checkins", "/settings","/staff","/menu"];
  const customerRoutes = ["/me", "/home"];
  const isStaffRoute = staffRoutes.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const isCustomerRoute = customerRoutes.some((r) => pathname === r || pathname.startsWith(r + "/"));

  console.log("pathname:", pathname, "isStaffRoute:", isStaffRoute, "isCustomerRoute:", isCustomerRoute);

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
    // ← ADD THIS BLOCK — you're missing the role check!
  const { data: staffData } = await supabase
    .from("staff").select("role").eq("id", user.id).maybeSingle();

  console.log("role check:", { staffData, pathname });
  const isStaff = !!staffData;

  if (isStaffRoute && !isStaff) {
    // Customer trying to access staff route
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (isCustomerRoute && isStaff) {
    // Staff trying to access customer route
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }


  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|api).*)"],
};