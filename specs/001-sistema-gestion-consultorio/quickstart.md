# Quickstart: Sistema de Gestion Integral del Consultorio

## Estado actual

Esta guia refleja el cierre de la **Fase 3: Historia de Usuario 1 - Agendar una cita por WhatsApp**, despues de convergencia y remediaciones `T091` a `T095`.

El repositorio tiene backend Express compilable, schema y migraciones de Prisma, infraestructura de sesiones/auditoria, shell frontend de Next.js y el flujo de agendamiento por WhatsApp. El webhook valida la suscripcion de Meta, procesa mensajes de texto de forma asincrona y puede ofrecer horarios, crear una cita, enviar la confirmacion inmediata, derivar temas clinicos y declarar que es un asistente digital.

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
- `REMINDER_TIMEZONE` (requerida al implementar Fase comercial 4; valor de producción: `America/Mexico_City`)
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_PSYCHOLOGISTS_GROUP_ID` (destino interno; requiere proveedor compatible con grupos)
- `AI_PROVIDER_API_KEY`

### Frontend

Archivo: `frontend/.env.example`

- `NEXT_PUBLIC_API_BASE_URL`

## Instalacion

```bash
npm install
```

## Validacion disponible en Fase 3

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

### 3. Ejecutar pruebas de contrato e integracion

```bash
npm run test --workspace backend
```

Resultado esperado:

- El webhook valida el challenge de Meta y acepta eventos de mensajes.
- El flujo de agendamiento valida tipo/duración de sesión, horario de inicio y fin, derivacion clinica, transparencia y la confirmacion obligatoria.
- Se verifican la orquestacion de cita, confirmacion y auditoria, ademas de las migraciones inicial y de reglas de negocio en PostgreSQL embebido.
- La base de datos rechaza un segundo `admin` y habilitar el login de panel a un perfil de directorio.

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
- La ruta publica responde `404` porque la landing se implementara en US6.

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

## Limites de esta fase

- `/api/v1/auth/login` existe solo como shell y devuelve `501`; la implementacion real corresponde a `T028`.
- `/api/v1/auth/me` y `/api/v1/auth/logout` requieren una cookie de sesion valida, que se emitira cuando exista login funcional.
- El adaptador de WhatsApp simula envios fuera de produccion si faltan `WHATSAPP_ACCESS_TOKEN` o `WHATSAPP_PHONE_NUMBER_ID`; produccion exige ambas credenciales.
- La migración `20260911000000_therapist_session_rules` requiere PostgreSQL real con `btree_gist`; debe ejecutarse y validar el soporte del destino grupal antes de producción.
- Las citas nuevas requieren una psicóloga asignada por `admin`; individual dura 60 minutos y pareja/familiar 90 minutos.
- El panel administrativo, las cancelaciones, pagos, recordatorios del dia previo, FAQ y consultas de estado siguen pendientes de sus historias correspondientes.
- Las pruebas unitarias y E2E se agregan en fases posteriores.
- No se ha ejecutado una migracion contra PostgreSQL real desde esta guia.
- La landing publica y el panel administrativo no forman parte de esta fase.
