# Quickstart: Sistema de Gestion Integral del Consultorio

## Objetivo

Validar localmente el MVP de agenda, pagos, recordatorios, landing y chatbot administrativo antes de avanzar a implementacion completa.

## Prerrequisitos

- Node.js 22 LTS
- npm 10+
- PostgreSQL 16 local
- Variables de entorno para backend y frontend
- Credenciales de sandbox o pruebas para WhatsApp Business Cloud API

## Variables de entorno minimas

### Backend

- `DATABASE_URL`
- `JWT_SECRET`
- `SESSION_COOKIE_NAME=sda_admin_session`
- `SESSION_IDLE_TIMEOUT_MINUTES=30`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `AI_PROVIDER_API_KEY` (si se habilita IA)

### Frontend

- `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`

## Comandos esperados

```bash
npm install
npm run prisma:migrate --workspace backend
npm run dev --workspace backend
npm run dev --workspace frontend
```

## Escenarios de validacion

### 1. Login administrativo

1. Abrir `http://localhost:3000/admin/login`.
2. Ingresar credenciales validas.
3. Verificar que el frontend redirige a la agenda y que el backend crea sesion activa.

Resultado esperado:

- Se establece cookie segura de sesion.
- `GET /api/v1/auth/me` devuelve usuario admin y expiracion.
- Se registra `login_success` en auditoria.

### 2. Crear cita manual desde panel

1. Desde la agenda, crear paciente nuevo con nombre, WhatsApp y fecha de nacimiento.
2. Seleccionar horario regular disponible.
3. Guardar la cita.

Resultado esperado:

- La cita aparece en la agenda del dia.
- Se impide elegir un horario ya ocupado.
- Se crea recordatorio de confirmacion y, si aplica, uno de 24 horas.

### 3. Cancelar cita desde panel

1. Abrir una cita existente.
2. Cancelarla con razon administrativa breve.

Resultado esperado:

- La cita cambia a `cancelada`.
- Se genera evento de auditoria.
- Se programa o envia aviso de cancelacion por WhatsApp.

### 4. Registrar anticipo y pago completo

1. Sobre una cita activa, registrar un anticipo de 50%.
2. Confirmar que el estado visible cambia a `anticipo`.
3. Registrar el pago completo el dia de la sesion.

Resultado esperado:

- La cita refleja `completado` al final del flujo.
- El historial de pagos conserva ambos eventos.
- El registro tarda menos de 30 segundos en prueba manual movil.

### 5. Flujo de WhatsApp: agendamiento

1. Enviar mensaje entrante simulado o real al webhook de WhatsApp.
2. Pedir cita dentro de horario regular.
3. Confirmar modalidad y horario.

Resultado esperado:

- El backend ofrece horarios reales.
- Se crea o reutiliza paciente.
- Se registra cita, confirmacion y auditoria.

### 6. Flujo de WhatsApp: consulta de cita o pago

1. Enviar mensaje desde numero registrado preguntando por la cita o saldo.
2. Responder correctamente nombre y fecha de nacimiento.

Resultado esperado:

- El sistema muestra solo informacion administrativa del propio paciente.
- Si la verificacion falla, no expone datos y deriva a la psicologa.

### 7. Recordatorios automáticos

1. Crear una cita con recordatorio pendiente.
2. Ejecutar manualmente el job de recordatorios o esperar la ventana programada.

Resultado esperado:

- El recordatorio pasa de `pendiente` a `enviado` o `fallido` con detalle.
- Los reintentos quedan trazados y no se duplican envios.

### 8. Expiracion de sesion

1. Iniciar sesion en el panel.
2. Esperar 30 minutos sin actividad o simular el vencimiento.
3. Intentar navegar o ejecutar una accion.

Resultado esperado:

- El backend rechaza la sesion.
- El frontend redirige a login.
- Se audita el acceso con sesion expirada si aplica.

## Suite de pruebas esperada

```bash
npm run test --workspace backend
npm run test:contract --workspace backend
npm run test:integration --workspace backend
npm run test --workspace frontend
npm run test:e2e --workspace frontend
```

## Criterios de salida para pasar a tasks

- Sin ambiguedades abiertas en `plan.md`
- Contratos HTTP definidos
- Modelo de datos alineado con spec y constitucion
- Escenarios de validacion cubren agenda, pagos, recordatorios, seguridad y WhatsApp
