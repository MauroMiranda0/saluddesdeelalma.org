import { expect, test } from "@playwright/test";

test("Landing pública móvil informa y abre el canal de WhatsApp", async ({
  page
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Encuentra tu camino a traves del autoconocimiento.",
      exact: true
    })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Terapia para cada etapa de tu vida" })
  ).toBeVisible();

  const whatsappLink = page.locator("#inicio").getByRole("link", {
    name: "Quiero iniciar mi proceso"
  });
  await expect(whatsappLink).toHaveAttribute(
    "href",
    "https://wa.me/525660950665?text=Hola%2C%20me%20gustar%C3%ADa%20agendar%20una%20cita"
  );

  await expect(
    page.getByRole("link", { name: "Acceso administrativo" })
  ).toHaveAttribute("href", "/admin/login");
  await expect(page.getByText("Psic. Jocelyn Gutiérrez")).toBeVisible();
  await expect(page.getByText("Valle del Ciprés #148")).toBeVisible();
  await expect(page.getByText("9:00 a 21:00")).toBeVisible();
  await expect(page.getByText("56 6095 0665", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth
    )
  ).toBeTruthy();
});
