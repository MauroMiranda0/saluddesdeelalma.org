import {
  Prisma,
  type ConversationIntent,
  type VerificationStatus
} from "@prisma/client";

import { prisma } from "../../lib/prisma";

/**
 * `identity_check` is reserved in the Prisma enum but never persisted as a
 * conversation intent: the verification answer is resumed as the pending
 * `payment_status` request instead.
 */
export type StoredIntent = Exclude<ConversationIntent, "identity_check">;

type IncomingMessage = {
  whatsappPhone: string;
  waMessageId: string;
  contentText: string;
  receivedAt: Date;
  intent: StoredIntent;
  containsSensitiveClinicalContent: boolean;
  /**
   * True when `contentText` is an administrative summary instead of the text the
   * patient actually sent. Distinct from the clinical flag because FR-025 also
   * minimises the identity confirmation, which carries no clinical content.
   */
  contentWasMinimized?: boolean;
  metadata?: Prisma.InputJsonValue;
};

export const hasChatMessage = async (waMessageId: string) =>
  Boolean(await prisma.chatMessage.findUnique({ where: { waMessageId } }));

export const findConversationByIncomingMessage = (waMessageId: string) =>
  prisma.chatMessage
    .findUnique({
      where: { waMessageId },
      include: { conversation: true }
    })
    .then((message) => message?.conversation ?? null);

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
        contentMode:
          (input.contentWasMinimized ?? input.containsSensitiveClinicalContent)
            ? "admin_summary"
            : "full_text",
        contentText: input.contentText,
        containsSensitiveClinicalContent:
          input.containsSensitiveClinicalContent,
        intent: input.intent,
        metadata: input.metadata ?? {}
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
    intent: ConversationIntent;
    patientId?: string;
    state?: "abierta" | "derivada";
    lastMessageAt: Date;
    verificationStatus?: VerificationStatus;
    lastVerifiedAt?: Date | null;
  }
) =>
  prisma.chatConversation.update({
    where: { id: conversationId },
    data: {
      currentIntent: input.intent,
      patientId: input.patientId,
      state: input.state,
      lastMessageAt: input.lastMessageAt,
      verificationStatus: input.verificationStatus,
      lastVerifiedAt: input.lastVerifiedAt
    }
  });

export const saveOutboundMessage = (input: {
  conversationId: string;
  waMessageId: string;
  contentText: string;
  intent: StoredIntent;
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
