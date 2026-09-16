import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import {
  createAuditLogInTransaction,
  type AuditCreateInput
} from "../audit/audit.repository";

export class PaymentProofNotFoundError extends Error {}
export class PaymentProofNotMutableError extends Error {}
export class PaymentProofAssociationError extends Error {}

export const recordIncomingPaymentProof = async (input: {
  whatsappMessageId: string;
  mediaId: string;
  mediaType: "image" | "document";
  receivedAt: Date;
  audit: AuditCreateInput;
}) => {
  try {
    return await prisma.$transaction(async (transaction) => {
      const proof = await transaction.paymentProof.create({
        data: {
          whatsappMessageId: input.whatsappMessageId,
          mediaId: input.mediaId,
          mediaType: input.mediaType,
          receivedAt: input.receivedAt
        }
      });
      await createAuditLogInTransaction(transaction, {
        ...input.audit,
        action: "payment_proof_received",
        entityType: "payment_proof",
        entityId: proof.id,
        metadata: {
          auditMetadata: input.audit.metadata ?? {},
          mediaType: input.mediaType
        }
      });
      return proof;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return null;
    }

    throw error;
  }
};

export const findPaymentProofByWhatsappMessageId = (
  whatsappMessageId: string
) => prisma.paymentProof.findUnique({ where: { whatsappMessageId } });

export const paymentProofDto = (proof: {
  id: string;
  mediaId: string;
  mediaType: string;
  receivedAt: Date;
  status: "pendiente_asociacion" | "asociado";
  appointmentId: string | null;
  paymentId: string | null;
  associatedAt: Date | null;
}) => ({
  id: proof.id,
  reference: proof.mediaId,
  mediaType: proof.mediaType,
  receivedAt: proof.receivedAt.toISOString(),
  status: proof.status,
  appointmentId: proof.appointmentId,
  paymentId: proof.paymentId,
  associatedAt: proof.associatedAt?.toISOString() ?? null
});

export const listPaymentProofs = async () => {
  return prisma.paymentProof.findMany({
    orderBy: { receivedAt: "desc" }
  });
};

export const associatePaymentProofWithAudit = async (input: {
  proofId: string;
  appointmentId: string;
  paymentId?: string;
  audit: AuditCreateInput;
}) => {
  if (!input.audit.actorUserId) {
    throw new PaymentProofAssociationError("An admin actor is required");
  }

  return prisma.$transaction(async (transaction) => {
    const proof = await transaction.paymentProof.findUnique({
      where: { id: input.proofId }
    });

    if (!proof) {
      throw new PaymentProofNotFoundError("Payment proof does not exist");
    }
    if (proof.status !== "pendiente_asociacion") {
      throw new PaymentProofNotMutableError(
        "Payment proof is already associated"
      );
    }

    const appointment = await transaction.appointment.findUnique({
      where: { id: input.appointmentId },
      select: { id: true, status: true }
    });
    if (!appointment || appointment.status === "cancelada") {
      throw new PaymentProofAssociationError(
        "Appointment cannot receive a proof"
      );
    }

    if (input.paymentId) {
      const payment = await transaction.payment.findUnique({
        where: { id: input.paymentId },
        select: { appointmentId: true }
      });
      if (!payment || payment.appointmentId !== appointment.id) {
        throw new PaymentProofAssociationError(
          "Payment does not belong to the selected appointment"
        );
      }
    }

    const associated = await transaction.paymentProof.update({
      where: { id: proof.id },
      data: {
        status: "asociado",
        appointmentId: appointment.id,
        paymentId: input.paymentId,
        associatedByUserId: input.audit.actorUserId,
        associatedAt: new Date()
      }
    });
    await createAuditLogInTransaction(transaction, {
      ...input.audit,
      action: "payment_proof_associated",
      entityType: "payment_proof",
      entityId: associated.id,
      metadata: {
        auditMetadata: input.audit.metadata ?? {},
        appointmentId: appointment.id,
        paymentId: input.paymentId ?? null
      }
    });

    return associated;
  });
};
