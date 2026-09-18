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

## Alineación visual y landing - 17/09/2026

### Comparativa contra el mockup aprobado

- Antes: la navegación era una barra superior genérica, las vistas usaban fondos planos y la raíz redirigía directamente a la agenda.
- Después: el panel usa una barra lateral en escritorio y navegación inferior táctil en móvil; login, resumen, agenda, directorio, citas, pagos, pacientes y perfiles clínicos comparten superficies crema, bordes suaves, tipografía serif en jerarquías y acciones verde oliva.
- La agenda conserva las vistas de día, semana y mes, pero presenta controles agrupados, calendario en tarjeta y la leyenda existente con el mismo sistema visual.
- La raíz publica ahora muestra hero, servicios, modalidades de atención, contacto, CTA de WhatsApp y enlace administrativo discreto; en móvil las columnas se convierten en una sola columna y la navegación pública se simplifica al CTA.

### Evidencia técnica

- `npm run typecheck --workspace frontend` y `npm run build --workspace frontend` finalizaron correctamente después del rediseño.
- `npm run test:components --workspace frontend` y la prueba Playwright móvil `public-landing.spec.ts` finalizaron correctamente el 17/09/2026.
- La prueba E2E autenticada del panel sigue requiriendo `ADMIN_SEED_PASSWORD`, `ADMIN_E2E_PASSWORD`, PostgreSQL sembrado y navegadores Playwright; debe ejecutarse como parte de la UAT formal antes del despliegue.
