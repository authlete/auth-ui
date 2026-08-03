import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Auth gate for signed-in surfaces: redirect to sign-in unless a better-auth
// session cookie is present. /authorizations/[id] runs its own gate.
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const signInUrl = new URL("/auth/sign-in", request.url);
  signInUrl.searchParams.set("redirectTo", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/", "/settings/:path*"],
};
