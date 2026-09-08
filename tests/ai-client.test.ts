import { describe, expect, it } from "vitest";
import { DEFAULT_AI_MODEL, getAIConfig } from "@/lib/ai-client";

describe("AI provider configuration", () => {
  it("uses the stable free-tier model by default", () => {
    expect(getAIConfig({ GEMINI_API_KEY: "test-key", AI_CHAT_MODEL: undefined })).toEqual({
      apiKey: "test-key",
      model: DEFAULT_AI_MODEL,
    });
  });

  it("allows an explicit Gemini model override", () => {
    expect(getAIConfig({ GEMINI_API_KEY: "test-key", AI_CHAT_MODEL: "gemini-custom" }).model)
      .toBe("gemini-custom");
  });

  it("fails closed without a Gemini key", () => {
    expect(() => getAIConfig({ GEMINI_API_KEY: " ", AI_CHAT_MODEL: undefined }))
      .toThrow("GEMINI_API_KEY is not configured");
  });
});
