"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { STEPS } from "./wizard-model"

/** Progreso accesible: lista ordenada, paso actual con aria-current, pasos visitados navegables. */
export function WizardProgress({
  current,
  furthest,
  onGo,
}: {
  current: number
  furthest: number
  onGo: (step: number) => void
}) {
  return (
    <nav aria-label="Progreso de la reserva" className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Paso <span className="tabular text-foreground">{current + 1}</span> de {STEPS.length}
        <span aria-hidden> · </span>
        <span className="text-foreground">{STEPS[current]!.title}</span>
      </p>
      <ol className="flex gap-1.5">
        {STEPS.map((s, i) => {
          const done = i < current || (i <= furthest && i !== current)
          const isCurrent = i === current
          const reachable = i <= furthest && !isCurrent
          const bar = (
            <>
              <span
                aria-hidden
                className={cn(
                  "block h-1 w-full rounded-full transition-colors duration-300",
                  isCurrent ? "bg-primary" : done ? "bg-accent" : "bg-border",
                )}
              />
              <span
                className={cn(
                  "mt-2 hidden items-center gap-1 text-xs lg:flex",
                  isCurrent ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {done && !isCurrent && <Check aria-hidden className="size-3 text-success" strokeWidth={2} />}
                {s.title}
              </span>
              <span className="sr-only lg:hidden">{s.title}</span>
              <span className="sr-only">{isCurrent ? " (paso actual)" : done ? " (completado)" : " (pendiente)"}</span>
            </>
          )
          return (
            <li key={s.key} className="flex-1" aria-current={isCurrent ? "step" : undefined}>
              {reachable ? (
                <button
                  type="button"
                  onClick={() => onGo(i)}
                  className="group flex min-h-6 w-full flex-col items-start rounded-sm py-1 text-left hover:[&>span:first-child]:bg-primary/70"
                >
                  {bar}
                </button>
              ) : (
                <span className="flex min-h-6 w-full flex-col items-start py-1">{bar}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
