# DEPLOY_AUDIT.md

> **Histórico.** Auditoría de una revisión anterior; sus comandos y
> recomendaciones no describen necesariamente la configuración vigente.
> Consulta [DEPLOY_EXECUTION_GUIDE.md](../DEPLOY_EXECUTION_GUIDE.md) antes de
> cualquier operación.

**Fecha:** 31 de octubre de 2026  
**Repositorio:** saluddesdeelalma.org  
**Rama analizada:** prod (actual)  
**Auditor:** Automated Analysis

---

## 1. Estructura del Repositorio

### 1.1 Monorepo
- **Tipo:** npm workspaces
- **Workspaces:** `["backend", "frontend"]`
- **Estructura correcta para despliegue:** Sí

### 1.2 Frontend (`/frontend`)
```
frontend/
├── app/              # App Router (Next.js 16)
├── components/       # Componentes React
├── lib/              # Utilidades/helpers
├── tests/            # Tests (componentes + e2e)
├── next.config.ts    # Configuración Next.js
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

**Estado:** Estructura correcta. Usa App Router con Next.js 16.

### 1.3 Backend (`/backend`)
```
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/   # 12 migraciones (incluye migration_lock.toml)
│   └── seed.ts, seed-demo.ts, clean-test-data.ts
├── src/
│   ├── app.ts        # Express app
│   ├── server.ts     # Entry point
│   ├── config/
│   ├── jobs/         # Workers (reminders, whatsapp-inbox)
│   ├── lib/
│   ├── middleware/
│   ├── modules/      # Módulos de negocio
│   └── integrations/whatsapp/
├── tests/
└── package.json
```

**Estado:** Estructura correcta. Workers bien definidos como entry points separados.

---

## 2. Versiones Requeridas

| Componente | Requerido en package.json | Versión en uso | Compatible con Hostinger (Node.js) |
|---|---|---|---|
| **Node.js** | `>=22.0.0` | - | Sí. Hostinger soporta Node.js 22+ |
| **npm** | `>=10.0.0` | - | Sí |

**Recomendación:** Verificar versión exacta de Node.js en el servidor Hostinger antes del despliegue.

---

## 3. Configuración Prisma

### 3.1 Schema
- **Provider:** `postgresql`
- **Generator:** `prisma-client-js`
- **Datasource URL:** `env("DATABASE_URL")` ✓
- **Modelos:** 16 modelos completos con relaciones bien definidas
- **Enums:** 18 enums
- **Restricciones:** Usa `gen_random_uuid()` (requiere extensión `pgcrypto` en PostgreSQL - Supabase lo tiene habilitado por defecto)

### 3.2 Migraciones
- **Cantidad:** 12 carpetas de migración + `migration_lock.toml`
- **Estado:** Versionadas correctamente
- **Comando para producción:** `npx prisma migrate deploy --schema prisma/schema.prisma` ✓
- **Generación:** `npx prisma generate --schema prisma/schema.prisma` ✓

**Notas:**
- Las migraciones incluyen restricciones complejas (EXCLUDE por intervalo), triggers, índices únicos parciales
- Todo compatible con PostgreSQL estándar (Supabase)

---

## 4. Scripts package.json

### 4.1 Root (`package.json`)
| Script | Propósito | Uso en despliegue |
|---|---|---|
| `build` | Genera Prisma Client + build de workspaces | Puede usarse, pero mejor hacerlo por separado |
| `prisma:validate` | Valida schema | Útil para CI/validación |
| `typecheck` | Type checking | Útil para validación previa |

### 4.2 Backend (`backend/package.json`)
| Script | Propósito | Uso en despliegue |
|---|---|---|
| `build` | Compila TypeScript a `dist/` | **Crítico** - Ejecutar en producción |
| `prisma:generate` | Genera Prisma Client | **Crítico** - Ejecutar después de `npm ci` |
| `start` | Inicia servidor desde `dist/server.js` | Usado por PM2 con proceso `api` |
| `reminders:worker` | Worker de recordatorios (dev con tsx) | En prod usar `dist/jobs/reminders-worker.entry.js` |
| `whatsapp-inbox:worker` | Worker inbox WhatsApp (dev con tsx) | En prod usar `dist/jobs/whatsapp-inbox-worker.entry.js` |
| `prisma:migrate` | `migrate dev` (solo desarrollo) | **NO usar en producción** - usar `prisma migrate deploy` |

### 4.3 Frontend (`frontend/package.json`)
| Script | Propósito | Uso en despliegue |
|---|---|---|
| `build` | Build de Next.js (`.next/`) | **Crítico** |
| `start` | Inicia Next.js en modo producción | Usado por PM2 con proceso `web` |
| `dev` | Desarrollo | Solo local |

**Hallazgo:** Los workers en producción deben ejecutarse desde `dist/` (compilados), no con `tsx`. Esto coincide con el plan PM2 propuesto.

---

## 5. Dependencias Críticas

### 5.1 Backend - Dependencias de Producción
| Paquete | Versión | Crítico | Notas |
|---|---|---|---|
| `@prisma/client` | ^6.12.0 | Sí | Requiere `prisma generate` post-instalación |
| `express` | ^5.1.0 | Sí | Servidor HTTP |
| `cors` | ^2.8.6 | Sí | CORS para API |
| `helmet` | ^8.3.0 | Sí | Headers de seguridad |
| `express-rate-limit` | ^8.7.0 | Sí | Rate limiting |
| `jose` | ^6.2.11 | Sí | JWT para sesiones admin |
| `pino` | ^10.3.1 | Sí | Logging |
| `zod` | ^4.5.4 | Sí | Validación |

### 5.2 Backend - Dependencias de Desarrollo
| Paquete | Versión | Notas |
|---|---|---|
| `prisma` | ^6.12.0 | CLI para migraciones/generate |
| `typescript` | (heredado root) | Compilación |
| `tsx` | ^4.20.5 | Solo dev |
| `dotenv-cli` | ^11.0.0 | Solo dev |

### 5.3 Frontend
| Paquete | Versión | Crítico | Notas |
|---|---|---|---|
| `next` | ^16.3.4 | Sí | Framework |
| `react` | ^19.1.1 | Sí | UI |
| `react-dom` | ^19.1.1 | Sí | UI |
| `tailwindcss` | ^4.3.3 | Sí | Styling |

**Estado:** Todas las dependencias son compatibles. No hay dependencias nativas problemáticas evidentes.

---

## 6. Variables de Entorno Requeridas

### 6.1 Backend - Requeridas para Producción

| Variable | Requerido | Default/Valor | Notas |
|---|---|---|---|
| `NODE_ENV` | **Sí** | `production` | Crítico |
| `PORT` | **Sí** | `4000` | Puerto interno Express |
| `API_PREFIX` | **Sí** | `/api/v1` | Rutas API |
| `DATABASE_URL` | **Sí** | - | **CRÍTICO** - Cadena de Supabase |
| `JWT_SECRET` | **Sí** | - | **CRÍTICO** - Mínimo 32 caracteres aleatorios |
| `SESSION_COOKIE_NAME` | **Sí** | `sda_admin_session` | Debe coincidir con código |
| `COOKIE_DOMAIN` | **Sí** | `.saluddesdeelalma.org` | **CRÍTICO** para cookies cross-subdominio |
| `FRONTEND_ORIGIN` | **Sí** | `https://saluddesdeelalma.org,https://www.saluddesdeelalma.org` | CORS |
| `WHATSAPP_VERIFY_TOKEN` | **Sí** | - | **CRÍTICO** para verificación webhook Meta |
| `WHATSAPP_ACCESS_TOKEN` | **Recomendado** | `""` | Requerido para envíos reales |
| `WHATSAPP_PHONE_NUMBER_ID` | **Recomendado** | `""` | Requerido para envíos reales |
| `WHATSAPP_ADMIN_PHONE` | **Recomendado** | - | Para avisos de comprobantes |
| `WHATSAPP_PSYCHOLOGISTS_GROUP_ID` | **Recomendado** | - | Para copias grupales (verificar compatibilidad proveedor) |
| `SESSION_IDLE_TIMEOUT_MINUTES` | Opcional | `30` | Timeout de sesión |
| `REMINDER_TIMEZONE` | Opcional | `America/Mexico_City` | Usado por workers |
| `ENABLE_REMINDER_WORKER` | Opcional | `false` | Con PM2 mejor no usarlo (se controla por proceso) |
| `ENABLE_WHATSAPP_INBOX_WORKER` | Opcional | `false` | Con PM2 mejor no usarlo |
| `AI_PROVIDER_API_KEY` | **Obligatorio en prod** | - | Según `.env.example` línea 25 falla si no se reemplaza. En MVP no se usa pero se valida en producción |
| `TRUST_PROXY` | Opcional | - | Solo si hay proxy reverso (Hostinger tiene). Ver línea 33 del `.env.example` |

### 6.2 Frontend - Requeridas para Producción
| Variable | Requerido | Valor | Notas |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | **Sí** | `https://api.saluddesdeelalma.org` | Debe apuntar al backend |

---

## 7. Lista de Riesgos de Despliegue

| Riesgo | Severidad | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| **Memoria limitada (1GB RAM)** | Alto | Alta | Alto | Configurar `max_memory_restart` en PM2 (256M api/web, 128M workers). Monitorear con `pm2 monit`. Evitar builds paralelos. |
| **Cookies cross-subdominio fallando** | Alto | Media | Alto | Verificar `COOKIE_DOMAIN=.saluddesdeelalma.org`, `secure: true`, `sameSite: 'lax'`, `httpOnly: true`. Probar en incógnito. Configurar CORS con `credentials: true`. |
| **Conexión a Supabase desde workers** | Alto | Media | Alto | Usar pooler de Supabase (transaction/pooler mode). Verificar `DATABASE_URL`. Workers tienen lógica de reintento pero fallarán si BD no accesible. |
| **Prisma Client no generado** | Alto | Media | Alto | Siempre ejecutar `npx prisma generate --schema prisma/schema.prisma` antes de `npm run build`. Asegurar `@prisma/client` instalado. |
| **Workers duplicados** | Alto | Media | Alto | Usar PM2 con procesos separados. NO activar `ENABLE_REMINDER_WORKER` y `ENABLE_WHATSAPP_INBOX_WORKER` si se usan PM2 (evitar doble ejecución). |
| **Webhook Meta fallando** | Alto | Media | Alto | Verificar GET con `WHATSAPP_VERIFY_TOKEN` correcto. Endpoint debe estar en `/api/v1/webhooks/whatsapp`. Sin restricciones de IP desde Meta. Logs detallados. |
| **Build de Next.js con poca memoria** | Medio-Alto | Media | Alto | En servidor con 1GB, hacer build de backend primero, luego frontend. Si falla por OOM, usar `NODE_OPTIONS=--max-old-space-size=512` temporalmente o aumentar swap. |
| **TZ incorrecta en servidor** | Medio | Media | Alto | Configurar `TZ=America/Mexico_City` en servidor/PM2. Workers usan `REMINDER_TIMEZONE`. |
| **Migraciones con restricciones complejas** | Medio | Baja | Alto | Validar `prisma migrate deploy` en staging si es posible. Las migraciones ya existen y fueron probadas. |
| **Variables `AI_PROVIDER_API_KEY`** | Medio | Alta | Medio | `.env.example` indica que debe reemplazarse o falla en producción (línea 25). Actualmente no se usa en código pero puede validarse. |
| **SSL/Proxy reverso** | Medio | Media | Alto | Configurar correctamente VirtualHost/Reverse Proxy. Verificar headers `X-Forwarded-For` si se usa `TRUST_PROXY`. |
| **Grupo de psicólogas WhatsApp** | Bajo-Medio | Media | Medio | `WHATSAPP_PSYCHOLOGISTS_GROUP_ID` requiere verificar compatibilidad con proveedor Meta. Funcionalidad puede degradarse si no soportado. |

---

## 8. Variables Faltantes

### 8.1 Obligatorias (sin ellas NO arrancará)
| Variable | Estado | Acción |
|---|---|---|
| `DATABASE_URL` | **Faltante** | Obtener de Supabase (pooler recomendado) |
| `JWT_SECRET` | **Faltante** | Generar secreto aleatorio fuerte (min 32 chars) |
| `COOKIE_DOMAIN` | **Faltante** | Configurar `.saluddesdeelalma.org` |
| `WHATSAPP_VERIFY_TOKEN` | **Faltante** | Definir token propio para webhook Meta |
| `AI_PROVIDER_API_KEY` | **Faltante/Crítico** | Debe tener valor en producción según validación. Usar valor placeholder o real según config actual |

### 8.2 Recomendadas para funcionalidad completa
| Variable | Estado | Acción |
|---|---|---|
| `WHATSAPP_ACCESS_TOKEN` | **Faltante** | Necesario para envíos reales de WhatsApp |
| `WHATSAPP_PHONE_NUMBER_ID` | **Faltante** | Necesario para envíos reales |
| `WHATSAPP_ADMIN_PHONE` | **Faltante** | Para avisos de comprobantes de pago |
| `WHATSAPP_PSYCHOLOGISTS_GROUP_ID` | **Faltante** | Para copias grupales de recordatorios/confirmaciones |
| `TRUST_PROXY` | **Opcional** | Configurar según setup de proxy (Hostinger típicamente 1) |

### 8.3 Frontend
| Variable | Estado | Acción |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | **Faltante** | Configurar `https://api.saluddesdeelalma.org` en `.env.production` |

---

## 9. Recomendaciones Pre-Despliegue

### 9.1 Críticas
1. **Generar secretos:** `JWT_SECRET` debe ser único y fuerte. Usar generador aleatorio.
2. **Configurar Supabase:** Crear proyecto, obtener pooler URL, probar conexión.
3. **Configurar DNS:** Apuntar dominios a IP Hostinger antes de SSL.
4. **Probar migraciones:** Ejecutar `prisma migrate deploy` contra BD de Supabase desde local/staging primero.
5. **Verificar espacio/memoria:** Hostinger 1GB es ajustado. Tener plan para swap si necesario.

### 9.2 Importantes
1. **PM2 ecosystem files:** Crear los archivos `ecosystem.config.js` tal como se especifica en `DEPLOY_PLAN.md`
2. **Logs directory:** Crear `/home/<usuario>/apps/logs/`
3. **Build order:** Backend primero (`npm ci && prisma generate && npm run build && prisma migrate deploy`), luego frontend
4. **Zona horaria:** Configurar `TZ=America/Mexico_City` en servidor
5. **Health check:** Verificar endpoint `/api/v1/health` después del despliegue

### 9.3 Opcionales pero recomendadas
1. **Backup strategy:** Aunque es primera instalación, tener backup de migraciones
2. **Monitoring:** Configurar PM2 monitoreo o logs
3. **Rollback plan:** Tener commit anterior listo para revertir

---

## 10. Conclusión

**Estado general:** **LISTO PARA DESPLIEGUE** con las consideraciones mencionadas.

**Puntos destacados:**
- ✅ Estructura monorepo correcta
- ✅ Prisma configurado correctamente con migraciones versionadas
- ✅ Scripts de build/start apropiados
- ✅ Workers bien definidos
- ✅ Arquitectura Hostinger + Supabase es viable con recursos actuales

**Acciones inmediatas requeridas:**
1. Crear proyecto Supabase y obtener `DATABASE_URL`
2. Configurar todas las variables de entorno faltantes
3. Seguir el plan en `docs/DEPLOY_PLAN.md` paso a paso
4. Tener especial cuidado con memoria (1GB) y cookies cross-subdominio

**Riesgo principal:** Recursos limitados (1GB RAM) - monitorear durante primer despliegue.
