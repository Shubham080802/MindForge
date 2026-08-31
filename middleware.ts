import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const isLoggedIn = !!req.nextauth.token;
    const isOnAuth = req.nextUrl.pathname.startsWith("/auth");
    const isOnWorkspace = req.nextUrl.pathname.startsWith("/workspace");
    const isOnApi = req.nextUrl.pathname.startsWith("/api");
    const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");
    const isAuthPage = ["/auth/signin", "/auth/signup", "/auth/forgot-password", "/auth/reset-password", "/auth/verify-request"].includes(req.nextUrl.pathname);

    // Allow access to auth pages even if logged in
    if (isAuthPage && isLoggedIn) {
      return NextResponse.next();
    }

    // Redirect other auth pages (callback, error, etc.) if logged in
    if (isOnAuth && isLoggedIn && !isAuthPage) {
      return Response.redirect(new URL("/workspace", req.nextUrl));
    }

    if ((isOnWorkspace || (isOnApi && !isAuthApi)) && !isLoggedIn) {
      const callbackUrl = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search);
      return Response.redirect(new URL(`/auth/signin?callbackUrl=${callbackUrl}`, req.nextUrl));
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const isOnAuth = req.nextUrl.pathname.startsWith("/auth");
        const isOnWorkspace = req.nextUrl.pathname.startsWith("/workspace");
        const isOnApi = req.nextUrl.pathname.startsWith("/api");
        const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");
        const isAuthPage = ["/auth/signin", "/auth/signup", "/auth/forgot-password", "/auth/reset-password", "/auth/verify-request"].includes(req.nextUrl.pathname);

        // Allow auth pages without token
        if (isAuthPage) return true;
        
        // Require token for workspace and API
        if (isOnWorkspace || (isOnApi && !isAuthApi)) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/workspace/:path*", "/api/:path*", "/auth/:path*"],
};