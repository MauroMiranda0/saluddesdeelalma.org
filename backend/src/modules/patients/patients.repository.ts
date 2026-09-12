import { prisma } from "../../lib/prisma";
import type { PatientInput } from "../../lib/validators/patient";

const directoryEmail = (patientId: string) =>
  `patient-${patientId}@directory.local`;

export const findPatientByWhatsAppPhone = (whatsappPhone: string) => {
  return prisma.patient.findUnique({ where: { whatsappPhone } });
};

export const findPatientWithTherapistByWhatsAppPhone = (
  whatsappPhone: string
) => {
  return prisma.patient.findUnique({
    where: { whatsappPhone },
    include: { assignedTherapist: true }
  });
};

export const createPatient = async (input: PatientInput) => {
  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.create({
      data: {
        email: `pending-${crypto.randomUUID()}@directory.local`,
        fullName: input.fullName.slice(0, 120),
        role: "paciente"
      }
    });

    const patient = await transaction.patient.create({
      data: {
        userId: user.id,
        fullName: input.fullName,
        whatsappPhone: input.whatsappPhone,
        birthdate: new Date(`${input.birthdate}T00:00:00.000Z`),
        preferredModality: input.preferredModality,
        email: input.email,
        notes: input.notes
      }
    });

    await transaction.user.update({
      where: { id: user.id },
      data: { email: directoryEmail(patient.id) }
    });

    return patient;
  });
};
