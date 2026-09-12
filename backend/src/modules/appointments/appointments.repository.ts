import { prisma } from "../../lib/prisma";

type CreateAppointmentRecord = {
  patientId: string;
  therapistId: string;
  scheduledAt: Date;
  endsAt: Date;
  therapyType: "individual" | "pareja" | "familiar";
  durationMinutes: number;
  modality: "online" | "presencial";
  isManualException: boolean;
  locationLabel?: string;
  meetingLink?: string;
  createdVia: "whatsapp" | "panel" | "system";
};

export const createAppointmentRecord = (input: CreateAppointmentRecord) => {
  return prisma.appointment.create({ data: input });
};

type UpdateAppointmentRecord = {
  scheduledAt: Date;
  endsAt: Date;
  modality: "online" | "presencial";
  therapyType: "individual" | "pareja" | "familiar";
  durationMinutes: number;
  isManualException: boolean;
};

export const updateAppointmentRecord = (
  appointmentId: string,
  input: UpdateAppointmentRecord
) => {
  return prisma.appointment.update({
    where: { id: appointmentId },
    data: input
  });
};

export const cancelAppointmentRecord = (input: {
  appointmentId: string;
  reason: string;
  cancellationNotice: "a_tiempo" | "tardia";
  cancelledAt: Date;
}) => {
  return prisma.appointment.update({
    where: { id: input.appointmentId },
    data: {
      status: "cancelada",
      cancelReason: input.reason,
      cancelledAt: input.cancelledAt,
      cancellationNotice: input.cancellationNotice
    }
  });
};

export const findAppointmentForAdmin = (appointmentId: string) => {
  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: {
        select: { id: true, fullName: true, whatsappPhone: true }
      },
      therapist: {
        select: {
          id: true,
          isActive: true,
          user: { select: { fullName: true } }
        }
      }
    }
  });
};

export const listAppointmentsInRange = (from: Date, to: Date) => {
  return prisma.appointment.findMany({
    where: { scheduledAt: { gte: from, lt: to } },
    orderBy: { scheduledAt: "asc" },
    include: {
      patient: {
        select: {
          id: true,
          fullName: true,
          whatsappPhone: true,
          birthdate: true,
          status: true
        }
      },
      therapist: {
        select: {
          id: true,
          isActive: true,
          user: { select: { fullName: true } }
        }
      },
      payments: { select: { paymentType: true, status: true } }
    }
  });
};

export const findActiveAppointmentsFrom = (from: Date) => {
  return prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: from },
      status: { in: ["programada", "confirmada"] }
    },
    select: { scheduledAt: true, endsAt: true, therapistId: true }
  });
};

export const findActiveAppointmentsForTherapist = (
  therapistId: string,
  from: Date
) => {
  return prisma.appointment.findMany({
    where: {
      therapistId,
      endsAt: { gt: from },
      status: { in: ["programada", "confirmada"] }
    },
    select: { scheduledAt: true, endsAt: true }
  });
};
