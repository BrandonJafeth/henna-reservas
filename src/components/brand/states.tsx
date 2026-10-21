"use client"

import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CalendarLeaf, HandMotif, JaguaBranch, Ledger } from "./illustrations"

const art = { branch: JaguaBranch, calendar: CalendarLeaf, hand: HandMotif, ledger: Ledger }

/** Estado vacío cálido con ilustración lineal. */
export function EmptyState({
  title,
  description,
  illustration = "branch",
  action,
  className,
}: {
  title: string
  description?: string
  illustration?: keyof typeof art
  action?: React.ReactNode
  className?: string
}) {
  const Art = art[illustration]
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <Art className="mb-5 h-20 w-24 text-accent" />
      <p className="font-display text-2xl text-foreground">{title}</p>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

/** Estado de error con reintento. */
export function ErrorState({
  title = "No pudimos cargar esto",
  description = "Revisá tu conexión e intentá de nuevo. Si sigue pasando, escribinos.",
  onRetry,
  className,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center rounded-lg border border-destructive/30 px-6 py-10 text-center", className)}
    >
      <p className="font-display text-2xl text-foreground">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          <RotateCcw strokeWidth={1.5} />
          Intentar de nuevo
        </Button>
      )}
    </div>
  )
}
