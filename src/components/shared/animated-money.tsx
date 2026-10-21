"use client"

import { SlidingNumber } from "@animate-ui/react/primitives/texts/sliding-number"
import { formatCRC, formatCRCRange } from "@/lib/format"
import { cn } from "@/lib/utils"

const NBSP = " "

/**
 * Monto en colones con Sliding Number. La versión animada es decorativa
 * (aria-hidden); los lectores de pantalla leen el texto formateado.
 */
export function AnimatedCRC({ amount, className }: { amount: number; className?: string }) {
  const negative = amount < 0
  return (
    <span className={cn("tabular inline-flex items-baseline whitespace-nowrap", className)}>
      <span className="sr-only">{formatCRC(amount)}</span>
      <span aria-hidden className="kk-slide inline-flex items-baseline">
        {negative && "−"}₡
        <SlidingNumber number={Math.abs(amount)} thousandSeparator={NBSP} initiallyStable />
      </span>
    </span>
  )
}

export function AnimatedCRCRange({
  min,
  max,
  className,
  live = false,
}: {
  min: number
  max: number
  className?: string
  /** Anunciar cambios con aria-live (solo en el precio de referencia principal) */
  live?: boolean
}) {
  return (
    <span className={cn("tabular inline-flex items-baseline gap-x-[0.3em] whitespace-nowrap", className)}>
      <span className="sr-only" aria-live={live ? "polite" : undefined}>
        {formatCRCRange(min, max)}
      </span>
      <span aria-hidden className="kk-slide inline-flex items-baseline">
        ₡<SlidingNumber number={min} thousandSeparator={NBSP} initiallyStable />
      </span>
      {min !== max && (
        <>
          <span aria-hidden className="text-accent">–</span>
          <span aria-hidden className="kk-slide inline-flex items-baseline">
            ₡<SlidingNumber number={max} thousandSeparator={NBSP} initiallyStable />
          </span>
        </>
      )}
    </span>
  )
}
