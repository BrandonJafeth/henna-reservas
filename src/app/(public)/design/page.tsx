import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { DesignShowcase } from "@/components/design/design-showcase"

export const metadata: Metadata = {
  title: "Sistema de diseño",
  robots: { index: false, follow: false },
}

/** Solo en desarrollo. En producción responde 404. */
export default function DesignPage() {
  if (process.env.NODE_ENV === "production") notFound()
  return (
    <main id="contenido">
      <DesignShowcase />
    </main>
  )
}
