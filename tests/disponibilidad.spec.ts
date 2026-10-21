import { test, expect } from "@playwright/test"

test("asignar horario a días elegidos y marcar libre", async ({ page }) => {
  await page.goto("/admin/disponibilidad")
  await page.waitForLoadState("networkidle")
  const days = page.locator('button.sx-kk-date:not([disabled])[aria-label*="sin horario"]')
  await days.first().waitFor()
  const label = (await days.first().getAttribute("aria-label"))!.split(",")[0]!

  await days.first().click()
  await expect(page.getByRole("heading", { name: new RegExp(label, "i") })).toBeVisible()
  await page.getByLabel("Desde").fill("10:00")
  await page.getByLabel("Hasta").fill("12:00")
  await page.getByRole("radio", { name: "Solo este día" }).check()
  await page.getByRole("button", { name: "Guardar horario" }).click()
  await expect(page.getByText(/Horario agregado a 1 día/)).toBeVisible()

  // El día ahora tiene horario propio.
  const sameDay = page.locator(`button.sx-kk-date[aria-label^="${label}"]`)
  await expect(sameDay).toHaveAttribute("aria-label", /horario solo de este día/)

  // Marcarlo libre desde el panel.
  await sameDay.click()
  await page.getByRole("button", { name: "Marcar como día libre" }).click()
  await expect(page.getByText("Día marcado como libre")).toBeVisible()
  await expect(sameDay).toHaveAttribute("aria-label", /día libre/)

  // Y volver al horario semanal.
  await sameDay.click()
  await page.getByRole("button", { name: "Volver al horario semanal" }).click()
  await expect(page.getByText("Volvieron al horario semanal")).toBeVisible()
  await expect(sameDay).toHaveAttribute("aria-label", /sin horario/)
})
