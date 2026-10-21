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
  const empty = page.getByRole("heading", { name: "Elegí días en el calendario" })
  await expect(empty).toBeVisible()

  // El día ahora tiene horario propio.
  const sameDay = page.locator(`button.sx-kk-date[aria-label^="${label}"]`)
  await expect(sameDay).toHaveAttribute("aria-label", /horario solo de este día/)

  // Marcarlo libre desde el panel.
  await sameDay.click()
  await page.getByRole("button", { name: "Marcar como día libre" }).click()
  await expect(page.getByText("Día marcado como libre")).toBeVisible()
  await expect(empty).toBeVisible()
  await expect(sameDay).toHaveAttribute("aria-label", /día libre/)

  // Y volver al horario semanal.
  await sameDay.click()
  await page.getByRole("button", { name: "Volver al horario semanal" }).click()
  await expect(page.getByText("Volvieron al horario semanal")).toBeVisible()
  await expect(sameDay).toHaveAttribute("aria-label", /sin horario/)
})

test("los modales quedan por encima del calendario", async ({ page }) => {
  for (const [url, open] of [
    ["/admin/disponibilidad", async () => { await page.locator('button.sx-kk-date:not([disabled])[aria-label*="horario semanal"]').first().click(); await page.getByRole("button", { name: /, editar/ }).first().click() }],
    ["/admin/citas?vista=calendario", async () => { await page.locator(".sx__event").first().click() }],
  ] as const) {
    await page.goto(url); await page.waitForTimeout(2500)
    await open()
    const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible(); await page.waitForTimeout(400)
    // El elemento visible en el centro del modal debe pertenecer al modal.
    const box = (await dialog.boundingBox())!
    const ok = await page.evaluate(({ x, y }) => {
      const pts = [[x + 20, y + 20], [x + 60, y + 120], [x + 30, y + 200]]
      return pts.every(([px, py]) => !!document.elementFromPoint(px!, py!)?.closest('[role="dialog"]'))
    }, { x: box.x, y: box.y })
    expect(ok, `modal tapado por el calendario en ${url}`).toBe(true)
    await page.keyboard.press("Escape")
  }
})
