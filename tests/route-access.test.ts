import { describe, expect, it } from "vitest";
import { routeAccess } from "@/lib/route-access";

describe("route access policy", () => {
  it.each(["/workspace", "/workspace/session", "/library", "/settings"])(
    "protects %s",
    (pathname) => expect(routeAccess(pathname).requiresAuthentication).toBe(true),
  );

  it("keeps readiness, operator-secret, and Clerk pages public", () => {
    expect(routeAccess("/api/health").requiresAuthentication).toBe(false);
    expect(routeAccess("/api/internal/retention").requiresAuthentication).toBe(false);
    expect(routeAccess("/api/internal/alert-test").requiresAuthentication).toBe(false);
    expect(routeAccess("/auth/signin").requiresAuthentication).toBe(false);
    expect(routeAccess("/auth/signup").requiresAuthentication).toBe(false);
  });

  it("protects application endpoints", () => {
    expect(routeAccess("/api/sessions").requiresAuthentication).toBe(true);
  });
});
