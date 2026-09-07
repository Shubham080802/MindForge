import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { reportServerError } from "@/lib/observability";

export type AuditEntry = {
  action: string;
  userId?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Persist a security/product event without exposing request bodies or secrets.
 * Audit delivery is deliberately best-effort: an observability outage must not
 * make a completed user mutation look like it failed.
 */
export async function recordAudit(entry: AuditEntry) {
  try {
    await prisma.auditEvent.create({
      data: {
        action: entry.action,
        userId: entry.userId,
        targetType: entry.targetType,
        targetId: entry.targetId,
        metadata: entry.metadata,
      },
    });
  } catch (error) {
    await reportServerError("audit.write_failed", error, { action: entry.action });
  }
}
