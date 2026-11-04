-- Domain users keep their database-generated IDs and may exist without login identities.
ALTER TABLE public.users
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.users
  ADD COLUMN auth_user_id UUID;

-- Prisma does not model this cross-schema FK because auth.users is outside its schema.
ALTER TABLE public.users
  ADD CONSTRAINT users_auth_user_id_fkey
  FOREIGN KEY (auth_user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

CREATE UNIQUE INDEX users_auth_user_id_key
  ON public.users(auth_user_id);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS panel_login_enabled BOOLEAN NOT NULL DEFAULT false;

-- Replace the historical access rule that required password_hash.
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_access_profile_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_access_profile_check
  CHECK (
    (
      "role" = 'admin'
      AND "username" = 'admin'
    )
    OR
    (
      "role" <> 'admin'
      AND "username" IS NULL
      AND "panel_login_enabled" = false
      AND "auth_user_id" IS NULL
    )
  );

-- Passwords are managed only by Supabase Auth.
ALTER TABLE public.users DROP COLUMN IF EXISTS password_hash;

-- Keep the domain profile defaults explicit for databases with older drift.
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'paciente';
