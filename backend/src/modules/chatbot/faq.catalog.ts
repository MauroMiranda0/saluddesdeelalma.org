export type FaqCategory =
  | "horarios"
  | "ubicacion"
  | "modalidades"
  | "formas_pago"
  | "duracion"
  | "recordatorios"
  | "privacidad"
  | "cancelacion";

export type FaqEntry = {
  id: string;
  category: FaqCategory;
  question: RegExp;
  answer: string;
};

/**
 * Official consultory facts. These values are the single source of truth for the
 * WhatsApp chatbot and must stay in sync with the public landing page and
 * `docs/copy-landing.md`; `backend/tests/integration/whatsapp-faq-status.integration.test.ts`
 * fails when they drift.
 */
export const CONSULTORIO_FACTS = {
  address:
    "Valle del Ciprés #148, Jardines del Valle, San Juan del Río, Querétaro",
  whatsappPhone: "56 6095 0665",
  landline: "427 427 9168",
  hours: "9:00 a 21:00",
  advancePolicy: "50%"
} as const;

/**
 * FR-002 restricts the regular range to Monday through Friday, with Saturdays
 * only as a manual `admin` exception. The landing copy states the hours without
 * the weekday restriction, so this qualifier lives in the chatbot answers to
 * keep it from inviting a Saturday request the availability flow then refuses.
 */
const REGULAR_WEEKDAYS = "lunes a viernes";

/**
 * Answers are static text on purpose: FR-022 only allows official and current
 * consultory information, and session rates are configurable per therapy type
 * in the panel, so no amount is ever interpolated here.
 */
export const FAQ_CATALOG: FaqEntry[] = [
  {
    id: "horarios_atencion",
    category: "horarios",
    question:
      /\b(horario[s]?|a qu[eé] hora[s]?|qu[eé] d[ií]a[s]? atienden|qu[eé] d[ií]a[s]? abren|abren a las|cierran a las|atienden hasta las)\b/i,
    answer: `Nuestro horario de atención es de ${REGULAR_WEEKDAYS}, de ${CONSULTORIO_FACTS.hours}. Podemos recibir su sesión en línea o de forma presencial. Si desea agendar, con gusto le ayudo por este mismo medio.`
  },
  {
    id: "ubicacion_consultorio",
    category: "ubicacion",
    question:
      /\b(d[oó]nde est[aá]n|d[oó]nde est[aá]n ubicados|ubicaci[oó]n|direcci[oó]n|domicilio|c[oó]mo llego)\b/i,
    answer: `El consultorio está en ${CONSULTORIO_FACTS.address}. Si prefiere sesión en línea, le compartimos el enlace de videollamada antes de su sesión.`
  },
  {
    id: "modalidades_atencion",
    category: "modalidades",
    // The negative lookahead keeps a booking payload such as
    // "modalidad: presencial" out of the FAQ: that is a field label, not a
    // question about the modalities the consultory offers. The "en línea o
    // presencial" alternation is what the public FAQ phrase "¿Puedo elegir
    // entre sesión en línea o presencial?" actually contains, and it would
    // otherwise fall through to `bookingPattern` on the word "sesión".
    question:
      /(modalidad(es)?\b(?!:)|c[oó]mo atienden|atienden presencial|atienden en l[ií]nea|sesiones en l[ií]nea|en l[ií]nea o presencial|presencial o en l[ií]nea)/i,
    answer:
      "Atendemos de forma individual, en pareja y familiar, y cada sesión puede ser en línea o presencial. La duración de cada tipo le la confirmo la psicóloga al agendar. ¿Cuál modalidad le acomoda mejor?"
  },
  {
    id: "formas_pago",
    category: "formas_pago",
    question:
      /\b(forma[s]? de pago|formas de pago|c[oó]mo (hago|realizo|se hace|se paga|se cobra|puedo pagar)|puedo pagar|pago con|m[eé]todo[s]? de pago|transferencia|efectivo|cu[aá]nto (cuesta|vale|se cobra)|costo|precio|tarifa[s]?|anticipo)\b/i,
    answer: `Aceptamos transferencia y efectivo. Para reservar su sesión se solicita un anticipo del ${CONSULTORIO_FACTS.advancePolicy} del valor de la sesión, y el resto se liquida el día de la sesión. La psicóloga confirma la tarifa vigente de su modalidad.`
  },
  {
    id: "duracion_sesion",
    category: "duracion",
    // Without this entry "¿Cuánto dura una sesión?" fell through to
    // `bookingPattern` on the word "sesión" and the patient received the
    // availability prompt instead of the duration the public FAQ advertises.
    question:
      /\b(cu[aá]nto dura|cu[aá]nto duran|cu[aá]l es la duraci[oó]n|duraci[oó]n de la sesi[oó]n|cu[aá]nto tiempo dura|qu[eé] tan (largo|larga|es))\b/i,
    answer:
      "Las sesiones individuales duran 60 minutos y las de pareja y familiares duran 90 minutos. Si prefiere, la psicóloga le confirma la duración de su modalidad al agendar."
  },
  {
    id: "recordatorios_sesion",
    category: "recordatorios",
    question:
      /\b(recordatorio|recordatorios|me recuerdan|me avisan de mi sesi[oó]n|me escriben antes)\b/i,
    answer:
      "Sí, son automáticos. Al agendar le enviamos la confirmación de inmediato y el día previo a su sesión, entre las 6:00 y las 7:00 de la tarde, le recordamos su cita por este mismo medio."
  },
  {
    id: "politica_cancelacion",
    category: "cancelacion",
    // A question about the cancellation POLICY must not be routed to the
    // cancellation flow, which demands identity before it does anything. The
    // pattern therefore requires policy framing ("qué pasa si", "política de")
    // and never matches an imperative request such as "quiero cancelar mi cita",
    // which has to keep reaching the `cancel` intent. FR-029 forbids promising a
    // late-cancellation charge, so the answer states there is none.
    question:
      /\b(qu[eé] pasa si|qu[eé] ocurre si|pol[ií]tica de cancelaci|cancelaci[oó]n tard[ií]a|(c[oó]mo|c[oó]mo se) cancelo|hay (alg[uú]n |un )?(cargo|costo|penalizaci|precio)|me (cobran|cobraran|van a cobrar|pedir[aá]n)|tengo que pagar)\b/i,
    answer:
      "Puede cancelar o reagendar avisándonos con al menos 24 horas de anticipación, por este mismo medio o desde el panel. No hay cargos por cancelación."
  },
  {
    id: "privacidad_datos",
    category: "privacidad",
    question:
      /\b(mis datos (est[aá]n|son) seguros|datos seguros|privacidad|confidencialidad|protecci[oó]n de datos|seguridad de (mis )?datos|respaldo de (mis )?datos)\b/i,
    answer:
      "Tratamos sus datos con confidencialidad, conforme a la normativa mexicana de protección de datos personales en salud. Solo la psicóloga accede a su información, y nunca le pedimos datos clínicos por este medio."
  }
];

export const matchesFaqCategory = (text: string) =>
  FAQ_CATALOG.find((entry) => entry.question.test(text)) ?? null;
