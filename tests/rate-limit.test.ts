import { describe, expect, it } from "vitest";
import { createRateLimitGate, type RateLimitAdapter } from "@/lib/rate-limit";

describe("rate-limit gate", () => {
  it("allows successful decisions", async () => {
    const adapter: RateLimitAdapter = { check: async () => ({ success: true, reset: Date.now() + 1_000 }) };
    await expect(createRateLimitGate(adapter)({ ip: "network", subject: "learner" }, "ai")).resolves.toBeUndefined();
  });

  it("returns an observable 429 with retry guidance", async () => {
    const adapter: RateLimitAdapter = { check: async () => ({ success: false, reset: Date.now() + 5_000 }) };

    try {
      await createRateLimitGate(adapter)({ ip: "network", subject: "learner" }, "auth-attempt");
      throw new Error("Expected the gate to reject the request");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(429);
      expect(Number((error as Response).headers.get("Retry-After"))).toBeGreaterThan(0);
    }
  });

  it("enforces independent network and subject dimensions", async () => {
    const keys: string[] = [];
    const adapter: RateLimitAdapter = {
      check: async (key) => {
        keys.push(key);
        return { success: true, reset: Date.now() + 1_000 };
      },
    };

    await createRateLimitGate(adapter)({ ip: "network", subject: "learner" }, "auth-attempt");
    expect(keys).toEqual(["ip:network", "subject:learner"]);
  });
});
