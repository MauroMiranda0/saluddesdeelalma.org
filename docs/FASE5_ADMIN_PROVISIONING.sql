-- FASE 5 - Aprovisionamiento del administrador ficticio en el proyecto
-- Supabase aislado del piloto.
--
-- NO EJECUTAR SIN CONFIRMACION EXPRESA DEL PROPIETARIO DEL PROYECTO.
--
-- Requisitos previos:
--   1. El propietario creo la identidad ficticia en Supabase Auth > Users.
--   2. El propietario obtuvo el UUID de esa identidad en Auth.
--   3. El proyecto destino fue confirmado como el proyecto NUEVO, aislado y
--      desechable del piloto (no produccion, no Hostinger, no Meta).
--
-- Parametros psql (sin valores reales en este archivo):
--   :auth_user_uuid   UUID de la identidad en auth.users
--   :admin_email      correo ficticio del administrador
--   :admin_full_name  nombre ficticio del administrador
--
-- Uso sugerido desde un entorno seguro:
--   psql "$MIGRATION_DATABASE_URL" \
--     -v auth_user_uuid="<UUID_DE_AUTH>" \
--     -v admin_email="<EMAIL_FICTICIO>" \
--     -v admin_full_name="<NOMBRE_FICTICIO>" \
--     -f docs/FASE5_ADMIN_PROVISIONING.sql
--
-- El UUID de Auth y el UUID interno de public.users son distintos: este script
-- conserva public.users.id y solo guarda el UUID de Auth en auth_user_id.
-- No lee rol ni permisos desde metadata de Auth y no modifica auth.users.

\set ON_ERROR_STOP on
BEGIN;

SET LOCAL app.auth_user_uuid = :'auth_user_uuid';
SET LOCAL app.admin_email = :'admin_email';
SET LOCAL app.admin_full_name = :'admin_full_name';

-- Inserta exactamente una fila admin o aborta sin confirmar la transaccion.
DO $$
DECLARE
  v_uuid uuid := current_setting('app.auth_user_uuid')::uuid;
  v_email varchar(255) := lower(current_setting('app.admin_email'));
  v_name varchar(120) := current_setting('app.admin_full_name');
  v_inserted integer;
BEGIN
  IF (SELECT count(*) FROM public.users WHERE role = 'admin') <> 0 THEN
    RAISE EXCEPTION 'Ya existe una fila admin; no se inserta ninguna';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_uuid) THEN
    RAISE EXCEPTION 'El UUID de Auth no existe en auth.users';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = v_uuid) THEN
    RAISE EXCEPTION 'El UUID de Auth ya esta vinculado en public.users';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE email = v_email) THEN
    RAISE EXCEPTION 'El email ya existe en public.users';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE username = 'admin') THEN
    RAISE EXCEPTION 'El username admin ya existe';
  END IF;

  INSERT INTO public.users (
    auth_user_id,
    username,
    email,
    full_name,
    role,
    panel_login_enabled,
    is_active
  ) VALUES (
    v_uuid,
    'admin',
    v_email,
    v_name,
    'admin',
    true,
    true
  );

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted <> 1 THEN
    RAISE EXCEPTION 'Se esperaba insertar exactamente 1 fila admin, se insertaron %', v_inserted;
  END IF;
END;
$$;

-- Verifica antes del COMMIT que existe una sola cuenta admin habilitada,
-- activa y vinculada al UUID esperado.
DO $$
DECLARE
  v_uuid uuid := current_setting('app.auth_user_uuid')::uuid;
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.users
  WHERE role = 'admin'
    AND username = 'admin'
    AND panel_login_enabled
    AND is_active
    AND auth_user_id = v_uuid;

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Verificacion fallida: se esperaba 1 admin habilitado vinculado, se encontro %', v_count;
  END IF;
END;
$$;

COMMIT;

-- Verificacion final de solo lectura.
SELECT
  count(*) AS admin_rows,
  count(*) FILTER (WHERE panel_login_enabled) AS enabled_admin_rows,
  count(*) FILTER (WHERE is_active) AS active_admin_rows,
  count(*) FILTER (WHERE auth_user_id = :'auth_user_uuid'::uuid) AS linked_admin_rows
FROM public.users
WHERE role = 'admin';
