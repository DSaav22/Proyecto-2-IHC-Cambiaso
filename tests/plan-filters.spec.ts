import { test, expect } from "@playwright/test";
import { collectEvents, createPlan, myPlans, planCard, signUpNewUser, uniqueName } from "./support/planazo";

test("Encuentra su plan por nombre y por estado", async ({ page }) => {
  const wanted = uniqueName("Cena");
  const other = uniqueName("Partido");
  await signUpNewUser(page);
  await createPlan(page, wanted);
  await createPlan(page, other);

  await test.step("Busca el plan por su título", async () => {
    await page.getByRole("searchbox", { name: "Buscar planes por título" }).fill(wanted);

    await expect(page.getByText("Mostrando 1 de 2 planes")).toBeVisible();
    await expect(page).toHaveURL(/q=/);
    await expect(planCard(page, wanted)).toBeVisible();
    await expect(planCard(page, other)).toHaveCount(0);
  });

  await test.step("Filtra además por estado Pendiente", async () => {
    await page.getByLabel("Estado", { exact: true }).selectOption({ label: "Pendiente" });

    await expect(page).toHaveURL(/estado=pendiente/);
    await expect(page.getByText("Filtros activos:")).toBeVisible();
    await expect(planCard(page, wanted)).toBeVisible();
  });
});

test("Si ningún plan coincide, se le explica y puede limpiar los filtros", async ({ page }) => {
  const title = uniqueName("Plan pendiente");
  await signUpNewUser(page);
  await createPlan(page, title);
  const sent = collectEvents(page);

  await page.getByLabel("Estado", { exact: true }).selectOption({ label: "Confirmado" });

  await expect(page.getByText("Mostrando 0 de 1 planes")).toBeVisible();
  await expect(myPlans(page).getByText("No hay planes que coincidan con los filtros")).toBeVisible();
  await expect.poll(() => sent).toEqual([
    { event: "busqueda_sin_resultados", props: { filtro: "estado" } },
  ]);

  await myPlans(page).getByRole("button", { name: "Limpiar filtros" }).click();

  await expect(page.getByLabel("Estado", { exact: true })).toHaveValue("all");
  await expect(planCard(page, title)).toBeVisible();
});
