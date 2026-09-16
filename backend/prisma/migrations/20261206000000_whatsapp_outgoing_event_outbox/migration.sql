CREATE TYPE "OutgoingWhatsAppEventStatus" AS ENUM ('pendiente', 'procesando', 'enviado', 'fallido');

CREATE TABLE "outgoing_whatsapp_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "incoming_event_id" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  "conversation_id" UUID,
  "whatsapp_phone" VARCHAR(30) NOT NULL,
  "content_text" TEXT NOT NULL,
  "intent" VARCHAR(60),
  "status" "OutgoingWhatsAppEventStatus" NOT NULL DEFAULT 'pendiente',
  "attempts_count" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "available_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processing_started_at" TIMESTAMPTZ,
  "processing_token" UUID,
  "provider_message_id" VARCHAR(120),
  "sent_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "outgoing_whatsapp_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "outgoing_whatsapp_events_incoming_event_id_fkey"
    FOREIGN KEY ("incoming_event_id") REFERENCES "incoming_whatsapp_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "outgoing_whatsapp_events_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "outgoing_whatsapp_events_incoming_event_id_sequence_key"
    UNIQUE ("incoming_event_id", "sequence")
);

CREATE INDEX "outgoing_whatsapp_events_status_available_at_idx"
  ON "outgoing_whatsapp_events"("status", "available_at");
CREATE INDEX "outgoing_whatsapp_events_status_processing_started_at_idx"
  ON "outgoing_whatsapp_events"("status", "processing_started_at");
