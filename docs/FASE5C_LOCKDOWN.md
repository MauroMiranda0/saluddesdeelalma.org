# Fase 5C - Lockdown de Data API y grants

- **Fecha de cierre:** 2026-11-05
- **Proyecto:** Supabase aislado `xynquaiqkbwvfglwplut`
- **Rama:** `review/fase5c-lockdown` (publicada en `origin`)
- **Script:** `backend/prisma/manual/lockdown_data_api.sql`
- **Commit del script:** `0d5a0701d7678e50222c0f97d34d7f44f25343db`
- **Blob del script:** `7a9d81b6fa746c74220846f16d4c31038ad0c319`
- **Estado:** lockdown aplicado y verificado. Data API desactivada manualmente por el propietario. Probe read-only confirma `503 PGRST002` sin filas.
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

## Data API desactivada manualmente

Según la captura del Dashboard aportada por el propietario, **“Enable Data API” está desactivado** en el proyecto aislado. Supabase indica que, con la Data API desactivada, no se puede consultar ningún esquema. Este agente no modificó esa configuración.

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

## Probe con Data API desactivada

Se repitió el probe read-only con la clave `anon` contra las 15 tablas, `/rest/v1/` y la RPC `int4_dist(integer,integer)`. No se ejecutó SQL de escritura ni se usaron claves secretas.

### Tablas

Las 15 tablas devolvieron **HTTP 503** con el código `PGRST002`. No se devolvió ninguna fila ni dato. Se hizo una sola repetición tras 10 s y el resultado fue idéntico.

Mensaje literal:

```text
Could not query the database for the schema cache. Retrying.
```

| Endpoint | HTTP | Código | Filas |
|---|---:|---|---|
| `/rest/v1/_prisma_migrations?select=id&limit=0` | 503 | `PGRST002` | No |
| `/rest/v1/admin_sessions?select=id&limit=0` | 503 | `PGRST002` | No |
| `/rest/v1/appointment_reminders?select=id&limit=0` | 503 | `PGRST002` | No |
| `/rest/v1/appointments?select=id&limit=0` | 503 | `PGRST002` | No |
| `/rest/v1/audit_logs?select=id&limit=0` | 503 | `PGRST002` | No |
| `/rest/v1/chat_conversations?select=id&limit=0` | 503 | `PGRST002` | No |
| `/rest/v1/chat_messages?select=id&limit=0` | 503 | `PGRST002` | No |
| `/rest/v1/incoming_whatsapp_events?select=id&limit=0` | 503 | `PGRST002` | No |
| `/rest/v1/outgoing_whatsapp_events?select=id&limit=0` | 503 | `PGRST002` | No |
| `/rest/v1/patients?select=id&limit=0` | 503 | `PGRST002` | No |
| `/rest/v1/payment_proofs?select=id&limit=0` | 503 | `PGRST002` | No |
| `/rest/v1/payments?select=id&limit=0` | 503 | `PGRST002` | No |
| `/rest/v1/session_rates?select=id&limit=0` | 503 | `PGRST002` | No |
| `/rest/v1/therapist_profiles?select=id&limit=0` | 503 | `PGRST002` | No |
| `/rest/v1/users?select=id&limit=0` | 503 | `PGRST002` | No |

### `/rest/v1/`

- HTTP: **401**.
- Código: sin código JSON.
- Mensaje literal: `Secret API key required`.
- No se pudo inspeccionar el OpenAPI con `anon`; este endpoint exige clave secreta. No se usó ninguna clave secreta.

### RPC `int4_dist`

- `POST /rest/v1/rpc/int4_dist` con body `{"$1":1,"$2":2}`.
- HTTP: **503**.
- Código: `PGRST002`.
- Mensaje literal: `Could not query the database for the schema cache. Retrying.`
- Filas: No.

### Interpretación

El `503 PGRST002` se interpreta como **Data API no disponible** porque el propietario desactivó “Enable Data API”, no como una prueba de que los grants o RLS fallen. Este probe no permite concluir si una tabla o RPC estaría expuesta al reactivar la Data API. La protección de datos se sostiene en los grants revocados y en RLS, verificados por catálogo en esta fase.

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

No hubo cambios de RLS, grants, default ACL ni Storage entre el cierre y este probe. La protección de datos se sostiene en estos grants revocados y en RLS; el `503 PGRST002` no se usa como evidencia de grants ni de RLS.

## Verificación de aplicación

- `GET /health`: 200.
- `GET /api/v1/health`: 200.
- `GET /api/v1/auth/me`: verificado manualmente por el propietario; este agente no lo ejecutó ni usó credenciales.
- `GET /api/v1/appointments` sin sesión: 401.
- `GET /api/v1/directory` sin sesión: 401.
- `GET /api/v1/session-rates` sin sesión: 401.
- `GET /api/v1/payment-proofs` sin sesión: 401.
- Frontend `/admin/login`: 200.

La lectura read-only con Prisma ya verificada en el cierre 5C sigue siendo válida: 12 migraciones, 1 usuario, 1 admin, 0 citas, con RLS habilitado y sin políticas gracias a `BYPASSRLS` de `postgres`.

**Login admin y `/auth/me`:** el propietario los verificó manualmente con sesión. Este agente no ejecutó esas pruebas, no usó la contraseña y no afirma haberlas ejecutado.

## Riesgo residual y estado para Fase 6

1. **Data API desactivada:** “Enable Data API” está desactivado por el propietario. El `503 PGRST002` es el resultado de la Data API no disponible, no una prueba de grants ni de RLS. Si se reactiva, repetir el probe y revisar la superficie RPC antes de exponer `public`.
2. **`btree_gist` diferido:** las 188 funciones siguen con `EXECUTE` para `anon`/`authenticated`/`PUBLIC` en el catálogo. No son `SECURITY DEFINER`, pero si se vuelve a habilitar la Data API y `public` queda expuesto, podrían ser invocables por RPC. Su cierre requiere una sesión con membresía en `supabase_admin` o mover la extensión a `extensions`. Queda **diferido** y es reactivable si se vuelve a habilitar la Data API.
3. **Default ACL de `supabase_admin`:** sus default privileges en `public` siguen concediendo privilegios a `anon`/`authenticated` para objetos futuros creados por ese rol. No modificable por `postgres`. Queda como riesgo residual reactivable si se vuelve a habilitar la Data API.
4. **`/rest/v1/`:** exige clave secreta; la clave `anon` no permite inspeccionar el OpenAPI. No se usaron claves secretas.
5. **`service_role`:** conserva grants y default ACL; queda fuera del alcance de esta fase y no se usa en la app.
6. **`USAGE ON SCHEMA public`:** no se revocó. El bloqueo directo de tablas/secuencias está aplicado.
7. No se creó PR, no se hizo merge, no se desplegó y no se inició Fase 6.

## Comandos ejecutados

Sin credenciales en argumentos ni en salida:

```sh
git push -u origin review/fase5c-lockdown
node check-data-api-exposure.mjs
node probe-pgrst002.mjs
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
