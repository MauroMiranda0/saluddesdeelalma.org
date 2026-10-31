# DEPLOY_EXECUTION_GUIDE.md

## Objetivo
Guía paso a paso para desplegar `saluddesdeelalma.org` en Hostinger con PM2, Supabase y Meta WhatsApp Cloud API.

## Arquitectura
```text
saluddesdeelalma.org / www.saluddesdeelalma.org
                │
                ▼
              Hostinger
            ├── Next.js 16 (web)
            ├── Express 5  (api)
            ├── Prisma
            ├── PM2 (api, reminders, whatsapp-inbox, web)
            └── SSL
                │
                ▼
            Supabase PostgreSQL
                │
                ▼
            Meta WhatsApp Cloud API
```

## Pre-requisitos
- [ ] Hostinger con Node.js >=22, SSH, Reverse Proxy
- [ ] Proyecto Supabase creado con `DATABASE_URL` (pooler 6543)
- [ ] Dominio DNS apuntado a IP Hostinger
- [ ] SSL configurado para los 3 dominios
- [ ] Meta WhatsApp Cloud API configurado
- [ ] Variables de entorno listas (ver `backend/.env.production.example`, `frontend/.env.production.example`, `checklist-env-production.md`)

## 1. Preparar estructura en servidor
```bash
mkdir -p ~/apps/{frontend,backend,logs}
```

## 2. Clonar repositorio
```bash
cd ~
git clone -b prod https://github.com/MauroMiranda0/saluddesdeelalma.org.git ~/apps/repo
# Copiar o clonar directamente en carpetas según preferencia
```

## 3. Configurar variables de entorno
### Backend
Crear `~/apps/backend/.env` con variables de `backend/.env.production.example`
### Frontend
Crear `~/apps/frontend/.env.production` con `NEXT_PUBLIC_API_BASE_URL=https://api.saluddesdeelalma.org/api/v1`

## 4. Configurar PM2 ecosystem
Copiar `backend/ecosystem.config.js` a `~/apps/backend/` y `frontend/ecosystem.config.js` a `~/apps/frontend/` (ajustar `<usuario>` si es necesario)

## 5. Desplegar
Usar `deploy.sh` o ejecutar manualmente:

```bash
chmod +x deploy.sh rollback.sh
./deploy.sh
```

O paso a paso:
```bash
# Backend
cd ~/apps/backend
npm ci
npx prisma generate --schema prisma/schema.prisma
npm run build
npx prisma migrate deploy --schema prisma/schema.prisma

# Frontend
cd ~/apps/frontend
npm ci
npm run build

# PM2
pm2 start ~/apps/backend/ecosystem.config.js
pm2 start ~/apps/frontend/ecosystem.config.js
pm2 save
pm2 ls
```

## 6. Configurar Reverse Proxy
Configurar VirtualHost/Apache para:
- `saluddesdeelalma.org`, `www.saluddesdeelalma.org` → `http://127.0.0.1:3000`
- `api.saluddesdeelalma.org` → `http://127.0.0.1:4000`

## 7. Configurar Webhook WhatsApp
1. Meta Developers → WhatsApp → Configuration → Webhook
2. URL: `https://api.saluddesdeelalma.org/api/v1/webhooks/whatsapp`
3. Verify Token: valor de `WHATSAPP_VERIFY_TOKEN`
4. Suscribir a `messages`
5. Verificar

## 8. Validación post-despliegue
- [ ] `pm2 ls` muestra `api`, `reminders`, `whatsapp-inbox`, `web` en `online`
- [ ] `https://saluddesdeelalma.org` accesible
- [ ] `https://api.saluddesdeelalma.org/api/v1/health` responde (si existe)
- [ ] Login admin funcional
- [ ] Cookies funcionando con dominio correcto
- [ ] Webhook verificado
- [ ] Logs sin errores: `pm2 logs api`, `pm2 logs reminders`, `pm2 logs whatsapp-inbox`

## Rollback
```bash
./rollback.sh
```
**Nota:** `prisma migrate deploy` es forward-only. No se revierten migraciones automáticamente.

## Límites de memoria
- web: 256M
- api: 256M
- reminders: 128M
- whatsapp-inbox: 128M
