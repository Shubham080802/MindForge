import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hasValidBearerSecret } from "@/lib/internal-auth";
import { reportServerError } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!hasValidBearerSecret(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const correlationId = crypto.randomUUID();
  const delivery = await reportServerError(
    "operations.alert_test",
    new Error("Operator-initiated monitoring delivery test"),
    { test: true, correlationId },
  );

  const status = delivery.status === "delivered"
    ? 200
    : delivery.status === "not-configured" ? 503 : 502;

  return NextResponse.json(
    {
      correlationId,
      delivery: {
        status: delivery.status,
        durationMs: delivery.durationMs,
        ...(delivery.status !== "not-configured" && delivery.httpStatus
          ? { httpStatus: delivery.httpStatus }
          : {}),
      },
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
