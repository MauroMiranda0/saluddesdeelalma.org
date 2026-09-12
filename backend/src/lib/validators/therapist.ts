import { z } from "zod";

export const createTherapistProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email().optional()
});

export const updateTherapistProfileSchema = z.object({
  isActive: z.boolean()
});

export const assignPatientTherapistSchema = z.object({
  therapistId: z.uuid().nullable()
});

export type CreateTherapistProfileInput = z.infer<
  typeof createTherapistProfileSchema
>;
export type UpdateTherapistProfileInput = z.infer<
  typeof updateTherapistProfileSchema
>;
export type AssignPatientTherapistInput = z.infer<
  typeof assignPatientTherapistSchema
>;
