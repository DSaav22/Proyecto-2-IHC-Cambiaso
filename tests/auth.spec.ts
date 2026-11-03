import { test, expect } from "@playwright/test";
import { login, uniqueName, usuarioUno } from "./support/planazo";
test("Una persona nueva crea su cuenta, sale y vuelve a entrar", async ({ page }) => {
  const name = uniqueName("Persona E2E");
  const email = `e2e-${Date.now()}@planazo.test`;
  const password = "ClaveSegura123";

  await test.step("Crea la cuenta desde /register", async () => {
    await page.goto("/register");
    await page.getByLabel("Nombre").fill(name);
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
  });

  await test.step("Entra a Mis planes sin planes todavía", async () => {
    await expect(page).toHaveURL(/\/mis-planes$/);
    await expect(page.getByRole("heading", { name: `Hola, ${name}` })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Todavía no tienes planes" })).toBeVisible();
  });

  await test.step("Cierra sesión y vuelve a entrar con la cuenta nueva", async () => {
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await login(page, { name, email, password });
  });
});

test("Con la contraseña equivocada no entra y se le dice qué corregir", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(usuarioUno.email);
  await page.getByLabel("Contraseña").fill("ClaveEquivocada1");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("alert")).toHaveText("Correo o contraseña incorrectos");
  await expect(page).toHaveURL(/\/login$/);
});

test("No puede registrar un correo que ya tiene cuenta", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Nombre").fill("Otra persona");
  await page.getByLabel("Correo electrónico").fill(usuarioUno.email);
  await page.getByLabel("Contraseña").fill("ClaveSegura123");
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(page.getByRole("alert")).toHaveText("Ya existe una cuenta con ese correo");
  await expect(page).toHaveURL(/\/register$/);
});

test("Sin sesión, Mis planes lleva al login y después vuelve a Mis planes", async ({ page }) => {
  await page.goto("/mis-planes");
  await expect(page).toHaveURL(/\/login$/);

  await login(page, usuarioUno);
});
