# Historial de desarrollo de “Salud desde el Alma”

> Documento derivado de la documentación del repositorio. Su objetivo es compartir
> el método de desarrollo utilizado: Spec-Driven Development con ciclos de
> convergencia y auditoría. No sustituye a `CONSTITUTION.md`, `spec.md`,
> `tasks.md` ni a `docs/decisions.md`; los resume y los ordena en el tiempo.

---

## 0. La idea central del método

El proyecto se desarrolló con un ciclo repetible de 8 pasos, apoyado en Spec-Kit
(`.specify/`, `specs/001-sistema-gestion-consultorio/`):

1. **Constitución** — reglas de mayor jerarquía (`CONSTITUTION.md`).
2. **Especificación** — el *qué* y el *porqué*, sin tecnología (`spec.md`).
3. **Clarificación** — preguntas cerradas que eliminan ambigüedad.
4. **Plan** — el *cómo* técnico, con gates de cumplimiento constitucional (`plan.md`).
5. **Investigación y diseño** — `research.md`, `data-model.md`, `contracts/api.yaml`, `quickstart.md`.
6. **Tareas** — desglose por historia de usuario, con rutas de archivo (`tasks.md`, T001–T220).
7. **Implementación por historia** — cada US se construye y se prueba de forma independiente.
8. **Convergencia / auditoría** — contrastar lo construido contra spec, plan, modelo de datos,
   constitución y pruebas; registrar hallazgos; remediar; repetir.

La regla que atraviesa todo: **nada se declara terminado por intención; se declara
terminado por evidencia**, y lo que queda en rojo se documenta en vez de esconderse.

---

## 1. Acto I — Fundación y especificación (28 ago – 3 sep 2026)

| Fecha | Hito | Evidencia |
|---|---|---|
| 28 ago | Primer commit; se ratifica la constitución y se crea la spec 001 | `24ae2c7`, `f2daaa9`, `2999ec6` |
| 2 sep | Revisión de spec v2, sesión de clarificación, plan de implementación | `a226c88`, `7ddccc4`, `c68cfce` |
| 3 sep | Desglose de tareas, análisis de coherencia, PR #1, monorepo | `d107a57`, `f0cd9dc`, `6912d74`, `d0757ad` |

**Qué se hizo bien aquí.** Antes de escribir código de negocio se fijaron:

- propósito, alcance del MVP y exclusiones explícitas (sin historial clínico, sin pasarela, sin multi-sucursal);
- identidad visual y paleta extraída del logo;
- arquitectura (Next.js + Express + PostgreSQL/Prisma + WhatsApp Cloud API);
- criterios de aceptación por fase y estándares de prueba;
- la personalidad del chatbot como especificación funcional reutilizable.

La `spec.md` se mantuvo **agnóstica de tecnología** y con criterios medibles
(SC-001 a SC-016). Eso permitió planear sin acoplar la solución.

---

## 2. Acto II — Infraestructura y primera convergencia (3–7 sep)

Se construyó el monorepo con `npm` workspaces, backend Express con
Prisma/Zod/jose/pino, frontend Next.js, ESLint flat config, Prettier y plantillas
de entorno (`docs/decisions.md`, 3 sep).

Inmediatamente se ejecutaron **tres vueltas de auditoría** sobre la fase
fundacional (`91bd799`, `1881eb4`, `734a059`). No se pasó a historias de usuario
hasta cerrar las brechas contra el plan y la constitución.

El **7 de septiembre** hubo la primera revisión con la cliente. De ahí salieron
reglas nuevas: perfiles de directorio sin login, una sola cuenta `admin`, pruebas
y actualización de dependencias por vulnerabilidades altas (`228cb16`).

> Lección del método: la primera validación con la usuaria cambió requisitos, y el
> cambio se reflejó en spec, modelo de datos, migraciones y pruebas, no solo en código.

---

## 3. Acto III — US1: agendar por WhatsApp (7–10 sep)

La historia P1 se implementó como flujo determinista:

- webhook verificado de WhatsApp;
- intents acotados;
- disponibilidad real por psicóloga;
- derivación clínica antes que reserva;
- transparencia si preguntan si es un bot;
- confirmación con política de cancelación de 24 h.

Se cerró con **dos convergencias de auditoría** (`c8d969b`, `c62ccc5`) y un
informe de avance honesto (`docs/avance-dia-10.md`), donde se dijo explícitamente
lo que aún **no** estaba listo.

---

## 4. Acto IV — Panel, reglas clínicas y pagos (11–16 sep)

Aquí el proyecto entra en su ritmo maduro: **implementar → auditar → remediar → documentar**.

- **11 sep:** perfiles clínicos, asignación paciente–psicóloga, sesiones de 60/90 min,
  exclusión de traslapes en PostgreSQL, recordatorios por destinatario (`0ecd572`,
  `166dc5d`). Se agregó US2: login admin, agenda, directorio (`6b44d3f`).
- **12 sep:** convergencia atómica de cita + auditoría, paleta oficial, aviso de
  cancelación, reagendar, redirect 401; recordatorios y worker transaccionales;
  cancelación por WhatsApp con verificación de identidad (`4107d42`, `263b0fa`, `87775ec`).
- **14–15 sep:** creación de pacientes desde el panel, horario flexible, confirmación
  con WhatsApp, pagos, bloqueo de traslapes, corrección de botones anidados (`c79ed69`).
  Se documenta la tercera vuelta manual del panel (`docs/pruebas-panel.md`) y se abre
  la auditoría T144–T164.
- **16 sep:** se cierra la convergencia, se ajusta el cronograma a 32 días y se
  planifica la alineación visual al mockup (`26edf1a`).

**Decisión clave de arquitectura:** las invariantes críticas viven también en la
base de datos (índices parciales, `EXCLUDE` con `btree_gist`, triggers), no solo en
la capa de aplicación. Así ninguna ruta nueva puede romper la agenda.

---

## 5. Acto V — Interfaz, landing y cierre de historias (17–30 sep)

- **17 sep:** landing pública y panel alineado al mockup (`84b23eb`).
- **19 sep:** adaptación al demo y restauración del dashboard (`dcdc749`).
- **22–23 sep:** liquidación de saldos, logo de marca, copy completo de la landing
  (`ead6662`, `8353288`, `d318727`).
- **25 sep:** rediseño conforme a `DESIGN.md`; se aprueba que el mockup guía identidad
  y jerarquía, **no** una réplica pixel a pixel (`9cfb0ae`, `88e226c`, `docs/pruebas-panel.md`).
- **26 sep:** cierre de US4 (recordatorios) con evidencia visual (`2edc729`).
- **30 sep:** cierre de US5 (FAQ y consulta de estado por WhatsApp) con verificación de
  identidad, texto de denegación idéntico para impedir enumeración de pacientes y
  auditoría minimizada (`3168838`, `5738dd3`).

En paralelo se endureció seguridad: `TRUST_PROXY`, comparación segura del token de
WhatsApp, headers y rate limiting (`b9758db`, `T066`, `T217–T220`).

---

## 6. Acto VI — Consolidación documental y honestidad de estado (3–7 oct)

El 3 de octubre se alineó la documentación con el estado real: **204 de 220 tareas
(92.7 %)**, seis historias cerradas y un inventario explícito de lo pendiente:

- UAT con la cliente nunca ejecutada;
- gate PostgreSQL en rojo (`T203`, `T204`, `T205`);
- CSP diferida (`T216`);
- conexión real a WhatsApp y destino de producción sin definir.

Ese inventario quedó en `CONSTITUTION.md` §8, `README.md`, `tasks.md` y
`docs/pruebas-panel.md`. **Documentar lo que falta fue tratado como parte del
entregable**, no como un fracaso.

---

## 7. Acto VII — Del producto al despliegue (31 oct – 7 nov)

El foco cambia de funcionalidad a operación:

- **31 oct:** plan y auditoría de despliegue, variables de producción, checklist de
  Hostinger, PM2, scripts `deploy.sh` / `rollback.sh` (`db3a4db`, `c21dd7a`, `08e1b02`).
- **2 nov:** giro a Supabase. Se crean 12 migraciones SQL de referencia, se alinea
  Prisma con **Supabase Auth** (login por email, sin `password_hash`), se prepara el
  piloto y se endurece la autorización del panel (`4f552bf`…`0a772cc`,
  `docs/AUTH_SUPABASE_ALIGNMENT.md`).
- **3 nov:** validación local aislada del piloto; se documentan bloqueos reales
  (`FASE4_LOCAL_PILOT_VALIDATION.md`).
- **4 nov:** recuperación segura del acceso admin y aprovisionamiento parametrizado
  (`docs/FASE5_ADMIN_PROVISIONING.md`).
- **5 nov:** auditoría RLS/Storage: **hallazgo crítico** — las 15 tablas de `public`
  eran legibles por `anon`, RLS deshabilitado y Prisma como `postgres` con
  `BYPASSRLS` (`docs/FASE5B_RLS_STORAGE_REVIEW.md`). Se ejecuta el lockdown de Data
  API y grants, se verifica y se registra el riesgo residual
  (`docs/FASE5C_LOCKDOWN.md`).
- **5–6 nov:** piloto Hostinger con datos ficticios, kill switch de WhatsApp, health
  checks y smoke tests (`docs/FASE6_DEPLOY_PILOT.md`, `docs/SMOKE_TEST_REPORT.md`).
- **7 nov:** adaptación experimental a hosting compartido de un solo proceso y
  protección de staging (`649d61d`, `b8a7993`, `a7459f2`).

> Aquí el método muestra su valor: la auditoría de RLS **detuvo** un piloto con datos
> reales. Primero se bloqueó la exposición, luego se documentó el riesgo residual y
> solo después se avanzó.

---

## 8. Las decisiones que explican el método

| Decisión | Por qué se tomó | Dónde está |
|---|---|---|
| Monorepo con `npm` workspaces | Menor complejidad inicial, un solo lockfile | `docs/decisions.md` |
| Backend propio, no BaaS | Control de webhooks, cron, auth y auditoría | `specs/.../plan.md` |
| Chatbot *rule-first*, IA acotada | La IA no ejecuta acciones críticas ni improvisa clínica | `specs/.../research.md` |
| Integridad en PostgreSQL | Evita dobles reservas incluso bajo concurrencia | migraciones, `docs/decisions.md` |
| Sesión admin con JWT + tabla `admin_sessions` | Expiración real por inactividad y revocación | `docs/decisions.md` |
| Verificación de identidad reutilizable | Cancelación y consulta de estado usan la misma superficie | `docs/decisions.md` |
| Texto de denegación idéntico | Evita enumeración de pacientes | `docs/decisions.md` |
| RLS y lockdown de Data API | La base no debe ser accesible desde fuera del backend | `docs/FASE5B_RLS_STORAGE_REVIEW.md`, `docs/FASE5C_LOCKDOWN.md` |
| Migraciones *forward-only* | El rollback restaura código, no esquema | `DEPLOY_EXECUTION_GUIDE.md` |

---

## 9. Evidencia del método, no solo narrativa

- **220 tareas** planificadas y rastreadas; **204 cerradas** al 3 oct, con las 16
  abiertas nombradas una por una.
- **40 fases de convergencia** además de las fases de producto: el proyecto auditó su
  propio avance una y otra vez.
- **Pruebas por capas:** contrato HTTP, integración, unitarias, componentes, E2E móvil
  con Playwright y gate opt-in contra PostgreSQL 16 real.
- **Gates explícitos:** `RUN_POSTGRES_INTEGRATION`, `WHATSAPP_OUTBOUND_ENABLED=false`,
  preflight de despliegue y criterios de aborto.
- **Documentos históricos marcados como históricos**, sin reescribir decisiones
  pasadas; las supersesiones se registran como entradas nuevas (`docs/decisions.md`, 3 oct).
- **Riesgos residuales publicados:** 188 funciones de `btree_gist`, default ACL de
  `supabase_admin`, CSP pendiente, gate en rojo, UAT no ejecutada.

---

## 10. Cómo replicar este método (versión corta)

1. Escribe una **constitución** antes del código: propósito, stack, seguridad,
   calidad, identidad.
2. Escribe la **spec** sin tecnología, con escenarios de aceptación y criterios medibles.
3. Haz **clarificación** con preguntas cerradas; registra cada respuesta con fecha.
4. Haz el **plan** técnico y verifícalo contra la constitución (gates PASS/FAIL).
5. Produce **research, modelo de datos, contratos y quickstart** antes de implementar.
6. Desglosa en **tareas por historia de usuario**, con rutas de archivo y dependencias.
7. Implementa una historia a la vez y pruébala de forma independiente.
8. Ejecuta **convergencias**: compara código, pruebas y docs contra
   spec/plan/constitución; remedia; repite.
9. Documenta **decisiones y desviaciones** en el momento, no al final.
10. Antes de desplegar, haz **auditoría de seguridad y validación aislada**; si algo
    está en rojo, se detiene y se documenta.
11. Declara el estado real, incluido lo que falta. La confianza se construye con
    evidencia, no con optimismo.

---

**En una frase:** este proyecto no se desarrolló “escribiendo features”, sino
**gobernando un sistema de decisiones verificables** —constitución → spec → plan →
tareas → implementación → convergencia → despliegue— y dejando por escrito, con
fecha y evidencia, tanto lo logrado como lo pendiente.

---

## Fuentes principales

- `CONSTITUTION.md`
- `README.md`
- `specs/001-sistema-gestion-consultorio/{spec,plan,research,data-model,tasks}.md`
- `docs/decisions.md`
- `docs/avance-dia-10.md`, `docs/avance-dia-17.md`, `docs/pruebas-panel.md`
- `docs/AUTH_SUPABASE_ALIGNMENT.md`
- `docs/FASE5B_RLS_STORAGE_REVIEW.md`, `docs/FASE5C_LOCKDOWN.md`
- `docs/FASE6_DEPLOY_PILOT.md`, `docs/SMOKE_TEST_REPORT.md`
- `FASE4_LOCAL_PILOT_VALIDATION.md`, `DEPLOY_EXECUTION_GUIDE.md`
- Historial de commits (`git log --reverse`)
