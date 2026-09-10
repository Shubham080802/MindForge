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

function emailBody(event: ReturnType<typeof errorEvent>) {
  const contextLines = Object.entries(event.context)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  return [
    `Action: ${event.action}`,
    `Time: ${event.timestamp}`,
    `Error: ${event.error.name}: ${event.error.message}`,
    contextLines ? `Context:\n${contextLines}` : null,
  ].filter(Boolean).join("\n\n");
}

export async function deliverMonitoringEvent(
  event: ReturnType<typeof errorEvent>,
): Promise<MonitoringDelivery> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL_TO;
  if (!apiKey || !to) return { status: "not-configured", durationMs: 0 };

  const from = process.env.ALERT_EMAIL_FROM || "MindForge Alerts <onboarding@resend.dev>";
  const startedAt = performance.now();
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `MindForge alert: ${event.action}`,
        text: emailBody(event),
      }),
      signal: AbortSignal.timeout(5_000),
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
