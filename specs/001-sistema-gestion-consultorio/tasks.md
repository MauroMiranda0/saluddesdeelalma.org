---
description: "Lista de tareas para implementar la funcionalidad"
---

# Tareas: Sistema de Gestion Integral del Consultorio

**Input**: Documentos de diseno de `/specs/001-sistema-gestion-consultorio/`

**Prerrequisitos**: `plan.md` (requerido), `spec.md` (requerido para historias de usuario), `research.md`, `data-model.md`, `contracts/`

**Pruebas**: Se incluyen tareas de contrato, integracion, componentes y E2E porque la constitucion y `quickstart.md` exigen gates de validacion.

**Organizacion**: Las tareas se agrupan por historia de usuario para permitir implementacion y prueba independiente.

## Formato: `[ID] [P?] [Story] Descripcion`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin depender de tareas incompletas)
- **[Story]**: Historia de usuario a la que pertenece (`US1` a `US6`)
- Cada tarea incluye rutas exactas de archivos

## Fase 1: Preparacion (Infraestructura Compartida)

**Proposito**: Inicializacion del repositorio y estructura base del proyecto

- [x] T001 Crear configuracion de monorepo con workspaces en `package.json`, `.gitignore` y `.nvmrc`
- [x] T002 [P] Inicializar workspace del backend en `backend/package.json` y `backend/tsconfig.json`
- [x] T003 [P] Inicializar workspace del frontend en `frontend/package.json`, `frontend/tsconfig.json` y `frontend/next.config.ts`
- [x] T004 [P] Configurar linting y formato en `eslint.config.js` y `prettier.config.js`
- [x] T005 [P] Agregar plantillas de variables de entorno en `backend/.env.example` y `frontend/.env.example`

---

## Fase 2: Fundacional (Prerequisitos Bloqueantes)

**Proposito**: Infraestructura central que DEBE completarse antes de cualquier historia de usuario

**CRITICO**: Ninguna historia de usuario puede comenzar antes de completar esta fase

- [x] T006 Crear bootstrap del backend y entrypoints del servidor en `backend/src/app.ts` y `backend/src/server.ts`
- [x] T007 [P] Configurar entorno, logging y manejo global de errores del backend en `backend/src/config/env.ts`, `backend/src/lib/logger.ts` y `backend/src/middleware/error-handler.ts`
- [x] T008 [P] Definir el esquema base de Prisma para admin, pacientes, citas, pagos, recordatorios, chat y auditoria en `backend/prisma/schema.prisma`
- [x] T009 [P] Crear migracion inicial de Prisma y wrapper del cliente en `backend/prisma/migrations/*` y `backend/src/lib/prisma.ts`
- [x] T010 Implementar middleware de autenticacion y sesiones en `backend/src/modules/auth/session.service.ts`, `backend/src/modules/auth/token.service.ts` y `backend/src/middleware/authenticate.ts`
- [x] T011 [P] Implementar infraestructura de auditoria en `backend/src/modules/audit/audit.service.ts` y `backend/src/modules/audit/audit.repository.ts`
- [x] T012 [P] Montar router base de API y rutas shell de health/auth en `backend/src/app.ts`, `backend/src/modules/health/health.routes.ts` y `backend/src/modules/auth/auth.routes.ts`
- [x] T013 [P] Crear app shell del frontend y helpers de API/sesion en `frontend/app/layout.tsx`, `frontend/lib/api/client.ts` y `frontend/lib/auth/session.ts`
- [x] T014 [P] Agregar schemas de validacion compartidos para paciente, cita, pago y chatbot en `backend/src/lib/validators/patient.ts`, `backend/src/lib/validators/appointment.ts`, `backend/src/lib/validators/payment.ts` y `backend/src/lib/validators/chatbot.ts`

**Punto de control**: La base comun queda lista y ya pueden empezar las historias de usuario

---

## Fase 3: Historia de Usuario 1 - Agendar una cita por WhatsApp (Prioridad: P1) MVP

**Objetivo**: Permitir que un paciente agende una cita por WhatsApp con disponibilidad real, confirmacion inmediata y derivacion clinica segura.

**Prueba independiente**: Un paciente agenda por WhatsApp, recibe confirmacion con fecha, hora y modalidad, y la cita aparece en la agenda del panel.

### Pruebas para Historia de Usuario 1

- [ ] T015 [P] [US1] Crear prueba de contrato del webhook de WhatsApp en `backend/tests/contract/whatsapp-webhook.contract.test.ts`
- [ ] T016 [P] [US1] Crear prueba de integracion del flujo de agendamiento por WhatsApp en `backend/tests/integration/whatsapp-booking.integration.test.ts`

### Implementacion para Historia de Usuario 1

- [ ] T017 [P] [US1] Implementar persistencia y busqueda de pacientes en `backend/src/modules/patients/patients.repository.ts` y `backend/src/modules/patients/patients.service.ts`
- [ ] T018 [P] [US1] Implementar persistencia de citas y reglas de disponibilidad en `backend/src/modules/appointments/appointments.repository.ts` y `backend/src/modules/appointments/appointments.service.ts`
- [ ] T019 [P] [US1] Implementar adaptador del proveedor de WhatsApp en `backend/src/integrations/whatsapp/whatsapp.gateway.ts`
- [ ] T020 [US1] Implementar intents de agendamiento y reglas de derivacion clinica en `backend/src/modules/chatbot/chatbot.intents.ts` y `backend/src/modules/chatbot/chatbot.booking.handler.ts`
- [ ] T021 [US1] Implementar controller y rutas del webhook de WhatsApp en `backend/src/modules/chatbot/chatbot.controller.ts` y `backend/src/modules/chatbot/chatbot.routes.ts`
- [ ] T022 [US1] Crear programacion del recordatorio de confirmacion al agendar en `backend/src/modules/reminders/reminders.service.ts`
- [ ] T023 [US1] Persistir mensajes entrantes y salientes del chat en `backend/src/modules/chatbot/chat-messages.repository.ts` y `backend/src/modules/chatbot/chatbot.service.ts`
- [ ] T024 [US1] Auditar agendamientos, conflictos de horario y derivaciones clinicas en `backend/src/modules/audit/audit.service.ts`

**Punto de control**: La Historia de Usuario 1 debe quedar funcional y comprobable de forma independiente

---

## Fase 4: Historia de Usuario 2 - Gestionar la agenda y las citas desde el panel (Prioridad: P1)

**Objetivo**: Dar a la psicologa un panel movil seguro para ver agenda, crear, mover y cancelar citas.

**Prueba independiente**: La psicologa inicia sesion, ve la agenda del dia, crea o cancela una cita y el cambio se refleja de inmediato.

### Pruebas para Historia de Usuario 2

- [ ] T025 [P] [US2] Crear prueba de contrato de autenticacion y sesion en `backend/tests/contract/auth.contract.test.ts`
- [ ] T026 [P] [US2] Crear prueba de contrato de endpoints administrativos de citas en `backend/tests/contract/appointments.contract.test.ts`
- [ ] T027 [P] [US2] Crear prueba E2E movil de login y agenda diaria en `frontend/tests/e2e/admin-agenda.spec.ts`

### Implementacion para Historia de Usuario 2

- [ ] T028 [P] [US2] Implementar controllers y rutas de login, logout y sesion activa en `backend/src/modules/auth/auth.controller.ts`, `backend/src/modules/auth/auth.service.ts` y `backend/src/modules/auth/auth.routes.ts`
- [ ] T029 [US2] Implementar endpoints administrativos para listar, crear, mover y cancelar citas en `backend/src/modules/appointments/appointments.controller.ts` y `backend/src/modules/appointments/admin-appointments.routes.ts`
- [ ] T030 [US2] Implementar pagina de login del panel en `frontend/app/admin/login/page.tsx` y `frontend/components/ui/login-form.tsx`
- [ ] T031 [P] [US2] Implementar pagina de agenda y lista diaria de citas en `frontend/app/admin/agenda/page.tsx` y `frontend/components/agenda/daily-agenda.tsx`
- [ ] T032 [P] [US2] Implementar formulario de cita y dialogo de cancelacion en `frontend/components/agenda/appointment-form.tsx` y `frontend/components/agenda/cancel-appointment-dialog.tsx`
- [ ] T033 [US2] Implementar proteccion de rutas y expiracion de sesion en `frontend/app/admin/agenda/page.tsx`, `frontend/lib/auth/session.ts` y `frontend/middleware.ts`
- [ ] T034 [US2] Disparar notificaciones de cancelacion desde acciones administrativas en `backend/src/modules/appointments/appointments.service.ts` y `backend/src/modules/reminders/reminders.service.ts`
- [ ] T035 [US2] Auditar login exitoso, login fallido y mutaciones administrativas de citas en `backend/src/modules/auth/auth.service.ts` y `backend/src/modules/audit/audit.service.ts`

**Punto de control**: Las Historias de Usuario 1 y 2 deben funcionar de forma independiente

---

## Fase 5: Historia de Usuario 3 - Registrar anticipos y pagos de sesion (Prioridad: P2)

**Objetivo**: Registrar anticipo y pago completo desde el panel con estado visible por cita.

**Prueba independiente**: La psicologa registra un anticipo y despues un pago completo y la cita refleja `anticipo` y luego `completado`.

### Pruebas para Historia de Usuario 3

- [ ] T036 [P] [US3] Crear prueba de contrato de pagos en `backend/tests/contract/payments.contract.test.ts`
- [ ] T037 [P] [US3] Crear prueba de integracion del flujo de pagos en `backend/tests/integration/payments-flow.integration.test.ts`
- [ ] T038 [P] [US3] Crear prueba E2E movil para registro de pagos en `frontend/tests/e2e/admin-payments.spec.ts`

### Implementacion para Historia de Usuario 3

- [ ] T039 [P] [US3] Implementar persistencia de pagos y reglas de negocio en `backend/src/modules/payments/payments.repository.ts` y `backend/src/modules/payments/payments.service.ts`
- [ ] T040 [US3] Implementar endpoints de pagos en `backend/src/modules/payments/payments.controller.ts` y `backend/src/modules/payments/payments.routes.ts`
- [ ] T041 [P] [US3] Implementar agregacion del estado de pago por cita en `backend/src/modules/payments/payment-status.service.ts`
- [ ] T042 [P] [US3] Implementar pagina de pagos y acciones rapidas en `frontend/app/admin/pagos/page.tsx` y `frontend/components/pagos/payment-actions.tsx`
- [ ] T043 [US3] Agregar campo de referencia de comprobante y manejo de validacion en `backend/src/modules/payments/payments.service.ts` y `frontend/components/pagos/payment-proof-field.tsx`
- [ ] T044 [US3] Auditar registro y validacion de pagos en `backend/src/modules/payments/payments.service.ts` y `backend/src/modules/audit/audit.service.ts`

**Punto de control**: La Historia de Usuario 3 debe quedar funcional por si sola

---

## Fase 6: Historia de Usuario 4 - Recibir recordatorios automaticos de citas y pagos (Prioridad: P2)

**Objetivo**: Enviar confirmaciones, recordatorios de 24 horas, cancelaciones y avisos de saldo pendiente por WhatsApp.

**Prueba independiente**: Una cita de prueba genera confirmacion inmediata, recordatorio de 24 horas cuando aplica y aviso de pago pendiente el dia de la sesion.

### Pruebas para Historia de Usuario 4

- [ ] T045 [P] [US4] Crear prueba de integracion de programacion, reintento y envio de recordatorios en `backend/tests/integration/reminders.integration.test.ts`
- [ ] T046 [P] [US4] Crear prueba de contrato del endpoint de recordatorios en `backend/tests/contract/reminders.contract.test.ts`

### Implementacion para Historia de Usuario 4

- [ ] T047 [P] [US4] Implementar repositorio y reglas de dominio de recordatorios en `backend/src/modules/reminders/reminders.repository.ts` y `backend/src/modules/reminders/reminders.service.ts`
- [ ] T048 [P] [US4] Implementar job recurrente e idempotente de recordatorios en `backend/src/jobs/process-reminders.job.ts` y `backend/src/modules/reminders/reminder-dispatcher.ts`
- [ ] T049 [US4] Implementar endpoint administrativo de consulta de recordatorios en `backend/src/modules/reminders/reminders.controller.ts` y `backend/src/modules/reminders/reminders.routes.ts`
- [ ] T050 [US4] Mostrar estados de recordatorio en agenda y pagos en `frontend/components/agenda/reminder-status-badge.tsx` y `frontend/components/pagos/payment-status-card.tsx`
- [ ] T051 [US4] Auditar envios, fallos, reintentos y omisiones de recordatorios en `backend/src/modules/reminders/reminder-dispatcher.ts` y `backend/src/modules/audit/audit.service.ts`

**Punto de control**: La Historia de Usuario 4 debe quedar funcional por si sola

---

## Fase 7: Historia de Usuario 5 - Consultar informacion del consultorio y estado de cita/pago por WhatsApp (Prioridad: P2)

**Objetivo**: Responder FAQ administrativas y consultas de cita o pago con verificacion por telefono, nombre y fecha de nacimiento.

**Prueba independiente**: Un paciente identificado consulta su cita o saldo con verificacion correcta; si falla, no se exponen datos y se deriva a la psicologa.

### Pruebas para Historia de Usuario 5

- [ ] T052 [P] [US5] Crear prueba de integracion de FAQ y consulta verificada de estado en `backend/tests/integration/whatsapp-faq-status.integration.test.ts`
- [ ] T053 [P] [US5] Crear prueba de integracion de verificacion fallida en `backend/tests/integration/whatsapp-verification-failure.integration.test.ts`

### Implementacion para Historia de Usuario 5

- [ ] T054 [P] [US5] Implementar catalogo de FAQ y plantillas de respuesta en `backend/src/modules/chatbot/faq.catalog.ts` y `backend/src/modules/chatbot/response-templates.ts`
- [ ] T055 [P] [US5] Implementar flujo de verificacion de identidad en `backend/src/modules/chatbot/identity-verification.service.ts` y `backend/src/modules/chatbot/chatbot.intents.ts`
- [ ] T056 [US5] Implementar handlers de estado de cita y pago en `backend/src/modules/chatbot/chatbot.status.handler.ts` y `backend/src/modules/chatbot/chatbot.service.ts`
- [ ] T057 [US5] Aplicar minimizacion de mensajes sensibles en `backend/src/modules/chatbot/message-sanitizer.ts` y `backend/src/modules/chatbot/chat-messages.repository.ts`
- [ ] T058 [US5] Auditar verificacion exitosa, verificacion fallida y consultas sensibles denegadas en `backend/src/modules/chatbot/identity-verification.service.ts` y `backend/src/modules/audit/audit.service.ts`

**Punto de control**: La Historia de Usuario 5 debe quedar funcional por si sola

---

## Fase 8: Historia de Usuario 6 - Informarse del consultorio en la pagina publica (Prioridad: P3)

**Objetivo**: Publicar una landing movil con informacion del consultorio, CTA a WhatsApp y acceso discreto al panel.

**Prueba independiente**: Una persona visita la landing en el telefono, encuentra la informacion clave y abre WhatsApp con un toque.

### Pruebas para Historia de Usuario 6

- [ ] T059 [P] [US6] Crear prueba de componentes de la landing en `frontend/tests/components/landing-page.test.tsx`
- [ ] T060 [P] [US6] Crear prueba E2E movil de la landing publica en `frontend/tests/e2e/public-landing.spec.ts`

### Implementacion para Historia de Usuario 6

- [ ] T061 [P] [US6] Implementar pagina publica principal en `frontend/app/page.tsx` y `frontend/components/landing/hero.tsx`
- [ ] T062 [P] [US6] Implementar secciones informativas y CTA de WhatsApp en `frontend/components/landing/consultorio-info.tsx` y `frontend/components/landing/whatsapp-cta.tsx`
- [ ] T063 [US6] Agregar acceso discreto al panel y estilos responsive en `frontend/components/landing/admin-access-link.tsx` y `frontend/app/globals.css`

**Punto de control**: La Historia de Usuario 6 debe quedar funcional por si sola

---

## Fase 9: Pulido y aspectos transversales

**Proposito**: Mejoras que afectan a multiples historias de usuario

- [ ] T064 [P] Agregar pruebas unitarias de reglas de agendamiento, pagos y verificacion en `backend/tests/unit/booking-rules.test.ts`, `backend/tests/unit/payment-rules.test.ts` y `backend/tests/unit/identity-verification.test.ts`
- [ ] T065 [P] Agregar pruebas de componentes para estados de agenda y pagos en `frontend/tests/components/agenda-state.test.tsx` y `frontend/tests/components/payment-state.test.tsx`
- [ ] T066 Implementar hardening de seguridad para cookies, headers, limites de entrada y verificacion del webhook en `backend/src/app.ts`, `backend/src/middleware/security.ts` y `backend/src/integrations/whatsapp/webhook-verifier.ts`
- [ ] T067 [P] Actualizar documentacion del proyecto en `README.md` y alinear referencias con `specs/001-sistema-gestion-consultorio/quickstart.md`
- [ ] T068 Ejecutar validacion final con escenarios de `specs/001-sistema-gestion-consultorio/quickstart.md`

---

## Dependencias y Orden de Ejecucion

### Dependencias entre fases

- **Fase 1: Preparacion**: Sin dependencias
- **Fase 2: Fundacional**: Depende de la Fase 1 y bloquea todas las historias de usuario
- **Fase 3: US1**: Depende de la Fase 2
- **Fase 4: US2**: Depende de la Fase 2
- **Fase 5: US3**: Depende de la Fase 2; reutiliza autenticacion y entidades base de citas
- **Fase 6: US4**: Depende de US1 para el flujo de WhatsApp y de US2/US3 para cancelaciones y estado de pagos
- **Fase 7: US5**: Depende de US1 para el flujo base del chatbot y de US3 para consultar saldos
- **Fase 8: US6**: Depende solo de la Fase 2
- **Fase 9: Polish**: Depende de todas las historias que se deseen cerrar

### Dependencias entre historias de usuario

- **US1 (P1)**: Puede iniciar justo despues de la Fase 2; no depende de otras historias
- **US2 (P1)**: Puede iniciar justo despues de la Fase 2; no depende de otras historias
- **US3 (P2)**: Puede iniciar despues de la Fase 2; comparte entidades base pero es comprobable por separado
- **US4 (P2)**: Depende de que existan flujos de citas, cancelaciones y estados de pago
- **US5 (P2)**: Depende del flujo base de chatbot y de los datos de pago
- **US6 (P3)**: Es independiente despues de la Fase 2

### Dentro de cada historia de usuario

- Las pruebas van primero
- Repositorios y modelos antes que servicios
- Servicios antes que controllers, rutas o UI
- Auditoria y notificaciones antes de cerrar la historia
- Cada historia debe pasar su prueba independiente antes de avanzar al siguiente gate

### Oportunidades de paralelizacion

- Las tareas marcadas con `[P]` en Preparacion pueden ejecutarse en paralelo
- `T007`, `T008`, `T009`, `T011`, `T012`, `T013` y `T014` pueden correr en paralelo despues de `T006`
- Tras la Fase 2, `US1`, `US2`, `US3` y `US6` pueden avanzar en paralelo si hay capacidad
- En `US1`, `T017`, `T018` y `T019` pueden ejecutarse en paralelo
- En `US2`, `T031` y `T032` pueden ejecutarse en paralelo despues de `T030`
- En `US3`, `T039`, `T041` y `T042` pueden ejecutarse en paralelo
- En `US4`, `T047` y `T048` pueden ejecutarse en paralelo
- En `US5`, `T054` y `T055` pueden ejecutarse en paralelo
- En `US6`, `T061` y `T062` pueden ejecutarse en paralelo

---

## Ejemplo de Paralelo: Historia de Usuario 1

```bash
Tarea: "Implementar persistencia y busqueda de pacientes en backend/src/modules/patients/patients.repository.ts y backend/src/modules/patients/patients.service.ts"
Tarea: "Implementar persistencia de citas y reglas de disponibilidad en backend/src/modules/appointments/appointments.repository.ts y backend/src/modules/appointments/appointments.service.ts"
Tarea: "Implementar adaptador del proveedor de WhatsApp en backend/src/integrations/whatsapp/whatsapp.gateway.ts"
```

## Ejemplo de Paralelo: Historia de Usuario 2

```bash
Tarea: "Implementar pagina de agenda y lista diaria de citas en frontend/app/admin/agenda/page.tsx y frontend/components/agenda/daily-agenda.tsx"
Tarea: "Implementar formulario de cita y dialogo de cancelacion en frontend/components/agenda/appointment-form.tsx y frontend/components/agenda/cancel-appointment-dialog.tsx"
```

## Ejemplo de Paralelo: Historia de Usuario 6

```bash
Tarea: "Implementar pagina publica principal en frontend/app/page.tsx y frontend/components/landing/hero.tsx"
Tarea: "Implementar secciones informativas y CTA de WhatsApp en frontend/components/landing/consultorio-info.tsx y frontend/components/landing/whatsapp-cta.tsx"
```

---

## Estrategia de Implementacion

### MVP primero

1. Completar Fase 1: Preparacion
2. Completar Fase 2: Fundacional
3. Completar Fase 3: Historia de Usuario 1
4. Completar Fase 4: Historia de Usuario 2
5. Validar el gate constitucional del MVP para agendamiento y cancelacion por chatbot y panel

### Entrega incremental

1. Base comun
2. US1 y validacion del agendamiento por WhatsApp
3. US2 y validacion del panel movil seguro
4. US3 y validacion de estados de pago
5. US4 y validacion de recordatorios y reintentos
6. US5 y validacion de FAQ y consultas seguras
7. US6 y validacion de la landing publica
8. Polish y validacion final de `quickstart.md`

### Estrategia para equipo en paralelo

1. El equipo completa Preparacion y Fundacional
2. Despues de la base comun:
   - Desarrollador A: US1
   - Desarrollador B: US2
   - Desarrollador C: US3 o US6
3. Iniciar US4 cuando agendamiento, cancelacion y pagos esten estables
4. Iniciar US5 cuando chatbot y pagos esten estables

---

## Notas

- Total de tareas: `68`
- Tareas por historia:
  - `US1`: 10
  - `US2`: 11
  - `US3`: 9
  - `US4`: 7
  - `US5`: 7
  - `US6`: 5
- Alcance recomendado para MVP:
  - Punto de control inicial de desarrollo: `US1`
  - Gate constitucional del MVP: `US1 + US2`

---

## Fase 10: Convergencia Fase 2

**Proposito**: Remediar desviaciones detectadas al contrastar Fase 2 contra `spec.md`, `plan.md` y `tasks.md` antes de iniciar historias de usuario.

- [X] T069 Corregir expiracion por inactividad de sesion administrativa renovando JWT y cookie al validar actividad en `backend/src/modules/auth/session.service.ts`, `backend/src/modules/auth/token.service.ts`, `backend/src/middleware/authenticate.ts` y `backend/src/modules/auth/auth.routes.ts`
- [X] T070 Centralizar autorizacion de rol admin y auditoria de denegaciones en `backend/src/middleware/authorize-admin.ts`, `backend/src/middleware/authenticate.ts`, `backend/src/modules/audit/audit.service.ts` y `backend/src/modules/audit/audit.repository.ts`
- [X] T071 Configurar soporte CORS y cookies para frontend y backend separados en `backend/src/app.ts`, `backend/src/config/env.ts`, `backend/.env.example`, `backend/package.json` y `frontend/.env.example`
- [X] T072 Documentar indices SQL manuales no representables por Prisma en `backend/prisma/schema.prisma` y `backend/prisma/migrations/20260904000000_initial/migration.sql`
