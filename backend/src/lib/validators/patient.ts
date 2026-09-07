import { z } from "zod";

export const modalitySchema = z.enum(["online", "presencial"]);

export const patientSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  whatsappPhone: z.string().trim().min(8).max(30),
  birthdate: z.iso.date(),
  preferredModality: modalitySchema.optional(),
  email: z.email().optional(),
  notes: z.string().max(1000).optional()
});

export type PatientInput = z.infer<typeof patientSchema>;
