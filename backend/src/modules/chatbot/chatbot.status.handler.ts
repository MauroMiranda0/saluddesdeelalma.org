import type { Appointment } from "@prisma/client";

import {
  paymentStatusOf,
  type PaymentSignal
} from "../appointments/appointments.service";
import {
  noAppointmentOnRecordResponse,
  statusSummaryText,
  type PaymentStatusLabel
} from "./response-templates";

type StatusAppointment = Pick<
  Appointment,
  "scheduledAt" | "modality" | "therapyType" | "status" | "durationMinutes"
>;

type StatusAppointmentWithPayments = StatusAppointment & {
  payments?: PaymentSignal[];
};

/**
 * US5/AC2 answers with the date, time, modality and status of the next
 * appointment. US5/AC3 reuses the panel's own `paymentStatusOf` so WhatsApp can
 * never report a different payment state than Jocelyn sees in `/admin/payments`,
 * and no amount is interpolated, keeping FR-029 intact.
 */
export const buildStatusAnswer = (
  appointment: StatusAppointmentWithPayments | null
) => {
  if (!appointment) {
    return noAppointmentOnRecordResponse;
  }

  return statusSummaryText(
    appointment,
    paymentStatusOf(appointment.payments ?? []) as PaymentStatusLabel
  );
};
