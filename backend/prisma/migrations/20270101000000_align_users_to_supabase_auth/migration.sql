-- Align users to Supabase Auth
-- 1) Make users.id reference auth.users(id) for Supabase Auth integration
--    Prisma cannot always express cross-schema FKs in a portable way; keep explicit SQL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'users'
      AND c.contype = 'f'
      AND c.conname LIKE '%auth%'
  ) THEN
    BEGIN
      ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    BEGIN
      ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_auth_users_id_fkey;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;

ALTER TABLE public.users
  ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- 2) Remove/replace constraints that depend on password_hash (historical constraint from business_rules)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_access_profile_check;

-- Equivalent constraint for Supabase Auth model (no local password)
ALTER TABLE public.users
  ADD CONSTRAINT users_access_profile_check
  CHECK (
    (
      "role" = 'admin'
      AND "username" = 'admin'
      AND "panel_login_enabled" = true
    )
    OR
    (
      "role" <> 'admin'
      AND "username" IS NULL
      AND "panel_login_enabled" = false
    )
  );

-- 3) Remove password_hash (panel login now uses Supabase Auth; credentials never stored here)
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;

-- 4) Ensure panel_login_enabled exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS panel_login_enabled BOOLEAN NOT NULL DEFAULT false;

-- 5) Ensure role default non-privileged
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'paciente';
