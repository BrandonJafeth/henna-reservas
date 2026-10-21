import { test, expect, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

async function audit(page: Page, label: string) {
  // Esperar a que terminen las transiciones (opacidad de pestañas y pasos).
  await page.waitForTimeout(700)
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)
  expect(summary, `Violaciones de axe en ${label}`).toEqual([])
}

{
  test.describe("accesibilidad", () => {
    test("/reservar · pasos del formulario", async ({ page }) => {
      await page.goto("/reservar")
      await expect(page.getByRole("heading", { name: "Tu diseño" })).toBeVisible()
      await audit(page, "paso 1")

      // Continuar sin foto: el error aparece y el foco va al primer campo inválido.
      await page.getByRole("button", { name: "Continuar" }).click()
      await expect(page.getByText("Subí una foto de tu diseño para continuar")).toBeVisible()
      await audit(page, "paso 1 con error")

      // Subir foto y avanzar hasta el tamaño.
      await page.locator('input[type="file"]').setInputFiles({
        name: "diseno.png",
        mimeType: "image/png",
        buffer: Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex"),
      })
      await page.getByRole("button", { name: "Continuar" }).click()
      await expect(page.getByRole("heading", { name: "¿De qué tamaño?" })).toBeVisible()
      const thumb = page.getByRole("slider")
      await thumb.focus()
      await page.keyboard.press("ArrowRight")
      await page.keyboard.press("ArrowRight")
      await page.keyboard.press("ArrowRight")
      await expect(thumb).toHaveAttribute("aria-valuetext", /7 a 10 cm, ₡6\s500 a ₡7\s500/)
      await audit(page, "paso 2")

      await page.getByRole("button", { name: "Continuar" }).click()
      await expect(page.getByRole("heading", { name: "Lugar y artista" })).toBeVisible()
      await audit(page, "paso 3")
    })

    test("/admin/disponibilidad · pestañas", async ({ page }) => {
      await page.goto("/admin/disponibilidad")
      await expect(page.getByRole("heading", { name: "Disponibilidad", level: 1 })).toBeVisible()
      await expect(page.getByRole("tab", { name: "Horario semanal" })).toBeVisible()
      await expect(page.getByRole("heading", { name: "Lunes" })).toBeVisible()
      await audit(page, "horario semanal")

      await page.getByRole("tab", { name: "Excepciones" }).click()
      await expect(page.getByRole("button", { name: "Copiar semana anterior" })).toBeVisible()
      await audit(page, "excepciones")

      await page.getByRole("tab", { name: "Calendario" }).click()
      await expect(page.getByRole("button", { name: "Semana siguiente" })).toBeVisible()
      await audit(page, "calendario")

      await page.getByRole("tab", { name: "Horario semanal" }).click()
      await page.getByRole("button", { name: /Agregar bloque el lunes/ }).click()
      await expect(page.getByRole("dialog", { name: "Nuevo bloque de horario" })).toBeVisible()
      await audit(page, "diálogo de bloque")
    })

    test("/admin/disponibilidad · robots noindex", async ({ page }) => {
      await page.goto("/admin/disponibilidad")
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/)
    })
  })
}
