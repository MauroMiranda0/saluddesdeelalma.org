# Data Model: Sistema de Gestion Integral del Consultorio

## Overview

El modelo prioriza una sola administradora, una sola agenda y trazabilidad completa de accesos, citas, pagos, recordatorios y mensajeria administrativa por WhatsApp.

## Entities

### admin_users

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| id | UUID | Yes | PK |
| email | varchar(255) | Yes | Unique, lowercase |
| password_hash | varchar(255) | Yes | Nunca texto plano |
| full_name | varchar(120) | Yes | |
| role | enum(`admin`) | Yes | MVP solo admin |
| is_active | boolean | Yes | Default `true` |
| last_login_at | timestamptz | No | |
| created_at | timestamptz | Yes | Default now |
| updated_at | timestamptz | Yes | Default now |

### admin_sessions

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| id | UUID | Yes | PK |
| user_id | UUID | Yes | FK -> admin_users.id |
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
| created_by_user_id | UUID | No | FK -> admin_users.id cuando nace desde panel |
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
| recorded_by_user_id | UUID | Yes | FK -> admin_users.id |
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
| scheduled_at | timestamptz | Yes | |
| status | enum(`pendiente`,`procesando`,`enviado`,`fallido`,`omitido`) | Yes | |
| attempts_count | integer | Yes | Default `0` |
| last_error | text | No | |
| sent_at | timestamptz | No | |
| provider_message_id | varchar(120) | No | |
| created_at | timestamptz | Yes | Default now |
| updated_at | timestamptz | Yes | Default now |

**Indexes / Rules**

- Un registro por `appointment_id + reminder_type`.
- Si la cita se crea con menos de 24 horas, el `recordatorio_24h` se crea como `omitido` o no se genera segun servicio.

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
| actor_user_id | UUID | No | FK -> admin_users.id |
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

- `admin_users 1-N admin_sessions`
- `admin_users 1-N payments`
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
- La cancelacion debe disparar auditoria y recordatorio de cancelacion.

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
- `audit_activity_view`: accesos exitosos/fallidos y acciones criticas recientes.
