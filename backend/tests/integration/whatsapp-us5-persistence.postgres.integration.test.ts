import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../src/lib/prisma.js";
import { createAuditLog } from "../../src/modules/audit/audit.repository.js";
import {
  saveIncomingMessage,
  updateConversation
} from "../../src/modules/chatbot/chat-messages.repository.js";
import { identityVerificationSummary } from "../../src/modules/chatbot/message-sanitizer.js";

/**
 * FR-025 and FR-026 persistence for US5, proven against a real PostgreSQL
 * instance.
 *
 * The previous US5 persistence checks inserted the `chat_messages` and
 * `audit_logs` rows with raw SQL and read them straight back, so they asserted
 * their own fixtures and would still have passed if `saveIncomingMessage`,
 * `updateConversation` and `createAuditLog` had written nothing at all. These
 * tests drive the real repositories so the stored `content_mode` is the value
 * the production code actually derives.
 */
const enabled = process.env.RUN_POSTGRES_INTEGRATION === "true";

const PHONE = "5215550000999";
const ENTITY_ID = "00000000-0000-0000-0000-0000000000f1";

test(
  "the minimised identity confirmation is stored as an administrative summary",
  { skip: !enabled },
  async (t) => {
    t.after(async () => {
      await prisma.chatMessage.deleteMany({
        where: { waMessageId: "wamid.pg.identity" }
      });
      await prisma.chatConversation.deleteMany({
        where: { whatsappPhone: PHONE }
      });
      await prisma.auditLog.deleteMany({ where: { entityId: ENTITY_ID } });
      await prisma.$disconnect();
    });

    const identityAnswer = "Nombre: Ana Pérez; nacimiento: 1990-01-15";
    const conversation = await saveIncomingMessage({
      whatsappPhone: PHONE,
      waMessageId: "wamid.pg.identity",
      contentText: identityVerificationSummary,
      receivedAt: new Date("2026-09-10T12:00:00.000Z"),
      intent: "unknown",
      // The identity answer carries no clinical content, so only
      // `contentWasMinimized` can keep the row out of `full_text`.
      containsSensitiveClinicalContent: false,
      contentWasMinimized: true
    });

    assert.ok(conversation, "the incoming message must be persisted");

    const stored = await prisma.chatMessage.findUniqueOrThrow({
      where: { waMessageId: "wamid.pg.identity" }
    });

    assert.equal(stored.contentMode, "admin_summary");
    assert.equal(stored.contentText, identityVerificationSummary);
    assert.equal(stored.containsSensitiveClinicalContent, false);
    assert.doesNotMatch(stored.contentText, /Ana Pérez|1990-01-15/);
    assert.notEqual(stored.contentText, identityAnswer);
  }
);

test(
  "clinical content is stored minimised and a verified conversation is stamped",
  { skip: !enabled },
  async (t) => {
    t.after(async () => {
      await prisma.chatMessage.deleteMany({
        where: { waMessageId: "wamid.pg.clinical" }
      });
      await prisma.chatConversation.deleteMany({
        where: { whatsappPhone: PHONE }
      });
      await prisma.auditLog.deleteMany({ where: { entityId: ENTITY_ID } });
      await prisma.$disconnect();
    });

    const conversation = await saveIncomingMessage({
      whatsappPhone: PHONE,
      waMessageId: "wamid.pg.clinical",
      contentText:
        "El paciente solicitó apoyo clínico; se derivó a la psicóloga.",
      receivedAt: new Date("2026-09-10T12:00:00.000Z"),
      intent: "handoff",
      containsSensitiveClinicalContent: true,
      contentWasMinimized: true
    });
    assert.ok(conversation);

    const lastVerifiedAt = new Date("2026-09-10T12:05:00.000Z");
    await updateConversation(conversation.id, {
      intent: "payment_status",
      patientId: null,
      lastMessageAt: new Date("2026-09-10T12:05:00.000Z"),
      verificationStatus: "verified",
      lastVerifiedAt
    });

    const clinical = await prisma.chatMessage.findUniqueOrThrow({
      where: { waMessageId: "wamid.pg.clinical" }
    });
    assert.equal(clinical.contentMode, "admin_summary");
    assert.equal(clinical.containsSensitiveClinicalContent, true);
    assert.doesNotMatch(clinical.contentText, /ansiedad|daño/i);

    const stored = await prisma.chatConversation.findUniqueOrThrow({
      where: { id: conversation.id }
    });
    assert.equal(stored.currentIntent, "payment_status");
    assert.equal(stored.verificationStatus, "verified");
    assert.equal(stored.lastVerifiedAt?.getTime(), lastVerifiedAt.getTime());
  }
);

test(
  "the identity verification audit persists only presence flags",
  { skip: !enabled },
  async (t) => {
    t.after(async () => {
      await prisma.auditLog.deleteMany({ where: { entityId: ENTITY_ID } });
      await prisma.$disconnect();
    });

    const metadata = {
      hasFullName: true,
      hasBirthdate: true,
      patientId: ENTITY_ID
    };
    const created = await createAuditLog({
      actorChannel: "whatsapp",
      action: "identity_verification_succeeded",
      entityType: "chat_conversation",
      entityId: ENTITY_ID,
      result: "success",
      metadata,
      ipAddress: "203.0.113.10",
      userAgent: "WhatsApp/2.0"
    });

    const stored = await prisma.auditLog.findUniqueOrThrow({
      where: { id: created.id }
    });

    assert.equal(stored.action, "identity_verification_succeeded");
    assert.equal(stored.result, "success");
    assert.equal(stored.ipAddress, "203.0.113.10");
    assert.deepEqual(stored.metadata, metadata);
    assert.doesNotMatch(
      JSON.stringify(stored.metadata),
      /1990-01-15|Ana Pérez/
    );
  }
);
