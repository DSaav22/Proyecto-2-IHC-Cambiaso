import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createPlan, login, planCard, signUpNewUser, uniqueName, usuarioUno } from "./support/planazo";

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

test("Login no tiene problemas de accesibilidad", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  await expectNoA11yViolations(page);
});

test("Registro no tiene problemas de accesibilidad", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("button", { name: "Crear cuenta" })).toBeVisible();
  await expectNoA11yViolations(page);
});

test("Mis planes no tiene problemas de accesibilidad", async ({ page }) => {
  await login(page, usuarioUno);
  await expect(page.getByRole("region", { name: "Tus planes" }).getByRole("article").first()).toBeVisible();
  await expectNoA11yViolations(page);
});

test("El diálogo de Fechas y lugares no tiene problemas de accesibilidad", async ({ page }) => {
  const title = uniqueName("Plan accesible");
  await signUpNewUser(page);
  await createPlan(page, title);

  await planCard(page, title).getByRole("button", { name: "Fechas y lugares" }).click();
  const dialog = page.getByRole("dialog", { name: "Fechas y lugares" });
  await expect(dialog.getByRole("heading", { name: "Propuestas" })).toBeVisible();
  await expectNoA11yViolations(page);
});
