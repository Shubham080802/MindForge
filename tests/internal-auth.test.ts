import { describe, expect, it } from "vitest";
import { hasValidBearerSecret } from "@/lib/internal-auth";

describe("internal endpoint authentication", () => {
  it("accepts only the configured bearer secret", () => {
    expect(hasValidBearerSecret("Bearer correct-secret", "correct-secret")).toBe(true);
    expect(hasValidBearerSecret("bearer correct-secret", "correct-secret")).toBe(true);
    expect(hasValidBearerSecret("Bearer wrong-secret", "correct-secret")).toBe(false);
    expect(hasValidBearerSecret(null, "correct-secret")).toBe(false);
    expect(hasValidBearerSecret("Bearer correct-secret", undefined)).toBe(false);
  });
});
