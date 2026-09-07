import { z } from "zod";

import { modalitySchema, patientSchema } from "./patient";

export const appointmentStatusSchema = z.enum([
  "programada",
  "confirmada",
  "completada",
  "cancelada"
]);
export const appointmentCreatedViaSchema = z.enum([
  "whatsapp",
  "panel",
  "system"
]);

export const createAppointmentSchema = z.object({
  patient: patientSchema,
  scheduledAt: z.iso.datetime(),
  modality: modalitySchema,
  createdVia: appointmentCreatedViaSchema,
  isManualException: z.boolean().default(false),
  locationLabel: z.string().max(255).optional(),
  meetingLink: z.url().optional()
});

export const updateAppointmentSchema = z.object({
  scheduledAt: z.iso.datetime().optional(),
  modality: modalitySchema.optional(),
  status: appointmentStatusSchema.optional(),
  cancelReason: z.string().max(500).optional()
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
