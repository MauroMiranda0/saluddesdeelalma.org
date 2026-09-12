import { expect, test } from "@playwright/test";

// E2E del panel admin (T027).
// Requiere:
//   1. Base de datos sembrada con el usuario admin:
//      ADMIN_SEED_PASSWORD=<clave> npm run db:seed
//   2. La misma clave en la variable ADMIN_E2E_PASSWORD (o "e2e-admin-password-1234"
//      por defecto). El valor por defecto cumple el mínimo de 16 caracteres de la semilla.
const ADMIN_PASSWORD =
  process.env.ADMIN_E2E_PASSWORD ?? "e2e-admin-password-1234";

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
  await expect(page.getByRole("button", { name: /Cumpleaños/ })).toBeVisible();

  await page.getByRole("button", { name: "Día", exact: true }).click();
  await expect(page.getByText("09:00", { exact: true })).toBeVisible();
  await expect(page.getByText("21:00", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Hoy" }).click();
  await expect(page.getByText("09:00", { exact: true })).toBeVisible();
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
