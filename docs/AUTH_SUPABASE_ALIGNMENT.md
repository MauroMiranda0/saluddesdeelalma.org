# Auth / Schema alignment (Supabase Auth) - Fase 1

## Variables requeridas (solo nombres)
Backend (`backend/src/config/env.ts`):
- `SUPABASE_URL` (requerida)
- `SUPABASE_ANON_KEY` (requerida)
- Otras existentes: `DATABASE_URL`, `JWT_SECRET`, `SESSION_COOKIE_NAME`, `SESSION_IDLE_TIMEOUT_MINUTES`, etc.

No se deben exponer valores. Solo nombres.

## Flujo
1. Login recibe `email` o `username` + `password`.
2. Backend valida credenciales contra Supabase Auth vía `POST {SUPABASE_URL}/auth/v1/token?grant_type=password` con `apikey: {SUPABASE_ANON_KEY}` (sin `service_role`).
3. Tras éxito, consulta `public.users` por `id` (UUID de `auth.users`).
4. Permite acceso solo si `is_active=true`, `panel_login_enabled=true`, `role='admin'`. Cualquier otro caso: error genérico `unauthorized` o `forbidden` según corresponda, sin enumerar usuarios.
5. Si autorizado, crea/emite cookie de sesión administrativa (`AdminSession`) igual que antes (conserva logout/revocación/expiración).
6. Nunca guarda contraseña de Supabase Auth ni tokens en `public.users`, logs ni `AdminSession`.

## Alineación Prisma
- `User.id` ahora es `@id @db.Uuid` sin `default(dbgenerated("gen_random_uuid()"))` (debe coincidir con `auth.users.id`).
- Se elimina `passwordHash`/`password_hash` del modelo.
- Nueva migración aditiva: `20270101000000_align_users_to_supabase_auth` añade FK `users.id -> auth.users(id)` ON DELETE CASCADE (SQL explícito por posible FK cross-schema), elimina `password_hash` si existe, asegura `panel_login_enabled`, ajusta default de `role` a `paciente`.
- No se modificaron migraciones históricas.

## Seeds/limpieza
- `prisma/seed.ts`: deshabilitado en `NODE_ENV=production`, ya no crea contraseñas ni eleva roles.
- `prisma/seed-demo.ts` y `prisma/clean-test-data.ts`: lanzan error si `NODE_ENV=production`.
- Procedimiento piloto: crear identidad admin en Supabase Auth (propietario del proyecto). Asignar fila en `public.users` con `id = auth.users.id`, `role='admin'`, `panel_login_enabled=true`, `is_active=true`. **Nunca** asignar rol desde metadata pública.

## Rate limiting
- `POST /api/v1/auth/login` limitado (10 req/min) sin bloquear resto de rutas.

## Validaciones locales (sin DB remota)
Ejecutar en clon local:
- `npm run prisma:validate` (backend)
- `npm run typecheck` (backend)
- Tests de auth relevantes
- `npm run test` (backend)
- `npm run build` (backend)
