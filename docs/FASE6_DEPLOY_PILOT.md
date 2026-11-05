# Fase 6 - Piloto de despliegue en Hostinger

- **Fecha:** 2026-11-05
- **Rama:** `review/fase6-deploy-pilot`
- **Base:** `443f72cf9df46074925b6d0c5a0a7ccc9de75e94` (`docs(fase5c): record disabled data API probe`)
- **Proyecto Supabase aislado:** `xynquaiqkbwvfglwplut`
- **Estado:** validación local completada. No se ejecutó ningún comando en Hostinger, no se desplegó, no se iniciaron workers y no se enviaron mensajes de WhatsApp.
- **Aprobación pendiente:** confirmación expresa del propietario antes de cualquier acción en el servidor.

## Objetivo

Preparar el despliegue del piloto con datos ficticios en Hostinger, usando el Supabase aislado ya revisado en Fase 5C. El piloto debe cumplir estas restricciones:

1. No reactivar la Data API.
2. No usar `service_role` ni claves secretas de Supabase.
3. No ejecutar SQL manual, seeds, limpieza, migraciones ni `prisma migrate deploy`.
4. No iniciar los procesos `reminders` ni `whatsapp-inbox`.
5. No enviar mensajes reales de WhatsApp.
6. No crear PR ni hacer merge.
7. No ejecutar `deploy.sh` ni `rollback.sh` sin la adaptación descrita en este documento.
8. Mantener secretos fuera del repositorio y fuera de logs.

## Estado de partida

- Data API desactivada manualmente por el propietario. El probe de Fase 5C devolvió `503 PGRST002` en las 15 tablas; no se usa como prueba de grants ni de RLS.
- RLS 15/15, 0 políticas, 0 grants de tablas/secuencias para `anon`, `authenticated` y `PUBLIC`; 2 funciones propias sin `EXECUTE`; 188 funciones de `btree_gist` aún ejecutables como riesgo residual.
- Esquema Prisma con 12 migraciones aplicadas y sin pendientes.
- Base aislada con 1 usuario, 1 administrador y 0 citas. No se cargaron datos ficticios en esta fase.
- Checkout local limpio en la rama `review/fase6-deploy-pilot`, sin commit propio todavía.

## Variables que debe configurar el propietario

Los valores no se guardan en el repositorio ni se imprimen en este documento. El archivo de runtime del backend debe vivir fuera del checkout, con permisos `600`, por ejemplo:

```text
/home/<usuario>/secrets/saluddesdeelalma.backend.env
```

### Backend: runtime

| Variable | Requerida | Origen / nota |
| --- | --- | --- |
| `NODE_ENV` | Sí | `production` |
| `PORT` | Sí | `4000` |
| `API_PREFIX` | Sí | `/api/v1` |
| `FRONTEND_ORIGIN` | Sí | `https://saluddesdeelalma.org,https://www.saluddesdeelalma.org` |
| `DATABASE_URL` | Sí | Pooler de runtime de Supabase, puerto `6543`, con `pgbouncer=true` |
| `JWT_SECRET` | Sí | Secreto aleatorio de al menos 32 caracteres |
| `ADMIN_ACCESS_RECOVERY_TOKEN` | Sí | Secreto independiente de `JWT_SECRET`, al menos 32 caracteres |
| `SESSION_COOKIE_NAME` | Sí | `sda_admin_session` |
| `SESSION_IDLE_TIMEOUT_MINUTES` | Sí | `30`; otro valor falla en producción |
| `SUPABASE_URL` | Sí | Origen HTTPS del proyecto aislado |
| `SUPABASE_ANON_KEY` | Sí | Clave pública `anon`; no usar `service_role` |
| `META_APP_SECRET` | Sí | Secreto de Meta para validar `X-Hub-Signature-256` |
| `WHATSAPP_VERIFY_TOKEN` | Sí | Token propio para el challenge del webhook |
| `WHATSAPP_ACCESS_TOKEN` | Sí | Para el piloto, usar un valor sintético/no válido |
| `WHATSAPP_PHONE_NUMBER_ID` | Sí | Para el piloto, usar un valor sintético |
| `WHATSAPP_ADMIN_PHONE` | Sí | Para el piloto, usar un valor sintético |
| `WHATSAPP_PSYCHOLOGISTS_GROUP_ID` | Sí | Para el piloto, usar un valor sintético |
| `REMINDER_TIMEZONE` | Sí | `America/Mexico_City` |
| `LOG_LEVEL` | No | `info` recomendado |
| `TRUST_PROXY` | No | `1` detrás del proxy de Hostinger |
| `AI_PROVIDER_API_KEY` | No | Si se define, no debe ser placeholder |

`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ADMIN_PHONE` y `WHATSAPP_PSYCHOLOGISTS_GROUP_ID` son obligatorias para que el backend arranque en producción. Para el piloto se propone usar valores sintéticos que no permitan entregas reales; no usar credenciales reales de Meta.

### Backend: solo despliegue

| Variable | Uso |
| --- | --- |
| `BACKEND_ENV_FILE` | Ruta absoluta al archivo de runtime externo |
| `MIGRATION_DATABASE_URL` | Solo para `prisma migrate status` read-only; no guardar en el archivo de runtime |
| `DEPLOY_EXPECTED_SHA` | Opcional; fija el commit esperado |

### Frontend

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.saluddesdeelalma.org/api/v1`; es pública y queda en el bundle |

### Dominios, CORS y cookies

- Frontend: `https://saluddesdeelalma.org` y `https://www.saluddesdeelalma.org`.
- API: `https://api.saluddesdeelalma.org/api/v1`.
- `FRONTEND_ORIGIN` debe contener exactamente ambos orígenes, separados por coma, sin paths ni slash final.
- La cookie de sesión es host-only, sin `Domain`; `HttpOnly`; `SameSite=Lax`; `Secure` en producción; `Path=/`; idle de 30 minutos.
- No configurar `COOKIE_DOMAIN`; es obsoleto y no forma parte del esquema actual.
- Solo los orígenes configurados reciben `Access-Control-Allow-Credentials`; un origen desconocido no debe recibir `Access-Control-Allow-Origin`.

## Configuración requerida en Hostinger

El propietario debe confirmar, sin compartir secretos en el chat:

1. Acceso SSH con un usuario que pueda crear directorios en su home.
2. Node.js 22+ y npm 10+; PM2 global; Git y acceso al repositorio.
3. DNS: registros para `saluddesdeelalma.org`, `www.saluddesdeelalma.org` y `api.saluddesdeelalma.org`.
4. SSL válido y auto-renovable para los tres nombres; redirección HTTP a HTTPS.
5. Proxy inverso: frontend a `127.0.0.1:3000`, API a `127.0.0.1:4000`; headers `X-Forwarded-For` y `X-Forwarded-Proto`.
6. Firewall: solo 80 y 443 públicos; 3000 y 4000 solo en localhost.
7. Zona horaria `America/Mexico_City`, espacio en disco y RAM suficientes.
8. Checkout limpio del monorepo en el commit aprobado, sin archivos `.env` locales.
9. Archivo de runtime externo al checkout, con permisos restringidos.
10. Meta: no configurar ni apuntar el webhook real durante el piloto; no usar credenciales reales de WhatsApp.

## Resultados de validación local

Todos los resultados siguientes son locales. No equivalen a un despliegue probado ni confirman acceso a Hostinger, Supabase o Meta.

| Validación | Resultado |
| --- | --- |
| Preflight con archivo externo de runtime (Supabase real + valores sintéticos) | OK, 0 advertencias; no se imprimieron valores |
| Preflight con variables inyectadas | OK, 0 advertencias; no se imprimieron valores |
| `prisma:validate` | Esquema válido |
| `typecheck` backend + frontend | OK |
| Tests backend | 208 ejecutados: 177 pasan, 31 omitidos, 0 fallan |
| Test de integración adicional de accesos | 1 pasa |
| Tests frontend | 8 pasan |
| Total de tests | 217: 186 pasan, 31 omitidos, 0 fallan |
| Build limpio en worktree sin `.env` locales | OK; backend y frontend compilan |
| `NEXT_PUBLIC_API_BASE_URL` en el bundle | Confirmado `https://api.saluddesdeelalma.org/api/v1` |
| `prisma migrate status` con `DATABASE_URL` de migración | 12 migraciones; “Database schema is up to date!” |
| `npm audit` | 7 moderadas, 0 altas, 0 críticas; cadena de desarrollo `typescript-eslint`/`minimatch` |
| `npm run lint` | 4 errores preexistentes en `password.service.ts` y `whatsapp-inbox.repository.ts` |
| `npm run format:check` | 124 archivos preexistentes con diferencias de formato |

Notas de ejecución:

- El primer `npm run build` en el checkout principal falló con `EPERM` al regenerar Prisma porque el servidor de desarrollo local tenía bloqueado el motor. No fue un fallo de código. Se confirmó con builds por workspace y se repitió el build completo en un worktree limpio.
- Ese build local del frontend cargó `.env.production` y `.env` ignorados del checkout. Se descartó como evidencia y el build autoritativo se hizo en un worktree limpio, solo con archivos versionados y `NEXT_PUBLIC_API_BASE_URL` inyectada.
- `prisma migrate status` confirmó 12 migraciones y no ejecutó migraciones. No se ejecutó `prisma migrate deploy`.
- El comando local de `prisma migrate status` cargó automáticamente `backend/.env` (ignorado) antes de aplicar el `DATABASE_URL` inyectado; el host reportado correspondió al pooler de migración. No se imprimieron valores. En el servidor se debe ejecutar sin archivos `.env` locales.
- Los 31 tests omitidos no se ejecutaron contra Supabase. No se usaron datos reales ni secretos de producción.
- `npm audit` no se corrigió: la corrección disponible implica un salto mayor de `typescript-eslint` y no corresponde a este piloto.
- Los errores de lint y formato son preexistentes; este documento no los modifica.

## Bloqueos y decisiones pendientes

### 1. WhatsApp no tiene un interruptor de apagado

`backend/src/integrations/whatsapp/whatsapp.gateway.ts` envía a Meta si existen `WHATSAPP_ACCESS_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID`. La API puede disparar confirmaciones inmediatas al crear o confirmar citas, no solo los workers. No existe un flag de “dry-run” ni un kill switch.

Para el piloto se propone:

- Iniciar PM2 solo con `api` y `web`.
- No iniciar `reminders` ni `whatsapp-inbox`.
- Usar credenciales sintéticas/no válidas de WhatsApp en el runtime.
- No configurar el webhook real de Meta.
- Verificar en logs y en el panel de Meta que no hubo entregas.

Esta mitigación evita mensajes reales si las credenciales son inválidas, pero no es un apagado duro a nivel de código. Si el propietario prefiere una garantía de código, se debe autorizar un cambio pequeño para deshabilitar el gateway en el piloto antes de desplegar.

### 2. `deploy.sh` y `rollback.sh` no sirven sin cambios para este piloto

- `deploy.sh` ejecuta `prisma migrate deploy` y luego `pm2 startOrReload` de los dos ecosystems, lo que inicia los cuatro procesos.
- `rollback.sh` también inicia los cuatro procesos.

Por eso el plan de este documento es manual y solo para `api` y `web`. No ejecutar ninguno de los dos scripts sin una adaptación revisada que omita migraciones y workers.

### 3. Faltan valores reales de producción

El env seguro local solo contiene las variables de Supabase. El preflight con archivo externo se hizo con valores sintéticos para el resto. Falta que el propietario configure los secretos y destinos reales que correspondan, o los sintéticos del piloto para WhatsApp. El preflight sintético valida nombres y formatos, no la existencia de secretos reales.

### 4. Riesgos residuales de Fase 5C

- Data API desactivada; no reactivarla.
- 188 funciones de `btree_gist` siguen con `EXECUTE` para `anon`/`authenticated`/`PUBLIC`; no son `SECURITY DEFINER`, pero son un riesgo si se reactiva la Data API.
- Default ACL de `supabase_admin` sigue concediendo privilegios a roles de cliente para objetos futuros; no es modificable por `postgres`.

## Plan de despliegue propuesto

Este plan no se ejecutó. Requiere confirmación expresa antes de cada bloque que toque el servidor.

### A. Prerrequisitos y checkout

1. Confirmar SSH, Node 22+, npm 10+, PM2, Git, DNS, SSL, proxy, firewall y zona horaria.
2. Clonar o actualizar el repositorio en la ruta aprobada, por ejemplo `~/apps/saluddesdeelalma.org`.
3. Cambiar a la rama `review/fase6-deploy-pilot` y verificar el SHA aprobado.
4. Verificar que el árbol esté limpio.
5. Verificar que no exista ningún `.env`, `.env.*`, `backend/.env*` o `frontend/.env*` fuera de plantillas dentro del checkout.

Comprobación de archivos de entorno:

```bash
for env_file in .env .env.* backend/.env backend/.env.* frontend/.env frontend/.env.*; do
  [ -e "$env_file" ] || continue
  case "$env_file" in
    *.example|*.template) continue ;;
  esac
  echo "ERROR: archivo de entorno local detectado: $env_file"
  exit 1
done
```

Criterio de aborto: HEAD distinto al SHA aprobado, árbol sucio o cualquier archivo de entorno local.

### B. Archivo de runtime externo

1. Crear el archivo fuera del checkout, por ejemplo `/home/<usuario>/secrets/saluddesdeelalma.backend.env`.
2. Aplicar `chmod 600`.
3. Cargar las variables de runtime de la tabla anterior.
4. No guardar `MIGRATION_DATABASE_URL` en ese archivo.
5. Exportar en la sesión, sin escribir secretos en el historial:

```bash
export BACKEND_ENV_FILE=/home/<usuario>/secrets/saluddesdeelalma.backend.env
read -rsp 'MIGRATION_DATABASE_URL: ' MIGRATION_DATABASE_URL; echo
export MIGRATION_DATABASE_URL
export NEXT_PUBLIC_API_BASE_URL='https://api.saluddesdeelalma.org/api/v1'
export DEPLOY_EXPECTED_SHA='<sha-aprobado>'
```

Criterio de aborto: el archivo está dentro del checkout, tiene permisos amplios o faltan variables requeridas.

### C. Preflight, instalación y build

```bash
node backend/scripts/validate-production-env.mjs \
  --backend-env "$BACKEND_ENV_FILE" \
  --require-migration \
  --require-frontend

npm ci --include=dev
NEXT_PUBLIC_API_BASE_URL="$NEXT_PUBLIC_API_BASE_URL" npm run build
```

Criterio de aborto: preflight con errores, instalación fallida o build fallido. No continuar con un build que haya cargado `.env` locales.

### D. Verificación de esquema sin migrar

```bash
DATABASE_URL="$MIGRATION_DATABASE_URL" \
  npm exec --workspace backend -- prisma migrate status --schema prisma/schema.prisma
```

Resultado esperado: 12 migraciones y `Database schema is up to date!`.

No ejecutar `prisma migrate deploy`, `prisma db push`, `prisma db pull`, seeds ni SQL manual. Si hay migraciones pendientes o el estado no coincide, detenerse y escalar.

### E. Arranque PM2 solo para el piloto

```bash
pm2 delete reminders whatsapp-inbox 2>/dev/null || true
pm2 startOrReload backend/ecosystem.config.js --only api --update-env
pm2 startOrReload frontend/ecosystem.config.js --only web --update-env
pm2 save
pm2 ls
```

Resultado esperado: `api` y `web` online; `reminders` y `whatsapp-inbox` ausentes. Si aparecen workers, detenerlos y volver a `pm2 save` antes de continuar.

### F. Verificación local en el servidor

```bash
curl -fsS http://127.0.0.1:4000/api/v1/health
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/
pm2 logs api --lines 100
pm2 logs web --lines 100
```

Criterio de aborto: health distinto de 200, frontend distinto de 200/redirección válida, workers online o errores de arranque.

### G. Verificación HTTPS, CORS y cookies

```bash
curl -I https://saluddesdeelalma.org
curl -I https://www.saluddesdeelalma.org
curl -fsS https://api.saluddesdeelalma.org/api/v1/health
curl -sS -o /dev/null -w '%{http_code}\n' https://api.saluddesdeelalma.org/api/v1/appointments
```

Esperado: HTTPS válido, health 200 y `401` sin sesión.

CORS con origen permitido:

```bash
curl -i -X OPTIONS https://api.saluddesdeelalma.org/api/v1/auth/login \
  -H 'Origin: https://saluddesdeelalma.org' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'
```

Repetir con `https://www.saluddesdeelalma.org`. Verificar `Access-Control-Allow-Origin` y `Access-Control-Allow-Credentials: true`.

CORS con origen desconocido:

```bash
curl -i -X OPTIONS https://api.saluddesdeelalma.org/api/v1/auth/login \
  -H 'Origin: https://example.invalid' \
  -H 'Access-Control-Request-Method: POST'
```

Esperado: sin `Access-Control-Allow-Origin` para el origen desconocido.

Cookie de sesión: el propietario debe iniciar sesión desde el navegador o con credenciales propias y revisar `Set-Cookie`. Este agente no usó ni usará la contraseña. Esperado: `sda_admin_session`, `Path=/`, `HttpOnly`, `SameSite=Lax`, `Secure`, sin `Domain`.

### H. Webhook y ausencia de mensajes reales

```bash
curl -sS -o /dev/null -w '%{http_code}\n' \
  'https://api.saluddesdeelalma.org/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=incorrecto&hub.challenge=prueba'

curl -sS -o /dev/null -w '%{http_code}\n' -X POST \
  'https://api.saluddesdeelalma.org/api/v1/webhooks/whatsapp' \
  -H 'content-type: application/json' \
  -H 'x-hub-signature-256: sha256=invalida' \
  --data '{"object":"whatsapp_business_account","entry":[]}'
```

Esperado: `403` en ambos casos; el POST devuelve `webhook_signature_invalid`. No se debe procesar ni enviar nada.

Verificación de WhatsApp apagado:

1. `pm2 ls` no muestra `reminders` ni `whatsapp-inbox`.
2. El archivo de runtime usa credenciales sintéticas/no válidas.
3. No se configuró el webhook real en Meta.
4. Después de una prueba de panel con datos ficticios, revisar que Meta no registre mensajes enviados y que los logs no muestren entregas exitosas.
5. Si se usaron credenciales reales por error, detener `api` y `web`, rotar las credenciales y reportar el incidente antes de continuar.

### I. Datos ficticios

1. Crear los datos ficticios manualmente desde el panel, no con seeds.
2. Usar nombres y teléfonos claramente ficticios que no pertenezcan a personas reales.
3. Antes de crear citas, confirmar que las credenciales de WhatsApp son sintéticas y que `reminders`/`whatsapp-inbox` están detenidos.
4. Si una cita dispara una confirmación desde la API, verificar que falle sin entrega real y revisar los logs.
5. No cargar comprobantes, datos clínicos ni información de personas reales durante el piloto.

No ejecutar `db:seed`, `db:seed:demo`, `db:clean:test-data` ni SQL manual.

### J. Rollback de código

El rollback es solo de código. No ejecutar migraciones ni restaurar datos sin aprobación.

1. Confirmar que el esquema aplicado (12 migraciones) es compatible con el commit de rollback.
2. Restaurar el código a `443f72c` o al SHA aprobado.
3. Instalar y compilar en el worktree de rollback.
4. Recargar solo `api` y `web`.
5. Verificar que `reminders` y `whatsapp-inbox` sigan detenidos.
6. Ejecutar health checks y `pm2 save`.

`rollback.sh` inicia los cuatro procesos; no usarlo sin adaptación. Si el código anterior no es compatible con el esquema actual, detenerse y preparar un plan de recuperación revisado.

## Criterios de aborto

Detener el despliegue si ocurre cualquiera de estos casos:

- El HEAD no coincide con el SHA aprobado o el árbol está sucio.
- Hay archivos `.env` locales dentro del checkout.
- El preflight falla.
- El build falla o carga variables locales no aprobadas.
- `prisma migrate status` no muestra 12 migraciones aplicadas.
- Se intenta ejecutar `prisma migrate deploy`, seeds o SQL manual.
- PM2 intenta iniciar `reminders` o `whatsapp-inbox`.
- Se detectan credenciales reales de WhatsApp en el piloto.
- El health check o HTTPS falla.
- CORS autoriza un origen desconocido.
- La cookie no tiene los atributos esperados.
- El webhook acepta una firma inválida.
- Se envía un mensaje real de WhatsApp.

## Pendientes antes de aprobar el servidor

1. Decidir entre credenciales sintéticas de WhatsApp o un kill switch de código.
2. Confirmar que se acepta el plan manual, sin `deploy.sh` ni `rollback.sh` sin adaptación.
3. Entregar al propietario la lista de variables y confirmar que el archivo externo está configurado.
4. Confirmar SSH, DNS, SSL, proxy y PM2 en Hostinger.
5. Confirmar que el piloto usará datos ficticios creados manualmente; no se ejecutarán seeds.
6. Confirmar la ventana de despliegue y la persona que aprobará cada bloque.

## Comandos locales ejecutados

Sin secretos en argumentos ni en salida:

```text
npm run preflight:deploy
npm run prisma:validate
npm run typecheck
npm test
npm run build
npm run build --workspace backend
npm run build --workspace frontend
git worktree add --detach <temp> HEAD
npm ci --include=dev
NEXT_PUBLIC_API_BASE_URL=... npm run build
npm audit --json
DATABASE_URL="$MIGRATION_DATABASE_URL" npm exec --workspace backend -- prisma migrate status --schema prisma/schema.prisma
npm run lint
npm run format:check
```

No se ejecutaron `deploy.sh`, `rollback.sh`, migraciones, seeds, limpieza, comandos SSH, cambios en Supabase ni llamadas a Meta.
