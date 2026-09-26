import { expect, test, type Page, type Route } from "@playwright/test";

// E2E del panel admin (T027).
// Las pruebas de sesion real requieren:
//   1. Base de datos sembrada con el usuario admin:
//      ADMIN_SEED_PASSWORD=<clave> npm run db:seed
//   2. La misma clave en la variable ADMIN_E2E_PASSWORD (se omiten sin ella
//      para no versionar credenciales planas).
// Las pruebas que interceptan la sesion, el directorio y las citas corren sin
// base de datos ni clave.
const ADMIN_PASSWORD = process.env.ADMIN_E2E_PASSWORD;
const SIN_CLAVE = !ADMIN_PASSWORD;
const MOTIVO_SIN_CLAVE =
  "requiere ADMIN_E2E_PASSWORD y el admin sembrado en la base de datos";

const CORS = {
  "access-control-allow-origin": "http://localhost:3000",
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET,POST,OPTIONS"
};

const responderJson = async (route: Route, json: unknown) => {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: CORS });
    return;
  }

  await route.fulfill({ headers: CORS, json });
};

const mockAdminSession = async (page: Page) => {
  const session = {
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      username: "admin",
      email: "jocelyn@saluddesdeelalma.org",
      fullName: "Jocelyn Gutiérrez",
      role: "admin"
    },
    expiresAt: new Date(Date.now() + 1_800_000).toISOString()
  };

  await page.route("**/api/v1/auth/login", async (route) => {
    await responderJson(route, session);
  });
  await page.route("**/api/v1/auth/me", async (route) => {
    await responderJson(route, session);
  });
};

const mockDirectory = async (page: Page) => {
  await page.route("**/api/v1/directory", async (route) => {
    await responderJson(route, { patients: [], therapists: [] });
  });
};

const mockAppointments = async (page: Page, appointments: unknown[]) => {
  await page.route(/\/api\/v1\/appointments\?/, async (route) => {
    await responderJson(route, { appointments });
  });
};

const recordatorio = (
  status: string,
  attemptsCount: number,
  reminderType = "recordatorio_24h",
  recipient = "paciente"
) => ({
  reminderType,
  recipient,
  status,
  attemptsCount,
  sentAt: null
});

const cita = (overrides: Record<string, unknown>) => ({
  id: "cita-base",
  scheduledAt: "",
  endsAt: "",
  therapyType: "individual",
  durationMinutes: 60,
  modality: "online",
  status: "programada",
  isManualException: false,
  locationLabel: null,
  meetingLink: null,
  cancelReason: null,
  cancelledAt: null,
  cancellationNotice: null,
  createdVia: "panel",
  paymentStatus: "pendiente",
  payments: [],
  reminders: [],
  patientId: "paciente-base",
  patientName: "Paciente base",
  patientPhone: "5555555555",
  patientBirthdate: null,
  therapistId: "terapeuta-base",
  therapistName: "Jocelyn",
  therapistIsActive: true,
  ...overrides
});

const enHora = (hours: number, minutes = 0) => {
  const moment = new Date();
  moment.setHours(hours, minutes, 0, 0);
  return moment;
};

const INICIO_SESION_TIMEOUT = 20_000;

const inicioDeSesion = async (page: Page, contrasena: string) => {
  await page.goto("/admin/login");
  await page.getByPlaceholder("admin").fill("admin");
  await page.getByPlaceholder("••••••••").fill(contrasena);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/admin\/agenda/, {
    timeout: INICIO_SESION_TIMEOUT
  });
};

const iniciarSesionMockeada = async (page: Page) => {
  await inicioDeSesion(page, "clave-de-prueba");
};

test("Acceso anónimo redirige al login", async ({ page }) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Panel del consultorio" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Iniciar sesión" })
  ).toBeVisible();
});

test("Login + agenda diaria con leyenda de colores", async ({ page }) => {
  test.skip(SIN_CLAVE, MOTIVO_SIN_CLAVE);

  await inicioDeSesion(page, ADMIN_PASSWORD ?? "");

  await expect(
    page.getByRole("heading", { name: "Agenda", exact: true })
  ).toBeVisible();

  await expect(
    page.getByRole("button", { name: /Por confirmar/ })
  ).toBeVisible();
  await page.getByRole("button", { name: "Día", exact: true }).click();
  await expect(page.getByText("09:00", { exact: true })).toBeVisible();
  await expect(page.getByText("21:00", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Hoy" }).click();
  await expect(page.getByText("09:00", { exact: true })).toBeVisible();
});

test("Agenda diaria identifica citas de excepción manual", async ({ page }) => {
  test.skip(SIN_CLAVE, MOTIVO_SIN_CLAVE);

  const scheduledAt = new Date();
  scheduledAt.setHours(10, 0, 0, 0);
  const endsAt = new Date(scheduledAt.getTime() + 60 * 60_000);

  await mockAppointments(page, [
    cita({
      id: "manual-exception-appointment",
      scheduledAt: scheduledAt.toISOString(),
      endsAt: endsAt.toISOString(),
      isManualException: true,
      patientId: "manual-exception-patient",
      patientName: "Paciente de excepción",
      patientPhone: "5555555555",
      therapistId: "manual-exception-therapist",
      therapistName: "Jocelyn"
    })
  ]);

  await inicioDeSesion(page, ADMIN_PASSWORD ?? "");

  await page.getByRole("button", { name: "Día", exact: true }).click();
  await expect(page.getByText("Paciente de excepción")).toBeVisible();
  await expect(
    page.getByText("Excepción manual", { exact: true })
  ).toBeVisible();
});

test("La agenda muestra el estado del recordatorio del día previo", async ({
  page
}) => {
  const pendiente = enHora(10);
  const omitido = enHora(12);

  await mockAdminSession(page);
  await mockDirectory(page);
  await mockAppointments(page, [
    cita({
      id: "recordatorio-pendiente",
      scheduledAt: pendiente.toISOString(),
      endsAt: new Date(pendiente.getTime() + 60 * 60_000).toISOString(),
      patientName: "Paciente con aviso pendiente",
      reminders: [recordatorio("pendiente", 0)]
    }),
    cita({
      id: "recordatorio-omitido",
      scheduledAt: omitido.toISOString(),
      endsAt: new Date(omitido.getTime() + 60 * 60_000).toISOString(),
      patientName: "Paciente con aviso omitido",
      reminders: [recordatorio("omitido", 0)]
    })
  ]);

  await iniciarSesionMockeada(page);

  await page.getByRole("button", { name: "Día", exact: true }).click();
  await expect(
    page.getByText("Recordatorio: pendiente · 0/3").first()
  ).toBeVisible();
  await expect(
    page.getByText("Recordatorio: omitido · 0/3").first()
  ).toBeVisible();

  await page.getByRole("button", { name: "Semana", exact: true }).click();
  await expect(
    page.getByText("Recordatorio: pendiente · 0/3").first()
  ).toBeVisible();

  await page.getByRole("button", { name: "Mes", exact: true }).click();
  await expect(page.getByText(/Recordatorio:/)).toHaveCount(0);
});

test("La agenda no falla si una cita llega sin el campo recordatorios", async ({
  page
}) => {
  const scheduledAt = enHora(11);
  const citaSinRecordatorios = cita({
    id: "sin-recordatorios",
    scheduledAt: scheduledAt.toISOString(),
    endsAt: new Date(scheduledAt.getTime() + 60 * 60_000).toISOString(),
    patientName: "Paciente sin recordatorios"
  });
  delete (citaSinRecordatorios as { reminders?: unknown }).reminders;

  await mockAdminSession(page);
  await mockDirectory(page);
  await mockAppointments(page, [citaSinRecordatorios]);

  await iniciarSesionMockeada(page);
  await page.getByRole("button", { name: "Día", exact: true }).click();

  await expect(page.getByText("Paciente sin recordatorios")).toBeVisible();
  await expect(page.getByText(/Recordatorio:/)).toHaveCount(0);
});

test("Volver al login desde el panel cierra la sesión", async ({ page }) => {
  test.skip(SIN_CLAVE, MOTIVO_SIN_CLAVE);

  await inicioDeSesion(page, ADMIN_PASSWORD ?? "");

  await page.getByRole("button", { name: "Salir" }).click();

  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(
    page.getByRole("button", { name: "Iniciar sesión" })
  ).toBeVisible();
});
