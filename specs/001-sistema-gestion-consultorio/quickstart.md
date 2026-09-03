# Quickstart: Sistema de Gestion Integral del Consultorio

## Estado actual

Esta guia refleja solo lo que existe al cierre de la **Fase 1: Preparacion**.

En este commit hay configuracion de monorepo, workspaces, lint, formato y plantillas de entorno. Aun no existe codigo funcional de backend o frontend para levantar la aplicacion.

## Prerrequisitos verificados para esta fase

- Node.js 22 LTS
- npm 10+

## Variables de entorno disponibles hoy

### Backend

Archivo: `backend/.env.example`

- `PORT`
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

## Comandos verificados en este commit

Instalar dependencias:

```bash
npm install
```

Validar lint de la configuracion base:

```bash
npm run lint
```

Validar formato de la configuracion base:

```bash
npm run format:check
```

## Validacion disponible en la Fase 1

### 1. Instalacion del monorepo

1. Ejecutar `npm install` en la raiz.

Resultado esperado:

- Se resuelven dependencias para `backend` y `frontend`.
- Se crea `package-lock.json` en la raiz.

### 2. Lint de configuracion

1. Ejecutar `npm run lint`.

Resultado esperado:

- ESLint finaliza sin errores sobre la configuracion existente.

### 3. Formato de configuracion

1. Ejecutar `npm run format:check`.

Resultado esperado:

- Prettier confirma que los archivos configurados cumplen el estilo esperado.

## Limites de esta fase

- No existe `backend/src/server.ts`, por lo que aun no hay comando de arranque del backend.
- No existe `frontend/app/`, por lo que aun no hay comando de arranque del frontend.
- No hay tests de dominio, integracion o E2E implementados todavia.

## Proxima actualizacion de esta guia

Esta guia se ampliara al cierre de la siguiente fase implementada, con comandos y validaciones solo cuando existan realmente en el codigo.
