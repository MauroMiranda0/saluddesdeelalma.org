alter table public.users enable row level security;
alter table public.therapist_profiles enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.session_rates enable row level security;
alter table public.payments enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.appointment_reminders enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.incoming_whatsapp_events enable row level security;
alter table public.outgoing_whatsapp_events enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "users_update_own_row" on public.users;
drop policy if exists "users_select_own_row" on public.users;

drop policy if exists "patients_update_own_record" on public.patients;
drop policy if exists "patients_select_own_record" on public.patients;

drop policy if exists "therapist_profiles_update_own_record"
on public.therapist_profiles;
drop policy if exists "therapist_profiles_select_own_record"
on public.therapist_profiles;

drop policy if exists "audit_logs_write_admin_only" on public.audit_logs;
drop policy if exists "audit_logs_read_admin_only" on public.audit_logs;
drop policy if exists "audit_logs_no_update" on public.audit_logs;
drop policy if exists "audit_logs_no_delete" on public.audit_logs;

create policy "users_select_own_row"
on public.users
for select
using (auth_user_id = auth.uid());

create policy "patients_select_own_record"
on public.patients
for select
using (
  exists (
    select 1
    from public.users
    where users.id = patients.user_id
      and users.auth_user_id = auth.uid()
  )
);

create policy "therapist_profiles_select_own_record"
on public.therapist_profiles
for select
using (
  exists (
    select 1
    from public.users
    where users.id = therapist_profiles.user_id
      and users.auth_user_id = auth.uid()
  )
);


create policy "audit_logs_write_admin_only"
on public.audit_logs
for insert
with check (auth.jwt() ->> 'role' = 'service_role');

create policy "audit_logs_read_admin_only"
on public.audit_logs
for select
using (
  auth.jwt() ->> 'role' = 'service_role'
  or exists (
    select 1
    from public.users
    where users.auth_user_id = auth.uid()
      and users.role = 'admin'
      and users.is_active
      and users.panel_login_enabled
  )
);

create policy "audit_logs_no_update"
on public.audit_logs
for update
using (false);

create policy "audit_logs_no_delete"
on public.audit_logs
for delete
using (false);
