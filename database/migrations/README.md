# SQL manual de Supabase: referencia, no migraciones Prisma

Estos archivos son scripts manuales independientes, no una secuencia
automatizada ni parte de `prisma migrate deploy`. **No ejecutarlos en bloque ni
aplicarlos a ciegas**: fueron escritos para una fase anterior y algunos
presuponen objetos, políticas o privilegios que pueden no coincidir con una
instalación actual.

La fuente de verdad del esquema de aplicación es
[`backend/prisma/migrations/`](../../backend/prisma/migrations/). El modelo
vigente conserva `public.users.id` como UUID interno y permite el vínculo
nullable `auth_user_id` con `auth.users(id) ON DELETE SET NULL`.

## Archivos manuales y límites

- `init_extensions.sql`, `enums.sql`, `appointments_session_rates.sql`,
  `payments_payment_proofs.sql`, `profiles_sessions_audit.sql`,
  `reminders_chat.sql`, `whatsapp_events.sql` y `validations_triggers.sql`:
  material histórico de bootstrap; revisar estado y dependencias antes de
  considerar cualquier uso aislado.
- `users_auth.sql`: retirado y deliberadamente no ejecutable. La versión vieja
  vinculaba los IDs y borraba usuarios de dominio en cascada, además de crear
  usuarios desde metadata Auth.
- `rls_policies.sql`: referencia revisada para que el acceso propio relacione
  mediante `auth_user_id`, que no conceda `UPDATE` a usuarios propios y que
  limite lectura de auditoría a administradores enlazados, activos y con
  acceso al panel. No confía en un claim `admin` del JWT para otorgar permisos.
  No se ha aplicado ni probado en PostgreSQL/Supabase; revisar nombres de
  políticas, grants y existencia de tablas antes de cualquier uso.
- `storage_payment_proofs.sql`: solicita el bucket `payment_proofs` como
  privado; sus políticas están comentadas y no habilitan carga/descarga. El
  backend actual no implementa acceso a Storage ni entrega URLs firmadas o
  permanentes.

## RLS y rol de Prisma

Las políticas de este directorio no sustituyen autorización del API. La
conexión Prisma usa `DATABASE_URL` con el usuario de base configurado para
runtime; si ese rol es propietario/`BYPASSRLS`, PostgreSQL no aplica RLS como
frontera frente al backend. Las rutas administrativas deben seguir validando
la sesión en el API. `SUPABASE_ANON_KEY` se usa únicamente para el endpoint
Supabase Auth de contraseña; no se usa como credencial de acceso a tablas. No
se encontró una clave `service_role` en el código de backend revisado.

No se ejecutaron scripts SQL ni se probaron políticas sobre una base local
aislada. Verificar RLS, grants, el FK opcional y el bucket en un proyecto
Supabase aislado antes de cualquier piloto con datos reales.
