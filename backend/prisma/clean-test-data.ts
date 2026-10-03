/**
 * Limpia los residuos que las pruebas de integracion dejan en la base de
 * desarrollo.
 *
 * Solo toca filas creadas por archivos de prueba, identificadas por los nombres
 * fijos que esos archivos usan. No toca datos de demo (@demo.local, prefijo
 * demo-) ni citas reales.
 *
 * Nombres y su archivo de origen:
 * - Terapeuta Uno    therapist-session-rules.postgres.integration.test.ts
 * - Paciente Uno     therapist-session-rules.postgres.integration.test.ts
 * - Terapeuta Perfil booking-reminder-regressions.postgres.integration.test.ts
 * - Paciente Reserva booking-reminder-regressions.postgres.integration.test.ts
 *
 * Uso: npm run db:clean:test-data
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Nombres literales que aparecen en backend/tests. Si un test los cambia, esta
// lista deja de alcanzar los residuos y habria que actualizarla.
const TEST_NAMES = [
  "Terapeuta Uno",
  "Paciente Uno",
  "Terapeuta Perfil",
  "Paciente Reserva"
];

// Prefijo que reserva los datos de demo, para no borrarlos por accidente.
const DEMO_PREFIX = "demo-";

const main = async () => {
  const therapistUsers = await prisma.user.findMany({
    where: { fullName: { in: TEST_NAMES }, role: "psicologo" },
    select: { id: true, fullName: true }
  });
  const patientUsers = await prisma.user.findMany({
    where: { fullName: { in: TEST_NAMES }, role: "paciente" },
    select: { id: true, fullName: true }
  });

  if (therapistUsers.length === 0 && patientUsers.length === 0) {
    console.log("No hay residuos de pruebas que limpiar.");
    return;
  }

  const therapistProfileIds = (
    await prisma.therapistProfile.findMany({
      where: { userId: { in: therapistUsers.map((user) => user.id) } },
      select: { id: true }
    })
  ).map((profile) => profile.id);

  const patients = await prisma.patient.findMany({
    where: { userId: { in: patientUsers.map((user) => user.id) } },
    select: { id: true, fullName: true }
  });
  const patientIds = patients.map((patient) => patient.id);

  const appointments = await prisma.appointment.findMany({
    where: {
      OR: [
        { patientId: { in: patientIds } },
        { therapistId: { in: therapistProfileIds } }
      ]
    },
    select: { id: true }
  });
  const appointmentIds = appointments.map((appointment) => appointment.id);

  // Orden inverso al de creacion para no violar las FK. Los comprobantes
  // sueltos se borran solo si no son de demo.
  const proofs = await prisma.paymentProof.deleteMany({
    where: {
      OR: [
        { appointmentId: { in: appointmentIds } },
        {
          appointmentId: null,
          whatsappMessageId: { not: { startsWith: DEMO_PREFIX } }
        }
      ]
    }
  });
  const reminders = await prisma.appointmentReminder.deleteMany({
    where: { appointmentId: { in: appointmentIds } }
  });
  const payments = await prisma.payment.deleteMany({
    where: {
      OR: [
        { appointmentId: { in: appointmentIds } },
        { patientId: { in: patientIds } }
      ]
    }
  });
  const deletedAppointments = await prisma.appointment.deleteMany({
    where: { id: { in: appointmentIds } }
  });

  // Los pacientes se borran antes que los perfiles porque
  // patients.assigned_therapist_id los referencia con ON DELETE RESTRICT.
  const deletedPatients = await prisma.patient.deleteMany({
    where: { id: { in: patientIds } }
  });
  await prisma.therapistProfile.deleteMany({
    where: { id: { in: therapistProfileIds } }
  });
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      id: { in: [...therapistUsers, ...patientUsers].map((user) => user.id) }
    }
  });

  const matched = [
    ...new Set([...therapistUsers, ...patients].map((row) => row.fullName))
  ];

  console.log("");
  console.log("Residuos de pruebas eliminados:");
  console.log(`  Citas:         ${deletedAppointments.count}`);
  console.log(`  Pagos:         ${payments.count}`);
  console.log(`  Comprobantes:  ${proofs.count}`);
  console.log(`  Recordatorios: ${reminders.count}`);
  console.log(`  Pacientes:     ${deletedPatients.count}`);
  console.log(`  Perfiles:      ${therapistProfileIds.length}`);
  console.log(`  Usuarios:      ${deletedUsers.count}`);
  console.log(`  Nombres:       ${matched.join(", ")}`);
  console.log("");
};

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    await prisma.$disconnect();
    throw error;
  });
