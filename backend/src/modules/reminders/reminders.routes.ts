import type { RequestHandler } from "express";
import { Router } from "express";

import { authenticate } from "../../middleware/authenticate";
import { authorizeAdminIdentity } from "../../middleware/authorize-admin-identity";
import { asyncHandler } from "../../middleware/error-handler";
import { createListAppointmentRemindersController } from "./reminders.controller";
import { listAppointmentReminders } from "./reminders.service";

type ReminderRouteDependencies = {
  authenticate: RequestHandler;
  authorizeAdmin: RequestHandler;
  listAppointmentReminders: typeof listAppointmentReminders;
};

export const createReminderRoutes = (
  dependencies: Partial<ReminderRouteDependencies> = {}
) => {
  const router = Router();
  const authenticateRequest = dependencies.authenticate ?? authenticate;
  const authorizeRequest =
    dependencies.authorizeAdmin ?? authorizeAdminIdentity;
  const listReminders =
    dependencies.listAppointmentReminders ?? listAppointmentReminders;

  router.get(
    "/appointments/:appointmentId/reminders",
    authenticateRequest,
    authorizeRequest,
    asyncHandler(createListAppointmentRemindersController(listReminders))
  );

  return router;
};

export const reminderRoutes = createReminderRoutes();
