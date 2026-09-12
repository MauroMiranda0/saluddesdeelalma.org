# Decisiones Tecnicas

## 2026-09-03 - Monorepo con npm workspaces

**Contexto**

La Fase 1 exigia inicializar la estructura base del proyecto con `frontend/` y `backend/` en un repositorio vacio.

**Decision**

Se uso `npm` workspaces en la raiz para orquestar ambos workspaces sin agregar herramientas adicionales de monorepo.

**Alternativas consideradas**

- `pnpm` workspaces
- `turbo`
- repositorios separados para frontend y backend

**Consecuencias**

- Menor complejidad inicial.
- Un solo `package-lock.json` en la raiz.
- Los comandos compartidos viven en `package.json` del repositorio.

## 2026-09-03 - Configuracion de ESLint con flat config

**Contexto**

La Fase 1 pedia configurar linting para backend y frontend TypeScript desde el inicio.

**Decision**

Se implemento `eslint.config.js` con flat config y reglas separadas para archivos de backend, frontend y configuracion JavaScript.

**Alternativas consideradas**

- `.eslintrc.json`
- `.eslintrc.cjs`
- posponer ESLint hasta una fase posterior

**Consecuencias**

- La configuracion queda centralizada en un solo archivo.
- No fue necesario crear `.eslintignore` porque los `ignores` viven en el config.
- Hubo que excluir `@typescript-eslint/no-require-imports` para archivos de configuracion CommonJS.

## 2026-09-03 - Alcance minimo de dependencias en Fase 1

**Contexto**

El plan completo incluye Prisma, Tailwind, Vitest, Playwright y mas infraestructura, pero la instruccion de control de fases prohibe adelantar trabajo de fases posteriores.

**Decision**

Se instalaron solo las dependencias necesarias para cerrar la Fase 1: monorepo, TypeScript, Express, Next, React, ESLint y Prettier.

**Alternativas consideradas**

- Instalar todo el stack definido en `plan.md` desde la Fase 1
- Dejar solo archivos vacios sin dependencias reales

**Consecuencias**

- La Fase 1 se mantiene dentro del alcance aprobado.
- Los comandos documentados hoy son reales y verificables.
- Las dependencias de base de datos, testing y UI styling quedan para fases posteriores.

## 2026-09-04 - Dependencias fundacionales instaladas por fase

**Contexto**

La Fase 2 requirio backend funcional, Prisma, validacion, JWT, logging, CORS y shell frontend sin adelantar historias de usuario.

**Decision**

Se instalaron solo las dependencias necesarias para la infraestructura fundacional: `@prisma/client`, `prisma`, `zod`, `jose`, `pino`, `cors` y `@types/cors`. Las dependencias de pruebas, Tailwind, bcrypt y jobs quedan para las tareas donde se usen directamente.

**Alternativas consideradas**

- Instalar todo el stack listado en `plan.md` durante Fase 2.
- Mantener Fase 2 sin dependencias reales y usar placeholders.
- Instalar dependencias por historia de usuario conforme aparezcan pruebas e implementacion.

**Consecuencias**

- La fase queda verificable con build y typecheck reales.
- Se evita adelantar alcance de US1, US2 o pulido.
- Habra nuevas instalaciones controladas cuando se implementen pruebas, password hashing, cron jobs y UI styling.

## 2026-09-04 - Sesion administrativa con JWT renovado por actividad

**Contexto**

La especificacion exige expiracion administrativa tras 30 minutos de inactividad. La primera implementacion renovaba la sesion en BD, pero el `exp` del JWT seguia fijo.

**Decision**

El middleware de autenticacion valida la cookie, renueva `last_activity_at` y `expires_at` en `admin_sessions`, firma un nuevo JWT con la nueva expiracion y reescribe la cookie HttpOnly en cada request autenticado.

**Alternativas consideradas**

- Usar JWT con expiracion fija y depender solo de BD.
- Usar sesiones opacas sin JWT.
- Renovar solo la cookie sin renovar el token.

**Consecuencias**

- La expiracion cumple semantica de inactividad real.
- Cada request autenticado toca la tabla `admin_sessions`.
- El logout debe limpiar cookie con opciones separadas para no conservar `maxAge`.

## 2026-09-04 - Indices parciales manuales en migracion Prisma

**Contexto**

El modelo necesita impedir dobles reservas para citas activas y duplicados de pagos validados por tipo. Prisma no representa indices unicos parciales en `schema.prisma`.

**Decision**

Se agregaron indices unicos parciales directamente en `backend/prisma/migrations/20260904000000_initial/migration.sql` y se documentaron en `schema.prisma`.

**Alternativas consideradas**

- Dejar la restriccion solo en servicios de aplicacion.
- Usar indices unicos no parciales y limitar estados.
- Posponer la restriccion hasta historias de agenda y pagos.

**Consecuencias**

- PostgreSQL protege invariantes criticas aunque haya concurrencia.
- Futuras migraciones deben preservar manualmente esos indices.
- `schema.prisma` no muestra toda la semantica de unicidad por si solo.

## 2026-09-04 - CORS basico para frontend y backend separados

**Contexto**

El plan define frontend y backend separados, y el frontend usa `credentials: "include"` para cookies de sesion.

**Decision**

El backend habilita CORS con `credentials: true` y un origen configurable mediante `FRONTEND_ORIGIN`.

**Alternativas consideradas**

- No configurar CORS hasta implementar login real.
- Permitir todos los origenes.
- Resolver comunicacion solo mediante proxy del frontend.

**Consecuencias**

- El desarrollo local puede usar cookies entre `localhost:3000` y `localhost:4000`.
- Produccion debe confirmar dominio/origen antes de cerrar seguridad final.
- Si el despliegue queda cross-site real, habra que revisar `SameSite=None; Secure` y dominio de cookie.

## 2026-09-04 - Scripts raiz de ciclo de vida verificable

**Contexto**

Despues de Fase 2 ya existen backend y frontend compilables, por lo que la documentacion necesita comandos reales para validar, buildar, levantar y limpiar artefactos.

**Decision**

Se agregaron scripts raiz para `build`, `typecheck`, `prisma:validate`, `start:backend`, `start:frontend` y `clean:artifacts`, delegando en los workspaces.

**Alternativas consideradas**

- Documentar solo comandos por workspace.
- Mantener unicamente `dev:*` hasta historias de usuario.
- Crear una herramienta externa de orquestacion.

**Consecuencias**

- Los comandos documentados son cortos y verificables desde la raiz.
- `npm run build` genera artefactos ignorados que pueden limpiarse con `npm run clean:artifacts`.
- `start:*` requiere ejecutar build previamente.

## 2026-09-07 - Validacion de Prisma con entorno de ejemplo

**Contexto**

`prisma validate` y `prisma generate` necesitan resolver `DATABASE_URL` aunque no se conecten a PostgreSQL. Pedir un `.env` local solo para esas validaciones impedia ejecutar la auditoria desde un checkout limpio.

**Decision**

Los scripts `prisma:validate` y `prisma:generate` del workspace `backend` usan `dotenv-cli` para cargar `backend/.env.example`.

**Consecuencias**

- El schema y Prisma Client se pueden validar o generar sin secretos locales ni una base de datos disponible.
- `prisma:migrate` conserva el entorno real, para evitar aplicar migraciones contra la URL de ejemplo.

## 2026-09-07 - Usuarios de directorio y cuenta administrativa unica

**Contexto**

El MVP requiere conservar perfiles de psicólogos/as y pacientes para el directorio, sin permitir que esos perfiles accedan al panel. Solo Jocelyn puede usar la cuenta administrativa `admin`.

**Decision**

La migración de reglas de negocio renombra `admin_users` a `users`, agrega los roles `psicologo` y `paciente`, y restringe en PostgreSQL que exista un único rol `admin` con usuario `admin` y login habilitado. Los perfiles de directorio no pueden tener usuario, contraseña ni login de panel. También incorpora el perfil de usuario de cada paciente, el instante y clasificación de cancelación, y el destinatario de cada recordatorio.

**Consecuencias**

- La defensa de identidad existe incluso si un futuro endpoint omite una validación de aplicación.
- El seed requiere `ADMIN_SEED_PASSWORD` y nunca almacena una contraseña en texto plano.
- La prueba de integración aplica ambas migraciones sobre PostgreSQL embebido para verificar esas restricciones sin requerir una instancia local.

## 2026-09-07 - Actualizacion de dependencias con vulnerabilidades altas

**Contexto**

La auditoría de dependencias reportó vulnerabilidades altas transitivas en Prisma y PostCSS, este último a través de Next.js. La corrección disponible requería una actualización mayor de Next.js y cambiar Prisma a una línea no afectada.

**Decision**

Con aprobación explícita, Next.js se actualizó a `16.3.4` y Prisma Client/CLI se alinearon en `6.12.0`. Next.js actualizó los ajustes obligatorios de TypeScript en el frontend.

**Consecuencias**

- `npm audit` finaliza sin vulnerabilidades conocidas.
- La generación de Prisma debe ejecutarse después de actualizar sus paquetes; el script de build ya lo hace.
- Se verificaron nuevamente formato, lint, integración, typecheck y build completo.

## 2026-09-08 - Prueba del orquestador de agendamiento con limites inyectables

**Contexto**

La prueba inicial de US1 comprobaba el esquema de persistencia insertando registros directamente en PostgreSQL embebido, pero no ejecutaba el flujo que recibe un mensaje de WhatsApp y coordina la cita, auditoria y confirmacion.

**Decision**

`processIncomingWhatsAppMessage` acepta dependencias opcionales para sus limites de persistencia, auditoria y confirmacion. La prueba de integracion ejecuta el orquestador real con implementaciones controladas y verifica los efectos de una reserva. La prueba respaldada por PostgreSQL embebido se conserva para validar las relaciones persistidas.

**Alternativas consideradas**

- Conectar la prueba al cliente Prisma y una instancia externa de PostgreSQL.
- Mantener inserciones SQL directas sin ejecutar el orquestador.
- Simular todo el flujo fuera del modulo de aplicacion.

**Consecuencias**

- La prueba verifica la coordinacion real del caso de uso sin requerir una base de datos externa.
- El contrato de produccion conserva las dependencias predeterminadas; la inyeccion solo se usa para pruebas.
- La integridad de migraciones y relaciones se sigue comprobando con PostgreSQL embebido.

## 2026-09-11 - Continuidad clínica y agenda por intervalos

**Decisión**

Se incorporan perfiles clínicos sin login, asignación de paciente por `admin`, tipos `individual` (60 min), `pareja` (90 min) y `familiar` (90 min). PostgreSQL protege las citas activas con una exclusión por psicóloga e intervalo, independientemente de la modalidad. Las confirmaciones se entregan al paciente y al destino interno configurado; los avisos de pago son exclusivos del paciente, antes y después de la sesión si aplica.

**Consecuencias**

- Las citas y pacientes históricos quedan sin asignación hasta que `admin` los regularice; no se infiere una psicóloga.
- El grupo interno requiere compatibilidad verificada del proveedor de WhatsApp antes de operar en producción.
- El panel pendiente debe incorporar asignación/reasignación y mostrar tipo, duración y fin de cada cita.

## 2026-09-11 - Endurecimiento de invariantes de agenda en PostgreSQL (convergencia)

**Contexto**

La convergencia detectó que el trigger de citas permitía `therapist_id` nulo, mientras la capa de aplicación ya exigía una psicóloga activa asignada. La segunda pasada (`T116`) cerró el hueco a nivel de base de datos y endureció el listado administrativo ante filas históricas sin terapeuta.

**Decisión**

La migración `20261101000000_convergence_hardening` reemplaza la función del trigger para rechazar con SQLSTATE `23514` las citas con `therapist_id` nulo o que no correspondan a la psicóloga activa asignada al paciente. El listado administrativo de citas usa `therapist?.user?.fullName ?? null` en lugar de desreferenciar la fila.

**Alternativas consideradas**

- Dejar únicamente la validación en la capa de aplicación.
- Rechazar en el trigger solo el `therapist_id` nulo sin validar la psicóloga activa.
- Corregir los datos históricos con una migración de datos.

**Consecuencias**

- La restricción sobrevive a cualquier camino de escritura, incluidos los que omitan la validación de aplicación.
- Las filas históricas se listan con `fullName` nulo en lugar de fallar.
- Toda migración futura que toque el trigger debe conservar el comportamiento.

## 2026-09-11 - Deslizamiento de sesión administrativa en cada petición (convergencia)

**Contexto**

La renovación por inactividad solo ocurría en `/auth/me`; una petición a cualquier otra ruta administrativa no desplazaba la ventana, y además la cookie de `/me` se emitía sin opciones de sesión (conservaba clear). Descubierto en `T117`/`T118`.

**Decisión**

El middleware `authenticate` desliza la sesión en cada petición autenticada: actualiza `last_activity_at`/`expiry` con el tiempo de inactividad, firma un nuevo JWT con el mismo `jwt_id` y reescribe la cookie con las opciones de set. `/auth/me` conserva su refresco auditable (doble actualización, por diseño), y el clear vuelve a usarse solo en logout.

**Alternativas consideradas**

- Deslizar solo en `/auth/me`.
- Renovar únicamente la cookie sin volver a firmar el token.
- Usar sesiones opacas sin JWT.

**Consecuencias**

- La expiración de inactividad se cumple en toda la API administrativa.
- Cada petición autenticada escribe en `admin_sessions` (más carga de BD, aceptada por el alcance).
- `/auth/me` realiza dos slides por petición (uno silencioso del middleware y uno auditable del handler).

## 2026-09-11 - Ventana fija y guard de día calendario para los recordatorios del día previo (convergencia)

**Contexto**

`T119`/`T120`: el despacho de recordatorios del día previo dependía solo de la hora y no verificaba el día calendario ni que la cita fuese aún futura, y la programación quedaba atada al resultado del envío inmediato de la confirmación.

**Decisión**

Los recordatorios `recordatorio_24h` y `pago_pendiente` se envían únicamente entre las 18:00 y 19:00 `America/Mexico_City` del día calendario anterior a una cita futura (`isPriorDayReminderDue`); las filas rezagadas se marcan `omitido` con causa "Outside the prior-day reminder window". La programación (`scheduleAppointmentReminders`) se ejecuta en el `finally` de la confirmación, independiente del resultado del envío.

**Alternativas consideradas**

- Confiar en la hora programada de la fila para saber cuándo enviar.
- Reprogramar (devolver la fila a `pendiente`) en lugar de omitir.
- Enviar el recordatorio en la transacción de creación de la cita.

**Consecuencias**

- El criterio usa el día calendario de Ciudad de México, no el reloj de la máquina.
- Las ejecuciones tardías del worker no envían avisos fuera de tiempo; la fila queda omitida y auditable.
- La confirmación sigue existiendo aunque el envío de confirmación falle.

## 2026-09-11 - Confirmación grupal sin destino configurado como `omitido` (convergencia)

**Contexto**

`T123`: cuando `WHATSAPP_PSYCHOLOGISTS_GROUP_ID` no está configurado, el envío grupal de confirmación lanzaba un error que interrumpía la confirmación del paciente.

**Decisión**

La confirmación envía al paciente normalmente y, si el destino grupal no está configurado, marca la fila grupal como `omitido` con `lastError: "Group destination is not configured"` sin lanzar.

**Alternativas consideradas**

- Reintentar el envío grupal en cada ciclo hasta configurar el destino.
- Fallar la confirmación completa.

**Consecuencias**

- El paciente nunca queda sin confirmación por un destino interno pendiente.
- La operación del consultorio debe configurar el destino antes de producir para no perder avisos internos.
- El despachador (`dispatchDueReminders`) mantiene un camino propio: marca `fallido` si falta el destino; diferencia intencional y documentada.

## 2026-09-11 - `400 validation_error` para parámetros de ruta no-UUID (convergencia)

**Contexto**

`T124`: la API administrativa respondía `404 not_found` ante parámetros de ruta inválidos, contradiciendo el formato de error de validación del contrato.

**Decisión**

`assertUuidParam` lanza `AppError(400, "validation_error", "Invalid identifier")` para los ids de ruta, y el test de contrato verifica `PATCH /therapists/not-a-uuid` y `POST /appointments/not-a-uuid/complete`.

**Alternativas consideradas**

- Mantener `404` para cualquier id inválido.
- Devolver `422`.

**Consecuencias**

- `404` vuelve a significar recurso inexistente; `400` indica parámetro malformado.
- Es consistente con el resto de validaciones Zod del contrato.

## 2026-09-11 - Gate de integración con PostgreSQL real (convergencia)

**Contexto**

Las reglas con `btree_gist` (exclusión de traslapes) y los triggers de negocio no se pueden verificar con PGlite, que no incluye la extensión. Las pruebas se saltaban sin cubrir la semántica real.

**Decisión**

El runner de test usa PGlite como base embebida para contrato, integración y unitarias, y un gate opt-in `RUN_POSTGRES_INTEGRATION=true` activa `*.postgres.integration.test.ts` contra PostgreSQL 16 real (`postgres:16-alpine`, puerto 54321) con las migraciones aplicadas vía `prisma migrate deploy`.

**Alternativas consideradas**

- Solo PGlite sin gate real.
- Ejecutar siempre el gate en cada corredor (requiere infraestructura permanente).
- Probar las reglas con SQL directo sin Prisma.

**Consecuencias**

- El gate exige Docker/PostgreSQL disponible; sin él, la suite verdea con esos escenarios omitidos.
- Los invariantes críticas (exclusión, triggers, rollbacks) quedan verificados contra Postgres real.
- `DATABASE_URL` del gate debe apuntar a una base dedicada desechable.

## 2026-09-11 - Disponibilidad con slots reales y clasificación clínica previa (convergencia)

**Contexto**

`T121`/`T115`: la respuesta de disponibilidad construía el template con una lista vacía (`bookingDetailsPrompt([])`), y `classifyIntent` evaluaba el patrón de reserva antes que el contenido clínico sensible.

**Decisión**

`sendAvailability` resuelve el paciente por teléfono, y si tiene psicóloga activa asignada ofrece los 3 siguientes espacios de `findNextAvailableSlots(psicóloga, individual)` en el template (quien no tenga asignación recibe el pedido de datos genérico). `classifyIntent` evalúa el contenido clínico sensible antes que el patrón de reserva (handoff prioritario), con prueba de regresión para mensajes combinados ("me siento muy mal y quiero agendar").

**Alternativas consideradas**

- Ofrecer solo mensajes genéricos sin horarios.
- Calcular slots contra una modalidad fija (60 min) sin importar el tipo final.
- Mantener el orden previo de intents.

**Consecuencias**

- La oferta mostrada ya es reservable y evita prometer horarios ocupados.
- Los horarios se calculan por modalidad `individual` (60 min) para la vista previa; la cita final valida su propio tipo/duración.
- Un mensaje urgente nunca se reserva automáticamente aunque pida agendar.
