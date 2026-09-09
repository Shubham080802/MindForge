import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasValidBearerSecret } from "@/lib/internal-auth";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  return hasValidBearerSecret(request.headers.get("authorization"), process.env.CRON_SECRET);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const retentionDays = Number(process.env.AUDIT_RETENTION_DAYS ?? "365");
  if (!Number.isInteger(retentionDays) || retentionDays < 30) {
    return NextResponse.json({ message: "Retention policy is misconfigured" }, { status: 503 });
  }

  const now = new Date();
  const auditCutoff = new Date(now.getTime() - retentionDays * 86_400_000);
  const [verificationTokens, resetTokens, auditEvents] = await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.auditEvent.deleteMany({ where: { createdAt: { lt: auditCutoff } } }),
  ]);

  return NextResponse.json({
    status: "ok",
    deleted: {
      verificationTokens: verificationTokens.count,
      resetTokens: resetTokens.count,
      auditEvents: auditEvents.count,
    },
  });
}

// Vercel Cron invokes configured paths with GET and supplies CRON_SECRET as a
// Bearer token. POST remains available for provider-neutral schedulers.
export const GET = POST;
