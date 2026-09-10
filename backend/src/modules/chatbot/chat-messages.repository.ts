import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";

type IncomingMessage = {
  whatsappPhone: string;
  waMessageId: string;
  contentText: string;
  receivedAt: Date;
  intent: "availability" | "book" | "handoff" | "unknown";
  containsSensitiveClinicalContent: boolean;
};

export const hasChatMessage = async (waMessageId: string) =>
  Boolean(await prisma.chatMessage.findUnique({ where: { waMessageId } }));

export const getOrCreateConversation = async (
  whatsappPhone: string,
  lastMessageAt: Date
) => {
  const existing = await prisma.chatConversation.findFirst({
    where: { whatsappPhone, state: "abierta" },
    orderBy: { updatedAt: "desc" }
  });

  if (existing) {
    return existing;
  }

  return prisma.chatConversation.create({
    data: { whatsappPhone, lastMessageAt }
  });
};

export const saveIncomingMessage = async (input: IncomingMessage) => {
  const conversation = await getOrCreateConversation(
    input.whatsappPhone,
    input.receivedAt
  );

  try {
    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        waMessageId: input.waMessageId,
        direction: "inbound",
        senderKind: "patient",
        contentMode: input.containsSensitiveClinicalContent
          ? "admin_summary"
          : "full_text",
        contentText: input.contentText,
        containsSensitiveClinicalContent:
          input.containsSensitiveClinicalContent,
        intent: input.intent,
        metadata: {}
      }
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return null;
    }

    throw error;
  }

  return conversation;
};

export const updateConversation = (
  conversationId: string,
  input: {
    intent: "availability" | "book" | "handoff" | "unknown";
    patientId?: string;
    state?: "abierta" | "derivada";
    lastMessageAt: Date;
  }
) =>
  prisma.chatConversation.update({
    where: { id: conversationId },
    data: {
      currentIntent: input.intent,
      patientId: input.patientId,
      state: input.state,
      lastMessageAt: input.lastMessageAt
    }
  });

export const saveOutboundMessage = (input: {
  conversationId: string;
  waMessageId: string;
  contentText: string;
  intent: "availability" | "book" | "handoff" | "unknown";
}) =>
  prisma.chatMessage.create({
    data: {
      conversationId: input.conversationId,
      waMessageId: input.waMessageId,
      direction: "outbound",
      senderKind: "assistant",
      contentMode: "full_text",
      contentText: input.contentText,
      intent: input.intent,
      metadata: {}
    }
  });
