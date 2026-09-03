# Implementation Plan: Sistema de Gestion Integral del Consultorio

**Branch**: `feature/001-sistema-gestion-consultorio-plan` | **Date**: 2026-09-02 | **Spec**: `specs/001-sistema-gestion-consultorio/spec.md`

**Input**: Feature specification from `specs/001-sistema-gestion-consultorio/spec.md`

## Summary

Construir el MVP desde cero como una aplicacion web full-stack separada en `frontend/` y `backend/`, con landing publica y panel administrativo en Next.js, logica de negocio, webhooks, recordatorios y seguridad en Express, y persistencia en PostgreSQL mediante Prisma. El flujo de WhatsApp sera orquestado por reglas de negocio deterministicas con una capa de IA acotada para clasificacion y redaccion, sin permitir que la IA ejecute acciones criticas sin validaciones del backend.

## Technical Context

**Language/Version**: TypeScript 5.6+, Node.js 22 LTS, SQL para PostgreSQL 16

**Primary Dependencies**: Next.js 15, React 19, Tailwind CSS 4, Express 5, Prisma 6, Zod, `jose`, `bcrypt`, `pino`, `node-cron`, Vitest, React Testing Library, Supertest, Playwright

**Storage**: PostgreSQL 16 en Hostinger con Prisma Migrate; archivos de comprobantes solo como referencia segura opcional administrada por backend

**Testing**: Vitest para logica de negocio y backend, React Testing Library para componentes, Supertest para contratos HTTP, Playwright para flujos web moviles y UAT guiada

**Target Platform**: Navegadores moviles y desktop modernos para landing/panel; servidor Node.js Linux en Hostinger; integracion con WhatsApp Business Cloud API

**Project Type**: Aplicacion web full-stack con frontend y backend separados en un mismo repositorio

**Performance Goals**: respuestas del panel y API administrativa en <300 ms p95 para lecturas comunes; operaciones de agenda/pago en <1 s p95 excluyendo APIs externas; confirmacion inmediata de cita al completar el flujo; primera respuesta por WhatsApp dentro de la ventana operativa del bot y siempre antes de 2 minutos

**Constraints**: mobile-first; sin BaaS; JWT + sesion propia con expiracion por inactividad de 30 minutos; auditoria obligatoria de accesos y acciones criticas; datos clinicos minimizados a resumen administrativo; chatbot no diagnostica; sabados solo como excepcion manual; sin portal de pacientes ni pasarela de pagos en este MVP

**Scale/Scope**: una sola psicologa, una sola agenda, una sola ubicacion, cientos de pacientes y miles de mensajes/citas al ano; alcance MVP enfocado en agenda, pagos, recordatorios, landing y chatbot administrativo

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Gate

| Gate | Status | Notes |
|---|---|---|
| Mobile-first, calm UX | PASS | El frontend se limita a landing y panel con prioridad movil, accesibilidad WCAG AA y paleta verde/sepia definida por la constitucion. |
| Backend propio y control total | PASS | La logica critica, webhooks, recordatorios y autenticacion viven en `backend/` con Express; no se delegan funciones criticas a un BaaS. |
| PostgreSQL + Prisma | PASS | La persistencia queda definida sobre PostgreSQL 16 y Prisma Migrate. |
| Seguridad y acceso por rol | PASS | El plan exige JWT en cookie segura, sesion propia con inactividad de 30 minutos, rutas protegidas, rol admin y `audit_logs`. |
| Privacidad y auditabilidad | PASS | Los mensajes clinicos se minimizan a resumen administrativo; accesos exitosos/fallidos y acciones criticas quedan auditados. |
| Persona y limites del chatbot | PASS | El bot opera con tono definido, transparencia, derivacion clinica y guardrails para evitar diagnostico o recomendaciones. |
| Quality gates | PASS | El plan contempla pruebas unitarias, integracion, UAT y seguridad antes del cierre de fase. |

### Post-Design Re-Check

| Gate | Status | Notes |
|---|---|---|
| Artefactos de diseno completos | PASS | `research.md`, `data-model.md`, `contracts/api.yaml` y `quickstart.md` cubren stack, datos, interfaces y validacion. |
| Sin contradicciones funcionales bloqueantes | PASS | Las aclaraciones de identidad, privacidad, sesion y verificacion quedaron reflejadas en los artefactos de diseno. |
| Complejidad justificada | PASS | Se mantiene una estructura minima de dos aplicaciones y sin paquete compartido adicional en MVP. |

## Project Structure

### Documentation (this feature)

```text
specs/001-sistema-gestion-consultorio/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.yaml
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
frontend/
├── app/
│   ├── page.tsx
│   ├── admin/
│   │   ├── login/page.tsx
│   │   ├── agenda/page.tsx
│   │   └── pagos/page.tsx
│   └── globals.css
├── components/
│   ├── landing/
│   ├── agenda/
│   ├── pagos/
│   └── ui/
├── lib/
│   ├── api/
│   ├── auth/
│   └── validators/
└── tests/
    ├── components/
    └── e2e/

backend/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   ├── middleware/
│   ├── lib/
│   ├── modules/
│   │   ├── auth/
│   │   ├── patients/
│   │   ├── appointments/
│   │   ├── payments/
│   │   ├── reminders/
│   │   ├── chatbot/
│   │   └── audit/
│   ├── integrations/
│   │   ├── whatsapp/
│   │   └── ai/
│   └── jobs/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── tests/
    ├── contract/
    ├── integration/
    └── unit/
```

**Structure Decision**: Se elige una estructura de dos aplicaciones (`frontend/` + `backend/`) porque la constitucion exige Next.js para interfaz y un backend propio en Express para logica, autenticacion, webhooks y cron. No se crea un paquete `shared/` en el MVP para evitar complejidad prematura; cualquier tipo compartido se mantiene pequeno y duplicado hasta que el costo real justifique extraerlo.

## Implementation Decisions

1. **Workspace y scripts**: usar `npm` workspaces en la raiz para evitar dependencias adicionales en un repo vacio y permitir comandos simples por workspace.
2. **Autenticacion administrativa**: login con credenciales, cookie `HttpOnly` segura con JWT firmado y una tabla `admin_sessions` para imponer expiracion por inactividad de 30 minutos, revocacion y auditoria.
3. **Motor conversacional**: usar orquestacion rule-first. La IA solo ayuda a clasificar intenciones y redactar respuestas dentro de prompts acotados; las acciones de agenda, cancelacion, pagos y verificacion siempre pasan por servicios deterministas del backend.
4. **Integracion WhatsApp**: integrar primero con WhatsApp Business Cloud API mediante un adaptador `WhatsAppGateway`; el dominio no depende del proveedor concreto y puede cambiar despues sin reescribir reglas de negocio.
5. **Disponibilidad y dobles reservas**: bloquear doble reserva con una restriccion unica parcial sobre citas activas y validacion transaccional en servicio de agendamiento.
6. **Excepcion sabatina**: el bot no ofrece sabados en automatico; solo el panel permite marcar una cita fuera de horario regular como excepcion manual.
7. **Pagos y comprobantes**: los pagos se modelan como eventos vinculados a la cita. El comprobante se guarda como referencia segura opcional y estado de validacion, no como modulo documental completo.
8. **Recordatorios**: persistir recordatorios en BD y ejecutarlos con un job recurrente cada 5 minutos que reclame filas pendientes con estrategia idempotente y reintentos limitados.
9. **Privacidad de chat**: no persistir payloads clinicos completos; guardar solo resumen administrativo breve, metadatos y `wa_message_id` cuando haya contenido sensible.
10. **Observabilidad**: logs estructurados con `pino`, correlacion por `request_id` y eventos de auditoria separados de logs tecnicos.

## Phase Outputs

### Phase 0: Research

- `research.md` fija stack, seguridad, estrategia del chatbot, recordatorios, pagos y estructura del repositorio.
- No quedan marcadores `NEEDS CLARIFICATION` para pasar a diseno.

### Phase 1: Design & Contracts

- `data-model.md` define entidades, relaciones, restricciones y transiciones de estado.
- `contracts/api.yaml` define la API administrativa y el webhook de WhatsApp.
- `quickstart.md` documenta validacion end-to-end local y criterios de prueba.

## Complexity Tracking

No hay violaciones constitucionales que requieran justificacion en esta fase.
