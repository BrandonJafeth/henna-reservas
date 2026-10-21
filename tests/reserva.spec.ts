import { test, expect } from "@playwright/test"

const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8cfc0f01f0005000201a3e1fb3f0000000049454e44ae426082",
  "hex",
)

test("flujo completo de reserva", async ({ page }) => {
  await page.goto("/reservar")
  await page.waitForLoadState("networkidle")
  const next = page.getByRole("button", { name: "Continuar" })

  // 1 · Diseño
  await page.locator('input[type="file"]').setInputFiles({ name: "diseno.png", mimeType: "image/png", buffer: PNG })
  await expect(page.getByText("diseno.png")).toBeVisible()
  await next.click()

  // 2 · Tamaño: sin elegir muestra error junto al campo y enfoca el slider
  await expect(page.getByRole("heading", { name: "¿De qué tamaño?" })).toBeVisible()
  await next.click()
  await expect(page.getByText("Elegí un tamaño", { exact: true })).toBeVisible()
  await expect(page.getByRole("slider")).toBeFocused()
  await page.getByRole("button", { name: "Mano completa" }).click()
  await expect(page.getByRole("button", { name: "Mano completa" })).toHaveAttribute("aria-pressed", "true")
  await next.click()

  // 3 · Lugar y artista
  await page.getByRole("radio", { name: /Nicoya/ }).click()
  await page.locator("label", { hasText: "Kimberly Rojas" }).click()
  await expect(page.getByRole("radio", { name: "Kimberly Rojas" })).toBeChecked()
  await next.click()

  // 4 · Fecha y hora: primer día habilitado y primera hora
  await expect(page.getByRole("heading", { name: "Día y hora" })).toBeVisible()
  const enabled = page.getByRole("button", { name: /, disponible/ })
  await enabled.first().click()
  await page.getByRole("button", { pressed: false, name: /a\. m\.|p\. m\./ }).first().click()
  await next.click()

  // 5 · Tus datos: errores sin borrar lo escrito
  await page.getByLabel("Nombre").fill("Valeria")
  await next.click()
  await expect(page.getByText("Escribí tu apellido")).toBeVisible()
  await expect(page.getByLabel("Apellido")).toBeFocused()
  await expect(page.getByLabel("Nombre")).toHaveValue("Valeria")
  await page.getByLabel("Apellido").fill("Chaves")
  await page.getByLabel("WhatsApp").fill("8812 4567")
  const care = page.getByRole("checkbox", { name: /cuidados de la piel/ })
  const privacy = page.getByRole("checkbox", { name: /aviso de privacidad/ })
  await care.click()
  await expect(care).toBeChecked()
  await privacy.click()
  await expect(privacy).toBeChecked()
  await next.click()

  // 6 · Resumen y envío
  await expect(page.getByRole("heading", { name: "Revisá tu reserva" })).toBeVisible()
  await expect(page.locator("form dl").getByText(/Mano completa/)).toBeVisible()
  await page.getByRole("button", { name: "Reservar" }).click()
  await expect(page.getByRole("heading", { name: "Recibimos tu solicitud." })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText("Te escribiremos por WhatsApp para confirmar tu cita")).toBeVisible()
})
