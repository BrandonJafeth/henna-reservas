import type { Metadata, Viewport } from "next"
import "../globals.css"
import { fontVariables } from "@/lib/fonts"
import { ThemeScript } from "@/components/providers/theme-script"
import { AppProviders } from "@/components/providers/app-providers"

export const metadata: Metadata = {
  title: {
    default: "Panel · K&K Henna Artistry",
    template: "%s · Panel K&K",
  },
  robots: { index: false, follow: false, nocache: true },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF8F3" },
    { media: "(prefers-color-scheme: dark)", color: "#241A16" },
  ],
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CR" className={fontVariables} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh">
        <AppProviders toastPosition="top-right">{children}</AppProviders>
      </body>
    </html>
  )
}
