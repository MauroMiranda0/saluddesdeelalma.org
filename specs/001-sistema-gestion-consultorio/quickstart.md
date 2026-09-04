# Quickstart: Sistema de Gestion Integral del Consultorio

## Estado actual

Esta guia refleja lo que existe al cierre de la **Fase 2: Fundacional**, despues de convergencia y remediaciones `T069` a `T077`.

El repositorio ya tiene backend Express compilable, schema y migracion inicial de Prisma, infraestructura de sesiones/auditoria, shell frontend de Next.js y comandos de validacion/build. Las historias funcionales de agendamiento, panel, pagos, recordatorios, chatbot y landing aun no estan implementadas.

## Prerrequisitos verificados para esta fase

- Node.js 22 LTS o superior
- npm 10+
- PostgreSQL 16 para migraciones reales

## Variables de entorno disponibles hoy

### Backend

Archivo: `backend/.env.example`

- `NODE_ENV`
- `PORT`
- `API_PREFIX`
- `FRONTEND_ORIGIN`
- `DATABASE_URL`
- `JWT_SECRET`
- `SESSION_COOKIE_NAME`
- `SESSION_IDLE_TIMEOUT_MINUTES`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `AI_PROVIDER_API_KEY`

### Frontend

Archivo: `frontend/.env.example`

- `NEXT_PUBLIC_API_BASE_URL`

## Instalacion

```bash
npm install
```

## Validacion disponible en Fase 2

### 1. Validar Prisma schema

```bash
npm run prisma:validate
```

Resultado esperado:

- Prisma confirma que `backend/prisma/schema.prisma` es valido.
- En local se requiere `DATABASE_URL`; la validacion se verifico con una URL PostgreSQL local de desarrollo.

### 2. Validar tipos

```bash
npm run typecheck
```

Resultado esperado:

- TypeScript valida backend y frontend sin errores.

### 3. Build completo

```bash
npm run build
```

Resultado esperado:

- Prisma Client se genera correctamente.
- Backend compila a `backend/dist/`.
- Frontend compila a `frontend/.next/`.

### 4. Levantar backend compilado

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

### 5. Levantar frontend compilado

```bash
npm run start:frontend
```

Resultado esperado:

- Next.js inicia en `http://localhost:3000`.
- La aplicacion aun es shell; las paginas funcionales se implementan en fases posteriores.

### 6. Validar lint

```bash
npm run lint
```

Resultado esperado:

- ESLint finaliza sin errores.

### 7. Validar formato

```bash
npm run format:check
```

Resultado esperado:

- Prettier confirma que los archivos configurados cumplen el estilo esperado.

### 8. Limpiar artefactos generados

```bash
npm run clean:artifacts
```

Resultado esperado:

- Se eliminan `backend/dist/`, `frontend/.next/` y `frontend/tsconfig.tsbuildinfo` si existen.

## Limites de esta fase

- `/api/v1/auth/login` existe solo como shell y devuelve `501`; la implementacion real corresponde a `T028`.
- `/api/v1/auth/me` y `/api/v1/auth/logout` requieren una cookie de sesion valida, que se emitira cuando exista login funcional.
- No hay pruebas automatizadas todavia; se agregaran en fases de historias de usuario y pulido.
- No se ha ejecutado una migracion contra PostgreSQL real desde esta guia.
- La landing publica, el panel administrativo y los flujos de WhatsApp no forman parte de Fase 2.
