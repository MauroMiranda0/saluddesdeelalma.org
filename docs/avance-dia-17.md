# Informe de Avance — Salud desde el Alma

**Fecha:** viernes 25 de septiembre de 2026 | **Día de desarrollo:** 25 de 32

---

## Resumen

La ejecución avanza con las fases de interfaz y landing cerradas; el seguimiento detallado de tareas se mantiene en `specs/001-sistema-gestion-consultorio/tasks.md`. El sistema ya permite lo más importante: que tus pacientes pidan citas por WhatsApp y que tú administres tu agenda y cobros desde el celular.

---

## Qué está funcionando ahora

**Para tus pacientes**

- Pueden pedir una cita por WhatsApp: el sistema les pregunta la fecha, hora y modalidad (en línea, presencial, pareja o familiar).
- Reciben una confirmación inmediata con los datos de su cita y la política de cancelación (avisar con 24 horas de anticipación).
- Si el tema es clínico, el asistente no opina ni da diagnósticos: deriva el caso contigo.

**Para ti (panel desde el celular)**

- Entras con usuario y contraseña de forma segura.
- Ves tu agenda por día, semana o mes, con colores que distinguen cada tipo de cita.
- Puedes crear, mover, confirmar o cancelar citas.
- Registras pagos y confirmas comprobantes de WhatsApp.
- El sistema guarda un registro de las acciones importantes para tu tranquilidad.

**Reglas del consultorio ya activas**

- No se permiten citas traslapadas.
- Cada paciente se agenda con su psicóloga asignada.
- El anticipo debe ser el 50% de la tarifa configurada.
- Tu sesión se cierra sola después de 30 minutos sin uso, por seguridad.

---

## Pruebas realizadas

**Pruebas automáticas**

- 22 lotes de pruebas del servidor: acceso, citas, pagos, mensajes de WhatsApp, reglas de negocio y registros de seguridad.
- 2 pruebas en celular: una recorre tu agenda y otra el registro y confirmación de un pago.

**Revisión manual del panel (15 de septiembre)**

- Se probó la agenda en el celular y el flujo completo de pagos.
- Se encontró y se corrigió un detalle visual en la tarjeta de una cita; quedó resuelto.

**Con honestidad:** estas pruebas aún no las realiza alguien externo. La prueba formal contigo, con tus casos reales desde tu teléfono, se agendará como paso siguiente.

---

## Imágenes del proyecto

| Archivo      | Qué es                                                      |
| ------------ | ----------------------------------------------------------- |
| `logo.jpg`   | logo de Salud desde el Alma                                 |
| `mockup.png` | diseño inicial del proyecto                                 |
| `paleta.png` | colores oficiales (verdes y sepia) que ya usa la plataforma |

El sitio usa la paleta aprobada de crema, salvia claro, verde oliva, melocotón y marrón café, definida en `DESIGN.md` y formalizada en la Constitución.

---

## Qué falta para terminar

1. **Recordatorios automáticos (10 actividades):** completadas en US4. El aviso del día previo se programa a las 18:00 `America/Mexico_City` del día calendario anterior, el aviso de pago pendiente se crea al registrar y al completar una cita, y la cancelación notifica al paciente sin doble envío porque el aviso en línea consume el mismo recordatorio. Cada entrega del outbox queda vinculada al recordatorio que cumple y el worker refleja `enviado` o `fallido` sobre su estado. Pendiente solo la UAT visual de los estados en el panel.
2. **Consultas de pacientes por WhatsApp (7 actividades):** completadas en US5. El catálogo de FAQ contesta duración de sesión, modalidades, formas de pago, anticipo, privacidad y recordatorios; la consulta de estado de cita y saldo (`payment_status`) exige número registrado más nombre y fecha de nacimiento coincidentes, responde con el mismo texto ante cualquier denegación para no permitir enumerar pacientes, y audita la denegación (`sensitive_status_query_denied`) antes de derivar a la psicóloga. Pendiente solo la UAT desde el celular real.
3. **Alineación de la interfaz y landing pública:** completadas. El panel conserva variaciones de composición aprobadas respecto al mockup, con barra lateral, tarjetas y jerarquía serena; la página pública ofrece información, contacto, WhatsApp y acceso discreto al panel.
4. **Pulido y seguridad (5 actividades):** refuerzos técnicos de seguridad y revisión final.
5. **Conexión del WhatsApp real:** hoy se simula el envío porque aún no tenemos las claves oficiales de WhatsApp Business; al conectarlas, los mensajes saldrán de verdad.
6. **Prueba contigo (UAT):** una sesión guiada desde tu celular para confirmar que todo funciona en tu día a día.

---

## Ajuste del plan y nuevo calendario

El plan pasó de 29 a **32 días** (el proyecto llevaba 29 al iniciar; la entrega máxima será el **1 de octubre de 2026**) para garantizar que la interfaz quede fiel al mockup aprobado sin sacrificar pruebas ni la prueba contigo.

| Día   | Fecha     | Trabajo                                                                            |
| ----- | --------- | ---------------------------------------------------------------------------------- |
| 18–20 | 17–19 sep | Recordatorios automáticos                                                          |
| 21–22 | 20–21 sep | Consultas de pacientes por WhatsApp (FAQ y estado de cita/pago)                    |
| 23–25 | 22–24 sep | **Landing pública + rediseño del panel para que sea fiel al mockup** (en paralelo) |
| 26–27 | 25–26 sep | Pulido y seguridad                                                                 |
| 28–29 | 27–28 sep | Prueba contigo (UAT) desde tu celular                                              |
| 30–31 | 29–30 sep | Ajustes derivados de esa prueba                                                    |
| 32    | 1 oct     | Puesta en producción, documentación y capacitación                                 |

---

## Próximo paso sugerido

Conectar el **WhatsApp real**: ya están las claves, el webhook y el asistente, así que el paso que falta es la prueba de extremo a extremo desde tu celular con las credenciales oficiales de WhatsApp Business, que es lo que convierte lo simulado en mensajes que salen de verdad.
