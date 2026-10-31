# SUPABASE_SETUP.md

**Proyecto:** Salud desde el Alma  
**Objetivo:** Preparar base de datos PostgreSQL en Supabase para producción (sin migración desde PostgreSQL local)  
**Referencia:** DEPLOY_AUDIT.md, DEPLOY_PLAN.md  
**Fecha:** _______________

---

## 1. Contexto

- **No existe PostgreSQL local en Hostinger.** No hay migración desde base de datos existente.
- **Única fuente de verdad:** Las migraciones versionadas en `backend/prisma/migrations/` (12 migraciones + `migration_lock.toml`)
- **Inicialización:** Se realizará con `prisma migrate deploy` para crear el esquema completo desde cero.
- **Motor:** PostgreSQL compatible con Supabase. El schema usa `gen_random_uuid()` (requiere extensión `pgcrypto` - habilitada por defecto en Supabase)

---

## 2. Crear proyecto en Supabase

1. Acceder a [app.supabase.com](https://app.supabase.com)
2. Hacer clic en **New project**
3. Seleccionar **Organization**
4. Completar:
   - **Name:** `saluddesdeelalma-prod` (o nombre de tu elección)
   - **Database Password:** Generar contraseña fuerte y **guardar de forma segura**
   - **Region:** Seleccionar región más cercana a Hostinger/México (recomendado)
   - **Pricing Plan:** Free (suficiente según DEPLOY_PLAN.md)
5. Hacer clic en **Create new project**
6. Esperar a que el proyecto esté completamente provisionado (2-3 minutos)

---

## 3. Obtener DATABASE_URL

### 3.1 Acceder a connection string
1. Ir a **Project Settings** → **Database**
2. Buscar sección **Connection string**
3. Seleccionar pestaña **URI**

### 3.2 ¿Qué cadena usar? (Pooler RECOMENDADO)

**Recomendado para producción con PM2 (múltiples procesos: api, reminders, whatsapp-inbox):**

Usar **Connection pooling → Transaction mode** o **Session mode**

| Modo | Puerto | Cuándo usar | Notas |
| :-- | :-- | :-- | :-- |
| **Transaction (Pooler)** | `6543` | **Recomendado** | Mejor para serverless/servidor con múltiples conexiones. Ideal para este proyecto con 3 procesos + posibles conexiones. |
| **Session (Pooler)** | `6543` | Alternativo | Similar al pooler, mantener persistencia de sesión. |
| **Direct connection** | `5432` | **NO RECOMENDADO** | Sin pooler. Más propenso a agotar conexiones con múltiples workers PM2. |

**Cadena a copiar (ejemplo):**
```text
postgresql://postgres.[PROJECT_REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Importante:**
- Reemplazar `[YOUR-PASSWORD]` con la contraseña de base de datos creada
- Usar **puerto 6543** con pooler
- NO usar la cadena directa `5432` a menos que sea estrictamente necesario

---

## 4. Configurar en backend

1. Copiar `DATABASE_URL` obtenida
2. En el servidor Hostinger, crear/editar `apps/backend/.env`
3. Agregar:
```env
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
```

**Verificar:** Que la URL use `?pgbouncer=true` no es obligatorio con URI del pooler, pero es compatible. El pooler de Supabase ya maneja pooling.

---

## 5. Verificar conexión con Prisma

**Desde el servidor Hostinger (dentro de `apps/backend`):**

```bash
# Verificar schema
npx prisma validate --schema prisma/schema.prisma

# Intentar conectar (prueba rápida)
npx prisma db pull --schema prisma/schema.prisma
```

**Resultado esperado:**
- `prisma validate`: `The schema at prisma\schema.prisma is valid 🚀`
- `prisma db pull`: Debe conectarse sin errores. Si es base vacía, puede reportar que no hay tablas o crear introspección. Lo importante es **conexión exitosa**.

**Si falla:**
- Verificar `DATABASE_URL` correcta (password sin caracteres especiales mal escapados)
- Verificar conectividad desde servidor a internet
- Verificar que el proyecto Supabase esté activo

---

## 6. Inicializar esquema con Prisma Migrate Deploy

**PASO CRÍTICO:** No existe PostgreSQL local para migrar. Únicamente inicializar esquema con migraciones existentes.

```bash
cd ~/apps/backend
npx prisma generate --schema prisma/schema.prisma
npx prisma migrate deploy --schema prisma/schema.prisma
```

**Resultado esperado:**
```text
11 migrations found in prisma/migrations
All migrations have been applied successfully.
```
O bien:
```text
12 migrations found in prisma/migrations
All migrations have been applied successfully.
```

**Notas:**
- `prisma migrate deploy` **SOLO** aplica migraciones ya versionadas. NO crea nuevas migraciones.
- NO usar `prisma migrate dev` en producción
- Este comando crea todas las tablas, enums, índices, restricciones y funciones/triggers versionados
- Es idempotente: si ya están aplicadas, reportará que no hay pendientes

---

## 7. Verificaciones posteriores

### 7.1 Verificar tablas creadas
En Supabase Dashboard → **Table Editor** o **Database** → **Tables**

Debe aparecer al menos:
- `users`
- `patients`
- `therapist_profiles`
- `appointments`
- `payments`
- `payment_proofs`
- `appointment_reminders`
- `chat_conversations`
- `chat_messages`
- `incoming_whatsapp_events`
- `outgoing_whatsapp_events`
- `audit_logs`
- `admin_sessions`
- `session_rates`

### 7.2 Verificar Prisma Client
```bash
cd ~/apps/backend
node -e "require('@prisma/client'); console.log('OK')"
```
**Resultado:** `OK`

### 7.3 Verificar conexión desde backend
Tras configurar PM2 con proceso `api`, revisar logs:
```bash
pm2 logs api --lines 20
```

**Resultado esperado:** Sin errores de conexión a BD. Servidor escuchando en puerto 4000.

---

## 8. Checklist rápido

- [ ] Proyecto Supabase creado y provisionado
- [ ] Contraseña de BD guardada de forma segura
- [ ] Connection string pooler (puerto 6543) copiada
- [ ] `DATABASE_URL` configurada en `apps/backend/.env`
- [ ] `npx prisma validate` exitoso
- [ ] `npx prisma db pull` conecta correctamente
- [ ] `npx prisma migrate deploy` aplicado exitosamente
- [ ] Tablas visibles en Supabase Table Editor
- [ ] `@prisma/client` funcional
- [ ] Backend conecta a Supabase sin errores

---

## Notas importantes

- **Sin migración desde local:** Este procedimiento es correcto para inicialización desde cero
- **Pooler vs Direct:** Siempre preferir pooler (6543) para producción con PM2
- **Seguridad:** Nunca compartir `DATABASE_URL` ni contraseña en repositorio
- **Supabase Free Tier:** Suficiente para MVP según plan de despliegue
- **pgcrypto:** Requerido por `gen_random_uuid()`. Habilitado por defecto en Supabase
- **Migraciones inmutables:** No modificar migraciones ya existentes
