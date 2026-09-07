# Data Model: Sistema de Gestion Integral del Consultorio

## Overview

El modelo prioriza una sola cuenta administradora en el MVP, un directorio visible de psicólogos/as y pacientes, una sola agenda y trazabilidad completa de accesos, citas, pagos, recordatorios y mensajeria administrativa por WhatsApp.

## Entities

### users

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| id | UUID | Yes | PK |
| username | varchar(50) | No | Unique cuando existe; la única cuenta autenticable del MVP es el valor inmutable `admin` |
| email | varchar(255) | Yes | Unique, lowercase |
| password_hash | varchar(255) | No | Nunca texto plano; requerido solo para la cuenta `admin` en el MVP |
| full_name | varchar(120) | Yes | |
| role | enum(`admin`,`psicologo`,`paciente`) | Yes | Solo `admin` puede usar el panel en el MVP |
| panel_login_enabled | boolean | Yes | Default `false`; `true` exclusivamente para `username = 'admin'` y `role = 'admin'` |
| is_active | boolean | Yes | Default `true` |
| last_login_at | timestamptz | No | |
| created_at | timestamptz | Yes | Default now |
| updated_at | timestamptz | Yes | Default now |

**Indexes / Rules**

- Restriccion de base de datos: solo puede existir una fila con `role = 'admin'`; debe tener `username = 'admin'` y `panel_login_enabled = true`.
- Todo perfil `psicologo` o `paciente` mantiene `panel_login_enabled = false`; puede visualizarse desde el panel de `admin`, pero no puede crear sesiones.
- El login consulta exactamente la cuenta activa `username = 'admin'`, `role = 'admin'` y `panel_login_enabled = true`; una coincidencia parcial, otro usuario o rol se rechaza y audita.

### admin_sessions

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| id | UUID | Yes | PK |
| user_id | UUID | Yes | FK -> users.id; siempre la cuenta `admin` en MVP |
| jwt_id | UUID | Yes | Unique JTI asociado al JWT |
| started_at | timestamptz | Yes | |
| last_activity_at | timestamptz | Yes | Se actualiza en requests autenticados |
| expires_at | timestamptz | Yes | 30 minutos desde ultima actividad |
| revoked_at | timestamptz | No | Logout o invalidacion |
| ip_address | inet | No | |
| user_agent | text | No | |
| created_at | timestamptz | Yes | Default now |

### patients

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| id | UUID | Yes | PK |
| user_id | UUID | Yes | Unique FK -> users.id; perfil con rol `paciente` y sin login de panel |
| full_name | varchar(150) | Yes | |
| whatsapp_phone | varchar(30) | Yes | Unique |
| birthdate | date | Yes | Requerida desde la primera cita |
| preferred_modality | enum(`online`,`presencial`) | No | |
| email | varchar(255) | No | |
| notes | text | No | Solo notas administrativas |
| status | enum(`activo`,`inactivo`) | Yes | Default `activo` |
| created_at | timestamptz | Yes | Default now |
| updated_at | timestamptz | Yes | Default now |

### appointments

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| id | UUID | Yes | PK |
| patient_id | UUID | Yes | FK -> patients.id |
| scheduled_at | timestamptz | Yes | Fecha/hora de sesion |
| modality | enum(`online`,`presencial`) | Yes | |
| status | enum(`programada`,`confirmada`,`completada`,`cancelada`) | Yes | Default `programada` |
| is_manual_exception | boolean | Yes | `true` para sabados u otros horarios fuera de regla |
| location_label | varchar(255) | No | Domicilio o descripcion breve |
| meeting_link | text | No | Solo para modalidad en linea |
| cancel_reason | text | No | Texto administrativo corto |
| cancelled_at | timestamptz | No | Instante efectivo de la cancelacion |
| cancellation_notice | enum(`a_tiempo`,`tardia`) | No | Se calcula contra `scheduled_at`; `a_tiempo` si la diferencia es >= 24 h |
| created_by_user_id | UUID | No | FK -> users.id cuando nace desde panel |
| created_via | enum(`whatsapp`,`panel`,`system`) | Yes | |
| created_at | timestamptz | Yes | Default now |
| updated_at | timestamptz | Yes | Default now |

**Indexes / Rules**

- Unique parcial en `scheduled_at` donde `status IN ('programada','confirmada')` para evitar dobles reservas.
- Validacion de horario regular: lunes a viernes de 09:00 a 21:00 salvo `is_manual_exception = true`.

### payments

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| id | UUID | Yes | PK |
| appointment_id | UUID | Yes | FK -> appointments.id |
| patient_id | UUID | Yes | FK -> patients.id |
| payment_type | enum(`anticipo`,`completo`) | Yes | |
| amount | numeric(10,2) | Yes | Monto positivo |
| method | enum(`transferencia`,`efectivo`) | Yes | |
| status | enum(`pendiente_validacion`,`validado`,`rechazado`) | Yes | |
| proof_reference | text | No | Ruta protegida, URL interna o media id |
| recorded_by_user_id | UUID | Yes | FK -> users.id; siempre `admin` en MVP |
| paid_at | timestamptz | No | |
| created_at | timestamptz | Yes | Default now |
| updated_at | timestamptz | Yes | Default now |

**Indexes / Rules**

- Maximo un pago `anticipo` validado por cita.
- Maximo un pago `completo` validado por cita.
- El pago completo puede existir con o sin anticipo previo.

### appointment_reminders

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| id | UUID | Yes | PK |
| appointment_id | UUID | Yes | FK -> appointments.id |
| reminder_type | enum(`confirmacion`,`recordatorio_24h`,`cancelacion`,`pago_pendiente`) | Yes | |
| recipient | enum(`paciente`,`admin`) | Yes | `admin` representa a Jocelyn; conserva trazabilidad por destinatario |
| scheduled_at | timestamptz | Yes | Para `recordatorio_24h`: 18:00 local del día previo, almacenado como instante `timestamptz` |
| status | enum(`pendiente`,`procesando`,`enviado`,`fallido`,`omitido`) | Yes | |
| attempts_count | integer | Yes | Default `0` |
| last_error | text | No | |
| sent_at | timestamptz | No | |
| provider_message_id | varchar(120) | No | |
| created_at | timestamptz | Yes | Default now |
| updated_at | timestamptz | Yes | Default now |

**Indexes / Rules**

- Un registro por `appointment_id + reminder_type + recipient`.
- El servicio crea dos registros `recordatorio_24h`: uno para `paciente` y otro para `admin`, ambos para la ventana 18:00–19:00 de `America/Mexico_City` del día previo.
- El dispatcher solo puede reclamar, enviar o reintentar recordatorios del día previo entre 18:00:00 inclusive y 19:00:00 exclusiva en `America/Mexico_City`. Fuera de la ventana no envía mensajes.
- Si la cita se crea después de la ventana del día previo, los dos `recordatorio_24h` se crean como `omitido` con motivo auditable; la confirmación inmediata permanece obligatoria.

### chat_conversations

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| id | UUID | Yes | PK |
| patient_id | UUID | No | FK -> patients.id; null si aun no identificado |
| whatsapp_phone | varchar(30) | Yes | |
| current_intent | enum(`faq`,`availability`,`book`,`cancel`,`payment_info`,`payment_status`,`identity_check`,`handoff`,`unknown`) | Yes | |
| verification_status | enum(`not_needed`,`pending`,`verified`,`failed`) | Yes | |
| last_verified_at | timestamptz | No | |
| state | enum(`abierta`,`cerrada`,`derivada`) | Yes | |
| last_message_at | timestamptz | Yes | |
| created_at | timestamptz | Yes | Default now |
| updated_at | timestamptz | Yes | Default now |

### chat_messages

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| id | UUID | Yes | PK |
| conversation_id | UUID | Yes | FK -> chat_conversations.id |
| wa_message_id | varchar(120) | Yes | Unique |
| direction | enum(`inbound`,`outbound`) | Yes | |
| sender_kind | enum(`patient`,`assistant`,`admin`,`system`) | Yes | |
| content_mode | enum(`full_text`,`admin_summary`) | Yes | `admin_summary` cuando haya contenido clinico sensible |
| content_text | text | Yes | Texto normal o resumen administrativo |
| contains_sensitive_clinical_content | boolean | Yes | Default `false` |
| intent | varchar(60) | No | Intent clasificado |
| metadata | jsonb | Yes | Minimo necesario para operacion y auditoria |
| created_at | timestamptz | Yes | Default now |

### audit_logs

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| id | UUID | Yes | PK |
| actor_user_id | UUID | No | FK -> users.id |
| actor_channel | enum(`admin_panel`,`whatsapp`,`system`) | Yes | |
| action | varchar(80) | Yes | Ej. `login_success`, `appointment_created` |
| entity_type | varchar(80) | Yes | |
| entity_id | UUID | No | |
| result | enum(`success`,`failure`) | Yes | |
| metadata | jsonb | Yes | Sin datos clinicos innecesarios |
| ip_address | inet | No | |
| user_agent | text | No | |
| occurred_at | timestamptz | Yes | Default now |

## Relationships

- `users 1-N admin_sessions`
- `users 1-N payments`
- `users 1-0..1 patients`
- `patients 1-N appointments`
- `patients 1-N payments`
- `patients 1-N chat_conversations`
- `chat_conversations 1-N chat_messages`
- `appointments 1-N payments`
- `appointments 1-N appointment_reminders`

## State Transitions

### appointments.status

```text
programada -> confirmada -> completada
programada -> cancelada
confirmada -> cancelada
```

Rules:

- Solo citas activas (`programada`, `confirmada`) bloquean horario.
- La cancelacion guarda `cancelled_at` y calcula `cancellation_notice` con la diferencia exacta entre ese instante y `scheduled_at`: `a_tiempo` si es mayor o igual a 24 horas; en otro caso, `tardia`.
- La cancelacion debe disparar auditoria y recordatorio de cancelacion; una clasificación `tardia` no crea pagos ni cargos automáticamente.

### payments.status

```text
pendiente_validacion -> validado
pendiente_validacion -> rechazado
```

Rules:

- Un anticipo validado cambia el estado visible de la cita a `anticipo`.
- Un pago completo validado deja saldo en cero y estado visible `completado`.

### appointment_reminders.status

```text
pendiente -> procesando -> enviado
pendiente -> procesando -> fallido
pendiente -> omitido
fallido -> procesando -> enviado
```

Rules:

- Reintentos maximos: 3.
- Si la cita se cancela antes del envio, los recordatorios no aplicables pasan a `omitido`.
- Los envíos y reintentos de `recordatorio_24h` permanecen bloqueados fuera de la ventana 18:00–19:00 de `America/Mexico_City`, incluso si existen filas pendientes.

### chat_conversations.verification_status

```text
not_needed -> pending -> verified
pending -> failed
failed -> pending
```

Rules:

- La verificacion para ver cita o saldo exige coincidencia de telefono + nombre + fecha de nacimiento.
- Si falla la verificacion, no se muestran datos sensibles y se deriva a la psicologa.

## Derived Views Needed by UI

- `daily_agenda_view`: citas del dia con paciente, modalidad, estado y resumen de pago.
- `payment_status_view`: saldo por cita (`pendiente`, `anticipo`, `completado`).
- `user_directory_view`: perfiles de psicólogos/as y pacientes con resumen de citas y pagos pendientes, consultable solo por `admin`.
- `audit_activity_view`: accesos exitosos/fallidos y acciones criticas recientes.
