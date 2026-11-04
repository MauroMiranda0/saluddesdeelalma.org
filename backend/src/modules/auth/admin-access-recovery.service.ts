import { AppError } from "../../middleware/error-handler";
import { prisma } from "../../lib/prisma";
import { auditLogCreateData } from "../audit/audit.repository";

export const reactivateAdminPanelAccessWithAudit = async (input: {
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}) =>
  prisma.$transaction(async (transaction) => {
    const admin = await transaction.user.findUnique({
      where: { username: "admin" }
    });

    if (
      !admin ||
      admin.role !== "admin" ||
      !admin.authUserId ||
      !admin.isActive ||
      admin.panelLoginEnabled
    ) {
      throw new AppError(
        409,
        "admin_access_recovery_unavailable",
        "Admin access cannot be restored"
      );
    }

    await transaction.user.update({
      where: { id: admin.id },
      data: { panelLoginEnabled: true }
    });
    await transaction.adminSession.updateMany({
      where: { userId: admin.id, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    await transaction.auditLog.create({
      data: auditLogCreateData({
        actorChannel: "system",
        action: "auth_admin_access_reactivated",
        entityType: "user",
        entityId: admin.id,
        result: "success",
        metadata: input.requestId ? { requestId: input.requestId } : {},
        ipAddress: input.ipAddress,
        userAgent: input.userAgent
      })
    });

    return admin.id;
  });
