import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnAuth = req.nextUrl.pathname.startsWith("/auth");
  const isOnWorkspace = req.nextUrl.pathname.startsWith("/workspace");
  const isOnApi = req.nextUrl.pathname.startsWith("/api");
  const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");
  const isSignInPage = req.nextUrl.pathname === "/auth/signin";
  const isSignUpPage = req.nextUrl.pathname === "/auth/signup";

  // Allow access to signin/signup pages even if logged in
  if ((isSignInPage || isSignUpPage) && isLoggedIn) {
    return NextResponse.next();
  }

  // Redirect other auth pages (callback, error, etc.) if logged in
  if (isOnAuth && isLoggedIn && !isSignInPage && !isSignUpPage) {
    return Response.redirect(new URL("/workspace", req.nextUrl));
  }

  if ((isOnWorkspace || (isOnApi && !isAuthApi)) && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search);
    return Response.redirect(new URL(`/auth/signin?callbackUrl=${callbackUrl}`, req.nextUrl));
  }
});

export const config = {
  matcher: ["/workspace/:path*", "/api/:path*", "/auth/:path*"],
};