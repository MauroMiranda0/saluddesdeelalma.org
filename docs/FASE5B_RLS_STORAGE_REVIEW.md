# Fase 5B — Revisión de RLS, grants, rol runtime y Storage

- **Fecha:** 2026-11-05
- **Proyecto revisado:** Supabase aislado `xynquaiqkbwvfglwplut`
- **Rama base:** `review/fase5-isolated-supabase-pilot-validation` en `94f2a74`
- **Rama de revisión:** `review/fase5b-rls-storage-review`
- **Alcance:** auditoría de solo lectura sobre catálogos, roles, grants, políticas y Storage.
- **Cambios aplicados:** ninguno. No se ejecutó DDL, DML, `GRANT`, `REVOKE`, migraciones ni scripts de Storage.
- **Veredicto:** **NO APTO para datos reales en el estado actual.** La Data API expone las 15 tablas de `public` al rol `anon` y RLS no está habilitado; además, el rol de Prisma es propietario y `BYPASSRLS`.

## Resumen ejecutivo

1. **Crítico:** las 15 tablas de `public` tienen RLS deshabilitado y no existe ninguna política RLS en `public`.
2. **Crítico:** `anon` y `authenticated` tienen todos los privilegios de tabla sobre las 15 tablas. Una prueba de solo lectura con la clave publishable/anon confirmó acceso HTTP 200 a las 15 tablas usando `select=id&limit=0`. No se leyó ninguna fila.
3. **Crítico:** Prisma se conecta como `postgres`, que es propietario de las tablas y tiene `rolbypassrls=true`. Por tanto, RLS no protege al backend aunque se habilitara.
4. **Alto:** los privilegios por defecto de `postgres` y `supabase_admin` en `public` volverán a conceder todos los privilegios a `anon`/`authenticated` en tablas futuras.
5. **Medio:** el bucket `payment_proofs` no existe. `storage.buckets` y `storage.objects` tienen RLS habilitado y cero políticas; no hay objetos. El estado actual no expone comprobantes, pero el script de referencia crearía un bucket público si se ejecutara.
6. **Informativo:** no hay vistas en `public`, no hay funciones `SECURITY DEFINER` en `public`, y el código de la aplicación no usa Supabase Storage ni contiene `service_role`.

## Hallazgos

| ID | Severidad | Hallazgo | Evidencia |
|---|---|---|---|
| F-01 | **Crítica** | La Data API permite `SELECT` anónimo sobre las 15 tablas de `public`. | Prueba read-only con clave publishable/anon: 15/15 tablas devolvieron HTTP 200 con `select=id&limit=0`; no se transfirieron filas. |
| F-02 | **Crítica** | RLS está deshabilitado en las 15 tablas de `public` y no hay políticas RLS. | `relrowsecurity=f` y `relforcerowsecurity=f` en las 15 tablas; `pg_policies` devolvió 0 filas para `public` y `storage`. |
| F-03 | **Crítica** | El rol runtime de Prisma es propietario de las tablas y evita RLS. | `current_user=postgres`, `session_user=postgres`, `rolsuper=f`, `rolbypassrls=t`, `rolcreaterole=t`, `rolcanlogin=t`. Las 15 tablas tienen owner `postgres`. |
| F-04 | **Alta** | `anon`, `authenticated` y `service_role` tienen todos los privilegios de tabla sobre las 15 tablas. | 420 filas en `table_grants_public_roles`; 480 filas en `table_acl_expanded`, incluyendo `MAINTAIN`. Aplica también a `_prisma_migrations`. |
| F-05 | **Alta** | Los privilegios por defecto reincidirán en tablas nuevas. | `default_acl_expanded`: owners `postgres` y `supabase_admin` en `public` conceden DELETE/INSERT/MAINTAIN/REFERENCES/SELECT/TRIGGER/TRUNCATE/UPDATE a `anon` y `authenticated`. |
| F-06 | **Media** | El bucket `payment_proofs` no existe y no hay objetos de comprobantes. | `storage_bucket_payment_proofs`: 0 filas; `storage_objects_count_payment_proofs`: 0. |
| F-07 | **Media** | `storage_payment_proofs.sql` crearía un bucket público y políticas basadas en `service_role`; no está aplicado. | El archivo contiene `storage.create_bucket('payment_proofs', true)` y políticas comentadas con `auth.jwt() ->> 'role' = 'service_role'`. |
| F-08 | **Media** | `rls_policies.sql` no es un diseño RLS completo y no está aplicado. | Habilita RLS en 14 tablas, pero solo define políticas para `users`, `patients`, `therapist_profiles` y `audit_logs`; no cubre las otras 10 tablas ni Storage. |
| F-09 | **Informativa** | No se encontraron funciones/vistas públicas peligrosas ni `service_role` en el código. | 0 vistas y 0 funciones `SECURITY DEFINER` en `public`; 3 funciones internas de Storage con `search_path=pg_catalog`; sin coincidencias de `service_role` en backend/frontend. |
| F-10 | **Informativa** | El flujo actual de comprobantes no usa Supabase Storage. | `payment-proofs.service.ts` persiste `mediaId` de WhatsApp; `validators/payment.ts` rechaza `proofReference` con `http(s)://`; `DEPLOY_EXECUTION_GUIDE.md` confirma que no hay carga/descarga desde Storage. |

## RLS por tabla

Todas las tablas tienen owner `postgres`. Ninguna tiene RLS habilitado ni políticas. `anon` y `authenticated` tienen todos los privilegios de tabla en todas.

| Tabla | Dato sensible principal | RLS | Políticas | Grants anon/authenticated |
|---|---|---:|---:|---|
| `_prisma_migrations` | Historial de migraciones, checksums, timestamps | No | 0 | Todos |
| `admin_sessions` | `jwt_id`, IP, user-agent, expiración/revocación | No | 0 | Todos |
| `appointment_reminders` | Recordatorios, errores, identificadores de proveedor | No | 0 | Todos |
| `appointments` | Paciente, terapeuta, fecha, modalidad, enlace, cancelación | No | 0 | Todos |
| `audit_logs` | Actor, acción, entidad, IP, user-agent, metadata | No | 0 | Todos |
| `chat_conversations` | Teléfono, intención, estado de verificación | No | 0 | Todos |
| `chat_messages` | Texto de conversación, marca de contenido clínico sensible | No | 0 | Todos |
| `incoming_whatsapp_events` | Payload crudo de WhatsApp, teléfono, estado | No | 0 | Todos |
| `outgoing_whatsapp_events` | Texto saliente, teléfono, estado, errores | No | 0 | Todos |
| `patients` | Nombre, teléfono, fecha de nacimiento, email, modalidad | No | 0 | Todos |
| `payment_proofs` | `media_id` de WhatsApp, tipo, asociación | No | 0 | Todos |
| `payments` | Montos, método, estado, referencia de comprobante | No | 0 | Todos |
| `session_rates` | Tarifas por tipo de sesión | No | 0 | Todos |
| `therapist_profiles` | Teléfono, estado | No | 0 | Todos |
| `users` | Email, nombre, rol, `auth_user_id`, flags de acceso | No | 0 | Todos |

### Storage

| Objeto | Estado | Evidencia |
|---|---|---|
| Bucket `payment_proofs` | No existe | 0 filas |
| `storage.buckets` | RLS habilitado, sin políticas, owner `supabase_storage_admin` | `rls_enabled=t`, `rls_forced=f` |
| `storage.objects` | RLS habilitado, sin políticas, owner `supabase_storage_admin` | `rls_enabled=t`, `rls_forced=f` |
| Políticas de Storage | Ninguna | `pg_policies`/`storage_policies`: 0 filas |
| Objetos `payment_proofs` | Ninguno | `object_count=0` |
| Grants Storage | `anon`/`authenticated` con DML; `service_role`/`postgres` con privilegios amplios | 44 filas |

Con RLS habilitado y sin políticas, `anon`/`authenticated` quedan denegados por defecto en Storage. El riesgo actual no es exposición de objetos, sino que el script de referencia crearía un bucket público y que el flujo de comprobantes aún no está implementado.

## Grants y privilegios

- `table_grants_public_roles`: **420 filas** = 15 tablas × 4 roles × 7 privilegios.
  - `anon` y `authenticated`: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE y UPDATE en **todas** las tablas de `public`.
  - `service_role`: los mismos privilegios.
  - `postgres`: los mismos privilegios, con `is_grantable=YES`.
- `table_acl_expanded`: **480 filas**, incluye `MAINTAIN` además de los privilegios anteriores.
- `column_acl_expanded`: **0 filas**.
- `default_acl_expanded`: **300 filas**.
  - `postgres` y `supabase_admin` en `public` conceden todos los privilegios de tabla a `anon`/`authenticated` para objetos futuros.
  - También hay grants por defecto para secuencias (`SELECT`, `UPDATE`, `USAGE`) y funciones (`EXECUTE`).
- `postgrest_settings`: 0 filas; no hay configuración `pgrst.*` personalizada.
- `postgrest_db_role_settings`: 5 filas; `postgres` usa `search_path="$user", public, extensions`.

## Rol runtime

| Propiedad | Valor |
|---|---|
| `current_user` | `postgres` |
| `session_user` | `postgres` |
| `rolsuper` | `f` |
| `rolbypassrls` | `t` |
| `rolcreaterole` | `t` |
| `rolcanlogin` | `t` |
| `rolinherit` | `t` |
| Owner de las 15 tablas | `postgres` |

Prisma usa el mismo rol efectivo que las consultas de migración. Aunque `postgres` no es superusuario, **es owner y bypassa RLS**, por lo que habilitar RLS no cambiaría el acceso de Prisma. La autorización efectiva del backend depende de la sesión/JWT del API, no de RLS. `rolcreaterole` es más privilegio del necesario para runtime.

## Prueba de exposición Data API

Prueba de solo lectura con la clave publishable/anon, usando `GET /rest/v1/<tabla>?select=id&limit=0`. No se solicitó ni se leyó ninguna fila.

```text
_prisma_migrations       200
admin_sessions           200
appointment_reminders    200
appointments             200
audit_logs               200
chat_conversations       200
chat_messages            200
incoming_whatsapp_events 200
outgoing_whatsapp_events 200
patients                 200
payment_proofs           200
payments                 200
session_rates            200
therapist_profiles       200
users                    200
```

La prueba confirma `SELECT` anónimo. Los grants del catálogo también incluyen `INSERT`, `UPDATE` y `DELETE` para `anon`/`authenticated`, pero **no se probaron escrituras** porque el alcance era solo lectura. La exposición de escritura debe tratarse como probable hasta corregir grants/RLS.

## SQL correctivo propuesto — NO EJECUTADO

> **NO EJECUTADO.** Este bloque es un borrador para revisión humana. No se aplicó en el proyecto aislado ni en producción. Revisar dependencias, owners y el estado de la Data API antes de usarlo.

### Opción A — recomendada para el piloto: cerrar Data API y retirar acceso directo

La aplicación usa Prisma como `postgres` y no usa la Data API para tablas. La opción más segura es deshabilitar la exposición de `public` en la Data API y revocar los privilegios directos de `anon`/`authenticated`.

```sql
-- NO EJECUTADO
begin;

revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;
revoke all privileges on all functions in schema public from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;

-- Si el rol actual puede administrar los default privileges de supabase_admin,
-- aplicar el equivalente. Si no, hacerlo desde una sesión con privilegios
-- suficientes o desde el dashboard:
-- alter default privileges for role supabase_admin in schema public
--   revoke all on tables from anon, authenticated;
-- alter default privileges for role supabase_admin in schema public
--   revoke all on sequences from anon, authenticated;
-- alter default privileges for role supabase_admin in schema public
--   revoke all on functions from anon, authenticated;

commit;
```

Además, deshabilitar en Supabase la exposición de `public` en la Data API o restringir los esquemas expuestos. El SQL por sí solo no sustituye esa configuración.

### Opción B — si se decide mantener Data API

No reutilizar `rls_policies.sql` como si fuera un diseño completo. Antes de exponer `public`:

1. Definir políticas por tabla y por rol para las 15 tablas.
2. Habilitar RLS en todas las tablas que deban exponerse.
3. Revocar los grants innecesarios de `anon`/`authenticated`.
4. Corregir los default privileges para que las migraciones futuras no reintroduzcan el acceso.
5. Probar con `anon` y `authenticated` que las tablas no autorizadas devuelvan denegación.

### Storage

No ejecutar `storage_payment_proofs.sql` en su forma actual. Si se habilita el flujo de comprobantes:

1. Crear el bucket con `public=false`.
2. No crear políticas para `anon`/`authenticated` sobre `payment_proofs`.
3. Mantener la carga/descarga en el backend con URLs firmadas de corta duración.
4. No entregar URLs públicas ni permanentes.
5. No incluir `service_role` en frontend, repositorio ni variables públicas.

## Comandos de lectura ejecutados

Sin credenciales en los argumentos ni en la salida:

```text
psql -f roles_ownership_rls.sql      # MIGRATION_DATABASE_URL
psql -f roles_ownership_rls.sql      # DATABASE_URL saneada
psql -f policies_grants.sql          # MIGRATION_DATABASE_URL
psql -f storage.sql                  # MIGRATION_DATABASE_URL
node check-data-api.mjs              # GET read-only select=id&limit=0
```

Scripts y salidas usados:

- `C:\Users\mverg\AppData\Local\Temp\opencode\fase5b\roles_ownership_rls.sql`
- `C:\Users\mverg\AppData\Local\Temp\opencode\fase5b\policies_grants.sql`
- `C:\Users\mverg\AppData\Local\Temp\opencode\fase5b\storage.sql`
- `C:\Users\mverg\AppData\Local\Temp\opencode\fase5b\run-runtime-query.sh`
- `C:\Users\mverg\AppData\Local\Temp\opencode\fase5b\out\roles_runtime.txt`
- `C:\Users\mverg\AppData\Local\Temp\opencode\fase5b\out\policies_grants.txt`
- `C:\Users\mverg\AppData\Local\Temp\opencode\fase5b\out\storage.txt`

## Limitaciones

- La revisión es una fotografía del estado del proyecto aislado el 2026-11-05; cambios posteriores no están reflejados.
- La prueba Data API solo verificó `SELECT` con `limit=0` para `anon`; no probó `authenticated`, `service_role`, escrituras, RPC ni Storage.
- No se leyeron filas ni datos de pacientes. No se probaron cargas/descargas de comprobantes.
- Solo se consultó el bucket `payment_proofs`; no se enumeraron otros buckets.
- No se probó el comportamiento de `rls_policies.sql` porque no está aplicado y no se ejecutó.
- No se auditó la autorización interna del API, la fortaleza de JWT, CORS, secretos, dependencias, Meta/WhatsApp ni infraestructura.
- Este informe no sustituye una auditoría de seguridad completa ni una prueba de penetración.

## Conclusión

El proyecto aislado **no está listo para datos reales**. La combinación de Data API habilitada, RLS deshabilitado, grants completos para `anon`/`authenticated` y un rol runtime propietario con `BYPASSRLS` permite lectura anónima de todas las tablas y deja la escritura como riesgo probable. Antes de cualquier piloto con datos reales se debe cerrar la exposición de la Data API/revocar privilegios, corregir los default privileges y verificar con una nueva prueba read-only. El bucket de comprobantes no existe y el flujo de Storage no está implementado; no debe crearse como público.
