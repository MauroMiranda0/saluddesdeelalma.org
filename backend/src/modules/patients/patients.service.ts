import type { PatientInput } from "../../lib/validators/patient";
import {
  createPatient,
  findPatientByWhatsAppPhone
} from "./patients.repository";

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
