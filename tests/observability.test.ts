import { afterEach, describe, expect, it, vi } from "vitest";
import { deliverMonitoringEvent, errorEvent } from "@/lib/observability";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ERROR_MONITORING_WEBHOOK_URL;
  delete process.env.ERROR_MONITORING_WEBHOOK_TOKEN;
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
    process.env.ERROR_MONITORING_WEBHOOK_URL = "https://monitoring.example.test/events";
    process.env.ERROR_MONITORING_WEBHOOK_TOKEN = "test-token";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    const event = errorEvent("operations.alert_test", new Error("delivery test"), {
      correlationId: "test-correlation",
      test: true,
    });
    const receipt = await deliverMonitoringEvent(event);

    expect(receipt).toMatchObject({ status: "delivered", httpStatus: 202 });
    expect(fetchMock).toHaveBeenCalledOnce();
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(request?.headers).toMatchObject({ Authorization: "Bearer test-token" });
    expect(JSON.parse(String(request?.body))).toMatchObject({
      action: "operations.alert_test",
      context: { correlationId: "test-correlation", test: true },
    });
  });

  it("fails delivery when the monitoring endpoint rejects an event", async () => {
    process.env.ERROR_MONITORING_WEBHOOK_URL = "https://monitoring.example.test/events";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    await expect(deliverMonitoringEvent(errorEvent("upload.failed", new Error("boom"))))
      .resolves.toMatchObject({ status: "failed", httpStatus: 500 });
  });

  it("reports when no monitoring endpoint is configured", async () => {
    await expect(deliverMonitoringEvent(errorEvent("upload.failed", new Error("boom"))))
      .resolves.toEqual({ status: "not-configured", durationMs: 0 });
  });
});
