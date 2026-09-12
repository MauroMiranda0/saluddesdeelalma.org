# saluddesdeelalma.org

## Estado actual

Este repositorio cerró la **Fase 3: Historia de Usuario 1 - Agendar una cita por WhatsApp** del proyecto `001-sistema-gestion-consultorio`. Las remediaciones de convergencia de esta fase, `T091` a `T095` y la segunda pasada `T115` a `T126` (Phase 23), están cerradas y verificadas con gates.

En este punto existe:

- monorepo con `npm` workspaces
- workspace `backend/` con Express, Prisma, Zod, jose, pino y CORS
- workspace `frontend/` con Next.js y shell base de aplicacion
- configuracion base de ESLint y Prettier
- plantillas de variables de entorno
- bootstrap del backend en `backend/src/app.ts` y `backend/src/server.ts`
- rutas shell de health y auth en `/health`, `/api/v1/health` y `/api/v1/auth/*`
- Prisma schema base y migracion inicial para admin, pacientes, citas, pagos, recordatorios, chat y auditoria
- migracion de reglas de negocio para `users`, perfiles de directorio, cancelaciones y destinatarios de recordatorio
- evolución de reglas clínicas: perfiles de psicóloga, asignación paciente-psicóloga, sesiones de 60/90 minutos y restricción de traslapes por intervalo
- migración de endurecimiento `20261101000000_convergence_hardening`: el trigger de citas rechaza en base de datos las citas sin psicóloga activa asignada (`therapist_id` nulo) y el listado administrativo tolera filas históricas sin terapeuta
- seed idempotente de Jocelyn como única cuenta activa `admin` y prueba de integración de las restricciones de acceso
- infraestructura de sesiones administrativas con JWT, cookie HttpOnly, expiracion por inactividad y renovación (slide) en cada petición autenticada; `/auth/me` renueva la cookie con opciones de sesión
- middleware de autenticacion, autorizacion admin y auditoria de denegaciones con `requestId` en la metadata
- helpers frontend para API y sesion
- validadores Zod para paciente, cita, pago y chatbot
- webhook de WhatsApp en `/api/v1/webhooks/whatsapp`, con verificacion de Meta y aceptacion asincrona de mensajes de texto
- flujo determinista de disponibilidad, agendamiento, derivacion clinica y transparencia sobre el asistente digital; la evaluación clínica ocurre antes que el flujo de reserva (handoff prioritario)
- la respuesta de disponibilidad ofrece horarios concretos (3 slots siguientes) cuando el paciente tiene psicóloga activa asignada
- persistencia de tipo/duración de cita y recordatorios independientes para paciente y grupo interno; la asignación inicial aún requiere el panel administrativo
- recordatorios del día previo programados a las 18:00 `America/Mexico_City`, con guard de día calendario anterior y cita aún futura; filas rezagadas se marcan omitidas; la programación es independiente del envío de confirmación
- confirmación grupal marcada `omitido` si el destino interno no está configurado, sin interrumpir la cabida del paciente
- la API administrativa responde `400 validation_error` para parámetros de ruta no-UUID
- worker bajo demanda de recordatorios en `backend/src/jobs/process-reminders.job.ts` (`npm run reminders:worker`), sin scheduler externo aún
- pruebas de contrato del webhook, pruebas de integracion del flujo de agendamiento (cita, confirmacion y auditoria), pruebas unitarias de la ventana de recordatorios y un gate opt-in de integración con PostgreSQL real (`RUN_POSTGRES_INTEGRATION`)

En este punto todavia no existe:

- login funcional con credenciales; `/api/v1/auth/login` es shell y devuelve `501` hasta `T028`
- panel administrativo funcional de agenda/pagos (asignación de psicóloga, agenda, pagos)
- landing publica funcional
- scheduler/programador que enlace el worker de recordatorios (hoy se ejecuta a demanda); tampoco cancelaciones, pagos, FAQ y consultas de estado por WhatsApp
- pruebas E2E; las pruebas automatizadas actuales cubren contrato, integracion, unitarias (ventana de recordatorios) y restricciones de migracion

## Estructura actual

```text
.
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── config/
│   │   ├── lib/
│   │   ├── integrations/whatsapp/
│   │   ├── middleware/
│   │   ├── jobs/
│   │   └── modules/
│   │       ├── appointments/
│   │       ├── audit/
│   │       ├── auth/
│   │       ├── chatbot/
│   │       ├── patients/
│   │       ├── reminders/
│   │       └── therapists/
│   ├── tests/
│   │   ├── contract/
│   │   ├── integration/
│   │   └── unit/
│   └── tsconfig.json
├── frontend/
│   ├── .env.example
│   ├── app/
│   ├── lib/
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
├── docs/
├── specs/
├── .gitignore
├── .nvmrc
├── .prettierignore
├── eslint.config.js
├── package.json
└── prettier.config.js
```

## Comandos verificados

Instalar dependencias del monorepo:

```bash
npm install
```

Validar Prisma schema:

```bash
npm run prisma:validate
```

El comando carga `backend/.env.example`, por lo que valida el schema sin requerir un archivo `.env` ni conectarse a PostgreSQL.

Ejecutar las pruebas del backend (contrato, integración y unitarias):

```bash
npm run test --workspace backend
```

Las pruebas `*.postgres.integration.test.ts` se saltan por defecto (requieren `RUN_POSTGRES_INTEGRATION="true"` y una base PostgreSQL real).

Validar tipos:

```bash
npm run typecheck
```

Validar lint y formato:

```bash
npm run lint
npm run format:check
```

Build completo:

```bash
npm run build
```

Levantar backend compilado:

```bash
npm run start:backend
```

El proceso lee las variables desde el entorno (no carga `backend/.env`); copie `backend/.env.example` a `backend/.env` y exporte las variables, o súmelas al entorno antes de ejecutar.

Health check verificado:

```bash
curl http://localhost:4000/health
```

La respuesta verificada es:

```json
{ "status": "ok", "service": "saluddesdeelalma-backend" }
```

Levantar frontend compilado:

```bash
npm run start:frontend
```

El servidor de Next.js inicia en `http://localhost:3000`. Verificado: `/admin`, `/admin/therapists`, `/admin/patients` y `/admin/appointments` responden `200`; la ruta publica responde `404` hasta implementar la landing en US6.

Gate de integración con PostgreSQL real (reglas de sesión y recordatorios):

```bash
# 1) Levantar PostgreSQL 16 con btree_gist (Contrib)
docker run -d --name sda-pg-test -e POSTGRES_USER=sda -e POSTGRES_PASSWORD=sda_test_password -e POSTGRES_DB=sda -p 54321:5432 postgres:16-alpine

# 2) Aplicar migraciones (desde el directorio backend/)
# PowerShell
$env:DATABASE_URL = "postgresql://sda:sda_test_password@localhost:54321/sda?schema=public"
npx prisma migrate deploy --schema prisma/schema.prisma

# 3) Ejecutar la suite con el gate activado
$env:RUN_POSTGRES_INTEGRATION = "true"
npm run test --workspace backend
# 4) Finalizado: docker rm -f sda-pg-test
```

Worker de recordatorios bajo demanda (ejecuta el despacho y repite cada 5 minutos; requiere base de datos y credenciales de WhatsApp):

```bash
npm run reminders:worker --workspace backend
```

## Limitaciones actuales

- `npm run start:backend` requiere haber ejecutado `npm run build`.
- `npm run start:frontend` requiere haber ejecutado `npm run build`.
- Sin `WHATSAPP_ACCESS_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID`, el adaptador de WhatsApp simula el envio fuera de produccion; en produccion ambas credenciales son obligatorias.
- El frontend arranca como shell y no tiene pagina publica ni panel funcional todavia.
- Las migraciones se aplicaron y verificaron contra un PostgreSQL 16 real mediante el gate `RUN_POSTGRES_INTEGRATION` (incluida `20261101000000_convergence_hardening`); la configuracion de destino y credenciales de produccion sigue pendiente.
- `npm audit` no reporta vulnerabilidades conocidas en las dependencias instaladas.

## Referencias

- especificacion: `specs/001-sistema-gestion-consultorio/spec.md`
- plan: `specs/001-sistema-gestion-consultorio/plan.md`
- tareas: `specs/001-sistema-gestion-consultorio/tasks.md`
- decisiones tecnicas: `docs/decisions.md`
