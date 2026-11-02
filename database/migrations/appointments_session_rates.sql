create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  therapist_id uuid not null references public.therapist_profiles(id) on delete restrict,
  scheduled_at timestamptz not null,
  ends_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  modality public.modality not null,
  status public.appointment_status not null default 'programada',
  is_manual_exception boolean not null default false,
  location_label varchar(255),
  meeting_link text,
  cancel_reason text,
  cancelled_at timestamptz,
  cancellation_notice public.cancellation_notice,
  created_by_user_id uuid references public.users(id) on delete set null,
  created_via public.appointment_created_via not null,
  therapy_type public.therapy_type not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_valid_window check (scheduled_at < ends_at)
);

create index if not exists idx_appointments_patient on public.appointments(patient_id);
create index if not exists idx_appointments_therapist_time on public.appointments(therapist_id, scheduled_at);
create index if not exists idx_appointments_status on public.appointments(status);

create trigger appointments_set_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    therapist_id with =,
    tstzrange(scheduled_at, ends_at, '[)') with &&
  )
  where (status in ('programada', 'confirmada'));

create table if not exists public.session_rates (
  id uuid primary key default gen_random_uuid(),
  therapy_type public.therapy_type not null unique,
  amount numeric(12,2) not null check (amount >= 0),
  currency varchar(3) not null default 'MXN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger session_rates_set_updated_at
before update on public.session_rates
for each row execute function public.set_updated_at();
