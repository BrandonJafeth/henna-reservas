"use client"

import { useEffect, useRef } from "react"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/brand/logo"
import { Ornament } from "@/components/brand/ornament"
import { JaguaBranch } from "@/components/brand/illustrations"
import { capitalize, formatCR, formatCRCRange, formatTimeCR, formatWhatsApp } from "@/lib/format"
import { useSummary } from "./step-summary"
import type { BookingCatalog } from "./wizard-model"

export function BookingDone({ catalog, onRestart }: { catalog: BookingCatalog; onRestart: () => void }) {
  const { v, size, location, artist } = useSummary(catalog)
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => ref.current?.focus(), [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto flex min-h-dvh max-w-xl flex-col items-center px-4 py-14 text-center sm:px-6"
    >
      <Logo size="sm" />
      <JaguaBranch className="mt-10 h-24 w-32 text-accent" />
      <h1 ref={ref} tabIndex={-1} className="mt-6 font-display text-[2.5rem] leading-tight outline-none sm:text-5xl">
        Recibimos tu solicitud.
      </h1>
      <p className="mt-4 max-w-md text-lg text-muted-foreground">
        Te escribiremos por WhatsApp para confirmar tu cita
        {v.whatsapp && (
          <>
            {" "}al <span className="tabular whitespace-nowrap text-foreground">{formatWhatsApp(v.whatsapp)}</span>
          </>
        )}
        .
      </p>

      <Ornament className="my-10" />

      <dl className="w-full max-w-sm rounded-lg border border-accent/45 bg-card p-6 text-left text-[0.9375rem]">
        {[
          ["Cita", v.starts_at && `${capitalize(formatCR(v.starts_at, "EEEE d 'de' MMMM"))}, ${formatTimeCR(v.starts_at)}`],
          ["Lugar", location?.name],
          ["Artista", artist?.full_name],
          ["Tamaño", size?.label],
          ["Referencia", size && formatCRCRange(size.price_min, size.price_max)],
        ].map(([k, val]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-dashed border-border py-2.5 last:border-0">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-right">{val || "—"}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 max-w-sm text-left">
        <p className="font-display text-xl">Mientras tanto</p>
        <ul className="mt-3 space-y-2 text-[0.9375rem] text-muted-foreground">
          <li>El diseño se ve claro al inicio y oscurece en las primeras 24–48 h.</li>
          <li>Dura de 1 a 2 semanas. Evitá el agua en la zona las primeras horas.</li>
        </ul>
      </div>

      <Button variant="outline" className="mt-10" onClick={onRestart}>
        Hacer otra reserva
      </Button>
    </motion.div>
  )
}
