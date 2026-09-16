import { expect, test } from "@playwright/test";

// Requiere una base de datos sembrada y ADMIN_E2E_PASSWORD con la misma clave
// de ADMIN_SEED_PASSWORD. No se versionan credenciales para este flujo.
const ADMIN_PASSWORD = process.env.ADMIN_E2E_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error(
    "ADMIN_E2E_PASSWORD must be set to run the admin E2E tests; use the same value as ADMIN_SEED_PASSWORD."
  );
}

test("Login y actualizacion de tarifa de pagos en movil", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByPlaceholder("admin").fill("admin");
  await page.getByPlaceholder("••••••••").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page).toHaveURL(/\/admin\/agenda/);
  await page.getByRole("link", { name: "Pagos" }).click();
  await expect(page).toHaveURL(/\/admin\/payments/);
  await expect(
    page.getByRole("heading", { name: "Pagos", exact: true })
  ).toBeVisible();
  await expect(
    page.getByText(
      "El anticipo debe ser exactamente el 50% de la tarifa configurada."
    )
  ).toBeVisible();

  const individualRate = page.getByLabel("individual");
  await individualRate.fill("1000");
  await page
    .locator("label")
    .filter({ hasText: "individual" })
    .getByRole("button", { name: "Guardar" })
    .click();
  await expect(page.getByText("Tarifa actualizada.")).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Comprobantes de WhatsApp" })
  ).toBeVisible();
});

test("Registra y confirma manualmente un anticipo desde pagos en movil", async ({
  page
}) => {
  await page.goto("/admin/login");
  await page.getByPlaceholder("admin").fill("admin");
  await page.getByPlaceholder("••••••••").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/admin\/agenda/);

  await page.goto("/admin/payments");
  await expect(
    page.getByRole("heading", { name: "Pagos", exact: true })
  ).toBeVisible();

  const registerButtons = page.getByRole("button", {
    name: "Registrar pago",
    exact: true
  });
  const noPendingPayments = page.getByText("No hay pagos pendientes.", {
    exact: true
  });
  await expect(noPendingPayments.or(registerButtons.first())).toBeVisible();
  if (await noPendingPayments.isVisible()) {
    test.skip(
      true,
      "requires an active appointment pending payment in the E2E database"
    );
  }
  await expect(registerButtons.first()).toBeVisible();

  for (const therapyType of ["individual", "pareja", "familiar"]) {
    await page.getByLabel(therapyType).fill("1000");
    await page
      .locator("label")
      .filter({ hasText: therapyType })
      .getByRole("button", { name: "Guardar" })
      .click();
    await expect(page.getByText("Tarifa actualizada.")).toBeVisible();
  }

  const paymentCard = page
    .locator("li")
    .filter({ has: registerButtons })
    .first();
  await expect(paymentCard).toBeVisible();
  const patientName =
    (await paymentCard.getByRole("paragraph").first().textContent())?.trim() ??
    "";

  await paymentCard.getByRole("button", { name: "Registrar pago" }).click();
  const form = page
    .getByRole("heading", { name: "Registrar pago" })
    .locator("..");
  await expect(form).toBeVisible();
  await form.getByLabel("Tipo de pago").selectOption("anticipo");
  await form.getByLabel("Monto").fill("500");
  await form
    .getByLabel("Referencia del comprobante (opcional)")
    .fill("anticipo-e2e");
  await form.getByRole("button", { name: "Registrar pago" }).click();

  await expect(
    page.getByText(
      "Pago registrado. Confírmelo después de revisar el comprobante."
    )
  ).toBeVisible();
  await expect(
    paymentCard.getByText("Por confirmar", { exact: true })
  ).toBeVisible();

  // Confirmación manual posterior al registro: recargar desde la vista móvil
  // y verificar que el anticipo persiste como "Por confirmar".
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Pagos", exact: true })
  ).toBeVisible();
  const confirmPaymentButtons = page.getByRole("button", {
    name: "Confirmar pago",
    exact: true
  });
  const pendingCard = page
    .locator("li")
    .filter({ hasText: patientName })
    .filter({ has: confirmPaymentButtons })
    .first();
  await expect(pendingCard).toBeVisible();
  await expect(
    pendingCard.getByText("Por confirmar", { exact: true })
  ).toBeVisible();

  await pendingCard
    .getByRole("button", { name: "Confirmar pago", exact: true })
    .click();
  await expect(
    page.getByText("Pago confirmado.", { exact: true })
  ).toBeVisible();
  await expect(
    pendingCard.getByText("Confirmado", { exact: true })
  ).toBeVisible();
  await expect(confirmPaymentButtons).toHaveCount(0);

  // El estado confirmado persiste al volver a cargar la vista móvil.
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Pagos", exact: true })
  ).toBeVisible();
  await expect(
    pendingCard.getByText("Confirmado", { exact: true })
  ).toBeVisible();
  await expect(confirmPaymentButtons).toHaveCount(0);
});
