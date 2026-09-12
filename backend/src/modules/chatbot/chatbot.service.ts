import type { WhatsAppGateway } from "../../integrations/whatsapp/whatsapp.gateway";
import { audit } from "../audit/audit.service";
import {
  AppointmentConflictError,
  AppointmentScheduleError,
  TherapistAssignmentRequiredError,
  createWhatsAppAppointment,
  findNextAvailableSlots
} from "../appointments/appointments.service";
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
  type SupportedIntent
} from "./chatbot.intents";
import { getCompleteBookingDetails } from "./chatbot.booking.handler";
import {
  bookingConflictResponse,
  bookingDetailsPrompt,
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

type ProcessingContext = {
  gateway: WhatsAppGateway;
  ipAddress?: string;
  userAgent?: string;
};

type ProcessingDependencies = {
  saveIncomingMessage: typeof saveIncomingMessage;
  updateConversation: typeof updateConversation;
  createWhatsAppAppointment: typeof createWhatsAppAppointment;
  audit: typeof audit;
  sendAppointmentConfirmation: typeof sendAppointmentConfirmation;
};

const defaultProcessingDependencies: ProcessingDependencies = {
  saveIncomingMessage,
  updateConversation,
  createWhatsAppAppointment,
  audit,
  sendAppointmentConfirmation
};

const clinicalSummary =
  "El paciente solicitó apoyo clínico; se derivó a la psicóloga.";

export const sanitizeIncomingWhatsAppContent = (text: string) =>
  containsSensitiveClinicalContent(text) ? clinicalSummary : text;

const sendResponse = async (input: {
  conversationId: string;
  to: string;
  text: string;
  intent: SupportedIntent;
  gateway: WhatsAppGateway;
}) => {
  const sent = await input.gateway.sendText({ to: input.to, text: input.text });
  await saveOutboundMessage({
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
  gateway: WhatsAppGateway;
}) => {
  const patient = await findPatientWithAssignedTherapist(input.whatsappPhone);
  const slots =
    patient?.assignedTherapistId && patient.assignedTherapist?.isActive
      ? await findNextAvailableSlots(
          patient.assignedTherapistId,
          "individual",
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
    classifiedIntent === "unknown" && conversation.currentIntent === "book"
      ? "book"
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
      gateway: context.gateway
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
      gateway: context.gateway
    });
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
      gateway: context.gateway
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
        gateway: context.gateway
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
          isManualException: false
        });
      await processingDependencies.updateConversation(conversation.id, {
        intent,
        patientId: patient.id,
        lastMessageAt: message.receivedAt
      });
      await processingDependencies.audit({
        actorChannel: "whatsapp",
        action: "appointment_created",
        entityType: "appointment",
        entityId: appointment.id,
        result: "success",
        metadata: { createdVia: "whatsapp" },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
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
          gateway: context.gateway
        });
        await sendAvailability({
          conversationId: conversation.id,
          to: message.from,
          whatsappPhone: message.from,
          intent,
          gateway: context.gateway
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
    gateway: context.gateway
  });
};
