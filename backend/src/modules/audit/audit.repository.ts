import type { ActorChannel, AuditResult, Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";

export type AuditCreateInput = {
  actorUserId?: string;
  actorChannel: ActorChannel;
  action: string;
  entityType: string;
  entityId?: string;
  result: AuditResult;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
};

export const createAuditLog = (input: AuditCreateInput) => {
  return prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      actorChannel: input.actorChannel,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      result: input.result,
      metadata: input.metadata ?? {},
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    }
  });
};
