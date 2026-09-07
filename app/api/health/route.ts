import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runtimeReadiness } from "@/lib/runtime-config";
import { reportServerError } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const configuration = runtimeReadiness(process.env);
  try {
    await prisma.$queryRaw`SELECT 1`;
    const status = configuration.ready ? "ok" : "degraded";
    return NextResponse.json(
      { status, checks: { database: "ok", configuration: configuration.ready ? "ok" : "invalid" } },
      { status: configuration.ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    await reportServerError("Health check", error);
    return NextResponse.json(
      { status: "unavailable", checks: { database: "unavailable", configuration: configuration.ready ? "ok" : "invalid" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
