# Fase 5C - Lockdown de Data API y grants

- **Fecha de cierre:** 2026-11-05
- **Proyecto:** Supabase aislado `xynquaiqkbwvfglwplut`
- **Rama:** `review/fase5c-lockdown` (publicada en `origin`)
- **Script:** `backend/prisma/manual/lockdown_data_api.sql`
- **Commit del script:** `0d5a0701d7678e50222c0f97d34d7f44f25343db`
- **Blob del script:** `7a9d81b6fa746c74220846f16d4c31038ad0c319`
- **Estado:** lockdown aplicado y verificado. Probe posterior al cambio manual del Dashboard ejecutado en modo read-only.
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

Después del cierre, el propietario cambió manualmente la configuración del Dashboard/Data API. Este agente no modificó esa configuración.

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

Las 188 funciones de la extensión `btree_gist` viven en `public`, pertenecen a `supabase_admin` y conservan `EXECUTE` para `anon`/`authenticated`/`PUBLIC`. No son `SECURITY DEFINER`. `postgres` no puede revocarlas porque no es owner ni miembro de `supabase_admin`.

La advertencia del script reportó `24` filas de privilegios de default ACL restantes. Corresponden a las 3 entradas de default ACL de `supabase_admin` en `public` (tablas, secuencias y funciones) por los privilegios de `anon` y `authenticated`; no son 24 objetos distintos.

## Verificación Data API tras lockdown, antes del cambio de Dashboard

Antes del lockdown, el probe read-only con clave `anon` (`/rest/v1/<tabla>?select=id&limit=0`) devolvió HTTP 200 en las 15 tablas.

Después del lockdown y antes del cambio manual del Dashboard:

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

## Probe posterior al cambio manual del Dashboard

El probe se repitió con la clave `anon` contra las 15 tablas, `/rest/v1/` y la RPC `int4_dist(integer,integer)` de `btree_gist`. No se ejecutó SQL de escritura.

### Tablas

Las 15 tablas devolvieron **HTTP 503** con `PGRST002: Could not query the database for the schema cache. Retrying.` No se devolvió ninguna fila.

| Tabla | HTTP | Filas |
|---|---:|---|
| `_prisma_migrations` | 503 | 0 |
| `admin_sessions` | 503 | 0 |
| `appointment_reminders` | 503 | 0 |
| `appointments` | 503 | 0 |
| `audit_logs` | 503 | 0 |
| `chat_conversations` | 503 | 0 |
| `chat_messages` | 503 | 0 |
| `incoming_whatsapp_events` | 503 | 0 |
| `outgoing_whatsapp_events` | 503 | 0 |
| `patients` | 503 | 0 |
| `payment_proofs` | 503 | 0 |
| `payments` | 503 | 0 |
| `session_rates` | 503 | 0 |
| `therapist_profiles` | 503 | 0 |
| `users` | 503 | 0 |

### `/rest/v1/` (OpenAPI)

- Resultado: **HTTP 401**.
- Cuerpo: `{"message":"Secret API key required","hint":"Only secret API keys can be used for this endpoint."}`
- No se pudo inspeccionar el OpenAPI con la clave `anon`; este endpoint exige una clave secreta. No se usó ninguna clave secreta.

### RPC `int4_dist`

Se probaron tres formatos de body: `$1/$2`, `arg1/arg2` y array posicional. Los tres devolvieron **HTTP 503** con `PGRST002`. No se pudo confirmar si la RPC sigue expuesta por HTTP.

### Diagnóstico del 503

El schema cache de PostgREST no está cargando. La evidencia de catálogo muestra que el rol `authenticator` tiene `USAGE` sobre `public`, pero **no** sobre `graphql_public`:

```text
authenticator -> public:         USAGE = true
authenticator -> graphql_public: USAGE = false
```

Si al retirar `public` del Dashboard quedó `graphql_public` como esquema expuesto, PostgREST no puede introspeccionar ese esquema y falla el schema cache. Es una hipótesis compatible con el `503`, no una configuración modificada por este agente. Requiere revisión del propietario en el Dashboard; no se tocó esa configuración.

## Revalidación de RLS y grants tras el cambio de Dashboard

Las consultas read-only de catálogos se repitieron y no mostraron cambios respecto al cierre 5C:

| Elemento | Resultado |
|---|---|
| Tablas con RLS | 15/15 |
| Tablas con `FORCE RLS` | 0 |
| Políticas RLS en `public` | 0 |
| Grants de tabla a `anon`/`authenticated`/`PUBLIC` | 0 filas |
| Grants de secuencia a `anon`/`authenticated`/`PUBLIC` | 0 filas |
| Funciones owned by `postgres` sin `EXECUTE` | 2/2 |
| Funciones owned by `supabase_admin` con `EXECUTE` | 188/188 |
| Funciones `SECURITY DEFINER` en `public` | 0 |
| Default ACL de `postgres` en `public` | Sin `anon`/`authenticated`/`PUBLIC` |
| Default ACL de `supabase_admin` en `public` | Sin cambios; aún con `anon`/`authenticated`/`PUBLIC` |
| Migraciones Prisma | 12 |
| Storage: buckets/objetos/políticas | 0/0/0 |

No hubo cambios de RLS, grants, default ACL ni Storage entre el cierre y este probe.

## Verificación de aplicación

- `GET /health`: 200.
- `GET /api/v1/health`: 200.
- `GET /api/v1/auth/me` sin sesión: 401.
- `GET /api/v1/appointments` sin sesión: 401.
- `GET /api/v1/directory` sin sesión: 401.
- `GET /api/v1/session-rates` sin sesión: 401.
- `GET /api/v1/payment-proofs` sin sesión: 401.
- Frontend `/admin/login`: 200.

La lectura read-only con Prisma ya verificada en el cierre 5C sigue siendo válida: 12 migraciones, 1 usuario, 1 admin, 0 citas, con RLS habilitado y sin políticas gracias a `BYPASSRLS` de `postgres`.

**Login admin:** el propietario verificó manualmente el login admin con sesión. Este agente no ejecutó esa prueba, no usó la contraseña y no afirma haberla ejecutado.

## Riesgo residual y bloqueos para Fase 6

1. **`btree_gist` diferido:** las 188 funciones siguen con `EXECUTE` para `anon`/`authenticated`/`PUBLIC` en el catálogo. No son `SECURITY DEFINER`, pero si `public` vuelve a quedar expuesto y el schema cache de PostgREST sana, podrían ser invocables por RPC. Su cierre requiere una sesión con membresía en `supabase_admin` o mover la extensión a `extensions`. Queda **diferido**.
2. **Data API en 503:** el cambio de Dashboard dejó PostgREST sin schema cache. No se pudo confirmar el estado final de exposición HTTP de tablas/RPC. Es un bloqueo operativo para Fase 6 hasta corregir la configuración y repetir el probe. No es un `401` limpio.
3. **`/rest/v1/`:** exige clave secreta; la clave `anon` no permite inspeccionar el OpenAPI. No se usaron claves secretas.
4. **`supabase_admin`:** sus default privileges en `public` siguen concediendo privilegios a `anon`/`authenticated` para objetos futuros creados por ese rol. No modificable por `postgres`.
5. **`service_role`:** conserva grants y default ACL; queda fuera del alcance de esta fase y no se usa en la app.
6. **`USAGE ON SCHEMA public`:** no se revocó. El bloqueo directo de tablas/secuencias está aplicado.
7. No se creó PR, no se hizo merge, no se desplegó y no se inició Fase 6.

## Comandos ejecutados

Sin credenciales en argumentos ni en salida:

```sh
git push -u origin review/fase5c-lockdown
node check-data-api-exposure.mjs
psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f verify-lockdown.sql
curl http://127.0.0.1:4000/health
curl http://127.0.0.1:4000/api/v1/health
curl http://127.0.0.1:4000/api/v1/auth/me
curl http://127.0.0.1:4000/api/v1/appointments
curl http://127.0.0.1:4000/api/v1/directory
curl http://127.0.0.1:4000/api/v1/session-rates
curl http://127.0.0.1:4000/api/v1/payment-proofs
```

Las consultas SQL posteriores al cierre fueron exclusivamente read-only sobre catálogos (`pg_class`, `pg_proc`, `pg_default_acl`, `pg_policies`, `aclexplode`, `pg_auth_members`) y sobre `storage.*`. No se ejecutaron DDL, DML, migraciones, seeds ni limpieza.
