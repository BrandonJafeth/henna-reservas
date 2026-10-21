import { test } from "@playwright/test"

/** Capturas para revisión visual: `pnpm test:shots` (no corre con test:a11y). */

const OUT = process.env.SHOTS_DIR ?? "docs/capturas"

for (const theme of ["light", "dark"] as const) {
  test(`capturas ${theme}`, async ({ page }, info) => {
    await page.addInitScript((t) => localStorage.setItem("kk-theme", t), theme)
    const tag = `${info.project.name}-${theme}`

    await page.goto("/reservar")
    await page.getByRole("heading", { name: "Tu diseño" }).waitFor()
    await page.screenshot({ path: `${OUT}/reservar-1-${tag}.png`, fullPage: true })

    await page.locator('input[type="file"]').setInputFiles({
      name: "diseno.svg",
      mimeType: "image/png",
      buffer: Buffer.from(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8cfc0f01f0005000201a3e1fb3f0000000049454e44ae426082",
        "hex",
      ),
    })
    await page.getByRole("button", { name: "Continuar" }).click()
    await page.getByRole("heading", { name: "¿De qué tamaño?" }).waitFor()
    await page.getByRole("slider").focus()
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await page.keyboard.press("ArrowRight")
    await page.waitForTimeout(700)
    await page.screenshot({ path: `${OUT}/reservar-2-${tag}.png`, fullPage: true })

    await page.goto("/admin/disponibilidad")
    await page.getByRole("heading", { name: "Lunes" }).waitFor()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/disponibilidad-semanal-${tag}.png`, fullPage: true })
    await page.getByRole("tab", { name: "Calendario" }).click()
    await page.getByRole("button", { name: "Semana siguiente" }).waitFor()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/disponibilidad-calendario-${tag}.png`, fullPage: true })
  })
}
