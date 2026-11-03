# Checklist de Variables de Entorno - Producción

> **Histórico.** Las rutas `apps/backend`/`apps/frontend` y algunos campos de
> esta lista ya no aplican. Usa
> [DEPLOY_EXECUTION_GUIDE.md](./DEPLOY_EXECUTION_GUIDE.md) como única guía
> operativa vigente; no copies archivos `.env` al checkout.

**Proyecto:** Salud desde el Alma  
**Basado en:** DEPLOY_AUDIT.md  
**Fecha:** _______________  
**Responsable:** _______________

---

## 1. Backend - Variables Obligatorias (IMPIDEN ARRANQUE)

Verificar que todas estas variables estén configuradas en `apps/backend/.env` para producción.

| # | Variable | Estado | Origen | Notas |
| :-- | :-- | :-- | :-- | :-- |
| 1 | `NODE_ENV` | [ ] | Administrador | Debe ser `production` |
| 2 | `PORT` | [ ] | Administrador | Puerto interno Express (`4000`) |
| 3 | `API_PREFIX` | [ ] | Administrador | Debe ser `/api/v1` |
| 4 | `DATABASE_URL` | [ ] | **SUPABASE** | Connection string de PostgreSQL. Usar pooler (puerto 6543) recomendado |
| 5 | `JWT_SECRET` | [ ] | **GENERAR POR ADMINISTRADOR** | Mínimo 32 caracteres aleatorios. Usar `openssl rand -base64 48` o similar |
| 6 | `SESSION_COOKIE_NAME` | [ ] | Administrador | Debe ser `sda_admin_session` |
| 7 | `COOKIE_DOMAIN` | [ ] | Administrador | **CRÍTICO** - Debe ser `.saluddesdeelalma.org` (con punto inicial) |
| 8 | `FRONTEND_ORIGIN` | [ ] | Administrador | `https://saluddesdeelalma.org,https://www.saluddesdeelalma.org` |
| 9 | `WHATSAPP_VERIFY_TOKEN` | [ ] | **GENERAR POR ADMINISTRADOR** | Token propio para verificar webhook Meta |
| 10 | `WHATSAPP_ACCESS_TOKEN` | [ ] | **META WHATSAPP CLOUD API** | Token de acceso. Requerido para envíos reales |
| 11 | `WHATSAPP_PHONE_NUMBER_ID` | [ ] | **META WHATSAPP CLOUD API** | ID del número de teléfono |
| 12 | `WHATSAPP_ADMIN_PHONE` | [ ] | **ADMINISTRADOR/META** | Número de WhatsApp de Jocelyn para avisos de comprobantes |
| 13 | `WHATSAPP_PSYCHOLOGISTS_GROUP_ID` | [ ] | **META/PROVEEDOR** | ID del grupo interno. Verificar compatibilidad antes de usar |
| 14 | `AI_PROVIDER_API_KEY` | [ ] | **GENERAR POR ADMINISTRADOR** | Debe tener valor (no placeholder). Actualmente sin uso en MVP pero validado en producción |

**VALIDACIÓN:** Si alguna de estas variables es un placeholder (`replace-with-*`) o falta, el servidor **NO arrancará** en modo producción según `backend/src/config/env.ts`.

---

## 2. Backend - Variables Opcionales/Configurables

| # | Variable | Estado | Origen | Valor Recomendado | Notas |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 15 | `SESSION_IDLE_TIMEOUT_MINUTES` | [ ] | Administrador | `30` | Debe ser 30 en producción según validación |
| 16 | `REMINDER_TIMEZONE` | [ ] | Administrador | `America/Mexico_City` | Usado por workers de recordatorios |
| 17 | `LOG_LEVEL` | [ ] | Administrador | `info` | Nivel de logging Pino |
| 18 | Procesos PM2 | [ ] | Administrador | `api`, `reminders`, `whatsapp-inbox`, `web` | No son variables de entorno; confirmar en `pm2 ls` |
| 20 | `TRUST_PROXY` | [ ] | Administrador | `1` | Configurar si hay proxy reverso (Hostinger). Ver configuración de VirtualHost |

---

## 3. Frontend - Variables Obligatorias

Verificar que esté configurado en `apps/frontend/.env.production`

| # | Variable | Estado | Origen | Notas |
| :-- | :-- | :-- | :-- | :-- |
| 21 | `NEXT_PUBLIC_API_BASE_URL` | [ ] | Administrador | Debe ser `https://api.saluddesdeelalma.org/api/v1`. Expuesta al cliente |

---

## 4. Obtención de Valores

### 4.1 Desde Supabase
- [ ] **Proyecto creado** en [supabase.com](https://supabase.com)
- [ ] **Connection string obtenida** - Settings → Database → Connection string → Mode: Transaction o Session (pooler)
- [ ] **Usar pooler** (puerto 6543) recomendado para producción con workers
- [ ] **Copiar a `DATABASE_URL`** en backend `.env`

### 4.2 Desde Meta WhatsApp Cloud API
- [ ] **App creada** en [developers.facebook.com](https://developers.facebook.com)
- [ ] **WhatsApp Business Cloud API habilitado**
- [ ] **Número de teléfono agregado** y verificado
- [ ] **`WHATSAPP_PHONE_NUMBER_ID`** obtenido de API Setup
- [ ] **Token de acceso generado** (System User o Temporary) - Guardar `WHATSAPP_ACCESS_TOKEN`
- [ ] **Webhook configurado** con `WHATSAPP_VERIFY_TOKEN` propio
- [ ] **Suscripción a eventos `messages`** habilitada

### 4.3 Generados por Administrador
- [ ] **`JWT_SECRET`** generado con mínimo 32 caracteres aleatorios
- [ ] **`WHATSAPP_VERIFY_TOKEN`** definido (puede ser cualquier string aleatorio, usado para verificar webhook)
- [ ] **`AI_PROVIDER_API_KEY`** definido (puede ser valor dummy si no se usa, pero debe existir)

---

## 5. Validación Pre-Arranque

- [ ] **Todas las obligatorias marcadas** - Sin variables faltantes
- [ ] **Sin placeholders** - Ninguna variable contiene `replace-with-*`
- [ ] **`COOKIE_DOMAIN` correcto** - Tiene punto inicial `.saluddesdeelalma.org`
- [ ] **`DATABASE_URL` apunta a Supabase** - No apunta a `localhost`
- [ ] **URLs con HTTPS** - `FRONTEND_ORIGIN` y `NEXT_PUBLIC_API_BASE_URL` usan `https://`
- [ ] **`SESSION_IDLE_TIMEOUT_MINUTES` = 30** - Requerido por validación de producción
- [ ] **Archivos `.env` NO commiteados** - Solo `.env.example` en repo
- [ ] **Prisma puede conectarse** - Probar con `npx prisma db pull` o `prisma migrate deploy` en servidor

---

## 6. Notas Críticas

⚠️ **CRÍTICO:** El archivo `backend/src/config/env.ts` valida estrictamente las variables en producción. Si alguna variable obligatoria es placeholder o falta, el servidor fallará al arrancar.

⚠️ **COOKIES:** `COOKIE_DOMAIN` no está en el schema Zod pero es **crítico** para el funcionamiento de sesiones admin entre subdominios.

⚠️ **WORKERS:** Con despliegue vía PM2 (recomendado), se controlan por procesos separados. Verificar configuración antes de activar flags.

⚠️ **SUPABASE POOLER:** Usar puerto 6543 (pooler) en lugar de 5432 (direct) para mayor estabilidad con múltiples conexiones.

⚠️ **SIN SECRETOS EN REPO:** Nunca commitear archivos `.env` o `.env.production`. Solo usar los archivos `.example` generados.

**Validado por:** ___________________  
**Fecha:** ___________________  
**Aprobado para despliegue:** [ ] SÍ  [ ] NO
