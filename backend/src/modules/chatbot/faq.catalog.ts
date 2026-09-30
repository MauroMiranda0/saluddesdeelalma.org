export type FaqCategory =
  "horarios" | "ubicacion" | "modalidades" | "formas_pago";

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
    answer: `Nuestro horario de atención es de ${CONSULTORIO_FACTS.hours}. Podemos recibir su sesión en línea o de forma presencial. Si desea agendar, con gusto le ayudo por este mismo medio.`
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
    // question about the modalities the consultory offers.
    question:
      /(modalidad(es)?\b(?!:)|c[oó]mo atienden|atienden presencial|atienden en l[ií]nea|sesiones en l[ií]nea)/i,
    answer:
      "Atendemos de forma individual, en pareja y familiar, y cada sesión puede ser en línea o presencial. Las sesiones individuales duran 60 minutos. ¿Cuál modalidad le acomoda mejor?"
  },
  {
    id: "formas_pago",
    category: "formas_pago",
    question:
      /\b(forma[s]? de pago|formas de pago|c[oó]mo (hago|realizo|se hace|se paga|se cobra)|m[eé]todo[s]? de pago|transferencia|efectivo|cu[aá]nto (cuesta|vale|se cobra)|costo|precio|tarifa[s]?|anticipo)\b/i,
    answer: `Aceptamos transferencia y efectivo. Para reservar su sesión se solicita un anticipo del ${CONSULTORIO_FACTS.advancePolicy} del valor de la sesión, y el resto se liquida el día de la sesión. La psicóloga confirma la tarifa vigente de su modalidad.`
  }
];

export const matchesFaqCategory = (text: string) =>
  FAQ_CATALOG.find((entry) => entry.question.test(text)) ?? null;

export const faqCategoryOf = (text: string): FaqCategory | null =>
  matchesFaqCategory(text)?.category ?? null;
