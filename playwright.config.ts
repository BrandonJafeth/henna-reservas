import { defineConfig, devices } from "@playwright/test"

const PORT = Number(process.env.PORT ?? 3100)
const baseURL = process.env.BASE_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  fullyParallel: false,
  // El mock guarda reservas en memoria: en serie para que dos proyectos no choquen por el mismo horario.
  workers: 1,
  reporter: [["list"]],
  use: { baseURL, locale: "es-CR", timezoneId: "America/Costa_Rica" },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "movil", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: `${baseURL}/reservar`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
