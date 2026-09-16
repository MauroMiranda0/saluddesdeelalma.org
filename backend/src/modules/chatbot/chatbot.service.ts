import type { WhatsAppGateway } from "../../integrations/whatsapp/whatsapp.gateway";
import { env } from "../../config/env";
import { audit } from "../audit/audit.service";
import {
  AppointmentConflictError,
  AppointmentNotFoundError,
  AppointmentNotMutableError,
  AppointmentScheduleError,
  TherapistAssignmentRequiredError,
  cancelAppointmentWithAudit,
  createWhatsAppAppointment,
  findNextAvailableSlots
} from "../appointments/appointments.service";
import {
  findNextActiveAppointmentForPatient,
  findRecentCancellationForPatient
} from "../appointments/appointments.repository";
import { findPatientWithAssignedTherapist } from "../patients/patients.service";
import { sendAppointmentConfirmation } from "../reminders/reminders.service";
import {
  findPaymentProofByWhatsappMessageId,
  recordIncomingPaymentProof
} from "../payments/payment-proofs.service";
import {
  findConversationByIncomingMessage,
  saveIncomingMessage,
  saveOutboundMessage,
  updateConversation
} from "./chat-messages.repository";
import type { PendingWhatsAppOutboundMessage } from "./whatsapp-inbox.repository";
import {
  classifyIntent,
  containsSensitiveClinicalContent,
  isAutomationQuestion,
  matchesPatientIdentity,
  parseCancellationDetails,
  type SupportedIntent
} from "./chatbot.intents";
import { getCompleteBookingDetails } from "./chatbot.booking.handler";
import {
  bookingConflictResponse,
  bookingDetailsPrompt,
  cancellationConfirmedText,
  cancellationNotFoundResponse,
  cancellationVerificationFailedResponse,
  cancellationVerificationPrompt,
  clinicalHandoffResponse,
  genericGreetingResponse,
  automationDisclosureResponse
} from "./response-templates";

export type IncomingWhatsAppMessage = {
  id: string;
  from: string;
  text: string;
  receivedAt: Date;
};

export type IncomingPaymentProof = {
  id: string;
  from: string;
  mediaId: string;
  mediaType: "image" | "document";
  receivedAt: Date;
};

type ProcessingContext = {
  gateway: WhatsAppGateway;
  ipAddress?: string;
  userAgent?: string;
  queueOutboundMessage?: (
    message: PendingWhatsAppOutboundMessage
  ) => Promise<unknown>;
};

type ProcessingDependencies = {
  saveIncomingMessage: typeof saveIncomingMessage;
  findConversationByIncomingMessage: typeof findConversationByIncomingMessage;
  updateConversation: typeof updateConversation;
  createWhatsAppAppointment: typeof createWhatsAppAppointment;
  findVerifiedCancellableAppointment: typeof findVerifiedCancellableAppointment;
  cancelAppointmentWithAudit: typeof cancelAppointmentWithAudit;
  saveOutboundMessage: typeof saveOutboundMessage;
  audit: typeof audit;
  sendAppointmentConfirmation: typeof sendAppointmentConfirmation;
};

export const findVerifiedCancellableAppointment = async (input: {
  whatsappPhone: string;
  fullName: string;
  birthdate: string;
}) => {
  const patient = await findPatientWithAssignedTherapist(input.whatsappPhone);

  if (
    !patient ||
    !matchesPatientIdentity(patient, input.fullName, input.birthdate)
  ) {
    return { status: "denied" } as const;
  }

  const appointment = await findNextActiveAppointmentForPatient(
    patient.id,
    new Date()
  );

  return appointment
    ? ({ status: "cancellable", patient, appointment } as const)
    : ({ status: "none", patient } as const);
};

const defaultProcessingDependencies: ProcessingDependencies = {
  saveIncomingMessage,
  findConversationByIncomingMessage,
  updateConversation,
  createWhatsAppAppointment,
  findVerifiedCancellableAppointment,
  cancelAppointmentWithAudit,
  saveOutboundMessage,
  audit,
  sendAppointmentConfirmation
};

const clinicalSummary =
  "El paciente solicitó apoyo clínico; se derivó a la psicóloga.";

export const sanitizeIncomingWhatsAppContent = (text: string) =>
  containsSensitiveClinicalContent(text) ? clinicalSummary : text;

type PaymentProofProcessingDependencies = {
  recordIncomingPaymentProof: typeof recordIncomingPaymentProof;
  findPaymentProofByWhatsappMessageId: typeof findPaymentProofByWhatsappMessageId;
  saveIncomingMessage: typeof saveIncomingMessage;
  findConversationByIncomingMessage: typeof findConversationByIncomingMessage;
  updateConversation: typeof updateConversation;
  audit: typeof audit;
};

const defaultPaymentProofDependencies: PaymentProofProcessingDependencies = {
  recordIncomingPaymentProof,
  findPaymentProofByWhatsappMessageId,
  saveIncomingMessage,
  findConversationByIncomingMessage,
  updateConversation,
  audit
};

export const processIncomingPaymentProof = async (
  proof: IncomingPaymentProof,
  context: ProcessingContext,
  dependencies: Partial<PaymentProofProcessingDependencies> = {}
) => {
  const proofDependencies = {
    ...defaultPaymentProofDependencies,
    ...dependencies
  };
  // A proof is intentionally only an inbox item. It is never matched to a
  // patient, appointment, or payment from its WhatsApp sender.
  const paymentProof = await proofDependencies.recordIncomingPaymentProof({
    whatsappMessageId: proof.id,
    mediaId: proof.mediaId,
    mediaType: proof.mediaType,
    receivedAt: proof.receivedAt,
    audit: {
      actorChannel: "whatsapp",
      action: "payment_proof_received",
      entityType: "payment_proof",
      result: "success",
      metadata: { mediaType: proof.mediaType },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    }
  });
  // null means a previous attempt already persisted the prueba; the required
  // outgoing notice must still be materialized without duplicating it.
  const replayed = paymentProof === null;
  const proofId =
    paymentProof?.id ??
    (await proofDependencies.findPaymentProofByWhatsappMessageId(proof.id))?.id;

  let conversation = await proofDependencies.saveIncomingMessage({
    whatsappPhone: proof.from,
    waMessageId: proof.id,
    contentText:
      "Comprobante de pago recibido; pendiente de validación manual.",
    receivedAt: proof.receivedAt,
    intent: "unknown",
    containsSensitiveClinicalContent: false,
    metadata: { mediaId: proof.mediaId, mediaType: proof.mediaType }
  });
  if (!conversation) {
    conversation = await proofDependencies.findConversationByIncomingMessage(
      proof.id
    );
  }

  if (conversation) {
    await proofDependencies.updateConversation(conversation.id, {
      intent: "unknown",
      lastMessageAt: proof.receivedAt
    });
  }
  if (!env.WHATSAPP_ADMIN_PHONE) {
    return;
  }

  if (!replayed && proofId) {
    await proofDependencies.audit({
      actorChannel: "system",
      action: "payment_proof_review_requested",
      entityType: "payment_proof",
      entityId: proofId,
      result: "success",
      metadata: {},
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });
  }
  const adminMessage = {
    to: env.WHATSAPP_ADMIN_PHONE,
    text: "Jocelyn, recibió un comprobante de pago. Revíselo y asígnelo manualmente desde el panel."
  };
  if (context.queueOutboundMessage) {
    await context.queueOutboundMessage(adminMessage);
  } else {
    await context.gateway.sendText(adminMessage);
  }
};

const sendResponse = async (input: {
  conversationId: string;
  to: string;
  text: string;
  intent: SupportedIntent;
  gateway: WhatsAppGateway;
  saveOutboundMessage: typeof saveOutboundMessage;
  queueOutboundMessage?: ProcessingContext["queueOutboundMessage"];
}) => {
  if (input.queueOutboundMessage) {
    await input.queueOutboundMessage({
      to: input.to,
      text: input.text,
      conversationId: input.conversationId,
      intent: input.intent
    });
    return;
  }

  const sent = await input.gateway.sendText({ to: input.to, text: input.text });
  await input.saveOutboundMessage({
    conversationId: input.conversationId,
    waMessageId: sent.messageId,
    contentText: input.text,
    intent: input.intent
  });
};

const sendAvailability = async (input: {
  conversationId: string;
  to: string;
  whatsappPhone: string;
  intent: "availability" | "book";
  therapyType?: "individual" | "pareja" | "familiar";
  gateway: WhatsAppGateway;
  saveOutboundMessage: typeof saveOutboundMessage;
  queueOutboundMessage?: ProcessingContext["queueOutboundMessage"];
}) => {
  const patient = await findPatientWithAssignedTherapist(input.whatsappPhone);
  const slots =
    patient?.assignedTherapistId && patient.assignedTherapist?.isActive
      ? await findNextAvailableSlots(
          patient.assignedTherapistId,
          input.therapyType ?? "individual",
          3
        )
      : [];

  await sendResponse({
    ...input,
    text: bookingDetailsPrompt(slots)
  });
};

export const processIncomingWhatsAppMessage = async (
  message: IncomingWhatsAppMessage,
  context: ProcessingContext,
  dependencies: Partial<ProcessingDependencies> = {}
) => {
  const processingDependencies = {
    ...defaultProcessingDependencies,
    ...dependencies
  };
  const hasSensitiveClinicalContent = containsSensitiveClinicalContent(
    message.text
  );
  const classifiedIntent = classifyIntent(message.text);
  let conversation = await processingDependencies.saveIncomingMessage({
    whatsappPhone: message.from,
    waMessageId: message.id,
    contentText: sanitizeIncomingWhatsAppContent(message.text),
    receivedAt: message.receivedAt,
    intent: classifiedIntent,
    containsSensitiveClinicalContent: hasSensitiveClinicalContent
  });
  // saveIncomingMessage returns null when a durable retry re-processes a
  // message that was already persisted. Resume from the existing conversation
  // so the required outgoing effects are materialized and the event is only
  // marked processed once every salida is persisted.
  const replayed = !conversation;
  if (!conversation) {
    conversation =
      await processingDependencies.findConversationByIncomingMessage(
        message.id
      );
  }

  if (!conversation) {
    return;
  }

  const intent =
    classifiedIntent === "unknown" &&
    (conversation.currentIntent === "book" ||
      conversation.currentIntent === "cancel")
      ? conversation.currentIntent
      : classifiedIntent;

  if (isAutomationQuestion(message.text)) {
    await processingDependencies.updateConversation(conversation.id, {
      intent,
      lastMessageAt: message.receivedAt
    });
    await sendResponse({
      conversationId: conversation.id,
      to: message.from,
      text: automationDisclosureResponse,
      intent,
      gateway: context.gateway,
      saveOutboundMessage: processingDependencies.saveOutboundMessage,
      queueOutboundMessage: context.queueOutboundMessage
    });
    return;
  }

  if (intent === "handoff") {
    await processingDependencies.updateConversation(conversation.id, {
      intent,
      state: "derivada",
      lastMessageAt: message.receivedAt
    });
    if (!replayed) {
      await processingDependencies.audit({
        actorChannel: "whatsapp",
        action: "clinical_handoff",
        entityType: "chat_conversation",
        entityId: conversation.id,
        result: "success",
        metadata: {},
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      });
    }
    await sendResponse({
      conversationId: conversation.id,
      to: message.from,
      text: clinicalHandoffResponse,
      intent,
      gateway: context.gateway,
      saveOutboundMessage: processingDependencies.saveOutboundMessage,
      queueOutboundMessage: context.queueOutboundMessage
    });
    return;
  }

  if (intent === "cancel") {
    await processingDependencies.updateConversation(conversation.id, {
      intent,
      lastMessageAt: message.receivedAt
    });

    const cancellationDetails = parseCancellationDetails(message.text);

    if (!cancellationDetails.fullName || !cancellationDetails.birthdate) {
      await sendResponse({
        conversationId: conversation.id,
        to: message.from,
        text: cancellationVerificationPrompt,
        intent,
        gateway: context.gateway,
        saveOutboundMessage: processingDependencies.saveOutboundMessage,
        queueOutboundMessage: context.queueOutboundMessage
      });
      return;
    }

    const cancellable =
      await processingDependencies.findVerifiedCancellableAppointment({
        whatsappPhone: message.from,
        fullName: cancellationDetails.fullName,
        birthdate: cancellationDetails.birthdate
      });

    if (cancellable.status === "denied") {
      if (!replayed) {
        await processingDependencies.audit({
          actorChannel: "whatsapp",
          action: "appointment_cancellation_denied",
          entityType: "appointment",
          result: "failure",
          metadata: { reason: "identity_verification_failed" },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent
        });
      }
      await sendResponse({
        conversationId: conversation.id,
        to: message.from,
        text: cancellationVerificationFailedResponse,
        intent,
        gateway: context.gateway,
        saveOutboundMessage: processingDependencies.saveOutboundMessage,
        queueOutboundMessage: context.queueOutboundMessage
      });
      return;
    }

    if (cancellable.status === "none") {
      // A durable retry may re-run a cancellation that a previous attempt
      // already completed (the verified appointment is no longer active).
      // Re-materialize the confirmation instead of duplicating the mutation.
      if (replayed) {
        const cancelled = await findRecentCancellationForPatient(
          cancellable.patient.id,
          message.receivedAt
        );
        if (cancelled) {
          await processingDependencies.updateConversation(conversation.id, {
            intent,
            patientId: cancelled.patient.id,
            lastMessageAt: message.receivedAt
          });
          await sendResponse({
            conversationId: conversation.id,
            to: message.from,
            text: cancellationConfirmedText(cancelled),
            intent,
            gateway: context.gateway,
            saveOutboundMessage: processingDependencies.saveOutboundMessage,
            queueOutboundMessage: context.queueOutboundMessage
          });
          return;
        }
      }
      await sendResponse({
        conversationId: conversation.id,
        to: message.from,
        text: cancellationNotFoundResponse,
        intent,
        gateway: context.gateway,
        saveOutboundMessage: processingDependencies.saveOutboundMessage,
        queueOutboundMessage: context.queueOutboundMessage
      });
      return;
    }

    try {
      const cancelled = await processingDependencies.cancelAppointmentWithAudit(
        {
          appointmentId: cancellable.appointment.id,
          reason:
            "Cancelación solicitada por WhatsApp con verificación del paciente",
          audit: {
            actorChannel: "whatsapp",
            action: "appointment_cancelled",
            entityType: "appointment",
            result: "success",
            metadata: { cancelledVia: "whatsapp" },
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
          }
        }
      );
      await processingDependencies.updateConversation(conversation.id, {
        intent,
        patientId: cancelled.patient.id,
        lastMessageAt: message.receivedAt
      });
      await sendResponse({
        conversationId: conversation.id,
        to: message.from,
        text: cancellationConfirmedText(cancelled),
        intent,
        gateway: context.gateway,
        saveOutboundMessage: processingDependencies.saveOutboundMessage,
        queueOutboundMessage: context.queueOutboundMessage
      });
    } catch (error) {
      if (
        error instanceof AppointmentNotFoundError ||
        error instanceof AppointmentNotMutableError
      ) {
        await sendResponse({
          conversationId: conversation.id,
          to: message.from,
          text: cancellationNotFoundResponse,
          intent,
          gateway: context.gateway,
          saveOutboundMessage: processingDependencies.saveOutboundMessage,
          queueOutboundMessage: context.queueOutboundMessage
        });
        return;
      }

      throw error;
    }
    return;
  }

  if (intent === "availability") {
    await processingDependencies.updateConversation(conversation.id, {
      intent,
      lastMessageAt: message.receivedAt
    });
    await sendAvailability({
      conversationId: conversation.id,
      to: message.from,
      whatsappPhone: message.from,
      intent,
      gateway: context.gateway,
      saveOutboundMessage: processingDependencies.saveOutboundMessage,
      queueOutboundMessage: context.queueOutboundMessage
    });
    return;
  }

  if (intent === "book") {
    const details = getCompleteBookingDetails(message.text);

    if (!details) {
      await processingDependencies.updateConversation(conversation.id, {
        intent,
        lastMessageAt: message.receivedAt
      });
      await sendAvailability({
        conversationId: conversation.id,
        to: message.from,
        whatsappPhone: message.from,
        intent,
        gateway: context.gateway,
        saveOutboundMessage: processingDependencies.saveOutboundMessage,
        queueOutboundMessage: context.queueOutboundMessage
      });
      return;
    }

    try {
      const { appointment, patient } =
        await processingDependencies.createWhatsAppAppointment({
          patient: {
            fullName: details.fullName,
            whatsappPhone: message.from,
            birthdate: details.birthdate,
            preferredModality: details.modality
          },
          scheduledAt: details.scheduledAt,
          modality: details.modality,
          therapyType: details.therapyType,
          createdVia: "whatsapp",
          isManualException: false,
          audit: {
            actorChannel: "whatsapp",
            action: "appointment_created",
            entityType: "appointment",
            result: "success",
            metadata: { createdVia: "whatsapp" },
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
          }
        });
      await processingDependencies.updateConversation(conversation.id, {
        intent,
        patientId: patient.id,
        lastMessageAt: message.receivedAt
      });
      await processingDependencies.sendAppointmentConfirmation({
        appointment,
        patient,
        conversationId: conversation.id,
        gateway: context.gateway,
        queueOutboundMessage: context.queueOutboundMessage
      });
      return;
    } catch (error) {
      if (
        error instanceof AppointmentConflictError ||
        error instanceof AppointmentScheduleError ||
        error instanceof TherapistAssignmentRequiredError
      ) {
        if (!replayed) {
          await processingDependencies.audit({
            actorChannel: "whatsapp",
            action:
              error instanceof AppointmentConflictError
                ? "appointment_conflict"
                : "appointment_schedule_rejected",
            entityType: "appointment",
            result: "failure",
            metadata: {},
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
          });
        }
        await sendResponse({
          conversationId: conversation.id,
          to: message.from,
          text: bookingConflictResponse,
          intent,
          gateway: context.gateway,
          saveOutboundMessage: processingDependencies.saveOutboundMessage,
          queueOutboundMessage: context.queueOutboundMessage
        });
        await sendAvailability({
          conversationId: conversation.id,
          to: message.from,
          whatsappPhone: message.from,
          intent,
          therapyType: details.therapyType,
          gateway: context.gateway,
          saveOutboundMessage: processingDependencies.saveOutboundMessage,
          queueOutboundMessage: context.queueOutboundMessage
        });
        return;
      }

      throw error;
    }
  }

  await processingDependencies.updateConversation(conversation.id, {
    intent: "unknown",
    lastMessageAt: message.receivedAt
  });
  await sendResponse({
    conversationId: conversation.id,
    to: message.from,
    text: genericGreetingResponse,
    intent: "unknown",
    gateway: context.gateway,
    saveOutboundMessage: processingDependencies.saveOutboundMessage,
    queueOutboundMessage: context.queueOutboundMessage
  });
};
