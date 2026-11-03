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
    -- Attempt to drop common FK names if they exist
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

-- Ensure FK to auth.users exists (Supabase schema). If auth schema not present, this will error in that context,
-- but migration is intended for Supabase clean project.
ALTER TABLE public.users
  ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- 2) Remove password_hash (panel login now uses Supabase Auth; credentials never stored here)
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;

-- 3) Ensure panel_login_enabled exists (keep for admin gating)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS panel_login_enabled BOOLEAN NOT NULL DEFAULT false;

-- 4) Ensure role default non-privileged for application rows created outside controlled flow
--    (Trigger/creation logic must enforce non-privileged assignment; do not read role from metadata)
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'paciente';
