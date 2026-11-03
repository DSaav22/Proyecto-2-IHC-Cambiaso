import { expect, type Locator, type Page } from "@playwright/test";

// Seeded users, see "Usuarios de prueba" in README.md
export const usuarioUno = {
  name: "Usuario Uno",
  email: "usuario1@planazo.com",
  password: "Planazo123!",
};

export const usuarioDos = {
  name: "Usuario Dos",
  email: "usuario2@planazo.com",
  password: "Planazo123!",
};

export type TestUser = typeof usuarioUno;

export function isoDateInDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// New account per test so the seeded users don't fill up with test plans
export async function signUpNewUser(page: Page, prefix = "Persona E2E"): Promise<TestUser> {
  const id = `${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
  const user = { name: `${prefix} ${id}`, email: `e2e-${id}@planazo.test`, password: "ClaveSegura123" };

  await page.goto("/register");
  await page.getByLabel("Nombre").fill(user.name);
  await page.getByLabel("Correo electrónico").fill(user.email);
  await page.getByLabel("Contraseña").fill(user.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(page).toHaveURL(/\/mis-planes$/);
  await expect(page.getByRole("heading", { name: `Hola, ${user.name}` })).toBeVisible();
  return user;
}

export async function login(page: Page, user: TestUser) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(user.email);
  await page.getByLabel("Contraseña").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/mis-planes$/);
  await expect(page.getByRole("heading", { name: `Hola, ${user.name}` })).toBeVisible();
}

export function myPlans(page: Page): Locator {
  return page.getByRole("region", { name: "Tus planes" });
}

export function planCard(page: Page, title: string): Locator {
  return myPlans(page)
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}

// The filters bar is also role="status", so filter by text
export function successNotice(page: Page, text: string): Locator {
  return page.getByRole("status").filter({ hasText: text });
}

export async function createPlan(page: Page, title: string, daysAhead = 7) {
  await page.getByRole("button", { name: "Nuevo plan" }).click();

  const dialog = page.getByRole("dialog", { name: "Nuevo plan" });
  await dialog.getByLabel("Título").fill(title);
  await dialog.getByLabel("Descripción").fill("Plan creado por la prueba E2E");
  await dialog.getByLabel("Fecha límite").fill(isoDateInDays(daysAhead));
  await dialog.getByRole("button", { name: "Crear plan" }).click();

  await expect(dialog).toBeHidden();
  await expect(planCard(page, title)).toBeVisible();
}
