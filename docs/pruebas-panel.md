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
