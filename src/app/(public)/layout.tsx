import type { Metadata, Viewport } from "next"
import "../globals.css"
import { fontVariables } from "@/lib/fonts"
import { ThemeScript } from "@/components/providers/theme-script"
import { AppProviders } from "@/components/providers/app-providers"

export const metadata: Metadata = {
  title: {
    default: "Reservá tu cita · K&K Henna Artistry",
    template: "%s · K&K Henna Artistry",
  },
  description:
    "Arte en la piel con tinta de jagua en Nicoya y Hojancha. Enviá tu diseño y reservá tu cita con K&K Henna Artistry.",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5EFE8" },
    { media: "(prefers-color-scheme: dark)", color: "#1E1512" },
  ],
}

export default function PublicRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CR" className={fontVariables} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh">
        <AppProviders toastPosition="top-center">{children}</AppProviders>
      </body>
    </html>
  )
}
