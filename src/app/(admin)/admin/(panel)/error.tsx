"use client"

import { ErrorState } from "@/components/brand/states"

export default function PanelError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-16">
      <ErrorState
        title="Algo no cargó bien"
        description="No pudimos traer esta sección. Probá de nuevo; si sigue pasando, revisá tu conexión."
        onRetry={reset}
      />
    </div>
  )
}
