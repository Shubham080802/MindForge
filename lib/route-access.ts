export function routeAccess(pathname: string) {
  const isProtectedPage = ["/workspace", "/library", "/settings"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isProtectedApi = pathname.startsWith("/api/")
    && !pathname.startsWith("/api/auth/")
    && pathname !== "/api/internal/retention"
    && pathname !== "/api/health";

  return { requiresAuthentication: isProtectedPage || isProtectedApi };
}
