export function routeAccess(pathname: string) {
  const isProtectedPage = ["/workspace", "/library", "/settings"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isProtectedApi = pathname.startsWith("/api/")
    && pathname !== "/api/internal/retention"
    && pathname !== "/api/internal/alert-test"
    && pathname !== "/api/health";

  return { requiresAuthentication: isProtectedPage || isProtectedApi };
}
