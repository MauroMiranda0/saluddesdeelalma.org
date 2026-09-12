# Feature Specification: Sistema de Gestión Integral del Consultorio

**Feature Branch**: `001-sistema-gestion-consultorio`

**Created**: 2026-08-28

**Status**: Draft

**Input**: User description: "Definir el qué y el porqué del proyecto: asistente digital de Salud desde el Alma, sistema integral de gestión para un consultorio de psicología con atención por WhatsApp, agenda, pagos y recordatorios."

## Clarifications

### Session 2026-09-02

- Q: ¿Qué verificación debe exigir el sistema antes de mostrar por WhatsApp el estado de una cita o un saldo pendiente? → A: Exigir número registrado y una confirmación adicional breve del paciente.
- Q: ¿Qué dato breve debe pedir el asistente como segunda verificación antes de mostrar por WhatsApp el estado de una cita o un saldo pendiente? → A: Nombre y fecha de nacimiento.
- Q: ¿En qué momento debe capturarse la fecha de nacimiento para poder verificar por WhatsApp el estado de una cita o un pago? → A: Pedirla al crear la primera cita del paciente.
- Q: Cuando un paciente comparte detalles clínicos sensibles por WhatsApp, ¿qué debe guardar el sistema en el historial de conversación? → A: Guardar solo un resumen administrativo breve y metadatos básicos.
- Q: ¿Después de cuánto tiempo de inactividad debe expirar la sesión del panel administrativo? → A: 30 minutos.

### Session 2026-09-07

- Q: ¿Cuándo y a quién se envía el recordatorio de cita? → A: Decisión sustituida el 2026-09-11: al paciente y al grupo interno, entre las 18:00 y las 19:00 (zona `America/Mexico_City`) del día calendario anterior a la cita.
- Q: ¿Cómo se aplica la política de cancelación? → A: La confirmación siempre indica que se debe avisar con al menos 24 horas de anticipación para evitar un costo adicional; una cancelación con menos de 24 horas se clasifica como tardía, sin generar un cobro automático en el MVP.
- Q: ¿Qué cuentas pueden iniciar sesión en el panel durante el MVP? → A: Únicamente la cuenta activa cuyo usuario es `admin` y cuyo rol es `admin`; los perfiles de psicólogos/as y pacientes solo se visualizan desde ese panel.

### Session 2026-09-11

- Q: ¿Cómo se conserva la continuidad clínica? → A: Cada paciente mantiene una psicóloga asignada; `admin` realiza la asignación inicial y cualquier reasignación auditada.
- Q: ¿Qué duración tiene cada tipo? → A: `individual` dura 60 minutos; `pareja` y `familiar` son categorías distintas y duran 90 minutos.
- Q: ¿Cómo se evitan conflictos? → A: Ninguna psicóloga puede tener intervalos traslapados, aun si una cita es en línea y la otra presencial. Psicólogas distintas pueden atender presencialmente al mismo tiempo.
- Q: ¿Cómo se envían confirmaciones? → A: El paciente recibe mensaje individual; el grupo interno de psicólogas recibe una copia operativa sin datos clínicos ni de pago.
- Q: ¿Cuándo se avisa el saldo? → A: Si aplica, junto con la solicitud de confirmación entre 18:00 y 19:00 del día previo y nuevamente, con prioridad, al concluir la cita.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Agendar una cita por WhatsApp (Priority: P1)

Un paciente recurrente escribe al WhatsApp del consultorio y agenda una sesión con su psicóloga asignada. El asistente confirma tipo, duración, día, hora y modalidad. Los pacientes nuevos quedan pendientes de asignación por `admin` antes de confirmar una cita.

**Why this priority**: Es el flujo central del negocio. Sin él no hay consultas, cobros ni continuidad; además libera a la psicóloga de la coordinación manual de agenda.

**Independent Test**: Se puede probar de forma aislada agendando una cita desde WhatsApp: el paciente recibe confirmación con datos de la sesión y la cita queda visible en la agenda del panel.

**Acceptance Scenarios**:

1. **Given** un paciente escribe al WhatsApp del consultorio **When** pide información para agendar una sesión **Then** el asistente responde en menos de 2 minutos con opciones concretas de día y horario.
2. **Given** un paciente confirma un horario disponible **When** se completa la conversación **Then** recibe confirmación individual con fecha, hora, tipo, duración, modalidad y la leyenda de cancelación; el grupo interno recibe una copia operativa sin datos de pago.
3. **Given** una cita individual de 60 minutos o pareja/familiar de 90 minutos **When** se solicita un horario **Then** el sistema valida que todo el intervalo esté libre para la psicóloga asignada, sin importar modalidad.
4. **Given** un horario solicitado ya no está disponible **When** el paciente lo pide **Then** el asistente lo informa con amabilidad y ofrece una alternativa concreta.
5. **Given** una conversación sobre temas clínicos **When** el paciente plantea un síntoma o preocupación de salud **Then** el asistente reconoce la inquietud y deriva la cuestión a la psicóloga, sin diagnosticar ni recomendar tratamiento.
6. **Given** un paciente pregunta si está hablando con un sistema automatizado **When** solicita aclaración **Then** el asistente responde con transparencia que es un asistente digital del consultorio y ofrece continuar apoyando con temas administrativos.
7. **Given** un paciente nuevo sin registro previo **When** solicita una cita **Then** el asistente solicita únicamente los datos mínimos necesarios para agendar: nombre, número de contacto de WhatsApp y fecha de nacimiento.
8. **Given** un paciente plantea una inquietud clínica extensa **When** el asistente identifica que requiere criterio profesional **Then** deriva el caso a la psicóloga y limita su respuesta a acompañamiento administrativo y oferta de cita.

---

### User Story 2 - Gestionar la agenda y las citas desde el panel (Priority: P1)

La psicóloga abre su panel desde el teléfono y ve la agenda del día: citas confirmadas, pendientes, completadas y canceladas. Puede agendar citas manualmente, mover horarios y cancelar, con vistas rápidas que se operan con una mano.

**Why this priority**: La agenda es el corazón operativo del consultorio y el dispositivo principal de la psicóloga es el móvil. Sin un panel ágil, el sistema no ahorra tiempo.

**Independent Test**: Se puede probar creando, moviendo y cancelando una cita desde el panel y verificando que el cambio se refleja de inmediato en la agenda y en la comunicación con el paciente.

**Acceptance Scenarios**:

1. **Given** la psicóloga abre el panel **When** consulta la agenda **Then** ve las citas del día ordenadas por hora con su estado y modalidad.
2. **Given** una cita existente **When** la cancela desde el panel **Then** el cambio se refleja al instante en la agenda y el paciente recibe aviso de cancelación.
3. **Given** el panel en un teléfono **When** se realiza cualquier acción **Then** todas las funciones principales se usan sin desplazamientos incómodos ni redacción larga.
4. **Given** dos solicitudes que se traslapan para una misma psicóloga **When** se intenta reservar la segunda **Then** el sistema la impide y ofrece otro horario; las psicólogas distintas pueden coincidir.
5. **Given** una persona sin sesión válida **When** intenta abrir el panel administrativo **Then** el sistema solicita autenticación antes de mostrar cualquier dato.
6. **Given** la psicóloga deja expirar su sesión tras 30 minutos de inactividad **When** intenta continuar en el panel **Then** el sistema solicita un nuevo inicio de sesión sin exponer información administrativa.
7. **Given** un usuario sin permisos administrativos válidos **When** intenta consultar o modificar pacientes, citas o pagos **Then** el sistema bloquea la acción y registra el intento en la auditoría.
8. **Given** una cuenta distinta de `admin`, aunque corresponda a un perfil de psicólogo/a o paciente **When** intenta iniciar sesión o usar una ruta administrativa **Then** el sistema rechaza el acceso, no emite sesión y audita la denegación.
9. **Given** Jocelyn inicia sesión con la cuenta activa `admin` **When** abre el panel **Then** puede visualizar el directorio de psicólogos/as y pacientes, sus citas y sus pagos pendientes.

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

Configurado el agendamiento, el sistema avisa al paciente por WhatsApp individual y copia las confirmaciones y recordatorios de cita al grupo interno de psicólogas. Si hay saldo, el paciente recibe un aviso el día anterior y otro prioritario tras completarse la cita.

**Why this priority**: Reduce inasistencias y pagos pendientes, que impactan directamente los ingresos, pero requiere citas existentes para funcionar.

**Independent Test**: Se agenda una cita de prueba y se verifica la confirmación inmediata con la política de cancelación, los dos recordatorios del día previo dentro de la ventana 18:00–19:00 y el aviso de pago pendiente el día de la sesión.

**Acceptance Scenarios**:

1. **Given** una cita agendada **When** se registra **Then** el paciente recibe confirmación con los datos de la sesión y la política de cancelación de al menos 24 horas de anticipación.
2. **Given** una cita programada para el día siguiente **When** el cron se ejecuta entre las 18:00 y las 19:00 en `America/Mexico_City` **Then** el paciente y el grupo interno reciben exactamente un recordatorio trazable; el saldo se comunica solo al paciente si aplica.
3. **Given** una cita completada con saldo pendiente **When** se marca como completada **Then** el paciente recibe un aviso amable prioritario de pago.
4. **Given** una cita cancelada **When** se cancela **Then** el paciente recibe confirmación de cancelación y la opción de reagendar, sin reproches.

---

### User Story 5 - Consultar información del consultorio y estado de cita/pago por WhatsApp (Priority: P2)

Un paciente o persona interesada escribe al WhatsApp del consultorio para resolver dudas frecuentes o consultar el estado de su cita o pago. El asistente responde con información clara y real del consultorio, y cuando identifica al paciente por su número de WhatsApp le informa el estado de su próxima cita o si mantiene saldo pendiente.

**Why this priority**: Reduce preguntas repetitivas, mejora la atención administrativa y forma parte del alcance esperado del asistente en WhatsApp, sin depender de intervención manual constante.

**Independent Test**: Se puede probar de forma aislada preguntando horarios, modalidades, ubicación y formas de pago, así como consultando desde un número identificado el estado de una cita y un saldo pendiente.

**Acceptance Scenarios**:

1. **Given** una persona pregunta por horarios, ubicación, modalidades o formas de pago **When** escribe al WhatsApp del consultorio **Then** el asistente responde con información correcta, clara y consistente con los datos oficiales del consultorio.
2. **Given** un paciente identificado por su número de WhatsApp **When** confirma además su nombre y fecha de nacimiento **Then** el asistente informa fecha, hora, modalidad y estado de su próxima cita.
3. **Given** un paciente identificado por su número de WhatsApp **When** confirma además su nombre y fecha de nacimiento **Then** el asistente informa si existe un anticipo registrado o un pago pendiente de liquidar.
4. **Given** una persona no identificada o sin coincidencia suficiente **When** intenta consultar una cita o pago **Then** el asistente no expone datos sensibles y deriva la gestión a la psicóloga.

---

### User Story 6 - Informarse del consultorio en la página pública (Priority: P3)

Una persona visita la página del consultorio y encuentra la información esencial: quién es la psicóloga, el enfoque (cuerpo, mente, espíritu), modalidades, horario, dirección y contactos. Desde ahí puede iniciar una conversación por WhatsApp o acceder al panel administrativo (solo admin no los pacientes).

**Why this priority**: Da presencia y credibilidad, y sirve de puerta de entrada. Se entrega después de los flujos operativos que generan valor directo.

**Independent Test**: Una persona visita la página en el teléfono y comprueba que encuentra dirección, horario y el enlace para escribir por WhatsApp.

**Acceptance Scenarios**:

1. **Given** una persona visita la página **When** navega en su teléfono **Then** ve la información del consultorio sin desplazamientos laterales y con textos legibles.
2. **Given** la página pública **When** la persona quiere escribir **Then** un solo toque inicia la conversación por WhatsApp.
3. **Given** la página pública **When** la psicóloga necesita entrar a administrar **Then** encuentra un acceso discreto al panel protegido por autenticación.

---

### Edge Cases

- **Traslape de agenda**: se intenta agendar cualquier intervalo que intersecta otra cita activa de la misma psicóloga, incluso con otra modalidad; el sistema rechaza la segunda y propone una alternativa. Las citas consecutivas se permiten.
- **Paciente sin asignación**: un paciente nuevo intenta agendar; el sistema no asigna automáticamente y deriva a `admin` para su asignación inicial.
- **Paciente nuevo no identificado**: la persona agenda su primera cita; el sistema recaba los datos mínimos (nombre, contacto de WhatsApp y fecha de nacimiento) sin fricción.
- **Cancelación sin reagendar**: la persona cancela y no desea otro horario; el sistema confirma con amabilidad y cierra sin culpar.
- **Pago dividido**: se registra anticipo y luego liquidación en momentos diferentes; el estado avanza correctamente por etapas y el historial queda completo.
- **Comprobante inválido o incompleto**: se registra un respaldo de pago; la psicóloga puede marcarlo como pendiente de validar sin romper el flujo.
- **Fallo en el envío de un recordatorio**: si un aviso no puede entregarse, el sistema lo deja marcado como fallido y la psicóloga lo ve para reenviarlo.
- **Conversación clínica larga**: el asistente reconoce el tema, deriva a la psicóloga y ofrece agendar una sesión, sin improvisar orientación.
- **Consulta no autorizada**: una persona intenta consultar el estado de una cita o pago desde un número no reconocido; el sistema no expone información sensible y deriva a la psicóloga.
- **Acceso no autorizado al panel**: una persona sin sesión válida intenta abrir el panel o una ruta administrativa; el sistema bloquea el acceso y solicita autenticación.
- **Sesión expirada**: la psicóloga permanece inactiva y luego intenta continuar en el panel; el sistema solicita iniciar sesión nuevamente.
- **Cita creada después de la ventana previa**: si se agenda después de las 19:00 del día anterior (o el mismo día), el sistema envía confirmación inmediata y omite los recordatorios del día previo, dejando constancia de esa condición.
- **Cancelación tardía**: una cancelación ocurrida a menos de 24 horas se registra como tardía y el sistema no genera un cobro sin una regla tarifaria aprobada.
- **Ejecución fuera de la ventana**: el job de recordatorios no envía mensajes fuera de 18:00–18:59 en `America/Mexico_City`; conserva el estado para auditoría y atención operativa.
- **Cuenta no administrativa**: un perfil de psicólogo/a o paciente intenta autenticarse; el login se rechaza aunque el perfil exista y el intento queda auditado.
- **Pregunta sobre identidad del asistente**: el paciente pregunta si habla con una persona; el asistente responde con transparencia que es un asistente digital del consultorio.
- **Contenido clínico sensible**: el paciente comparte detalles clínicos extensos; el sistema evita tratarlos como nota clínica y conserva solo un resumen administrativo breve y metadatos básicos para operar y auditar.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema DEBE responder a un paciente en WhatsApp en menos de 2 minutos cuando se inicia una conversación.
- **FR-002**: El sistema DEBE ofrecer únicamente intervalos reales dentro del rango regular de lunes a viernes de 9:00 a.m. a 9:00 p.m.; inicio y fin deben caber en horario salvo excepción manual de `admin`.
- **FR-003**: El sistema DEBE impedir intervalos traslapados para la misma psicóloga, aunque sus modalidades sean distintas, y permitir coincidencia entre psicólogas distintas.
- **FR-004**: El sistema DEBE permitir agendar y cancelar citas tanto por WhatsApp como desde el panel administrativo.
- **FR-005**: El sistema DEBE registrar la modalidad de cada cita: en línea o presencial.
- **FR-005a**: El sistema DEBE registrar `individual` (60 min), `pareja` (90 min) o `familiar` (90 min); la duración y hora de fin se calculan en el servidor.
- **FR-005b**: El sistema DEBE exigir una psicóloga activa asignada al paciente antes de crear una cita y conservar esa asignación en la cita; solo `admin` puede reasignar con auditoría.
- **FR-006**: El sistema DEBE enviar confirmación de cita con los datos de la sesión y la leyenda: "Si necesita cancelar o reagendar, avísenos con al menos 24 horas de anticipación para evitar un costo adicional." al momento de agendar.
- **FR-007**: El sistema DEBE programar y enviar un recordatorio de cada cita activa al paciente y al grupo interno exclusivamente entre las 18:00 y las 19:00 (hora `America/Mexico_City`) del día calendario anterior a la cita.
- **FR-008**: El sistema DEBE enviar aviso de cancelación y ofrecer reagendar cuando se cancela una cita.
- **FR-009**: El sistema DEBE registrar pagos de dos tipos: anticipo opcional del 50% y pago completo, vinculados a la cita correspondiente.
- **FR-010**: El sistema DEBE mostrar en el panel el estado de pago de cada cita (pendiente, anticipo, completado).
- **FR-011**: El sistema DEBE avisar el saldo pendiente solo al paciente junto con el recordatorio del día previo, si aplica, y nuevamente al concluir una cita si sigue sin pago completo validado.
- **FR-012**: El sistema DEBE permitir a la psicóloga gestionar la agenda y los pagos desde un teléfono móvil.
- **FR-013**: El sistema DEBE mantener el tono definido de atención (cálido, breve, formalidad media con "usted", español mexicano) en todas las interacciones del asistente.
- **FR-014**: El sistema DEBE derivar a la psicóloga toda cuestión clínica: no diagnostica, no interpreta síntomas ni recomienda tratamientos.
- **FR-015**: El sistema DEBE ser transparente si el paciente pregunta si está hablando con un sistema automatizado.
- **FR-016**: El sistema DEBE registrar un rastro auditable de acciones críticas (accesos, citas, pagos y cancelaciones).
- **FR-017**: El sistema DEBE presentar al público información clara del consultorio en la página: servicios, modalidades, horario, dirección y contactos.
- **FR-018**: El sistema DEBE requerir autenticación para acceder al panel administrativo.
- **FR-019**: El sistema DEBE expirar la sesión administrativa tras 30 minutos de inactividad y solicitar un nuevo inicio de sesión.
- **FR-020**: El sistema DEBE proteger las rutas del panel y de la API administrativa contra acceso sin autenticación válida.
- **FR-021**: El sistema DEBE aplicar control de acceso por identidad y rol para que solo la cuenta activa con usuario `admin` y rol `admin` pueda iniciar sesión, consultar o modificar pacientes, citas, pagos, conversaciones y registros de auditoría en este MVP.
- **FR-022**: El sistema DEBE responder por WhatsApp preguntas frecuentes del consultorio, incluyendo horarios, ubicación, modalidades y formas de pago, utilizando únicamente información oficial y vigente.
- **FR-023**: El sistema DEBE permitir a un paciente consultar el estado de su próxima cita y si mantiene saldo pendiente solo cuando exista coincidencia con su número de WhatsApp registrado y el paciente confirme su nombre y fecha de nacimiento, sin exponer datos de otros pacientes.
- **FR-024**: El sistema DEBE negar la consulta de citas, pagos o datos sensibles cuando no exista identificación suficiente del paciente, entendida en este MVP como la falta de coincidencia del número de WhatsApp registrado o la ausencia de validación satisfactoria de nombre y fecha de nacimiento, y en ese caso derivar la gestión a la psicóloga.
- **FR-025**: El sistema DEBE limitar el almacenamiento de conversaciones con contenido clínico a un resumen administrativo breve y metadatos básicos necesarios para operación, seguimiento administrativo y auditoría, sin convertirlas en expediente clínico.
- **FR-026**: El sistema DEBE registrar en el rastro auditable los accesos administrativos exitosos y fallidos, además de accesos, citas, pagos y cancelaciones.
- **FR-027**: El sistema DEBE capturar nombre, número de contacto de WhatsApp y fecha de nacimiento al crear la primera cita de un paciente nuevo.
- **FR-028**: El sistema DEBE clasificar una cancelación como `a_tiempo` si se registra con 24 horas o más de anticipación a la cita, o como `tardia` en caso contrario, usando instantes con zona horaria.
- **FR-029**: El sistema NO DEBE generar un cargo automático por cancelación tardía hasta que exista una tarifa y autorización comercial explícitas.
- **FR-030**: El sistema DEBE permitir a la cuenta `admin` visualizar un directorio de perfiles de psicólogos/as y pacientes, con sus citas y pagos pendientes, sin habilitarles autenticación o permisos administrativos.
- **FR-031**: El sistema DEBE persistir de forma independiente el resultado de envío dirigido al paciente y al grupo interno para cada cita, sin guardar datos clínicos o de pago en el contenido grupal.
- **FR-032**: El backend DEBE aplicar la autorización antes de acceder a Prisma y PostgreSQL; no se expone la base de datos a clientes. Si se adopta Supabase en el futuro, las mismas restricciones se implementarán además con RLS.

### Key Entities _(include if feature involves data)_

- **Paciente**: persona que solicita o recibe el servicio. Datos esenciales: nombre, contacto de WhatsApp, fecha de nacimiento y preferencia de modalidad.
- **Psicóloga**: perfil clínico activo sin credencial de panel. Se asigna a pacientes por `admin`.
- **Cita**: evento de sesión con psicóloga, fecha/hora de inicio y fin, modalidad, tipo/duración, estado y clasificación de aviso de cancelación (`a_tiempo` o `tardia`). Se vincula a un paciente.
- **Pago**: registro de cobro de una sesión; puede ser anticipo (50%) o pago completo, con estado (pendiente, pagado). Se vincula a una cita.
- **Recordatorio**: aviso programado con destinatario, ventana y estado. Confirmaciones/recordatorios usan paciente y grupo interno; los avisos de pago son privados del paciente.
- **Conversación**: intercambio del paciente con el asistente por WhatsApp. Conserva mensajes y metadatos operativos mínimos; si contiene contenido clínico, guarda solo un resumen administrativo breve y metadatos básicos para continuidad administrativa y auditoría, sin constituir expediente clínico.
- **Usuario administrativo**: la única persona con acceso autenticado al panel en el MVP: Jocelyn mediante la cuenta activa `admin`. El directorio puede contener perfiles de psicólogos/as y pacientes sin capacidad de login.
- **Registro de auditoría**: traza de acciones críticas y accesos administrativos del sistema, incluyendo quién intentó acceder, qué acción realizó, cuándo ocurrió y su resultado.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Un paciente agenda su primera cita por WhatsApp en menos de 2 minutos de conversación activa.
- **SC-002**: El 100% de las citas agendadas genera confirmación inmediata con datos de la sesión y la política de cancelación de 24 horas.
- **SC-003**: El 100% de las citas activas para el día siguiente recibe un recordatorio al paciente y otro al grupo interno, enviados entre las 18:00 y las 19:00 de `America/Mexico_City` el día previo.
- **SC-004**: La psicóloga registra un pago (anticipo o total) en menos de 30 segundos desde su teléfono.
- **SC-005**: Cero dobles reservas: ninguna cita confirma un horario ya ocupado.
- **SC-006**: El 100% de las cancelaciones genera aviso al paciente con opción de reagendar.
- **SC-007**: El 100% de las acciones críticas (accesos, citas, pagos, cancelaciones) queda registrada y consultable para auditoría.
- **SC-008**: En la prueba UAT, la psicóloga completa los escenarios principales (agendar, cancelar, cobrar, recibir recordatorios) sin asistencia y sin errores bloqueantes.
- **SC-009**: El 100% de los accesos no autenticados o con sesión expirada al panel administrativo es bloqueado.
- **SC-010**: En UAT, la psicóloga valida que el chatbot responde correctamente al menos a las preguntas frecuentes principales del consultorio sin contradicciones con la información oficial.
- **SC-011**: El 100% de las consultas de cita o pago realizadas desde un número no identificado evita exponer datos sensibles y se deriva correctamente a la psicóloga.
- **SC-012**: El 100% de las sesiones administrativas inactivas por 30 minutos exige un nuevo inicio de sesión antes de permitir acceso adicional.
- **SC-013**: El 100% de los intentos de login o acceso administrativo de una identidad distinta de `admin` se rechaza, no crea sesión y deja una auditoría.
- **SC-014**: El 100% de las cancelaciones conserva su clasificación temporal (`a_tiempo` o `tardia`) calculada contra la fecha de la cita.

## Assumptions

- El canal principal de comunicación con los pacientes es WhatsApp; los pacientes tienen acceso a esta aplicación.
- El horario regular de atención es de lunes a viernes de 9:00 a.m. a 9:00 p.m., sujeto a disponibilidad de agenda; los sábados quedan fuera del rango regular y solo podrán registrarse como excepción manual.
- El dispositivo principal de la psicóloga es un teléfono móvil; la experiencia móvil es prioritaria.
- Las sesiones pueden impartirse en línea o presencialmente; la presencial tiene domicilio fijo.
- Los pagos se reciben por transferencia (y el día de la sesión también en efectivo), sin pasarela de cobro en esta fase.
- Los datos personales y de salud se tratan con confidencialidad y conforme a la normativa mexicana aplicable de protección de datos (LFPDPPP).
- El historial clínico digital y los reportes estadísticos complejos quedan fuera del alcance de este ciclo y se desarrollarán en fases posteriores.
- Jocelyn es la única administradora y la única cuenta que puede iniciar sesión (`admin`) durante este MVP. El directorio se diseña para visualizar perfiles de psicólogos/as y pacientes sin concederles acceso.
- La identificación operativa del paciente en WhatsApp se realiza principalmente por coincidencia de número telefónico.
- La consulta de estado de cita o pago por WhatsApp se limita a información administrativa básica y no incluye datos clínicos.
- La verificación para consultas administrativas por WhatsApp requiere coincidencia del número telefónico registrado y validación de nombre y fecha de nacimiento del paciente.
- La fecha de nacimiento se captura durante la creación de la primera cita del paciente para habilitar verificaciones posteriores por WhatsApp.
- La sesión del panel administrativo expira tras 30 minutos de inactividad.
- La zona horaria operativa para programar y evaluar la ventana de recordatorios es `America/Mexico_City`; en PostgreSQL los instantes se almacenan como `timestamptz`.
