import type {
  Appointment,
  Modality,
  Patient,
  TherapyType
} from "@prisma/client";

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
  hour12: true
});

export const appointmentConfirmation = (
  appointment: Pick<
    Appointment,
    | "scheduledAt"
    | "modality"
    | "locationLabel"
    | "meetingLink"
    | "therapyType"
    | "durationMinutes"
  >,
  patient: Pick<Patient, "fullName">
) => {
  const modality =
    appointment.modality === "online" ? "en línea" : "presencial";
  const accessDetails =
    appointment.modality === "online"
      ? appointment.meetingLink
        ? ` Enlace: ${appointment.meetingLink}`
        : " Le compartiremos el enlace de videollamada antes de su sesión."
      : appointment.locationLabel
        ? ` Dirección: ${appointment.locationLabel}`
        : "";

  return `Perfecto, ${patient.fullName}. Su cita ${therapyTypeLabel(appointment.therapyType)} de ${appointment.durationMinutes} minutos queda agendada para ${dateFormatter.format(appointment.scheduledAt)}, modalidad ${modality}.${accessDetails} Si necesita cancelar o reagendar, avísenos con al menos 24 horas de anticipación para evitar un costo adicional.`;
};

export const bookingDetailsPrompt = (slots: Date[]) => {
  const offeredSlots = slots
    .map((slot) => dateFormatter.format(slot))
    .join("; ");

  const availability = offeredSlots
    ? `Tenemos estos horarios disponibles: ${offeredSlots}. `
    : "Para revisar horarios con su psicóloga asignada, ";

  return `Con gusto. ${availability}para confirmar, responda con: Nombre: ...; nacimiento: AAAA-MM-DD; cita: AAAA-MM-DD HH:MM; modalidad: en línea o presencial; tipo: individual, pareja o familiar.`;
};

export const clinicalHandoffResponse =
  "Comprendo su preocupación. Para orientarle adecuadamente es importante revisarlo directamente con la psicóloga. Si gusta, puedo ayudarle a agendar una sesión.";

export const bookingConflictResponse =
  "Por el momento ese horario ya no está disponible. Permítame ofrecerle otro espacio.";

export const genericGreetingResponse =
  "Buen día. Puedo ayudarle a consultar disponibilidad y agendar una sesión. ¿Qué día le gustaría revisar?";

export const automationDisclosureResponse =
  "Soy un asistente digital del consultorio. Puedo apoyarle con temas administrativos, como consultar disponibilidad y agendar una sesión.";

export const modalityLabel = (modality: Modality) =>
  modality === "online" ? "en línea" : "presencial";

export const therapyTypeLabel = (therapyType: TherapyType) =>
  therapyType === "individual"
    ? "individual"
    : therapyType === "pareja"
      ? "de pareja"
      : "familiar";

export const cancellationVerificationPrompt =
  "Con gusto le ayudo a cancelar su cita. Para confirmar su identidad, por favor responda: Nombre: ...; nacimiento: AAAA-MM-DD.";

export const cancellationVerificationFailedResponse =
  "No pudimos confirmar sus datos. Para proteger su información, la cancelación se atiende desde el número registrado y con nombre y fecha de nacimiento coincidentes; por favor verifíquelo con la psicóloga.";

export const cancellationNotFoundResponse =
  "No encontramos una cita activa por cancelar. Si desea agendar o reagendar una sesión, con gusto le ayudo.";

export const cancellationConfirmedText = (
  appointment: Pick<
    Appointment,
    "scheduledAt" | "therapyType" | "durationMinutes" | "modality"
  > & { patient: Pick<Patient, "fullName"> }
) =>
  `Listo, ${appointment.patient.fullName}. Su cita ${therapyTypeLabel(
    appointment.therapyType
  )} programada para ${dateFormatter.format(
    appointment.scheduledAt
  )} quedó cancelada. Si desea reagendar o agendar una nueva sesión, escríbanos por este medio y con gusto la apoyamos.`;
