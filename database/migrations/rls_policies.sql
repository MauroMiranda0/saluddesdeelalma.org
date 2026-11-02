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

create policy "users_select_own_row"
on public.users
for select
using (id = auth.uid());

create policy "users_update_own_row"
on public.users
for update
using (id = auth.uid());

create policy "patients_select_own_record"
on public.patients
for select
using (user_id = auth.uid());

create policy "patients_update_own_record"
on public.patients
for update
using (user_id = auth.uid());

create policy "therapist_profiles_select_own_record"
on public.therapist_profiles
for select
using (user_id = auth.uid());

create policy "therapist_profiles_update_own_record"
on public.therapist_profiles
for update
using (user_id = auth.uid());

create policy "audit_logs_write_admin_only"
on public.audit_logs
for insert
with check (auth.jwt() ->> 'role' = 'service_role' or auth.jwt() ->> 'role' = 'admin');

create policy "audit_logs_read_admin_only"
on public.audit_logs
for select
using (auth.jwt() ->> 'role' = 'service_role' or auth.jwt() ->> 'role' = 'admin');

create policy "audit_logs_no_update"
on public.audit_logs
for update
using (false);

create policy "audit_logs_no_delete"
on public.audit_logs
for delete
using (false);
