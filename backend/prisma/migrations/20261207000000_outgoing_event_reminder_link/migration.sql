ALTER TABLE "outgoing_whatsapp_events"
  ADD COLUMN "reminder_id" UUID;

ALTER TABLE "outgoing_whatsapp_events"
  ADD CONSTRAINT "outgoing_whatsapp_events_reminder_id_fkey"
    FOREIGN KEY ("reminder_id") REFERENCES "appointment_reminders"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "outgoing_whatsapp_events_reminder_id_idx"
  ON "outgoing_whatsapp_events"("reminder_id");
