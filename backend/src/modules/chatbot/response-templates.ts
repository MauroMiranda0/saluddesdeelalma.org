import type {
  Appointment,
  AppointmentStatus,
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

export const faqResponse = (answer: string) => answer;

export const faqUnmatchedResponse =
  "Con gusto. Puedo orientarle sobre el horario de atención, la ubicación del consultorio, las modalidades de sesión y las formas de pago. También puedo revisar disponibilidad y agendarle una sesión. ¿Sobre cuál de esos temas le gustaría información?";

export const statusVerificationPrompt =
  "Con gusto le informo el estado de su cita o de su saldo. Para proteger su información, por favor confirme su identidad con: Nombre: ...; nacimiento: AAAA-MM-DD.";

/**
 * Deliberately identical for an unregistered number and for a mismatched name or
 * birthdate: a distinct answer would let an unauthenticated caller learn whether
 * a number belongs to a patient.
 */
export const statusVerificationFailedResponse =
  "No pudimos confirmar sus datos, así que no podemos compartir información de citas o pagos por este medio. Para proteger su información, la consulta se atiende desde el número registrado y con nombre y fecha de nacimiento coincidentes; la psicóloga le confirma directamente por este mismo WhatsApp.";

export const noAppointmentOnRecordResponse =
  "No tenemos registrada una cita próxima para su número. Si desea agendar o si cree que existe un error, la psicóloga le confirma directamente por este medio.";

export const appointmentStatusText = (
  appointment: Pick<
    Appointment,
    "scheduledAt" | "modality" | "therapyType" | "status" | "durationMinutes"
  >
) =>
  `Su próxima cita ${therapyTypeLabel(appointment.therapyType)} de ${
    appointment.durationMinutes
  } minutos está ${appointmentStatusLabel(
    appointment.status
  )} para ${dateFormatter.format(appointment.scheduledAt)}, modalidad ${modalityLabel(
    appointment.modality
  )}.`;

export const paymentStatusText = (paymentStatus: PaymentStatusLabel) =>
  paymentStatus === "completado"
    ? "No tiene saldo pendiente por esa cita: el pago está liquidado."
    : paymentStatus === "anticipo"
      ? "Tiene un anticipo registrado por esa cita y el saldo restante queda pendiente de liquidar el día de la sesión."
      : "No tenemos un pago registrado por esa cita, por lo que queda pendiente un anticipo del 50% del valor de la sesión.";

export const statusSummaryText = (
  appointment: Pick<
    Appointment,
    "scheduledAt" | "modality" | "therapyType" | "status" | "durationMinutes"
  >,
  paymentStatus: PaymentStatusLabel
) =>
  `${appointmentStatusText(appointment)} ${paymentStatusText(paymentStatus)}`;

const appointmentStatusLabel = (status: AppointmentStatus) => {
  switch (status) {
    case "programada":
      return "programada";
    case "confirmada":
      return "confirmada";
    case "completada":
      return "completada";
    case "cancelada":
      return "cancelada";
  }
};

export type PaymentStatusLabel = "anticipo" | "pendiente" | "completado";
