/* Middleware for authentication and session refresh
   Blueprint section 4 and 6.1 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Allow access if Supabase isn't configured yet (development/initial deployment)
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: Array<{ name: string; value: string; options?: any }>) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session if needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes
  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/sign-in") || path.startsWith("/sign-up") || path.startsWith("/forgot-password");
  const isFarmerRoute = path.startsWith("/farmer");
  const isAdminRoute = path.startsWith("/admin");
  const isJoinRoute = path.startsWith("/join/");

  // Redirect to sign-in if not authenticated
  if (!user && (isFarmerRoute || isAdminRoute) && !isAuthRoute) {
    const redirectUrl = new URL("/sign-in", request.url);
    redirectUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to farmer if authenticated and on auth route
  if (user && isAuthRoute && !isJoinRoute) {
    return NextResponse.redirect(new URL("/farmer", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
