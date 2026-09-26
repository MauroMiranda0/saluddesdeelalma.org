import type { RequestHandler } from "express";
import { z } from "zod";

import { AppError } from "../../middleware/error-handler";
import { listAppointmentReminders, reminderDto } from "./reminders.service";

const uuidPathParam = z.uuid();

const requestParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const createListAppointmentRemindersController = (
  listReminders: typeof listAppointmentReminders = listAppointmentReminders
): RequestHandler => {
  return async (request, response) => {
    const appointmentId = requestParam(request.params.appointmentId);

    if (!uuidPathParam.safeParse(appointmentId).success) {
      throw new AppError(
        400,
        "validation_error",
        "Invalid appointment identifier"
      );
    }

    const reminders = await listReminders(appointmentId!);
    response.json({ reminders: reminders.map(reminderDto) });
  };
};
