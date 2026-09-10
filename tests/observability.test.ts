import { afterEach, describe, expect, it, vi } from "vitest";
import { deliverMonitoringEvent, errorEvent } from "@/lib/observability";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
  delete process.env.ALERT_EMAIL_FROM;
  delete process.env.ALERT_EMAIL_TO;
});

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

  it("reports a monitoring endpoint acceptance receipt", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.ALERT_EMAIL_TO = "owner@example.test";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    const event = errorEvent("operations.alert_test", new Error("delivery test"), {
      correlationId: "test-correlation",
      test: true,
    });
    const receipt = await deliverMonitoringEvent(event);

    expect(receipt).toMatchObject({ status: "delivered", httpStatus: 202 });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [requestUrl, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe("https://api.resend.com/emails");
    expect(request.headers).toMatchObject({ Authorization: "Bearer test-key" });

    const body = JSON.parse(String(request.body));
    expect(body).toMatchObject({
      to: ["owner@example.test"],
      subject: "MindForge alert: operations.alert_test",
    });
    expect(body.text).toContain("test-correlation");
  });

  it("fails delivery when the monitoring endpoint rejects an event", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.ALERT_EMAIL_TO = "owner@example.test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    await expect(deliverMonitoringEvent(errorEvent("upload.failed", new Error("boom"))))
      .resolves.toMatchObject({ status: "failed", httpStatus: 500 });
  });

  it("reports when no monitoring endpoint is configured", async () => {
    await expect(deliverMonitoringEvent(errorEvent("upload.failed", new Error("boom"))))
      .resolves.toEqual({ status: "not-configured", durationMs: 0 });
  });
});
