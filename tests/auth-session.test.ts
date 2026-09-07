import type { JWT } from "next-auth/jwt";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mocks.findUnique } },
}));
vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: vi.fn() }));

import { authOptions } from "@/lib/auth-options";

const jwtCallback = authOptions.callbacks!.jwt!;
const sessionCallback = authOptions.callbacks!.session!;

function refresh(token: JWT) {
  return jwtCallback({ token } as Parameters<typeof jwtCallback>[0]);
}

describe("NextAuth session revocation", () => {
  beforeEach(() => mocks.findUnique.mockReset());

  it("scrubs a pre-reset identity and hides the session user", async () => {
    mocks.findUnique.mockResolvedValue({ sessionVersion: 2 });
    const token = await refresh({ id: "user-1", sessionVersion: 1, name: "Learner", email: "learner@example.com" });

    expect(token).toMatchObject({ revoked: true });
    expect(token.id).toBeUndefined();
    expect(token.email).toBeUndefined();

    const session = await sessionCallback({
      session: { expires: new Date(Date.now() + 60_000).toISOString(), user: { id: "user-1", name: "Learner" } },
      token,
      newSession: undefined,
      trigger: "update",
    } as Parameters<typeof sessionCallback>[0]);
    expect(session.user).toBeUndefined();
  });

  it("revokes a token after its user is deleted", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const token = await refresh({ id: "deleted-user", sessionVersion: 0 });
    expect(token).toEqual(expect.objectContaining({ revoked: true }));
    expect(token.id).toBeUndefined();
  });
});
