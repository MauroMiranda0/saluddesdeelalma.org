import type { Prisma } from "@prisma/client";

import { findPatientWithAssignedTherapist } from "../patients/patients.service";
import { matchesPatientIdentity } from "./chatbot.intents";

export type VerifiedPatient = {
  id: string;
  fullName: string;
  whatsappPhone: string;
  assignedTherapistId: string | null;
};

export type IdentityDenialReason =
  "details_missing" | "phone_not_registered" | "identity_mismatch";

export type IdentityVerificationResult =
  | { status: "verified"; patient: VerifiedPatient }
  | { status: "denied"; reason: IdentityDenialReason };

type AuditLogger = (input: {
  actorChannel: "whatsapp";
  action: string;
  entityType: string;
  entityId?: string;
  result: "success" | "failure";
  metadata: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}) => Promise<unknown>;

type PatientLookup = (whatsappPhone: string) => Promise<{
  id: string;
  fullName: string;
  whatsappPhone: string;
  assignedTherapistId: string | null;
  birthdate: Date | string | number | null;
} | null>;

/**
 * FR-023 requires the registered WhatsApp number plus a matching full name and
 * birthdate before any appointment or balance detail is disclosed. FR-024
 * requires the denial to be audited and derived to the psychologist.
 *
 * The audit metadata deliberately records only whether each field was supplied,
 * never the name or the birthdate, so the audit trail does not become a second
 * copy of the patient record.
 */
export const verifyPatientIdentity = async (input: {
  whatsappPhone: string;
  fullName?: string;
  birthdate?: string;
  audit: AuditLogger;
  ipAddress?: string;
  userAgent?: string;
  findPatient?: PatientLookup;
}): Promise<IdentityVerificationResult> => {
  const suppliedDetails = {
    hasFullName: Boolean(input.fullName),
    hasBirthdate: Boolean(input.birthdate)
  };

  if (!input.fullName || !input.birthdate) {
    // Audited even though the orchestrator prompts for the missing fields
    // before calling, so that this exported function can never produce a
    // silent denial: FR-024 requires the denial to be derivable to the
    // psychologist and FR-026 requires it in the audit trail.
    await input.audit({
      actorChannel: "whatsapp",
      action: "identity_verification_failed",
      entityType: "chat_conversation",
      result: "failure",
      metadata: { ...suppliedDetails, reason: "details_missing" },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });
    return { status: "denied", reason: "details_missing" };
  }

  const findPatient = input.findPatient ?? findPatientWithAssignedTherapist;
  const patient = await findPatient(input.whatsappPhone);

  if (!patient) {
    await input.audit({
      actorChannel: "whatsapp",
      action: "identity_verification_failed",
      entityType: "chat_conversation",
      result: "failure",
      metadata: { ...suppliedDetails, reason: "phone_not_registered" },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });
    return { status: "denied", reason: "phone_not_registered" };
  }

  if (!matchesPatientIdentity(patient, input.fullName, input.birthdate)) {
    await input.audit({
      actorChannel: "whatsapp",
      action: "identity_verification_failed",
      entityType: "chat_conversation",
      result: "failure",
      metadata: { ...suppliedDetails, reason: "identity_mismatch" },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });
    return { status: "denied", reason: "identity_mismatch" };
  }

  await input.audit({
    actorChannel: "whatsapp",
    action: "identity_verification_succeeded",
    entityType: "chat_conversation",
    entityId: patient.id,
    result: "success",
    metadata: { ...suppliedDetails, patientId: patient.id },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  });

  return {
    status: "verified",
    patient: {
      id: patient.id,
      fullName: patient.fullName,
      whatsappPhone: patient.whatsappPhone,
      assignedTherapistId: patient.assignedTherapistId
    }
  };
};
