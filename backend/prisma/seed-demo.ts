/**
 * Semilla de datos DEMO para verificacion visual del panel.
 *
 * Cubre los estados que las pruebas automatizadas no ven: colores de agenda,
 * los cinco estados de recordatorio, chips de pago, comprobantes y tarifas.
 * Es idempotente: borra lo creado en la corrida anterior y vuelve a crearlo.
 *
 * Respeta a proposito estas restricciones del schema:
 * - users_access_profile_check: todo no-admin nace con username NULL,
 *   panel_login_enabled false y password_hash NULL.
 * - users_single_admin_key: el unico admin lo crea seed.ts.
 * - appointments_duration_matches_type_check: individual 60 min, pareja y
 *   familiar 90 min.
 * - appointments_end_matches_duration_check: ends_at = scheduled_at + duracion.
 * - appointments_active_therapist_interval_excl: dos citas activas del mismo
 *   psicologo no se solapan, por eso cada cita activa tiene hora propia.
 * - validate_appointment_therapist_assignment: el terapeuta de la cita debe ser
 *   el terapeuta activo asignado a la paciente.
 *
 * Uso: npm run db:seed:demo
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EMAIL_SUFFIX = "@demo.local";
const PROOF_PREFIX = "demo-";

// America/Mexico_City es UTC-6 todo el ano, sin horario de verano desde 2022.
const OFFSET = 6;

/**
 * Convierte hora de pared en America/Mexico_City a instante UTC.
 * 09:00 en Mexico son 15:00 UTC, de ahi el OFFSET que se suma.
 */
const mx = (
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0
): Date => new Date(Date.UTC(year, month - 1, day, hour + OFFSET, minute));

/**
 * Descompone el instante actual en sus componentes de calendario de Mexico.
 * Mexico va seis horas DETRAS de UTC, por eso se resta el offset: leer el
 * instante sin desplazar daria la fecha de Tokio y sembraria las citas un dia
 * adelantado.
 */
const mexicoNow = () => {
  const shifted = new Date(Date.now() - OFFSET * 3600 * 1000);

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay()
  };
};

const THERAPISTS = [
  { key: "jocelyn", fullName: "Jocelyn Gutiérrez", phone: "525660950001" },
  { key: "jenny", fullName: "Jenny Martínez", phone: "525660950002" },
  { key: "patricia", fullName: "Patricia Soto", phone: "525660950003" }
] as const;

const PATIENTS = [
  { key: "ana", fullName: "Ana Lucía Ramírez", born: 1991 },
  { key: "brenda", fullName: "Brenda Ortiz Núñez", born: 1988 },
  { key: "carla", fullName: "Carla Mendoza Paz", born: 1995 },
  { key: "diana", fullName: "Diana Contreras Sol", born: 1983 },
  { key: "elena", fullName: "Elena Fuentes Rizo", born: 1999 },
  { key: "fernanda", fullName: "Fernanda Bautista Luna", born: 1990 },
  { key: "gabriela", fullName: "Gabriela Nieto Cruz", born: 1979 },
  { key: "hilda", fullName: "Hilda Peña Vargas", born: 1993 },
  { key: "irene", fullName: "Irene Salcedo Doria", born: 2000 },
  { key: "julia", fullName: "Julia Céspedes Rey", born: 1986 }
] as const;

type Reminder = {
  t:
    | "confirmacion"
    | "recordatorio_24h"
    | "cancelacion"
    | "pago_pendiente"
    | "pago_pendiente_post_cita";
  r: "paciente" | "grupo_psicologas";
  s: "pendiente" | "procesando" | "enviado" | "fallido" | "omitido";
  n: number;
};

type Payment = {
  type: "anticipo" | "completo";
  amount: number;
  status: "pendiente_validacion" | "validado" | "rechazado";
  method: "transferencia" | "efectivo";
  ref?: string;
};

type Demo = {
  key: string;
  patient: string;
  therapist: string;
  day: number;
  hour: number;
  duration: 60 | 90;
  therapy: "individual" | "pareja" | "familiar";
  modality: "online" | "presencial";
  status: "programada" | "confirmada" | "completada" | "cancelada";
  manual?: boolean;
  reason?: string;
  reminders?: Reminder[];
  payments?: Payment[];
};

// recordatorio_24h con recipient paciente: es el unico que la tarjeta muestra.
const r24 = (s: Reminder["s"], n: number): Reminder => ({
  t: "recordatorio_24h",
  r: "paciente",
  s,
  n
});

const INDIVIDUAL = {
  duration: 60,
  therapy: "individual"
} as const;

const APPOINTMENTS: Demo[] = [
  {
    key: "por-confirmar",
    patient: "ana",
    therapist: "jocelyn",
    day: 0,
    hour: 9,
    duration: 60,
    therapy: "individual",
    modality: "online",
    status: "programada",
    reminders: [
      r24("pendiente", 0),
      // Destinataria equivocada: la tarjeta NO debe pintar esta linea.
      { t: "recordatorio_24h", r: "grupo_psicologas", s: "pendiente", n: 0 },
      // Otros tipos: tampoco deben aparecer como "Recordatorio:".
      { t: "confirmacion", r: "paciente", s: "pendiente", n: 0 },
      { t: "pago_pendiente", r: "paciente", s: "pendiente", n: 0 },
      { t: "cancelacion", r: "paciente", s: "pendiente", n: 0 }
    ]
  },
  {
    key: "consulta-jenny",
    patient: "brenda",
    therapist: "jenny",
    day: 0,
    hour: 11,
    ...INDIVIDUAL,
    modality: "presencial",
    status: "confirmada",
    reminders: [r24("enviado", 1)]
  },
  {
    key: "cita-personal",
    patient: "carla",
    therapist: "patricia",
    day: 0,
    hour: 13,
    ...INDIVIDUAL,
    modality: "online",
    status: "confirmada",
    reminders: [r24("omitido", 0)]
  },
  {
    key: "consulta-jocelyn",
    patient: "diana",
    therapist: "jocelyn",
    day: 0,
    hour: 15,
    ...INDIVIDUAL,
    modality: "presencial",
    status: "confirmada",
    reminders: [r24("fallido", 3)]
  },
  {
    key: "pareja-procesando",
    patient: "elena",
    therapist: "jocelyn",
    day: 0,
    hour: 17,
    duration: 90,
    therapy: "pareja",
    modality: "presencial",
    status: "programada",
    reminders: [r24("procesando", 1)]
  },
  {
    key: "cancelada",
    patient: "fernanda",
    therapist: "jocelyn",
    day: 0,
    hour: 19,
    ...INDIVIDUAL,
    modality: "online",
    status: "cancelada",
    reason: "La paciente no puede asistir",
    reminders: [r24("omitido", 0)]
  },
  {
    key: "manana-excepcion",
    patient: "gabriela",
    therapist: "jocelyn",
    day: 1,
    hour: 7,
    ...INDIVIDUAL,
    modality: "presencial",
    status: "confirmada",
    manual: true,
    reminders: [r24("pendiente", 0)]
  },
  {
    key: "manana-familiar",
    patient: "hilda",
    therapist: "patricia",
    day: 1,
    hour: 10,
    duration: 90,
    therapy: "familiar",
    modality: "presencial",
    status: "confirmada",
    reminders: [r24("pendiente", 0)]
  },
  {
    key: "proxima-semana",
    patient: "irene",
    therapist: "jenny",
    day: 3,
    hour: 11,
    ...INDIVIDUAL,
    modality: "online",
    status: "confirmada",
    // Pago pendiente de validacion: chip "Por confirmar" en la vista Pagos.
    payments: [
      {
        type: "anticipo",
        amount: 500,
        status: "pendiente_validacion",
        method: "transferencia",
        ref: `${PROOF_PREFIX}anticipo-pendiente`
      }
    ]
  },
  {
    key: "pasada-sin-pago",
    patient: "julia",
    therapist: "jocelyn",
    day: -2,
    ...INDIVIDUAL,
    hour: 9,
    modality: "presencial",
    status: "completada",
    reminders: [
      {
        t: "pago_pendiente_post_cita",
        r: "paciente",
        s: "pendiente",
        n: 0
      }
    ]
  },
  {
    key: "pasada-anticipo",
    patient: "brenda",
    therapist: "jenny",
    day: -4,
    hour: 12,
    ...INDIVIDUAL,
    modality: "online",
    status: "completada",
    payments: [
      {
        type: "anticipo",
        amount: 600,
        status: "validado",
        method: "transferencia",
        ref: `${PROOF_PREFIX}anticipo-validado`
      }
    ]
  },
  {
    key: "pasada-pagada",
    patient: "carla",
    therapist: "patricia",
    day: -6,
    hour: 16,
    ...INDIVIDUAL,
    modality: "presencial",
    status: "completada",
    payments: [
      {
        type: "completo",
        amount: 1200,
        status: "validado",
        method: "efectivo",
        ref: `${PROOF_PREFIX}completo-validado`
      }
    ]
  },
  {
    key: "pasada-rechazado",
    patient: "diana",
    therapist: "jocelyn",
    day: -8,
    hour: 10,
    ...INDIVIDUAL,
    modality: "online",
    status: "completada",
    payments: [
      {
        type: "completo",
        amount: 1200,
        status: "rechazado",
        method: "transferencia",
        ref: `${PROOF_PREFIX}completo-rechazado`
      }
    ]
  }
];

const RATES = [
  { therapyType: "individual" as const, amount: 1200 },
  { therapyType: "pareja" as const, amount: 1800 },
  { therapyType: "familiar" as const, amount: 2100 }
];

const cleanPreviousRun = async () => {
  const patients = await prisma.patient.findMany({
    where: { user: { email: { endsWith: EMAIL_SUFFIX } } },
    select: { id: true }
  });
  const patientIds = patients.map((patient) => patient.id);
  const appointments = await prisma.appointment.findMany({
    where: { patientId: { in: patientIds } },
    select: { id: true }
  });
  const appointmentIds = appointments.map((appointment) => appointment.id);

  await prisma.paymentProof.deleteMany({
    where: { whatsappMessageId: { startsWith: PROOF_PREFIX } }
  });
  await prisma.appointmentReminder.deleteMany({
    where: { appointmentId: { in: appointmentIds } }
  });
  await prisma.payment.deleteMany({
    where: { appointmentId: { in: appointmentIds } }
  });
  await prisma.appointment.deleteMany({
    where: { id: { in: appointmentIds } }
  });
  await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
  await prisma.therapistProfile.deleteMany({
    where: { user: { email: { endsWith: EMAIL_SUFFIX } } }
  });
  await prisma.user.deleteMany({
    where: { email: { endsWith: EMAIL_SUFFIX } }
  });
};

const main = async () => {
  const admin = await prisma.user.findFirst({
    where: { role: "admin" },
    select: { id: true }
  });

  if (!admin) {
    throw new Error(
      "No hay usuario admin. Ejecuta primero: npm run db:seed --workspace backend"
    );
  }

  await cleanPreviousRun();

  const today = mexicoNow();
  // Si hoy es fin de semana, el dia de referencia pasa al siguiente lunes para
  // que las citas caigan en horario habil.
  const skip = today.weekday === 0 ? 1 : today.weekday === 6 ? 2 : 0;
  const reference = mx(today.year, today.month, today.day + skip);
  const refYear = reference.getUTCFullYear();
  const refMonth = reference.getUTCMonth() + 1;
  const refDay = reference.getUTCDate();

  const therapistIds: Record<string, string> = {};
  for (const therapist of THERAPISTS) {
    const user = await prisma.user.create({
      data: {
        email: `psicologa.${therapist.key}${EMAIL_SUFFIX}`,
        fullName: therapist.fullName,
        role: "psicologo",
        panelLoginEnabled: false,
        isActive: true
      }
    });
    const profile = await prisma.therapistProfile.create({
      data: { userId: user.id, phone: therapist.phone, isActive: true }
    });
    therapistIds[therapist.key] = profile.id;
  }

  const patientIds: Record<string, string> = {};
  for (const [index, patient] of PATIENTS.entries()) {
    // El terponente asignado se deriva de las citas: el trigger de la base exige
    // que la cita use el terapeuta activo que ya tiene asignado la paciente.
    const assigned =
      APPOINTMENTS.find((demo) => demo.patient === patient.key)?.therapist ??
      "jocelyn";
    const user = await prisma.user.create({
      data: {
        email: `paciente.${patient.key}${EMAIL_SUFFIX}`,
        fullName: patient.fullName,
        role: "paciente",
        panelLoginEnabled: false,
        isActive: true
      }
    });
    const record = await prisma.patient.create({
      data: {
        userId: user.id,
        fullName: patient.fullName,
        whatsappPhone: `5256610${String(1000 + index)}`,
        birthdate: new Date(Date.UTC(patient.born, 0, 15)),
        preferredModality: index % 2 === 0 ? "online" : "presencial",
        status: index === PATIENTS.length - 1 ? "inactivo" : "activo",
        assignedTherapistId: therapistIds[assigned]
      }
    });
    patientIds[patient.key] = record.id;
  }

  const created: string[] = [];

  for (const demo of APPOINTMENTS) {
    const scheduledAt = mx(refYear, refMonth, refDay + demo.day, demo.hour, 0);
    const endsAt = new Date(scheduledAt.getTime() + demo.duration * 60_000);
    const isPast = demo.status === "completada";
    const isCancelled = demo.status === "cancelada";

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patientIds[demo.patient] ?? "",
        therapistId: therapistIds[demo.therapist] ?? "",
        scheduledAt,
        endsAt,
        durationMinutes: demo.duration,
        therapyType: demo.therapy,
        modality: demo.modality,
        status: demo.status,
        isManualException: demo.manual ?? false,
        locationLabel: demo.modality === "presencial" ? "Consultorio" : null,
        meetingLink:
          demo.modality === "online"
            ? `https://meet.example.test/${demo.key}`
            : null,
        cancelReason: demo.reason ?? null,
        cancelledAt: isCancelled ? scheduledAt : null,
        cancellationNotice: isCancelled ? "a_tiempo" : null,
        completedAt: isPast ? endsAt : null,
        createdByUserId: admin.id,
        createdVia: "panel"
      }
    });
    created.push(appointment.id);

    for (const reminder of demo.reminders ?? []) {
      await prisma.appointmentReminder.create({
        data: {
          appointmentId: appointment.id,
          reminderType: reminder.t,
          recipient: reminder.r,
          status: reminder.s,
          attemptsCount: reminder.n,
          scheduledAt: new Date(scheduledAt.getTime() - 24 * 3600_000),
          sentAt:
            reminder.s === "enviado"
              ? new Date(scheduledAt.getTime() - 24 * 3600_000)
              : null,
          lastError:
            reminder.s === "fallido" ? "Proveedor rechazo el envio" : null
        }
      });
    }

    for (const payment of demo.payments ?? []) {
      const record = await prisma.payment.create({
        data: {
          appointmentId: appointment.id,
          patientId: patientIds[demo.patient] ?? "",
          paymentType: payment.type,
          amount: payment.amount,
          method: payment.method,
          status: payment.status,
          proofReference: payment.ref ?? null,
          recordedByUserId: admin.id,
          paidAt: payment.status === "rechazado" ? null : scheduledAt
        }
      });
      if (payment.ref) {
        // payment_proofs_association_consistency_check exige que un comprobante
        // pendiente no tenga ningun campo de asociacion, y que uno asociado los
        // tenga todos.
        const isAssociated = payment.status !== "pendiente_validacion";
        await prisma.paymentProof.create({
          data: {
            whatsappMessageId: payment.ref,
            mediaId: `media-${payment.ref}`,
            mediaType: "image",
            receivedAt: scheduledAt,
            status: isAssociated ? "asociado" : "pendiente_asociacion",
            appointmentId: isAssociated ? appointment.id : null,
            paymentId: isAssociated ? record.id : null,
            associatedByUserId: isAssociated ? admin.id : null,
            associatedAt: isAssociated ? scheduledAt : null
          }
        });
      }
    }
  }

  // Comprobante huerfano para ejercitar "Asociar manualmente".
  await prisma.paymentProof.create({
    data: {
      whatsappMessageId: `${PROOF_PREFIX}huerfano`,
      mediaId: `media-${PROOF_PREFIX}huerfano`,
      mediaType: "image",
      receivedAt: new Date(),
      status: "pendiente_asociacion"
    }
  });

  for (const rate of RATES) {
    await prisma.sessionRate.upsert({
      where: { therapyType: rate.therapyType },
      update: { amount: rate.amount },
      create: rate
    });
  }

  const iso = (date: Date) =>
    date.toLocaleDateString("es-MX", {
      timeZone: "America/Mexico_City",
      weekday: "long",
      day: "numeric",
      month: "long"
    });

  console.log("");
  console.log("Datos demo listos para verificacion visual.");
  console.log("");
  console.log(`  Dia de referencia (agenda Dia): ${iso(reference)}`);
  if (skip > 0) {
    console.log(
      "  Hoy es fin de semana: la cita de hoy se sembro en el siguiente lunes."
    );
  }
  console.log(`  Psicologas: ${THERAPISTS.map((t) => t.fullName).join(", ")}`);
  console.log(
    `  Pacientes:  ${PATIENTS.length} (la ultima figura como Inactiva)`
  );
  console.log(`  Citas:      ${created.length}`);
  console.log(
    `  Tarifas:    ${RATES.map((r) => `${r.therapyType} $${r.amount}`).join(", ")}`
  );
  console.log("");
  console.log("  Estados de recordatorio visibles en Dia:");
  console.log("    Recordatorio: pendiente · 0/3");
  console.log("    Recordatorio: en envio · 1/3");
  console.log("    Recordatorio: enviado · 1/3");
  console.log("    Recordatorio: fallido · 3/3");
  console.log("    Recordatorio: omitido · 0/3");
  console.log("");
};

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    await prisma.$disconnect();
    throw error;
  });
