import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { routeAccess } from "@/lib/route-access";

export default withAuth(
  function middleware(req) {
    const isLoggedIn = !!req.nextauth.token;
    const access = routeAccess(req.nextUrl.pathname);

    // Allow access to auth pages even if logged in
    if (access.isAuthPage && isLoggedIn) {
      return NextResponse.next();
    }

    // Redirect other auth pages (callback, error, etc.) if logged in
    if (access.isAuthRoute && isLoggedIn && !access.isAuthPage) {
      return Response.redirect(new URL("/workspace", req.nextUrl));
    }

    if (access.requiresAuthentication && !isLoggedIn) {
      const callbackUrl = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search);
      return Response.redirect(new URL(`/auth/signin?callbackUrl=${callbackUrl}`, req.nextUrl));
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const access = routeAccess(req.nextUrl.pathname);
        return access.requiresAuthentication ? !!token : true;
      },
    },
  }
);

export const config = {
  matcher: [
    "/workspace/:path*",
    "/library/:path*",
    "/settings/:path*",
    "/auth/:path*",
    "/api/export",
    "/api/materials/:path*",
    "/api/search",
    "/api/sessions/:path*",
    "/api/study-tools/:path*",
    "/api/tts",
    "/api/user/:path*",
  ],
};
