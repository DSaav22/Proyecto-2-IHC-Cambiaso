import { test, expect, type Browser, type Page } from "@playwright/test";
import { collectEvents, createPlan, planCard, signUpNewUser, uniqueName } from "./support/planazo";

async function openCoordination(page: Page, title: string) {
  await planCard(page, title).getByRole("button", { name: "Fechas y lugares" }).click();
  const dialog = page.getByRole("dialog", { name: "Fechas y lugares" });
  await expect(dialog.getByRole("heading", { name: "Opciones para coordinar" })).toBeVisible();
  return dialog;
}

async function newParticipant(browser: Browser, prefix: string) {
  const page = await browser.newPage();
  const user = await signUpNewUser(page, prefix);
  return { page, user };
}

async function tryToLeave(page: Page, title: string) {
  await planCard(page, title).getByRole("button", { name: "Más acciones" }).click();
  await page.getByRole("menuitem", { name: "Abandonar plan" }).click();
  const confirm = page.getByRole("alertdialog", { name: "¿Abandonar este plan?" });
  await confirm.getByRole("button", { name: "Abandonar" }).click();
  return confirm;
}

test("Quien se retira deja de sumar sus votos, y quien tiene deuda no puede retirarse", async ({
  page,
  browser,
}) => {
  test.slow();
  const title = uniqueName("Plan con retiro");
  const parque = "Lugar: Parque E2E";
  const cine = "Lugar: Cine E2E";
  const beto = await newParticipant(browser, "Beto");
  const caro = await newParticipant(browser, "Caro");
  const betoEvents = collectEvents(beto.page);
  const caroEvents = collectEvents(caro.page);
  await signUpNewUser(page, "Ana");
  await createPlan(page, title);

  await test.step("Ana invita a Beto y a Caro y propone dos lugares", async () => {
    const dialog = await openCoordination(page, title);
    for (const person of [beto.user, caro.user]) {
      await dialog.getByLabel("Invitar por correo").fill(person.email);
      await dialog.getByRole("button", { name: "Invitar" }).click();
      await expect(dialog.getByText(person.name)).toBeVisible();
    }
    for (const place of ["Parque E2E", "Cine E2E"]) {
      const input = dialog.getByLabel("Lugar", { exact: true });
      await input.fill(place);
      await input.press("Enter");
      await expect(dialog.getByText(`Lugar: ${place}`)).toBeVisible();
    }
    await page.keyboard.press("Escape");
  });

  await test.step("Beto vota por los dos lugares", async () => {
    await beto.page.reload();
    const dialog = await openCoordination(beto.page, title);
    await dialog.getByRole("button", { name: `Votar por ${parque}` }).click();
    await dialog.getByRole("button", { name: `Votar por ${cine}` }).click();
    await expect(dialog.getByRole("listitem").filter({ hasText: cine })).toContainText("1 voto");
    await beto.page.keyboard.press("Escape");
  });

  await test.step("Beto se retira y el conteo baja a cero", async () => {
    const confirm = await tryToLeave(beto.page, title);
    await expect(confirm).toBeHidden();
    await expect(planCard(beto.page, title)).toHaveCount(0);

    await page.reload();
    const dialog = await openCoordination(page, title);
    await expect(dialog.getByRole("listitem").filter({ hasText: parque })).toContainText("0 votos");
    await expect(dialog.getByRole("listitem").filter({ hasText: cine })).toContainText("0 votos");
    await expect(dialog.getByText(beto.user.name)).toHaveCount(0);
    await page.keyboard.press("Escape");
  });

  await test.step("Ana paga entradas de Bs 90 y Caro queda debiendo Bs 45", async () => {
    await planCard(page, title).getByRole("button", { name: "Gastos" }).click();
    const dialog = page.getByRole("dialog", { name: "Gastos" });
    await dialog.getByLabel("Descripción del gasto").fill("Entradas");
    await dialog.getByLabel("Monto total (Bs)").fill("90");
    await dialog.getByRole("button", { name: "Agregar gasto" }).click();
    await expect(
      dialog.getByRole("list", { name: "Saldos" }).getByRole("listitem").filter({ hasText: caro.user.name }),
    ).toContainText("Debe Bs 45,00");
  });

  await test.step("Caro intenta retirarse y se le bloquea por la deuda", async () => {
    await caro.page.reload();
    const confirm = await tryToLeave(caro.page, title);
    await expect(confirm.getByRole("alert")).toHaveText(
      "Tienes una deuda de Bs 45,00 en este plan. Págala antes de retirarte.",
    );
    await confirm.getByRole("button", { name: "Cancelar" }).click();

    await caro.page.reload();
    await expect(planCard(caro.page, title)).toBeVisible();
  });

  await test.step("Los dos intentos quedan registrados con su resultado", async () => {
    expect(betoEvents).toEqual([
      { event: "retiro_iniciado", props: {} },
      { event: "plan_abandonado", props: { tenia_votos: true } },
    ]);
    expect(caroEvents).toEqual([
      { event: "retiro_iniciado", props: {} },
      { event: "retiro_bloqueado", props: { motivo: "deuda_pendiente" } },
    ]);
  });

  await beto.page.context().close();
  await caro.page.context().close();
});
