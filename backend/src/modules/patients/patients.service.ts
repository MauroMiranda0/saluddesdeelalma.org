import { Prisma } from "@prisma/client";

import { AppError } from "../../middleware/error-handler";
import { prisma } from "../../lib/prisma";
import type { PatientInput } from "../../lib/validators/patient";
import {
  createPatient,
  findPatientByWhatsAppPhone,
  findPatientWithTherapistByWhatsAppPhone
} from "./patients.repository";
import {
  createAuditLogInTransaction,
  type AuditCreateInput
} from "../audit/audit.repository";

export const normalizeWhatsAppPhone = (phone: string) =>
  phone.replace(/\D/g, "");

export const findOrCreatePatient = async (input: PatientInput) => {
  const normalizedInput = {
    ...input,
    whatsappPhone: normalizeWhatsAppPhone(input.whatsappPhone)
  };
  const existing = await findPatientByWhatsAppPhone(
    normalizedInput.whatsappPhone
  );

  return existing ?? createPatient(normalizedInput);
};

export const findPatientWithAssignedTherapist = (whatsappPhone: string) =>
  findPatientWithTherapistByWhatsAppPhone(
    normalizeWhatsAppPhone(whatsappPhone)
  );

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

const metadataObject = (audit: AuditCreateInput) =>
  (audit.metadata ?? {}) as Record<string, unknown>;

export const createAdminPatientWithAudit = async (input: {
  patient: PatientInput;
  therapistId?: string;
  audit: AuditCreateInput;
}) => {
  const normalizedPatient = {
    ...input.patient,
    whatsappPhone: normalizeWhatsAppPhone(input.patient.whatsappPhone)
  };

  try {
    return await prisma.$transaction(async (transaction) => {
      const existing = await transaction.patient.findUnique({
        where: { whatsappPhone: normalizedPatient.whatsappPhone },
        select: { id: true }
      });

      if (existing) {
        throw new AppError(
          409,
          "patient_already_exists",
          "A patient with that WhatsApp number already exists"
        );
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

      const patient = await createPatient(
        normalizedPatient,
        transaction,
        input.therapistId
      );

      await createAuditLogInTransaction(transaction, {
        ...input.audit,
        entityId: patient.id,
        metadata: {
          ...metadataObject(input.audit),
          fullName: patient.fullName,
          whatsappPhone: patient.whatsappPhone,
          assignedTherapistId: patient.assignedTherapistId
        }
      });

      return patient;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(
        409,
        "patient_already_exists",
        "A patient with that WhatsApp number already exists"
      );
    }

    throw error;
  }
};
