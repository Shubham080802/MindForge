type ErrorContext = Record<string, string | number | boolean | null | undefined>;

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

export async function reportServerError(action: string, error: unknown, context: ErrorContext = {}) {
  const event = errorEvent(action, error, context);
  console.error(JSON.stringify(event));

  const url = process.env.ERROR_MONITORING_WEBHOOK_URL;
  if (!url) return;

  try {
    await fetch(url, {
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
  } catch (monitoringError) {
    console.error(JSON.stringify(errorEvent("observability.delivery_failed", monitoringError)));
  }
}
