# Implementation Plan: Sistema de Gestion Integral del Consultorio

**Branch**: `feature/001-sistema-gestion-consultorio-plan` | **Date**: 2026-09-02 | **Spec**: `specs/001-sistema-gestion-consultorio/spec.md`

**Input**: Feature specification from `specs/001-sistema-gestion-consultorio/spec.md`

## Summary

Construir el MVP desde cero como una aplicacion web full-stack separada en `frontend/` y `backend/`, con landing publica y panel administrativo en Next.js, logica de negocio, webhooks, recordatorios y seguridad en Express, y persistencia en PostgreSQL mediante Prisma. El flujo de WhatsApp sera orquestado por reglas de negocio deterministicas con una capa de IA acotada para clasificacion y redaccion, sin permitir que la IA ejecute acciones criticas sin validaciones del backend.

## Technical Context

**Language/Version**: TypeScript 5.6+, Node.js 22 LTS, SQL para PostgreSQL 16

**Primary Dependencies**: Next.js 16, React 19, Tailwind CSS 4, Express 5, Prisma 6, Zod, `jose`, `pino`, Vitest, React Testing Library, Supertest, Playwright; `node:crypto` nativo para hashes `scrypt`

**Storage**: PostgreSQL 16 en Hostinger con Prisma Migrate; archivos de comprobantes solo como referencia segura opcional administrada por backend

**Testing**: Vitest para logica de negocio y backend, React Testing Library para componentes, Supertest para contratos HTTP, Playwright para flujos web moviles y UAT guiada

**Target Platform**: Navegadores moviles y desktop modernos para landing/panel; servidor Node.js Linux en Hostinger; integracion con WhatsApp Business Cloud API

**Project Type**: Aplicacion web full-stack con frontend y backend separados en un mismo repositorio

**Performance Goals**: respuestas del panel y API administrativa en <300 ms p95 para lecturas comunes; operaciones de agenda/pago en <1 s p95 excluyendo APIs externas; confirmacion inmediata de cita al completar el flujo; primera respuesta por WhatsApp dentro de la ventana operativa del bot y siempre antes de 2 minutos

**Constraints**: mobile-first; sin BaaS; JWT + sesion propia con expiracion por inactividad de 30 minutos; contrasenas con `scrypt` nativo; solo la cuenta activa `admin` con rol `admin` puede iniciar sesion o usar la API administrativa; auditoria obligatoria de accesos y acciones criticas; datos clinicos minimizados a resumen administrativo; chatbot no diagnostica; sabados solo como excepcion manual; sin portal de pacientes ni pasarela de pagos en este MVP

**Scale/Scope**: una cuenta `admin`, múltiples perfiles clínicos sin login y agendas independientes por psicóloga; cientos de pacientes y miles de mensajes/citas al año.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Pre-Research Gate

| Gate                                    | Status | Notes                                                                                                                                                                                               |
| --------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile-first, calm UX                   | PASS   | El frontend se limita a landing y panel con prioridad movil, accesibilidad WCAG AA y paleta verde/sepia definida por la constitucion.                                                               |
| Backend propio y control total          | PASS   | La logica critica, webhooks, recordatorios y autenticacion viven en `backend/` con Express; no se delegan funciones criticas a un BaaS.                                                             |
| PostgreSQL + Prisma                     | PASS   | La persistencia queda definida sobre PostgreSQL 16 y Prisma Migrate.                                                                                                                                |
| Seguridad y acceso por identidad y rol  | PASS   | El plan exige JWT en cookie segura, sesion propia con inactividad de 30 minutos, rutas protegidas y la identidad exacta `admin` con rol `admin`; toda denegación queda en `audit_logs`.             |
| Politica de cancelacion y recordatorios | PASS   | La confirmacion incluye el aviso de 24 h; el worker por intervalo usa `America/Mexico_City`, opera solo de 18:00 a 18:59 el dia previo y persiste destinos separados para paciente y grupo interno. |
| Privacidad y auditabilidad              | PASS   | Los mensajes clinicos se minimizan a resumen administrativo; accesos exitosos/fallidos y acciones criticas quedan auditados.                                                                        |
| Persona y limites del chatbot           | PASS   | El bot opera con tono definido, transparencia, derivacion clinica y guardrails para evitar diagnostico o recomendaciones.                                                                           |
| Quality gates                           | PASS   | El plan contempla pruebas unitarias, integracion, UAT y seguridad antes del cierre de fase.                                                                                                         |

### Post-Design Re-Check

| Gate                                        | Status | Notes                                                                                                                |
| ------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| Artefactos de diseno completos              | PASS   | `research.md`, `data-model.md`, `contracts/api.yaml` y `quickstart.md` cubren stack, datos, interfaces y validacion. |
| Sin contradicciones funcionales bloqueantes | PASS   | Las aclaraciones de identidad, privacidad, sesion y verificacion quedaron reflejadas en los artefactos de diseno.    |
| Complejidad justificada                     | PASS   | Se mantiene una estructura minima de dos aplicaciones y sin paquete compartido adicional en MVP.                     |

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
│   │   └── payments/page.tsx
│   └── globals.css
├── components/
│   ├── landing/
│   ├── agenda/
│   ├── admin/
│   │   ├── agenda/
│   │   └── payments/
│   ├── directorio/
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
│   │   ├── directory/
│   │   ├── reminders/
│   │   ├── chatbot/
│   │   └── audit/
│   ├── integrations/
│   │   ├── whatsapp/
│   │   └── ai/
│   └── jobs/
│       ├── process-reminders.job.ts
│       └── reminders-worker.entry.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── tests/
    ├── contract/
    ├── integration/
    └── unit/
```

**Structure Decision**: Se elige una estructura de dos aplicaciones (`frontend/` + `backend/`) porque la constitucion exige Next.js para interfaz y un backend propio en Express para logica, autenticacion, webhooks y worker por intervalo. No se crea un paquete `shared/` en el MVP para evitar complejidad prematura; cualquier tipo compartido se mantiene pequeno y duplicado hasta que el costo real justifique extraerlo.

## Implementation Decisions

1. **Workspace y scripts**: usar `npm` workspaces en la raiz para evitar dependencias adicionales en un repo vacio y permitir comandos simples por workspace.
2. **Autenticacion administrativa**: login con usuario y contrasena, cookie `HttpOnly` segura con JWT firmado y una tabla `admin_sessions` para imponer expiracion por inactividad de 30 minutos, revocacion y auditoria. Las contrasenas se derivan y verifican con `scrypt` nativo y comparacion de tiempo constante. El servicio autentica únicamente `username = 'admin'`, `role = 'admin'`, activo y con login de panel habilitado. Los perfiles de psicólogos/as y pacientes se muestran en el directorio sin poder obtener una sesión.
3. **Motor conversacional**: usar orquestacion rule-first. La IA solo ayuda a clasificar intenciones y redactar respuestas dentro de prompts acotados; las acciones de agenda, cancelacion, pagos y verificacion siempre pasan por servicios deterministas del backend.
4. **Integracion WhatsApp**: integrar primero con WhatsApp Business Cloud API mediante un adaptador `WhatsAppGateway`; el dominio no depende del proveedor concreto y puede cambiar despues sin reescribir reglas de negocio.
5. **Disponibilidad y traslapes**: perfiles clínicos explícitos, asignación paciente-psicóloga y restricción `EXCLUDE` PostgreSQL por psicóloga/rango activo `[scheduled_at, ends_at)`. El servidor deriva 60 min para individual y 90 min para pareja/familiar; modalidad no modifica el conflicto.
6. **Excepcion sabatina**: el bot no ofrece sabados en automatico; solo el panel permite marcar una cita fuera de horario regular como excepcion manual.
7. **Pagos y comprobantes**: los pagos se modelan como eventos vinculados a la cita. El comprobante se guarda como referencia segura opcional y estado de validacion, no como modulo documental completo.
8. **Recordatorios**: al crear una cita se programan los avisos previos; al confirmar se aseguran las confirmaciones y se intenta su despacho. El aviso prioritario de pago se crea al completar la cita si no hay pago completo validado. Un worker por intervalo ejecuta el despacho al iniciar y cada cinco minutos; puede arrancar junto al backend con `ENABLE_REMINDER_WORKER=true` o como proceso dedicado con `npm run reminders:worker --workspace backend`. El grupo nunca recibe pagos o datos clínicos y su compatibilidad con el proveedor se valida antes de producción.
9. **Privacidad de chat**: no persistir payloads clinicos completos; guardar solo resumen administrativo breve, metadatos y `wa_message_id` cuando haya contenido sensible.
10. **Observabilidad**: logs estructurados con `pino`, correlacion por `request_id` y eventos de auditoria separados de logs tecnicos.

## Cronograma Comercial Alineado

La numeración de las historias en `tasks.md` se conserva para mantener sus IDs. Para eliminar ambigüedad con el cronograma comercial, los entregables que deben cerrarse en cada fase son los siguientes.

**Ajuste del plan (16/09/2026):** el cronograma pasa de 29 a **32 días** con entrega máxima el **1 de octubre de 2026**, para incorporar una fase dedicada de alineación de la interfaz al mockup `mockupWithDashboard.png` que se ejecuta **en paralelo con la landing (US6)**; el conteo de avance real se mide contra `tasks.md` (137/164 al día 17, pendientes US4/US5/US6/UI).

### Fase 4: Integracion de pagos y recordatorios

- Registrar anticipos, pagos completos y saldos pendientes desde el panel de `admin`.
- Incluir en la plantilla de confirmación de WhatsApp la leyenda obligatoria de cancelación con al menos 24 horas de anticipación.
- Calcular y guardar la clasificación `a_tiempo` o `tardia` al cancelar, sin realizar cargos automáticos.
- Crear confirmación y recordatorio por cita activa para paciente y grupo interno, con estados independientes; los avisos de saldo solo van al paciente.
- Ejecutar `process-reminders` cada cinco minutos, con guardia horaria `18:00 <= hora local < 19:00` en `America/Mexico_City`; fuera de ese intervalo no puede enviar ni reintentar.
- Aprobar pruebas de zona horaria, bordes de ventana, idempotencia, destinatarios y fallos de proveedor.

### Fase 6: Panel administrativo y control de acceso

- Presentar a Jocelyn una agenda, pagos pendientes y directorio de psicólogos/as y pacientes preparado para crecimiento.
- Exponer el registro, recordatorio manual y confirmacion de pagos en `/admin/payments`.
- Rechazar en login y en cada ruta administrativa toda identidad distinta de la cuenta activa `admin` con rol `admin`.
- Aplicar `authenticate` seguido de `authorizeAdminIdentity` antes de controladores y repositorios Prisma; auditar login y autorización denegados.
- No habilitar Supabase RLS porque la constitución establece PostgreSQL privado detrás de Express. Si la arquitectura cambia a Supabase, añadir políticas RLS equivalentes como requisito de migración, no como sustituto del middleware actual.

### Fase UI: Alineacion de interfaz al mockup (en paralelo con US6)

- Rediseñar el panel administrativo (login, dashboard, agenda, pagos, pacientes, terapeutas, directorio) para que sea **fiel al mockup** `mockupWithDashboard.png` de la raíz del proyecto, aplicando la paleta verde/sepia y el sistema de diseño unificado de la constitución.
- Construir la landing pública (US6) con la misma identidad: hero, secciones informativas, CTA a WhatsApp y acceso discreto al panel.
- Presentar a la cliente una comparativa antes/después frente al mockup aprobado; la replicación visual la ejecuta el desarrollador tomando la referencia directa de la imagen.
- Tareas: T165–T171 (Phase 32 de `tasks.md`).

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
