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
import { findNextActiveAppointmentForPatient } from "../appointments/appointments.repository";
import { findPatientWithAssignedTherapist } from "../patients/patients.service";
import { sendAppointmentConfirmation } from "../reminders/reminders.service";
import {
  saveIncomingMessage,
  saveOutboundMessage,
  updateConversation
} from "./chat-messages.repository";
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
};

type ProcessingDependencies = {
  saveIncomingMessage: typeof saveIncomingMessage;
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

export const processIncomingPaymentProof = async (
  proof: IncomingPaymentProof,
  context: ProcessingContext
) => {
  const conversation = await saveIncomingMessage({
    whatsappPhone: proof.from,
    waMessageId: proof.id,
    contentText: "Comprobante de pago recibido; pendiente de validación manual.",
    receivedAt: proof.receivedAt,
    intent: "unknown",
    containsSensitiveClinicalContent: false,
    metadata: { mediaId: proof.mediaId, mediaType: proof.mediaType }
  });

  if (!conversation) {
    return;
  }

  const patient = await findPatientWithAssignedTherapist(proof.from);
  await updateConversation(conversation.id, {
    intent: "unknown",
    patientId: patient?.id,
    lastMessageAt: proof.receivedAt
  });
  await audit({
    actorChannel: "whatsapp",
    action: "payment_proof_received",
    entityType: "chat_conversation",
    entityId: conversation.id,
    result: "success",
    metadata: { mediaType: proof.mediaType, patientId: patient?.id },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });

  if (!env.WHATSAPP_ADMIN_PHONE) {
    return;
  }

  await context.gateway.sendText({
    to: env.WHATSAPP_ADMIN_PHONE,
    text: `Jocelyn, ${patient?.fullName ?? "una paciente"} envió un comprobante de pago. Revíselo y confirme el pago desde el panel.`
  });
  await audit({
    actorChannel: "system",
    action: "payment_confirmation_requested",
    entityType: "chat_conversation",
    entityId: conversation.id,
    result: "success",
    metadata: { patientId: patient?.id },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });
};

const sendResponse = async (input: {
  conversationId: string;
  to: string;
  text: string;
  intent: SupportedIntent;
  gateway: WhatsAppGateway;
  saveOutboundMessage: typeof saveOutboundMessage;
}) => {
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
  const conversation = await processingDependencies.saveIncomingMessage({
    whatsappPhone: message.from,
    waMessageId: message.id,
    contentText: sanitizeIncomingWhatsAppContent(message.text),
    receivedAt: message.receivedAt,
    intent: classifiedIntent,
    containsSensitiveClinicalContent: hasSensitiveClinicalContent
  });

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
      saveOutboundMessage: processingDependencies.saveOutboundMessage
    });
    return;
  }

  if (intent === "handoff") {
    await processingDependencies.updateConversation(conversation.id, {
      intent,
      state: "derivada",
      lastMessageAt: message.receivedAt
    });
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
    await sendResponse({
      conversationId: conversation.id,
      to: message.from,
      text: clinicalHandoffResponse,
      intent,
      gateway: context.gateway,
      saveOutboundMessage: processingDependencies.saveOutboundMessage
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
        saveOutboundMessage: processingDependencies.saveOutboundMessage
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
      await processingDependencies.audit({
        actorChannel: "whatsapp",
        action: "appointment_cancellation_denied",
        entityType: "appointment",
        result: "failure",
        metadata: { reason: "identity_verification_failed" },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      });
      await sendResponse({
        conversationId: conversation.id,
        to: message.from,
        text: cancellationVerificationFailedResponse,
        intent,
        gateway: context.gateway,
        saveOutboundMessage: processingDependencies.saveOutboundMessage
      });
      return;
    }

    if (cancellable.status === "none") {
      await sendResponse({
        conversationId: conversation.id,
        to: message.from,
        text: cancellationNotFoundResponse,
        intent,
        gateway: context.gateway,
        saveOutboundMessage: processingDependencies.saveOutboundMessage
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
        saveOutboundMessage: processingDependencies.saveOutboundMessage
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
          saveOutboundMessage: processingDependencies.saveOutboundMessage
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
      saveOutboundMessage: processingDependencies.saveOutboundMessage
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
        saveOutboundMessage: processingDependencies.saveOutboundMessage
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
        gateway: context.gateway
      });
      return;
    } catch (error) {
      if (
        error instanceof AppointmentConflictError ||
        error instanceof AppointmentScheduleError ||
        error instanceof TherapistAssignmentRequiredError
      ) {
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
        await sendResponse({
          conversationId: conversation.id,
          to: message.from,
          text: bookingConflictResponse,
          intent,
          gateway: context.gateway,
          saveOutboundMessage: processingDependencies.saveOutboundMessage
        });
        await sendAvailability({
          conversationId: conversation.id,
          to: message.from,
          whatsappPhone: message.from,
          intent,
          therapyType: details.therapyType,
          gateway: context.gateway,
          saveOutboundMessage: processingDependencies.saveOutboundMessage
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
    saveOutboundMessage: processingDependencies.saveOutboundMessage
  });
};
