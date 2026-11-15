import { test, expect, type Browser, type Page } from "@playwright/test";
import { createPlan, planCard, signUpNewUser, uniqueName, type TestUser } from "./support/planazo";

async function newGuest(browser: Browser) {
  const page = await browser.newPage();
  const user = await signUpNewUser(page, "Caro");
  return { page, user };
}

async function inviteByEmail(page: Page, title: string, guest: TestUser) {
  await planCard(page, title).getByRole("button", { name: "Fechas y lugares" }).click();
  const dialog = page.getByRole("dialog", { name: "Fechas y lugares" });
  const email = dialog.getByLabel("Invitar por correo");
  await email.fill(guest.email);
  await dialog.getByRole("button", { name: "Invitar" }).click();
  await expect(email).toHaveValue("");
  return dialog;
}

async function openExpenses(page: Page, title: string) {
  await page.reload();
  await planCard(page, title).getByRole("button", { name: "Gastos" }).click();
  const dialog = page.getByRole("dialog", { name: "Gastos" });
  await expect(dialog.getByRole("heading", { name: "Saldos" })).toBeVisible();
  return dialog;
}

function invitation(page: Page, title: string) {
  return page
    .getByRole("region", { name: "Invitaciones pendientes" })
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}

test("La persona invitada no entra al plan ni a los gastos hasta que acepta", async ({ page, browser }) => {
  test.slow();
  const title = uniqueName("Plan con invitación");
  const caro = await newGuest(browser);
  const ana = await signUpNewUser(page, "Ana");
  await createPlan(page, title);

  await test.step("Ana invita a Caro por correo", async () => {
    await inviteByEmail(page, title, caro.user);
    await page.keyboard.press("Escape");
  });

  await test.step("Caro todavía no aparece en el reparto de los gastos", async () => {
    const dialog = await openExpenses(page, title);
    await expect(dialog.getByRole("checkbox", { name: caro.user.name })).toHaveCount(0);
    await expect(dialog.getByRole("list", { name: "Saldos" })).not.toContainText(caro.user.name);
    await page.keyboard.press("Escape");
  });

  await test.step("Caro ve la invitación con lo que implica y dos botones iguales", async () => {
    await caro.page.reload();
    const card = invitation(caro.page, title);
    await expect(card).toContainText(`Organiza: ${ana.name}`);
    await expect(card).toContainText("podrán incluirte en los gastos del plan");
    const accept = card.getByRole("button", { name: "Unirme al plan" });
    const decline = card.getByRole("button", { name: "Rechazar" });
    await expect(accept).toHaveAttribute("class", (await decline.getAttribute("class")) ?? "");
    await expect(planCard(caro.page, title)).toHaveCount(0);
  });

  await test.step("Caro acepta y recién entonces entra al plan y al reparto", async () => {
    await invitation(caro.page, title).getByRole("button", { name: "Unirme al plan" }).click();
    await expect(planCard(caro.page, title)).toBeVisible();
    await expect(invitation(caro.page, title)).toHaveCount(0);

    const dialog = await openExpenses(page, title);
    await expect(dialog.getByRole("checkbox", { name: caro.user.name })).toBeVisible();
  });

  await caro.page.context().close();
});

test("Si la persona rechaza la invitación, no entra al plan", async ({ page, browser }) => {
  test.slow();
  const title = uniqueName("Plan rechazado");
  const caro = await newGuest(browser);
  await signUpNewUser(page, "Ana");
  await createPlan(page, title);
  const dialog = await inviteByEmail(page, title, caro.user);
  await expect(dialog.getByText(`Invitación enviada a ${caro.user.name}`)).toBeVisible();
  await expect(dialog.getByRole("list", { name: "Invitaciones pendientes" })).toContainText(caro.user.name);
  await page.keyboard.press("Escape");

  await caro.page.reload();
  await invitation(caro.page, title).getByRole("button", { name: "Rechazar" }).click();
  await expect(invitation(caro.page, title)).toHaveCount(0);
  await caro.page.reload();
  await expect(planCard(caro.page, title)).toHaveCount(0);

  await page.reload();
  await planCard(page, title).getByRole("button", { name: "Fechas y lugares" }).click();
  const ownerDialog = page.getByRole("dialog", { name: "Fechas y lugares" });
  await expect(ownerDialog.getByRole("heading", { name: "Opciones para coordinar" })).toBeVisible();
  await expect(ownerDialog).not.toContainText(caro.user.name);

  await caro.page.context().close();
});
