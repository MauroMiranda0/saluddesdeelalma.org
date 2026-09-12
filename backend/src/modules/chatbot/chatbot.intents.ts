export type BookingDetails = {
  fullName?: string;
  birthdate?: string;
  scheduledAt?: string;
  modality?: "online" | "presencial";
  therapyType?: "individual" | "pareja" | "familiar";
};

export type SupportedIntent = "availability" | "book" | "handoff" | "unknown";

const clinicalPattern =
  /\b(ansiedad|depresi[oó]n|suicid|autolesi|trauma|ataque de p[aá]nico|medicamento|diagn[oó]stic|terapia|trastorno|crisis|violencia|abuso|duelo|me siento|me siento mal|no puedo m[aá]s|me quiero hacer da[nñ]o|quiero morir|s[ií]ntoma)/i;
const bookingPattern = /\b(agend|reserv|cita|ses[ií]on|consult)/i;
const availabilityPattern = /\b(disponib|horario|espacio|fecha)/i;
const automationQuestionPattern =
  /\b(eres|es usted|hablo|estoy hablando|hablar)\b.*\b(bot|sistema|automatizad[oa]|asistente digital|inteligencia artificial|persona)\b|\b(bot|sistema automatizado|asistente digital|inteligencia artificial)\b/i;

export const containsSensitiveClinicalContent = (text: string) =>
  clinicalPattern.test(text);

export const isAutomationQuestion = (text: string) =>
  automationQuestionPattern.test(text);

export const classifyIntent = (text: string): SupportedIntent => {
  if (containsSensitiveClinicalContent(text)) {
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
  const therapyType = /\bpareja\b/i.test(text)
    ? "pareja"
    : /\bfamiliar\b/i.test(text)
      ? "familiar"
      : /\bindividual\b/i.test(text)
        ? "individual"
        : undefined;

  return {
    fullName: name,
    birthdate,
    scheduledAt: parseMexicoLocalDateTime(localScheduledAt),
    modality,
    therapyType
  };
};

export const hasCompleteBookingDetails = (
  details: BookingDetails
): details is Required<BookingDetails> =>
  Boolean(
    details.fullName &&
    details.birthdate &&
    details.scheduledAt &&
    details.modality &&
    details.therapyType
  );
