import { expect, test } from "@playwright/test";

test("Landing pública móvil informa y abre el canal de WhatsApp", async ({
  page
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Salud desde el Alma", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Nuestros Servicios" })
  ).toBeVisible();

  const whatsappLink = page.getByRole("link", {
    name: "Agenda tu consulta por WhatsApp"
  });
  await expect(whatsappLink).toHaveAttribute(
    "href",
    "https://wa.me/525660950665"
  );

  await expect(
    page.getByRole("link", { name: "Acceso administrativo" })
  ).toHaveAttribute("href", "/admin/login");
});
