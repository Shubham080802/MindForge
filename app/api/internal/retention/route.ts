import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const configured = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configured || !supplied) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
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
