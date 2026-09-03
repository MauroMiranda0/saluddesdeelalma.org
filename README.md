# saluddesdeelalma.org

## Estado actual

Este repositorio esta en cierre de la **Fase 1: Preparacion** del proyecto `001-sistema-gestion-consultorio`.

En este commit existe:

- monorepo con `npm` workspaces
- workspace `backend/` inicializado
- workspace `frontend/` inicializado
- configuracion base de ESLint y Prettier
- plantillas de variables de entorno

En este commit todavia no existe:

- codigo de aplicacion en `backend/src/`
- codigo de interfaz en `frontend/app/`
- comandos funcionales de arranque del backend o frontend

## Estructura actual

```text
.
├── backend/
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── .env.example
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
├── specs/
├── .gitignore
├── .nvmrc
├── .prettierignore
├── eslint.config.js
├── package.json
└── prettier.config.js
```

## Comandos verificados en este commit

Instalar dependencias del monorepo:

```bash
npm install
```

Validar lint de la configuracion actual:

```bash
npm run lint
```

Validar formato de los archivos configurados:

```bash
npm run format:check
```

## Limitaciones actuales

- `npm run dev:backend` aun no aplica porque no existe `backend/src/server.ts`
- `npm run dev:frontend` aun no aplica porque no existe `frontend/app/`
- las rutas, modelos, vistas y tests funcionales se implementaran en fases posteriores

## Referencias

- especificacion: `specs/001-sistema-gestion-consultorio/spec.md`
- plan: `specs/001-sistema-gestion-consultorio/plan.md`
- tareas: `specs/001-sistema-gestion-consultorio/tasks.md`
- decisiones tecnicas: `docs/decisions.md`
