import { expect, test } from "@playwright/test";

// E2E del panel admin (T027).
// Requiere:
//   1. Base de datos sembrada con el usuario admin:
//      ADMIN_SEED_PASSWORD=<clave> npm run db:seed
//   2. La misma clave en la variable ADMIN_E2E_PASSWORD (se desecha la prueba
//      sin ella para no versionar credenciales planas).
const ADMIN_PASSWORD = process.env.ADMIN_E2E_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error(
    "ADMIN_E2E_PASSWORD must be set to run the admin E2E tests; use the same value as ADMIN_SEED_PASSWORD."
  );
}

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
  await page.goto("/admin");
  await page.getByPlaceholder("admin").fill("admin");
  await page.getByPlaceholder("••••••••").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page).toHaveURL(/\/admin\/agenda/);
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
  const scheduledAt = new Date();
  scheduledAt.setHours(10, 0, 0, 0);
  const endsAt = new Date(scheduledAt.getTime() + 60 * 60_000);

  await page.route(/\/api\/v1\/appointments\?/, async (route) => {
    await route.fulfill({
      json: {
        appointments: [
          {
            id: "manual-exception-appointment",
            scheduledAt: scheduledAt.toISOString(),
            endsAt: endsAt.toISOString(),
            therapyType: "individual",
            durationMinutes: 60,
            modality: "online",
            status: "programada",
            isManualException: true,
            locationLabel: null,
            meetingLink: null,
            cancelReason: null,
            cancelledAt: null,
            cancellationNotice: null,
            createdVia: "panel",
            paymentStatus: "pendiente",
            payments: [],
            patientId: "manual-exception-patient",
            patientName: "Paciente de excepción",
            patientPhone: "5555555555",
            patientBirthdate: null,
            therapistId: "manual-exception-therapist",
            therapistName: "Jocelyn",
            therapistIsActive: true
          }
        ]
      }
    });
  });

  await page.goto("/admin/login");
  await page.getByPlaceholder("admin").fill("admin");
  await page.getByPlaceholder("••••••••").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await page.getByRole("button", { name: "Día", exact: true }).click();
  await expect(page.getByText("Paciente de excepción")).toBeVisible();
  await expect(
    page.getByText("Excepción manual", { exact: true })
  ).toBeVisible();
});

test("Volver al login desde el panel cierra la sesión", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByPlaceholder("admin").fill("admin");
  await page.getByPlaceholder("••••••••").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/admin\/agenda/);

  await page.getByRole("button", { name: "Salir" }).click();

  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(
    page.getByRole("button", { name: "Iniciar sesión" })
  ).toBeVisible();
});
