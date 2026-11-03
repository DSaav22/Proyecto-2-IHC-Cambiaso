import { test, expect } from "@playwright/test";

// Only screens without dates or created plans, so the screenshots don't change between runs.

test("La pantalla de login se ve igual que la referencia", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  await expect(page).toHaveScreenshot("login.png");
});

test("La pantalla de registro se ve igual que la referencia", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("button", { name: "Crear cuenta" })).toBeVisible();
  await expect(page).toHaveScreenshot("register.png");
});

test("Los errores del login se ven igual que la referencia", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Ingresa un correo válido.")).toBeVisible();
  await expect(page).toHaveScreenshot("login-errores.png");
});
