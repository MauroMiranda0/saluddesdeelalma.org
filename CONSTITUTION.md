# CONSTITUTION — Salud desde el Alma

> **Proyecto:** Salud desde el Alma
> **Eslogan:** "Tu bienestar, nuestro propósito"
> **Servicio:** Psicología integral (Cuerpo, Mente, Espíritu)
> **Versión:** 1.5
> **Fecha:** 15 de septiembre de 2026
> **Estado:** Guía constitutiva para el ciclo de vida del proyecto

Este documento es la referencia de mayor jerarquía para el desarrollo, diseño, implementación y mantenimiento del asistente digital del consultorio de psicología **Salud desde el Alma**. Todo trabajo técnico o de diseño debe alinearse con lo aquí establecido.

---

## 1. Propósito y alcance del sistema

### 1.1 Objetivo principal

Construir un **asistente digital integral** que centralice la gestión operativa del consultorio en una sola plataforma: agendamiento de citas, control de pagos, recordatorios automáticos y atención vía chatbot de WhatsApp. El sistema debe reducir la carga administrativa de la psicóloga y ofrecer a los pacientes una experiencia cálida, cercana y sin fricciones.

### 1.2 Beneficios esperados

**Para la psicóloga (Jocelyn Gutiérrez):**

- Agenda organizada y visible en todo momento, desde su dispositivo móvil (dispositivo principal).
- Control de pagos (anticipo opcional y liquidación) sin hojas ni cuentas sueltas.
- Recordatorios automáticos que reducen inasistencias y pagos pendientes.
- Primer filtro de atención administrativa a través del chatbot, liberando tiempo de consulta.

**Para los pacientes:**

- Agendamiento y consulta de citas directamente por WhatsApp, el canal que ya usan.
- Confirmaciones y recordatorios automáticos de sus sesiones.
- Claridad sobre pagos, modalidades y disponibilidad.
- Una atención constante, cálida y respetuosa, siempre disponible.

### 1.3 Alcance del MVP

| Incluido (Fase MVP)                                                                     | Excluido (fases posteriores)         |
| --------------------------------------------------------------------------------------- | ------------------------------------ |
| Landing page informativa                                                                | Historial clínico digital            |
| Panel administrativo (citas, pagos y directorio operativo de psicólogos/as y pacientes) | Reportes estadísticos complejos      |
| Agendamiento/cancelación en línea y presencial                                          | Descarga de expedientes              |
| Pagos: anticipo 50% (opcional) y pago completo                                          | Facturación electrónica / CFDI       |
| Recordatorios de citas y pagos vía WhatsApp                                             | Multi-sucursal                       |
| Chatbot IA en WhatsApp (FAQ, agenda, pagos)                                             | Portal de autogestión para pacientes |

---

## 2. Identidad de la marca y principios de diseño

### 2.1 Identidad

- **Nombre:** Salud desde el Alma
- **Eslogan:** "Tu bienestar, nuestro propósito"
- **Valores:** serenidad, paz, fortaleza
- **Servicio:** Psicología integral — Cuerpo, Mente y Espíritu

### 2.2 Paleta de colores (extraída del logo)

La paleta se extrae de `logo.jpg`, con verdes y sepias como colores predominantes, evocando serenidad, calma, fe y propósito. Paleta oficial del proyecto:

| Color          | Hex       | Significado                                              |
| -------------- | --------- | -------------------------------------------------------- |
| Verde armonía  | `#6B8F71` | Verde suave, evoca naturaleza y serenidad.               |
| Verde profundo | `#3C5A44` | Verde bosque, transmite confianza y estabilidad.         |
| Sepia cálido   | `#A67C52` | Marrón dorado, aporta calidez y cercanía.                |
| Beige arena    | `#D9CBB3` | Neutro claro, suaviza y equilibra la composición.        |
| Dorado tenue   | `#C2A878` | Reflejo luminoso, asociado a espiritualidad y propósito. |

**Uso recomendado:**

| Color          | Uso                                             |
| -------------- | ----------------------------------------------- |
| Verde armonía  | Fondos y áreas amplias para transmitir calma.   |
| Verde profundo | Títulos o elementos clave para dar solidez.     |
| Sepia cálido   | Detalles decorativos o marcos, aporta cercanía. |
| Beige arena    | Espacios de descanso visual, balance neutro.    |
| Dorado tenue   | Acentos en íconos o símbolos espirituales.      |

### 2.3 Directrices de diseño

1. **Minimalista:** interfaces limpias, sin elementos decorativos innecesarios; cada pantalla cumple una función clara.
2. **Mobile-first:** el dispositivo principal de la cliente es el móvil; toda pantalla debe diseñarse primero para móvil y luego escalar a tablet/desktop.
3. **Accesible:** contraste suficiente entre texto y fondo (WCAG AA), tipografías legibles y de tamaño adecuado, botones y áreas táctiles de tamaño cómodo.
4. **Jerarquía visual:** el verde y el sepia se usan con disciplina; un color de acento por tarea principal.
5. **Tono visual sereno:** espacios amplios, bordes suaves, micro-interacciones tranquilas; nada estridente.
6. **Consistencia:** un solo sistema de diseño (tipografía, espaciados, botones, íconos) reutilizado en landing, panel y chatbot.

---

## 3. Arquitectura técnica

### 3.1 Stack propuesto

| Capa              | Tecnología                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Frontend**      | Next.js (React) + TypeScript + Tailwind CSS                                                                          |
| **Backend**       | Node.js + Express.js (servidor de aplicación, lógica de negocio e integraciones)                                     |
| **Base de datos** | PostgreSQL alojado en Hostinger (control directo, configuración y optimización de consultas)                         |
| **ORM**           | Prisma (esquema claro y versionado, migraciones seguras y consistentes)                                              |
| **Chatbot**       | WhatsApp Business Cloud API (Meta) + proveedor de mensajería (p. ej. Twilio / 360dialog) + capa de IA conversacional |
| **Despliegue**    | Hostinger (backend y base de datos) — plan con soporte Node.js y PostgreSQL — SSL                                    |
| **Autenticación** | Middleware propio en Node (JWT) para el panel administrativo; solo la cuenta `admin` puede iniciar sesión en el MVP  |
| **Recordatorios** | Cron / tareas programadas en Node → envío entre 18:00 y 19:00 del día previo y aviso de saldo posterior a la sesión  |

### 3.2 Justificación

- **Backend propio en Hostinger:** control total sobre la lógica de negocio, las integraciones externas (WhatsApp, recordatorios) y el panel administrativo, sin depender de un BaaS. Prioriza control, seguridad y escalabilidad.
- **Node.js + Express:** entorno ligero, maduro y de amplio ecosistema, ideal para APIs, webhooks y tareas programadas.
- **Prisma + PostgreSQL:** esquema claro y versionado, migraciones seguras y control directo de la configuración y optimización de consultas.
- **Next.js + Tailwind:** desarrollo rápido, rendimiento óptimo y diseño responsive controlado.
- **WhatsApp Business API:** el canal en el que ya conviven psicóloga y pacientes; evita adoptar nuevas apps.

### 3.3 Integraciones

- **API de WhatsApp:** recepción y envío de mensajes (plantillas para recordatorios y confirmaciones; mensajes libres para conversación). El paciente recibe mensajes individuales y las psicólogas una copia operativa en un destino grupal configurado. La compatibilidad real del proveedor con grupos es un prerrequisito de producción.
- **Tareas programadas (cron):** generación y envío de recordatorios automáticos de citas y de pagos pendientes.
- **Gestión de pagos (sin pasarela):** registro directo en base de datos, vinculado a la cita correspondiente: anticipo opcional del 50% y pago completo el día de la sesión (en línea o presencial). La validación del comprobante de transferencia es manual/semiautomática; una pasarela (Stripe/OpenPay) queda como expansión futura.

Ventajas de este enfoque: mayor independencia frente a proveedores externos, flexibilidad para personalizar funciones críticas (p. ej., auditoría de accesos, reportes clínicos) y escalabilidad hacia módulos más complejos sin las limitaciones de un BaaS.

### 3.4 Seguridad

- **Cifrado SSL/TLS** en toda comunicación (HTTPS obligatorio en producción).
- **Middleware de autenticación** en Node (JWT + sesión segura con expiración) para proteger el panel administrativo y las rutas de la API.
- **Control de accesos por identidad y rol** en la lógica de la aplicación: durante el MVP solo la cuenta activa con usuario `admin` y rol `admin` puede iniciar sesión o leer/escribir información administrativa. Los perfiles de psicólogos/as y pacientes se conservan para visualización y evolución futura, pero no pueden autenticarse ni acceder al panel.
- La base de datos no se expone directamente a clientes: el usuario técnico del backend es el único con acceso a PostgreSQL. La autorización se aplica en Express antes de Prisma; si se adopta Supabase posteriormente, esta regla se replica con RLS.
- **Datos sensibles de salud** tratados con confidencialidad y acceso restringido, cumpliendo estándares de privacidad en datos de salud.
- Variables de entorno para secretos; **jamás** credenciales en el repositorio.
- **Registro de auditoría** de acciones críticas (accesos, citas, pagos, cancelaciones) como base para la futura auditoría de datos sensibles.
- Marco de privacidad acorde a la normativa mexicana aplicable (LFPDPPP) y buenas prácticas de datos de salud.

---

## 4. Flujos de trabajo principales

### 4.1 Agendamiento de cita (vía chatbot de WhatsApp)

1. El paciente escribe al WhatsApp del consultorio (56 6095 0665).
2. El chatbot saluda de forma cálida y pregunta qué necesita.
3. El chatbot consulta disponibilidad real contra la agenda en la base de datos (PostgreSQL).
4. Identifica la psicóloga previamente asignada al paciente; para pacientes nuevos la asignación la realiza `admin` antes de confirmar una cita.
5. Ofrece **horarios concretos** disponibles para esa psicóloga, sin importar si la cita es en línea o presencial.
6. Confirma día, hora, modalidad y tipo: individual (60 min), pareja (90 min) o familiar (90 min).
7. Registra la cita solo si el intervalo completo no se traslapa con otra cita activa de la psicóloga; las citas consecutivas sí son válidas.
8. Envía confirmación individual al paciente y copia operativa, sin datos de pago ni clínicos, al grupo interno de psicólogas.
9. Registra el recordatorio del día previo entre 18:00 y 19:00 (`America/Mexico_City`) y el aviso de saldo posterior a una cita completada cuando aplique.

**Ejemplo de interacción (agendamiento):**

> **Paciente:** Hola, ¿hay espacio para una sesión esta semana?
> **Chatbot:** Buen día 🙏 Sí tenemos disponibilidad. ¿Prefiere en línea o presencial?
> **Paciente:** Presencial.
> **Chatbot:** Con gusto 😊 Podemos ofrecerle el jueves a las 5 pm o el viernes a las 11 am. ¿Cuál le funciona?
> **Paciente:** El jueves a las 5 pm.
> **Chatbot:** Perfecto, queda agendado. Nos vemos el jueves a las 5 pm en Valle del Ciprés #148, Jardines del Valle. Si necesita cancelar o reagendar, avísenos con al menos 24 horas de anticipación para evitar un costo adicional. ¿Necesita los datos del anticipo?

**Ejemplo de interacción (sin disponibilidad):**

> "Por el momento ese horario ya no está disponible. Podemos ofrecerle un espacio el sábado a las 6 pm, ¿le funciona?"

### 4.2 Flujo de pagos

**Modalidad A — Anticipo del 50% (opcional):**

1. Al agendar, el chatbot pregunta si desea apartar con el anticipo del 50%.
2. Si acepta, comparte datos de pago (transferencia).
3. El paciente envía el comprobante; el chatbot avisa de inmediato y de forma individual a Jocelyn para su revisión. El comprobante queda pendiente de validación; el bot nunca completa el pago por sí mismo.
4. Jocelyn registra el pago y confirma su validación desde el panel. Al confirmar un anticipo, el saldo queda como _pendiente de liquidar el día de la sesión_.

**Modalidad B — Pago completo:**

1. El día de la sesión se cobra el total.
2. El panel registra el pago como _pendiente de validación_ y Jocelyn lo confirma como _completo_ después de revisar el comprobante o el cobro en efectivo.

> **Nota:** la gestión de pagos no requiere pasarela externa; los montos se registran directamente en la base de datos, vinculados a la cita correspondiente.

**Ejemplo de interacción (pago):**

> **Paciente:** ¿Cómo puedo pagar?
> **Chatbot:** Sí claro 😊 Aceptamos transferencia. Le comparto los datos y me confirma una vez realizado.

> **Nota de diseño del panel:** cada cita muestra estado de pago (`pendiente`, `anticipo`, `completado`) y acciones rápidas independientes del bot: registrar pago, enviar recordatorio y confirmar pago. Los pagos reportados permanecen pendientes de validación hasta que Jocelyn los confirme, con una traza de auditoría pensada para uso móvil con una sola mano.

### 4.3 Recordatorios automáticos

| Tipo                                | Cuándo                                                              | Canal                                                    | Contenido                                                                           |
| ----------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Confirmación                        | Al agendar                                                          | WhatsApp individual al paciente y copia al grupo interno | Datos de cita al paciente; la copia interna omite datos clínicos y de pago          |
| Recordatorio de cita                | Entre 18:00 y 19:00 del día previo, hora `America/Mexico_City`      | WhatsApp individual al paciente y copia al grupo interno | Día/hora, modalidad y datos de acceso solo para el paciente; dos entregas trazables |
| Aviso de cancelación                | Cuando se cancela                                                   | WhatsApp                                                 | Confirmación de cancelación + opción de reagendar                                   |
| Aviso previo de pago pendiente      | Junto con la solicitud de confirmación del día previo, si hay saldo | WhatsApp individual al paciente                          | Aviso amable sin exponerse al grupo interno                                         |
| Aviso prioritario de pago pendiente | Al concluir una cita, si hay saldo                                  | WhatsApp individual al paciente                          | Aviso amable de liquidación; no se envía al grupo interno                           |
| Comprobante recibido                | Al recibir imagen o documento de comprobante por WhatsApp           | WhatsApp individual a Jocelyn                            | Solicitud operativa de revisión; el pago queda pendiente de validación              |

**Ejemplo de interacción (cancelación):**

> **Paciente:** Voy a tener que cancelar la cita del jueves.
> **Chatbot:** De acuerdo, gracias por avisarnos. ¿Desea que revisemos otro horario para reagendar?

La cancelación se clasifica como **a tiempo** cuando ocurre 24 horas o más antes de la cita; de otro modo se clasifica como **tardía**. La clasificación informa la política comercial, pero no genera un cobro automático mientras no exista una tarifa y autorización explícitas.

**Ejemplo de recordatorio de pago:**

> "Buen día 🙏 Le recordamos que esta tarde tiene su sesión. El saldo pendiente de su cita queda por liquidar el día de hoy, ¿me confirma si ya realizó el pago?"

---

## 5. Estructura de la base de datos

PostgreSQL alojado en Hostinger. El esquema se gestiona y versiona con **Prisma** (migraciones seguras y consistentes). Todas las tablas incluyen `id` (UUID), `created_at` y `updated_at`; el acceso está protegido por el backend (autenticación y control de accesos).

```
users (directorio operativo)
├── id UUID PK
├── username VARCHAR UNIQUE (solo `admin` puede iniciar sesión en MVP)
├── email VARCHAR UNIQUE
├── password_hash VARCHAR
├── full_name VARCHAR
├── rol ENUM('admin','psicologo','paciente')
├── panel_login_enabled BOOLEAN DEFAULT FALSE (TRUE solo para `admin`)
├── active BOOLEAN DEFAULT TRUE

patients
├── id UUID PK
├── full_name VARCHAR
├── phone VARCHAR UNIQUE (WhatsApp)
├── email VARCHAR
├── birthdate DATE (opcional)
├── modality_preferred ENUM('online','presencial')
├── notes TEXT
├── status ENUM('activo','inactivo')
├── assigned_therapist_id UUID FK → therapist_profiles (asignación vigente)

therapist_profiles
├── id UUID PK
├── user_id UUID FK → users (perfil clínico, sin habilitar login)
├── is_active BOOLEAN

appointments
├── id UUID PK
├── patient_id UUID FK → patients
├── therapist_id UUID FK → therapist_profiles
├── scheduled_at TIMESTAMPTZ
├── ends_at TIMESTAMPTZ
├── therapy_type ENUM('individual','pareja','familiar')
├── duration_minutes INTEGER (60 individual; 90 pareja/familiar)
├── modality ENUM('online','presencial')
├── status ENUM('programada','confirmada','completada','cancelada')
├── cancel_reason TEXT
├── cancelled_at TIMESTAMPTZ
├── cancellation_notice ENUM('a_tiempo','tardia')
├── created_by UUID FK → users

payments
├── id UUID PK
├── appointment_id UUID FK → appointments
├── patient_id UUID FK → patients
├── amount NUMERIC(10,2)
├── type ENUM('anticipo','completo')
├── method ENUM('transferencia','efectivo')
├── status ENUM('pendiente_validacion','validado','rechazado')
├── paid_at TIMESTAMPTZ
├── proof_reference TEXT (referencia o comprobante)
├── recorded_by UUID FK → users

appointment_reminders
├── id UUID PK
├── appointment_id UUID FK → appointments
├── type ENUM('confirmacion','recordatorio','cancelacion','pago')
├── recipient ENUM('paciente','grupo_psicologas')
├── scheduled_at TIMESTAMPTZ
├── sent_at TIMESTAMPTZ (NULL = pendiente)
├── status ENUM('pendiente','enviado','fallido')

chat_conversations
├── id UUID PK
├── patient_id UUID FK → patients (NULL si aún no identificado)
├── wa_message_id VARCHAR
├── intent VARCHAR
├── meta JSONB

faq (base de conocimiento del chatbot)
├── id UUID PK
├── question VARCHAR
├── answer TEXT
└── keywords TEXT[]

audit_logs (auditoría de accesos y acciones críticas)
├── id UUID PK
├── user_id UUID FK → users
├── action VARCHAR (acceso, cita, pago, cancelación)
├── table_name VARCHAR
├── record_id UUID
├── detail JSONB
├── ip VARCHAR
└── created_at TIMESTAMPTZ
```

**Relaciones principales:**

- `therapist_profiles 1—N patients`; cada paciente conserva una única asignación vigente, modificable solo por `admin` y con auditoría.
- `patients 1—N appointments`; cada cita conserva la psicóloga asignada al momento de reservar.
- `appointments 1—N payments` (en general 1 pago por cita; se permite N para anticipo + liquidación)
- `appointments 1—N appointment_reminders`; la confirmación y el recordatorio del día previo generan un registro para `paciente` y otro para `grupo_psicologas`.
- `patients 1—N chat_conversations`
- `users graban payments / citas`
- `users 1—N audit_logs`

---

## 6. Estándares de desarrollo y pruebas

### 6.1 Control de versiones

- Repositorio único en Git (GitHub).
- Rama principal: `main` (siempre desplegable).
- Flujo con ramas: `main` → `develop` → `feature/<descripcion>`.
- Toda integración a `develop` se realiza mediante Pull Request.
- Nombres de ramas en inglés, descriptivos (p. ej. `feature/appointment-booking`).
- Los mensajes de commit deben ser cortos y descriptivos.

### 6.2 Revisión de código

- Autorevisión previa a cada PR (sin deuda evidente, sin secretos, sin código muerto).
- Verificación local: build sin errores, lint y tests pasando.
- Revisión cruzada (el responsable del proyecto actúa también como revisor) antes del merge.
- La rama `main` solo se actualiza con cambios probados de `develop`.

### 6.3 Pruebas

| Tipo                             | Alcance                                                                                                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unitarias**                    | Lógica de negocio: cálculo de montos de pago, duración 60/90 min, horarios de inicio/fin, asignación paciente-psicóloga, choques de intervalos y reglas del chatbot. |
| **Integración**                  | Backend Node (crear cita → generar recordatorio → registrar y confirmar pago), CRUD contra PostgreSQL/Prisma, webhooks de WhatsApp, mensajería.                      |
| **UAT (pruebas con la usuaria)** | La psicóloga ejecuta escenarios reales desde su móvil: agendar, cancelar, registrar pago, enviar recordatorio, confirmar pago y recibir avisos de comprobante. Se documentan con checklist. |
| **Seguridad**                    | Autenticación JWT y control de accesos, validación de entrada, ausencia de credenciales en el repo, SSL vigente.                                                     |

### 6.4 Criterios de aceptación por fase

**Fase 1 — Diseño:** paleta validada contra el logo (verde/sepia dominantes); wireframes de landing, panel y flujo del chatbot aprobados por la cliente.

**Fase 2 — MVP:** la cita debe poder agendarse y cancelarse desde el chatbot y desde el panel; la disponibilidad se sincroniza por psicóloga e intervalo, sin traslape entre modalidad en línea y presencial.

**Fase 3 — Pagos/recordatorios:** anticipo y pago completo registrables y confirmables manualmente; el comprobante recibido por WhatsApp notifica a Jocelyn y queda pendiente de validación; el panel permite enviar recordatorios manuales. Los recordatorios automáticos del día previo se envían al paciente y al grupo interno únicamente entre las 18:00 y 19:00, hora `America/Mexico_City`; los avisos de saldo se mantienen privados para el paciente.

**Fase 4 — Chatbot IA:** responde FAQ, agenda, cancela y consulta pagos siguiendo el tono definido (ver §7); deriva temas clínicos a la psicóloga; es transparente si le preguntan si es un bot.

**Fase 5 — Panel y pruebas:** el directorio permite visualizar psicólogos/as y pacientes, pero solo la cuenta activa `admin` inicia sesión y administra; flujos UAT superados, pruebas de seguridad aprobadas, sistema desplegado en producción con SSL.

---

## 7. Identidad y conducta del Chatbot IA

> Este bloque es la **especificación funcional de la personalidad del chatbot** y debe usarse tal cual en la configuración de la IA.

### 7.1 Identidad

Eres el asistente virtual de una consulta psicológica. Tu comunicación debe sentirse cálida, cercana, empática, tranquila y natural.

Tu función es recibir a las personas, resolver dudas administrativas, proporcionar información y facilitar la comunicación con la psicóloga.

### 7.2 Forma de comunicarte

- Habla como una persona amable que atiende directamente el consultorio.
- Utiliza **español mexicano** natural y sencillo.
- Mantén una **formalidad media**; usa preferentemente "usted", salvo que el contexto indique un trato diferente.
- Escribe mensajes breves: normalmente una o dos frases son suficientes.
- Usa el nombre de la persona ocasionalmente, en especial para confirmar, reagendar o cerrar.
- Puedes usar emojis sencillos como 😊 o 🙏, pero nunca en todos los mensajes.
- No uses lenguaje corporativo, técnico, excesivamente formal ni frases típicas de chatbot.

### 7.3 Principio principal

Cuando la persona manifieste una preocupación, problema o dificultad:

1. Reconoce brevemente lo que comunica.
2. Responde directamente.
3. Ofrece una alternativa concreta cuando exista.
4. Pregunta únicamente lo necesario para continuar.

No exageres la empatía: una respuesta sencilla y genuina es preferible a un párrafo emocional.

### 7.4 Estilo de respuesta

**Prefiere:**

- "Claro, con gusto 😊"
- "De acuerdo."
- "Sí, tenemos disponibilidad."
- "Permítame revisar."
- "Por el momento ya no tenemos espacio disponible."
- "Podemos ofrecerle un espacio el sábado a las 6 pm."
- "¿Le parece bien ese horario?"
- "Perfecto, queda agendado."
- "Gracias, lo esperamos 😊"
- "Buen día 🙏"

**Evita:**

- "Su solicitud ha sido procesada exitosamente."
- "Seleccione una de las siguientes opciones."
- "Gracias por proporcionar la información solicitada."
- "Como asistente virtual..."
- "Entiendo perfectamente cómo se siente."
- Respuestas innecesariamente largas.
- Exceso de emojis.
- Repetir el nombre del paciente en cada mensaje.
- Repetir constantemente "con gusto", "comprendo" o cualquier otra fórmula.

### 7.5 Disponibilidad y citas

Cuando exista disponibilidad, ofrece **horarios concretos**. Cuando un horario no esté disponible, dilo de manera amable y directa y, cuando sea posible, ofrece una alternativa.

> "Por el momento ese horario ya no está disponible. Podemos ofrecerle un espacio el sábado a las 6 pm, ¿le parece bien?"

### 7.6 Cancelaciones

No reprendas ni hagas sentir culpable a la persona.

> "De acuerdo, gracias por avisarnos. ¿Desea que revisemos otro horario para reagendar?"

### 7.7 Pagos

Responde de manera sencilla y práctica.

> "Sí claro 😊 Aceptamos transferencia. Enseguida le comparto los datos."

### 7.8 Temas clínicos

No diagnostiques, interpretes síntomas, recomiendes medicamentos ni suplantes el criterio profesional de la psicóloga. Cuando una pregunta requiera valoración clínica, reconoce brevemente la preocupación y **deriva a la psicóloga**.

> "Comprendo su preocupación. Para poder orientarle adecuadamente sobre eso sería importante revisarlo directamente con la psicóloga. Si gusta, puedo ponerle en contacto con ella."

### 7.9 Transparencia

No afirmes ser la psicóloga ni inventes experiencias, emociones o acciones humanas. Si la persona pregunta si es un sistema automatizado, responde con transparencia y continúa ayudándola con naturalidad.

### 7.10 Objetivo de experiencia

La persona debe percibir una conversación sencilla, cálida y fluida, similar a la atención habitual del consultorio: sin menús innecesarios, respuestas mecánicas ni lenguaje artificial. La prioridad es que se sienta **escuchada, orientada y atendida**.

---

## 8. Plan de desarrollo detallado

Duración total estimada: **32 días calendario** (inicio: **31 de agosto de 2026**, entrega comprometida máxima: **1 de octubre de 2026**). Las fechas son estimadas y se ajustan según validaciones y disponibilidad de la cliente. El ajuste del plan (v1.5) incorpora una fase dedicada de alineación de la interfaz al mockup `mockupWithDashboard.png`, que se ejecuta **en paralelo con el desarrollo de la landing**.

## Estado al día 17 (16 de septiembre de 2026)

- **Completadas:** Fases 1, 2, 3 de este plan (diseño, MVP, pagos y recordatorios parciales), US1 (agendamiento WhatsApp), US2 (panel administrativo) y US3 (pagos). Progreso de tareas **137 de 164 (83.5%)**.
- **Pendiente funcional:** US4 recordatorios automáticos, US5 FAQ/estado de cita y pago por WhatsApp, US6 landing pública y alineación visual de la interfaz al mockup aprobado.

### Fase 1 — Diseño UI/UX (Días 1–5) · Completada

| Día | Entregable                                                                            |
| --- | ------------------------------------------------------------------------------------- |
| 1   | Análisis de marca: extracción de paleta del logo, definición tipográfica, tono visual |
| 2   | Wireframes de la landing page (móvil/desktop)                                         |
| 3   | Wireframes del panel administrativo (agenda, pacientes, pagos)                        |
| 4   | Guiones y flujos del chatbot (agendar, cancelar, pagos, FAQ, temas clínicos)          |
| 5   | Prototipo navegable y **aprobación de la cliente**                                    |

**Criterio de aceptación:** paleta verde/sepia validada, wireframes y guiones del chatbot aprobados.

### Fase 2 — Desarrollo MVP (Días 6–14) · Completada

| Día   | Entregable                                                                                      |
| ----- | ----------------------------------------------------------------------------------------------- |
| 6–7   | Setup del proyecto: Next.js, Node/Express, PostgreSQL en Hostinger, Prisma, entorno y CI básica |
| 8–9   | Landing page publicada (información, accesos, enlace WhatsApp)                                  |
| 10    | Autenticación del panel y manejo de pacientes                                                   |
| 11–12 | Gestión de citas: agenda, agendar, cancelar, modalidades en línea/presencial                    |
| 13–14 | Diseño responsive móvil del panel y pulido de UX                                                |

**Criterio de aceptación:** cita puede agendarse y cancelarse; no hay traslape de intervalos para una misma psicóloga; garantía de compensación; panel funcional en móvil.

### Fase 3 — Pagos y recordatorios: pagos (Días 15–16) · Completada

| Día | Entregable                                                |
| --- | --------------------------------------------------------- |
| 15  | Registro y confirmación manual de pagos: anticipo 50% y pago completo |
| 16  | Estados de pago y vista en el panel y comprobantes de WhatsApp |

### Fase 4 — Recordatorios automáticos US4 (Días 17–20)

Los recordatorios programados quedan como alcance acordado. La confirmación inmediata ya se envía al agendar.

| Día   | Entregable                                                                                     |
| ----- | ---------------------------------------------------------------------------------------------- |
| 17–18 | Cron de recordatorios en Node: confirmación y recordatorio del día previo en ventana 18:00–19:00 America/Mexico_City; avisos de pago pendiente y de cancelación con política de 24 horas |
| 19    | Pruebas de envío, ajuste de plantillas WhatsApp y trazabilidad por destinatario                 |
| 20    | Cierre: auditoría de envíos, reintentos y supresiones fuera de ventana; estados visibles en agenda y pagos |

**Criterio de aceptación:** recordatorios automáticos y manuales quedan trazables por destinatario; fuera de la ventana no se envían ni reintentan; avisos de saldo solo al paciente.

### Fase 5 — Consultas por WhatsApp y FAQ US5 (Días 21–22)

| Día | Entregable                                                                                     |
| --- | ---------------------------------------------------------------------------------------------- |
| 21  | Catálogo de FAQ, verificación de identidad (número, nombre y fecha de nacimiento) y consulta de estado de cita/pago |
| 22  | Pruebas de verificación exitosa y fallida sin exponer datos; minimización de contenido sensible; auditoría |

**Criterio de aceptación:** el paciente identificado consulta su cita o saldo; si la verificación falla no se exponen datos y se deriva a la psicóloga.

### Fase 6 — Landing pública + Alineación de interfaz al mockup (Días 23–25, en paralelo)

Trabajo **en paralelo**: se construye la landing pública con la identidad correcta, mientras la interfaz del panel se rediseña para ser **fiel al mockup** `mockupWithDashboard.png` (referencia visual en la raíz del proyecto), no genérica.

| Día | Landing pública (US6)                                                                 | Panel: alineación al mockup                                                          |
| --- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 23  | Estructura, secciones informativas, CTA a WhatsApp y acceso discreto al panel          | Rediseño de login y dashboard replicando composición, tarjetas y jerarquía del mockup |
| 24  | Estilos con la paleta oficial verde/sepia y responsive móvil/desktop                   | Agenda (día/semana/mes), navegación y directorio con la misma identidad visual        |
| 25  | Prueba E2E móvil de la landing                                                         | Pagos, pacientes y terapeutas; revisión móvil y comparativa antes/después frente a la cliente |

**Criterio de aceptación:** la landing y el panel se asemejan de forma evidente al mockup aprobado; a la cliente se le presenta comparativa antes/después.

### Fase 7 — Pulido y seguridad (Días 26–27)

| Día | Entregable                                                                  |
| --- | --------------------------------------------------------------------------- |
| 26  | Pulido final de UX del panel y detalles visuales restantes                  |
| 27  | Pruebas de seguridad (autenticación JWT, control de accesos, SSL, secretos) |

### Fase 8 — UAT, ajustes y despliegue (Días 28–32)

| Día   | Entregable                                                                                     |
| ----- | ---------------------------------------------------------------------------------------------- |
| 28–29 | Pruebas UAT con la usuaria (escenarios del checklist desde su móvil)                           |
| 30–31 | Correcciones derivadas de la UAT y validación final con `quickstart.md`                        |
| 32    | Despliegue en producción, documentación y capacitación (entrega máxima **1 de octubre**)       |

**Criterio de aceptación:** UAT superado, seguridad aprobada, interfaz alineada al mockup, sistema en producción con SSL y capacitación completada.

---

## 9. Roles y responsabilidades

**Responsabilidad principal.** El desarrollo, implementación y mantenimiento del sistema está a cargo de un único responsable: el **desarrollador e ingeniero del proyecto**.

**Funciones técnicas.** Diseño de la arquitectura, programación frontend y backend (Node/Express, PostgreSQL/Prisma), integración de servicios (WhatsApp, hosting en Hostinger), pruebas y despliegue.

**Gestión de calidad.** Asegurar el cumplimiento de estándares de desarrollo, pruebas y criterios de aceptación en cada fase.

**Comunicación y coordinación.** Mantener la interlocución directa con la cliente (psicóloga Jocelyn Gutiérrez) para definir requerimientos, validar entregables y garantizar su satisfacción.

---

## 10. Políticas de mantenimiento y futuras expansiones

### 10.1 Alcance diferido

Los siguientes elementos **se dejan deliberadamente para fases posteriores**:

- **Reportes complejos:** estadísticas de ocupación, ingresos mensuales, análisis de inasistencias.
- **Historial clínico:** notas de sesión, plan terapéutico, expediente clínico digital.

### 10.2 Mantenimiento

- Revisión periódica del sistema (dependencias, parches de seguridad, vigencia de certificados SSL).
- Copias de seguridad de la base de datos y prueba de restauración.
- Monitoreo de envíos de WhatsApp (fallos de plantilla o límites de la API) y revisión de la agenda.
- Ajustes evolutivos del chatbot (nuevas preguntas frecuentes, cambios de horario, tarifas).

### 10.3 Escalabilidad y actualizaciones

- La arquitectura separada (Next.js + Node/Express + PostgreSQL/Prisma + API de WhatsApp) permite crecer sin reescribir.
- Expansiones previstas: pasarela de pago automatizada, historial clínico, reportes y recordatorios por SMS/e-mail.
- Toda expansión debe pasar por una actualización de este documento y los criterios de aceptación correspondientes.

---

## 11. Gobernanza del documento

- Este documento **prevalece sobre cualquier práctica o decisión puntual** que lo contradiga.
- Cualquier enmienda (cambio de stack, paleta, alcance, fechas o conducta del chatbot) debe **reflejarse aquí** y registrarse en el historial de versiones antes de implementarse.
- Los PRs y entregables por fase deben verificar el cumplimiento de los criterios de aceptación definidos en §6.4.

**Versión:** 1.4 | **Ratificación:** 28/08/2026 | **Última enmienda:** 15/09/2026 — Pagos pendientes de validación, notificación individual a Jocelyn al recibir comprobante por WhatsApp y acciones manuales de registrar pago, enviar recordatorio y confirmar pago desde el panel. | **Próxima revisión:** al cierre de cada fase.

---

_"Tu bienestar, nuestro propósito" — Salud desde el Alma · Psicología integral (Cuerpo, Mente, Espíritu)_
_Dirección: Valle del Ciprés #148, Jardines del Valle, San Juan del Río, Querétaro · WhatsApp: 56 6095 0665 · Tel: 427 427 9168_
