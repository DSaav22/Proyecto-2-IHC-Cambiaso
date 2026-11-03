import { test, expect, type Browser, type Page } from "@playwright/test";
import { createPlan, planCard, signUpNewUser, uniqueName, type TestUser } from "./support/planazo";

async function openCoordination(page: Page, planTitle: string) {
  await planCard(page, planTitle).getByRole("button", { name: "Fechas y lugares" }).click();
  const dialog = page.getByRole("dialog", { name: "Fechas y lugares" });
  await expect(dialog.getByRole("heading", { name: "Propuestas" })).toBeVisible();
  return dialog;
}

async function planWithGuest(page: Page, browser: Browser, title: string) {
  const guestPage = await browser.newPage();
  const guest: TestUser = await signUpNewUser(guestPage, "Invitada");

  await signUpNewUser(page, "Organiza");
  await createPlan(page, title);
  const ownerDialog = await openCoordination(page, title);
  await ownerDialog.getByLabel("Invitar por correo").fill(guest.email);
  await ownerDialog.getByRole("button", { name: "Invitar" }).click();
  await expect(ownerDialog.getByText(guest.name)).toBeVisible();

  await guestPage.reload();
  return { guestPage, ownerDialog };
}

test("Se vota por varias opciones, se quita un voto y, cerrada, ya no se puede votar", async ({
  page,
  browser,
}) => {
  test.slow();
  const title = uniqueName("Plan con votación");
  const parque = "Lugar: Parque E2E";
  const cine = "Lugar: Cine E2E";

  const { guestPage, ownerDialog } = await planWithGuest(page, browser, title);
  const option = (text: string) => ownerDialog.getByRole("listitem").filter({ hasText: text });

  await test.step("Quien organiza propone dos lugares", async () => {
    for (const place of ["Parque E2E", "Cine E2E"]) {
      await ownerDialog.getByLabel("Tipo").selectOption({ label: "Lugar" });
      await ownerDialog.getByLabel("Lugar", { exact: true }).fill(place);
      await ownerDialog.getByRole("button", { name: "Proponer" }).click();
      await expect(ownerDialog.getByText(`Lugar: ${place}`)).toBeVisible();
    }
  });

  await test.step("Vota por las dos opciones a la vez", async () => {
    await ownerDialog.getByRole("button", { name: `Votar por ${parque}` }).click();
    await ownerDialog.getByRole("button", { name: `Votar por ${cine}` }).click();

    await expect(option(parque)).toContainText("1 voto · Votaste esta opción");
    await expect(option(cine)).toContainText("1 voto · Votaste esta opción");
  });

  await test.step("Quita su voto del cine y el conteo baja", async () => {
    await ownerDialog.getByRole("button", { name: `Quitar voto de ${cine}` }).click();

    await expect(option(cine)).toContainText("0 votos");
    await expect(option(cine)).not.toContainText("Votaste esta opción");
    await expect(option(parque)).toContainText("1 voto");
  });

  await test.step("La invitada vota por el parque y el conteo sube a 2", async () => {
    const guestDialog = await openCoordination(guestPage, title);
    await guestDialog.getByRole("button", { name: `Votar por ${parque}` }).click();

    await expect(guestDialog.getByRole("listitem").filter({ hasText: parque })).toContainText(
      "2 votos · Votaste esta opción",
    );
  });

  await test.step("Quien organiza cierra la votación", async () => {
    await ownerDialog.getByRole("button", { name: "Cerrar votación" }).click();
    const confirm = page.getByRole("alertdialog", { name: "¿Cerrar la votación?" });
    await confirm.getByRole("button", { name: "Cerrar votación" }).click();

    await expect(confirm).toBeHidden();
    await expect(ownerDialog.getByText("La votación está cerrada.")).toBeVisible();
    await expect(option(parque)).toContainText("2 votos");
  });

  await test.step("Con la votación cerrada, la invitada ya no puede votar", async () => {
    await guestPage.reload();
    const guestDialog = await openCoordination(guestPage, title);

    await expect(guestDialog.getByText("La votación está cerrada.")).toBeVisible();
    await expect(guestDialog.getByRole("button", { name: /^(Votar por|Quitar voto de)/ })).toHaveCount(0);
    await expect(guestDialog.getByRole("button", { name: "Proponer" })).toHaveCount(0);
  });

  await guestPage.context().close();
});

test("Solo quien creó el plan ve el botón para cerrar la votación", async ({ page, browser }) => {
  test.slow();
  const title = uniqueName("Plan sin cierre para invitados");

  const { guestPage, ownerDialog } = await planWithGuest(page, browser, title);
  await expect(ownerDialog.getByRole("button", { name: "Cerrar votación" })).toBeVisible();

  const guestDialog = await openCoordination(guestPage, title);
  await expect(guestDialog.getByRole("button", { name: "Proponer" })).toBeVisible();
  await expect(guestDialog.getByRole("button", { name: "Cerrar votación" })).toHaveCount(0);

  await guestPage.context().close();
});
