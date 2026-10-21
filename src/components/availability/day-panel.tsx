"use client"

import { useEffect, useState } from "react"
import { CalendarCheck2, Pencil, RotateCcw, X } from "lucide-react"
import { sileo } from "sileo"
import type { AvailabilityOverride, Booking, Location, WeeklyAvailability } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BrandLabel } from "@/components/brand/brand-label"
import { CalendarLeaf } from "@/components/brand/illustrations"
import { ActionButton, type ActionState } from "@/components/shared/action-button"
import { FieldError } from "@/components/booking/field-message"
import { applyAvailability, markDaysOff, resetDays } from "@/lib/data/actions"
import { dayKind, effectiveBlocks, weekdayOf } from "@/lib/availability"
import { byId } from "@/lib/domain"
import { capitalize, formatCR, formatTimeOfDay, toISODateCR } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Occurrence } from "./occurrence-dialog"
import { LocationRadios, placeClass } from "./shared"

const WEEKDAY_PLURAL = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"]

function listJoin(items: string[]) {
  if (items.length <= 1) return items.join("")
  return `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`
}

export function DayPanel({
  artistId,
  artistName,
  locations,
  selected,
  src,
  bookings,
  prefill,
  onRemove,
  onClear,
  onEdit,
}: {
  artistId: string
  artistName: string
  locations: Location[]
  selected: string[]
  src: { weekly: WeeklyAvailability[]; overrides: AvailabilityOverride[] }
  bookings: Booking[]
  prefill: { start: string; end: string } | null
  onRemove: (date: string) => void
  onClear: () => void
  onEdit: (o: Occurrence) => void
}) {
  const [start, setStart] = useState("09:00")
  const [end, setEnd] = useState("13:00")
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "")
  const [repeat, setRepeat] = useState<"once" | "weekly">("once")
  const [error, setError] = useState<string>()
  const [state, setState] = useState<ActionState>("idle")
  const [busyOff, setBusyOff] = useState(false)
  const loc = byId(locations)

  useEffect(() => {
    if (!prefill) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- precargar la hora tocada en la vista Semana
    setStart(prefill.start)
    setEnd(prefill.end)
  }, [prefill])

  if (selected.length === 0) {
    return (
      <aside aria-labelledby="panel-titulo" className="flex flex-col items-center rounded-lg border border-dashed border-input bg-card px-6 py-10 text-center">
        <CalendarLeaf className="mb-4 h-16 w-20 text-accent" />
        <h2 id="panel-titulo" className="font-display text-2xl">
          Elegí días en el calendario
        </h2>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Tocá uno o varios días para darles horario, marcarlos como libres o ver qué tiene cada uno.
        </p>
      </aside>
    )
  }

  const weekdays = [...new Set(selected.map(weekdayOf))].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
  const repeatLabel = `Todos los ${listJoin(weekdays.map((w) => WEEKDAY_PLURAL[w]!))}`
  const single = selected.length === 1 ? selected[0]! : null
  const singleKind = single ? dayKind(single, artistId, src) : null
  const singleBlocks = single ? effectiveBlocks(single, src) : []
  const singleBookings = single ? bookings.filter((b) => toISODateCR(new Date(b.starts_at)) === single && b.status !== "cancelada") : []
  const anyChanged = selected.some((d) => ["custom", "off"].includes(dayKind(d, artistId, src)))

  async function save() {
    if (end <= start) {
      setError("La hora de fin debe ser después del inicio")
      document.getElementById("panel-fin")?.focus()
      return
    }
    setError(undefined)
    setState("loading")
    const res = await applyAvailability({ artist_id: artistId, dates: selected, start_time: start, end_time: end, location_id: locationId, repeat })
    if (!res.ok) {
      setState("idle")
      sileo.error({ title: "No se guardó el horario", description: res.message })
      return
    }
    setState("success")
    sileo.success({
      title: repeat === "weekly" ? `Horario semanal agregado` : `Horario agregado a ${selected.length} ${selected.length === 1 ? "día" : "días"}`,
      description:
        res.data.customDays > 0
          ? `${res.data.customDays} de esos días tienen un horario propio y no cambian. Usá “Volver al horario semanal” si querés que lo sigan.`
          : `${formatTimeOfDay(start)} – ${formatTimeOfDay(end)} · ${loc[locationId]?.name}`,
    })
    setTimeout(() => {
      setState("idle")
      onClear()
    }, 700)
  }

  async function dayOff() {
    setBusyOff(true)
    const res = await markDaysOff({ artist_id: artistId, dates: selected })
    setBusyOff(false)
    if (!res.ok) return sileo.error({ title: "No se pudo marcar", description: res.message })
    sileo.success({ title: res.data.count === 1 ? "Día marcado como libre" : `${res.data.count} días marcados como libres` })
    onClear()
  }

  async function reset() {
    const res = await resetDays({ artist_id: artistId, dates: selected })
    if (!res.ok) return sileo.error({ title: "No se pudo restablecer", description: res.message })
    sileo.success({ title: "Volvieron al horario semanal" })
    onClear()
  }

  return (
    <aside aria-labelledby="panel-titulo" className="flex flex-col gap-5 rounded-lg border border-accent/45 bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <BrandLabel as="p" className="text-[0.6875rem]">
            {artistName}
          </BrandLabel>
          <h2 id="panel-titulo" className="mt-1 font-display text-2xl leading-tight">
            {single ? capitalize(formatCR(single, "EEEE d 'de' MMMM")) : `${selected.length} días elegidos`}
          </h2>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClear} aria-label="Quitar la selección">
          <X strokeWidth={1.5} />
        </Button>
      </div>

      {!single && (
        <ul aria-label="Días elegidos" className="flex flex-wrap gap-1.5">
          {selected.map((d) => (
            <li key={d}>
              <button
                type="button"
                onClick={() => onRemove(d)}
                className="inline-flex min-h-8 items-center gap-1 rounded-full border border-input bg-background px-3 text-sm hover:border-foreground"
              >
                {capitalize(formatCR(d, "EEE d MMM"))}
                <X aria-hidden className="size-3.5" strokeWidth={1.5} />
                <span className="sr-only">, quitar</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {single && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {singleKind === "off" && "Día libre: no se puede reservar."}
            {singleKind === "custom" && "Este día tiene un horario propio (no sigue el semanal)."}
            {singleKind === "weekly" && "Sigue el horario semanal."}
            {singleKind === "none" && "Sin horario: nadie puede reservar este día."}
          </p>
          {singleBlocks.length > 0 && (
            <ul className="flex flex-col gap-2">
              {singleBlocks.map((b) => (
                <li key={b.source.id}>
                  <button
                    type="button"
                    onClick={() => onEdit({ block: b, date: single })}
                    className={cn(
                      "flex min-h-11 w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left",
                      placeClass(locations, b.location_id),
                      b.source.kind === "override" && "border-dashed border-current",
                    )}
                  >
                    <span className="tabular text-sm">
                      {formatTimeOfDay(b.start_time)} – {formatTimeOfDay(b.end_time)}
                      <span className="mx-1.5 opacity-60">·</span>
                      <span className="font-medium">{loc[b.location_id]?.name}</span>
                    </span>
                    <Pencil aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
                    <span className="sr-only">, editar</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {singleBookings.length > 0 && (
            <p className="flex items-center gap-2 text-sm">
              <CalendarCheck2 aria-hidden className="size-4 text-success" strokeWidth={1.5} />
              {singleBookings.length} {singleBookings.length === 1 ? "cita agendada" : "citas agendadas"}
            </p>
          )}
        </div>
      )}

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
        className="flex flex-col gap-4 border-t border-border pt-5"
      >
        <h3 className="font-sans text-[0.9375rem] font-medium tracking-normal">{single && singleBlocks.length ? "Agregar otro horario" : "Agregar horario"}</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="panel-inicio">Desde</Label>
            <Input id="panel-inicio" type="time" step={900} value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="panel-fin">Hasta</Label>
            <Input
              id="panel-fin"
              type="time"
              step={900}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              aria-invalid={!!error || undefined}
              aria-describedby={error ? "panel-fin-error" : undefined}
            />
          </div>
          <FieldError id="panel-fin" message={error} className="col-span-2" />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Lugar</legend>
          <LocationRadios name="panel-lugar" locations={locations} value={locationId} onChange={setLocationId} />
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">¿Se repite?</legend>
          {(
            [
              { v: "once", label: single ? "Solo este día" : "Solo estos días" },
              { v: "weekly", label: repeatLabel },
            ] as const
          ).map((o) => (
            <label
              key={o.v}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border px-3 text-[0.9375rem] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                repeat === o.v ? "border-foreground/60 bg-button" : "border-input bg-card hover:border-foreground/60",
              )}
            >
              <input
                type="radio"
                name="panel-repetir"
                value={o.v}
                checked={repeat === o.v}
                onChange={() => setRepeat(o.v)}
                className="size-4 accent-primary"
              />
              {o.label}
            </label>
          ))}
        </fieldset>

        <ActionButton type="submit" state={state} successLabel="Guardado" className="w-full">
          Guardar horario
        </ActionButton>
      </form>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button variant="outline" size="sm" onClick={() => void dayOff()} disabled={busyOff}>
          {single ? "Marcar como día libre" : "Marcar como días libres"}
        </Button>
        {anyChanged && (
          <Button variant="ghost" size="sm" onClick={() => void reset()}>
            <RotateCcw strokeWidth={1.5} />
            Volver al horario semanal
          </Button>
        )}
      </div>
    </aside>
  )
}
