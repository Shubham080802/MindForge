const AUTH_PAGES = new Set([
  "/auth/signin",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-request",
]);

export function routeAccess(pathname: string) {
  const isAuthPage = AUTH_PAGES.has(pathname);
  const isAuthRoute = pathname.startsWith("/auth");
  const isProtectedPage = ["/workspace", "/library", "/settings"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isProtectedApi = pathname.startsWith("/api/")
    && !pathname.startsWith("/api/auth/")
    && pathname !== "/api/internal/retention"
    && pathname !== "/api/health";

  return { isAuthPage, isAuthRoute, requiresAuthentication: isProtectedPage || isProtectedApi };
}
