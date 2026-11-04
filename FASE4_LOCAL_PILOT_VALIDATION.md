# Fase 4 — Validación local aislada

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

| Comando o comprobación | Resultado |
|---|---|
| `npm ci --include=dev` | Pasó; instaló 273 paquetes. El auditor integrado reportó 20 vulnerabilidades (13 moderadas, 5 altas y 2 críticas). |
| `npm run preflight:deploy` | Pasó con configuración ficticia de formato de producción; 0 advertencias. El preflight solo valida formato y nombres, no conecta. |
| `npm run prisma:validate` | Pasó. |
| `npm run prisma:generate --workspace backend` | Pasó en el worktree limpio. |
| `npm run typecheck` | Pasó después de generar Prisma Client. La primera ejecución antes de generarlo falló por tipos incompletos del cliente recién instalado. |
| `npm run build` | Pasó: backend y frontend de producción compilados. |
| `npm run test` | Pasó: 175 pruebas aprobadas y 30 omitidas (28 pruebas PostgreSQL gated y 2 de persistencia clínica); además, 1 prueba de restricciones aprobada y 8 pruebas frontend aprobadas. |
| `npm audit --offline` | Informó 0 vulnerabilidades, en discrepancia con las 20 reportadas por `npm ci`; el resultado offline no sustituye un análisis actualizado. |
| `RUN_POSTGRES_INTEGRATION=true npm run test` | **Falló** con 7 fallos y 198 aprobadas al habilitar la integración PostgreSQL. Detalle abajo; no se omite este resultado. |
| `prisma migrate deploy` | Aplicó correctamente las 12 migraciones en PostgreSQL 16 local desechable, preparado con el esquema mínimo `auth.users`. No se aplicaron en una instancia remota. |

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
- Al desactivar el usuario enlazado, la sesión existente fue rechazada con
  401. Una sesión vencida también fue rechazada con 401.
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
