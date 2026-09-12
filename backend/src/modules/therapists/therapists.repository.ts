import { prisma } from "../../lib/prisma";

export const listTherapistProfiles = () => {
  return prisma.therapistProfile.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { fullName: true, email: true } }
    }
  });
};

export const listPatientsForAdmin = () => {
  return prisma.patient.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      fullName: true,
      whatsappPhone: true,
      status: true,
      assignedTherapistId: true
    }
  });
};

export const listActiveAppointmentsForAdmin = () => {
  return prisma.appointment.findMany({
    where: { status: { in: ["programada", "confirmada"] } },
    orderBy: { scheduledAt: "desc" },
    take: 200,
    select: {
      id: true,
      scheduledAt: true,
      status: true,
      patient: { select: { fullName: true } },
      therapist: {
        select: { user: { select: { fullName: true } } }
      }
    }
  });
};
