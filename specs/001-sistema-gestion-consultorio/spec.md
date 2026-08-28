# Feature Specification: Sistema de Gestión Integral del Consultorio

**Feature Branch**: `001-sistema-gestion-consultorio`

**Created**: 2026-08-28

**Status**: Draft

**Input**: User description: "Definir el qué y el porqué del proyecto: asistente digital de Salud desde el Alma, sistema integral de gestión para un consultorio de psicología con atención por WhatsApp, agenda, pagos y recordatorios."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agendar una cita por WhatsApp (Priority: P1)

Un paciente nuevo o recurrente escribe al WhatsApp del consultorio y, conversando de forma natural, agenda una sesión. El asistente lo saluda con calidez, pregunta su necesidad y, si se trata de temas clínicos, ofrece ponerlo en contacto con la psicóloga. Cuando hay espacio, ofrece horarios concretos y confirma día, hora y modalidad (en línea o presencial) con los datos de la sesión.

**Why this priority**: Es el flujo central del negocio. Sin él no hay consultas, cobros ni continuidad; además libera a la psicóloga de la coordinación manual de agenda.

**Independent Test**: Se puede probar de forma aislada agendando una cita desde WhatsApp: el paciente recibe confirmación con datos de la sesión y la cita queda visible en la agenda del panel.

**Acceptance Scenarios**:

1. **Given** un paciente escribe al WhatsApp del consultorio **When** pide información para agendar una sesión **Then** el asistente responde en menos de 2 minutos con opciones concretas de día y horario.
2. **Given** un paciente confirma un horario disponible **When** se completa la conversación **Then** recibe confirmación con fecha, hora y modalidad (en línea o presencial).
3. **Given** un horario solicitado ya no está disponible **When** el paciente lo pide **Then** el asistente lo informa con amabilidad y ofrece una alternativa concreta.
4. **Given** una conversación sobre temas clínicos **When** el paciente plantea un síntoma o preocupación de salud **Then** el asistente reconoce la inquietud y deriva la cuestión a la psicóloga, sin diagnosticar ni recomendar tratamiento.

---

### User Story 2 - Gestionar la agenda y las citas desde el panel (Priority: P1)

La psicóloga abre su panel desde el teléfono y ve la agenda del día: citas confirmadas, pendientes, completadas y canceladas. Puede agendar citas manualmente, mover horarios y cancelar, con vistas rápidas que se operan con una mano.

**Why this priority**: La agenda es el corazón operativo del consultorio y el dispositivo principal de la psicóloga es el móvil. Sin un panel ágil, el sistema no ahorra tiempo.

**Independent Test**: Se puede probar creando, moviendo y cancelando una cita desde el panel y verificando que el cambio se refleja de inmediato en la agenda y en la comunicación con el paciente.

**Acceptance Scenarios**:

1. **Given** la psicóloga abre el panel **When** consulta la agenda **Then** ve las citas del día ordenadas por hora con su estado y modalidad.
2. **Given** una cita existente **When** la cancela desde el panel **Then** el cambio se refleja al instante en la agenda y el paciente recibe aviso de cancelación.
3. **Given** el panel en un teléfono **When** se realiza cualquier acción **Then** todas las funciones principales se usan sin desplazamientos incómodos ni redacción larga.
4. **Given** dos solicitudes para el mismo horario **When** se intenta reservar la segunda **Then** el sistema impide la doble reserva y ofrece otro horario.

---

### User Story 3 - Registrar anticipos y pagos de sesión (Priority: P2)

La psicóloga registra el anticipo opcional del 50% al apartar una cita y liquida el pago completo el día de la sesión (en línea o presencial). Cada cita muestra su estado de pago (pendiente, anticipo, completado) y la información del comprobante queda registrada.

**Why this priority**: Cobrar bien y sin hojas sueltas es clave para el negocio, pero depende de que exista la cita. Por eso va después de la agenda.

**Independent Test**: Se puede registrar un anticipo y luego la liquidación de una misma cita y verificar que el estado de pago pasa de pendiente → anticipo → completado.

**Acceptance Scenarios**:

1. **Given** una cita recién agendada **When** la psicóloga registra el anticipo del 50% **Then** el estado queda como "anticipo" y el saldo como pendiente de liquidar.
2. **Given** una cita con anticipo **When** llega el día de la sesión **Then** la psicóloga puede registrar el pago completo en menos de 30 segundos desde el móvil.
3. **Given** la psicóloga registra un pago **When** lo confirma **Then** el panel muestra la nueva fecha y estado del pago, con el comprobante asociado.
4. **Given** una cita sin cobros **When** la psicóloga consulta la agenda **Then** identifica de un vistazo qué citas tienen pago pendiente.

---

### User Story 4 - Recibir recordatorios automáticos de citas y pagos (Priority: P2)

Configurado el agendamiento, el sistema avisa por WhatsApp a cada paciente: confirmación al agendar, recordatorio 24 horas antes de la sesión, aviso de cancelación y recordatorio amable de pagos pendientes. La psicóloga deja de perseguir recordatorios de forma manual.

**Why this priority**: Reduce inasistencias y pagos pendientes, que impactan directamente los ingresos, pero requiere citas existentes para funcionar.

**Independent Test**: Se agenda una cita de prueba y se verifica la confirmación inmediata, el recordatorio a las 24 horas previas y el aviso de pago pendiente el día de la sesión.

**Acceptance Scenarios**:

1. **Given** una cita agendada **When** se registra **Then** el paciente recibe confirmación con los datos de la sesión.
2. **Given** una cita programada **When** faltan 24 horas **Then** el paciente recibe un recordatorio con día, hora y modalidad.
3. **Given** una cita con saldo pendiente **When** llega el día de la sesión **Then** el paciente recibe un aviso amable recordándole el pago.
4. **Given** una cita cancelada **When** se cancela **Then** el paciente recibe confirmación de cancelación y la opción de reagendar, sin reproches.

---

### User Story 5 - Informarse del consultorio en la página pública (Priority: P3)

Una persona visita la página del consultorio y encuentra la información esencial: quién es la psicóloga, el enfoque (cuerpo, mente, espíritu), modalidades, horario, dirección y contactos. Desde ahí puede iniciar una conversación por WhatsApp o acceder al panel administrativo (solo admin no los pacientes).

**Why this priority**: Da presencia y credibilidad, y sirve de puerta de entrada. Se entrega después de los flujos operativos que generan valor directo.

**Independent Test**: Una persona visita la página en el teléfono y comprueba que encuentra dirección, horario y el enlace para escribir por WhatsApp.

**Acceptance Scenarios**:

1. **Given** una persona visita la página **When** navega en su teléfono **Then** ve la información del consultorio sin desplazamientos laterales y con textos legibles.
2. **Given** la página pública **When** la persona quiere escribir **Then** un solo toque inicia la conversación por WhatsApp.
3. **Given** la página pública **When** la psicóloga necesita entrar a administrar **Then** encuentra un acceso discreto al panel protegido.

---

### Edge Cases

- **Doble reserva**: se intenta agendar el mismo horario dos veces; el sistema rechaza la segunda y propone una alternativa.
- **Paciente nuevo no identificado**: la persona agenda su primera cita; el sistema recaba los datos mínimos (nombre y contacto de WhatsApp) sin fricción.
- **Cancelación sin reagendar**: la persona cancela y no desea otro horario; el sistema confirma con amabilidad y cierra sin culpar.
- **Pago dividido**: se registra anticipo y luego liquidación en momentos diferentes; el estado avanza correctamente por etapas y el historial queda completo.
- **Comprobante inválido o incompleto**: se registra un respaldo de pago; la psicóloga puede marcarlo como pendiente de validar sin romper el flujo.
- **Fallo en el envío de un recordatorio**: si un aviso no puede entregarse, el sistema lo deja marcado como fallido y la psicóloga lo ve para reenviarlo.
- **Conversación clínica larga**: el asistente reconoce el tema, deriva a la psicóloga y ofrece agendar una sesión, sin improvisar orientación.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE responder a un paciente en WhatsApp en menos de 2 minutos cuando se inicia una conversación.
- **FR-002**: El sistema DEBE ofrecer únicamente horarios reales dentro del rango de atención (lunes a viernes de 9:00 a.m. a 9:00 p.m.) sujeto a la agenda.
- **FR-003**: El sistema DEBE impedir la doble reserva de un mismo horario.
- **FR-004**: El sistema DEBE permitir agendar y cancelar citas tanto por WhatsApp como desde el panel administrativo.
- **FR-005**: El sistema DEBE registrar la modalidad de cada cita: en línea o presencial.
- **FR-006**: El sistema DEBE enviar confirmación de cita con los datos de la sesión al momento de agendar.
- **FR-007**: El sistema DEBE enviar un recordatorio 24 horas antes de cada cita.
- **FR-008**: El sistema DEBE enviar aviso de cancelación y ofrecer reagendar cuando se cancela una cita.
- **FR-009**: El sistema DEBE registrar pagos de dos tipos: anticipo opcional del 50% y pago completo, vinculados a la cita correspondiente.
- **FR-010**: El sistema DEBE mostrar en el panel el estado de pago de cada cita (pendiente, anticipo, completado).
- **FR-011**: El sistema DEBE enviar un recordatorio amable de pagos pendientes el día de la sesión, al finalizar esta.
- **FR-012**: El sistema DEBE permitir a la psicóloga gestionar la agenda y los pagos desde un teléfono móvil.
- **FR-013**: El sistema DEBE mantener el tono definido de atención (cálido, breve, formalidad media con "usted", español mexicano) en todas las interacciones del asistente.
- **FR-014**: El sistema DEBE derivar a la psicóloga toda cuestión clínica: no diagnostica, no interpreta síntomas ni recomienda tratamientos.
- **FR-015**: El sistema DEBE ser transparente si el paciente pregunta si está hablando con un sistema automatizado.
- **FR-016**: El sistema DEBE registrar un rastro auditable de acciones críticas (accesos, citas, pagos y cancelaciones).
- **FR-017**: El sistema DEBE presentar al público información clara del consultorio en la página: servicios, modalidades, horario, dirección y contactos.

### Key Entities *(include if feature involves data)*

- **Paciente**: persona que solicita o recibe el servicio. Datos esenciales: nombre, contacto de WhatsApp, preferencia de modalidad.
- **Cita**: evento de sesión con fecha, hora, modalidad y estado (programada, confirmada, completada, cancelada). Se vincula a un paciente.
- **Pago**: registro de cobro de una sesión; puede ser anticipo (50%) o pago completo, con estado (pendiente, pagado). Se vincula a una cita.
- **Recordatorio**: aviso programado (confirmación, recordatorio de cita, cancelación, pago pendiente) con estado de envío.
- **Conversación**: intercambio del paciente con el asistente por WhatsApp.
- **Usuario administrativo**: persona con acceso al panel (la psicóloga), con control sobre agenda, pacientes y pagos.
- **Registro de auditoría**: traza de acciones críticas realizadas en el sistema (quiénes, qué, cuándo).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un paciente agenda su primera cita por WhatsApp en menos de 2 minutos de conversación activa.
- **SC-002**: El 100% de las citas agendadas genera confirmación inmediata con datos de la sesión.
- **SC-003**: El 100% de las citas confirmadas recibe su recordatorio 24 horas antes.
- **SC-004**: La psicóloga registra un pago (anticipo o total) en menos de 30 segundos desde su teléfono.
- **SC-005**: Cero dobles reservas: ninguna cita confirma un horario ya ocupado.
- **SC-006**: El 100% de las cancelaciones genera aviso al paciente con opción de reagendar.
- **SC-007**: El 100% de las acciones críticas (accesos, citas, pagos, cancelaciones) queda registrada y consultable para auditoría.
- **SC-008**: En la prueba UAT, la psicóloga completa los escenarios principales (agendar, cancelar, cobrar, recibir recordatorios) sin asistencia y sin errores bloqueantes.

## Assumptions

- El canal principal de comunicación con los pacientes es WhatsApp; los pacientes tienen acceso a esta aplicación.
- El horario de atención es de lunes a viernes de 9:00 a.m. a 9:00 p.m., sujeto a disponibilidad de agenda; el sábado solo se ofrece como alternativa de espacio.
- El dispositivo principal de la psicóloga es un teléfono móvil; la experiencia móvil es prioritaria.
- Las sesiones pueden impartirse en línea o presencialmente; la presencial tiene domicilio fijo.
- Los pagos se reciben por transferencia (y el día de la sesión también en efectivo), sin pasarela de cobro en esta fase.
- Los datos personales y de salud se tratan con confidencialidad y conforme a la normativa mexicana aplicable de protección de datos (LFPDPPP).
- El historial clínico digital y los reportes estadísticos complejos quedan fuera del alcance de este ciclo y se desarrollarán en fases posteriores.
- La persona responsable del consultorio es una sola psicóloga; no se contemplan múltiples terapeutas en esta fase.