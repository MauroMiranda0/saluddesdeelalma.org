# saluddesdeelalma.org

## Estado actual

Este repositorio cerró la **Fase 3: Historia de Usuario 1 - Agendar una cita por WhatsApp** del proyecto `001-sistema-gestion-consultorio`. Las remediaciones de convergencia de esta fase, `T091` a `T095`, están cerradas.

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
- seed idempotente de Jocelyn como única cuenta activa `admin` y prueba de integración de las restricciones de acceso
- infraestructura de sesiones administrativas con JWT, cookie HttpOnly y expiracion por inactividad
- middleware de autenticacion, autorizacion admin y auditoria de denegaciones
- helpers frontend para API y sesion
- validadores Zod para paciente, cita, pago y chatbot
- webhook de WhatsApp en `/api/v1/webhooks/whatsapp`, con verificacion de Meta y aceptacion asincrona de mensajes de texto
- flujo determinista de disponibilidad, agendamiento, derivacion clinica y transparencia sobre el asistente digital
- persistencia de tipo/duración de cita y recordatorios independientes para paciente y grupo interno; la asignación inicial aún requiere el panel administrativo
- pruebas de contrato del webhook y pruebas de integracion del flujo de agendamiento, incluyendo persistencia de cita, confirmacion y auditoria

En este punto todavia no existe:

- login funcional con credenciales; `/api/v1/auth/login` es shell y devuelve `501` hasta `T028`
- panel administrativo funcional de agenda/pagos
- landing publica funcional
- job de despacho de recordatorios, cancelaciones, pagos, FAQ y consultas de estado por WhatsApp
- pruebas unitarias y E2E; las pruebas automatizadas actuales cubren contrato, integracion y restricciones de migracion

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
│   │   └── modules/
│   │       ├── appointments/
│   │       ├── chatbot/
│   │       ├── patients/
│   │       ├── reminders/
│   │       └── audit/
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

Ejecutar las pruebas de contrato e integracion del backend:

```bash
npm run test --workspace backend
```

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

El servidor de Next.js inicia en `http://localhost:3000`. La ruta publica aun responde `404` hasta implementar la landing en US6.

## Limitaciones actuales

- `npm run start:backend` requiere haber ejecutado `npm run build`.
- `npm run start:frontend` requiere haber ejecutado `npm run build`.
- Sin `WHATSAPP_ACCESS_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID`, el adaptador de WhatsApp simula el envio fuera de produccion; en produccion ambas credenciales son obligatorias.
- El frontend arranca como shell y no tiene pagina publica ni panel funcional todavia.
- No se ha ejecutado `prisma migrate deploy/status` contra PostgreSQL real; solo se valido el schema localmente.
- `npm audit` no reporta vulnerabilidades conocidas en las dependencias instaladas.

## Referencias

- especificacion: `specs/001-sistema-gestion-consultorio/spec.md`
- plan: `specs/001-sistema-gestion-consultorio/plan.md`
- tareas: `specs/001-sistema-gestion-consultorio/tasks.md`
- decisiones tecnicas: `docs/decisions.md`
