import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnAuth = req.nextUrl.pathname.startsWith("/auth");
  const isOnWorkspace = req.nextUrl.pathname.startsWith("/workspace");
  const isOnApi = req.nextUrl.pathname.startsWith("/api");

  if (isOnAuth && isLoggedIn) {
    return Response.redirect(new URL("/workspace", req.nextUrl));
  }

  if ((isOnWorkspace || isOnApi) && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search);
    return Response.redirect(new URL(`/auth/signin?callbackUrl=${callbackUrl}`, req.nextUrl));
  }
});

export const config = {
  matcher: ["/workspace/:path*", "/api/:path*", "/auth/:path*"],
};