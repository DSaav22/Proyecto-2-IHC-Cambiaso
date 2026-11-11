import { test, expect } from "@playwright/test";
import { createPlan, planCard, signUpNewUser, uniqueName } from "./support/planazo";

test("Crear y confirmar un plan guarda sus dos eventos, sin datos personales", async ({ page }) => {
  const title = uniqueName("Plan medido");
  const user = await signUpNewUser(page, "Analitica");

  const sent: unknown[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/analytics/events")) sent.push(request.postDataJSON());
  });

  await createPlan(page, title);
  const card = planCard(page, title);
  await card.getByRole("button", { name: "Confirmar plan" }).click();
  await page.getByRole("alertdialog", { name: "¿Confirmar este plan?" }).getByRole("button", { name: "Confirmar" }).click();
  await expect(card.getByTestId("plan-status-badge")).toHaveText("Confirmado");

  await expect.poll(() => sent.length).toBe(2);
  expect(sent).toEqual([
    { event: "plan_creacion_iniciada", props: {} },
    { event: "plan_confirmado", props: { via: "boton" } },
  ]);
  for (const personal of [user.name, user.email, title]) {
    expect(JSON.stringify(sent)).not.toContain(personal);
  }

  await page.goto("/analitica");
  const table = page.getByRole("table");
  await expect(table.getByRole("row").nth(1)).toContainText('plan_confirmado{via: "boton"}');
});
