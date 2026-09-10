import { prisma } from "../../lib/prisma";

type CreateAppointmentRecord = {
  patientId: string;
  scheduledAt: Date;
  modality: "online" | "presencial";
  isManualException: boolean;
  locationLabel?: string;
  meetingLink?: string;
  createdVia: "whatsapp" | "panel" | "system";
};

export const createAppointmentRecord = (input: CreateAppointmentRecord) => {
  return prisma.appointment.create({ data: input });
};

export const findActiveAppointmentsFrom = (from: Date) => {
  return prisma.appointment.findMany({
    where: {
      scheduledAt: { gte: from },
      status: { in: ["programada", "confirmada"] }
    },
    select: { scheduledAt: true }
  });
};
