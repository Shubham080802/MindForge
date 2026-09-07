import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createSpeech: vi.fn() }));

vi.mock("@/lib/request-guard", () => ({
  requireMutation: vi.fn().mockResolvedValue({ userId: "user-1" }),
  internalError: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
vi.mock("@/lib/ai-client", () => ({
  getOpenAI: () => ({ audio: { speech: { create: mocks.createSpeech } } }),
}));

import { POST } from "@/app/api/tts/route";

describe("text-to-speech response privacy", () => {
  it("prevents authenticated audio from entering shared caches", async () => {
    mocks.createSpeech.mockResolvedValue({
      arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
    });
    const request = new NextRequest("https://mindforge.example.com/api/tts", {
      method: "POST",
      body: JSON.stringify({ text: "Private study note", voice: "nova", language: "en" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    if (!response) throw new Error("Expected an audio response");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
