import { prisma } from "../../lib/prisma";

export const listDirectoryPatients = () => {
  return prisma.patient.findMany({
    orderBy: [{ status: "asc" }, { fullName: "asc" }],
    select: {
      id: true,
      fullName: true,
      whatsappPhone: true,
      birthdate: true,
      status: true,
      preferredModality: true,
      email: true,
      notes: true,
      assignedTherapistId: true
    }
  });
};

export const listDirectoryTherapists = () => {
  return prisma.therapistProfile.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      isActive: true,
      user: { select: { fullName: true, email: true } }
    }
  });
};
