CREATE TYPE "IncomingWhatsAppEventKind" AS ENUM ('message', 'payment_proof');
CREATE TYPE "IncomingWhatsAppEventStatus" AS ENUM ('pendiente', 'procesando', 'procesado', 'fallido');

CREATE TABLE "incoming_whatsapp_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "wa_message_id" VARCHAR(120) NOT NULL,
  "kind" "IncomingWhatsAppEventKind" NOT NULL,
  "whatsapp_phone" VARCHAR(30) NOT NULL,
  "payload" JSONB NOT NULL,
  "received_at" TIMESTAMPTZ NOT NULL,
  "status" "IncomingWhatsAppEventStatus" NOT NULL DEFAULT 'pendiente',
  "attempts_count" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "available_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processing_started_at" TIMESTAMPTZ,
  "processing_token" UUID,
  "processed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "incoming_whatsapp_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "incoming_whatsapp_events_wa_message_id_key" UNIQUE ("wa_message_id")
);

CREATE INDEX "incoming_whatsapp_events_status_available_at_idx"
  ON "incoming_whatsapp_events"("status", "available_at");
CREATE INDEX "incoming_whatsapp_events_status_processing_started_at_idx"
  ON "incoming_whatsapp_events"("status", "processing_started_at");
