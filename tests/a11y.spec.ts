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

    test("/admin/disponibilidad · calendario", async ({ page }) => {
      await page.goto("/admin/disponibilidad")
      await expect(page.getByRole("heading", { name: "Disponibilidad", level: 1 })).toBeVisible()
      await expect(page.getByRole("region", { name: /Calendario de disponibilidad/ })).toBeVisible()
      await expect(page.getByRole("heading", { name: "Elegí días en el calendario" })).toBeVisible()
      await audit(page, "calendario sin selección")

      // Elegir días con teclado: el número de cada día es un botón real.
      const days = page.locator("button.sx-kk-date:not([disabled])")
      await days.nth(1).focus()
      await page.keyboard.press("Enter")
      await days.nth(3).click()
      await expect(page.getByRole("heading", { name: "2 días elegidos" })).toBeVisible()
      await expect(days.nth(1)).toHaveAttribute("aria-pressed", "true")
      await audit(page, "panel con dos días")

      // Un solo día con horario semanal: editar abre el modal con alcance.
      await page.getByRole("button", { name: "Quitar la selección" }).click()
      const withBlocks = page.locator('button.sx-kk-date:not([disabled])[aria-label*="horario semanal"]').first()
      await withBlocks.click()
      await page.getByRole("button", { name: /, editar/ }).first().click()
      await expect(page.getByRole("dialog", { name: "Editar horario" })).toBeVisible()
      await expect(page.getByRole("radio", { name: /^Todos los / })).toBeChecked()
      await audit(page, "modal editar horario")
    })

    test("/admin/citas · calendario", async ({ page }) => {
      await page.goto("/admin/citas?vista=calendario")
      await expect(page.getByRole("region", { name: "Calendario de citas" })).toBeVisible()
      await expect(page.getByRole("link", { name: "Calendario" })).toHaveAttribute("aria-current", "page")
      await audit(page, "citas en calendario")
    })

    test("/admin/disponibilidad · robots noindex", async ({ page }) => {
      await page.goto("/admin/disponibilidad")
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/)
    })
  })
}
