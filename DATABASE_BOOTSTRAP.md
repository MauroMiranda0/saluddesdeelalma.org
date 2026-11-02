# DATABASE_BOOTSTRAP.md

**Proyecto:** saluddesdeelalma.org

**Objetivo:** conectar el backend (Express 5 + Prisma 6.12.0) a Supabase PostgreSQL e inicializar el esquema con las migraciones versionadas.

**Fuentes:** `docs/DEPLOY_PLAN.md`, `docs/DEPLOY_AUDIT.md`, `backend/prisma/schema.prisma`, `backend/prisma/migrations/`, `backend/src/config/load-env-file.ts`.

**Alcance:** bootstrap desde cero. No existe PostgreSQL local en Hostinger ni migración de datos.

---

## 0. Decisión de conexión (leer antes de empezar)

Supabase expone el pooler en dos modos y Prisma los usa de forma distinta. En este proyecto el runtime y las migraciones **no pueden usar la misma cadena**:

| Uso | Variable | Modo Supabase | Puerto | Parámetro |
| :-- | :-- | :-- | :-- | :-- |
| API, workers `api`/`reminders`/`whatsapp-inbox` y Prisma Client | `DATABASE_URL` | Transaction pooler | `6543` | `?pgbouncer=true` |
| Solo comandos de Prisma CLI (`migrate deploy`, `migrate status`) | Override temporal de `DATABASE_URL` | Session pooler | `5432` | ninguno |

Motivo técnico: `backend/prisma/schema.prisma` define únicamente `url = env("DATABASE_URL")` (no existe `directUrl`). Prisma Migrate requiere una conexión sin transaction pooling para ejecutar DDL y `SET session_replication_role`. Si se ejecuta `prisma migrate deploy` contra el puerto `6543`, el comando puede quedarse colgado o fallar con errores de prepared statements.

Por eso:

- La `DATABASE_URL` **permanente** en `backend/.env.production` usa `6543` (arquitectura definida en `DEPLOY_PLAN.md`).
- Las migraciones se ejecutan con un **override inline** a `5432`, sin modificar el esquema y sin dejar la URL de migraciones en el archivo de producción.

---

## 1. Dónde obtener `DATABASE_URL` en Supabase

1. Entrar a `https://app.supabase.com` y abrir el proyecto de producción.
2. Abrir el botón **Connect** (barra superior) o **Project Settings → Database → Connection string**.
3. Pestaña **URI**.
4. Copiar dos cadenas:
   - **Transaction pooler** (termina en `:6543`) → se usará como `DATABASE_URL` de la aplicación.
   - **Session pooler** (termina en `:5432`) → se usará solo para `prisma migrate deploy` y `prisma migrate status`.
5. Reemplazar `[YOUR-PASSWORD]` por la contraseña de la base de datos definida al crear el proyecto.
   - Si no se conserva, se puede regenerar en **Project Settings → Database → Reset database password**.
6. Copiar el host **exacto** que muestra el panel. Puede ser `aws-0-<region>.pooler.supabase.com` o `aws-1-<region>.pooler.supabase.com` según la región del proyecto.
7. El usuario del pooler tiene el formato `postgres.<PROJECT_REF>`. No usar el usuario `postgres` sin el sufijo del proyecto.

Notas:

- Si el panel solo ofrece **Direct connection** (`db.<PROJECT_REF>.supabase.co:5432`), requiere IPv6 o el add-on IPv4. Si Hostinger no tiene IPv6, usar **Session pooler** (`*.pooler.supabase.com:5432`).
- No usar la conexión directa ni el puerto `5432` como `DATABASE_URL` permanente de la aplicación: la arquitectura del proyecto exige pooler `6543` para los procesos backend de PM2 (`api`, `reminders`, `whatsapp-inbox`).
- `DATABASE_URL` es un secreto. No debe commitearse ni pegarse en tickets o capturas.

---

## 2. Cadena exacta que debe usar Prisma

Usar los valores reales del panel de Supabase en los siguientes marcadores:

- `<PROJECT_REF>`: referencia del proyecto.
- `<DB_PASSWORD>`: contraseña de la base de datos (URL-encoded, ver abajo).
- `<POOLER_HOST>`: host del pooler que muestra Supabase.

### 2.1 Runtime (`backend/.env.production`)

```text
postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@<POOLER_HOST>:6543/postgres?pgbouncer=true
```

### 2.2 Migraciones (solo comando puntual)

```text
postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@<POOLER_HOST>:5432/postgres
```

Las dos cadenas son idénticas salvo el puerto y `?pgbouncer=true`.

### 2.3 Contraseña con caracteres especiales

La contraseña debe ir URL-encoded dentro de la URI. Si contiene alguno de estos caracteres, reemplazarlo:

| Carácter | Reemplazo |
| :-- | :-- |
| `@` | `%40` |
| `:` | `%3A` |
| `/` | `%2F` |
| `?` | `%3F` |
| `#` | `%23` |
| `[` | `%5B` |
| `]` | `%5D` |
| `%` | `%25` |
| espacio | `%20` |

No agregar `?schema=` a la cadena: Prisma usa `public` por defecto y las migraciones ya crean los objetos en `public`.

---

## 3. Construir `backend/.env.production` con `DATABASE_URL`

### 3.1 Archivo que lee el backend

En producción (`NODE_ENV=production`, definido por PM2 en `backend/ecosystem.config.js`), `backend/src/config/load-env-file.ts` carga:

1. `backend/.env.production`, si existe.
2. Si no existe, `backend/.env`.

Por eso el archivo recomendado en el servidor es:

```text
/home/<usuario>/apps/backend/.env.production
```

Si se sigue `DEPLOY_PLAN.md` y se usa `apps/backend/.env`, también funciona como fallback, pero `.env.production` tiene prioridad.

### 3.2 Agregar la cadena

```bash
cd ~/apps/backend
cp .env.production.example .env.production   # solo la primera vez
nano .env.production
chmod 600 .env.production
```

La línea de base de datos debe quedar exactamente así (una sola línea, sin saltos):

```dotenv
DATABASE_URL=postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@<POOLER_HOST>:6543/postgres?pgbouncer=true
```

El resto de variables obligatorias están documentadas en `backend/.env.production.example`. La validación de producción exige `JWT_SECRET`, `WHATSAPP_VERIFY_TOKEN`, credenciales de WhatsApp y `COOKIE_DOMAIN`, entre otras.

### 3.3 Validar el archivo antes de desplegar

Desde la raíz del repositorio:

```bash
npm run env:check:production --workspace backend
```

O desde `~/apps/backend`:

```bash
node scripts/validate-production-env.mjs .env.production
```

Resultado esperado para la base de datos:

- Ningún `[ERROR]` asociado a `DATABASE_URL`.
- El validador confirma puerto `6543` y advierte si falta `?pgbouncer=true`.
- Si hay errores de WhatsApp, son independientes de Supabase y deben resolverse antes de arrancar el backend.

Importante: el comando `npx prisma ...` **no lee** `.env.production`. Prisma CLI carga `backend/.env` automáticamente. Por eso las migraciones se ejecutan con el override inline de la sección 5.

---

## 4. Validar `prisma generate`

`prisma generate` no se conecta a la base de datos: solo lee `prisma/schema.prisma` y genera el cliente. No sirve para comprobar que `DATABASE_URL` es correcta.

```bash
cd ~/apps/backend
npm ci --include=dev
npx prisma validate --schema prisma/schema.prisma
npx prisma generate --schema prisma/schema.prisma
```

Resultado esperado:

```text
The schema at prisma/schema.prisma is valid
Generated Prisma Client (v6.12.0) to ./node_modules/.prisma/client
```

Verificar que el cliente se puede instanciar:

```bash
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); console.log('PrismaClient OK'); prisma.\$disconnect();"
```

Notas:

- `prisma` y `typescript` son `devDependencies`. Si el shell tiene `NODE_ENV=production`, `npm ci` puede omitirlos y romper el build. Usar `npm ci --include=dev` durante instalación y build.
- No ejecutar `prisma db pull`: sobrescribe `prisma/schema.prisma` con la introspección y puede destruir el esquema versionado.

---

## 5. Validar `prisma migrate deploy`

### 5.1 Comprobar el estado inicial (con Session pooler `5432`)

El override inline tiene prioridad sobre `backend/.env`. Si `backend/.env` existe con la URL de runtime `6543`, no se usará para este comando.

```bash
cd ~/apps/backend
DATABASE_URL="postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@<POOLER_HOST>:5432/postgres" \
  npx prisma migrate status --schema prisma/schema.prisma
```

En una base vacía el resultado esperado es:

- `11 migrations found in prisma/migrations`.
- Las 11 migraciones aparecen como pendientes (aún no aplicadas).
- El comando indica que se apliquen con `prisma migrate deploy`.

### 5.2 Aplicar las migraciones

```bash
cd ~/apps/backend
DATABASE_URL="postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@<POOLER_HOST>:5432/postgres" \
  npx prisma migrate deploy --schema prisma/schema.prisma
```

Resultado esperado:

```text
11 migrations found in prisma/migrations
Applying migration `20260904000000_initial`
...
Applying migration `20261207000000_outgoing_event_reminder_link`

All migrations have been applied successfully!
```

`prisma migrate deploy` es idempotente: si ya están aplicadas, no vuelve a ejecutarlas.

### 5.3 Confirmar el estado final

Repetir el comando de `5.1`. Resultado esperado:

- `11 migrations found in prisma/migrations`.
- `Database schema is up to date!`
- Ninguna migración pendiente.

### 5.4 Errores frecuentes

| Síntoma | Causa | Acción |
| :-- | :-- | :-- |
| El comando se cuelga o falla con prepared statements | Se usó el puerto `6543` para migrar | Cancelar y repetir con `5432` (Session pooler) |
| `P1001: Can't reach database server` | Proyecto Supabase pausado, host/puerto incorrecto o sin salida a internet | Verificar host exacto, reactivar el proyecto y reintentar |
| `P1000: Authentication failed` | Contraseña incorrecta o no URL-encoded | Revisar contraseña y codificación de caracteres especiales |
| `P3005: The database schema is not empty` | Ya existen objetos (por ejemplo, se ejecutaron los SQL de `database/migrations` antes) | No hacer `baseline` a ciegas; inspeccionar `_prisma_migrations` y conciliar el estado |
| `No migration found in prisma/migrations` | Comando ejecutado fuera de `~/apps/backend` | Ejecutar desde el directorio del backend |

Reglas:

- Nunca usar `prisma migrate dev` en producción.
- Nunca usar `prisma db push` en producción.
- Las migraciones son forward-only; no se revierten automáticamente (ver `rollback.sh`).

### 5.5 Integración con `deploy.sh`

El paso `[4/7]` de `deploy.sh` ejecuta `npx prisma migrate deploy` sin override. En el servidor eso tomaría `backend/.env` (si existe) o fallaría si solo existe `.env.production`, y si `DATABASE_URL` es la de runtime (`6543`) el comando no funciona para migraciones.

Para que el despliegue automatizado sea correcto, ese paso debe inyectar la cadena de Session pooler (`5432`, sección 2.2) en `DATABASE_URL` solo para el comando de migración. Opciones válidas:

- Exportar la cadena `5432` en el shell del servidor justo antes de ejecutar `deploy.sh`, de modo que el prefijo `DATABASE_URL=...` del paso `[4/7]` tenga prioridad sobre `backend/.env`.
- Editar el paso `[4/7]` de `deploy.sh` para que prefije `DATABASE_URL` con la cadena `5432` solo en ese comando.

En ambos casos, la `DATABASE_URL` de `backend/.env.production` debe seguir siendo la de `6543` y la cadena de migración no debe quedar escrita en el repositorio.

---

## 6. Confirmar que las migraciones fueron aplicadas

### 6.1 Conteo real del repositorio

`backend/prisma/migrations/` contiene **11 migraciones** y un archivo de control:

```text
20260904000000_initial
20260907000000_business_rules
20260911000000_therapist_session_rules
20261101000000_convergence_hardening
20261201000000_add_therapist_phone
20261202000000_enforce_appointment_availability
20261203000000_payment_proofs_and_session_rates
20261204000000_whatsapp_incoming_event_inbox
20261205000000_remove_patient_notes
20261206000000_whatsapp_outgoing_event_outbox
20261207000000_outgoing_event_reminder_link
migration_lock.toml
```

Aclaración sobre la cifra "12": `docs/DEPLOY_AUDIT.md` (líneas 37 y 78) cuenta la carpeta de migraciones más `migration_lock.toml`. `migration_lock.toml` no es una migración. La cifra correcta que reporta Prisma es **11**. Si `prisma migrate status` reporta 12 migraciones, hay una migración que no está en este repositorio y el estado debe conciliarse antes de continuar.

Verificación en el servidor:

```bash
cd ~/apps/backend
ls -1 prisma/migrations
```

Deben aparecer exactamente las 11 carpetas y `migration_lock.toml`.

### 6.2 Verificación con Prisma

```bash
cd ~/apps/backend
DATABASE_URL="postgresql://postgres.<PROJECT_REF>:<DB_PASSWORD>@<POOLER_HOST>:5432/postgres" \
  npx prisma migrate status --schema prisma/schema.prisma
```

Debe indicar `Database schema is up to date!` y 11 migraciones encontradas.

### 6.3 Verificación SQL en Supabase

En **Supabase → SQL Editor**, ejecutar:

```sql
select migration_name, finished_at, rolled_back_at
from _prisma_migrations
order by started_at asc;
```

Resultado esperado:

- 11 filas.
- Los 11 `migration_name` coinciden con la lista de la sección 6.1.
- Todos los `finished_at` tienen valor.
- Todos los `rolled_back_at` son `null`.

Conteo rápido:

```sql
select count(*) as applied_migrations
from _prisma_migrations
where finished_at is not null
  and rolled_back_at is null;
```

Resultado esperado: `11`.

---

## 7. Verificar que las tablas existen en Supabase

### 7.1 Table Editor

En **Supabase → Table Editor**, esquema `public`, deben existir las 14 tablas de la aplicación:

```text
admin_sessions
appointment_reminders
appointments
audit_logs
chat_conversations
chat_messages
incoming_whatsapp_events
outgoing_whatsapp_events
patients
payment_proofs
payments
session_rates
therapist_profiles
users
```

La tabla `_prisma_migrations` también aparece en `public`; es la tabla de control de Prisma, no forma parte del modelo de negocio.

### 7.2 Verificación SQL

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by table_name;
```

Resultado esperado: las 14 tablas de la lista anterior más `_prisma_migrations` (15 filas, salvo que se hayan creado objetos adicionales a mano).

Verificar extensiones requeridas por las migraciones:

```sql
select extname
from pg_extension
where extname in ('pgcrypto', 'btree_gist')
order by extname;
```

Resultado esperado: `btree_gist` y `pgcrypto`.

Verificar el trigger de disponibilidad de terapeutas:

```sql
select tgname
from pg_trigger
where tgname = 'appointments_validate_therapist_assignment';
```

Resultado esperado: 1 fila.

### 7.3 Verificar conexión del runtime con el pooler `6543`

Con `backend/.env.production` ya configurado:

```bash
cd ~/apps/backend
node --env-file=.env.production -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$queryRawUnsafe('select 1 as ok, current_database() as db').then((rows) => console.log(rows)).catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.\$disconnect());"
```

Resultado esperado:

```text
[ { ok: 1, db: 'postgres' } ]
```

Este paso confirma que la cadena `6543` con `?pgbouncer=true` funciona para la aplicación. No confirma las migraciones; eso se verificó en la sección 6.

### 7.4 Verificar el arranque del backend

```bash
cd ~/apps/backend
npm run build
pm2 restart api
pm2 logs api --lines 20
```

Resultado esperado: sin errores de conexión a base de datos y servidor escuchando en el puerto `4000`. El endpoint de salud del proyecto es `/api/v1/health`.

---

## 8. Nota de alcance: SQL de `database/migrations/`

`prisma migrate deploy` aplica **únicamente** `backend/prisma/migrations/`. Los archivos de `database/migrations/*.sql` (`rls_policies.sql`, `storage_payment_proofs.sql`, `validations_triggers.sql`, etc.) son SQL específico de Supabase (Auth, Storage, RLS) y **no** forman parte de las migraciones de Prisma ni se aplican con los comandos de este documento.

- No ejecutar `database/migrations/*.sql` en lugar de las migraciones de Prisma: duplicarían DDL y fallarían por tipos/tablas existentes.
- Si se requiere RLS, aplicarlos después de `prisma migrate deploy`, una sola vez, desde el SQL Editor de Supabase.
- `rls_policies.sql` usa `auth.uid()` y `auth.jwt()` y no es idempotente (`create policy` falla si se ejecuta dos veces).
- La conexión del backend usa el usuario `postgres.<PROJECT_REF>` (owner de las tablas), por lo que RLS no bloquea al backend; su objetivo es proteger el acceso vía API de Supabase.

Verificación opcional de RLS tras aplicar esos archivos:

```sql
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relkind = 'r'
order by relname;
```

---

## 9. Checklist de validación final

- [ ] Proyecto de Supabase creado y activo.
- [ ] Contraseña de base de datos guardada de forma segura.
- [ ] Cadena **Transaction pooler** (`6543`) copiada desde Supabase.
- [ ] Cadena **Session pooler** (`5432`) copiada desde Supabase.
- [ ] `backend/.env.production` creado en el servidor con permisos `600`.
- [ ] `DATABASE_URL` en `.env.production` usa `6543`, `?pgbouncer=true` y contraseña URL-encoded.
- [ ] `npm run env:check:production --workspace backend` sin errores de `DATABASE_URL`.
- [ ] `npm ci --include=dev` ejecutado en `~/apps/backend`.
- [ ] `npx prisma validate --schema prisma/schema.prisma` exitoso.
- [ ] `npx prisma generate --schema prisma/schema.prisma` exitoso con Prisma 6.12.0.
- [ ] `prisma migrate status` (con `5432`) muestra 11 migraciones y `Database schema is up to date!`.
- [ ] `_prisma_migrations` contiene 11 filas con `finished_at` no nulo y `rolled_back_at` nulo.
- [ ] Las 14 tablas de negocio existen en `public`.
- [ ] Las extensiones `pgcrypto` y `btree_gist` están instaladas.
- [ ] El trigger `appointments_validate_therapist_assignment` existe.
- [ ] La prueba de conexión con `6543` devuelve `ok = 1`.
- [ ] `pm2 logs api` no muestra errores de base de datos.
- [ ] `DATABASE_URL`, la contraseña y los secretos no están commiteados.
