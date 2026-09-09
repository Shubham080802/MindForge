type ErrorContext = Record<string, string | number | boolean | null | undefined>;

export type MonitoringDelivery =
  | { status: "not-configured"; durationMs: 0 }
  | { status: "delivered"; durationMs: number; httpStatus: number }
  | { status: "failed"; durationMs: number; httpStatus?: number; reason: string };

export function errorEvent(action: string, error: unknown, context: ErrorContext = {}) {
  const normalized = error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : { name: "UnknownError", message: "An unknown error occurred" };

  return {
    level: "error" as const,
    service: "mindforge",
    action,
    timestamp: new Date().toISOString(),
    error: normalized,
    context,
  };
}

export async function deliverMonitoringEvent(
  event: ReturnType<typeof errorEvent>,
): Promise<MonitoringDelivery> {
  const url = process.env.ERROR_MONITORING_WEBHOOK_URL;
  if (!url) return { status: "not-configured", durationMs: 0 };

  const startedAt = performance.now();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.ERROR_MONITORING_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${process.env.ERROR_MONITORING_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(2_000),
    });
    const durationMs = Math.round(performance.now() - startedAt);

    if (!response.ok) {
      return {
        status: "failed",
        durationMs,
        httpStatus: response.status,
        reason: "Monitoring endpoint rejected the event",
      };
    }

    return { status: "delivered", durationMs, httpStatus: response.status };
  } catch (error) {
    return {
      status: "failed",
      durationMs: Math.round(performance.now() - startedAt),
      reason: error instanceof Error ? error.message : "Monitoring request failed",
    };
  }
}

export async function reportServerError(action: string, error: unknown, context: ErrorContext = {}) {
  const event = errorEvent(action, error, context);
  console.error(JSON.stringify(event));

  const delivery = await deliverMonitoringEvent(event);
  if (delivery.status === "failed") {
    console.error(JSON.stringify(errorEvent("observability.delivery_failed", new Error(delivery.reason), {
      sourceAction: action,
      durationMs: delivery.durationMs,
      httpStatus: delivery.httpStatus,
    })));
  }

  return delivery;
}
