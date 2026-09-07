import { afterEach, describe, expect, it } from "vitest";
import { digestResetToken, digestVerificationCode } from "@/lib/token-digest";
import { passwordSchema, sessionCreateInput } from "@/lib/validation";

const previousSecret = process.env.NEXTAUTH_SECRET;

afterEach(() => {
  process.env.NEXTAUTH_SECRET = previousSecret;
});

describe("credential policy", () => {
  it("accepts a strong password and rejects common weak shapes", () => {
    expect(passwordSchema.safeParse("TwelveChars1!").success).toBe(true);
    expect(passwordSchema.safeParse("alllowercase1").success).toBe(false);
    expect(passwordSchema.safeParse("NoNumbersHere").success).toBe(false);
    expect(passwordSchema.safeParse("Short1A").success).toBe(false);
  });
});

describe("authentication token digests", () => {
  it("uses a keyed and purpose-separated digest contract", () => {
    process.env.NEXTAUTH_SECRET = "test-only-signing-secret";
    const first = digestVerificationCode("learner@example.com", "123456");

    expect(first).toBe(digestVerificationCode("learner@example.com", "123456"));
    expect(first).not.toBe(digestVerificationCode("other@example.com", "123456"));
    expect(first).not.toBe(digestResetToken("learner@example.com:123456"));
  });
});

describe("session creation", () => {
  it("rejects duplicate material identifiers before persistence", () => {
    const materialId = "cm12345678901234567890123";
    const result = sessionCreateInput.safeParse({ title: "Biology", materialIds: [materialId, materialId] });
    expect(result.success).toBe(false);
  });
});
