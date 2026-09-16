import { apiRequest } from "../api/client";

export type TherapistProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
};

export type AdminPatient = {
  id: string;
  fullName: string;
  whatsappPhone: string;
  status: "activo" | "inactivo";
  birthdate: string | null;
  preferredModality: "online" | "presencial" | null;
  email: string | null;
  assignedTherapistId: string | null;
};

export type AdminAppointment = {
  id: string;
  scheduledAt: string;
  status: "programada" | "confirmada";
  patientName: string;
  therapistName: string;
};

export type AppointmentStatus =
  "programada" | "confirmada" | "completada" | "cancelada";

export type AdminAppointmentEvent = {
  id: string;
  scheduledAt: string;
  endsAt: string;
  therapyType: "individual" | "pareja" | "familiar";
  durationMinutes: number;
  modality: "online" | "presencial";
  status: AppointmentStatus;
  isManualException: boolean;
  locationLabel: string | null;
  meetingLink: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  cancellationNotice: "a_tiempo" | "tardia" | null;
  createdVia: "whatsapp" | "panel" | "system";
  paymentStatus: "pendiente" | "anticipo" | "completado";
  payments: AdminPayment[];
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientBirthdate: string | null;
  therapistId: string;
  therapistName: string | null;
  therapistIsActive: boolean;
};

export type AdminPayment = {
  id: string;
  paymentType: "anticipo" | "completo";
  amount: number;
  method: "transferencia" | "efectivo";
  status: "pendiente_validacion" | "validado" | "rechazado";
  proofReference: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type SessionRate = {
  therapyType: "individual" | "pareja" | "familiar";
  amount: number;
};

export type PaymentProof = {
  id: string;
  reference: string;
  mediaType: string;
  receivedAt: string;
  status: "pendiente_asociacion" | "asociado";
  appointmentId: string | null;
  paymentId: string | null;
  associatedAt: string | null;
};

export type DirectoryPatient = {
  id: string;
  fullName: string;
  whatsappPhone: string;
  birthdate: string | null;
  status: "activo" | "inactivo";
  preferredModality: "online" | "presencial" | null;
  email: string | null;
  assignedTherapistId: string | null;
};

export type DirectoryTherapist = {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
};

export type Directory = {
  patients: DirectoryPatient[];
  therapists: DirectoryTherapist[];
};

export const listTherapistProfiles = () => {
  return apiRequest<{ therapists: TherapistProfile[] }>("/admin/therapists");
};

export const createTherapistProfile = (input: {
  fullName: string;
  phone: string;
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

export const createAdminPatient = (input: {
  fullName: string;
  whatsappPhone: string;
  birthdate: string;
  preferredModality?: "online" | "presencial";
  email?: string;
  therapistId?: string;
}) => {
  return apiRequest<{ patient: AdminPatient }>("/admin/patients", {
    method: "POST",
    body: input
  });
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

export const updatePatientStatus = (patientId: string, isActive: boolean) => {
  return apiRequest<{ patient: AdminPatient }>(`/admin/patients/${patientId}`, {
    method: "PATCH",
    body: { isActive }
  });
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

export const confirmAppointment = (appointmentId: string) => {
  return apiRequest<{ appointment: AdminAppointmentEvent }>(
    `/appointments/${appointmentId}/confirm`,
    { method: "POST" }
  );
};

export const listAppointmentsRange = (from: string, to: string) => {
  return apiRequest<{ appointments: AdminAppointmentEvent[] }>(
    `/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
};

export const createAdminAppointment = (input: {
  patientId?: string;
  patient?: {
    fullName: string;
    whatsappPhone: string;
    birthdate: string;
    preferredModality?: "online" | "presencial";
  };
  scheduledAt: string;
  modality: "online" | "presencial";
  therapyType: "individual" | "pareja" | "familiar";
  isManualException?: boolean;
  locationLabel?: string;
  meetingLink?: string;
}) => {
  return apiRequest<{ appointment: AdminAppointmentEvent }>("/appointments", {
    method: "POST",
    body: input
  });
};

export const rescheduleAdminAppointment = (
  appointmentId: string,
  input: {
    scheduledAt: string;
    modality?: "online" | "presencial";
    therapyType?: "individual" | "pareja" | "familiar";
    manualExceptionConfirmed?: boolean;
  }
) => {
  return apiRequest<{ appointment: AdminAppointmentEvent }>(
    `/appointments/${appointmentId}`,
    { method: "PATCH", body: input }
  );
};

export const cancelAdminAppointment = (
  appointmentId: string,
  reason: string
) => {
  return apiRequest<{ appointment: AdminAppointmentEvent }>(
    `/appointments/${appointmentId}/cancel`,
    { method: "POST", body: { reason } }
  );
};

export const registerPayment = (input: {
  appointmentId: string;
  patientId: string;
  paymentType: "anticipo" | "completo";
  amount: number;
  method: "transferencia" | "efectivo";
  proofReference?: string;
}) => {
  return apiRequest<{ payment: AdminPayment }>("/payments", {
    method: "POST",
    body: input
  });
};

export const confirmPayment = (paymentId: string) => {
  return apiRequest<{ payment: AdminPayment }>(
    `/payments/${paymentId}/confirm`,
    {
      method: "POST"
    }
  );
};

export const sendPaymentReminder = (appointmentId: string) => {
  return apiRequest<void>(`/appointments/${appointmentId}/payment-reminder`, {
    method: "POST"
  });
};

export const listSessionRates = () => {
  return apiRequest<{ sessionRates: SessionRate[] }>("/session-rates");
};

export const updateSessionRate = (
  therapyType: SessionRate["therapyType"],
  amount: number
) => {
  return apiRequest<{ sessionRate: SessionRate }>(
    `/session-rates/${therapyType}`,
    {
      method: "PUT",
      body: { amount }
    }
  );
};

export const listPaymentProofs = () => {
  return apiRequest<{ paymentProofs: PaymentProof[] }>("/payment-proofs");
};

export const associatePaymentProof = (
  proofId: string,
  input: { appointmentId: string; paymentId?: string }
) => {
  return apiRequest<{ paymentProof: PaymentProof }>(
    `/payment-proofs/${proofId}/associate`,
    { method: "POST", body: input }
  );
};

export const fetchDirectory = () => {
  return apiRequest<Directory>("/directory");
};
