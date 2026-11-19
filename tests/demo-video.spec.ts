import { test } from "@playwright/test";
import { login, usuarioUno } from "./support/planazo";

/**
 * Graba el recorrido de demo para la presentación.
 * Uso (app en http://localhost:5173):
 *   pnpm exec playwright test tests/demo-video.spec.ts --project=chromium
 */
test.use({
  video: { mode: "on", size: { width: 1280, height: 720 } },
  viewport: { width: 1280, height: 720 },
  actionTimeout: 15_000,
});

test.setTimeout(120_000);

test("Video demo · flujos principales de Planazo", async ({ page }) => {
  await login(page, usuarioUno);
  await page.getByRole("region", { name: "Tus planes" }).waitFor();
  await page.waitForTimeout(1500);

  const firstCard = page.getByRole("article").first();
  await firstCard.waitFor({ state: "visible" });

  const fechas = firstCard.getByRole("button", { name: "Fechas y lugares" });
  if (await fechas.isVisible().catch(() => false)) {
    await fechas.click();
    await page.getByRole("dialog").waitFor({ state: "visible" });
    await page.waitForTimeout(1800);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
  }

  const gastos = firstCard.getByRole("button", { name: "Gastos" });
  if (await gastos.isVisible().catch(() => false)) {
    await gastos.click();
    await page.getByRole("dialog").waitFor({ state: "visible" });
    await page.waitForTimeout(1800);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
  }

  await page.getByRole("link", { name: /Mis datos de/ }).click();
  await page.getByRole("heading", { name: /Mis datos/i }).waitFor();
  await page.waitForTimeout(1800);

  const descargar = page.getByRole("button", { name: /Descargar JSON|Descargar/i }).first();
  if (await descargar.isVisible().catch(() => false)) {
    // no hace falta completar la descarga; alcanza con mostrar el control
    await descargar.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
  }

  const eliminar = page.getByRole("button", { name: /Eliminar mi cuenta|Eliminar/i }).first();
  if (await eliminar.isVisible().catch(() => false)) {
    await eliminar.click();
    await page.waitForTimeout(2000);
    const cancelar = page.getByRole("button", { name: /Cancelar|Quedarme|Cerrar|Entendido/i }).first();
    if (await cancelar.isVisible().catch(() => false)) {
      await cancelar.click();
    } else {
      await page.keyboard.press("Escape");
    }
  }

  await page.waitForTimeout(1200);
});
