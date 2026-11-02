create type public.user_role as enum ('admin', 'psicologo', 'paciente');

create type public.modality as enum ('online', 'presencial');
create type public.therapy_type as enum ('individual', 'pareja', 'familiar');
create type public.patient_status as enum ('activo', 'inactivo');

create type public.appointment_status as enum (
  'programada',
  'confirmada',
  'completada',
  'cancelada'
);

create type public.appointment_created_via as enum ('whatsapp', 'panel', 'system');
create type public.cancellation_notice as enum ('a_tiempo', 'tardia');

create type public.payment_type as enum ('anticipo', 'completo');
create type public.payment_method as enum ('transferencia', 'efectivo');
create type public.payment_validation_status as enum (
  'pendiente_validacion',
  'validado',
  'rechazado'
);

create type public.payment_proof_status as enum (
  'pendiente_asociacion',
  'asociado'
);

create type public.reminder_type as enum (
  'confirmacion',
  'recordatorio_24h',
  'cancelacion',
  'pago_pendiente',
  'pago_pendiente_post_cita'
);

create type public.reminder_status as enum (
  'pendiente',
  'procesando',
  'enviado',
  'fallido',
  'omitido'
);

create type public.reminder_recipient as enum ('paciente', 'grupo_psicologas');

create type public.conversation_intent as enum (
  'faq',
  'availability',
  'book',
  'cancel',
  'payment_info',
  'payment_status',
  'identity_check',
  'handoff',
  'unknown'
);

create type public.verification_status as enum (
  'not_needed',
  'pending',
  'verified',
  'failed'
);

create type public.conversation_state as enum ('abierta', 'cerrada', 'derivada');

create type public.message_direction as enum ('inbound', 'outbound');
create type public.sender_kind as enum ('patient', 'assistant', 'admin', 'system');
create type public.content_mode as enum ('full_text', 'admin_summary');

create type public.incoming_whatsapp_event_kind as enum ('message', 'payment_proof');
create type public.incoming_whatsapp_event_status as enum (
  'pendiente',
  'procesando',
  'procesado',
  'fallido'
);

create type public.outgoing_whatsapp_event_status as enum (
  'pendiente',
  'procesando',
  'enviado',
  'fallido'
);

create type public.actor_channel as enum ('admin_panel', 'whatsapp', 'system');
create type public.audit_result as enum ('success', 'failure');
