import {
  containsSensitiveClinicalContent,
  type SupportedIntent
} from "./chatbot.intents";

/**
 * FR-025 limits stored clinical conversations to a brief administrative summary
 * and basic metadata instead of turning the chat into a clinical record.
 */
const clinicalSummary =
  "El paciente solicitó apoyo clínico; se derivó a la psicóloga.";

/**
 * The identity confirmation the patient sends to unlock a status query carries
 * their full name and birthdate. Storing it verbatim would duplicate the
 * patient record inside the conversation history, so it is reduced to an
 * administrative summary of the interaction.
 */
export const identityVerificationSummary =
  "El paciente confirmó nombre y fecha de nacimiento para consultar el estado de su cita o pago.";

const identityAnswerPattern =
  /(?:nombre|soy)\s*[:=]?\s*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]{2,150}?[,;\n]\s*nac(?:i|í)(?:miento)?\s*[:=]?\s*\d{4}-\d{2}-\d{2}/i;

export const containsIdentityAnswer = (text: string) =>
  identityAnswerPattern.test(text);

/**
 * The booking and cancellation payloads legitimately carry the same `nombre` and
 * `nacimiento` fields, and their stored text is what makes the reservation
 * auditable, so identity masking only applies outside those two flows.
 */
export const sanitizeIncomingWhatsAppContent = (
  text: string,
  intent: SupportedIntent = "unknown"
) => {
  if (containsSensitiveClinicalContent(text)) {
    return clinicalSummary;
  }
  if (
    containsIdentityAnswer(text) &&
    intent !== "book" &&
    intent !== "cancel"
  ) {
    return identityVerificationSummary;
  }

  return text;
};
