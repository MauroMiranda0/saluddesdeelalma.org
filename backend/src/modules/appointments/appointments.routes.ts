import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";

import {
  appointmentRangeQuerySchema,
  cancelAppointmentSchema,
  createAdminAppointmentSchema,
  rescheduleAppointmentSchema
} from "../../lib/validators/appointment";
import { authenticate } from "../../middleware/authenticate";
import { authorizeAdminIdentity } from "../../middleware/authorize-admin-identity";
import { asyncHandler, AppError } from "../../middleware/error-handler";
import {
  AppointmentConflictError,
  AppointmentNotFoundError,
  AppointmentNotMutableError,
  AppointmentScheduleError,
  TherapistAssignmentRequiredError,
  appointmentCalendarDto,
  cancelAppointmentWithAudit,
  createPanelAppointmentWithAudit,
  listAppointmentsForCalendar,
  rescheduleAppointmentWithAudit
} from "./appointments.service";

const uuidPathParam = z.uuid();

const requestParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const assertUuidParam = (value: string | undefined) => {
  if (!uuidPathParam.safeParse(value).success) {
    throw new AppError(400, "validation_error", "Invalid identifier");
  }
};

const appointmentError = (error: unknown) => {
  const conflict = () =>
    new AppError(409, "conflict", "El horario solicitado no está disponible");
  const notFound = () => new AppError(404, "not_found", "La cita no existe");
  const notMutable = () =>
    new AppError(409, "conflict", "La cita no puede modificarse");
  const schedule = () =>
    new AppError(
      422,
      "unprocessable_entity",
      "La cita debe respetar el horario regular o marcarse como excepción manual"
    );
  const assignment = () =>
    new AppError(
      409,
      "conflict",
      "El paciente necesita un terapeuta activo asignado"
    );

  if (error instanceof AppointmentNotFoundError) {
    return notFound();
  }
  if (error instanceof AppointmentNotMutableError) {
    return notMutable();
  }
  if (error instanceof AppointmentConflictError) {
    return conflict();
  }
  if (error instanceof AppointmentScheduleError) {
    return schedule();
  }
  if (error instanceof TherapistAssignmentRequiredError) {
    return assignment();
  }

  return error;
};

type AdminAppointmentRouteDependencies = {
  authenticate: RequestHandler;
  authorizeAdmin: RequestHandler;
  createPanelAppointmentWithAudit: typeof createPanelAppointmentWithAudit;
  rescheduleAppointmentWithAudit: typeof rescheduleAppointmentWithAudit;
  cancelAppointmentWithAudit: typeof cancelAppointmentWithAudit;
  listAppointmentsForCalendar: typeof listAppointmentsForCalendar;
};

export const createAdminAppointmentRoutes = (
  dependencies: Partial<AdminAppointmentRouteDependencies> = {}
) => {
  const router = Router();
  const authenticateRequest = dependencies.authenticate ?? authenticate;
  const authorizeRequest =
    dependencies.authorizeAdmin ?? authorizeAdminIdentity;
  const createAppointment =
    dependencies.createPanelAppointmentWithAudit ??
    createPanelAppointmentWithAudit;
  const rescheduleAppointment =
    dependencies.rescheduleAppointmentWithAudit ??
    rescheduleAppointmentWithAudit;
  const cancelAppointment =
    dependencies.cancelAppointmentWithAudit ?? cancelAppointmentWithAudit;
  const listAppointments =
    dependencies.listAppointmentsForCalendar ?? listAppointmentsForCalendar;

  router.get(
    "/appointments",
    authenticateRequest,
    authorizeRequest,
    asyncHandler(async (request, response) => {
      const parsed = appointmentRangeQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        throw new AppError(
          400,
          "validation_error",
          "from and to ISO dates are required"
        );
      }

      const appointments = await listAppointments(
        new Date(parsed.data.from),
        new Date(parsed.data.to)
      );

      response.json({ appointments });
    })
  );

  router.post(
    "/appointments",
    authenticateRequest,
    authorizeRequest,
    asyncHandler(async (request, response) => {
      const parsed = createAdminAppointmentSchema.safeParse(request.body);

      if (!parsed.success) {
        throw new AppError(
          400,
          "validation_error",
          "Appointment payload is invalid"
        );
      }

      try {
        const appointment = await createAppointment({
          patient: {
            patientId: parsed.data.patientId,
            newPatient: parsed.data.patient
          },
          scheduledAt: new Date(parsed.data.scheduledAt),
          modality: parsed.data.modality,
          therapyType: parsed.data.therapyType,
          isManualException: parsed.data.isManualException,
          locationLabel: parsed.data.locationLabel,
          meetingLink: parsed.data.meetingLink,
          actorUserId: request.adminSession?.user.id,
          audit: {
            actorUserId: request.adminSession?.user.id,
            actorChannel: "admin_panel",
            action: "appointment_created",
            entityType: "appointment",
            result: "success",
            metadata: { requestId: response.locals.requestId },
            ipAddress: request.ip,
            userAgent: request.header("user-agent")
          }
        });

        response
          .status(201)
          .json({ appointment: appointmentCalendarDto(appointment) });
      } catch (error) {
        throw appointmentError(error);
      }
    })
  );

  router.patch(
    "/appointments/:appointmentId",
    authenticateRequest,
    authorizeRequest,
    asyncHandler(async (request, response) => {
      const appointmentId = requestParam(request.params.appointmentId)!;
      assertUuidParam(appointmentId);
      const parsed = rescheduleAppointmentSchema.safeParse(request.body);

      if (!parsed.success) {
        throw new AppError(
          400,
          "validation_error",
          "A new ISO scheduledAt is required"
        );
      }

      try {
        const appointment = await rescheduleAppointment({
          appointmentId,
          scheduledAt: new Date(parsed.data.scheduledAt),
          modality: parsed.data.modality,
          therapyType: parsed.data.therapyType,
          audit: {
            actorUserId: request.adminSession?.user.id,
            actorChannel: "admin_panel",
            action: "appointment_rescheduled",
            entityType: "appointment",
            result: "success",
            metadata: { requestId: response.locals.requestId },
            ipAddress: request.ip,
            userAgent: request.header("user-agent")
          }
        });

        response.json({ appointment: appointmentCalendarDto(appointment) });
      } catch (error) {
        throw appointmentError(error);
      }
    })
  );

  router.post(
    "/appointments/:appointmentId/cancel",
    authenticateRequest,
    authorizeRequest,
    asyncHandler(async (request, response) => {
      const appointmentId = requestParam(request.params.appointmentId)!;
      assertUuidParam(appointmentId);
      const parsed = cancelAppointmentSchema.safeParse(request.body);

      if (!parsed.success) {
        throw new AppError(
          400,
          "validation_error",
          "A cancel reason is required"
        );
      }

      try {
        const appointment = await cancelAppointment({
          appointmentId,
          reason: parsed.data.reason,
          audit: {
            actorUserId: request.adminSession?.user.id,
            actorChannel: "admin_panel",
            action: "appointment_cancelled",
            entityType: "appointment",
            result: "success",
            metadata: { requestId: response.locals.requestId },
            ipAddress: request.ip,
            userAgent: request.header("user-agent")
          }
        });

        response.json({ appointment: appointmentCalendarDto(appointment) });
      } catch (error) {
        throw appointmentError(error);
      }
    })
  );

  return router;
};

export const adminAppointmentRoutes = createAdminAppointmentRoutes();
