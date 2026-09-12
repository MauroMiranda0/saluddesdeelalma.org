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
export const therapyTypeSchema = z.enum(["individual", "pareja", "familiar"]);

export const createAppointmentSchema = z.object({
  patient: patientSchema,
  scheduledAt: z.iso.datetime(),
  modality: modalitySchema,
  therapyType: therapyTypeSchema,
  createdVia: appointmentCreatedViaSchema,
  isManualException: z.boolean().default(false),
  locationLabel: z.string().max(255).optional(),
  meetingLink: z.url().optional()
});

export const updateAppointmentSchema = z.object({
  scheduledAt: z.iso.datetime().optional(),
  modality: modalitySchema.optional(),
  therapyType: therapyTypeSchema.optional(),
  status: appointmentStatusSchema.optional(),
  cancelReason: z.string().max(500).optional()
});

export const appointmentRangeQuerySchema = z.object({
  from: z.iso.datetime(),
  to: z.iso.datetime()
});

export const createAdminAppointmentSchema = z
  .object({
    patientId: z.uuid().optional(),
    patient: patientSchema.optional(),
    scheduledAt: z.iso.datetime(),
    modality: modalitySchema,
    therapyType: therapyTypeSchema,
    isManualException: z.boolean().default(false),
    locationLabel: z.string().max(255).optional(),
    meetingLink: z.url().optional()
  })
  .refine((value) => Boolean(value.patientId || value.patient), {
    message: "patientId or patient data is required"
  });

export const rescheduleAppointmentSchema = z.object({
  scheduledAt: z.iso.datetime(),
  modality: modalitySchema.optional(),
  therapyType: therapyTypeSchema.optional()
});

export const cancelAppointmentSchema = z.object({
  reason: z.string().trim().min(1).max(500)
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type CreateAdminAppointmentInput = z.infer<
  typeof createAdminAppointmentSchema
>;
export type RescheduleAppointmentInput = z.infer<
  typeof rescheduleAppointmentSchema
>;
export type AppointmentRangeQuery = z.infer<typeof appointmentRangeQuerySchema>;
