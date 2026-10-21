"use client"

import { BrandLabel } from "@/components/brand/brand-label"
import { Logo } from "@/components/brand/logo"
import { Ornament } from "@/components/brand/ornament"
import { AnimatedCRCRange } from "@/components/shared/animated-money"
import { capitalize, formatCR, formatTimeCR } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useSummary } from "./step-summary"
import type { BookingCatalog } from "./wizard-model"

/**
 * Columna de marca. En celular es un encabezado compacto; en escritorio
 * queda fija a la izquierda y va armando el resumen de la reserva.
 */
export function BookingAside({ catalog }: { catalog: BookingCatalog }) {
  const { v, size, location, artist } = useSummary(catalog)
  const rows = [
    { label: "Diseño", value: v.reference_image ? "Foto lista" : null },
    { label: "Tamaño", value: size?.label ?? null },
    { label: "Lugar", value: location?.name ?? null },
    { label: "Artista", value: artist?.full_name ?? null },
    {
      label: "Cita",
      value: v.starts_at ? `${capitalize(formatCR(v.starts_at, "EEE d MMM"))} · ${formatTimeCR(v.starts_at)}` : null,
    },
  ]

  return (
    <header className="flex flex-col items-center pt-8 pb-6 text-center lg:sticky lg:top-0 lg:h-dvh lg:justify-center lg:py-16">
      <Logo size="sm" className="lg:hidden" />
      <Logo size="lg" className="hidden lg:inline-flex" />
      <Ornament width="sm" className="mt-5 lg:mt-8" />
      <h1 className="mt-5 font-display text-[2.5rem] leading-[1.05] lg:mt-8 lg:text-[3.75rem]">Reservá tu cita</h1>
      <p className="mt-3 max-w-sm text-[1.0625rem] text-muted-foreground lg:text-lg">
        Arte en la piel con tinta de jagua, diseñado y aplicado a mano.
      </p>
      <ul className="mt-4 hidden flex-col items-center gap-1.5 text-[0.9375rem] lg:flex">
        <li className="flex items-center gap-2.5">
          <span aria-hidden className="size-1 rounded-full bg-accent" />
          Dura de 1 a 2 semanas
        </li>
        <li className="flex items-center gap-2.5">
          <span aria-hidden className="size-1 rounded-full bg-accent" />
          Oscurece en las primeras 24–48 h
        </li>
      </ul>

      <section
        aria-label="Tu reserva hasta ahora"
        className="mt-10 hidden w-full max-w-sm rounded-lg border border-accent/45 bg-card p-6 lg:block"
      >
        <BrandLabel as="h2" className="text-center">
          Tu reserva
        </BrandLabel>
        <Ornament width="full" className="mt-4 mb-2" />
        <dl className="text-[0.9375rem]">
          {rows.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between gap-4 border-b border-dashed border-border py-2.5 last:border-0">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className={cn("text-right", !r.value && "text-muted-foreground")}>{r.value ?? "—"}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-accent/45 pt-4">
          <span className="text-sm text-muted-foreground">Referencia</span>
          {size ? (
            <AnimatedCRCRange min={size.price_min} max={size.price_max} className="font-display text-2xl font-medium" />
          ) : (
            <span className="font-display text-2xl text-muted-foreground">—</span>
          )}
        </div>
      </section>
    </header>
  )
}
