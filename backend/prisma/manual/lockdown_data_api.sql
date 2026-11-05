-- ============================================================================
-- MANUAL — SOLO PILOTO AISLADO — NO ES UNA MIGRACIÓN PRISMA
-- Archivo: backend/prisma/manual/lockdown_data_api.sql
-- Fase: 5C
-- Proyecto: Supabase aislado xynquaiqkbwvfglwplut
--
-- Propósito:
--   1. Revocar acceso directo de anon/authenticated/PUBLIC a tablas,
--      secuencias y funciones de public.
--   2. Revocar default privileges de postgres en public.
--   3. Intentar revocar default privileges de supabase_admin (solo si el rol
--      actual es miembro; si no, avisar sin fallar silenciosamente).
--   4. Habilitar RLS sin FORCE en las 15 tablas de public.
--   5. Revisar funciones SECURITY DEFINER y su EXECUTE.
--
-- Requisitos:
--   * Ejecutar con MIGRATION_DATABASE_URL como rol postgres.
--   * Una sola transacción, con ON_ERROR_STOP.
--   * No ejecutar en producción ni en el proyecto real.
--   * No crea políticas de RLS ni buckets de Storage.
--
-- Limitaciones conocidas de este proyecto:
--   * 188 funciones de la extensión btree_gist viven en public, pertenecen a
--     supabase_admin y tienen EXECUTE para anon/authenticated/PUBLIC. postgres
--     no es miembro de supabase_admin y no puede revocarlas. El script las
--     reporta con WARNING; requieren una sesión con membresía en supabase_admin
--     o mover la extensión a extensions en un cambio separado.
--   * ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin tampoco se puede aplicar
--     como postgres. El script lo detecta, lo informa y lo omite.
--   * No se usa FORCE ROW LEVEL SECURITY: postgres debe seguir accediendo por
--     BYPASSRLS para que Prisma no se bloquee.
--   * service_role no se modifica en esta fase: sus grants y default ACL quedan
--     fuera del alcance solicitado. No se usa en la app; revisar en Fase 6.
--   * No se revoca USAGE ON SCHEMA public: el cierre de la Data API se completa
--     con el paso manual del Dashboard (no exponer public). El bloqueo directo
--     se hace retirando privilegios de tablas/secuencias/funciones.
-- ============================================================================

\set ON_ERROR_STOP on
\pset pager off

begin;
set local lock_timeout = '15s';
set local statement_timeout = '120s';
set local search_path = pg_catalog, public;

-- ---------------------------------------------------------------------------
-- 0. Preflight: proyecto/rol/tablas esperadas y BYPASSRLS
-- ---------------------------------------------------------------------------
do $$
declare
  expected_tables text[] := array[
    '_prisma_migrations',
    'admin_sessions',
    'appointment_reminders',
    'appointments',
    'audit_logs',
    'chat_conversations',
    'chat_messages',
    'incoming_whatsapp_events',
    'outgoing_whatsapp_events',
    'patients',
    'payment_proofs',
    'payments',
    'session_rates',
    'therapist_profiles',
    'users'
  ];
  missing_tables text[];
begin
  if current_user <> 'postgres' then
    raise exception 'Este script debe ejecutarse como postgres; current_user=%', current_user;
  end if;

  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'anon') then
    raise exception 'No existe el rol anon';
  end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'authenticated') then
    raise exception 'No existe el rol authenticated';
  end if;

  select array_agg(t)
    into missing_tables
  from unnest(expected_tables) t
  where to_regclass(format('public.%I', t)) is null;

  if missing_tables is not null then
    raise exception 'Faltan tablas esperadas en public: %', missing_tables;
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_roles
    where rolname = current_user
      and (rolsuper or rolbypassrls)
  ) then
    raise exception 'El rol % no tiene BYPASSRLS; no se habilita RLS sobre Prisma', current_user;
  end if;

  raise notice 'Preflight OK: current_user=%, 15 tablas presentes, BYPASSRLS confirmado', current_user;
end $$;

-- ---------------------------------------------------------------------------
-- 1. Revocar privilegios existentes en public
-- ---------------------------------------------------------------------------
-- Si no hay grants de PUBLIC, PostgreSQL puede emitir WARNING
-- "no privileges could be revoked"; es esperado y no aborta la transacción.
revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all tables in schema public from public;

revoke all privileges on all sequences in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from public;

-- No se usa REVOKE ALL ON ALL FUNCTIONS: 188 funciones de btree_gist
-- pertenecen a supabase_admin y este rol no puede revocarlas. Se recorre
-- función por función y se reporta lo que quede pendiente.
do $$
declare
  fn record;
  current_user_oid oid;
  revoked_count integer := 0;
  skipped_count integer := 0;
  remaining_count integer := 0;
  remaining_owners text;
begin
  select oid into current_user_oid
  from pg_catalog.pg_roles
  where rolname = current_user;

  for fn in
    select
      p.oid,
      p.oid::regprocedure as signature,
      p.proowner,
      pg_catalog.pg_get_userbyid(p.proowner) as owner_name
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    if fn.proowner = current_user_oid then
      execute format(
        'revoke all privileges on routine %s from anon, authenticated, public',
        fn.signature
      );

      if has_function_privilege('anon', fn.oid, 'EXECUTE')
         or has_function_privilege('authenticated', fn.oid, 'EXECUTE') then
        remaining_count := remaining_count + 1;
      else
        revoked_count := revoked_count + 1;
      end if;
    else
      skipped_count := skipped_count + 1;
    end if;
  end loop;

  select
    count(*),
    string_agg(distinct pg_catalog.pg_get_userbyid(p.proowner), ', ')
    into remaining_count, remaining_owners
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and (
      has_function_privilege('anon', p.oid, 'EXECUTE')
      or has_function_privilege('authenticated', p.oid, 'EXECUTE')
    );

  raise notice 'Funciones: % revocadas, % omitidas por owner distinto de %, % aún ejecutables por anon/authenticated',
    revoked_count, skipped_count, current_user, remaining_count;

  if remaining_count > 0 then
    raise warning 'REVISIÓN REQUERIDA: % funciones de public siguen ejecutables por anon/authenticated; owners: %. postgres no puede revocarlas. Aplicar con un rol miembro de esos owners o mover la extensión fuera de public.',
      remaining_count, remaining_owners;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Revocar default privileges de postgres en public
-- ---------------------------------------------------------------------------
alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all privileges on tables from public;

alter default privileges for role postgres in schema public
  revoke all privileges on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all privileges on sequences from public;

alter default privileges for role postgres in schema public
  revoke all privileges on functions from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all privileges on functions from public;

-- supabase_admin: solo si el rol actual es miembro. Si no, WARNING explícito.
do $$
begin
  if pg_catalog.pg_has_role(current_user, 'supabase_admin', 'MEMBER') then
    execute 'alter default privileges for role supabase_admin in schema public revoke all privileges on tables from anon, authenticated';
    execute 'alter default privileges for role supabase_admin in schema public revoke all privileges on tables from public';
    execute 'alter default privileges for role supabase_admin in schema public revoke all privileges on sequences from anon, authenticated';
    execute 'alter default privileges for role supabase_admin in schema public revoke all privileges on sequences from public';
    execute 'alter default privileges for role supabase_admin in schema public revoke all privileges on functions from anon, authenticated';
    execute 'alter default privileges for role supabase_admin in schema public revoke all privileges on functions from public';
    raise notice 'Default privileges de supabase_admin revocados en public';
  else
    raise warning 'OMITIDO: current_user=% no es miembro de supabase_admin. Los default privileges de supabase_admin en public NO se modificaron; requieren una sesión con membresía en supabase_admin. No se falla en silencio.',
      current_user;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Habilitar RLS sin FORCE en las 15 tablas de public
-- ---------------------------------------------------------------------------
alter table public._prisma_migrations enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.appointment_reminders enable row level security;
alter table public.appointments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.incoming_whatsapp_events enable row level security;
alter table public.outgoing_whatsapp_events enable row level security;
alter table public.patients enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.payments enable row level security;
alter table public.session_rates enable row level security;
alter table public.therapist_profiles enable row level security;
alter table public.users enable row level security;

do $$
declare
  expected_tables text[] := array[
    '_prisma_migrations',
    'admin_sessions',
    'appointment_reminders',
    'appointments',
    'audit_logs',
    'chat_conversations',
    'chat_messages',
    'incoming_whatsapp_events',
    'outgoing_whatsapp_events',
    'patients',
    'payment_proofs',
    'payments',
    'session_rates',
    'therapist_profiles',
    'users'
  ];
  missing_rls text[];
  forced_rls text[];
begin
  select array_agg(t)
    into missing_rls
  from unnest(expected_tables) t
  where not exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = t
      and c.relrowsecurity
  );

  if missing_rls is not null then
    raise exception 'RLS no quedó habilitado en: %', missing_rls;
  end if;

  select array_agg(t)
    into forced_rls
  from unnest(expected_tables) t
  where exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = t
      and c.relforcerowsecurity
  );

  if forced_rls is not null then
    raise exception 'FORCE RLS encontrado en: %; no se esperaba', forced_rls;
  end if;

  raise notice 'RLS habilitado sin FORCE en las 15 tablas de public';
end $$;

-- ---------------------------------------------------------------------------
-- 4. Revisar funciones SECURITY DEFINER en public y su EXECUTE
-- ---------------------------------------------------------------------------
do $$
declare
  fn record;
  secdef_count integer := 0;
begin
  for fn in
    select p.oid, p.oid::regprocedure as signature
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
    order by p.oid::regprocedure::text
  loop
    secdef_count := secdef_count + 1;
    raise warning 'SECURITY DEFINER en public: %; anon_execute=%, authenticated_execute=%',
      fn.signature,
      has_function_privilege('anon', fn.oid, 'EXECUTE'),
      has_function_privilege('authenticated', fn.oid, 'EXECUTE');
  end loop;

  if secdef_count = 0 then
    raise notice 'SECURITY DEFINER en public: 0 funciones';
  else
    raise warning 'SECURITY DEFINER en public: % funciones revisadas', secdef_count;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Verificación dentro de la transacción
-- ---------------------------------------------------------------------------
do $$
declare
  remaining_tables integer;
  remaining_sequences integer;
  remaining_default_acl integer;
  remaining_functions integer;
begin
  select count(*)
    into remaining_tables
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p', 'v', 'm', 'f')
    and c.relacl is not null
    and exists (
      select 1
      from pg_catalog.aclexplode(c.relacl) a
      where a.grantee = 0
         or a.grantee in (
           select oid from pg_catalog.pg_roles
           where rolname in ('anon', 'authenticated')
         )
    );

  if remaining_tables > 0 then
    raise exception 'Quedan grants de anon/authenticated/PUBLIC en % relaciones de public', remaining_tables;
  end if;

  select count(*)
    into remaining_sequences
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'S'
    and c.relacl is not null
    and exists (
      select 1
      from pg_catalog.aclexplode(c.relacl) a
      where a.grantee = 0
         or a.grantee in (
           select oid from pg_catalog.pg_roles
           where rolname in ('anon', 'authenticated')
         )
    );

  if remaining_sequences > 0 then
    raise exception 'Quedan grants de anon/authenticated/PUBLIC en % secuencias de public', remaining_sequences;
  end if;

  select count(*)
    into remaining_default_acl
  from pg_catalog.pg_default_acl d
  join pg_catalog.pg_namespace n on n.oid = d.defaclnamespace
  cross join lateral pg_catalog.aclexplode(d.defaclacl) a
  where n.nspname = 'public'
    and (
      a.grantee = 0
      or a.grantee in (
        select oid from pg_catalog.pg_roles
        where rolname in ('anon', 'authenticated')
      )
    );

  if remaining_default_acl > 0 then
    raise warning 'Quedan % entradas de default ACL para anon/authenticated/PUBLIC en public; revisar owner supabase_admin (no modificable por postgres).',
      remaining_default_acl;
  end if;

  select count(*)
    into remaining_functions
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and (
      has_function_privilege('anon', p.oid, 'EXECUTE')
      or has_function_privilege('authenticated', p.oid, 'EXECUTE')
    );

  raise notice 'Verificación: tablas con grants=% , secuencias con grants=% , default ACL restantes=% , funciones aún ejecutables=%',
    remaining_tables, remaining_sequences, remaining_default_acl, remaining_functions;
end $$;

commit;
