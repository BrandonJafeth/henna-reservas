"use client"

import { Logo } from "@/components/brand/logo"
import { ErrorState } from "@/components/brand/states"

export default function ReservarError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-10 px-4">
      <Logo size="sm" />
      <ErrorState
        title="No pudimos abrir las reservas"
        description="Puede ser un problema de conexión. Intentá de nuevo o escribinos por WhatsApp."
        onRetry={reset}
      />
    </main>
  )
}
