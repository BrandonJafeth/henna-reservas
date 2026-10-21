"use client"

import { useEffect, useMemo } from "react"
import { useWatch } from "react-hook-form"
import { BrandLabel } from "@/components/brand/brand-label"
import { Ornament } from "@/components/brand/ornament"
import { AnimatedCRCRange } from "@/components/shared/animated-money"
import { byId } from "@/lib/domain"
import { capitalize, formatCR, formatDuration, formatDurationRange, formatTimeCR, formatWhatsApp } from "@/lib/format"
import type { BookingCatalog, StepId, WizardInput } from "./wizard-model"

export function useSummary(catalog: BookingCatalog) {
  const v = useWatch<WizardInput>() as WizardInput
  const size = catalog.sizes.find((s) => s.id === v.size_option_id)
  const location = byId(catalog.locations)[v.location_id]
  const artist = catalog.artists.find((a) => a.id === v.artist_id)
  return { v, size, location, artist }
}

export function StepSummary({ catalog, onEdit }: { catalog: BookingCatalog; onEdit: (step: StepId) => void }) {
  const { v, size, location, artist } = useSummary(catalog)
  const file = v.reference_image instanceof File ? v.reference_image : null
  const url = useMemo(() => (file ? URL.createObjectURL(file) : undefined), [file])
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])

  const rows: { label: string; value: React.ReactNode; step: StepId }[] = [
    { label: "Tamaño", value: size?.label ?? "—", step: "tamano" },
    {
      label: "Tiempo",
      value: size
        ? `Aplicación ${formatDuration(size.duration_minutes)} + secado ${formatDurationRange(catalog.settings.drying_minutes_min, catalog.settings.drying_minutes_max)}`
        : "—",
      step: "tamano",
    },
    { label: "Lugar", value: location?.name ?? "—", step: "lugar" },
    { label: "Artista", value: artist?.full_name ?? "—", step: "lugar" },
    {
      label: "Fecha y hora",
      value: v.starts_at ? `${capitalize(formatCR(v.starts_at, "EEEE d 'de' MMMM"))}, ${formatTimeCR(v.starts_at)}` : "—",
      step: "fecha",
    },
    { label: "Nombre", value: `${v.first_name} ${v.last_name}`.trim() || "—", step: "datos" },
    { label: "WhatsApp", value: v.whatsapp ? formatWhatsApp(v.whatsapp) : "—", step: "datos" },
    ...(v.email ? [{ label: "Correo", value: v.email, step: "datos" as const }] : []),
    ...(v.allergies ? [{ label: "Piel", value: v.allergies, step: "datos" as const }] : []),
  ]

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col items-center gap-3 rounded-lg border border-accent/45 bg-card px-5 py-7 text-center">
        <BrandLabel as="span">Precio de referencia</BrandLabel>
        {size && (
          <AnimatedCRCRange
            min={size.price_min}
            max={size.price_max}
            className="justify-center font-display text-[2.5rem] leading-none font-medium"
          />
        )}
        <p className="max-w-xs text-sm text-muted-foreground">
          El precio final depende del detalle del diseño. Lo confirmamos por WhatsApp.
        </p>
      </div>

      <div className="flex items-start gap-4">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:)
          <img src={url} alt="Tu diseño de referencia" className="size-20 shrink-0 rounded-md border border-accent/45 object-cover" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="font-medium">Diseño enviado</p>
          <p className="line-clamp-2 text-sm text-muted-foreground">{v.notes || "Sin notas adicionales."}</p>
          <button type="button" onClick={() => onEdit("diseno")} className="w-fit text-sm text-primary underline underline-offset-4 hover:no-underline">
            Cambiar diseño
          </button>
        </div>
      </div>

      <Ornament width="full" />

      <dl className="divide-y divide-border">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[7rem_minmax(0,1fr)_auto] items-baseline gap-3 py-3">
            <dt className="text-sm text-muted-foreground">{r.label}</dt>
            <dd className="min-w-0 break-words">{r.value}</dd>
            <dd>
              <button
                type="button"
                onClick={() => onEdit(r.step)}
                className="min-h-6 text-sm text-primary underline underline-offset-4 hover:no-underline"
              >
                Cambiar<span className="sr-only"> {r.label.toLowerCase()}</span>
              </button>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
