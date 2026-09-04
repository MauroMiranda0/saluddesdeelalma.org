# Decisiones Tecnicas

## 2026-09-03 - Monorepo con npm workspaces

**Contexto**

La Fase 1 exigia inicializar la estructura base del proyecto con `frontend/` y `backend/` en un repositorio vacio.

**Decision**

Se uso `npm` workspaces en la raiz para orquestar ambos workspaces sin agregar herramientas adicionales de monorepo.

**Alternativas consideradas**

- `pnpm` workspaces
- `turbo`
- repositorios separados para frontend y backend

**Consecuencias**

- Menor complejidad inicial.
- Un solo `package-lock.json` en la raiz.
- Los comandos compartidos viven en `package.json` del repositorio.

## 2026-09-03 - Configuracion de ESLint con flat config

**Contexto**

La Fase 1 pedia configurar linting para backend y frontend TypeScript desde el inicio.

**Decision**

Se implemento `eslint.config.js` con flat config y reglas separadas para archivos de backend, frontend y configuracion JavaScript.

**Alternativas consideradas**

- `.eslintrc.json`
- `.eslintrc.cjs`
- posponer ESLint hasta una fase posterior

**Consecuencias**

- La configuracion queda centralizada en un solo archivo.
- No fue necesario crear `.eslintignore` porque los `ignores` viven en el config.
- Hubo que excluir `@typescript-eslint/no-require-imports` para archivos de configuracion CommonJS.

## 2026-09-03 - Alcance minimo de dependencias en Fase 1

**Contexto**

El plan completo incluye Prisma, Tailwind, Vitest, Playwright y mas infraestructura, pero la instruccion de control de fases prohibe adelantar trabajo de fases posteriores.

**Decision**

Se instalaron solo las dependencias necesarias para cerrar la Fase 1: monorepo, TypeScript, Express, Next, React, ESLint y Prettier.

**Alternativas consideradas**

- Instalar todo el stack definido en `plan.md` desde la Fase 1
- Dejar solo archivos vacios sin dependencias reales

**Consecuencias**

- La Fase 1 se mantiene dentro del alcance aprobado.
- Los comandos documentados hoy son reales y verificables.
- Las dependencias de base de datos, testing y UI styling quedan para fases posteriores.

## 2026-09-04 - Dependencias fundacionales instaladas por fase

**Contexto**

La Fase 2 requirio backend funcional, Prisma, validacion, JWT, logging, CORS y shell frontend sin adelantar historias de usuario.

**Decision**

Se instalaron solo las dependencias necesarias para la infraestructura fundacional: `@prisma/client`, `prisma`, `zod`, `jose`, `pino`, `cors` y `@types/cors`. Las dependencias de pruebas, Tailwind, bcrypt y jobs quedan para las tareas donde se usen directamente.

**Alternativas consideradas**

- Instalar todo el stack listado en `plan.md` durante Fase 2.
- Mantener Fase 2 sin dependencias reales y usar placeholders.
- Instalar dependencias por historia de usuario conforme aparezcan pruebas e implementacion.

**Consecuencias**

- La fase queda verificable con build y typecheck reales.
- Se evita adelantar alcance de US1, US2 o pulido.
- Habra nuevas instalaciones controladas cuando se implementen pruebas, password hashing, cron jobs y UI styling.

## 2026-09-04 - Sesion administrativa con JWT renovado por actividad

**Contexto**

La especificacion exige expiracion administrativa tras 30 minutos de inactividad. La primera implementacion renovaba la sesion en BD, pero el `exp` del JWT seguia fijo.

**Decision**

El middleware de autenticacion valida la cookie, renueva `last_activity_at` y `expires_at` en `admin_sessions`, firma un nuevo JWT con la nueva expiracion y reescribe la cookie HttpOnly en cada request autenticado.

**Alternativas consideradas**

- Usar JWT con expiracion fija y depender solo de BD.
- Usar sesiones opacas sin JWT.
- Renovar solo la cookie sin renovar el token.

**Consecuencias**

- La expiracion cumple semantica de inactividad real.
- Cada request autenticado toca la tabla `admin_sessions`.
- El logout debe limpiar cookie con opciones separadas para no conservar `maxAge`.

## 2026-09-04 - Indices parciales manuales en migracion Prisma

**Contexto**

El modelo necesita impedir dobles reservas para citas activas y duplicados de pagos validados por tipo. Prisma no representa indices unicos parciales en `schema.prisma`.

**Decision**

Se agregaron indices unicos parciales directamente en `backend/prisma/migrations/20260904000000_initial/migration.sql` y se documentaron en `schema.prisma`.

**Alternativas consideradas**

- Dejar la restriccion solo en servicios de aplicacion.
- Usar indices unicos no parciales y limitar estados.
- Posponer la restriccion hasta historias de agenda y pagos.

**Consecuencias**

- PostgreSQL protege invariantes criticas aunque haya concurrencia.
- Futuras migraciones deben preservar manualmente esos indices.
- `schema.prisma` no muestra toda la semantica de unicidad por si solo.

## 2026-09-04 - CORS basico para frontend y backend separados

**Contexto**

El plan define frontend y backend separados, y el frontend usa `credentials: "include"` para cookies de sesion.

**Decision**

El backend habilita CORS con `credentials: true` y un origen configurable mediante `FRONTEND_ORIGIN`.

**Alternativas consideradas**

- No configurar CORS hasta implementar login real.
- Permitir todos los origenes.
- Resolver comunicacion solo mediante proxy del frontend.

**Consecuencias**

- El desarrollo local puede usar cookies entre `localhost:3000` y `localhost:4000`.
- Produccion debe confirmar dominio/origen antes de cerrar seguridad final.
- Si el despliegue queda cross-site real, habra que revisar `SameSite=None; Secure` y dominio de cookie.

## 2026-09-04 - Scripts raiz de ciclo de vida verificable

**Contexto**

Despues de Fase 2 ya existen backend y frontend compilables, por lo que la documentacion necesita comandos reales para validar, buildar, levantar y limpiar artefactos.

**Decision**

Se agregaron scripts raiz para `build`, `typecheck`, `prisma:validate`, `start:backend`, `start:frontend` y `clean:artifacts`, delegando en los workspaces.

**Alternativas consideradas**

- Documentar solo comandos por workspace.
- Mantener unicamente `dev:*` hasta historias de usuario.
- Crear una herramienta externa de orquestacion.

**Consecuencias**

- Los comandos documentados son cortos y verificables desde la raiz.
- `npm run build` genera artefactos ignorados que pueden limpiarse con `npm run clean:artifacts`.
- `start:*` requiere ejecutar build previamente.
