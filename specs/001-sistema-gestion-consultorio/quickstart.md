# Quickstart: Sistema de Gestion Integral del Consultorio

## Estado actual

Esta guia refleja el estado posterior a las convergencias de cierre de las fases comerciales de agendamiento (`US1`), panel administrativo (`US2`), pagos (`US3`), recordatorios (`US4`), consultas por WhatsApp (`US5`) y landing publica (`US6`), y a las convergencias **Phase 23** a **Phase 40**, incluida la convergencia de seguridad `T066` del 03/10/2026. El repositorio tiene backend Express compilable, schema y migraciones de Prisma, infraestructura de sesiones/auditoria, panel administrativo movil, y el flujo de agendamiento por WhatsApp. El webhook valida la suscripcion de Meta, procesa mensajes de texto de forma asincrona y detecta imagenes o documentos de comprobantes para avisar individualmente a Jocelyn; el pago nunca se valida de forma automatica. Tambien puede ofrecer horarios concretos, crear una cita, enviar la confirmacion inmediata, derivar temas clinicos y declarar que es un asistente digital. Tambien puede cancelar por WhatsApp una cita activa tras verificar el numero registrado y el nombre y la fecha de nacimiento del paciente, confirmando la cancelacion y la oferta de reagendar; la verificacion fallida se audita y no expone datos. La evaluacion clinica ocurre antes que el flujo de reserva; los recordatorios del dia previo se programan a las 18:00 `America/Mexico_City` y solo se envian el dia calendario anterior a una cita aun futura. El login del panel es funcional para la cuenta `admin` (usuario `admin`, rol `admin`), la sesion expira por inactividad de 30 minutos, y la agenda permite crear, cancelar y mover/reagendar citas desde el movil. La landing publica existe en `/`, con su catalogo de FAQ y acceso discreto al panel.

## Prerrequisitos verificados para esta fase

- Node.js 22 LTS o superior
- npm 10+
- PostgreSQL 16 para migraciones reales

## Variables de entorno implementadas y planificadas

### Backend

Archivo: `backend/.env.example`

- `NODE_ENV`
- `PORT`
- `API_PREFIX`
- `FRONTEND_ORIGIN`
- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_SEED_PASSWORD` (solo para ejecutar el seed de la cuenta administrativa; mínimo 16 caracteres)
- `SESSION_COOKIE_NAME`
- `SESSION_IDLE_TIMEOUT_MINUTES`
- `REMINDER_TIMEZONE` (valor de producción: `America/Mexico_City`)
- `ENABLE_REMINDER_WORKER` (`true` arranca el worker de recordatorios cada 5 minutos junto con el backend; recomendado en producción, deshabilitado por defecto)
- `ENABLE_WHATSAPP_INBOX_WORKER` (`true` arranca el worker del inbox de WhatsApp cada 30 segundos junto con el backend; requerido en producción para que un webhook aceptado no quede sin procesar, deshabilitado por defecto)
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ADMIN_PHONE` (número individual de Jocelyn para avisos de comprobantes)
- `WHATSAPP_PSYCHOLOGISTS_GROUP_ID` (destino interno; requiere proveedor compatible con grupos)
- `AI_PROVIDER_API_KEY` (ningún módulo la lee hoy: la capa de IA que `plan.md` declara no existe. Ver `T209` en `tasks.md`)
- `TRUST_PROXY` (opcional; si no se declara, Express ignora `X-Forwarded-For` y resuelve `request.ip` sin proxy. Defínela en producción si la app corre detrás de un proxy o CDN, para que `audit_logs` guarde la IP real del solicitante)

### Frontend

Archivo: `frontend/.env.example`

- `NEXT_PUBLIC_API_BASE_URL`

## Instalacion

```bash
npm install
```

## Validacion disponible al dia 34 (03/10/2026)

### 1. Validar Prisma schema

```bash
npm run prisma:validate
```

Resultado esperado:

- Prisma confirma que `backend/prisma/schema.prisma` es valido.
- El script carga `backend/.env.example`, por lo que no requiere un archivo `.env` ni una conexion activa a PostgreSQL.

### 2. Validar tipos

```bash
npm run typecheck
```

Resultado esperado:

- TypeScript valida backend y frontend sin errores.

### 3. Ejecutar pruebas de contrato, integracion y unitarias

```bash
npm run test --workspace backend
```

Resultado esperado:

- El webhook valida el challenge de Meta y acepta eventos de mensajes.
- El flujo de agendamiento valida tipo/duración de sesión, horario de inicio y fin, derivacion clinica (evaluada antes que la reserva), transparencia y la confirmacion obligatoria; la disponibilidad ofrece slots reales cuando hay psicóloga activa asignada.
- Se verifican la orquestacion de cita, confirmacion y auditoria, las migraciones inicial y de reglas de negocio en PostgreSQL embebido, la ventana del recordatorio del dia previo (unitaria) y las restricciones de acceso al panel.
- Las pruebas `*.postgres.integration.test.ts` se saltan por defecto; se activan con el gate de PostgreSQL real (seccion 9).

### 4. Build completo

```bash
npm run build
```

Resultado esperado:

- Prisma Client se genera correctamente.
- Backend compila a `backend/dist/`.
- Frontend compila a `frontend/.next/`.

### 5. Levantar backend compilado

```bash
npm run start:backend
```

En otra terminal, validar health:

```bash
curl http://localhost:4000/health
```

Resultado esperado:

```json
{ "status": "ok", "service": "saluddesdeelalma-backend" }
```

### 6. Levantar frontend compilado

```bash
npm run start:frontend
```

Resultado esperado:

- Next.js inicia en `http://localhost:3000`.
- La ruta publica `/` es la landing, con secciones informativas, catalogo de FAQ, CTA a WhatsApp y acceso discreto al panel.

### 7. Validar lint

```bash
npm run lint
```

Resultado esperado:

- ESLint finaliza sin errores.

### 8. Validar formato

```bash
npm run format:check
```

Resultado esperado:

- Prettier confirma que los archivos configurados cumplen el estilo esperado.

### 9. Gate de integracion con PostgreSQL real (opt-in)

Las reglas de sesión y recordatorios requieren PostgreSQL real con `btree_gist` (PGlite no lo incluye). Para activarlas:

```bash
docker run -d --name sda-pg-test -e POSTGRES_USER=sda -e POSTGRES_PASSWORD=sda_test_password -e POSTGRES_DB=sda -p 54321:5432 postgres:16-alpine

$env:DATABASE_URL = "postgresql://sda:sda_test_password@localhost:54321/sda?schema=public"
cd backend
npx prisma migrate deploy --schema prisma/schema.prisma
cd ..

$env:RUN_POSTGRES_INTEGRATION = "true"
npm run test --workspace backend
```

Resultado esperado:

- Las 11 migraciones se aplican, incluida `20261101000000_convergence_hardening` (el trigger rechaza citas sin psicóloga activa asignada con SQLSTATE `23514`).
- Los escenarios del gate **no** finalizan todos en verde a la fecha de este documento: el gate esta en rojo por `T203` y `T204`, y `T205` lo hace no determinista al correrlo sin `--test-concurrency=1`, porque varios archivos instalan triggers globales sobre `audit_logs` y compiten por las mismas filas de una base compartida. Ver la nota de operacion en `tasks.md:636` y la evidencia en `docs/pruebas-panel.md`.
- Al terminar, retire el contenedor: `docker rm -f sda-pg-test`.

### 10. Worker de recordatorios (bajo demanda)

```bash
npm run reminders:worker --workspace backend
```

Ejecuta `dispatchDueReminders` al arrancar y repite cada 5 minutos. Requiere base de datos y credenciales de WhatsApp; aun no esta enlazado a ningun scheduler externo.

### 11. Worker de inbox WhatsApp (bajo demanda)

```bash
npm run whatsapp-inbox:worker --workspace backend
```

Procesa los eventos entrantes de WhatsApp persistidos en la bandeja durable al arrancar y repite cada 30 segundos. Requiere base de datos y credenciales de WhatsApp; en produccion se exige `ENABLE_WHATSAPP_INBOX_WORKER=true` (arranca junto con el backend) para que ningun webhook aceptado quede sin procesamiento.

## Limites de la fase

- `/api/v1/auth/login` es funcional y autentica únicamente la cuenta activa `admin` con rol `admin`; toda identidad distinta se rechaza y audita.
- `/api/v1/auth/me` y `/api/v1/auth/logout` requieren una cookie de sesion valida emitida por el login; la sesion expira por inactividad de 30 minutos.
- Las auditorías de denegacion incluyen `requestId`; la sesion se desliza en cada peticion autenticada y la cookie de `/auth/me` se renueva con opciones de sesion.
- La API administrativa responde `400 validation_error` para parametros de ruta no-UUID.
- La API responde en toda ruta con `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` y `Strict-Transport-Security: max-age=15552000`; el panel los replica desde `frontend/next.config.ts`. No hay `Content-Security-Policy`: queda abierta como `T216` porque sin despliegue no hay forma de validarla.
- El cuerpo JSON se limita a 1 MB y la cookie de sesion es `httpOnly`, `secure` en produccion, `sameSite: lax`, con `path` `/` y `maxAge` de 30 minutos.
- `/api/v1/admin` y `/api/v1/webhooks` responden `429 rate_limit_exceeded` al exceder su presupuesto por IP: 300 y 120 peticiones por minuto. El limite es por superficie, no global, para no penalizar el trafico interno de los workers; el rechazo queda en el log con `requestId`, metodo, ruta e IP, y no se escribe en `audit_logs`.
- El adaptador de WhatsApp simula envios fuera de produccion si faltan `WHATSAPP_ACCESS_TOKEN` o `WHATSAPP_PHONE_NUMBER_ID`; produccion exige ambas credenciales.
- La migración `20260911000000_therapist_session_rules` requiere PostgreSQL real con `btree_gist`; la migración de endurecimiento `20261101000000_convergence_hardening` refuerza la restricción a nivel de trigger. Ambas se verifican con el gate de la seccion 9.
- Las citas nuevas requieren una psicóloga asignada por `admin`; individual dura 60 minutos y pareja/familiar 90 minutos.
- La cancelación por WhatsApp exige un número registrado y nombre + fecha de nacimiento coincidentes; la petición incompleta o con identidad fallida se rechaza y audita (`appointment_cancellation_denied`) sin exponer datos.
- El recordatorio del dia previo se programa a las 18:00 `America/Mexico_City` y solo se envia en el dia calendario anterior a una cita aun futura (filas rezagadas se omiten). El destinatario grupal sin destino configurado se marca `omitido`.
- El worker de recordatorios arranca con el backend si `ENABLE_REMINDER_WORKER=true` o bajo demanda con `npm run reminders:worker`; su scheduler externo se decide en produccion.
- El worker de inbox WhatsApp se exige en produccion (`ENABLE_WHATSAPP_INBOX_WORKER=true`) para procesar todos los eventos aceptados del webhook; arranca con el backend o bajo demanda con `npm run whatsapp-inbox:worker`.
- El catalogo de FAQ de `US5` responde duracion de sesion, modalidades, formas de pago, anticipo del 50%, privacidad y recordatorios; las preguntas que la landing publica las contesta el catalogo, no el prompt de reserva.
- Las consultas de estado de cita y saldo (`payment_status`) exigen la misma verificacion de identidad que la cancelacion: numero registrado mas nombre y fecha de nacimiento coincidentes. Una consulta sin verificar se deniega, se audita (`sensitive_status_query_denied`) y se deriva a la psicologa, sin revelar si la cita existe.
- El texto de un mensaje entrante con contenido clinico o con la confirmacion de identidad se guarda como `admin_summary`. La excepcion son las intenciones `book` y `cancel`, cuyo texto se conserva para que la reserva y la cancelacion queden trazables.
- US3 permite registrar pagos, enviar recordatorios manuales y confirmar pagos desde `/admin/payments`. Los comprobantes de WhatsApp se reciben en una bandeja durable para asociacion manual, y las tarifas por tipo de sesion validan el anticipo del 50%. El catalogo de FAQ, los recordatorios, las consultas de estado y la landing publica estan implementados.
- Las pruebas unitarias de la ventana de recordatorios ya existen. Los E2E de agenda y pagos requieren `ADMIN_E2E_PASSWORD` y datos de prueba sembrados.
- La E2E de agenda incluye dos pruebas herméticas que no requieren ni clave ni PostgreSQL: mockean `auth/login`, `auth/me`, `directory` y `appointments`, y verifican la línea `Recordatorio: <estado> · <intentos>/3` en día y semana, su ausencia en mes y que la agenda no falle si la cita llega sin `reminders`. Para ejecutar todo el archivo hace falta `ADMIN_E2E_PASSWORD`; sin esa variable las tres pruebas de sesión real se omiten con `test.skip` y las herméticas corren igual.
- La E2E de pagos no es idempotente: registrar un segundo pago del mismo tipo sobre la misma cita devuelve `409 La cita ya tiene un pago validado de este tipo`, por lo que requiere una base recién sembrada.
- La landing publica vive en `/` y esta implementada y alineada al mockup aprobado; el acceso al panel es discreto y no la invade.
