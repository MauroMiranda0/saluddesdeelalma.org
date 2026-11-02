create table if not exists public.therapist_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  phone varchar(30) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint therapist_phone_not_blank check (length(trim(phone)) > 0)
);

create trigger therapist_profiles_set_updated_at
before update on public.therapist_profiles
for each row execute function public.set_updated_at();

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  full_name varchar(150) not null,
  whatsapp_phone varchar(30) not null unique,
  birthdate date not null,
  preferred_modality public.modality,
  email varchar(255),
  status public.patient_status not null default 'activo',
  assigned_therapist_id uuid references public.therapist_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patients_whatsapp_not_blank check (length(trim(whatsapp_phone)) > 0)
);

create index if not exists idx_patients_assigned_therapist
  on public.patients(assigned_therapist_id);

create trigger patients_set_updated_at
before update on public.patients
for each row execute function public.set_updated_at();

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  jwt_id uuid not null unique,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  constraint admin_sessions_valid_window check (expires_at > started_at)
);

create index if not exists idx_admin_sessions_user on public.admin_sessions(user_id);
create index if not exists idx_admin_sessions_expires on public.admin_sessions(expires_at);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  actor_channel public.actor_channel not null,
  action varchar(80) not null,
  entity_type varchar(80) not null,
  entity_id uuid,
  result public.audit_result not null,
  metadata jsonb not null default '{}',
  ip_address inet,
  user_agent text,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_actor on public.audit_logs(actor_user_id);
create index if not exists idx_audit_logs_occurred on public.audit_logs(occurred_at);
