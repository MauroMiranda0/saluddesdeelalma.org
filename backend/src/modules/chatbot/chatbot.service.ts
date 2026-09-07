import type { WhatsAppGateway } from "../../integrations/whatsapp/whatsapp.gateway";
import { audit } from "../audit/audit.service";
import {
  AppointmentConflictError,
  AppointmentScheduleError,
  createWhatsAppAppointment,
  findNextAvailableSlots
} from "../appointments/appointments.service";
import { sendAppointmentConfirmation } from "../reminders/reminders.service";
import {
  saveIncomingMessage,
  saveOutboundMessage,
  updateConversation
} from "./chat-messages.repository";
import { classifyIntent, type SupportedIntent } from "./chatbot.intents";
import { getCompleteBookingDetails } from "./chatbot.booking.handler";
import {
  bookingConflictResponse,
  bookingDetailsPrompt,
  clinicalHandoffResponse,
  genericGreetingResponse
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

const clinicalSummary =
  "El paciente solicitó apoyo clínico; se derivó a la psicóloga.";

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
  intent: "availability" | "book";
  gateway: WhatsAppGateway;
}) => {
  const slots = await findNextAvailableSlots();
  await sendResponse({
    ...input,
    text: bookingDetailsPrompt(slots)
  });
};

export const processIncomingWhatsAppMessage = async (
  message: IncomingWhatsAppMessage,
  context: ProcessingContext
) => {
  const classifiedIntent = classifyIntent(message.text);
  const conversation = await saveIncomingMessage({
    whatsappPhone: message.from,
    waMessageId: message.id,
    contentText:
      classifiedIntent === "handoff" ? clinicalSummary : message.text,
    receivedAt: message.receivedAt,
    intent: classifiedIntent,
    containsSensitiveClinicalContent: classifiedIntent === "handoff"
  });

  if (!conversation) {
    return;
  }

  const intent =
    classifiedIntent === "unknown" && conversation.currentIntent === "book"
      ? "book"
      : classifiedIntent;

  if (intent === "handoff") {
    await updateConversation(conversation.id, {
      intent,
      state: "derivada",
      lastMessageAt: message.receivedAt
    });
    await audit({
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
    await updateConversation(conversation.id, {
      intent,
      lastMessageAt: message.receivedAt
    });
    await sendAvailability({
      conversationId: conversation.id,
      to: message.from,
      intent,
      gateway: context.gateway
    });
    return;
  }

  if (intent === "book") {
    const details = getCompleteBookingDetails(message.text);

    if (!details) {
      await updateConversation(conversation.id, {
        intent,
        lastMessageAt: message.receivedAt
      });
      await sendAvailability({
        conversationId: conversation.id,
        to: message.from,
        intent,
        gateway: context.gateway
      });
      return;
    }

    try {
      const { appointment, patient } = await createWhatsAppAppointment({
        patient: {
          fullName: details.fullName,
          whatsappPhone: message.from,
          birthdate: details.birthdate,
          preferredModality: details.modality
        },
        scheduledAt: details.scheduledAt,
        modality: details.modality,
        createdVia: "whatsapp",
        isManualException: false
      });
      await updateConversation(conversation.id, {
        intent,
        patientId: patient.id,
        lastMessageAt: message.receivedAt
      });
      await audit({
        actorChannel: "whatsapp",
        action: "appointment_created",
        entityType: "appointment",
        entityId: appointment.id,
        result: "success",
        metadata: { createdVia: "whatsapp" },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      });
      await sendAppointmentConfirmation({
        appointment,
        patient,
        conversationId: conversation.id,
        gateway: context.gateway
      });
      return;
    } catch (error) {
      if (
        error instanceof AppointmentConflictError ||
        error instanceof AppointmentScheduleError
      ) {
        await audit({
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
          intent,
          gateway: context.gateway
        });
        return;
      }

      throw error;
    }
  }

  await updateConversation(conversation.id, {
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
