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
export class SessionRateNotConfiguredError extends Error {}

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

export const sessionRateDto = (rate: {
  therapyType: "individual" | "pareja" | "familiar";
  amount: { toString(): string };
}) => ({
  therapyType: rate.therapyType,
  amount: Number(rate.amount.toString())
});

export const listSessionRates = async () => {
  return prisma.sessionRate.findMany({
    orderBy: { therapyType: "asc" }
  });
};

export const upsertSessionRateWithAudit = (input: {
  therapyType: "individual" | "pareja" | "familiar";
  amount: number;
  audit: AuditCreateInput;
}) =>
  prisma.$transaction(async (transaction) => {
    const rate = await transaction.sessionRate.upsert({
      where: { therapyType: input.therapyType },
      create: { therapyType: input.therapyType, amount: input.amount },
      update: { amount: input.amount }
    });
    await createAuditLogInTransaction(transaction, {
      ...input.audit,
      action: "session_rate_updated",
      entityType: "session_rate",
      entityId: rate.id,
      metadata: {
        auditMetadata: input.audit.metadata ?? {},
        therapyType: rate.therapyType
      }
    });
    return rate;
  });

export const amountMatchesAdvanceRate = (
  amount: number,
  rateAmount: { toString(): string }
) =>
  Math.round(amount * 100) === Math.round(Number(rateAmount.toString()) * 50);

export const amountMatchesFullRate = (
  amount: number,
  rateAmount: { toString(): string }
) =>
  Math.round(amount * 100) === Math.round(Number(rateAmount.toString()) * 100);

export const assertPaymentCanBeConfirmed = (input: {
  paymentStatus: "pendiente_validacion" | "validado" | "rechazado";
  appointmentStatus: "programada" | "confirmada" | "completada" | "cancelada";
}) => {
  if (
    input.appointmentStatus === "cancelada" ||
    input.paymentStatus !== "pendiente_validacion"
  ) {
    throw new PaymentNotMutableError("Payment cannot be confirmed");
  }
};

export const dispatchManualPaymentReminder = async (input: {
  persistTrace: () => Promise<unknown>;
  dispatch: () => Promise<unknown>;
}) => {
  await input.persistTrace();
  await input.dispatch();
};

export const createPaymentWithAudit = async (input: {
  payment: CreatePaymentInput;
  audit: AuditCreateInput;
}) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: input.payment.appointmentId },
    select: { patientId: true, status: true, therapyType: true }
  });

  if (!appointment) {
    throw new PaymentNotFoundError("Appointment does not exist");
  }
  if (
    appointment.status === "cancelada" ||
    appointment.patientId !== input.payment.patientId
  ) {
    throw new PaymentNotMutableError(
      "Payment cannot be registered for this appointment"
    );
  }

  return prisma.$transaction(async (transaction) => {
    const rate = await transaction.sessionRate.findUnique({
      where: { therapyType: appointment.therapyType }
    });
    if (!rate) {
      throw new SessionRateNotConfiguredError(
        "A session rate must be configured before registering a payment"
      );
    }
    const amountMatchesRate =
      input.payment.paymentType === "anticipo"
        ? amountMatchesAdvanceRate(input.payment.amount, rate.amount)
        : amountMatchesFullRate(input.payment.amount, rate.amount);
    if (!amountMatchesRate) {
      throw new PaymentNotMutableError(
        input.payment.paymentType === "anticipo"
          ? "An advance must equal 50% of the configured session rate"
          : "A full payment must equal the configured session rate"
      );
    }
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
  return prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.findUnique({
      where: { id: input.paymentId },
      include: { appointment: { select: { status: true, therapyType: true } } }
    });
    if (!payment) {
      throw new PaymentNotFoundError("Payment does not exist");
    }
    assertPaymentCanBeConfirmed({
      paymentStatus: payment.status,
      appointmentStatus: payment.appointment.status
    });

    if (payment.paymentType === "completo") {
      const rate = await transaction.sessionRate.findUnique({
        where: { therapyType: payment.appointment.therapyType }
      });
      if (!rate) {
        throw new SessionRateNotConfiguredError(
          "A session rate must be configured before confirming a full payment"
        );
      }
      if (
        !amountMatchesFullRate(Number(payment.amount.toString()), rate.amount)
      ) {
        throw new PaymentNotMutableError(
          "A full payment must equal the configured session rate"
        );
      }
      const validatedFullPayment = await transaction.payment.findFirst({
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
    throw new PaymentNotMutableError(
      "A cancelled appointment cannot receive reminders"
    );
  }

  // Persisting intent before the external side effect guarantees that a send
  // can never succeed merely because audit storage was temporarily unavailable.
  await dispatchManualPaymentReminder({
    persistTrace: () =>
      prisma.$transaction((transaction) =>
        createAuditLogInTransaction(transaction, {
          ...input.audit,
          action: "payment_reminder_requested",
          entityType: "appointment",
          entityId: appointment.id
        })
      ),
    dispatch: () =>
      whatsappGateway.sendText({
        to: appointment.patient.whatsappPhone,
        text: "Buen día. Le recordamos amablemente que su saldo de sesión continúa pendiente. Si ya realizó el pago, por favor envíe su comprobante por este medio."
      })
  });
};
