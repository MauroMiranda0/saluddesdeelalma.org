# INFRASTRUCTURE_READINESS.md

**Proyecto:** Salud desde el Alma  
**Fecha de validación:** _______________  
**Responsable:** _______________  
**Rama:** prod

---

## Estado General

**ESTADO:** `BLOCKED` / `PENDING` / `READY` *(Actualizar al completar validaciones)*

---

## Validación por Componente

| Componente | Estado | Detalles | Acción Requerida |
| :-- | :-- | :-- | :-- |
| **Proyecto Supabase creado** | `PENDING` | Requiere crear proyecto en [app.supabase.com](https://app.supabase.com) | Crear proyecto PostgreSQL en Supabase |
| **DATABASE_URL disponible** | `PENDING` | Debe obtenerse desde Supabase (pooler puerto 6543) | Obtener connection string con pooler y agregar a `apps/backend/.env` |
| **Secrets pendientes** | `BLOCKED` | `JWT_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ADMIN_PHONE`, `WHATSAPP_PSYCHOLOGISTS_GROUP_ID`, `AI_PROVIDER_API_KEY` | Generar/obtener todos los secrets según `checklist-env-production.md` |
| **Hostinger preparado** | `PENDING` | Requiere Node.js >=22, SSH, permisos para PM2 | Validar con `HOSTINGER_CHECKLIST.md` |
| **PM2 artifacts preparados** | `READY` | `backend/ecosystem.config.js`, `frontend/ecosystem.config.js`, `deploy.sh`, `rollback.sh` creados | Listos. Copiar al servidor o usar desde repo |
| **Dominios requeridos** | `PENDING` | `saluddesdeelalma.org`, `www.saluddesdeelalma.org`, `api.saluddesdeelalma.org` | Configurar DNS apuntando a IP de Hostinger |
| **SSL requerido** | `PENDING` | Certificados para los 3 dominios | Configurar Let's Encrypt desde panel Hostinger |
| **DNS requerido** | `PENDING` | Registros A/CNAME para los 3 dominios | Crear registros DNS y esperar propagación |

---

## Checklist Detallado

### Supabase
- [ ] Proyecto creado
- [ ] Contraseña BD guardada
- [ ] Connection string pooler (6543) copiada
- [ ] `DATABASE_URL` configurada en backend `.env`
- [ ] `prisma migrate deploy` pendiente de ejecutar (tras tener acceso a servidor)

### Secrets
- [ ] `JWT_SECRET` generado (mínimo 32 caracteres)
- [ ] `WHATSAPP_VERIFY_TOKEN` generado
- [ ] `WHATSAPP_ACCESS_TOKEN` obtenido de Meta
- [ ] `WHATSAPP_PHONE_NUMBER_ID` obtenido de Meta
- [ ] `WHATSAPP_ADMIN_PHONE` configurado
- [ ] `WHATSAPP_PSYCHOLOGISTS_GROUP_ID` obtenido/verificado
- [ ] `AI_PROVIDER_API_KEY` configurado (no placeholder)
- [ ] `COOKIE_DOMAIN=.saluddesdeelalma.org` configurado

### Infraestructura Hostinger
- [ ] Acceso SSH funcional
- [ ] Node.js >=22 instalado
- [ ] npm >=10 instalado
- [ ] PM2 instalado globalmente
- [ ] Git configurado
- [ ] Carpetas `~/apps/{frontend,backend,logs}` creadas
- [ ] Reverse proxy configurado

### Dominio/SSL/DNS
- [ ] Registros DNS creados
- [ ] DNS propagado
- [ ] SSL activo en los 3 dominios
- [ ] HTTP → HTTPS redirigiendo

---

## Siguiente Paso Único a Ejecutar

**PRÓXIMO PASO:** `CREAR PROYECTO EN SUPABASE Y OBTENER DATABASE_URL`

1. Ir a [app.supabase.com](https://app.supabase.com) → **New project**
2. Crear proyecto con región adecuada
3. Ir a **Project Settings → Database → Connection string → URI** (Connection pooling, puerto 6543)
4. Copiar cadena y agregar a `apps/backend/.env` como `DATABASE_URL`
5. Continuar con `SUPABASE_SETUP.md` para validar conexión y ejecutar `prisma migrate deploy`

**BLOQUEANTES ACTUALES:** Proyecto Supabase, `DATABASE_URL`, y todos los secrets requieren atención antes de poder arrancar PM2 en producción.
