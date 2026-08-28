<!--
  Sync Impact Report
  ----------------------------------------------------------------
  Version change: (sin ratificar / scaffold) → 1.0.0
  Principios modificados: N/A (ratificación inicial, sustituye el scaffold)
  Secciones añadidas: Core Principles (5), Technical Architecture & Security,
    Development Workflow & Quality Gates, Governance
  Secciones eliminadas: N/A
  TODOs diferidos: ninguno
-->

# Salud desde el Alma Constitution

Documento de gobernanza de Spec Kit. La fuente de verdad de largo aliento del proyecto es
`CONSTITUTION.md` en la raíz; esta constitución fija los principios operativos no negociables que
todo comando, agente y cambio del ciclo deben respetar.

## Core Principles

### I. Mobile-First, Calm UX
- El dispositivo principal de la cliente es el móvil: toda pantalla (landing y panel) se diseña
  primero para móvil y luego escala a tablet/desktop.
- Diseño minimalista, accesible (WCAG AA: contraste, tipografía legible, zonas táctiles cómodas)
  y sereno: espacios amplios, bordes suaves, micro-interacciones tranquilas.
- La apariencia debe ceñirse a la paleta oficial verde/sepia (Verde armonía `#6B8F71`, Verde
  profundo `#3C5A44`, Sepia cálido `#A67C52`, Beige arena `#D9CBB3`, Dorado tenue `#C2A878`)
  con el uso recomendado definido en §2.2 del CONSTITUTION.md.
- Cada pantalla cumple una función clara; un solo color de acento por tarea principal.

### II. Control & Security First
- Se prohíbe depender de un BaaS para funciones críticas: el backend es propio
  (Node.js + Express.js) con control total de la lógica de negocio e integraciones.
- Autenticación mediante middleware propio (JWT + sesión con expiración) en todas las rutas del
  panel y de la API; control de accesos por rol en la lógica de la aplicación.
- SSL/TLS obligatorio en toda comunicación; secretos exclusivamente en variables de entorno,
  jamás en el repositorio.
- Base de datos PostgreSQL alojada en Hostinger, gestionada con Prisma (migraciones seguras y
  consistentes). Racional del principio: evolución hacia reportes clínicos avanzados y auditoría
  de datos sensibles sin limitaciones de un proveedor externo.

### III. Data Privacy & Auditability
- Los datos de salud son sensibles: se tratan con confidencialidad y acceso restringido,
  conforme a la normativa mexicana aplicable (LFPDPPP) y mejores prácticas.
- Toda acción crítica (accesos, citas, pagos, cancelaciones) DEBE quedar registrada en la tabla
  `audit_logs` como base para auditorías futuras.
- El control de acceso es por capas (autenticación JWT + validación por rol); se debe poder
  demostrar quién accedió a qué y cuándo.

### IV. Test & Quality Gates
- Ninguna fase se considera cerrada sin cumplir su criterio de aceptación (§6.4 del
  CONSTITUTION.md). El cerrado de fase es un gate, no una sugerencia.
- Pruebas unitarias de la lógica de negocio (montos, validaciones de agendamiento, reglas del
  chatbot); pruebas de integración sobre backend Node + PostgreSQL/Prisma + webhooks de WhatsApp;
  UAT con la usuaria desde su móvil; pruebas de seguridad (JWT, control de accesos, SSL, secretos).
- `main` solo recibe cambios probados de `develop`; toda integración se hace por Pull Request.

### V. Chatbot Persona as Specification
- La identidad y conducta del chatbot (apéndice completo en CONSTITUTION.md §7) es especificación
  obligatoria, no sugerencia: tono cálido y breve, español mexicano, formalidad media con
  "usted", emojis ocasionales, nunca menús mecánicos.
- El chatbot NO diagnostica, NO interpreta síntomas, NO recomienda medicamentos ni suplanta el
  criterio de la psicóloga: deriva los temas clínicos a la psicóloga.
- Es transparente si le preguntan si es un sistema automatizado; jamás se hace pasar por la
  psicóloga ni inventa experiencias humanas.
- Cuando no haya disponibilidad ofrece alternativas concretas; en cancelaciones no genera culpa.

## Technical Architecture & Security

Stack obligatorio (alineado a CONSTITUTION.md §3):

- **Frontend:** Next.js (React) + TypeScript + Tailwind CSS.
- **Backend:** Node.js + Express.js alojado en Hostinger; incluye lógica de negocio, webhooks de
  WhatsApp, tareas programadas (cron) de recordatorios y servido del panel administrativo.
- **Base de datos:** PostgreSQL en Hostinger; esquema versionado con Prisma.
- **Chatbot:** WhatsApp Business Cloud API (Meta) + proveedor de mensajería + capa de IA
  conversacional.
- **Pagos sin pasarela:** registro directo en BD vinculado a la cita (anticipo opcional 50% y
  pago completo el día de la sesión); la validación del comprobante es manual/semiautomática.
  Pasarela (Stripe/OpenPay) es expansión futura y requiere enmienda.
- **Seguridad:** SSL/TLS, middleware JWT, control de accesos por rol, registros de auditoría,
  secretos en entorno, cumplimiento LFPDPPP para datos de salud.

Racional: control total, independencia de proveedores, escalabilidad ordenada hacia reportes
clínicos y auditoría sin las limitaciones de un BaaS.

## Development Workflow & Quality Gates

- Repositorio único en Git (GitHub): ramas `main` (siempre desplegable), `develop` y
  `feature/<descripcion>`; integración vía Pull Request con autorevisión y revisión cruzada.
- Definición de terminado (DoD): build sin errores, lint y tests pasando, sin secretos ni código
  muerto, criterio de aceptación de fase cumplido (§6.4 CONSTITUTION.md).
- Tipos de prueba: unitarias → integración → UAT → seguridad. Cada fase del plan de 29 días
  (CONSTITUTION.md §8) exige su gate antes de avanzar.
- Toda enmienda de stack, paleta, alcance, fechas o conducta del chatbot debe actualizar primero
  el CONSTITUTION.md y esta constitución antes de implementarse.

## Governance

- Esta constitución y el `CONSTITUTION.md` raíz prevalecen sobre cualquier práctica o decisión
  puntual que los contradiga; todo comando, PR y entregable DEBE verificar su cumplimiento.
- Enmienda de constitución: documentar el cambio, justificar el bump de versión (semántico:
  MAJOR para reformulaciones de principios, MINOR para principios/secciones nuevos, PATCH para
  aclaraciones) y registrar un plan de cumplimiento antes de aplicar.
- Revisión de cumplimiento: se verifica en cada cierre de fase y en cada PR (complexity must be
  justified; cambios fuera de gobierno se rechazan).
- Fechas y versiones: `CONSTITUTION_VERSION` semántico; `RATIFICATION_DATE` fija la adopción;
  `LAST_AMENDED_DATE` se actualiza con cada cambio.
- El long-form canonical del proyecto es `CONSTITUTION.md` en la raíz; cualquier conflicto entre
  documentos se resuelve a favor del CONSTITUTION.md raíz, el cual es la referencia de detalle
  para las decisiones técnicas y de diseño.

**Version**: 1.0.0 | **Ratified**: 2026-08-28 | **Last Amended**: 2026-08-28