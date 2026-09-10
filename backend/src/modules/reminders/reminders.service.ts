import type { Appointment, Patient } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { WhatsAppGateway } from "../../integrations/whatsapp/whatsapp.gateway";
import { appointmentConfirmation } from "../chatbot/response-templates";
import { saveOutboundMessage } from "../chatbot/chat-messages.repository";

export const sendAppointmentConfirmation = async (input: {
  appointment: Appointment;
  patient: Patient;
  conversationId: string;
  gateway: WhatsAppGateway;
}) => {
  const reminder = await prisma.appointmentReminder.upsert({
    where: {
      appointmentId_reminderType_recipient: {
        appointmentId: input.appointment.id,
        reminderType: "confirmacion",
        recipient: "paciente"
      }
    },
    update: {},
    create: {
      appointmentId: input.appointment.id,
      reminderType: "confirmacion",
      recipient: "paciente",
      scheduledAt: new Date()
    }
  });
  const text = appointmentConfirmation(input.appointment, input.patient);

  try {
    const sent = await input.gateway.sendText({
      to: input.patient.whatsappPhone,
      text
    });

    await Promise.all([
      prisma.appointmentReminder.update({
        where: { id: reminder.id },
        data: {
          status: "enviado",
          sentAt: new Date(),
          providerMessageId: sent.messageId
        }
      }),
      saveOutboundMessage({
        conversationId: input.conversationId,
        waMessageId: sent.messageId,
        contentText: text,
        intent: "book"
      })
    ]);
  } catch (error) {
    await prisma.appointmentReminder.update({
      where: { id: reminder.id },
      data: {
        status: "fallido",
        attemptsCount: { increment: 1 },
        lastError: error instanceof Error ? error.message : "Unknown send error"
      }
    });
    throw error;
  }
};
