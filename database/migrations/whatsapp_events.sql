create table if not exists public.incoming_whatsapp_events (
  id uuid primary key default gen_random_uuid(),
  wa_message_id varchar(120) not null unique,
  kind public.incoming_whatsapp_event_kind not null,
  whatsapp_phone varchar(30) not null,
  payload jsonb not null,
  received_at timestamptz not null,
  status public.incoming_whatsapp_event_status not null default 'pendiente',
  attempts_count integer not null default 0,
  last_error text,
  available_at timestamptz not null default now(),
  processing_started_at timestamptz,
  processing_token uuid,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_incoming_whatsapp_status_available
  on public.incoming_whatsapp_events(status, available_at);

create index if not exists idx_incoming_whatsapp_status_processing
  on public.incoming_whatsapp_events(status, processing_started_at);

create trigger incoming_whatsapp_events_set_updated_at
before update on public.incoming_whatsapp_events
for each row execute function public.set_updated_at();

create table if not exists public.outgoing_whatsapp_events (
  id uuid primary key default gen_random_uuid(),
  incoming_event_id uuid references public.incoming_whatsapp_events(id) on delete set null,
  sequence integer not null,
  conversation_id uuid references public.chat_conversations(id) on delete set null,
  whatsapp_phone varchar(30) not null,
  content_text text not null,
  intent varchar(60),
  status public.outgoing_whatsapp_event_status not null default 'pendiente',
  attempts_count integer not null default 0,
  last_error text,
  available_at timestamptz not null default now(),
  processing_started_at timestamptz,
  processing_token uuid,
  provider_message_id varchar(120),
  sent_at timestamptz,
  reminder_id uuid references public.appointment_reminders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(incoming_event_id, sequence)
);

create index if not exists idx_outgoing_whatsapp_status_available
  on public.outgoing_whatsapp_events(status, available_at);

create index if not exists idx_outgoing_whatsapp_status_processing
  on public.outgoing_whatsapp_events(status, processing_started_at);

create index if not exists idx_outgoing_whatsapp_reminder
  on public.outgoing_whatsapp_events(reminder_id);

create trigger outgoing_whatsapp_events_set_updated_at
before update on public.outgoing_whatsapp_events
for each row execute function public.set_updated_at();
