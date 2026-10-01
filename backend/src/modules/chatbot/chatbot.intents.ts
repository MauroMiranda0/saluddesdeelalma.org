import { matchesFaqCategory } from "./faq.catalog";

export type BookingDetails = {
  fullName?: string;
  birthdate?: string;
  scheduledAt?: string;
  modality?: "online" | "presencial";
  therapyType?: "individual" | "pareja" | "familiar";
};

export type SupportedIntent =
  | "faq"
  | "availability"
  | "book"
  | "cancel"
  | "payment_status"
  | "handoff"
  | "unknown";

const clinicalPattern =
  /\b(ansiedad|depresi[oó]n|suicid|autolesi|trauma|ataque de p[aá]nico|medicamento|diagn[oó]stic|terapia|trastorno|crisis|violencia|abuso|duelo|me siento|me siento mal|no puedo m[aá]s|me quiero hacer da[nñ]o|quiero morir|s[ií]ntoma)/i;
const bookingPattern = /\b(agend|reserv|cita|sesi[oó]n|consult)/i;
const cancellationPattern =
  /\b(cancel\w*|anular|anulaci[oó]n|no (?:puedo|podr[ée]|quise|pudiera) (?:asistir|ir|llegar))\b/i;
const availabilityPattern = /\b(disponib|horario|espacio|fecha)/i;
// A status request is consultation-shaped. It is deliberately restricted to
// phrases the patient uses to ask about their own record so that imperative
// booking requests such as "quiero agendar mi cita" are not captured here.
// The trailing guard is a negative lookahead rather than \b because \b does not
// exist after accented letters: "ya pagué" would otherwise never match.
const statusQueryPattern =
  /\b(estado de mi|c[oó]mo (va|est[aá]) mi|qu[eé] pasa con mi|saldo|pendiente de (pagar|liquidar)|mi (pago|saldo)|qu[eé] me falta pag|debo|pagu[eé]|ya pagu[eé]|fecha de mi cita|pr[oó]xima cita)(?![a-zA-Z\u00C0-\u024F])/i;
const automationQuestionPattern =
  /\b(eres|es usted|hablo|estoy hablando|hablar)\b.*\b(bot|sistema|automatizad[oa]|asistente digital|inteligencia artificial|persona)\b|\b(bot|sistema automatizado|asistente digital|inteligencia artificial)\b/i;

export const containsSensitiveClinicalContent = (text: string) =>
  clinicalPattern.test(text);

export const isAutomationQuestion = (text: string) =>
  automationQuestionPattern.test(text);

export const classifyIntent = (text: string): SupportedIntent => {
  const faqEntry = matchesFaqCategory(text);
  if (containsSensitiveClinicalContent(text)) {
    return "handoff";
  }
  // US5/T186: the cancellation policy is public information, so a question
  // about it is answered from the catalog. It is checked before the cancel
  // intent because that flow demands identity before doing anything, which
  // would make "¿qué pasa si cancelo?" unanswerable without proving who the
  // patient is. An actual cancellation request does not match the policy
  // pattern and still reaches the `cancel` intent below.
  if (faqEntry?.category === "cancelacion") {
    return "faq";
  }
  if (cancellationPattern.test(text)) {
    return "cancel";
  }
  if (statusQueryPattern.test(text)) {
    return "payment_status";
  }
  if (faqEntry) {
    return "faq";
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

export const parseCancellationDetails = (text: string) => {
  const fullName = firstMatch(
    /(?:nombre|soy)\s*[:=]?\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]{2,150}?)(?=\s*(?:;|,|\n|nac(?:i|í)|fecha|cita|cancel|$))/i,
    text
  )?.trim();
  const birthdate = firstMatch(
    /(?:nacimiento|nac(?:i|í)|fecha de nacimiento)\s*[:=]?\s*(\d{4}-\d{2}-\d{2})/i,
    text
  );

  return { fullName, birthdate };
};

export const matchesPatientIdentity = (
  patient: {
    fullName: string;
    birthdate: Date | string | number | null;
  },
  fullName: string,
  birthdate: string
) => {
  if (!fullName || !birthdate || !patient.birthdate) {
    return false;
  }

  const storedBirthdate = new Date(patient.birthdate)
    .toISOString()
    .slice(0, 10);

  return (
    patient.fullName.trim().toLowerCase() === fullName.trim().toLowerCase() &&
    storedBirthdate === birthdate
  );
};
