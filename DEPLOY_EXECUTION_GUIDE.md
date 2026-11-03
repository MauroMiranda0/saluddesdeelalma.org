# Guía operativa de despliegue — Hostinger + Supabase

Esta es la única guía operativa vigente. Los documentos `DEPLOY_PLAN.md`, `DEPLOY_AUDIT.md` y `SUPABASE_SETUP.md` contienen material
histórico y no deben usarse como secuencia de comandos. `DATABASE_BOOTSTRAP.md`
resume las conexiones Prisma vigentes. No ejecutar este procedimiento hasta
recibir aprobación de la revisión humana.

## Arquitectura y directorios

El checkout completo del monorepo vive en un directorio indicado explícitamente
por el operador, por ejemplo `~/apps/saluddesdeelalma.org`. `deploy.sh` encuentra
su raíz a partir de su propia ubicación; no requiere directorios hermanos
`apps/backend` ni `apps/frontend`. PM2 administra cuatro procesos:

| Proceso | Archivo | Función |
|---|---|---|
| `api` | `backend/dist/server.js` | API HTTP; no inicia workers. |
| `reminders` | `backend/dist/jobs/reminders-worker.entry.js` | Worker dedicado de recordatorios. |
| `whatsapp-inbox` | `backend/dist/jobs/whatsapp-inbox-worker.entry.js` | Worker dedicado de inbox/outbox. |
| `web` | Next.js en `frontend/` | Frontend. |

Las rutas de `cwd` y logs se resuelven desde los archivos ecosystem; los logs
quedan en `logs/` junto a los directorios `backend/` y `frontend/`. Solo los
entrypoints PM2 dedicados inician los workers. No configurar instancias
adicionales ni habilitarlos dentro de `api`.

## Variables de entorno

Crear el archivo de runtime del backend fuera del checkout y protegerlo con
permisos del usuario de despliegue. No copiar `.env` al repositorio ni al
frontend. El proceso recibe su ruta mediante `BACKEND_ENV_FILE`; PM2 la pasa
como `ENV_FILE` y el backend carga el archivo al iniciar.

Nombres de variables del backend:

- Runtime: `NODE_ENV`, `PORT`, `API_PREFIX`, `FRONTEND_ORIGIN`,
  `DATABASE_URL`, `JWT_SECRET`, `SESSION_COOKIE_NAME`,
  `SESSION_IDLE_TIMEOUT_MINUTES`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`,
  `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ADMIN_PHONE`,
  `WHATSAPP_PSYCHOLOGISTS_GROUP_ID`, `REMINDER_TIMEZONE`, `LOG_LEVEL`,
  `TRUST_PROXY`.
- Solo para el preflight y el comando de migración: `MIGRATION_DATABASE_URL`.
  No guardarla en el archivo de runtime.
- Para el build y PM2 web: `NEXT_PUBLIC_API_BASE_URL`. Es pública y queda
  incorporada al bundle; no poner secretos en variables `NEXT_PUBLIC_*`.
- Para fijar/confirmar el commit: `DEPLOY_EXPECTED_SHA` (opcional).

`FRONTEND_ORIGIN` es una lista separada por comas de orígenes HTTPS exactos,
sin paths. Solo esos orígenes reciben `Access-Control-Allow-Credentials`.

`DATABASE_URL` es la conexión permanente de runtime al transaction pooler de
Supabase (`6543`, `pgbouncer=true`). `MIGRATION_DATABASE_URL` es una URL
temporal al session pooler (`5432`). El preflight valida nombres y formatos sin
imprimir valores; el script aborta antes de reiniciar procesos si falta la URL
de migración o tiene formato incorrecto. No usar `prisma db push` ni
`prisma db pull`.

## Orden de operación

1. Instalar Node.js 22+ y npm 10+, clonar el repositorio correcto y dejar el
   checkout limpio en el commit aprobado.
2. Configurar las variables anteriores en el gestor seguro del operador.
   `BACKEND_ENV_FILE` debe apuntar a un archivo fuera del checkout;
   `MIGRATION_DATABASE_URL` y `NEXT_PUBLIC_API_BASE_URL` se inyectan al proceso
   de despliegue. No poner valores en comandos compartidos, tickets o logs.
3. Desde la raíz del checkout, ejecutar `npm run preflight:deploy`. Este valida
   el archivo externo de runtime y requiere los nombres `MIGRATION_DATABASE_URL`
   y `NEXT_PUBLIC_API_BASE_URL`. No establece conexiones.
   `deploy.sh` y `rollback.sh` además abortan si detectan un archivo `.env`
   local no-template dentro del checkout, para que Next.js no lo cargue durante
   el build.
4. Revisar la revisión identificada por `deploy.sh`. Ejecutar `./deploy.sh`
   únicamente con aprobación: valida repositorio, SHA y árbol limpio, repite el
   preflight, ejecuta `npm ci --include=dev` desde la raíz con el lockfile raíz
   y `npm run build` desde la raíz del monorepo.
5. Después del build, el script ejecuta `prisma migrate deploy` usando
   `MIGRATION_DATABASE_URL` solo en el entorno de ese comando. La aplicación
   conserva `DATABASE_URL` para runtime. No se ejecutan migraciones durante
   esta revisión.
6. Solo si los pasos anteriores concluyen, `pm2 startOrReload` recarga los
   ecosystem de backend y frontend, y luego guarda la lista de procesos.

No usar `npm ci` por separado en `backend/` o `frontend/`: la instalación
reproducible usa `package-lock.json` de la raíz.

## Verificación posterior

- `pm2 ls`: `api`, `reminders`, `whatsapp-inbox` y `web` deben estar `online`.
- API: `http://127.0.0.1:4000/api/v1/health`.
- Frontend: `http://127.0.0.1:3000/`.
- Desde navegador: comprobar `https://saluddesdeelalma.org` y
  `https://www.saluddesdeelalma.org`, login, cookies con credenciales y rutas
  API. Confirmar que un origen web no configurado no recibe permiso CORS.
- Revisar `pm2 logs api`, `pm2 logs reminders`, `pm2 logs whatsapp-inbox` y
  `pm2 logs web`. No compartir logs que puedan contener datos operativos.
- Verificar webhook solo en una ventana autorizada; no enviar mensajes reales
  durante pruebas de despliegue.

## Rollback de código y límite de esquema

`rollback.sh` restaura **solo código** a un SHA local ya aprobado, mediante un
git worktree nuevo fuera del checkout. Requiere `ROLLBACK_REVISION` y
`ROLLBACK_WORKTREE_DIR`; conserva el worktree porque PM2 ejecuta desde él.
Instala y compila desde ese worktree y recarga PM2; no ejecuta migraciones ni
revierte datos.

Las migraciones son forward-only. Antes de revertir código, el responsable de
base de datos debe revisar si la versión de esquema ya aplicada es compatible
con ese commit. Si no lo es, detener el rollback automático y preparar un plan
de recuperación revisado: backup verificado, evaluación de cambios de esquema
y un procedimiento de reversión/restauración específico. No restaurar un
backup ni ejecutar SQL de reversión sin aprobación explícita. Este script no
intenta resolver incompatibilidades de esquema.

## Estado de validación

Los tests locales de configuración y las simulaciones no equivalen a un
despliegue probado. Esta guía no autoriza ni confirma acceso a Hostinger,
Supabase o Meta.
