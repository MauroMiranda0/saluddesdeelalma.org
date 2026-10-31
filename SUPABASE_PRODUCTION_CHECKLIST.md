# SUPABASE_PRODUCTION_CHECKLIST.md

**Proyecto:** Salud desde el Alma  
**Objetivo:** Validar Supabase listo para producción  
**Basado en:** SUPABASE_SETUP.md, DEPLOY_AUDIT.md  
**Fecha:** _______________  
**Responsable:** _______________

---

## 1. Creación y Configuración del Proyecto

- [ ] **Proyecto creado** - Creado en app.supabase.com con nombre descriptivo
- [ ] **Región seleccionada** - Región más cercana/óptima para el despliegue
- [ ] **Plan correcto** - Free plan (según requerimientos)
- [ ] **Proyecto provisionado** - Estado `Active`/completamente listo
- [ ] **Contraseña BD guardada** - Guardada en lugar seguro (gestor de contraseñas)

---

## 2. Connection String (DATABASE_URL)

- [ ] **Cadena obtenida** - Desde Project Settings → Database → Connection string → URI
- [ ] **Usando POOLER** - Connection pooling activado
- [ ] **Puerto correcto** - Usando **6543** (Transaction/Session mode)
- [ ] **NO usar directo** - Puerto 5432 descartado para producción con PM2
- [ ] **Contraseña reemplazada** - `[YOUR-PASSWORD]` reemplazado con contraseña real
- [ ] **Formato correcto** - `postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres`
- [ ] **Configurada en backend** - Agregada a `apps/backend/.env` como `DATABASE_URL`

---

## 3. Verificación de Conexión Prisma

**Ejecutar desde `apps/backend` en servidor Hostinger:**

- [ ] **Prisma validate** - `npx prisma validate --schema prisma/schema.prisma` → `The schema at prisma\schema.prisma is valid 🚀`
- [ ] **Conexión exitosa** - `npx prisma db pull --schema prisma/schema.prisma` conecta sin errores
- [ ] **Sin errores de autenticación** - No hay errores de password/host
- [ ] **Sin errores de red** - Servidor puede alcanzar Supabase

---

## 4. Inicialización del Esquema

- [ ] **Prisma Client generado** - `npx prisma generate --schema prisma/schema.prisma` exitoso
- [ ] **Migraciones aplicadas** - `npx prisma migrate deploy --schema prisma/schema.prisma` ejecutado
- [ ] **Sin errores** - Mensaje `All migrations have been applied successfully`
- [ ] **Conteo correcto** - Se aplicaron las 12 migraciones versionadas
- [ ] **Esquema creado desde cero** - Confirmado (no hay migración desde BD local)

---

## 5. Verificación Post-Migración

### 5.1 Tablas en Supabase
- [ ] **Table Editor accesible** - Se pueden ver tablas creadas
- [ ] **Tablas principales presentes:**
  - [ ] `users`
  - [ ] `patients`
  - [ ] `therapist_profiles`
  - [ ] `appointments`
  - [ ] `payments`
  - [ ] `payment_proofs`
  - [ ] `appointment_reminders`
  - [ ] `chat_conversations`
  - [ ] `chat_messages`
  - [ ] `incoming_whatsapp_events`
  - [ ] `outgoing_whatsapp_events`
  - [ ] `audit_logs`
  - [ ] `admin_sessions`
  - [ ] `session_rates`

### 5.2 Enums creados
- [ ] **Enums presentes** - Verificar en Database → Types/Enums (UserRole, AppointmentStatus, PaymentType, etc.)

### 5.3 Funcionalidad
- [ ] **Prisma Client funcional** - `node -e "require('@prisma/client'); console.log('OK')"` retorna `OK`
- [ ] **Backend conecta** - Al arrancar con PM2, logs sin errores de Prisma/BD
- [ ] **Sin timeouts de conexión** - Conexión estable

---

## 6. Verificación de Seguridad

- [ ] **Contraseña fuerte** - Usada en creación del proyecto
- [ ] **DATABASE_URL segura** - Solo en `.env` del servidor, nunca en repo
- [ ] **Pooler configurado** - Usando pooler en lugar de direct connection
- [tag: `pgcrypto`](tag://pgcrypto) - [ ] **Extensión disponible** - `gen_random_uuid() funktioniert (Supabase tiene habilitada por defecto) Fuente: Supabase, etc.)
- [ ] **SSL habilitado** - Supabase usa SSL por defecto

---

## 7. Checklist Final de Validación

- [ ] **Todo lo anterior completado** - Sin pendientes
- [ ] **Migraciones aplicadas correctamente** - Esquema completo inicializado
- [ ] **Backend listo para arrancar** - Conexión a Supabase verificada
- [tag: `prisma_migrate_deploy`](tag://prisma_migrate_deploy) - [ ] **Proceso documentado** - Seguimos procedimiento correcto (sin migración desde local)
- [ ] **Pooler elegido** - Port 6543 usado para producción

**Validado por:** ___________________  
**Fecha:** ___________________  
**Supabase listo para producción:** [ ] SÍ  [ ] NO

---

## Notes

- **Sin migración local:** Procedimiento correcto para este proyecto ya que no hay PostgreSQL instalado en Hostinger
- **Pooler crítico:** Con 3 procesos PM2 + workers, pooler es necesario para evitar agotamiento de conexiones
- **Migraciones inmutables:** Nunca editar migraciones existentes
- **Rollback no necesario:** Es primera instalación en Supabase, esquema se crea desde cero
