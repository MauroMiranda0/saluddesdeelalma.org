# Fase 5C - Lockdown de Data API y grants

- **Fecha:** 2026-11-05
- **Proyecto:** Supabase aislado `xynquaiqkbwvfglwplut`
- **Rama:** `review/fase5c-lockdown`
- **Script:** `backend/prisma/manual/lockdown_data_api.sql`
- **Commit del script:** `0d5a0701d7678e50222c0f97d34d7f44f25343db`
- **Blob del script:** `7a9d81b6fa746c74220846f16d4c31038ad0c319`
- **Estado:** ejecutado y verificado en el proyecto aislado. No aplicado en producción.
- **Aprobación:** confirmación expresa del usuario para ejecutar en `xynquaiqkbwvfglwplut`.

## Alcance ejecutado

Se ejecutó una única transacción manual, sin migraciones Prisma, seeds, limpieza ni cambios de Storage. Antes de ejecutar se verificó sin imprimir valores que `SUPABASE_URL`, `DATABASE_URL` y `MIGRATION_DATABASE_URL` apuntan al proyecto aislado esperado.

El script:

1. Revocó privilegios de tablas y secuencias de `public` para `anon`, `authenticated` y `PUBLIC`.
2. Revocó `EXECUTE` de las funciones de `public` owned by `postgres`.
3. Revocó default privileges de `postgres` en `public`.
4. Detectó que `postgres` no es miembro de `supabase_admin` y omitió con `WARNING` los default privileges de ese rol.
5. Habilitó RLS sin `FORCE` en las 15 tablas de `public`.
6. Revisó funciones `SECURITY DEFINER`.
7. Verificó grants de tablas/secuencias dentro de la transacción.

## Resultado de la ejecución

La transacción terminó con `COMMIT` y código de salida `0`.

| Elemento | Resultado |
|---|---|
| Tablas con RLS | 15/15 |
| Tablas con `FORCE RLS` | 0 |
| Políticas RLS en `public` | 0 |
| Grants de tabla a `anon`/`authenticated`/`PUBLIC` | 0 filas |
| Grants de secuencia a `anon`/`authenticated`/`PUBLIC` | 0 filas |
| Funciones owned by `postgres` | 2, sin `EXECUTE` para `anon`/`authenticated` |
| Funciones owned by `supabase_admin` | 188, aún con `EXECUTE` para `anon`/`authenticated` |
| Funciones `SECURITY DEFINER` en `public` | 0 |
| Default ACL de `postgres` en `public` | Sin `anon`/`authenticated`/`PUBLIC` |
| Default ACL de `supabase_admin` en `public` | Aún con `anon`/`authenticated`/`PUBLIC` (no modificable por `postgres`) |
| Migraciones Prisma | 12 |
| Buckets Storage | 0 |
| Bucket/objetos `payment_proofs` | 0/0 |
| Políticas Storage | 0 |

### Funciones de aplicación sin EXECUTE

- `validate_appointment_therapist_assignment()`
- `validate_therapist_profile_user()`

### Funciones que permanecen ejecutables

Las 188 funciones de la extensión `btree_gist` viven en `public`, pertenecen a `supabase_admin` y conservan `EXECUTE` para `anon`/`authenticated`/`PUBLIC`. No son `SECURITY DEFINER`, pero siguen siendo superficie RPC si `public` se expone en la Data API. `postgres` no puede revocarlas porque no es owner ni miembro de `supabase_admin`.

La advertencia del script reportó `24` filas de privilegios de default ACL restantes. Corresponden a las 3 entradas de default ACL de `supabase_admin` en `public` (tablas, secuencias y funciones) por los privilegios de `anon` y `authenticated`; no son 24 objetos distintos.

## Verificación Data API

Antes del lockdown, el probe read-only con clave `anon` (`/rest/v1/<tabla>?select=id&limit=0`) devolvió HTTP 200 en las 15 tablas.

Después del lockdown:

| Tabla | Antes | Después |
|---|---:|---:|
| `_prisma_migrations` | 200 | 401 |
| `admin_sessions` | 200 | 401 |
| `appointment_reminders` | 200 | 401 |
| `appointments` | 200 | 401 |
| `audit_logs` | 200 | 401 |
| `chat_conversations` | 200 | 401 |
| `chat_messages` | 200 | 401 |
| `incoming_whatsapp_events` | 200 | 401 |
| `outgoing_whatsapp_events` | 200 | 401 |
| `patients` | 200 | 401 |
| `payment_proofs` | 200 | 401 |
| `payments` | 200 | 401 |
| `session_rates` | 200 | 401 |
| `therapist_profiles` | 200 | 401 |
| `users` | 200 | 401 |

No se devolvieron filas ni datos de pacientes.

## Verificación de aplicación

- `GET /health`: 200.
- `GET /api/v1/health`: 200.
- `GET /api/v1/auth/me` sin sesión: 401.
- `GET /api/v1/appointments` sin sesión: 401.
- Frontend `/admin/login`: 200.
- Lectura read-only con Prisma: 12 migraciones, 1 usuario, 1 admin, 0 citas. Prisma sigue leyendo con RLS habilitado y sin políticas gracias a `BYPASSRLS` de `postgres`.

No se ejecutó un login admin válido porque la contraseña no está disponible en el entorno de trabajo. Queda pendiente la prueba manual de login con la clave definida por el usuario.

## Límites y acciones pendientes

1. **Data API en Dashboard:** el bloqueo de grants ya impide el acceso con `anon`, pero falta completar el paso manual en Supabase Dashboard: Settings > API > Exposed schemas/Data API, retirar `public` de la exposición (o deshabilitar la Data API) y guardar. Después, repetir el probe con `anon`.
2. **`supabase_admin`:** los default privileges de `supabase_admin` en `public` siguen concediendo privilegios a `anon`/`authenticated` para objetos futuros creados por ese rol. Requiere una sesión con membresía en `supabase_admin` o mover la extensión `btree_gist` fuera de `public`.
3. **188 funciones `btree_gist`:** siguen con `EXECUTE` para `anon`/`authenticated`/`PUBLIC`. No son `SECURITY DEFINER`, pero deben cerrarse con un rol privilegiado o moviendo la extensión a `extensions`.
4. **`service_role`:** no se modificó en esta fase. Conserva grants y default ACL; no se usa en la app y queda fuera del alcance solicitado.
5. **`USAGE ON SCHEMA public`:** no se revocó. El cierre efectivo de la Data API se completa con el paso de Dashboard. El bloqueo directo de tablas/secuencias ya está aplicado.
6. **Login admin:** pendiente de prueba con la contraseña definida por el usuario.
7. No se creó PR, no se hizo merge, no se desplegó y no se inició Fase 6.

## Reproducción

Ejecución manual, sin credenciales en argumentos ni salida:

```sh
docker run --rm \
  --env-file "$ENV_FILE" \
  -v "$PWD/backend/prisma/manual:/work:ro" \
  postgres:16-alpine \
  sh -c 'psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f /work/lockdown_data_api.sql'
```

La verificación posterior se realizó con consultas read-only a catálogos (`pg_class`, `pg_proc`, `pg_default_acl`, `pg_policies`, `aclexplode`) y con el probe Data API `select=id&limit=0` usando la clave `anon`. No se imprimieron secretos.
