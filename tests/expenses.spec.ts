import { test, expect, type Browser, type Locator, type Page } from "@playwright/test";
import { createPlan, planCard, signUpNewUser, uniqueName, type TestUser } from "./support/planazo";

async function invite(page: Page, planTitle: string, people: TestUser[]) {
  await planCard(page, planTitle).getByRole("button", { name: "Fechas y lugares" }).click();
  const dialog = page.getByRole("dialog", { name: "Fechas y lugares" });
  for (const person of people) {
    await dialog.getByLabel("Invitar por correo").fill(person.email);
    await dialog.getByRole("button", { name: "Invitar" }).click();
    await expect(dialog.getByText(person.name)).toBeVisible();
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

async function openExpenses(page: Page, planTitle: string) {
  await planCard(page, planTitle).getByRole("button", { name: "Gastos" }).click();
  const dialog = page.getByRole("dialog", { name: "Gastos" });
  await expect(dialog.getByRole("heading", { name: "Saldos" })).toBeVisible();
  return dialog;
}

async function reopenExpenses(page: Page, planTitle: string) {
  await page.reload();
  return openExpenses(page, planTitle);
}

function balanceOf(dialog: Locator, person: TestUser): Locator {
  return dialog.getByRole("list", { name: "Saldos" }).getByRole("listitem").filter({ hasText: person.name });
}

function paymentRow(dialog: Locator, text: string): Locator {
  return dialog.getByRole("list", { name: "Pagos" }).getByRole("listitem").filter({ hasText: text });
}

async function addEqualExpense(dialog: Locator, description: string, amount: string, payer: TestUser) {
  await dialog.getByLabel("Descripción del gasto").fill(description);
  await dialog.getByLabel("Monto total (Bs)").fill(amount);
  await dialog.getByLabel("Pagó", { exact: true }).selectOption({ label: payer.name });
  await dialog.getByLabel("Partes iguales").check();
  await dialog.getByRole("button", { name: "Agregar gasto" }).click();
}

async function fillCustomExpense(
  dialog: Locator,
  description: string,
  amount: string,
  payer: TestUser,
  shares: [TestUser, string][],
) {
  await dialog.getByLabel("Descripción del gasto").fill(description);
  await dialog.getByLabel("Monto total (Bs)").fill(amount);
  await dialog.getByLabel("Pagó", { exact: true }).selectOption({ label: payer.name });
  await dialog.getByLabel("Montos personalizados").check();
  for (const [person, value] of shares) {
    await dialog.getByLabel(`Monto de ${person.name}`).fill(value);
  }
}

async function registerPayment(dialog: Locator, to: TestUser, amount: string) {
  await dialog.getByLabel("Pagar a").selectOption({ label: to.name });
  await dialog.getByLabel("Monto del pago (Bs)").fill(amount);
  await dialog.getByRole("button", { name: "Registrar pago" }).click();
}

async function newParticipant(browser: Browser, prefix: string) {
  const page = await browser.newPage();
  const user = await signUpNewUser(page, prefix);
  return { page, user };
}

async function planIdByTitle(page: Page, title: string): Promise<string> {
  const response = await page.request.get("/api/plans");
  const { plans } = (await response.json()) as { plans: { id: string; titulo: string }[] };
  const plan = plans.find((item) => item.titulo === title);
  if (!plan) throw new Error(`No se encontró el plan ${title}`);
  return plan.id;
}

test("Tres participantes, dos gastos y un pago pendiente que se confirma y actualiza los saldos", async ({
  page,
  browser,
}) => {
  test.slow();
  const title = uniqueName("Plan con gastos");
  const beto = await newParticipant(browser, "Beto");
  const caro = await newParticipant(browser, "Caro");
  const ana = await signUpNewUser(page, "Ana");
  await createPlan(page, title);
  await invite(page, title, [beto.user, caro.user]);

  const anaDialog = await openExpenses(page, title);

  await test.step("Ana paga la cena de Bs 300 y se divide en partes iguales", async () => {
    await addEqualExpense(anaDialog, "Cena", "300", ana);
    await expect(anaDialog.getByText("Cena · Bs 300,00")).toBeVisible();
    await expect(balanceOf(anaDialog, ana)).toContainText("Le deben Bs 200,00");
    await expect(balanceOf(anaDialog, beto.user)).toContainText("Debe Bs 100,00");
    await expect(balanceOf(anaDialog, caro.user)).toContainText("Debe Bs 100,00");
  });

  await test.step("Beto paga un taxi de Bs 120 con montos personalizados", async () => {
    await fillCustomExpense(anaDialog, "Taxi", "120", beto.user, [
      [ana, "20"],
      [beto.user, "60"],
      [caro.user, "40"],
    ]);
    await expect(anaDialog.getByText("Suman Bs 120,00 de Bs 120,00")).toBeVisible();
    await anaDialog.getByRole("button", { name: "Agregar gasto" }).click();

    await expect(anaDialog.getByText("Taxi · Bs 120,00")).toBeVisible();
    await expect(balanceOf(anaDialog, ana)).toContainText("Le deben Bs 180,00");
    await expect(balanceOf(anaDialog, beto.user)).toContainText("Debe Bs 40,00");
    await expect(balanceOf(anaDialog, caro.user)).toContainText("Debe Bs 140,00");
  });

  await test.step("Caro registra un pago a Ana y queda pendiente sin cambiar saldos", async () => {
    await caro.page.reload();
    const caroDialog = await openExpenses(caro.page, title);
    await expect(caroDialog.getByText("Debes Bs 140,00")).toBeVisible();

    await registerPayment(caroDialog, ana, "140");
    const row = paymentRow(caroDialog, `${caro.user.name} le paga Bs 140,00 a ${ana.name}`);
    await expect(row).toContainText("Pendiente de confirmación");
    await expect(row.getByRole("button", { name: /Confirmar pago/ })).toHaveCount(0);
    await expect(balanceOf(caroDialog, caro.user)).toContainText("Debe Bs 140,00");
    await expect(balanceOf(caroDialog, ana)).toContainText("Le deben Bs 180,00");
  });

  await test.step("Ana confirma el pago y se actualizan los dos saldos", async () => {
    const dialog = await reopenExpenses(page, title);
    await expect(balanceOf(dialog, ana)).toContainText("Le deben Bs 180,00");

    await dialog.getByRole("button", { name: `Confirmar pago de ${caro.user.name}` }).click();

    await expect(paymentRow(dialog, caro.user.name)).toContainText("Confirmado");
    await expect(balanceOf(dialog, ana)).toContainText("Le deben Bs 40,00");
    await expect(balanceOf(dialog, caro.user)).toContainText("Al día");
    await expect(balanceOf(dialog, beto.user)).toContainText("Debe Bs 40,00");
  });

  await test.step("Al recargar, los gastos, el pago y los saldos siguen guardados", async () => {
    const dialog = await reopenExpenses(page, title);
    await expect(dialog.getByRole("list", { name: "Gastos registrados" }).getByRole("listitem")).toHaveCount(2);
    await expect(paymentRow(dialog, caro.user.name)).toContainText("Confirmado");
    await expect(balanceOf(dialog, ana)).toContainText("Le deben Bs 40,00");

    const caroDialog = await reopenExpenses(caro.page, title);
    await expect(balanceOf(caroDialog, caro.user)).toContainText("Al día");
  });

  await beto.page.context().close();
  await caro.page.context().close();
});

test("Restricciones: la división debe sumar el total, un solo pago pendiente, solo confirma quien recibe y nunca dos veces", async ({
  page,
  browser,
}) => {
  test.slow();
  const title = uniqueName("Plan con restricciones");
  const beto = await newParticipant(browser, "Beto");
  const ana = await signUpNewUser(page, "Ana");
  await createPlan(page, title);
  await invite(page, title, [beto.user]);
  const anaDialog = await openExpenses(page, title);

  await test.step("Una división personalizada que no suma el total se rechaza", async () => {
    await fillCustomExpense(anaDialog, "Entradas", "120", ana, [
      [ana, "20"],
      [beto.user, "60"],
    ]);
    await anaDialog.getByRole("button", { name: "Agregar gasto" }).click();

    await expect(anaDialog.getByRole("alert")).toHaveText(
      "Los montos suman Bs 80,00 y el gasto es de Bs 120,00.",
    );
    await expect(anaDialog.getByText("Todavía no hay gastos.")).toBeVisible();
  });

  await test.step("Con un gasto válido, Beto queda debiendo Bs 50", async () => {
    await addEqualExpense(anaDialog, "Almuerzo", "100", ana);
    await expect(balanceOf(anaDialog, beto.user)).toContainText("Debe Bs 50,00");
  });

  const betoDialog = await reopenExpenses(beto.page, title);

  await test.step("Beto no puede dejar dos pagos pendientes a la misma persona", async () => {
    await registerPayment(betoDialog, ana, "20");
    await expect(paymentRow(betoDialog, "Bs 20,00")).toContainText("Pendiente de confirmación");

    await registerPayment(betoDialog, ana, "30");
    await expect(betoDialog.getByRole("alert")).toHaveText(
      "Ya tienes un pago pendiente con esa persona. Espera a que lo confirme o lo rechace.",
    );
    await expect(betoDialog.getByRole("list", { name: "Pagos" }).getByRole("listitem")).toHaveCount(1);
  });

  const planId = await planIdByTitle(page, title);
  const board = await (await page.request.get(`/api/plans/${planId}/expenses`)).json();
  const paymentId = board.payments[0].id as string;
  const confirmUrl = `/api/plans/${planId}/payments/${paymentId}/confirm`;

  await test.step("Quien paga no puede confirmar su propio pago", async () => {
    const response = await beto.page.request.post(confirmUrl);
    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({
      message: "Solo quien recibe el pago puede confirmarlo o rechazarlo.",
    });
  });

  await test.step("Ana confirma una vez; una segunda confirmación no vuelve a descontar", async () => {
    const dialog = await reopenExpenses(page, title);
    await dialog.getByRole("button", { name: `Confirmar pago de ${beto.user.name}` }).click();
    await expect(paymentRow(dialog, "Bs 20,00")).toContainText("Confirmado");
    await expect(balanceOf(dialog, beto.user)).toContainText("Debe Bs 30,00");

    const again = await page.request.post(confirmUrl);
    expect(again.status()).toBe(409);
    expect(await again.json()).toEqual({ message: "Este pago ya fue confirmado o rechazado." });

    const reloaded = await reopenExpenses(page, title);
    await expect(balanceOf(reloaded, beto.user)).toContainText("Debe Bs 30,00");
  });

  await test.step("Un pago rechazado con motivo no baja la deuda", async () => {
    const dialog = await reopenExpenses(beto.page, title);
    await registerPayment(dialog, ana, "30");
    await expect(paymentRow(dialog, "Bs 30,00")).toContainText("Pendiente de confirmación");

    const anaView = await reopenExpenses(page, title);
    await anaView.getByRole("button", { name: `Rechazar pago de ${beto.user.name}` }).click();
    await anaView.getByLabel("Motivo del rechazo").fill("No me llegó la transferencia");
    await anaView.getByRole("button", { name: "Enviar rechazo" }).click();

    const rejected = paymentRow(anaView, "Bs 30,00");
    await expect(rejected).toContainText("Rechazado");
    await expect(rejected).toContainText("Motivo: No me llegó la transferencia");
    await expect(balanceOf(anaView, beto.user)).toContainText("Debe Bs 30,00");
  });

  await beto.page.context().close();
});
