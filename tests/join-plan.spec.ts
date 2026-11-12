import { test, expect } from "@playwright/test";
import {
  collectEvents,
  createPlan,
  login,
  planCard,
  signUpNewUser,
  successNotice,
  uniqueName,
  usuarioDos,
} from "./support/planazo";

test("Una persona se une con el código que le comparte quien creó el plan", async ({
  page,
  browser,
}) => {
  test.slow();
  const title = uniqueName("Plan para compartir");
  let shareCode = "";

  const owner = await test.step("Quien organiza crea el plan y copia su código", async () => {
    const user = await signUpNewUser(page, "Organiza");
    await createPlan(page, title);
    shareCode = (await planCard(page, title).getByText(/^PLZ-/).textContent()) ?? "";
    expect(shareCode).toMatch(/^PLZ-/);
    return user;
  });

  const guestPage = await browser.newPage();
  const sent = collectEvents(guestPage);

  await test.step("La otra persona entra y se une con ese código", async () => {
    await signUpNewUser(guestPage, "Invitada");
    await guestPage.getByRole("button", { name: "Unirse con código" }).click();

    const dialog = guestPage.getByRole("dialog", { name: "Unirse a un plan" });
    await dialog.getByLabel("Código del plan").fill(shareCode);
    await dialog.getByRole("button", { name: "Unirse al plan" }).click();

    await expect(dialog).toBeHidden();
    await expect(successNotice(guestPage, "Te has unido al plan correctamente.")).toBeVisible();
    await expect.poll(() => sent).toEqual([
      { event: "union_iniciada", props: {} },
      { event: "plan_unido", props: {} },
    ]);
  });

  await test.step("Ve el plan como invitada y de solo lectura, también al recargar", async () => {
    const card = planCard(guestPage, title);
    await expect(card.getByText("Invitado")).toBeVisible();
    await expect(card.getByText(`Creado por: ${owner.name}`)).toBeVisible();
    await expect(card.getByText(/^Solo lectura/)).toBeVisible();
    await expect(card.getByRole("button", { name: "Confirmar plan" })).toHaveCount(0);

    await guestPage.reload();
    await expect(planCard(guestPage, title)).toBeVisible();
  });

  await guestPage.context().close();
});

test("Con un código que no existe, se le avisa y el diálogo sigue abierto", async ({ page }) => {
  await login(page, usuarioDos);
  const sent = collectEvents(page);
  await page.getByRole("button", { name: "Unirse con código" }).click();

  const dialog = page.getByRole("dialog", { name: "Unirse a un plan" });
  await dialog.getByLabel("Código del plan").fill("PLZ-NOEXISTE");
  await dialog.getByRole("button", { name: "Unirse al plan" }).click();

  await expect(dialog.getByRole("alert")).toHaveText("Plan no encontrado con este código");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Código del plan")).toHaveAttribute("aria-invalid", "true");
  await expect.poll(() => sent).toEqual([
    { event: "union_iniciada", props: {} },
    { event: "union_fallida", props: { motivo: "no_existe" } },
  ]);
});
