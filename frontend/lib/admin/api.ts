import { apiRequest } from "../api/client";

export type TherapistProfile = {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
};

export type AdminPatient = {
  id: string;
  fullName: string;
  whatsappPhone: string;
  status: "activo" | "inactivo";
  assignedTherapistId: string | null;
};

export type AdminAppointment = {
  id: string;
  scheduledAt: string;
  status: "programada" | "confirmada";
  patientName: string;
  therapistName: string;
};

export const listTherapistProfiles = () => {
  return apiRequest<{ therapists: TherapistProfile[] }>("/admin/therapists");
};

export const createTherapistProfile = (input: {
  fullName: string;
  email?: string;
}) => {
  return apiRequest<{ therapistProfile: TherapistProfile }>(
    "/admin/therapists",
    {
      method: "POST",
      body: input
    }
  );
};

export const updateTherapistProfile = (
  therapistId: string,
  input: { isActive: boolean }
) => {
  return apiRequest<{ therapistProfile: TherapistProfile }>(
    `/admin/therapists/${therapistId}`,
    { method: "PATCH", body: input }
  );
};

export const listAdminPatients = () => {
  return apiRequest<{ patients: AdminPatient[] }>("/admin/patients");
};

export const assignPatientTherapist = (
  patientId: string,
  therapistId: string | null
) => {
  return apiRequest<{ patient: AdminPatient }>(
    `/admin/patients/${patientId}/therapist`,
    { method: "PATCH", body: { therapistId } }
  );
};

export const listAdminAppointments = () => {
  return apiRequest<{ appointments: AdminAppointment[] }>(
    "/admin/appointments"
  );
};

export const completeAppointment = (appointmentId: string) => {
  return apiRequest<{
    appointment: { id: string; status: string; completedAt: string | null };
  }>(`/admin/appointments/${appointmentId}/complete`, { method: "POST" });
};
