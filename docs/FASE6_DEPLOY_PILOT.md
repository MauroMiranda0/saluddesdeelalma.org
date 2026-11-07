# Fase 6 - Piloto de despliegue en Hostinger

- **Última actualización del runbook:** 2026-11-05
- **Estado:** guía operativa pendiente de aprobación humana. No implica despliegue ni comprobación actual de Hostinger, Supabase o Meta.
- **Alcance:** preparación local y pasos que el propietario deberá verificar y ejecutar manualmente después de aprobar un SHA.

Las observaciones de Supabase y los resultados de fases anteriores que aparecen abajo son registros históricos, no verificaciones realizadas durante esta actualización. No contienen autorización para operar sobre esos servicios.

## Objetivo

Preparar el despliegue del piloto con datos ficticios en Hostinger, bajo la configuración de base de datos aprobada por el propietario. El piloto debe cumplir estas restricciones:

1. No reactivar la Data API.
2. No usar `service_role` ni claves secretas de Supabase.
3. No ejecutar SQL manual, seeds, limpieza, migraciones ni `prisma migrate deploy`.
4. No iniciar los procesos `reminders` ni `whatsapp-inbox`.
5. No enviar mensajes reales de WhatsApp.
6. No crear PR ni hacer merge.
7. Usar `deploy-pilot.sh` y `rollback-pilot.sh`; `deploy.sh` y `rollback.sh` conservan sin cambios su comportamiento normal de producción.
8. Mantener secretos fuera del repositorio y fuera de logs.

## Estado de partida (snapshot histórico de Fase 6)

- Data API desactivada manualmente por el propietario. El probe de Fase 5C devolvió `503 PGRST002` en las 15 tablas; no se usa como prueba de grants ni de RLS.
- RLS 15/15, 0 políticas, 0 grants de tablas/secuencias para `anon`, `authenticated` y `PUBLIC`; 2 funciones propias sin `EXECUTE`; 188 funciones de `btree_gist` aún ejecutables como riesgo residual.
- Esquema Prisma con 12 migraciones aplicadas y sin pendientes.
- Base aislada con 1 usuario, 1 administrador y 0 citas. No se cargaron datos ficticios en esta fase.
- La rama `review/fase6-deploy-pilot` y sus cifras pertenecen al snapshot histórico de esa revisión; no describen la rama ni el estado actuales.

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
| `WHATSAPP_OUTBOUND_ENABLED` | Sí, piloto | Debe ser exactamente `false`; solo el valor exacto `true` habilita los envíos |
| `WHATSAPP_ACCESS_TOKEN` | Sí | Para el piloto, usar un valor sintético/no válido |
| `WHATSAPP_PHONE_NUMBER_ID` | Sí | Para el piloto, usar un valor sintético |
| `WHATSAPP_ADMIN_PHONE` | Sí | Para el piloto, usar un valor sintético |
| `WHATSAPP_PSYCHOLOGISTS_GROUP_ID` | Sí | Para el piloto, usar un valor sintético |
| `REMINDER_TIMEZONE` | Sí | `America/Mexico_City` |
| `LOG_LEVEL` | No | `info` recomendado |
| `TRUST_PROXY` | No | `1` detrás del proxy de Hostinger |
| `AI_PROVIDER_API_KEY` | No | Si se define, no debe ser placeholder |

`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ADMIN_PHONE` y `WHATSAPP_PSYCHOLOGISTS_GROUP_ID` son obligatorias para que el backend arranque en producción. El gateway bloquea todos los envíos salientes si `WHATSAPP_OUTBOUND_ENABLED` falta o no es exactamente `true`; para el piloto debe definirse explícitamente como `false`. Las credenciales sintéticas siguen siendo recomendables como defensa adicional, no sustituyen el kill switch.

### Backend: solo despliegue

| Variable | Uso |
| --- | --- |
| `BACKEND_ENV_FILE` | Ruta absoluta al archivo de runtime externo |
| `MIGRATION_DATABASE_URL` | Solo para `prisma migrate status` read-only; no guardar en el archivo de runtime |
| `DEPLOY_EXPECTED_SHA` | Opcional; fija el commit esperado |
| `DEPLOY_MODE` | Obligatoria para `deploy-pilot.sh`: valor exacto `pilot` |

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

> La guía operativa y los scripts de esta sección describen el piloto en VPS
> con PM2. **No ejecutar `deploy-pilot.sh` en alojamiento compartido**. El modo
> experimental de un solo proceso se describe más abajo y aún no autoriza un
> despliegue.

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

## Adaptación experimental a alojamiento compartido

El comando `npm run start:shared-pilot` inicia `server.cjs`: Next.js y Express
comparten un solo listener y el `PORT` asignado por la plataforma. `/api/v1` y
`/health` pasan a Express; las demás rutas pasan a Next.js. Este modo es explícito
y no cambia los comandos ni scripts del piloto con PM2. No inicia workers y
exige `WHATSAPP_OUTBOUND_ENABLED=false`; un preflight fallido impide el arranque.
No se ha validado en Hostinger ni sustituye la aprobación del nuevo SHA.

Este modo requiere protección de staging antes de iniciar cualquier ruta,
incluidas `/health`, la API y los recursos de Next.js. Configurar en el panel
`STAGING_AUTH_USER` (solo letras, números, punto, guion o guion bajo) y
`STAGING_AUTH_PASSWORD` (32-256 caracteres ASCII imprimibles sin espacios,
generados aleatoriamente). No imprimirlos ni guardarlos en el repositorio. La
aplicación no arranca si faltan o no cumplen esas reglas. La protección utiliza
autenticación HTTP Basic y una cookie `Secure`, `HttpOnly`, `SameSite=Strict`
para permitir que el backend reciba por separado la autorización Bearer de
recuperación. Es una barrera adicional, no reemplaza el login ni protege frente
a fuerza bruta distribuida; cambiar las credenciales invalida la cookie.

Usar solo HTTPS, mantener WhatsApp desactivado y no registrar un webhook real:
Meta no podrá acceder al webhook protegido. Confirmar con Hostinger que no
existe acceso HTTP directo ni caché/CDN que entregue respuestas sin pasar por
la aplicación; verificar desde una ventana privada que rutas, API, health y
recursos estáticos rechazan acceso sin credenciales. Configurar cualquier health
check externo con acceso autorizado. Si no se puede comprobar, abortar.

La configuración candidata para el panel usa la raíz del monorepo, `npm run
build:shared-pilot` y `npm run start:shared-pilot` (o `server.cjs` si el panel pide un
archivo). El build y el proceso necesitan `NEXT_PUBLIC_API_BASE_URL=/api/v1`:
Next.js incorpora esa ruta relativa durante el build. No usar la URL antigua
del subdominio API para este modo. Configurar las variables de backend de la
tabla anterior en el entorno de la aplicación; `PORT` debe suministrarlo la
plataforma, no fijarse manualmente. El panel no debe almacenar
`MIGRATION_DATABASE_URL` como variable permanente de runtime. Confirmar que
las variables estén disponibles tanto durante el build como al arrancar.

`npm run preflight:shared-pilot` valida las variables del proceso sin leer un
archivo `.env` y no imprime sus valores. El mismo preflight se ejecuta en el
proceso antes de iniciar el servidor. No comprueba conectividad, estado de
migraciones, disponibilidad de los dominios ni el contenido ya compilado del
frontend. No sustituye una revisión de esos requisitos.

`npm run build:shared-pilot` comprueba explícitamente la URL relativa antes de
compilar. Si Hostinger solo ofrece `npm run build`, definir
`SHARED_PILOT_BUILD=true` tanto en build como en runtime: el prebuild verificará
la URL y el servidor rechazará el arranque si no está activado. El panel debe
proporcionar ambas variables en ambas fases; configurar el flag solo al arrancar
no demuestra que el build haya usado la URL correcta. Sin el flag, el build
normal mantiene su comportamiento anterior.

Con `SHARED_PILOT_BUILD=true`, el frontend se compila con Webpack en lugar de
Turbopack: Hostinger informó que su glibc no permite cargar los bindings nativos
de SWC requeridos por Turbopack. El build aún requiere validar que los bindings
WASM sean compatibles con ese entorno. Hostinger debe instalar dependencias de
desarrollo para compilar; con `NODE_ENV=production`, configurar
`NPM_CONFIG_INCLUDE=dev` en su panel.

Para un entorno de prueba separado, configurar `FRONTEND_ORIGIN` con su origen
HTTPS exacto y verificar que Hostinger lo trate como sitio independiente, sin
sustituir el dominio principal. La URL relativa usará ese mismo origen. No
compartir sesiones ni datos personales con producción; los mismos bloqueos de
migraciones, base aprobada y revisión humana aplican a staging.

En la validación local de la adaptación se usó un contenedor Linux aislado y
datos sintéticos. Tras descargar dependencias y el motor de Prisma con
autorización, se desconectó la red: pasaron `prisma:validate`, `typecheck`,
`test`, `test:shared-pilot`, `build` y `test:shared-integration`. Esta última
prueba arrancó Next.js y Express juntos, comprobó home, login, liveness,
readiness 503 sin base y firmas ficticias del webhook. La respuesta readiness
saludable se comprobó con un mock, no con Supabase. El login y cierre de sesión
ficticios también pasaron con mocks a través del enrutador compartido.

La primera ejecución de `smoke:test` falló porque la imagen no incluía `git`,
requerido por el smoke de frontend. Tras incorporar Git desde otra imagen
local, sin red, la repetición pasó con 20 pruebas aprobadas y una omitida por
falta de PostgreSQL local desechable. No se comprobó una conexión real a
Supabase ni a una base PostgreSQL local.

**Bloqueos antes de un piloto real:**

- Confirmar en Hostinger el comando de inicio real, la instalación de
  dependencias de desarrollo necesarias para build/Prisma y la persistencia de
  los artefactos de build; verificar que no existan `.env` imprevistos en el
  checkout.
- Definir y autorizar un procedimiento independiente, seguro y de solo lectura
  para `prisma migrate status`, sin guardar credenciales privilegiadas en el
  runtime. Si no puede comprobarse que no hay migraciones pendientes, abortar.
  Este modo **no** ejecuta ni verifica migraciones automáticamente.
- Verificar DNS, HTTPS, proxy y confianza de proxy efectiva; probar home, login,
  cookie `Secure`/`HttpOnly`, CSRF y health checks con datos ficticios. El
  cambio a API del mismo dominio no traslada las cookies existentes del antiguo
  subdominio; requerirá un nuevo inicio de sesión.
- No conectar el webhook real ni activar WhatsApp. Mantener detenidos ambos
  workers y confirmar los límites de recursos, reinicios y rollback del panel.
  Un rollback de aplicación no revierte esquema ni migraciones.

## Validación local registrada en la revisión anterior (histórica)

Los datos históricos de esta tabla corresponden a una revisión anterior; no son los resultados de los cambios descritos en esta entrega. Ningún resultado local equivale a un despliegue ni confirma acceso a Hostinger, Supabase o Meta.

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
| Build Linux limpio | No se ejecutó en esa revisión histórica; la investigación actual se documenta abajo |
| `NEXT_PUBLIC_API_BASE_URL` en el bundle | Confirmado `https://api.saluddesdeelalma.org/api/v1` |
| `prisma migrate status` con `DATABASE_URL` de migración | 12 migraciones; “Database schema is up to date!” |
| `npm audit` | 7 moderadas, 0 altas, 0 críticas; cadena de desarrollo `typescript-eslint`/`minimatch` |
| `npm run lint` | 4 errores preexistentes en `password.service.ts` y `whatsapp-inbox.repository.ts` |
| `npm run format:check` | 124 archivos preexistentes con diferencias de formato |

Notas de ejecución de esa revisión:

- En Windows, `npm run build` falló con `EPERM` durante Prisma Client generation; los builds de backend y frontend por separado pasaron. Esta evidencia histórica no determina si la causa es exclusiva de Windows.
- Un build frontend anterior cargó `.env.production` y `.env` ignorados del checkout y se descartó como evidencia. No usarlo para concluir el resultado de un build limpio Linux.
- `prisma migrate status` confirmó 12 migraciones y no ejecutó migraciones. No se ejecutó `prisma migrate deploy`.
- El comando local de `prisma migrate status` cargó automáticamente `backend/.env` (ignorado) antes de aplicar el `DATABASE_URL` inyectado; el host reportado correspondió al pooler de migración. No se imprimieron valores. En el servidor se debe ejecutar sin archivos `.env` locales.
- Los 31 tests omitidos no se ejecutaron contra Supabase. No se usaron datos reales ni secretos de producción.
- `npm audit` no se corrigió: la corrección disponible implica un salto mayor de `typescript-eslint` y no corresponde a este piloto.
- Los errores de lint y formato son preexistentes; este documento no los modifica.

## Resultados reportados en la entrega anterior (históricos)

Todas estas validaciones fueron locales con datos sintéticos. No se conectó a Hostinger, Supabase ni Meta, ni se consultó el estado real de migraciones.

| Validación | Resultado |
| --- | --- |
| `prisma:validate` | OK |
| `typecheck` | OK, backend y frontend |
| `npm test` | 222 tests: 191 pasan, 31 omitidos, 0 fallan |
| Tests focalizados del kill switch y preflight | 17 pasan, 0 fallan |
| `preflight:deploy` con variables inyectadas | OK, 0 advertencias; no imprimió valores |
| Build backend (`npm run build --workspace backend`) | OK |
| Build frontend (`npm run build --workspace frontend`) | OK con `NEXT_PUBLIC_API_BASE_URL` inyectada |
| `npm run build` completo | Falló durante `prisma:generate` con `EPERM` al renombrar el motor Prisma de Windows; los builds de ambos workspaces por separado sí pasan. La causa Windows-only no está determinada |
| `bash -n deploy-pilot.sh rollback-pilot.sh` | OK |
| Simulación de deploy | OK: consulta solo `migrate status`, elimina workers existentes, inicia solo `api`/`web` |
| Simulación de abortos | OK: detiene deploy ante migraciones pendientes y ante `WHATSAPP_OUTBOUND_ENABLED=true` |
| Simulación de rollback | OK: no consulta migraciones ni inicia workers; recarga solo `api`/`web` |

Un build frontend anterior encontró archivos de entorno locales ignorados y recibió la URL pública mediante variable inyectada; no se considera prueba de un entorno limpio. El archivo de tipos generado por Next.js se restauró tras ese build.

## Bloqueos cerrados y riesgos residuales

- `WHATSAPP_OUTBOUND_ENABLED` se valida en `env.ts` y en preflight. Falta equivale a apagado; solo el string exacto `true` habilita los envíos. El gateway común bloquea antes de cualquier HTTP de WhatsApp y emite un log sin datos de pacientes.
- Cuando se apaga, las filas de outbox/reminders reclamadas vuelven a pendiente; no se marcan enviadas ni se incrementan sus reintentos.
- `deploy-pilot.sh` exige `DEPLOY_MODE=pilot`, un valor explícito `WHATSAPP_OUTBOUND_ENABLED=false`, consulta estado de migraciones sin aplicarlas y arranca solo `api`/`web`. El script de producción `deploy.sh` no cambia.
- `rollback-pilot.sh` restaura código en un worktree y recarga `api`/`web`; no consulta ni altera migraciones y no inicia workers.
- El preflight local valida configuración y formato, no que las credenciales o destinos existan realmente. El propietario debe configurarlos en el archivo externo de Hostinger; no compartirlos en el chat ni subirlos al repositorio.
- El apagado no desactiva recepción/verificación de webhooks ni otras integraciones HTTP; no se debe configurar el webhook real de Meta para el piloto.
- La Data API de Supabase sigue desactivada. No reactivarla ni ejecutar SQL, seeds o cambios de esquema.

### Riesgos residuales de Fase 5C

- Data API desactivada; no reactivarla.
- 188 funciones de `btree_gist` siguen con `EXECUTE` para `anon`/`authenticated`/`PUBLIC`; no son `SECURITY DEFINER`, pero son un riesgo si se reactiva la Data API.
- Default ACL de `supabase_admin` sigue concediendo privilegios a roles de cliente para objetos futuros; no es modificable por `postgres`.

## Checklist operativo canónico del piloto

Este plan no se ejecutó. Requiere confirmación expresa antes de cada bloque que toque el servidor.

### A. Precondiciones y checkout

1. El propietario confirma manualmente en Hostinger el acceso SSH, Node.js 22+, npm 10+, Git, PM2, espacio en disco/RAM, DNS, HTTPS, proxy inverso y firewall. Estas comprobaciones no se pueden certificar desde las pruebas locales.
2. Clonar o actualizar el repositorio en la ruta aprobada, por ejemplo `~/apps/saluddesdeelalma.org`.
3. Cambiar a la rama nueva aprobada y confirmar que `HEAD` coincide exactamente con el SHA que autorizó el propietario. No asumir que una rama o SHA anteriores siguen aprobados.
4. Verificar `git status --short --branch`: árbol limpio y rama correcta.
5. Verificar que no exista ningún `.env`, `.env.*`, `backend/.env*` o `frontend/.env*` fuera de plantillas dentro del checkout.
6. Confirmar manualmente que los dominios previstos resuelven al servidor correcto, que los certificados TLS/HTTPS son válidos y que el proxy reenvía al frontend/API en `127.0.0.1`; los puertos de aplicación no deben quedar públicos.

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

### B. Variables y archivo de runtime externo

El propietario configura, sin compartir valores ni secretos, las variables de runtime `NODE_ENV`, `PORT`, `API_PREFIX`, `FRONTEND_ORIGIN`, `DATABASE_URL`, `JWT_SECRET`, `ADMIN_ACCESS_RECOVERY_TOKEN`, `SESSION_COOKIE_NAME`, `SESSION_IDLE_TIMEOUT_MINUTES`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `META_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_OUTBOUND_ENABLED`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ADMIN_PHONE`, `WHATSAPP_PSYCHOLOGISTS_GROUP_ID` y `REMINDER_TIMEZONE`. `LOG_LEVEL`, `TRUST_PROXY` y `AI_PROVIDER_API_KEY` son opcionales según el uso.

Para despliegue, se necesitan además `BACKEND_ENV_FILE`, `MIGRATION_DATABASE_URL`, `NEXT_PUBLIC_API_BASE_URL`, `DEPLOY_EXPECTED_SHA` y `DEPLOY_MODE`. `MIGRATION_DATABASE_URL` se inyecta solo en la sesión de despliegue y no se guarda en el archivo de runtime. Para rollback se requieren `ROLLBACK_REVISION` y `ROLLBACK_WORKTREE_DIR`.

El valor de `WHATSAPP_OUTBOUND_ENABLED` debe ser exactamente `false`; los workers `reminders` y `whatsapp-inbox` deben estar detenidos y no se deben iniciar durante el piloto.

1. Crear el archivo fuera del checkout, por ejemplo `/home/<usuario>/secrets/saluddesdeelalma.backend.env`.
2. Aplicar `chmod 600`.
3. Cargar las variables de runtime de la tabla anterior.
4. No guardar `MIGRATION_DATABASE_URL` en ese archivo.
5. Inyectar las variables de despliegue requeridas en la sesión de forma segura, sin escribir secretos en el historial ni mostrarlos en pantalla.

Criterio de aborto: el archivo está dentro del checkout, tiene permisos amplios, falta una variable requerida, el kill switch no es `false` o hay workers de despacho activos.

### C. Orden de ejecución del piloto

```bash
bash deploy-pilot.sh
```

Con aprobación humana vigente, el script ejecuta estrictamente en este orden:

1. Verifica rama/HEAD/árbol, ausencia de `.env` locales y ejecuta el preflight con `DEPLOY_MODE=pilot` y `WHATSAPP_OUTBOUND_ENABLED=false`.
2. Ejecuta `npm ci --include=dev`.
3. Ejecuta `npm run build` desde la raíz; este comando genera Prisma Client y compila backend y frontend.
4. Ejecuta únicamente `prisma migrate status` con `MIGRATION_DATABASE_URL`.
5. Aborta si preflight, instalación, build o `migrate status` falla o si hay migraciones pendientes. Debe indicar que el esquema está al día. No ejecutar ni sustituirlo por `prisma migrate deploy`, `db push`, seeds o SQL.
6. Solo tras pasar lo anterior, detiene workers preexistentes `reminders`/`whatsapp-inbox` y arranca/reload exclusivamente `api` y `web`.
7. Guarda estado PM2 y ejecuta los health checks locales del script.

No ejecutar etapas individuales manualmente para eludir un fallo o el resultado de migraciones pendientes.

### D. Verificación del estado de procesos y health checks

Estos comandos son para el propietario en Hostinger después de una aprobación explícita; no se ejecutaron durante la preparación local.

```bash
pm2 ls
curl -i http://127.0.0.1:4000/health
curl -i http://127.0.0.1:4000/api/v1/health
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/
curl -fsS https://api.saluddesdeelalma.org/api/v1/health
curl -sS -o /dev/null -w '%{http_code}\n' https://saluddesdeelalma.org/
```

`/health` es liveness del proceso, no consulta la base y debe devolver 200. El balanceador y readiness deben usar `/api/v1/health`: devuelve 200 con `database: true` solo si `SELECT 1` mediante Prisma termina correctamente, o 503 con `database: false` y sin detalles internos. Resultado esperado: ambas rutas de health 200, home 200 (o redirección HTTPS válida), `api` y `web` online; `reminders` y `whatsapp-inbox` ausentes. El script elimina solo esos dos workers PM2 si ya existían; no los inicia.

Logs para diagnóstico, evitando copiar datos sensibles al chat:

```bash
pm2 logs api --lines 100
pm2 logs web --lines 100
```

Si falla cualquier health check, no declarar el piloto listo ni seguir con pruebas de usuario. Guardar el SHA, códigos HTTP y logs saneados; revisar `pm2 describe api`, `pm2 describe web` y los logs sin copiar cookies, tokens, datos de pacientes ni variables. Confirmar que no haya workers. Informar al propietario y esperar instrucciones. No ejecutar migraciones ni rollback automáticamente; si se autoriza detener procesos, limitarse a los procesos `api`/`web` de este intento y preservar logs.

### E. Verificación HTTPS, CORS y cookies

DNS, certificados y respuestas de dominio requieren comprobación humana en Hostinger y desde una red externa tras la aprobación; no quedan demostrados por las pruebas locales.

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

Cookie y login ficticio: después de aprobar, el propietario debe usar una cuenta administrativa de prueba con identidad y credenciales sintéticas creadas para el piloto, nunca la contraseña real del administrador. Revisar `Set-Cookie` sin copiarlo ni guardarlo en el reporte. Esperado: `sda_admin_session`, `Path=/`, `HttpOnly`, `SameSite=Lax`, `Secure`, sin `Domain`. No usar Auth remoto para la prueba local; el login smoke local usa mocks y no demuestra una cuenta operativa en Hostinger.

### F. Webhook y ausencia de mensajes reales

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
2. El archivo de runtime tiene exactamente `WHATSAPP_OUTBOUND_ENABLED=false`.
3. No se configuró el webhook real en Meta; usar destinos ficticios para pruebas.
4. Los logs solo deben incluir el evento genérico `whatsapp_outbound_disabled`, sin teléfono ni contenido.
5. Si Meta registra un envío, detener `api` y `web`, preservar logs y escalar el incidente antes de continuar.

### G. Datos ficticios

1. Crear los datos ficticios manualmente desde el panel, no con seeds.
2. Usar nombres y teléfonos claramente ficticios que no pertenezcan a personas reales.
3. Antes de crear citas, confirmar el switch `false`, y que `reminders`/`whatsapp-inbox` están detenidos.
4. Si la API encola confirmaciones, comprobar que el outbox/reminders queda pendiente, sin incremento de reintentos ni entrega.
5. No cargar comprobantes, datos clínicos ni información de personas reales durante el piloto.

No ejecutar `db:seed`, `db:seed:demo`, `db:clean:test-data` ni SQL manual.

### H. Rollback de código del piloto

El rollback es solo de código. No ejecutar migraciones ni restaurar datos sin aprobación.

1. Confirmar que el esquema actual es compatible con el commit de código de rollback; el script no consulta ni cambia la base de datos.
2. Elegir un SHA aprobado y una ruta absoluta nueva, fuera del checkout, para el worktree.
3. Configurar `BACKEND_ENV_FILE`, `NEXT_PUBLIC_API_BASE_URL`, `ROLLBACK_REVISION` y `ROLLBACK_WORKTREE_DIR`; el runtime debe mantener `WHATSAPP_OUTBOUND_ENABLED=false`.
4. Ejecutar `bash rollback-pilot.sh`. Instala y compila el código del SHA, elimina solo workers de piloto preexistentes y recarga únicamente `api` y `web`.
5. Confirmar `pm2 ls` (workers ausentes), ejecutar health checks y verificar `pm2 save`.

El rollback del piloto no ejecuta `prisma migrate status`, `prisma migrate deploy` ni ningún worker. No usar `rollback.sh`, que conserva el comportamiento normal de producción. Si el código anterior no es compatible con el esquema actual, detenerse y preparar un plan revisado.

El rollback restaura solo el código ejecutado desde su worktree; no revierte ni restaura esquema, migraciones, datos o configuración de Supabase. No asumir que una migración aplicada es reversible. Si los health checks fallan, preservar logs y escalar primero; ejecutar `rollback-pilot.sh` únicamente con SHA aprobado y confirmación de compatibilidad del esquema.

## Evidencia local de build Linux

**Ejecución del 2026-11-06 UTC / 2026-11-05 UTC−06:00.** Se probó el SHA `d00cbc353d08c3c9727ae7559737c36547db55a8` en un contenedor local desechable Debian 12, Node.js 22.20.0 y npm 10.9.3. El código provino de un archivo generado con `git archive`; no se montaron el checkout ni archivos `.env` ignorados. Se usaron exclusivamente valores sintéticos y `WHATSAPP_OUTBOUND_ENABLED=false`.

El propietario autorizó descargas de dependencias de npm y Prisma. Después de la instalación se desconectó la red del contenedor para el resto de la secuencia. No se conectó a Hostinger, Supabase ni Meta, ni se cambió el lockfile o las dependencias.

| Comando en orden | Resultado |
| --- | --- |
| `npm ci --include=dev` | OK; 276 paquetes instalados. |
| `npm run prisma:validate` | OK; esquema válido, sin cargar un `.env` local ignorado. |
| `npm run typecheck` | **Falló inicialmente:** en el checkout limpio Prisma Client aún no estaba generado y faltaban tipos de `@prisma/client`. |
| `npm run prisma:generate --workspace backend` | OK; generación local, sin conexión a la base. |
| `npm run typecheck` | OK después de generar Prisma Client. |
| `npm run test` | OK: backend 185 aprobadas, 31 omitidas, 0 fallidas; prueba de integración local adicional 1 aprobada; frontend 8 aprobadas. |
| `npm run build` | OK: genera Prisma Client y compila backend y frontend. |

Para repetir los gates desde una instalación limpia, generar Prisma Client explícitamente antes de `npm run typecheck` y `npm run test`. El script de build ya genera el cliente antes de compilar; no fue necesario modificarlo. Los tests incluyeron bases en memoria para pruebas, no migraciones en una base remota.

El build pasó en este contenedor Linux y el `EPERM` anterior se observó en Windows. Esto acota el problema al entorno o condiciones de aquella ejecución de Windows, pero no identifica por sí solo el proceso o la causa exacta del bloqueo ni garantiza que no pueda suceder en otro entorno. Tampoco valida la configuración o disponibilidad de Hostinger.

El intento Linux anterior, desconectado desde el inicio, quedó bloqueado en `npm ci --include=dev --offline` porque la caché local no contenía `@esbuild/linux-x64@0.28.2`; no llegó a ejecutar el build.

## Criterios de aborto

Detener el despliegue si ocurre cualquiera de estos casos:

- El HEAD no coincide con el SHA aprobado o el árbol está sucio.
- Hay archivos `.env` locales dentro del checkout.
- El preflight falla.
- El build falla o carga variables locales no aprobadas.
- `prisma migrate status` informa migraciones pendientes, divergencia o no confirma que el esquema está al día. No aplicar migraciones para hacer pasar el gate.
- Se intenta ejecutar `prisma migrate deploy`, seeds o SQL manual.
- Hay workers `reminders` o `whatsapp-inbox` activos, o el plan intenta iniciarlos.
- `WHATSAPP_OUTBOUND_ENABLED` falta, es distinto de `false` o se registra cualquier envío saliente.
- DNS, HTTPS, proxy o cualquier health check falla.
- CORS autoriza un origen desconocido.
- La cookie no tiene los atributos esperados.
- El webhook acepta una firma inválida.
- Se envía un mensaje real de WhatsApp.

Ante un aborto: no continuar con pruebas de usuarios ni declarar el piloto listo; conservar SHA, salida de estado y logs saneados; informar al propietario y esperar decisión. Si se observa un envío saliente o exposición de datos, detener `api` y `web` de este intento, preservar evidencia y escalar inmediatamente. No improvisar cambios de esquema, limpieza ni rollback.

## Aprobación humana pendiente

La implementación local no autoriza ni ejecuta el despliegue. Antes de tocar Hostinger, el propietario debe aprobar el SHA publicado, configurar los valores de la lista de variables, confirmar SSH/DNS/SSL/proxy/PM2 y acordar la ventana del piloto. Usar solo datos ficticios creados manualmente; no ejecutar seeds.

## Comandos y alcance de validación local

En la preparación anterior se ejecutaron localmente:

```text
npm run prisma:validate
npm run typecheck
npm run test
npm run smoke:test
Docker Linux: npm ci --include=dev --offline (bloqueado por paquete nativo no cacheado)
```

Resultados de esta rama: `prisma:validate` informó que el esquema es válido; el typecheck de backend/frontend pasó; `npm run test` terminó con backend 185 aprobados, 31 omitidos, 0 fallidos, una prueba de integración local adicional aprobada y 8 pruebas frontend aprobadas; `npm run smoke:test` pasó con 19 aprobadas, 0 fallidas y 1 omitida por falta de base desechable local.

**Advertencia de aislamiento de la preparación anterior:** durante `npm run prisma:validate` en Windows, Prisma imprimió que cargó `.env` además de la plantilla explícita. No se inspeccionó ni imprimió su contenido, pero hubo una carga automática local no prevista. Por ello, ese resultado no cumple el requisito de validar en un entorno libre de `.env`. La ejecución Linux posterior descrita arriba sí validó el esquema sin archivos `.env` ignorados.

Los resultados de fases anteriores están identificados como históricos arriba; no sustituyen las validaciones de esta rama. Durante esta preparación no se ejecutaron `preflight:deploy`, `deploy.sh`, `rollback.sh`, `deploy-pilot.sh` ni `rollback-pilot.sh`. No se ejecutaron migraciones, seeds, limpieza, comandos SSH, cambios en Supabase ni llamadas a Meta. Los pasos de DNS, Hostinger, dominio y HTTPS requieren intervención humana tras aprobación y permanecen sin verificar.
