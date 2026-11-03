import { test, expect } from "@playwright/test";
import { createPlan, planCard, signUpNewUser, successNotice, uniqueName } from "./support/planazo";
test("Quien creó un plan lo confirma y después lo cancela", async ({ page }) => {
  const title = uniqueName("Plan para confirmar");
  await signUpNewUser(page);
  await createPlan(page, title);

  const card = planCard(page, title);
  const status = card.getByTestId("plan-status-badge");
  await expect(status).toHaveText("Pendiente");

  await test.step("Confirma el plan", async () => {
    await card.getByRole("button", { name: "Confirmar plan" }).click();
    const dialog = page.getByRole("alertdialog", { name: "¿Confirmar este plan?" });
    await dialog.getByRole("button", { name: "Confirmar" }).click();

    await expect(dialog).toBeHidden();
    await expect(successNotice(page, "Plan confirmado correctamente.")).toBeVisible();
    await expect(status).toHaveText("Confirmado");
    await expect(card.getByRole("button", { name: "Confirmar plan" })).toHaveCount(0);
  });

  await test.step("Cancela el plan confirmado", async () => {
    await card.getByRole("button", { name: "Cancelar plan" }).click();
    const dialog = page.getByRole("alertdialog", { name: "¿Cancelar este plan?" });
    await dialog.getByRole("button", { name: "Sí, cancelar plan" }).click();

    await expect(dialog).toBeHidden();
    await expect(successNotice(page, "Plan cancelado correctamente.")).toBeVisible();
    await expect(status).toHaveText("Cancelado");
    await expect(card.getByText("Este plan está cancelado")).toBeVisible();
  });

  await test.step("El estado se mantiene al recargar", async () => {
    await page.reload();
    await expect(planCard(page, title).getByTestId("plan-status-badge")).toHaveText("Cancelado");
  });
});

test("Si se arrepiente con «Mantener plan», el plan sigue pendiente", async ({ page }) => {
  const title = uniqueName("Plan que se mantiene");
  await signUpNewUser(page);
  await createPlan(page, title);

  const card = planCard(page, title);
  await card.getByRole("button", { name: "Cancelar plan" }).click();
  const dialog = page.getByRole("alertdialog", { name: "¿Cancelar este plan?" });
  await dialog.getByRole("button", { name: "Mantener plan" }).click();

  await expect(dialog).toBeHidden();
  await expect(card.getByTestId("plan-status-badge")).toHaveText("Pendiente");
  await expect(card.getByRole("button", { name: "Confirmar plan" })).toBeVisible();
});
