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
