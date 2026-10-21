import type { Metadata, Viewport } from "next"
import "../globals.css"
import { fontVariables } from "@/lib/fonts"
import { AppProviders } from "@/components/providers/app-providers"

export const metadata: Metadata = {
  title: {
    default: "Panel · K&K Henna Artistry",
    template: "%s · Panel K&K",
  },
  robots: { index: false, follow: false, nocache: true },
}

export const viewport: Viewport = {
  themeColor: "#F6F3EE",
  colorScheme: "light",
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CR" className={fontVariables}>
      <body className="min-h-dvh">
        <AppProviders toastPosition="top-right">{children}</AppProviders>
      </body>
    </html>
  )
}
