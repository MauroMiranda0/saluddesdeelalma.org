# Fase 4 — Validación local aislada

## Remediación de bloqueos (resultado actual)

Esta sección registra la corrección solicitada en
`review/fase4-local-pilot-fixes`, basada en
`aead4ea215d1360e53abc5389c4151dda179b859`. No hubo merge, deploy, PR, uso de
seeds ni acceso a servicios remotos.

### Cambios

- La nueva migración permite conservar `role='admin'` y `username='admin'`
  con `panel_login_enabled=false`; las filas no admin siguen sin poder obtener
  rol, username, acceso al panel o vínculo Auth.
- Se añadió recuperación del administrador único en
  `POST /api/v1/auth/admin-access/reactivate`, autorizada por
  `ADMIN_ACCESS_RECOVERY_TOKEN` (secreto independiente, mínimo 32 caracteres),
  limitada a 5 intentos por 15 minutos. Solo reactiva una cuenta activa,
  enlazada a Auth y actualmente deshabilitada; revoca sesiones anteriores y
  registra auditoría sin guardar el token. No se envía el token a logs.
- Las pruebas PostgreSQL usan funciones y triggers de auditoría con nombres
  únicos; el runner Node ejecuta archivos de prueba de forma serial para evitar
  interferencias sobre PostgreSQL compartido.
- Se corrigieron fixtures: la sesión de rollback tiene un vínculo Auth válido,
  las citas de recordatorio no quedan en el pasado, los errores del proveedor
  se esperan sanitizados, las llamadas de WhatsApp usan gateways locales y el
  pago pendiente inválido pasa a rechazado antes de registrar otro pago del
  mismo tipo.
- El lockfile recibió parches compatibles dentro de los rangos existentes;
  no se usó `--force` ni se cambiaron rangos de dependencias en los manifests.

### Validaciones finales

| Comando                                              | Resultado                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci --include=dev`                               | Pasó en un worktree temporal aislado: 273 paquetes instalados. En el checkout original falló primero con `EPERM` al intentar eliminar `lightningcss.win32-x64-msvc.node` bloqueado; no se alteraron ni leyeron los `.env` ignorados.                                                                           |
| `npm run prisma:validate`                            | Pasó: esquema Prisma válido.                                                                                                                                                                                                                                                                                   |
| `npm run typecheck`                                  | Pasó para backend y frontend.                                                                                                                                                                                                                                                                                  |
| `npm run test`                                       | Pasó: 177 backend TS aprobadas, 31 gated omitidas con el flag apagado; 1 prueba PGlite y 8 frontend aprobadas.                                                                                                                                                                                                 |
| `$env:RUN_POSTGRES_INTEGRATION='true'; npm run test` | Pasó contra PostgreSQL local desechable: 208 pruebas backend TS aprobadas, 0 fallidas, 0 omitidas; además 1 prueba PGlite y 8 frontend aprobadas. Ejecución serial; no se enviaron mensajes reales.                                                                                                            |
| `npm run build`                                      | Pasó para backend y frontend; Next.js 16.4.5.                                                                                                                                                                                                                                                                  |
| `npm audit`                                          | Ejecutado online contra `https://registry.npmjs.org`: 0 vulnerabilidades críticas/altas; quedan 11 moderadas por `minimatch` en la cadena ESLint/typescript-eslint. Su corrección automática exige `--force` y propone un downgrade incompatible de ESLint, por lo que no se aplicó.                           |
| `prisma migrate deploy` local                        | Pasaron las 12 migraciones en una base PostgreSQL 16 desechable y recién creada con un esquema mínimo ficticio `auth.users(id)` y grants locales. Una primera ejecución con un rol sin permisos en `auth` falló con `42501`; se preparó otra base limpia con permisos explícitos y la secuencia completa pasó. |

La auditoría inicial reportó 20 vulnerabilidades: críticas en `next` (directa,
frontend) y `proxy-addr` (transitiva); altas en `body-parser`,
`brace-expansion`, `sharp`, `source-map-js` y `zod` (`zod` directa); moderadas
en `ip-address`, `minimatch` y `qs`. Las versiones del lockfile se actualizaron
dentro de los rangos existentes, incluyendo `next` 16.4.5, `zod` 4.6.7,
`sharp` 0.35.5, `body-parser` 2.4.0, `proxy-addr` 2.0.8 y `qs` 6.17.1. La
re-auditoría online confirma que ya no quedan alertas altas ni críticas.

La suite PostgreSQL original había reportado estos siete fallos; se corrigieron
sus causas y la repetición final pasó completa:

1. `auth-audit-rollback.postgres.integration.test.ts` — `audit insert failure
rolls back session refresh and revocation`: el fixture no tenía
   `auth_user_id`, así que la sesión se rechazaba antes de llegar al trigger.
   Se agregó una identidad Auth local enlazada.
2. `booking-reminder-regressions.postgres.integration.test.ts` — `a failed
audit insert rolls back the WhatsApp appointment creation`: función y
   trigger globales colisionaban entre archivos; ahora son únicos por prueba.
3. El mismo archivo — `WhatsApp booking schedules all reminder rows atomically
with the appointment`: la fecha fija ya había pasado y el recordatorio se
   creaba como `omitido`; el fixture ahora usa una fecha futura.
4. El mismo archivo — `panel booking commits durable confirmations and records
independent delivery outcomes`: esperaba persistir el error externo crudo;
   ahora confirma el motivo genérico `WhatsApp delivery failed`.
5. El mismo archivo — `a failed panel booking audit rolls back confirmation and
reminder rows before dispatch`: el trigger compartido se quitaba/interfería
   antes de la aserción; ahora tiene ciclo de vida aislado y ejecución serial.
6. `payments-flow.integration.test.ts` — `an authorized admin completes the
payment flow with audit and manual proof association`: la ejecución
   concurrente permitía que otra prueba interfiriera con el admin/triggers; al
   serializar también se detectó que un pago completo pendiente usado para
   probar una validación seguía bloqueando el siguiente pago. Se resuelve el
   fixture como rechazado antes del nuevo registro.
7. `therapist-session-rules.postgres.integration.test.ts` — `completing an
appointment rolls back when its audit insert fails`: el trigger compartido
   afectaba pruebas ajenas; ahora es único y se elimina solo por su prueba.

La primera ejecución serial durante esta corrección también detectó dos
expectativas de fixture restantes: la API devuelve `invalid_credentials`
genérico (no un estado interno distinguible) para la identidad deshabilitada,
y el segundo pago recibía 409 por el pendiente previo. Ambas quedaron ajustadas
sin reducir las aserciones; el gate final no tuvo fallos ni skips.

### Riesgos y límites pendientes

- Las 11 alertas moderadas de `minimatch` siguen pendientes; no se justificó
  un cambio mayor de ESLint para eliminarlas.
- La migración y políticas no se probaron en Supabase ni contra su Auth, RLS,
  grants o Storage reales. El esquema mínimo local solo valida PostgreSQL
  desechable, no equivale a Supabase.
- Antes de un piloto se debe generar y custodiar
  `ADMIN_ACCESS_RECOVERY_TOKEN` en producción, confirmar el aprovisionamiento
  del admin enlazado a Auth y validar la migración en Supabase aislado.

## Informe inicial (histórico): alcance y aislamiento

## Alcance y aislamiento

Validación realizada sobre `review/fase4-local-pilot`, basada en
`0a772cc5992d5bfac4baf1bdd30b6a389dc403ee`. El checkout original contiene
archivos `.env` ignorados; no se leyeron ni usaron. La instalación y las
pruebas se hicieron en un worktree temporal limpio. El entorno de prueba usó
valores ficticios guardados fuera del repositorio, una API falsa de Supabase
Auth escuchando solo en `127.0.0.1` y un contenedor PostgreSQL 16 desechable
expuesto solo en loopback. El frontend y la API también escucharon en
`127.0.0.1`.

No se ejecutaron `deploy.sh` ni `rollback.sh`, no se inició PM2, no se enviaron
mensajes y no se contactó Supabase, Hostinger ni Meta. Se aplicaron las 12
migraciones Prisma únicamente al PostgreSQL local desechable. Para satisfacer
la FK de la migración se creó allí un esquema mínimo ficticio `auth.users(id)`;
no equivale al esquema ni al servicio Supabase real.

## Resultados

| Comando o comprobación                        | Resultado                                                                                                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci --include=dev`                        | Pasó; instaló 273 paquetes. El auditor integrado reportó 20 vulnerabilidades (13 moderadas, 5 altas y 2 críticas).                                                              |
| `npm run preflight:deploy`                    | Pasó con configuración ficticia de formato de producción; 0 advertencias. El preflight solo valida formato y nombres, no conecta.                                               |
| `npm run prisma:validate`                     | Pasó.                                                                                                                                                                           |
| `npm run prisma:generate --workspace backend` | Pasó en el worktree limpio.                                                                                                                                                     |
| `npm run typecheck`                           | Pasó después de generar Prisma Client. La primera ejecución antes de generarlo falló por tipos incompletos del cliente recién instalado.                                        |
| `npm run build`                               | Pasó: backend y frontend de producción compilados.                                                                                                                              |
| `npm run test`                                | Pasó: 175 pruebas aprobadas y 30 omitidas (28 pruebas PostgreSQL gated y 2 de persistencia clínica); además, 1 prueba de restricciones aprobada y 8 pruebas frontend aprobadas. |
| `npm audit --offline`                         | Informó 0 vulnerabilidades, en discrepancia con las 20 reportadas por `npm ci`; el resultado offline no sustituye un análisis actualizado.                                      |
| `RUN_POSTGRES_INTEGRATION=true npm run test`  | **Falló** con 7 fallos y 198 aprobadas al habilitar la integración PostgreSQL. Detalle abajo; no se omite este resultado.                                                       |
| `prisma migrate deploy`                       | Aplicó correctamente las 12 migraciones en PostgreSQL 16 local desechable, preparado con el esquema mínimo `auth.users`. No se aplicaron en una instancia remota.               |

### Smoke test funcional local

- `GET /health` y `GET /api/v1/health`: 200.
- CORS: origen local configurado recibió `Access-Control-Allow-Origin` y
  credenciales; origen desconocido no recibió autorización; health sin `Origin`
  siguió disponible.
- Login sin `Origin`: 403. Login con usuario ficticio respaldado por la API
  falsa de Auth y la fila local enlazada: 200 y cookie `HttpOnly`. Credenciales
  ficticias rechazadas: 401 sin cookie.
- `GET /api/v1/auth/me`: 200 con la sesión local; la lista de citas
  autenticada: 200 desde PostgreSQL local ficticio.
- Al desactivar el usuario enlazado, la sesión existente fue rechazada con 401. Una sesión vencida también fue rechazada con 401.
- La firma ficticia inválida del webhook recibió 403; una firma válida para un
  sobre vacío recibió 202. No se inició el worker ni se despacharon mensajes.
- Frontend local: `/` respondió 200.
- La configuración PM2 contiene `api`, `reminders` y `whatsapp-inbox`; el API
  no inicia workers. PM2 no está instalado en este entorno, por lo que no se
  levantaron esos procesos.

## Fallos y bloqueadores encontrados

1. **El esquema impide deshabilitar `panel_login_enabled` para un admin.** En
   PostgreSQL la restricción `users_access_profile_check` exige
   `panel_login_enabled = true` cuando `role = 'admin'`. El intento de apagar
   el flag fue rechazado por la base; por tanto, el smoke test no pudo probar
   esa transición persistida. Las pruebas unitarias sí cubren la denegación
   lógica, pero el modelo de base no permite ese estado. Revisar la regla antes
   del piloto.
2. **La suite PostgreSQL habilitada tiene 7 fallos:** el test de rollback de
   sesión espera llegar al fallo de auditoría pero la sesión se considera
   inválida; dos pruebas de auditoría colisionan o interfieren al crear y usar
   la función temporal `fail_audit_insert` (incluido un error
   `forced audit failure` en otra prueba); un test espera `pendiente` pero
   obtiene `omitido`; otro espera persistir el texto de un error externo en vez
   del motivo genérico `WhatsApp delivery failed`; una prueba de rollback del
   panel no recibe el rechazo esperado; y el flujo de pagos espera 200 y
   obtiene 500. Los fixtures de esa suite y su aislamiento deben revisarse. La
   ejecución inicial de este comando ocurrió después de detener el contenedor y
   falló porque la base ya no estaba disponible; se reinició una base nueva y
   el resultado de 7 fallos corresponde a esa segunda ejecución.
3. **Dependencias:** `npm ci` informó dos vulnerabilidades críticas y cinco
   altas, entre otras. `npm audit --offline` dio cero, lo que evidencia que el
   caché offline no brinda una señal consistente para despejar ese riesgo.
   Revisar con el mecanismo de auditoría aprobado antes de un piloto.
4. **No se validó PM2 en ejecución** porque no está instalado. Solo se comprobó
   estáticamente su configuración. No se ejecutó ningún worker.
5. **No se validó Supabase real:** ni Auth, RLS, Storage, grants ni políticas;
   la API falsa local y el esquema mínimo PostgreSQL no sustituyen esa
   verificación.

## Recomendación

**Bloqueado hasta revisar la restricción que impide deshabilitar el acceso de
panel de un admin, resolver los fallos de la suite PostgreSQL habilitada y
revisar las vulnerabilidades reportadas por `npm ci`.** Después, una revisión
humana debe validar RLS, Auth, Storage, grants y migraciones en un Supabase
aislado con permisos reales antes de autorizar cualquier piloto con datos no
ficticios. Este informe no acredita un despliegue ni autoriza datos reales.
