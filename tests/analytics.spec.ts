import { test, expect } from "@playwright/test";
import { collectEvents, createPlan, planCard, signUpNewUser, uniqueName } from "./support/planazo";

test("Crear y confirmar un plan guarda los eventos del embudo, sin datos personales", async ({ page }) => {
  const title = uniqueName("Plan medido");
  const user = await signUpNewUser(page, "Analitica");
  const sent = collectEvents(page);

  await createPlan(page, title);
  const card = planCard(page, title);
  await card.getByRole("button", { name: "Confirmar plan" }).click();
  await page.getByRole("alertdialog", { name: "¿Confirmar este plan?" }).getByRole("button", { name: "Confirmar" }).click();
  await expect(card.getByTestId("plan-status-badge")).toHaveText("Confirmado");

  await expect.poll(() => sent.length).toBe(3);
  expect(sent).toEqual([
    { event: "plan_creacion_iniciada", props: {} },
    { event: "plan_creado", props: {} },
    { event: "plan_confirmado", props: { via: "boton" } },
  ]);
  for (const personal of [user.name, user.email, title]) {
    expect(JSON.stringify(sent)).not.toContain(personal);
  }

  // Other tests write events at the same time, so only check that the panel shows the data.
  await page.goto("/analitica");
  for (const flow of ["Crear plan", "Unirse con código", "Gastos", "Retirarse de un plan"]) {
    await expect(page.getByRole("article", { name: `Embudo ${flow}` })).toBeVisible();
  }
  await expect(page.getByRole("article", { name: "Embudo Crear plan" })).toContainText("plan_confirmado");
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(11);
});
