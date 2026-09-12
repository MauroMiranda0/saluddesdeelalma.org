import { Prisma } from "@prisma/client";

import { AppError } from "../../middleware/error-handler";
import { prisma } from "../../lib/prisma";
import {
  createAuditLogInTransaction,
  type AuditCreateInput
} from "../audit/audit.repository";

const pendingDirectoryEmail = () =>
  `pending-${crypto.randomUUID()}@directory.local`;

const directoryEmail = (profileId: string) =>
  `therapist-${profileId}@directory.local`;

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

const metadataObject = (audit: AuditCreateInput) =>
  (audit.metadata ?? {}) as Record<string, unknown>;

export const createClinicalProfileWithAudit = async (input: {
  fullName: string;
  email?: string;
  audit: AuditCreateInput;
}) => {
  try {
    return await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          email: pendingDirectoryEmail(),
          fullName: input.fullName.slice(0, 120),
          role: "psicologo",
          panelLoginEnabled: false
        }
      });

      const therapistProfile = await transaction.therapistProfile.create({
        data: { userId: user.id }
      });

      const email = (
        input.email ?? directoryEmail(therapistProfile.id)
      ).toLowerCase();
      await transaction.user.update({
        where: { id: user.id },
        data: { email }
      });

      await createAuditLogInTransaction(transaction, {
        ...input.audit,
        entityId: therapistProfile.id,
        metadata: {
          ...metadataObject(input.audit),
          fullName: input.fullName,
          email
        }
      });

      return transaction.therapistProfile.findUniqueOrThrow({
        where: { id: therapistProfile.id },
        include: { user: true }
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(
        409,
        "email_already_in_use",
        "That email is already in use"
      );
    }

    throw error;
  }
};

export const setClinicalProfileActiveWithAudit = async (input: {
  therapistId: string;
  isActive: boolean;
  audit: AuditCreateInput;
}) => {
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.therapistProfile.findUnique({
      where: { id: input.therapistId },
      select: { id: true, isActive: true }
    });

    if (!existing) {
      throw new AppError(404, "not_found", "Therapist profile not found");
    }

    if (existing.isActive === input.isActive) {
      throw new AppError(
        400,
        "no_change",
        "Therapist profile is already in that state"
      );
    }

    const updated = await transaction.therapistProfile.update({
      where: { id: input.therapistId },
      data: { isActive: input.isActive },
      include: { user: true }
    });

    await createAuditLogInTransaction(transaction, {
      ...input.audit,
      entityId: updated.id,
      metadata: {
        ...metadataObject(input.audit),
        previousIsActive: existing.isActive,
        isActive: input.isActive
      }
    });

    return updated;
  });
};

export const assignPatientTherapistWithAudit = async (input: {
  patientId: string;
  therapistId: string | null;
  audit: AuditCreateInput;
}) => {
  return prisma.$transaction(async (transaction) => {
    const patient = await transaction.patient.findUnique({
      where: { id: input.patientId },
      select: { id: true, assignedTherapistId: true }
    });

    if (!patient) {
      throw new AppError(404, "not_found", "Patient not found");
    }

    if (input.therapistId) {
      const therapist = await transaction.therapistProfile.findUnique({
        where: { id: input.therapistId },
        select: { id: true, isActive: true }
      });

      if (!therapist) {
        throw new AppError(404, "not_found", "Therapist profile not found");
      }

      if (!therapist.isActive) {
        throw new AppError(
          400,
          "inactive_therapist",
          "Therapist profile is inactive"
        );
      }
    }

    const updated = await transaction.patient.update({
      where: { id: input.patientId },
      data: { assignedTherapistId: input.therapistId }
    });

    await createAuditLogInTransaction(transaction, {
      ...input.audit,
      entityId: updated.id,
      metadata: {
        ...metadataObject(input.audit),
        previousTherapistId: patient.assignedTherapistId,
        assignedTherapistId: input.therapistId
      }
    });

    return updated;
  });
};
