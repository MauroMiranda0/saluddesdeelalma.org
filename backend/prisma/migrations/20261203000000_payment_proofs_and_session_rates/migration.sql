CREATE TYPE "PaymentProofStatus" AS ENUM ('pendiente_asociacion', 'asociado');

CREATE TABLE "session_rates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "therapy_type" "TherapyType" NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "session_rates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "session_rates_therapy_type_key" UNIQUE ("therapy_type"),
  CONSTRAINT "session_rates_amount_positive_check" CHECK ("amount" > 0)
);

CREATE TABLE "payment_proofs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "whatsapp_message_id" VARCHAR(120) NOT NULL,
  "media_id" VARCHAR(255) NOT NULL,
  "media_type" VARCHAR(20) NOT NULL,
  "received_at" TIMESTAMPTZ NOT NULL,
  "status" "PaymentProofStatus" NOT NULL DEFAULT 'pendiente_asociacion',
  "appointment_id" UUID,
  "payment_id" UUID,
  "associated_by_user_id" UUID,
  "associated_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_proofs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_proofs_whatsapp_message_id_key" UNIQUE ("whatsapp_message_id"),
  CONSTRAINT "payment_proofs_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payment_proofs_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payment_proofs_associated_by_user_id_fkey" FOREIGN KEY ("associated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "payment_proofs_association_consistency_check" CHECK (
    ("status" = 'pendiente_asociacion' AND "appointment_id" IS NULL AND "payment_id" IS NULL AND "associated_by_user_id" IS NULL AND "associated_at" IS NULL)
    OR
    ("status" = 'asociado' AND "appointment_id" IS NOT NULL AND "associated_by_user_id" IS NOT NULL AND "associated_at" IS NOT NULL)
  )
);

CREATE INDEX "payment_proofs_status_received_at_idx" ON "payment_proofs"("status", "received_at");
CREATE INDEX "payment_proofs_appointment_id_idx" ON "payment_proofs"("appointment_id");
CREATE INDEX "payment_proofs_payment_id_idx" ON "payment_proofs"("payment_id");
