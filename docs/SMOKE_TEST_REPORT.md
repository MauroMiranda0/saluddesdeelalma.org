# Reporte de smoke tests locales — Fase 6

**Fecha de ejecución registrada:** 2026-11-06 UTC (2026-11-05 en UTC−06:00)
**Rama:** `feature/fase6-local-smoke-tests`
**SHA base probado:** `7f6292bfdd5404b18ca8535bbc3437a4fe76abdf`

**Alcance:** pruebas locales sobre el árbol de trabajo derivado de ese commit. No se contactaron Hostinger, Supabase, Meta ni otros servicios remotos.

## Resultados por área

| Área | Resultado | Tipo de verificación y evidencia | Límites |
|---|---|---|---|
| Home | Aprobado | El smoke test inicia Next.js en `127.0.0.1` con puerto local dinámico y verifica HTTP 200, HTML y el título de marca. Usa una copia temporal de archivos frontend versionados; excluye archivos `.env*`. | No comprueba DNS, SSL, CDN ni disponibilidad pública. |
| Login | Aprobado | Usuario administrador completamente sintético. El login, `/api/v1/auth/me` y logout recorren HTTP local; se valida cookie `HttpOnly`, sesión accesible y respuesta 401 tras logout. Autenticación, persistencia y revocación están simuladas en memoria; no se usa Auth remoto. | No valida credenciales reales ni persistencia en PostgreSQL. |
| API / salud | Aprobado | `/health` mantiene liveness liviano. `/api/v1/health` devuelve readiness saludable con la dependencia DB simulada y 503 opaco cuando falla. Reutiliza `backend/tests/contract/health.contract.test.ts`. | Las respuestas de health en este smoke usan mocks; no prueban una instancia desplegada. |
| Base de datos | Parcial / simulada | El contrato de readiness prueba los dos estados mediante mock de Prisma. La prueba opcional con Prisma ejecutaría `SELECT 1` únicamente con `SMOKE_DATABASE_URL` válido. | No se configuró una base PostgreSQL local desechable; por ello, no se ejecutó conexión Prisma real y la prueba opcional quedó omitida. No se usó ninguna base remota. |
| Webhook | Aprobado | Servidor backend local; payload ficticio con firma HMAC sintética válida aceptado y firma ausente/inválida o payload alterado rechazado. Reutiliza `backend/tests/contract/whatsapp-webhook.contract.test.ts`. | No se registra el webhook en Meta ni se comprueba entrega de eventos a servicios externos. |
| WhatsApp saliente | Aprobado | El runner fija `WHATSAPP_OUTBOUND_ENABLED=false`. Con credenciales sintéticas y `fetch` espía, se verifica que no haya llamada HTTP; en outbox, el evento permanece pendiente, no se marca enviado ni consume intentos. Se reutilizan además las pruebas existentes de gateway y outbox. | No se contactó Meta ni se probaron credenciales reales. |

## Comandos y resultados

| Comando | Resultado |
|---|---|
| `npm run smoke:test` | **Aprobado:** 20 pruebas; 19 aprobadas, 0 fallidas, 1 omitida por no configurar base local desechable. |
| Pruebas existentes incluidas en el smoke | **Aprobadas:** `health.contract.test.ts`, `whatsapp-webhook.contract.test.ts`, `whatsapp-gateway.test.ts` y `whatsapp-inbox-outbox.test.ts`. |
| `npm run typecheck` | **Aprobado:** typecheck de backend y frontend. |
| `npm run test` | **Aprobado:** backend 216 pruebas (185 aprobadas, 31 omitidas, 0 fallidas); integración local adicional 1 aprobada; frontend 8 aprobadas. |
| `npm run build` | **Falló en `prisma generate`** con `EPERM` al renombrar `query_engine-windows.dll.node` en Windows. Los builds de workspaces no se ejecutaron por separado salvo backend. |
| `npm run build --workspace backend` | **Aprobado:** compilación TypeScript del backend. |

El fallo de `npm run build` ocurre antes de compilar los workspaces, durante la generación del cliente Prisma en Windows; no es un error de compilación introducido por la suite. No se atribuye aprobación al build completo. El build de frontend de producción no se alcanzó en ese comando.

## Seguridad, aislamiento y límites

- Los tests HTTP usan servidores en loopback con puertos locales efímeros y detienen el proceso frontend que inicia la suite.
- El smoke runner pasa un entorno aislado con valores sintéticos y establece explícitamente `WHATSAPP_OUTBOUND_ENABLED=false`.
- La copia temporal usada para home se construye solo con archivos frontend versionados y excluye nombres `.env*`, `node_modules` y `.next`.
- La base real es opcional: `SMOKE_DATABASE_URL` se acepta solo para PostgreSQL en loopback, con nombre de base que identifique `smoke` o `test` y credenciales vacías o sintéticas. La única consulta prevista es `SELECT 1`.
- No se ejecutaron migraciones, seeds, limpieza, deploy, ni pruebas contra servicios remotos.
- Estos resultados no certifican configuración, conectividad ni comportamiento en Hostinger o Supabase.
