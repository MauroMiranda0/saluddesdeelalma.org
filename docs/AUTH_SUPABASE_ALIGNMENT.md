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
3. Tras éxito, consulta `public.users` por `auth_user_id` (no por el ID interno `users.id`).
4. Permite acceso solo si `is_active=true`, `panel_login_enabled=true`, `role='admin'`. Cualquier otro caso (credenciales inválidas, sin fila, rol no admin, inactivo, panel deshabilitado): respuesta pública genérica `401 unauthorized` "Usuario o contraseña incorrectos", sin enumerar usuarios/rol/existencia.
5. Si autorizado, crea/emite cookie de sesión administrativa (`AdminSession`) igual que antes (conserva logout/revocación/expiración).
6. Nunca guarda contraseña de Supabase Auth ni tokens en `public.users`, logs ni `AdminSession`. Auditar sin datos sensibles.

## Alineación Prisma

- `User.id` es el ID interno de dominio y conserva el default PostgreSQL `gen_random_uuid()`.
- `User.authUserId` es nullable y único. La FK SQL opcional apunta a `auth.users(id)` con `ON DELETE SET NULL`; el campo escalar se mantiene en Prisma sin relación porque el modelo Prisma solo declara el esquema `public`.
- Se elimina `passwordHash`/`password_hash` del modelo.
- La migración `20270101000000_align_users_to_supabase_auth` conserva los UUID de dominio, añade `auth_user_id` nullable/único, elimina `password_hash`, reemplaza la restricción histórica que lo requería y conserva el default de `role` como `paciente`. No requiere una identidad Auth para todos los usuarios.
- No se modificaron migraciones históricas.

## Seeds/limpieza

- `prisma/seed.ts`: deshabilitado en `NODE_ENV=production`, ya no crea contraseñas ni eleva roles.
- `prisma/seed-demo.ts` y `prisma/clean-test-data.ts`: lanzan error si `NODE_ENV=production`.
- Aprovisionamiento pendiente del administrador: crear la identidad en **Supabase Auth** desde el mecanismo administrativo autorizado y conservar el UUID que devuelve Auth. Después, crear o actualizar la fila administrativa en `public.users`, guardando ese UUID en `auth_user_id`; mantener `users.id` como UUID interno generado por PostgreSQL. Asignar `role='admin'`, `username='admin'`, `panel_login_enabled=true` e `is_active=true` mediante una acción controlada. No asumir que ambos UUID coinciden. **Nunca** tomar rol o permisos de `raw_user_meta_data`, `app_metadata` controlada por cliente ni del formulario.
- Pacientes y terapeutas son usuarios de dominio: pueden crearse sin identidad Supabase, omitiendo `id` y `auth_user_id` para usar el default y el NULL de PostgreSQL. Sus sesiones administrativas siguen referenciando el ID interno con `AdminSession.user_id`.

## Precondición de la migración de alineación

La migración histórica puede crear filas de dominio sin identidades Auth. Es esperado: `auth_user_id` puede ser NULL y la FK no exige reconciliar esas filas. Solo la fila de dominio administrativa que vaya a iniciar sesión debe tener el vínculo configurado.

## Rate limiting

- `POST /api/v1/auth/login` limitado (10 req/min) sin bloquear resto de rutas.

## Validaciones locales (sin DB remota)

Ejecutar en clon local:

- `npm run prisma:validate` (backend)
- `npm run typecheck` (backend)
- Tests de auth relevantes
- `npm run test` (backend)
- `npm run build` (backend)
