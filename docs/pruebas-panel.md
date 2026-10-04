# Bitacora de pruebas del panel administrativo

## Tercera vuelta inicial - 15/09/2026

### Alcance

Pruebas manuales iniciales del panel administrativo en movil, centradas en la
agenda y la nueva vista de pagos. Esta vuelta no sustituye una UAT formal con
Jocelyn ni las pruebas automatizadas pendientes.

### Evidencia registrada

- La agenda permite consultar las vistas de dia, semana y mes, y muestra las
  acciones operativas de las citas.
- La vista de pagos permite registrar un pago, enviar un recordatorio manual y
  confirmar un pago pendiente de validacion.
- Los pagos registrados permanecen en `pendiente_validacion` hasta la
  confirmacion manual de la cuenta `admin`.
- Se detecto HTML invalido en la tarjeta de una cita: un boton de accion estaba
  anidado dentro del boton de seleccion de la tarjeta y producia un error de
  hidratacion en `/admin/agenda`.
- El hallazgo de hidratacion se corrigio en
  `frontend/components/admin/agenda/event-card.tsx` (commit `c79ed69`).

### Limites y pendientes

- No hay evidencia de UAT formal desde el telefono de Jocelyn para declarar
  cumplidos SC-008 y SC-016.
- Falta la prueba de integracion del flujo de pagos y la prueba E2E movil de
  pagos.
- Los hallazgos de convergencia se registran en Phase 27 de `tasks.md`.

## Auditoria de convergencia US2/US3 - 15/09/2026

La auditoria contrasto la implementacion, pruebas y documentacion con
`CONSTITUTION.md`, `spec.md`, `data-model.md`, `quickstart.md` y `tasks.md`.

### Hallazgos y resolucion

- El recordatorio manual persiste su auditoria antes del despacho externo.
- Los comprobantes entrantes usan una bandeja durable y Jocelyn los asocia
  manualmente a una cita o pago desde la vista de pagos.
- Las tarifas se configuran por tipo de sesion; el anticipo exige el 50% exacto.
- La confirmacion acepta exclusivamente pagos en `pendiente_validacion`.
- La agenda exige confirmar las excepciones manuales y ya muestra horas fuera
  del horario regular; la vista mensual no anida botones.
- Existen pruebas de integracion y E2E movil de pagos; la ejecucion E2E requiere
  sus credenciales y datos de prueba configurados.

Las remediaciones T144-T164 estan cerradas en `tasks.md`.

## Alineación visual y landing - 25/09/2026

### Comparativa contra el mockup aprobado

- Antes: la navegación era una barra superior genérica, las vistas usaban fondos planos y la raíz redirigía directamente a la agenda.
- Después: el panel usa una barra lateral en escritorio y navegación inferior táctil en móvil; login, resumen, agenda, directorio, citas, pagos, pacientes y perfiles clínicos comparten superficies crema, bordes suaves, tipografía Inter y acciones marrón café de alto contraste.
- La agenda conserva las vistas de día, semana y mes, pero presenta controles agrupados, calendario en tarjeta y la leyenda existente con el mismo sistema visual.
- La raíz publica ahora muestra hero, servicios, modalidades de atención, contacto, CTA de WhatsApp y enlace administrativo discreto; en móvil las columnas se convierten en una sola columna y la navegación pública se simplifica al CTA.
- Decisión aprobada el 25/09/2026: se conservan las variaciones de composición respecto a `mockupWithDashboard.png`; el mockup guía la identidad y jerarquía visual, no una réplica pixel a pixel. La paleta aprobada es la definida en `DESIGN.md`.

### Revisión móvil trazable

- Dispositivo de referencia: iPhone 13 emulado (390 x 844) en Chromium.
- Login, dashboard, agenda, directorio, citas, pagos, pacientes y terapeutas: se revisaron los contenedores, navegación inferior, áreas táctiles y ausencia de desplazamiento horizontal durante la compilación estática.
- Landing: la prueba E2E móvil valida contenido operativo, CTA de WhatsApp, acceso administrativo, datos de contacto y ausencia de desplazamiento horizontal.
- La UAT funcional autenticada con Jocelyn permanece pendiente y no se sustituye por esta revisión visual.

### Evidencia técnica

- `npm run typecheck --workspace frontend` y `npm run build --workspace frontend` finalizaron correctamente después del rediseño.
- `npm run test:components --workspace frontend` y la prueba Playwright móvil `public-landing.spec.ts` deben ejecutarse tras cada cambio visual; la segunda requiere los servicios locales configurados.
- La prueba E2E autenticada del panel sigue requiriendo `ADMIN_SEED_PASSWORD`, `ADMIN_E2E_PASSWORD`, PostgreSQL sembrado y navegadores Playwright; debe ejecutarse como parte de la UAT formal antes del despliegue.

## Estado visible del recordatorio - 26/09/2026

### Qué muestra hoy el panel

- La tarjeta de la agenda imprime una línea `Recordatorio: <estado> · <intentos>/3` con los estados `pendiente`, `en envío`, `enviado`, `fallido` y `omitido`, únicamente en las vistas de día y semana, y solo para el aviso `recordatorio_24h` dirigido a la paciente.
- La vista de mes no imprime esa línea por decisión de composición; las citas `confirmacion`, `cancelacion` y `pago_pendiente` no se muestran en la agenda.
- La vista de pagos imprime `Aviso automático de saldo: <estado> · <intentos>/3` por cita con saldo pendiente.
- El botón `Enviar recordatorio` de pagos envía el texto por WhatsApp y escribe la auditoría, pero no crea una fila de recordatorio: la línea de estado no cambia y la vista no se recarga.

### Cobertura automatizada agregada

- `frontend/tests/components/event-card-reminder.test.tsx` fija la traducción de los cinco estados, el contador de intentos, la supresión en la vista de mes, la supresión del aviso dirigido a `grupo_psicologas`, la supresión de otros tipos de recordatorio y el caso de una cita sin el campo `reminders`.
- `frontend/tests/e2e/admin-agenda.spec.ts` incluye dos pruebas herméticas que no requieren `ADMIN_E2E_PASSWORD` ni PostgreSQL sembrado: mockean la sesión, el directorio y las citas, y verifican la línea del recordatorio en día y semana, su ausencia en mes y que la agenda no falle si la cita llega sin `reminders`.
- El guard opcional de `reminders` en `event-card.tsx` y `payments/page.tsx` evita que un payload parcial tumbla la agenda o la lista de pagos.

### Lo que sigue exigiendo revisión humana

- La ventana real de envío 18:00-19:00 `America/Mexico_City` y el estado `enviado` dependen del worker y del proveedor de WhatsApp; la prueba automatizada solo fija el texto que se renderiza.
- El estado `fallido` real solo ocurre con credenciales de Meta que fallen y no hay reintento manual desde el panel.
- `sentAt`, `lastError`, `scheduledAt` y `cancellationNotice` llegan en el contrato pero no se renderizan en ninguna pantalla.
- La UAT funcional autenticada con Jocelyn sigue pendiente.

## US5: FAQ, recordatorios y consultas de estado - 30/09/2026

### Cobertura automatizada agregada

- `backend/tests/integration/whatsapp-faq-status.integration.test.ts` (24 pruebas) fija el catalogo de FAQ contra `docs/copy-landing.md` y `frontend/app/page.tsx`, la ausencia de verificacion en las preguntas publicas, la verificacion previa del intent `payment_status`, la fecha, la zona `America/Mexico_City` y el formato de 12 horas de AC2, la paridad del saldo con el `paymentStatusOf` del panel, la minimizacion de FR-025 en la capa de persistencia, la idempotencia de la auditoria `sensitive_status_query_denied` ante un reintento durable y los estados de cita `programada`, `confirmada` y cancelada.
- `backend/tests/integration/whatsapp-verification-failure.integration.test.ts` (6 pruebas) fija que la denegacion por datos faltantes, por numero no registrado y por identidad incorrecta devuelve el mismo texto y se audita con banderas de presencia.
- `backend/tests/integration/whatsapp-us5-persistence.postgres.integration.test.ts` (3 pruebas) ejerce la persistencia real contra PostgreSQL: sustituye a las dos pruebas que insertaban y releian filas a mano con PGlite sin invocar `saveIncomingMessage`. Se salta salvo que se ejecute con `RUN_POSTGRES_INTEGRATION=true`.

### Gates ejecutados

- `npm run typecheck`, `npm run lint` y `npm run format:check`: correctos.
- `npm run test --workspace backend`: 154 pruebas, 124 correctas, 0 fallidas, 30 omitidas (las 3 del gate PostgreSQL mas las preexistentes).
- Las 3 pruebas de `backend/tests/integration/whatsapp-us5-persistence.postgres.integration.test.ts` pasan contra PostgreSQL 16 real con `RUN_POSTGRES_INTEGRATION=true`.
- El gate completo sigue en rojo, ahora por defectos registrados como `T203` y `T204`, ambos ajenos a US5 y ambos revelados al destapar el que `T201` si cubria: `payments-flow.integration.test.ts:334` recibe 409 porque su propio fixture siembra un pago `completo` pendiente y el servicio rechaza un segundo pago del mismo tipo, y `auth-audit-rollback.postgres.integration.test.ts:16` choca con el `username: "admin"` que `backend/prisma/seed.ts` deja en la base de desarrollo.
- Ademas el gate no es determinista: `npm run test --workspace backend` corre los archivos en paralelo contra una base compartida, y con concurrencia aparecen 5 fallos frente a los 2 reales, cambiando incluso el archivo que falla. Registrado como `T205`. Con `--test-concurrency=1` el resultado es estable: 154 pruebas, 152 correctas, 2 fallidas.

### Nota de operacion del gate

- El gate debe correrse con `npm run test --workspace backend`, que carga `.env.example`; invocar `npx dotenv -e .env` hace fallar pruebas que dependen de `WHATSAPP_ADMIN_PHONE`, porque `backend/.env` no define esa variable y `.env.example` si. La causa de esa falla fue mal atribuida a un defecto de aislamiento en `backend/tests/unit/whatsapp-inbox-resume.test.ts:157`, que nunca estuvo rota.
- `.env.example` trae un `DATABASE_URL` de relleno, asi que el gate hay que lanzarlo con el `DATABASE_URL` real ya presente en el entorno: en PowerShell, `$env:DATABASE_URL="postgresql://<usuario>:<clave>@localhost:5432/<base>?schema=public"` antes de `npm run test --workspace backend`. Sin eso las pruebas del gate fallan por autenticacion y no por codigo.

### Lo que sigue exigiendo revision humana

- `SC-010` es un criterio de UAT: la verificacion de que el paciente real consigue su estado por WhatsApp sigue sin ejecutarse desde un telefono.
- La conexion con el WhatsApp real sigue pendiente de credenciales de Meta, igual que para US4.

## Fase 9: Hardening de seguridad - 03/10/2026

### Cobertura automatizada agregada

- `backend/tests/contract/security-hardening.contract.test.ts` (5 pruebas) fija los cuatro headers de seguridad en toda ruta y la ausencia de `Content-Security-Policy`, la declaracion del presupuesto en el webhook y en las rutas administrativas (300 y 120 por minuto, observables en la cabecera `RateLimit`), que `/health` no se limita ni aunque se superen las 125 peticiones, la forma `429 rate_limit_exceeded` con `requestId`, y que un `X-Forwarded-For` falsificado no reinicia el presupuesto.
- `backend/src/middleware/security.ts` expone una factory con dependencias inyectables, igual que `payments.routes.ts:91-124`, para que las pruebas fijen presupuestos pequenos sin abrir los puertos reales del panel.
- `backend/tests/contract/whatsapp-webhook.contract.test.ts` sigue verde con el limitador montado: cada prueba levanta su propia instancia de `createApp()` y su propio presupuesto.

### Gates ejecutados

- `npm run typecheck`, `npm run lint` y `npm run format:check`: correctos.
- `npm run test --workspace backend`: 159 pruebas, 129 correctas, 0 fallidas, 30 omitidas (el gate PostgreSQL y las preexistentes). Las 5 nuevas son de contrato y no dependen de PostgreSQL.
- `npm run test --workspace frontend`: 8 pruebas, 8 correctas.

### Lo que sigue exigiendo revision humana

- Los presupuestos (300 y 120 por minuto) no se han medido contra el trafico real del consultorio. Meta entrega la conversacion a rafagas y un limite bajo descartaria eventos legitimos; el ajuste fino necesita el despliegue.
- `T216`: la `Content-Security-Policy` sigue sin definirse porque no hay entorno donde validar que no rompa Next.js.
- Ni `spec.md` ni `plan.md` exigen headers de seguridad ni limite de peticiones: el endurecimiento quedo implementado sin requisito que lo respalde, y `plan.md:15` declara `Supertest` y `Vitest`, que el repositorio no usa. Corresponde a la cliente decidir si se agrega el requisito, se actualiza el plan o se deja como detalle de implementacion.
