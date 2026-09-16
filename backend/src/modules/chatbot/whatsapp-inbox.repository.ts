import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { prisma } from "../../lib/prisma";

export type IncomingWhatsAppInboxEvent =
  | {
      waMessageId: string;
      kind: "message";
      whatsappPhone: string;
      receivedAt: Date;
      payload: { text: string; ipAddress?: string; userAgent?: string };
    }
  | {
      waMessageId: string;
      kind: "payment_proof";
      whatsappPhone: string;
      receivedAt: Date;
      payload: {
        mediaId: string;
        mediaType: "image" | "document";
        ipAddress?: string;
        userAgent?: string;
      };
    };

const processingLeaseMs = 15 * 60_000;

const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message.slice(0, 2_000)
    : "Unknown processing error";

export const enqueueIncomingWhatsAppEvents = async (
  events: IncomingWhatsAppInboxEvent[]
) => {
  if (events.length === 0) {
    return;
  }

  await prisma.incomingWhatsAppEvent.createMany({
    data: events.map((event) => ({
      waMessageId: event.waMessageId,
      kind: event.kind,
      whatsappPhone: event.whatsappPhone,
      receivedAt: event.receivedAt,
      payload: event.payload
    })),
    skipDuplicates: true
  });
};

export const claimDueIncomingWhatsAppEvents = async (input?: {
  now?: Date;
  limit?: number;
}) => {
  const now = input?.now ?? new Date();
  const staleBefore = new Date(now.getTime() - processingLeaseMs);
  const candidates = await prisma.incomingWhatsAppEvent.findMany({
    where: {
      OR: [
        {
          status: { in: ["pendiente", "fallido"] },
          availableAt: { lte: now }
        },
        {
          status: "procesando",
          processingStartedAt: { lte: staleBefore }
        }
      ]
    },
    orderBy: { availableAt: "asc" },
    take: input?.limit ?? 25
  });

  const claimed = [] as Array<{
    id: string;
    processingToken: string;
    waMessageId: string;
    kind: "message" | "payment_proof";
    whatsappPhone: string;
    receivedAt: Date;
    payload: Prisma.JsonValue;
    attemptsCount: number;
  }>;

  for (const event of candidates) {
    const processingToken = randomUUID();
    const updated = await prisma.incomingWhatsAppEvent.updateMany({
      where: {
        id: event.id,
        OR: [
          {
            status: { in: ["pendiente", "fallido"] },
            availableAt: { lte: now }
          },
          {
            status: "procesando",
            processingStartedAt: { lte: staleBefore }
          }
        ]
      },
      data: { status: "procesando", processingStartedAt: now, processingToken }
    });

    if (updated.count === 1) {
      claimed.push({ ...event, processingToken });
    }
  }

  return claimed;
};

export const markIncomingWhatsAppEventProcessed = (input: {
  id: string;
  processingToken: string;
}) =>
  prisma.incomingWhatsAppEvent.updateMany({
    where: {
      id: input.id,
      status: "procesando",
      processingToken: input.processingToken
    },
    data: {
      status: "procesado",
      processedAt: new Date(),
      processingStartedAt: null,
      processingToken: null,
      lastError: null
    }
  });

export const markIncomingWhatsAppEventFailed = (input: {
  id: string;
  processingToken: string;
  attemptsCount: number;
  error: unknown;
}) => {
  const delayMs = Math.min(5 * 60_000 * 2 ** input.attemptsCount, 60 * 60_000);

  return prisma.incomingWhatsAppEvent.updateMany({
    where: {
      id: input.id,
      status: "procesando",
      processingToken: input.processingToken
    },
    data: {
      status: "fallido",
      attemptsCount: { increment: 1 },
      lastError: errorMessage(input.error),
      availableAt: new Date(Date.now() + delayMs),
      processingStartedAt: null,
      processingToken: null
    }
  });
};

export type PendingWhatsAppOutboundMessage = {
  to: string;
  text: string;
  conversationId?: string;
  intent?: "availability" | "book" | "cancel" | "handoff" | "unknown";
};

export const enqueueOutgoingWhatsAppEvent = (input: {
  incomingEventId: string;
  sequence: number;
  message: PendingWhatsAppOutboundMessage;
}) =>
  prisma.outgoingWhatsAppEvent.upsert({
    where: {
      incomingEventId_sequence: {
        incomingEventId: input.incomingEventId,
        sequence: input.sequence
      }
    },
    update: {},
    create: {
      incomingEventId: input.incomingEventId,
      sequence: input.sequence,
      whatsappPhone: input.message.to,
      contentText: input.message.text,
      conversationId: input.message.conversationId,
      intent: input.message.intent
    }
  });

export const claimDueOutgoingWhatsAppEvents = async (input?: {
  now?: Date;
  limit?: number;
}) => {
  const now = input?.now ?? new Date();
  const staleBefore = new Date(now.getTime() - processingLeaseMs);
  const candidates = await prisma.outgoingWhatsAppEvent.findMany({
    where: {
      OR: [
        { status: { in: ["pendiente", "fallido"] }, availableAt: { lte: now } },
        { status: "procesando", processingStartedAt: { lte: staleBefore } }
      ]
    },
    orderBy: { availableAt: "asc" },
    take: input?.limit ?? 25
  });
  const claimed = [] as Array<
    (typeof candidates)[number] & { processingToken: string }
  >;

  for (const event of candidates) {
    const processingToken = randomUUID();
    const updated = await prisma.outgoingWhatsAppEvent.updateMany({
      where: {
        id: event.id,
        OR: [
          {
            status: { in: ["pendiente", "fallido"] },
            availableAt: { lte: now }
          },
          { status: "procesando", processingStartedAt: { lte: staleBefore } }
        ]
      },
      data: { status: "procesando", processingStartedAt: now, processingToken }
    });
    if (updated.count === 1) {
      claimed.push({ ...event, processingToken });
    }
  }

  return claimed;
};

export const markOutgoingWhatsAppEventSent = (input: {
  id: string;
  processingToken: string;
  providerMessageId: string;
}) =>
  prisma.outgoingWhatsAppEvent.updateMany({
    where: {
      id: input.id,
      status: "procesando",
      processingToken: input.processingToken
    },
    data: {
      status: "enviado",
      providerMessageId: input.providerMessageId,
      sentAt: new Date(),
      processingStartedAt: null,
      processingToken: null,
      lastError: null
    }
  });

export const markOutgoingWhatsAppEventFailed = (input: {
  id: string;
  processingToken: string;
  attemptsCount: number;
  error: unknown;
}) => {
  const delayMs = Math.min(5 * 60_000 * 2 ** input.attemptsCount, 60 * 60_000);
  return prisma.outgoingWhatsAppEvent.updateMany({
    where: {
      id: input.id,
      status: "procesando",
      processingToken: input.processingToken
    },
    data: {
      status: "fallido",
      attemptsCount: { increment: 1 },
      lastError: errorMessage(input.error),
      availableAt: new Date(Date.now() + delayMs),
      processingStartedAt: null,
      processingToken: null
    }
  });
};
