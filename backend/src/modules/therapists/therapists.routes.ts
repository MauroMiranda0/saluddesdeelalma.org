import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";

import { authenticate } from "../../middleware/authenticate";
import { authorizeAdmin } from "../../middleware/authorize-admin";
import { asyncHandler, AppError } from "../../middleware/error-handler";
import { completeAppointmentWithAudit } from "../appointments/appointments.service";
import {
  assignPatientTherapistSchema,
  createTherapistProfileSchema,
  updateTherapistProfileSchema
} from "../../lib/validators/therapist";
import {
  assignPatientTherapistWithAudit,
  createClinicalProfileWithAudit,
  setClinicalProfileActiveWithAudit
} from "./therapists.service";
import {
  listActiveAppointmentsForAdmin,
  listPatientsForAdmin,
  listTherapistProfiles
} from "./therapists.repository";

const uuidPathParam = z.uuid();

const requestParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const assertUuidParam = (value: string | undefined) => {
  if (!uuidPathParam.safeParse(value).success) {
    throw new AppError(400, "validation_error", "Invalid identifier");
  }
};

const therapistProfileDto = (profile: {
  id: string;
  isActive: boolean;
  user: { fullName: string; email: string };
}) => ({
  id: profile.id,
  fullName: profile.user.fullName,
  email: profile.user.email,
  isActive: profile.isActive
});

type TherapistAdminRouteDependencies = {
  authenticate: RequestHandler;
  authorizeAdmin: RequestHandler;
  createClinicalProfileWithAudit: typeof createClinicalProfileWithAudit;
  setClinicalProfileActiveWithAudit: typeof setClinicalProfileActiveWithAudit;
  assignPatientTherapistWithAudit: typeof assignPatientTherapistWithAudit;
  completeAppointmentWithAudit: typeof completeAppointmentWithAudit;
  listTherapistProfiles: typeof listTherapistProfiles;
  listPatientsForAdmin: typeof listPatientsForAdmin;
  listActiveAppointmentsForAdmin: typeof listActiveAppointmentsForAdmin;
};

export const createTherapistAdminRoutes = (
  dependencies: Partial<TherapistAdminRouteDependencies> = {}
) => {
  const router = Router();
  const authenticateRequest = dependencies.authenticate ?? authenticate;
  const authorizeRequest = dependencies.authorizeAdmin ?? authorizeAdmin;
  const createProfile =
    dependencies.createClinicalProfileWithAudit ??
    createClinicalProfileWithAudit;
  const setProfileActive =
    dependencies.setClinicalProfileActiveWithAudit ??
    setClinicalProfileActiveWithAudit;
  const assignTherapist =
    dependencies.assignPatientTherapistWithAudit ??
    assignPatientTherapistWithAudit;
  const completeAppointment =
    dependencies.completeAppointmentWithAudit ?? completeAppointmentWithAudit;
  const listProfiles =
    dependencies.listTherapistProfiles ?? listTherapistProfiles;
  const listPatients =
    dependencies.listPatientsForAdmin ?? listPatientsForAdmin;
  const listAppointments =
    dependencies.listActiveAppointmentsForAdmin ??
    listActiveAppointmentsForAdmin;

  router.get(
    "/therapists",
    authenticateRequest,
    authorizeRequest,
    asyncHandler(async (_request, response) => {
      const profiles = await listProfiles();
      response.json({ therapists: profiles.map(therapistProfileDto) });
    })
  );

  router.post(
    "/therapists",
    authenticateRequest,
    authorizeRequest,
    asyncHandler(async (request, response) => {
      const parsed = createTherapistProfileSchema.safeParse(request.body);

      if (!parsed.success) {
        throw new AppError(
          400,
          "validation_error",
          "Invalid therapist profile"
        );
      }

      const profile = await createProfile({
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        audit: {
          actorUserId: request.adminSession?.user.id,
          actorChannel: "admin_panel",
          action: "therapist_profile_created",
          entityType: "therapist_profile",
          result: "success",
          metadata: { requestId: response.locals.requestId },
          ipAddress: request.ip,
          userAgent: request.header("user-agent")
        }
      });

      response.status(201).json({
        therapistProfile: therapistProfileDto(profile)
      });
    })
  );

  router.patch(
    "/therapists/:therapistId",
    authenticateRequest,
    authorizeRequest,
    asyncHandler(async (request, response) => {
      const therapistId = requestParam(request.params.therapistId)!;
      assertUuidParam(therapistId);
      const parsed = updateTherapistProfileSchema.safeParse(request.body);

      if (!parsed.success) {
        throw new AppError(400, "validation_error", "Invalid therapist state");
      }

      const profile = await setProfileActive({
        therapistId,
        isActive: parsed.data.isActive,
        audit: {
          actorUserId: request.adminSession?.user.id,
          actorChannel: "admin_panel",
          action: "therapist_profile_updated",
          entityType: "therapist_profile",
          result: "success",
          metadata: { requestId: response.locals.requestId },
          ipAddress: request.ip,
          userAgent: request.header("user-agent")
        }
      });

      response.json({
        therapistProfile: therapistProfileDto(profile)
      });
    })
  );

  router.get(
    "/patients",
    authenticateRequest,
    authorizeRequest,
    asyncHandler(async (_request, response) => {
      const patients = await listPatients();
      response.json({ patients });
    })
  );

  router.patch(
    "/patients/:patientId/therapist",
    authenticateRequest,
    authorizeRequest,
    asyncHandler(async (request, response) => {
      const patientId = requestParam(request.params.patientId)!;
      assertUuidParam(patientId);
      const parsed = assignPatientTherapistSchema.safeParse(request.body);

      if (!parsed.success) {
        throw new AppError(
          400,
          "validation_error",
          "Invalid therapist assignment"
        );
      }

      const patient = await assignTherapist({
        patientId,
        therapistId: parsed.data.therapistId,
        audit: {
          actorUserId: request.adminSession?.user.id,
          actorChannel: "admin_panel",
          action: "patient_therapist_assigned",
          entityType: "patient",
          result: "success",
          metadata: { requestId: response.locals.requestId },
          ipAddress: request.ip,
          userAgent: request.header("user-agent")
        }
      });

      response.json({
        patient: {
          id: patient.id,
          fullName: patient.fullName,
          whatsappPhone: patient.whatsappPhone,
          status: patient.status,
          assignedTherapistId: patient.assignedTherapistId
        }
      });
    })
  );

  router.get(
    "/appointments",
    authenticateRequest,
    authorizeRequest,
    asyncHandler(async (_request, response) => {
      const appointments = await listAppointments();
      response.json({
        appointments: appointments.map((appointment) => ({
          id: appointment.id,
          scheduledAt: appointment.scheduledAt.toISOString(),
          status: appointment.status,
          patientName: appointment.patient.fullName,
          therapistName: appointment.therapist?.user?.fullName ?? null
        }))
      });
    })
  );

  router.post(
    "/appointments/:appointmentId/complete",
    authenticateRequest,
    authorizeRequest,
    asyncHandler(async (request, response) => {
      const appointmentId = requestParam(request.params.appointmentId)!;
      assertUuidParam(appointmentId);
      const appointment = await completeAppointment({
        appointmentId,
        audit: {
          actorUserId: request.adminSession?.user.id,
          actorChannel: "admin_panel",
          action: "appointment_completed",
          entityType: "appointment",
          result: "success",
          metadata: { requestId: response.locals.requestId },
          ipAddress: request.ip,
          userAgent: request.header("user-agent")
        }
      });

      response.json({
        appointment: {
          id: appointment.id,
          status: appointment.status,
          completedAt: appointment.completedAt?.toISOString() ?? null
        }
      });
    })
  );

  return router;
};

export const therapistAdminRoutes = createTherapistAdminRoutes();
