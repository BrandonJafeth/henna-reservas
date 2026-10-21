import { test } from "@playwright/test"
test("aside", async ({ page }) => {
  await page.goto("/reservar"); await page.getByRole("heading", { name: "Tu diseño" }).waitFor(); await page.waitForTimeout(600)
  const m = await page.evaluate(() => {
    const vis = (els: Element[]) => els.find((e) => (e as HTMLElement).offsetParent !== null)!
    const c = (el: Element) => { const r = el.getBoundingClientRect(); return Math.round(r.left + r.width / 2) }
    const h = document.querySelector("header")!
    return { logo: c(vis([...h.querySelectorAll('[aria-label="K&K Henna Artistry"]')])), h1: c(h.querySelector("h1")!), card: c(h.querySelector("section")!) }
  })
  console.log("CENTERS", JSON.stringify(m))
  await page.screenshot({ path: "test-results/aside.png" })
})
