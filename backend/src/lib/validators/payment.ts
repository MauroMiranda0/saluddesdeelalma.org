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
  amount: z.number().positive(),
  method: paymentMethodSchema,
  proofReference: z.string().max(500).optional()
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
