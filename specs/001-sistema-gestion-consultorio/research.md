# Research: Sistema de Gestion Integral del Consultorio

## Decision 1: Estructura del repositorio y package manager

- **Decision**: usar un unico repositorio con `npm` workspaces y dos aplicaciones hermanas: `frontend/` para Next.js y `backend/` para Express.
- **Rationale**: el repo esta vacio y la constitucion ya fija frontend y backend separados. `npm` workspaces reduce friccion inicial, evita requerir herramientas externas y permite compartir pipeline en un solo repo.
- **Alternatives considered**:
  - Una sola app Next.js con API routes: rechazada porque webhooks, cron, autenticacion y logica critica deben vivir en un backend propio y desacoplado.
  - Monorepo con `apps/` y `packages/shared/`: rechazada en MVP por complejidad prematura; no hay suficiente codigo comun aun.

## Decision 2: Versiones y librerias base

- **Decision**: Node.js 22 LTS, TypeScript 5.6+, Next.js 15, React 19, Tailwind CSS 4, Express 5, Prisma 6, PostgreSQL 16, Zod, `jose`, `bcrypt`, `pino`, `node-cron`, Vitest, Supertest, React Testing Library y Playwright.
- **Rationale**: son piezas estables y actuales para un proyecto web nuevo; alinean frontend, backend, ORM, validacion, testing y observabilidad con el stack obligatorio.
- **Alternatives considered**:
  - Node.js 20 LTS: valida, pero se prefiere 22 LTS al iniciar greenfield nuevo.
  - ORM distinto a Prisma: rechazado por conflicto con la constitucion.
  - Tailwind 3 o React 18: rechazados porque el proyecto inicia desde cero y conviene arrancar con versiones actuales del stack aprobado.

## Decision 3: Autenticacion y sesion administrativa

- **Decision**: usar JWT firmado en cookie `HttpOnly` segura, respaldado por tabla `admin_sessions` con `last_activity_at`, `expires_at` y `revoked_at` para imponer inactividad de 30 minutos.
- **Rationale**: JWT solo no modela bien la expiracion por inactividad ni la revocacion. La combinacion JWT + sesion persistida cumple la constitucion y facilita auditoria de accesos exitosos y fallidos.
- **Alternatives considered**:
  - JWT en `localStorage`: rechazado por mayor superficie de riesgo y peor alineacion con datos sensibles.
  - Sesion puramente server-side sin JWT: valida, pero la constitucion pide JWT + sesion.

## Decision 4: Orquestacion del chatbot

- **Decision**: implementar un flujo rule-first con intents acotados (`faq`, `availability`, `book`, `cancel`, `payment_info`, `payment_status`, `identity_check`, `handoff`) y dejar la IA como asistente subordinado para clasificar y redactar respuestas.
- **Rationale**: la agenda, pagos, cancelaciones, privacidad y derivacion clinica requieren control determinista. La IA no debe tener permiso para ejecutar acciones ni para improvisar respuestas clinicas.
- **Alternatives considered**:
  - Chatbot totalmente libre con LLM: rechazado por riesgo alto de desalineacion con tono, alcance y seguridad.
  - Chatbot 100% plantillas sin IA: posible, pero menos flexible para FAQ y reformulaciones naturales; se conserva como fallback cuando la IA no este disponible.

## Decision 5: Integracion con WhatsApp

- **Decision**: integrar inicialmente con WhatsApp Business Cloud API mediante un adaptador `WhatsAppGateway`, con verificacion de webhook y un servicio de envio desacoplado del dominio.
- **Rationale**: prioriza control directo, reduce lock-in y encaja con el backend propio en Hostinger. El adaptador permite sustituir el proveedor mas adelante si cambia la operacion.
- **Alternatives considered**:
  - Acoplar el dominio a Twilio/360dialog desde el inicio: rechazado por dependencia innecesaria en MVP.
  - Simular mensajeria solo con polling manual: rechazado porque no cubre recordatorios ni respuesta administrativa real.

## Decision 6: Disponibilidad, conflictos y recordatorios

- **Decision**: gestionar disponibilidad con validacion transaccional y una restriccion unica parcial para citas activas; programar en tabla propia dos recordatorios del día previo (paciente y Jocelyn) para las 18:00 de `America/Mexico_City`. El job se ejecuta cada 5 minutos, pero solo reclama, envía o reintenta entre 18:00:00 y 18:59:59, con reclamacion atomica y hasta 3 intentos dentro de esa ventana.
- **Rationale**: evita dobles reservas aun con concurrencia entre panel y chatbot, garantiza la política comercial de envío entre las 18:00 y las 19:00 y ofrece una estrategia simple de scheduler compatible con Hostinger. Persistir un registro por destinatario mantiene la trazabilidad aunque uno de los dos envíos falle.
- **Alternatives considered**:
  - Solo validacion en aplicacion sin restriccion en BD: rechazada porque no garantiza integridad bajo carrera.
  - Scheduler externo administrado: rechazado en MVP para no meter otra dependencia operativa.

## Decision 7: Modelo de pagos y comprobantes

- **Decision**: registrar pagos como eventos vinculados a una cita, con tipos `anticipo` y `completo`, estado de validacion y referencia segura opcional de comprobante.
- **Rationale**: el negocio necesita trazabilidad de montos y liquidaciones sin construir una pasarela ni un gestor documental completo. La referencia segura basta para validacion manual o semiautomatica.
- **Alternatives considered**:
  - Una sola columna de estado de pago en cita sin tabla de pagos: rechazada porque pierde historial y auditoria.
  - Modulo completo de archivos y documentos: rechazado por alcance MVP.

## Decision 8: Privacidad y almacenamiento de conversaciones

- **Decision**: almacenar conversaciones y mensajes con sanitizacion por defecto; cuando haya contenido clinico sensible, persistir solo un resumen administrativo breve y metadatos basicos.
- **Rationale**: reduce el riesgo de almacenar datos de salud innecesarios y sigue permitiendo continuidad operativa, auditoria y soporte.
- **Alternatives considered**:
  - Guardar payload completo siempre: rechazado por conflicto con la aclaracion funcional y el principio de minimizacion.
  - No guardar nada de conversaciones: rechazado porque afecta trazabilidad, soporte y seguimiento administrativo.

## Decision 9: Identidad administrativa y perfiles visibles

- **Decision**: modelar un directorio de usuarios con perfiles `admin`, `psicologo` y `paciente`, pero habilitar login de panel exclusivamente para la única cuenta activa con `username = 'admin'` y `role = 'admin'`. El middleware aplica autenticación seguida de validación de identidad antes de cualquier acceso Prisma.
- **Rationale**: permite a Jocelyn visualizar perfiles y preparar el crecimiento del directorio sin abrir datos sensibles ni crear una superficie de autorización incompleta en el MVP.
- **Alternatives considered**:
  - Permitir el acceso a cualquier perfil con rol administrativo: rechazado porque contradice el administrador único solicitado.
  - Supabase RLS como control actual: rechazado porque la constitución establece PostgreSQL privado detrás de Express y Prisma. RLS se evaluará únicamente si la arquitectura migra a Supabase.
