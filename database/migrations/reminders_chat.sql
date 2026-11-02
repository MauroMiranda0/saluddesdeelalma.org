create table if not exists public.appointment_reminders (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  reminder_type public.reminder_type not null,
  recipient public.reminder_recipient not null,
  scheduled_at timestamptz not null,
  status public.reminder_status not null default 'pendiente',
  attempts_count integer not null default 0 check (attempts_count >= 0),
  last_error text,
  sent_at timestamptz,
  provider_message_id varchar(120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(appointment_id, reminder_type, recipient)
);

create index if not exists idx_appointment_reminders_sched
  on public.appointment_reminders(scheduled_at, status);

create trigger appointment_reminders_set_updated_at
before update on public.appointment_reminders
for each row execute function public.set_updated_at();

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete set null,
  whatsapp_phone varchar(30) not null,
  current_intent public.conversation_intent not null default 'unknown',
  verification_status public.verification_status not null default 'not_needed',
  last_verified_at timestamptz,
  state public.conversation_state not null default 'abierta',
  last_message_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chat_conversations_phone
  on public.chat_conversations(whatsapp_phone);

create index if not exists idx_chat_conversations_patient
  on public.chat_conversations(patient_id);

create trigger chat_conversations_set_updated_at
before update on public.chat_conversations
for each row execute function public.set_updated_at();

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  wa_message_id varchar(120) not null unique,
  direction public.message_direction not null,
  sender_kind public.sender_kind not null,
  content_mode public.content_mode not null,
  content_text text not null,
  contains_sensitive_clinical_content boolean not null default false,
  intent varchar(60),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_conversation
  on public.chat_messages(conversation_id);
