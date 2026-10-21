"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { bookingStepper, type BookingStepper, type StepId } from "./wizard-model"

/**
 * Progreso accesible a partir del estado de Stepperize: lista ordenada, paso
 * actual con aria-current y pasos ya completados navegables.
 */
export function WizardProgress({ stepper, onGo }: { stepper: BookingStepper; onGo: (id: StepId) => void }) {
  const steps = bookingStepper.steps
  // Se puede saltar a un paso si todos los anteriores están completos.
  const firstOpen = steps.findIndex((s) => !stepper.isComplete(s.id))
  const reachLimit = firstOpen === -1 ? steps.length - 1 : firstOpen

  return (
    <nav aria-label="Progreso de la reserva" className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Paso <span className="tabular text-foreground">{stepper.index + 1}</span> de {stepper.count}
        <span aria-hidden> · </span>
        <span className="text-foreground">{stepper.current.title}</span>
      </p>
      <ol className="flex gap-1.5">
        {steps.map((s, i) => {
          const isCurrent = stepper.status(s.id) === "active"
          const done = !isCurrent && stepper.isComplete(s.id)
          const reachable = !isCurrent && i <= reachLimit
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
                {done && <Check aria-hidden className="size-3 text-success" strokeWidth={2} />}
                {s.title}
              </span>
              <span className="sr-only lg:hidden">{s.title}</span>
              <span className="sr-only">{isCurrent ? " (paso actual)" : done ? " (completado)" : " (pendiente)"}</span>
            </>
          )
          return (
            <li key={s.id} className="flex-1" aria-current={isCurrent ? "step" : undefined}>
              {reachable ? (
                <button
                  type="button"
                  onClick={() => onGo(s.id)}
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
