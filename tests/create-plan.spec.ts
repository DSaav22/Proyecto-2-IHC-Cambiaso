import { test, expect } from "@playwright/test";
import {
  createPlan,
  isoDateInDays,
  login,
  myPlans,
  planCard,
  signUpNewUser,
  successNotice,
  uniqueName,
  usuarioUno,
} from "./support/planazo";

test("Usuario Uno crea un plan y lo ve en Mis planes", async ({ page }) => {
  const planTitle = uniqueName("Plan E2E");

  await test.step("Inicia sesión con el usuario de la semilla", async () => {
    await login(page, usuarioUno);
  });

  await test.step("Crea un plan desde el formulario", async () => {
    await page.getByRole("button", { name: "Nuevo plan" }).click();

    const dialog = page.getByRole("dialog", { name: "Nuevo plan" });
    await dialog.getByLabel("Título").fill(planTitle);
    await dialog.getByLabel("Descripción").fill("Plan creado por la prueba E2E");
    await dialog.getByLabel("Fecha límite").fill(isoDateInDays(7));
    await dialog.getByRole("button", { name: "Crear plan" }).click();

    await expect(dialog).toBeHidden();
  });

  await test.step("Ve el aviso de éxito y el plan en la lista", async () => {
    await expect(successNotice(page, "Plan creado correctamente.")).toBeVisible();
    await expect(myPlans(page).getByRole("heading", { name: planTitle })).toBeVisible();
  });

  await test.step("El plan sigue en la lista al recargar", async () => {
    await page.reload();
    await expect(myPlans(page).getByRole("heading", { name: planTitle })).toBeVisible();
  });
});

test("Quien creó un plan edita su título", async ({ page }) => {
  const oldTitle = uniqueName("Plan para editar");
  const newTitle = uniqueName("Plan editado");

  await signUpNewUser(page);
  await createPlan(page, oldTitle);

  await test.step("Abre Editar desde el menú de la tarjeta", async () => {
    await planCard(page, oldTitle).getByRole("button", { name: "Más acciones" }).click();
    await page.getByRole("menuitem", { name: "Editar" }).click();
  });

  await test.step("Cambia el título y guarda", async () => {
    const dialog = page.getByRole("dialog", { name: "Editar plan" });
    await expect(dialog.getByLabel("Título")).toHaveValue(oldTitle);
    await dialog.getByLabel("Título").fill(newTitle);
    await dialog.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(dialog).toBeHidden();
  });

  await test.step("Ve el título nuevo, también al recargar", async () => {
    await expect(successNotice(page, "Plan actualizado correctamente.")).toBeVisible();
    await expect(planCard(page, newTitle)).toBeVisible();
    await expect(planCard(page, oldTitle)).toHaveCount(0);

    await page.reload();
    await expect(planCard(page, newTitle)).toBeVisible();
  });
});

test("Si deja el formulario vacío, se le dice qué falta y no se crea nada", async ({ page }) => {
  await signUpNewUser(page);

  await page.getByRole("button", { name: "Nuevo plan" }).click();
  const dialog = page.getByRole("dialog", { name: "Nuevo plan" });
  await dialog.getByRole("button", { name: "Crear plan" }).click();

  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Ingresa un título.")).toBeVisible();
  await expect(dialog.getByText("Ingresa una descripción.")).toBeVisible();
  await expect(dialog.getByText("Selecciona una fecha límite.")).toBeVisible();
  await expect(dialog.getByLabel("Título")).toHaveAttribute("aria-invalid", "true");

  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("heading", { name: "Todavía no tienes planes" })).toBeVisible();
});
