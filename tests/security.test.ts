import { describe, expect, it } from "vitest";
import { sessionCreateInput } from "@/lib/validation";

describe("session creation", () => {
  it("rejects duplicate material identifiers before persistence", () => {
    const materialId = "cm12345678901234567890123";
    const result = sessionCreateInput.safeParse({ title: "Biology", materialIds: [materialId, materialId] });
    expect(result.success).toBe(false);
  });
});
