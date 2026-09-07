import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditEntry = {
  action: string;
  userId?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
};

/** Persist a security/product event without exposing request bodies or secrets. */
export async function recordAudit(entry: AuditEntry) {
  await prisma.auditEvent.create({
    data: {
      action: entry.action,
      userId: entry.userId,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: entry.metadata,
    },
  });
}
