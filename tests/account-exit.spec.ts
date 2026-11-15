import { test, expect } from "@playwright/test";
import {
  collectEvents,
  createPlan,
  planCard,
  signUpNewUser,
  uniqueName,
} from "./support/planazo";

test("Puede ver y descargar sus datos, y eliminar la cuenta cuando no hay bloqueos", async ({
  page,
}) => {
  test.slow();
  const person = await signUpNewUser(page, "Salida");
  const events = collectEvents(page);

  await page.getByRole("link", { name: `Mis datos de ${person.name}` }).click();
  await expect(page).toHaveURL(/\/mis-datos$/);
  await expect(page.getByRole("heading", { name: "Mis datos" })).toBeVisible();
  await expect(page.getByText(person.email)).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("mis-datos");
  await expect.poll(() => events.map((e) => e.event)).toContain("datos_descargados");

  await page.getByRole("button", { name: "Eliminar mi cuenta" }).click();
  const dialog = page.getByRole("alertdialog", { name: "¿Eliminar tu cuenta?" });
  await expect(dialog.getByRole("button", { name: "Mantener mi cuenta" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Eliminar mi cuenta" })).toBeVisible();
  await dialog.getByRole("button", { name: "Eliminar mi cuenta" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect.poll(() => events.map((e) => e.event)).toContain("eliminacion_iniciada");

  await page.getByLabel("Correo electrónico").fill(person.email);
  await page.getByLabel("Contraseña").fill(person.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("alert")).toContainText("Correo o contraseña incorrectos");
});

test("Si organiza un plan abierto, no puede eliminar la cuenta y le dice qué hacer", async ({
  page,
}) => {
  test.slow();
  const person = await signUpNewUser(page, "Bloqueo");
  const title = uniqueName("Plan que bloquea");
  await createPlan(page, title);
  const events = collectEvents(page);

  await page.getByRole("link", { name: `Mis datos de ${person.name}` }).click();
  await page.getByRole("button", { name: "Eliminar mi cuenta" }).click();
  const dialog = page.getByRole("alertdialog", { name: "¿Eliminar tu cuenta?" });
  await dialog.getByRole("button", { name: "Eliminar mi cuenta" }).click();

  await expect(dialog.getByRole("alert")).toContainText("plan abierto");
  await expect(dialog.getByRole("alert")).toContainText("Cancelalo");
  await expect.poll(() => events).toContainEqual({
    event: "eliminacion_bloqueada",
    props: { motivo: "planes_abiertos" },
  });

  await dialog.getByRole("button", { name: "Mantener mi cuenta" }).click();
  await page.getByRole("link", { name: "Mis planes" }).click();
  await expect(planCard(page, title)).toBeVisible();
});
