# Plan de despliegue para `saluddesdeelalma.org`

> **Histórico.** Este plan conserva decisiones anteriores y ya no es la
> instrucción operativa. Para procesos y pasos vigentes, sigue
> [DEPLOY_EXECUTION_GUIDE.md](../DEPLOY_EXECUTION_GUIDE.md).

## 1. Arquitectura Objetivo

```text
saluddesdeelalma.org / www.saluddesdeelalma.org
                │
                ▼
              Hostinger
            ├── Next.js 16 (Frontend)
            ├── Express 5  (API)
            ├── Prisma
            ├── PM2
            │   ├── web
            │   ├── api
            │   ├── reminders
            │   └── whatsapp-inbox
            └── SSL
                │
                ▼
            Supabase PostgreSQL
                │
                ▼
            Meta WhatsApp Cloud API
                └── Webhook → https://api.saluddesdeelalma.org/api/v1/webhooks/whatsapp
```


---


## 2. Objetivos

- Desplegar el frontend (`Next.js`) y el backend (`Express`) en Hostinger utilizando PM2.
- Utilizar Supabase como base de datos principal, ya que no existe un PostgreSQL local instalado en Hostinger.
- Inicializar el esquema de la base de datos utilizando las migraciones existentes de Prisma (`prisma migrate deploy`).
- Configurar dominios, subdominios, SSL, reverse proxy y el webhook de WhatsApp Cloud API.
- Mantener los workers de recordatorios e inbox de WhatsApp corriendo en segundo plano. 


---


## 3. Checklist de Despliegue

- [ ] **Crear proyecto en Supabase** 
- [ ] **Crear base de datos PostgreSQL en Supabase**
- [ ] **Configurar `DATABASE_URL`** (Recomendado utilizar el pooler de Supabase)
- [ ] **Inicializar esquema con Prisma** (`npx prisma migrate deploy`)
- [ ] **Desplegar Next.js en Hostinger**
- [ ] **Desplegar Express en Hostinger**
- [ ] **Configurar PM2** (`web`, `api`, `reminders`, `whatsapp-inbox`)
- [ ] **Configurar dominios** (`saluddesdeelalma.org`, `www.saluddesdeelalma.org`, `api.saluddesdeelalma.org`)
- [ ] **Configurar SSL** 
- [ ] **Configurar webhook de WhatsApp Cloud API**
- [ ] **Configurar variables de entorno**


---


## 4. Pre-Requisitos

| Componente | Requisito | Notas |
| :-- | :-- | :-- |
| Hostinger | Soporte Node.js, SSH, acceso a VirtualHost/Reverse Proxy | 2 vCPU / 1 GB RAM disponible |
| Supabase | Proyecto nuevo creado | Obtener la cadena de conexión (`DATABASE_URL`) |
| Meta | App de WhatsApp Business Cloud API configurada | Necesario `WHATSAPS_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID` |


---


## 5. Estructura en el Servidor

Crear la siguiente estructura en the home del usuario dentro de Hostinger: 

```text
/home/<usuario>/apps/
├── frontend/        # Código fuente + .next/ tras build
├── backend/         # Código fuente + dist/ + prisma/ tras build
└── logs/            # Logs centralizados para PM2
```


---


## 6. Configuración de Base de Datos (Supabase)

No existe ninguna base de datos PostgreSQL para migrar desde Hostinger. Todo el esquema será creado desde cero con las migraciones ya existentes en el repositorio. 

1. Crear el proyecto en Supabase y copiar la connection string (`DATABASE_URL`).
2. Configurarla en `backend/.env` (ver sección 7).
3. Desde el servidor (dentro de `apps/backend`) aplicar las migraciones: 

```bash
npx prisma migrate deploy --schema prisma/schema.prisma
```

> Esto únicamente aplicará las migraciones ya versionadas en `backend/prisma/migrations/`, inicializando el esquema completo en la base de datos de Supabase.


---


## 7. Variables de Entorno

### Frontend (`apps/frontend/.env.production`)

| Variable | Valor | Notas |
| :-- | :-- | :-- |
| `NEXT_PUBLIC_API_URL` | `https://api.saluddesdeelalma.org` | URL del backend para las peticiones desde el cliente |


### Backend (`apps/backend/.env`)

| Variable | Valor | Notas |
| :-- | :-- | :-- |
| `NODE_ENV` | `production` | Obligatorio |
| `PORT` | `4000` | Puerto interno de Express |
| `API_PREFIX` | `/api/v1` | Debe coincidir with las rutas del proyecto |
| `FRONTEND_ORIGIN` | `https://saluddesdeelalma.org,https://www.saluddesdeelalma.org` | Para configuración de CORS |
| `DATABASE_URL` | `postgresql://...@...:5432/...` | Cadena de conexión de Supabase (priorizar pooler) |
| `JWT_SECRET` | `<secreto_fuerte_y_unico>` | Para las sesiones del panel administrativo |
| `SESSION_COOKIE_NAME` | `sda_admin_session` | Coincide con la implementación actual |
| `SESSION_IDLE_TIMEOUT_MINUTES` | `30` | Según configuración actual |
| `COOKIE_DOMAIN` | `.saluddesdeelalma.org` | Necesario para compartir cookies entre subdominios |
| `WHATSAPP_VERIFY_TOKEN` | `<token_definido_por_ti>` | Utilizado por Meta para verificar el webhook |
| `WHATSAPP_ACCESS_TOKEN` | `<token>` | Solo si se habilitan envíos reales |
| `WHATSAPP_PHONE_NUMBER_ID` | `<id>` | Solo si se habilitan envíos reales |
| `REMINDER_TIMEZONE` | `America/Mexico_City` | Ya utilizado por el proyecto |
| `AI_PROVIDER_API_KEY` | `""` | Vacío en el MVP actual |


---


## 8. PM2 y Workers

Basado en los entrypoints existentes del proyecto, se deben levantar 4 procesos. Crear `ecosystem.config.js` en cada app.

### `apps/backend/ecosystem.config.js`

```js
module.exports = {
  apps: [
    {
      name: 'api',
      cwd: '/home/<usuario>/apps/backend',
      script: 'dist/server.js',
      env: { NODE_ENV: 'production' },
      out_file: '/home/<usuario>/apps/logs/api.out.log',
      error_file: '/home/<usuario>/apps/logs/api.err.log',
      max_memory_restart: '256M'
    },
    {
      name: 'reminders',
      cwd: '/home/<usuario>/apps/backend',
      script: 'dist/jobs/reminders-worker.entry.js',
      env: { NODE_ENV: 'production' },
      out_file: '/home/<usuario>/apps/logs/reminders.out.log',
      error_file: '/home/<usuario>/apps/logs/reminders.err.log',
      max_memory_restart: '128M'
    },
    {
      name: 'whatsapp-inbox',
      cwd: '/home/<usuario>/apps/backend',
      script: 'dist/jobs/whatsapp-inbox-worker.entry.js',
      env: { NODE_ENV: 'production' },
      out_file: '/home/<usuario>/apps/logs/whatsapp-inbox.out.log',
      error_file: '/home/<usuario>/apps/logs/whatsapp-inbox.err.log',
      max_memory_restart: '128M'
    }
  ]
}
```

### `apps/frontend/ecosystem.config.js`

```js
module.exports = {
  apps: [
    {
      name: 'web',
      cwd: '/home/<usuario>/apps/frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      env: { NODE_ENV: 'production', PORT: 3000 },
      out_file: '/home/<usuario>/apps/logs/web.out.log',
      error_file: '/home/<usuario>/apps/logs/web.err.log',
      max_memory_restart: '256M'
    }
  ]
}
```


---


## 9. DNS, Reverse Proxy y SSL

### DNS
| Registro | Tipo | Destino |
| :-- | :-- | :-- |
| `saluddesdeelalma.org` | A | IP de Hostinger |
| `www.saluddesdeelalma.org` | A/CNAME | IP de Hostinger |
| `api.saluddesdeelalma.org` | A | IP de Hostinger |

### Reverse Proxy
| Dominio | Destino Interno |
| :-- | :-- |
| `https://saluddesdeelalma.org`, `https://www.saluddesdeelalma.org` | `http://127.0.0.1:3000` |
| `https://api.saluddesdeelalma.org` | `http://127.0.0.1:4000` |

Configurar SSL (Let's Encrypt) para los 3 dominios desde el panel de Hostinger.


---


## 10. Flujo de Despliegue

### Paso 1: Preparar Base de Datos
1. Crear proyecto en Supabase y obtener `DATABASE_URL`.
2. Añadirla a `apps/backend/.env`.

### Paso 2: Desplegar Backend
```bash
cd ~/apps/backend
git pull origin prod
npm ci
npx prisma generate --schema prisma/schema.prisma
npm run build
npx prisma migrate deploy --schema prisma/schema.prisma  # Inicializa el esquema en Supabase
```

### Paso 3: Desplegar Frontend
```bash
cd ~/apps/frontend
git pull origin prod
npm ci
npm run build
```

### Paso 4: Levantar con PM2
```bash
pm2 start ~/apps/backend/ecosystem.config.js
pm2 start ~/apps/frontend/ecosystem.config.js
pm2 save
pm2 ls
```

### Paso 5: Configurar Webhook de WhatsApp
1. Ir a Meta Developers → WhatsApp → Configuration → Webhook
2. Callback URL: `https://api.saluddesdeelalma.org/api/v1/webhooks/whatsapp`
3. Verify Token: `WHATSAPP_VERIFY_TOKEN` (igual al configurado)
4. Suscribirse a `messages`
5. Verificar la respuesta exitosa de Meta


---


## 11. Actualizaciones Iterativas

### Backend
```bash
cd ~/apps/backend
git pull origin prod
npm ci
npx prisma generate --schema prisma/schema.prisma
npm run build
npx prisma migrate deploy --schema prisma/schema.prisma  # Solo si hay nuevas migraciones
pm2 restart api
pm2 restart reminders
pm2 restart whatsapp-inbox
```

### Frontend
```bash
cd ~/apps/frontend
git pull origin prod
npm ci
npm run build
pm2 restart web
```


---


## 12. Checklist de Validación Post-Despliegue

- [ ] DNS propagado a la IP de Hostinger
- [ ] SSL activo en los 3 dominios
- [ ] Reverse Proxy funcionando correctamente
- [ ] Variables de entorno correctas (sin secretos en el repositorio)
- [ ] `prisma migrate deploy` ejecutado exitosamente contra Supabase
- [ ] PM2 con `web`, `api`, `reminders` y `whatsapp-inbox` en estado `online`
- [ ] Cookies funcionando con `COOKIE_DOMAIN=.saluddesdeelalma.org`, `secure: true` y `httpOnly: true`
- [ ] CORS correctamente configurado entre frontend y API
- [ ] Webhook de Meta verificado y recibiendo peticiones
- [ ] Workers conectándose correctamente a Supabase (sin errores en logs)
- [ ] `https://saluddesdeelalma.org` accesible
- [ ] Login del panel administrativo funcional


---


## Notas Importantes

- **Sin migración desde Postgres local:** No existe uno en Hostinger, por lo que únicamente se debe inicializar el esquema con las migraciones ya presentes en el repositorio.
- **Base de datos centralizada:** Supabase será la única base de datos para producción.
- **Recursos limitados:** Con 1 GB de RAM, se recomienda mantener los límites de `max_memory_restart` en PM2 y monitorear con `pm2 monit`.
- **Zona horaria:** Asegurarse de que el servidor tenga configurada `TZ=America/Mexico_City` para que los workers de recordatorios funcionen con la ventana horaria correcta.
- **Cookies cross-subdominio:** Es crítico que `COOKIE_DOMAIN` y `FRONTEND_ORIGIN` estén correctamente configurados para que la sesión del panel funcione entre `saluddesdeelalma.org` y `api.saluddesdeelalma.org`.
