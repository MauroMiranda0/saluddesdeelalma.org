import { z } from "zod";

export const paymentTypeSchema = z.enum(["anticipo", "completo"]);
export const paymentMethodSchema = z.enum(["transferencia", "efectivo"]);
export const paymentStatusSchema = z.enum([
  "pendiente_validacion",
  "validado",
  "rechazado"
]);

export const createPaymentSchema = z.object({
  appointmentId: z.uuid(),
  patientId: z.uuid(),
  paymentType: paymentTypeSchema,
  amount: z.number().positive().multipleOf(0.01),
  method: paymentMethodSchema,
  proofReference: z.string().max(500).optional()
});

export const sessionRateSchema = z.object({
  amount: z.number().positive().multipleOf(0.01).max(9_999_999.99)
});

export const associatePaymentProofSchema = z.object({
  appointmentId: z.uuid(),
  paymentId: z.uuid().optional()
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
