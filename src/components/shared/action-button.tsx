"use client"

import { AnimatePresence, motion } from "motion/react"
import { Check, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ActionState = "idle" | "loading" | "success"

/**
 * Botón con estado de carga → confirmación ("Reservar", "Guardar").
 * Mantiene el ancho al cambiar de estado; el resultado se anuncia con toasts.
 */
export function ActionButton({
  state,
  children,
  loadingLabel = "Guardando…",
  successLabel = "Listo",
  className,
  disabled,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "children"> & {
  state: ActionState
  children: React.ReactNode
  loadingLabel?: string
  successLabel?: string
}) {
  const busy = state !== "idle"
  return (
    <Button
      {...props}
      disabled={disabled}
      aria-disabled={busy || undefined}
      aria-busy={state === "loading" || undefined}
      data-state={state}
      onClick={busy ? (e) => e.preventDefault() : props.onClick}
      className={cn("relative overflow-hidden", state === "success" && "bg-success text-primary-foreground hover:bg-success", className)}
    >
      {/* Sin aria-live aquí: el resultado lo anuncian los toasts de Sileo. */}
      {busy && <span className="sr-only">{state === "loading" ? loadingLabel : successLabel}</span>}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={state}
          aria-hidden={busy || undefined}
          className="inline-flex items-center gap-2"
          initial={{ y: 14, opacity: 0, filter: "blur(4px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: -14, opacity: 0, filter: "blur(4px)" }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {state === "idle" && children}
          {state === "loading" && (
            <>
              <LoaderCircle className="animate-spin motion-reduce:animate-none" strokeWidth={1.5} />
              {loadingLabel}
            </>
          )}
          {state === "success" && (
            <>
              <Check strokeWidth={1.75} />
              {successLabel}
            </>
          )}
        </motion.span>
      </AnimatePresence>
    </Button>
  )
}
