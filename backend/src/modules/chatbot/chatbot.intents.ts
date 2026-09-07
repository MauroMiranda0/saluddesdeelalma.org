export type BookingDetails = {
  fullName?: string;
  birthdate?: string;
  scheduledAt?: string;
  modality?: "online" | "presencial";
};

export type SupportedIntent = "availability" | "book" | "handoff" | "unknown";

const clinicalPattern =
  /\b(ansiedad|depresi[oó]n|suicid|autolesi|trauma|ataque de p[aá]nico|medicamento|diagn[oó]stic)/i;
const bookingPattern = /\b(agend|reserv|cita|ses[ií]on|consult)/i;
const availabilityPattern = /\b(disponib|horario|espacio|fecha)/i;

export const classifyIntent = (text: string): SupportedIntent => {
  if (clinicalPattern.test(text)) {
    return "handoff";
  }
  if (bookingPattern.test(text)) {
    return "book";
  }
  if (availabilityPattern.test(text)) {
    return "availability";
  }

  return "unknown";
};

const firstMatch = (pattern: RegExp, text: string) => pattern.exec(text)?.[1];

const parseMexicoLocalDateTime = (value?: string) => {
  if (!value) {
    return undefined;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return undefined;
  }

  const [, year, month, day, hour, minute] = match;
  // Mexico City does not observe daylight saving time; appointments use its UTC-6 civil time.
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) + 6,
      Number(minute)
    )
  ).toISOString();
};

export const parseBookingDetails = (text: string): BookingDetails => {
  const name = firstMatch(
    /(?:nombre|soy)\s*[:=]?\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]{2,150}?)(?=\s*(?:;|,|\n|nac(?:i|í)|fecha|cita|modalidad|$))/i,
    text
  )?.trim();
  const birthdate = firstMatch(
    /(?:nacimiento|nac(?:i|í)|fecha de nacimiento)\s*[:=]?\s*(\d{4}-\d{2}-\d{2})/i,
    text
  );
  const localScheduledAt = firstMatch(
    /(?:cita|fecha)\s*[:=]?\s*(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2})/i,
    text
  );
  const modality = /\b(en l[ií]nea|online)\b/i.test(text)
    ? "online"
    : /\bpresencial\b/i.test(text)
      ? "presencial"
      : undefined;

  return {
    fullName: name,
    birthdate,
    scheduledAt: parseMexicoLocalDateTime(localScheduledAt),
    modality
  };
};

export const hasCompleteBookingDetails = (
  details: BookingDetails
): details is Required<BookingDetails> =>
  Boolean(
    details.fullName &&
    details.birthdate &&
    details.scheduledAt &&
    details.modality
  );
