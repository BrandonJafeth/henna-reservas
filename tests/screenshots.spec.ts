import { test } from "@playwright/test"

/** Capturas para revisión visual: `pnpm test:shots` (no corre con test:a11y). */

const OUT = process.env.SHOTS_DIR ?? "docs/capturas"

{
  test("capturas", async ({ page }, info) => {
    const tag = info.project.name

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
    await page.getByRole("heading", { name: "Elegí días en el calendario" }).waitFor()
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${OUT}/disponibilidad-${tag}.png`, fullPage: true })
    const days = page.locator("button.sx-kk-date:not([disabled])")
    await days.nth(2).click()
    await days.nth(4).click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/disponibilidad-seleccion-${tag}.png`, fullPage: true })
    await page.getByRole("switch", { name: "Ver a todas las artistas" }).click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/disponibilidad-equipo-${tag}.png`, fullPage: true })

    await page.goto("/admin/citas?vista=calendario")
    await page.getByRole("region", { name: "Calendario de citas" }).waitFor()
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${OUT}/citas-calendario-${tag}.png`, fullPage: true })

    await page.goto("/admin/citas?fecha=todas")
    await page.getByRole("heading", { name: "Citas", level: 1 }).waitFor()
    await page.waitForTimeout(900)
    await page.getByRole("button", { name: /Natalia/ }).first().click()
    await page.getByRole("dialog").waitFor()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${OUT}/citas-detalle-${tag}.png` })
  })
}
