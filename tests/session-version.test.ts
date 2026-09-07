import { describe, expect, it } from "vitest";
import { reconcileSessionIdentity, revokeSessionClaims } from "@/lib/session-version";

describe("session version", () => {
  it("issues the current version for a newly authenticated identity", () => {
    expect(reconcileSessionIdentity({ id: "user-1" }, 3, true)).toEqual({ id: "user-1", sessionVersion: 3 });
  });

  it("rejects stale, legacy, and deleted-user identities", () => {
    expect(reconcileSessionIdentity({ id: "user-1", sessionVersion: 2 }, 3)).toBeNull();
    expect(reconcileSessionIdentity({ id: "user-1" }, 3)).toBeNull();
    expect(reconcileSessionIdentity({ id: "user-1", sessionVersion: 3 }, null)).toBeNull();
  });

  it("removes all user claims when a session is revoked", () => {
    const claims = { id: "user-1", sessionVersion: 2, name: "Learner", email: "learner@example.com", picture: "avatar", revoked: false };
    revokeSessionClaims(claims);
    expect(claims).toEqual({ revoked: true });
  });
});
