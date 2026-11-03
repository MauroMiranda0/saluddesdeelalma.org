# Conexiones de base de datos — referencia vigente

La secuencia operativa de producción vive únicamente en
[DEPLOY_EXECUTION_GUIDE.md](./DEPLOY_EXECUTION_GUIDE.md). Este documento
reemplaza las instrucciones de bootstrap anteriores; no ejecutar comandos de
migración copiados de versiones históricas de esta guía.

| Uso | Variable | Conexión esperada |
|---|---|---|
| API, workers y Prisma Client | `DATABASE_URL` | Supabase transaction pooler, puerto 6543, `pgbouncer=true`. Se mantiene en el archivo externo de runtime. |
| `prisma migrate deploy` | `MIGRATION_DATABASE_URL` | Supabase session pooler, puerto 5432. Inyectada temporalmente al preflight/deploy; nunca guardada en el archivo de runtime. |

El esquema Prisma lee `DATABASE_URL`. El script de despliegue asigna
`MIGRATION_DATABASE_URL` solo al entorno del comando `prisma migrate deploy`,
sin cambiar ni imprimir la URL de runtime. El preflight valida ambos formatos
sin abrir conexiones. No usar `prisma db push` ni `prisma db pull`.

No ejecutar `prisma migrate deploy`, `migrate status` ni SQL como parte de una
validación local. Toda migración de producción requiere revisión y autorización
separadas.

Las instrucciones históricas de Supabase que detallan el acceso al dashboard
no forman parte de la secuencia automatizada; ver la guía operativa vigente
antes de cualquier operación.
