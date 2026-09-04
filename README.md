# saluddesdeelalma.org

## Estado actual

Este repositorio esta en cierre de la **Fase 2: Fundacional** del proyecto `001-sistema-gestion-consultorio`, despues de ejecutar convergencia y cerrar las remediaciones `T069` a `T077`.

En este punto existe:

- monorepo con `npm` workspaces
- workspace `backend/` con Express, Prisma, Zod, jose, pino y CORS
- workspace `frontend/` con Next.js y shell base de aplicacion
- configuracion base de ESLint y Prettier
- plantillas de variables de entorno
- bootstrap del backend en `backend/src/app.ts` y `backend/src/server.ts`
- rutas shell de health y auth en `/health`, `/api/v1/health` y `/api/v1/auth/*`
- Prisma schema base y migracion inicial para admin, pacientes, citas, pagos, recordatorios, chat y auditoria
- infraestructura de sesiones administrativas con JWT, cookie HttpOnly y expiracion por inactividad
- middleware de autenticacion, autorizacion admin y auditoria de denegaciones
- helpers frontend para API y sesion
- validadores Zod para paciente, cita, pago y chatbot

En este punto todavia no existe:

- login funcional con credenciales; `/api/v1/auth/login` es shell y devuelve `501` hasta `T028`
- flujos de agendamiento por WhatsApp de US1
- panel administrativo funcional de agenda/pagos
- landing publica funcional
- pruebas unitarias, de contrato, integracion o E2E

## Estructura actual

```text
.
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── config/
│   │   ├── lib/
│   │   ├── middleware/
│   │   └── modules/
│   └── tsconfig.json
├── frontend/
│   ├── .env.example
│   ├── app/
│   ├── lib/
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
├── docs/
├── specs/
├── .gitignore
├── .nvmrc
├── .prettierignore
├── eslint.config.js
├── package.json
└── prettier.config.js
```

## Comandos verificados

Instalar dependencias del monorepo:

```bash
npm install
```

Validar Prisma schema:

```bash
npm run prisma:validate
```

En entorno local, `prisma:validate` requiere `DATABASE_URL`. Se verifico con una URL PostgreSQL local de desarrollo.

Validar tipos:

```bash
npm run typecheck
```

Build completo:

```bash
npm run build
```

Levantar backend compilado:

```bash
npm run start:backend
```

Health check verificado:

```bash
curl http://localhost:4000/health
```

Levantar frontend compilado:

```bash
npm run start:frontend
```

Validar lint:

```bash
npm run lint
```

Validar formato:

```bash
npm run format:check
```

Limpiar artefactos generados:

```bash
npm run clean:artifacts
```

## Limitaciones actuales

- No hay `npm test` porque las pruebas empiezan en fases de historias de usuario y pulido.
- `npm run start:backend` requiere haber ejecutado `npm run build`.
- `npm run start:frontend` requiere haber ejecutado `npm run build`.
- El frontend arranca como shell, pero no tiene pagina publica ni panel funcional todavia.
- No se ha ejecutado `prisma migrate deploy/status` contra PostgreSQL real; solo se valido el schema localmente.

## Referencias

- especificacion: `specs/001-sistema-gestion-consultorio/spec.md`
- plan: `specs/001-sistema-gestion-consultorio/plan.md`
- tareas: `specs/001-sistema-gestion-consultorio/tasks.md`
- decisiones tecnicas: `docs/decisions.md`
