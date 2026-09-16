export type AgendaEventKind =
  | "cancelada"
  | "por_confirmar"
  | "pendiente_pago"
  | "consulta_jocelyn"
  | "consulta_jenny"
  | "personal";

export type EventColorToken = {
  key: AgendaEventKind;
  label: string;
  bg: string;
  text: string;
  border: string;
  solid: string;
};

export const EVENT_COLOR_MAP: Record<AgendaEventKind, EventColorToken> = {
  cancelada: {
    key: "cancelada",
    label: "Canceladas",
    bg: "#F3F4F6",
    text: "#4B5563",
    border: "#9CA3AF",
    solid: "#9CA3AF"
  },
  por_confirmar: {
    key: "por_confirmar",
    label: "Por confirmar",
    bg: "#FFFBEB",
    text: "#92400E",
    border: "#FBBF24",
    solid: "#FBBF24"
  },
  pendiente_pago: {
    key: "pendiente_pago",
    label: "Pago pendiente",
    bg: "#ECFDF5",
    text: "#065F46",
    border: "#34D399",
    solid: "#34D399"
  },
  consulta_jocelyn: {
    key: "consulta_jocelyn",
    label: "Consulta Jocelyn",
    bg: "#F5F3FF",
    text: "#5B21B6",
    border: "#A78BFA",
    solid: "#8B5CF6"
  },
  consulta_jenny: {
    key: "consulta_jenny",
    label: "Consulta Jenny",
    bg: "#EDE9FE",
    text: "#2E1065",
    border: "#8B5CF6",
    solid: "#4C1D95"
  },
  personal: {
    key: "personal",
    label: "Cita personal",
    bg: "#FDF2F8",
    text: "#9D174D",
    border: "#F472B6",
    solid: "#F472B6"
  }
};

export type AppointmentEventLike = {
  status: "programada" | "confirmada" | "completada" | "cancelada";
  paymentStatus: "pendiente" | "anticipo" | "completado";
  therapistName: string | null;
};

export type TherapistEventKind =
  "consulta_jocelyn" | "consulta_jenny" | "personal";

export const therapistKindOf = (
  therapistName: string | null
): TherapistEventKind => {
  const name = (therapistName ?? "").toLowerCase();

  if (name.includes("jocelyn")) {
    return "consulta_jocelyn";
  }
  if (name.includes("jenny")) {
    return "consulta_jenny";
  }

  return "personal";
};

export type AppointmentEventKind = AgendaEventKind;

export const appointmentKindOf = (
  appointment: AppointmentEventLike
): AppointmentEventKind => {
  if (appointment.status === "cancelada") {
    return "cancelada";
  }
  if (appointment.status === "programada") {
    return "por_confirmar";
  }
  if (appointment.status === "confirmada") {
    return therapistKindOf(appointment.therapistName);
  }
  if (
    appointment.paymentStatus === "pendiente" ||
    appointment.paymentStatus === "anticipo"
  ) {
    return "pendiente_pago";
  }

  return therapistKindOf(appointment.therapistName);
};

export const eventStyles = (kind: AgendaEventKind) => {
  const token = EVENT_COLOR_MAP[kind];

  return {
    card: {
      background: token.bg,
      borderLeft: `4px solid ${token.border}`,
      color: token.text
    }
  };
};
