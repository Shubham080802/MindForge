import { describe, expect, it } from "vitest";
import { errorEvent } from "@/lib/observability";

describe("server error events", () => {
  it("produces structured operational output without request headers", () => {
    const event = errorEvent("upload.failed", new TypeError("parser unavailable"), { route: "/api/materials/upload" });
    expect(event).toMatchObject({
      level: "error",
      service: "mindforge",
      action: "upload.failed",
      error: { name: "TypeError", message: "parser unavailable" },
      context: { route: "/api/materials/upload" },
    });
    expect(event.timestamp).toBeTruthy();
  });
});
