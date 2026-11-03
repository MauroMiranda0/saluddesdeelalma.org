# Auth / Schema alignment (Supabase Auth) - Fase 1

## Variables requeridas (solo nombres)

Backend (`backend/src/config/env.ts`):

- `SUPABASE_URL` (requerida)
- `SUPABASE_ANON_KEY` (requerida)
- Otras existentes: `DATABASE_URL`, `JWT_SECRET`, `SESSION_COOKIE_NAME`, `SESSION_IDLE_TIMEOUT_MINUTES`, etc.

No se deben exponer valores. Solo nombres.

## Flujo

1. Login recibe `email` + `password` (únicamente).
2. Backend valida credenciales contra Supabase Auth vía `POST {SUPABASE_URL}/auth/v1/token?grant_type=password` con `apikey: {SUPABASE_ANON_KEY}` (sin `service_role`).
3. Tras éxito, consulta `public.users` por `id` (UUID de `auth.users`).
4. Permite acceso solo si `is_active=true`, `panel_login_enabled=true`, `role='admin'`. Cualquier otro caso (credenciales inválidas, sin fila, rol no admin, inactivo, panel deshabilitado): respuesta pública genérica `401 unauthorized` "Usuario o contraseña incorrectos", sin enumerar usuarios/rol/existencia.
5. Si autorizado, crea/emite cookie de sesión administrativa (`AdminSession`) igual que antes (conserva logout/revocación/expiración).
6. Nunca guarda contraseña de Supabase Auth ni tokens en `public.users`, logs ni `AdminSession`. Auditar sin datos sensibles.

## Alineación Prisma

- `User.id` ahora es `@id @db.Uuid` sin `default(dbgenerated("gen_random_uuid()"))` (debe coincidir con `auth.users.id`).
- Se elimina `passwordHash`/`password_hash` del modelo.
- Nueva migración aditiva: `20270101000000_align_users_to_supabase_auth` añade FK `users.id -> auth.users(id)` ON DELETE CASCADE (SQL explícito por posible FK cross-schema), elimina `password_hash` si existe, asegura `panel_login_enabled`, ajusta default de `role` a `paciente`.
- No se modificaron migraciones históricas.

## Seeds/limpieza

- `prisma/seed.ts`: deshabilitado en `NODE_ENV=production`, ya no crea contraseñas ni eleva roles.
- `prisma/seed-demo.ts` y `prisma/clean-test-data.ts`: lanzan error si `NODE_ENV=production`.
- Procedimiento piloto (correcto): crear usuario en **Supabase Auth** (propietario del proyecto, con email/password). Crear fila en `public.users` con `id = auth.users.id`, `email`, `full_name`, `role='admin'`, `panel_login_enabled=true`, `is_active=true`, `username='admin'` si aplica. **Nunca** tomar `role` desde `raw_user_meta_data` ni desde cliente; asignarlo únicamente por acción controlada. La migración nueva elimina `password_hash` y ajusta la restricción `users_access_profile_check` para modelo sin contraseña local.

## Precondición de la migración de alineación

La migración `20270101000000_align_users_to_supabase_auth` es posterior a las migraciones históricas que renombran `admin_users` a `users` y crean filas de usuario para pacientes existentes. Esas filas históricas recibieron UUID propios; no se crean identidades correspondientes en el esquema administrado `auth.users`. Por eso, antes de aplicar la nueva FK, hay que reconciliar las filas existentes de `public.users` con identidades reales de Supabase Auth y verificar que no queden IDs sin correspondencia. La migración no crea identidades Auth ni elimina filas para resolver esa diferencia; no debe omitirse la validación de la FK.

Comprobación de solo lectura en el proyecto destino antes de la migración:

```sql
SELECT count(*) AS users_without_auth_identity
FROM public.users AS public_user
LEFT JOIN auth.users AS auth_user ON auth_user.id = public_user.id
WHERE auth_user.id IS NULL;
```

La migración debe pausarse si el resultado no es cero hasta que se defina y complete la reconciliación de forma controlada.

## Rate limiting

- `POST /api/v1/auth/login` limitado (10 req/min) sin bloquear resto de rutas.

## Validaciones locales (sin DB remota)

Ejecutar en clon local:

- `npm run prisma:validate` (backend)
- `npm run typecheck` (backend)
- Tests de auth relevantes
- `npm run test` (backend)
- `npm run build` (backend)
