CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "AdminRole" AS ENUM ('admin');
CREATE TYPE "Modality" AS ENUM ('online', 'presencial');
CREATE TYPE "PatientStatus" AS ENUM ('activo', 'inactivo');
CREATE TYPE "AppointmentStatus" AS ENUM ('programada', 'confirmada', 'completada', 'cancelada');
CREATE TYPE "AppointmentCreatedVia" AS ENUM ('whatsapp', 'panel', 'system');
CREATE TYPE "PaymentType" AS ENUM ('anticipo', 'completo');
CREATE TYPE "PaymentMethod" AS ENUM ('transferencia', 'efectivo');
CREATE TYPE "PaymentValidationStatus" AS ENUM ('pendiente_validacion', 'validado', 'rechazado');
CREATE TYPE "ReminderType" AS ENUM ('confirmacion', 'recordatorio_24h', 'cancelacion', 'pago_pendiente');
CREATE TYPE "ReminderStatus" AS ENUM ('pendiente', 'procesando', 'enviado', 'fallido', 'omitido');
CREATE TYPE "ConversationIntent" AS ENUM ('faq', 'availability', 'book', 'cancel', 'payment_info', 'payment_status', 'identity_check', 'handoff', 'unknown');
CREATE TYPE "VerificationStatus" AS ENUM ('not_needed', 'pending', 'verified', 'failed');
CREATE TYPE "ConversationState" AS ENUM ('abierta', 'cerrada', 'derivada');
CREATE TYPE "MessageDirection" AS ENUM ('inbound', 'outbound');
CREATE TYPE "SenderKind" AS ENUM ('patient', 'assistant', 'admin', 'system');
CREATE TYPE "ContentMode" AS ENUM ('full_text', 'admin_summary');
CREATE TYPE "ActorChannel" AS ENUM ('admin_panel', 'whatsapp', 'system');
CREATE TYPE "AuditResult" AS ENUM ('success', 'failure');

CREATE TABLE "admin_users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" VARCHAR(255) NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "full_name" VARCHAR(120) NOT NULL,
  "role" "AdminRole" NOT NULL DEFAULT 'admin',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_login_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "jwt_id" UUID NOT NULL,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_activity_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "revoked_at" TIMESTAMPTZ,
  "ip_address" INET,
  "user_agent" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "patients" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "full_name" VARCHAR(150) NOT NULL,
  "whatsapp_phone" VARCHAR(30) NOT NULL,
  "birthdate" DATE NOT NULL,
  "preferred_modality" "Modality",
  "email" VARCHAR(255),
  "notes" TEXT,
  "status" "PatientStatus" NOT NULL DEFAULT 'activo',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "appointments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "patient_id" UUID NOT NULL,
  "scheduled_at" TIMESTAMPTZ NOT NULL,
  "modality" "Modality" NOT NULL,
  "status" "AppointmentStatus" NOT NULL DEFAULT 'programada',
  "is_manual_exception" BOOLEAN NOT NULL DEFAULT false,
  "location_label" VARCHAR(255),
  "meeting_link" TEXT,
  "cancel_reason" TEXT,
  "created_by_user_id" UUID,
  "created_via" "AppointmentCreatedVia" NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "appointment_id" UUID NOT NULL,
  "patient_id" UUID NOT NULL,
  "payment_type" "PaymentType" NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "status" "PaymentValidationStatus" NOT NULL DEFAULT 'pendiente_validacion',
  "proof_reference" TEXT,
  "recorded_by_user_id" UUID NOT NULL,
  "paid_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "appointment_reminders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "appointment_id" UUID NOT NULL,
  "reminder_type" "ReminderType" NOT NULL,
  "scheduled_at" TIMESTAMPTZ NOT NULL,
  "status" "ReminderStatus" NOT NULL DEFAULT 'pendiente',
  "attempts_count" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "sent_at" TIMESTAMPTZ,
  "provider_message_id" VARCHAR(120),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "appointment_reminders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_conversations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "patient_id" UUID,
  "whatsapp_phone" VARCHAR(30) NOT NULL,
  "current_intent" "ConversationIntent" NOT NULL DEFAULT 'unknown',
  "verification_status" "VerificationStatus" NOT NULL DEFAULT 'not_needed',
  "last_verified_at" TIMESTAMPTZ,
  "state" "ConversationState" NOT NULL DEFAULT 'abierta',
  "last_message_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "conversation_id" UUID NOT NULL,
  "wa_message_id" VARCHAR(120) NOT NULL,
  "direction" "MessageDirection" NOT NULL,
  "sender_kind" "SenderKind" NOT NULL,
  "content_mode" "ContentMode" NOT NULL,
  "content_text" TEXT NOT NULL,
  "contains_sensitive_clinical_content" BOOLEAN NOT NULL DEFAULT false,
  "intent" VARCHAR(60),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actor_user_id" UUID,
  "actor_channel" "ActorChannel" NOT NULL,
  "action" VARCHAR(80) NOT NULL,
  "entity_type" VARCHAR(80) NOT NULL,
  "entity_id" UUID,
  "result" "AuditResult" NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "ip_address" INET,
  "user_agent" TEXT,
  "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");
CREATE UNIQUE INDEX "admin_sessions_jwt_id_key" ON "admin_sessions"("jwt_id");
CREATE UNIQUE INDEX "patients_whatsapp_phone_key" ON "patients"("whatsapp_phone");
CREATE UNIQUE INDEX "chat_messages_wa_message_id_key" ON "chat_messages"("wa_message_id");
CREATE UNIQUE INDEX "appointment_reminders_appointment_id_reminder_type_key" ON "appointment_reminders"("appointment_id", "reminder_type");

-- Indices parciales manuales: Prisma no puede representarlos en schema.prisma.
CREATE UNIQUE INDEX "appointments_active_scheduled_at_key" ON "appointments"("scheduled_at") WHERE "status" IN ('programada', 'confirmada');
CREATE UNIQUE INDEX "payments_validated_advance_key" ON "payments"("appointment_id") WHERE "payment_type" = 'anticipo' AND "status" = 'validado';
CREATE UNIQUE INDEX "payments_validated_full_key" ON "payments"("appointment_id") WHERE "payment_type" = 'completo' AND "status" = 'validado';

CREATE INDEX "admin_sessions_user_id_idx" ON "admin_sessions"("user_id");
CREATE INDEX "admin_sessions_expires_at_idx" ON "admin_sessions"("expires_at");
CREATE INDEX "appointments_patient_id_idx" ON "appointments"("patient_id");
CREATE INDEX "appointments_scheduled_at_idx" ON "appointments"("scheduled_at");
CREATE INDEX "payments_appointment_id_idx" ON "payments"("appointment_id");
CREATE INDEX "payments_patient_id_idx" ON "payments"("patient_id");
CREATE INDEX "appointment_reminders_scheduled_at_status_idx" ON "appointment_reminders"("scheduled_at", "status");
CREATE INDEX "chat_conversations_whatsapp_phone_idx" ON "chat_conversations"("whatsapp_phone");
CREATE INDEX "chat_conversations_patient_id_idx" ON "chat_conversations"("patient_id");
CREATE INDEX "chat_messages_conversation_id_idx" ON "chat_messages"("conversation_id");
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");
CREATE INDEX "audit_logs_occurred_at_idx" ON "audit_logs"("occurred_at");

ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointment_reminders" ADD CONSTRAINT "appointment_reminders_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
