import { prisma } from "../../lib/prisma";
import type { CreatePaymentInput } from "../../lib/validators/payment";
import { whatsappGateway } from "../../integrations/whatsapp/whatsapp.gateway";
import {
  createAuditLogInTransaction,
  type AuditCreateInput
} from "../audit/audit.repository";

export class PaymentNotFoundError extends Error {}
export class PaymentNotMutableError extends Error {}
export class PaymentValidationConflictError extends Error {}

export const paymentDto = (payment: {
  id: string;
  paymentType: "anticipo" | "completo";
  amount: { toString(): string };
  method: "transferencia" | "efectivo";
  status: "pendiente_validacion" | "validado" | "rechazado";
  proofReference: string | null;
  paidAt: Date | null;
  createdAt: Date;
}) => ({
  id: payment.id,
  paymentType: payment.paymentType,
  amount: Number(payment.amount.toString()),
  method: payment.method,
  status: payment.status,
  proofReference: payment.proofReference,
  paidAt: payment.paidAt?.toISOString() ?? null,
  createdAt: payment.createdAt.toISOString()
});

export const createPaymentWithAudit = async (input: {
  payment: CreatePaymentInput;
  audit: AuditCreateInput;
}) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: input.payment.appointmentId },
    select: { patientId: true, status: true }
  });

  if (!appointment) {
    throw new PaymentNotFoundError("Appointment does not exist");
  }
  if (
    appointment.status === "cancelada" ||
    appointment.patientId !== input.payment.patientId
  ) {
    throw new PaymentNotMutableError("Payment cannot be registered for this appointment");
  }

  return prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.create({
      data: {
        ...input.payment,
        status: "pendiente_validacion",
        paidAt: new Date(),
        recordedByUserId: input.audit.actorUserId!
      }
    });
    await createAuditLogInTransaction(transaction, {
      ...input.audit,
      action: "payment_registered",
      entityType: "payment",
      entityId: payment.id
    });
    return payment;
  });
};

export const confirmPaymentWithAudit = async (input: {
  paymentId: string;
  audit: AuditCreateInput;
}) => {
  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    include: { appointment: { select: { status: true } } }
  });

  if (!payment) {
    throw new PaymentNotFoundError("Payment does not exist");
  }
  if (payment.appointment.status === "cancelada") {
    throw new PaymentNotMutableError("Payment cannot be confirmed for a cancelled appointment");
  }

  if (payment.status !== "validado" && payment.paymentType === "completo") {
    const validatedFullPayment = await prisma.payment.findFirst({
      where: {
        appointmentId: payment.appointmentId,
        paymentType: "completo",
        status: "validado",
        id: { not: payment.id }
      },
      select: { id: true }
    });
    if (validatedFullPayment) {
      throw new PaymentValidationConflictError(
        "The appointment already has a validated full payment"
      );
    }
  }

  return prisma.$transaction(async (transaction) => {
    const confirmed = await transaction.payment.update({
      where: { id: payment.id },
      data: { status: "validado", paidAt: payment.paidAt ?? new Date() }
    });
    await createAuditLogInTransaction(transaction, {
      ...input.audit,
      action: "payment_confirmed",
      entityType: "payment",
      entityId: confirmed.id
    });
    return confirmed;
  });
};

export const sendPaymentReminderWithAudit = async (input: {
  appointmentId: string;
  audit: AuditCreateInput;
}) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    include: { patient: { select: { whatsappPhone: true } } }
  });

  if (!appointment) {
    throw new PaymentNotFoundError("Appointment does not exist");
  }
  if (appointment.status === "cancelada") {
    throw new PaymentNotMutableError("A cancelled appointment cannot receive reminders");
  }

  await whatsappGateway.sendText({
    to: appointment.patient.whatsappPhone,
    text: "Buen día. Le recordamos amablemente que su saldo de sesión continúa pendiente. Si ya realizó el pago, por favor envíe su comprobante por este medio."
  });
  await prisma.auditLog.create({
    data: {
      actorUserId: input.audit.actorUserId,
      actorChannel: input.audit.actorChannel,
      action: "payment_reminder_sent",
      entityType: "appointment",
      entityId: appointment.id,
      result: "success",
      metadata: input.audit.metadata ?? {},
      ipAddress: input.audit.ipAddress,
      userAgent: input.audit.userAgent
    }
  });
};
