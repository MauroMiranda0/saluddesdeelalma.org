create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  payment_type public.payment_type not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency varchar(3) not null default 'MXN',
  method public.payment_method not null,
  status public.payment_validation_status not null default 'pendiente_validacion',
  proof_reference varchar(255),
  recorded_by_user_id uuid not null references public.users(id) on delete restrict,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_appointment on public.payments(appointment_id);
create index if not exists idx_payments_patient on public.payments(patient_id);

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  whatsapp_message_id varchar(120) not null unique,
  storage_path text not null,
  file_name varchar(255) not null,
  mime_type varchar(80) not null,
  received_at timestamptz not null,
  status public.payment_proof_status not null default 'pendiente_asociacion',
  appointment_id uuid references public.appointments(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  associated_by_user_id uuid references public.users(id) on delete set null,
  associated_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_proofs_status_received
  on public.payment_proofs(status, received_at);

create index if not exists idx_payment_proofs_appointment
  on public.payment_proofs(appointment_id);

create index if not exists idx_payment_proofs_payment
  on public.payment_proofs(payment_id);
