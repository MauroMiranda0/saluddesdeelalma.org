import { expect, test } from "@playwright/test";

test("Landing pública móvil informa y abre el canal de WhatsApp", async ({
  page
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Un espacio para encontrarte contigo mismo",
      exact: true
    })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Terapia para cada etapa de tu vida" })
  ).toBeVisible();

  const whatsappLink = page.locator("#inicio").getByRole("link", {
    name: "Agenda tu cita por WhatsApp"
  });
  await expect(whatsappLink).toHaveAttribute(
    "href",
    "https://wa.me/525660950665?text=Hola%2C%20me%20gustar%C3%ADa%20agendar%20una%20cita"
  );

  await expect(
    page.getByRole("link", { name: "Acceso administrativo" })
  ).toHaveAttribute("href", "/admin/login");
});
