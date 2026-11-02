create or replace function public.validate_payment_patient_consistency()
returns trigger
language plpgsql
as $$
declare
  v_appointment_patient_id uuid;
begin
  select patient_id into v_appointment_patient_id
  from public.appointments
  where id = new.appointment_id;

  if v_appointment_patient_id is null then
    raise exception 'La cita asociada no existe';
  end if;

  if new.patient_id <> v_appointment_patient_id then
    raise exception 'El pago debe corresponder al mismo paciente que la cita';
  end if;

  return new;
end;
$$;

drop trigger if exists payments_validate_patient_context on public.payments;
create trigger payments_validate_patient_context
before insert or update on public.payments
for each row execute function public.validate_payment_patient_consistency();

create or replace function public.validate_payment_proof_context()
returns trigger
language plpgsql
as $$
declare
  v_payment_patient_id uuid;
  v_appointment_patient_id uuid;
begin
  if new.payment_id is not null then
    select patient_id into v_payment_patient_id
    from public.payments
    where id = new.payment_id;
  end if;

  if new.appointment_id is not null then
    select patient_id into v_appointment_patient_id
    from public.appointments
    where id = new.appointment_id;
  end if;

  if new.payment_id is not null and new.appointment_id is not null then
    if v_payment_patient_id is null or v_appointment_patient_id is null then
      raise exception 'La cita o pago asociados no existen';
    end if;

    if v_payment_patient_id <> v_appointment_patient_id then
      raise exception 'El comprobante no pertenece al mismo paciente que la cita';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists payment_proof_validate_context on public.payment_proofs;
create trigger payment_proof_validate_context
before insert or update on public.payment_proofs
for each row execute function public.validate_payment_proof_context();

create or replace function public.ensure_unique_whatsapp_message()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.payment_proofs pp
    where pp.whatsapp_message_id = new.whatsapp_message_id
      and pp.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) then
    raise exception 'El comprobante de pago ya existe';
  end if;

  return new;
end;
$$;

drop trigger if exists payment_proof_prevent_duplicate on public.payment_proofs;
create trigger payment_proof_prevent_duplicate
before insert or update on public.payment_proofs
for each row execute function public.ensure_unique_whatsapp_message();
