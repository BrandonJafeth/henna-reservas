"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import type { AvailabilityOverride, Booking, Location, Profile, WeeklyAvailability } from "@/types/database"
import { Button } from "@/components/ui/button"
import { effectiveBlocks, type Block } from "@/lib/availability"
import { byId, initials } from "@/lib/domain"
import { addDaysISO, capitalize, formatCR, formatTimeOfDay, mondayOf, timeOfCR, todayCR, toISODateCR } from "@/lib/format"
import { cn } from "@/lib/utils"
import { placeClass, PlaceLegend } from "./shared"

const HOUR_PX = 52

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h! * 60 + m!
}

export function WeekCalendar({
  weekly,
  overrides,
  bookings,
  locations,
  artists,
  currentArtistId,
  onEditWeekly,
  onEditOverride,
  onAddOverride,
}: {
  weekly: WeeklyAvailability[]
  overrides: AvailabilityOverride[]
  bookings: Booking[]
  locations: Location[]
  /** Si viene, se muestran todas las artistas en carriles paralelos por día. */
  artists?: Pick<Profile, "id" | "full_name">[]
  currentArtistId: string
  onEditWeekly: (w: WeeklyAvailability) => void
  onEditOverride: (o: AvailabilityOverride) => void
  onAddOverride: (date: string) => void
}) {
  const today = todayCR()
  const [weekStart, setWeekStart] = useState(() => mondayOf(today))
  const loc = byId(locations)
  const weeklyById = byId(weekly)
  const overrideById = byId(overrides)

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = addDaysISO(weekStart, i)
        const blocks = effectiveBlocks(date, { weekly, overrides })
        // La excepción del encabezado es siempre la de la artista seleccionada.
        const override = overrides.find((o) => o.date === date && o.artist_id === currentArtistId)
        const dayBookings = bookings.filter(
          (b) => toISODateCR(new Date(b.starts_at)) === date && b.status !== "cancelada",
        )
        return { date, blocks, override, bookings: dayBookings }
      }),
    [weekStart, weekly, overrides, bookings, currentArtistId],
  )

  const allBlocks = days.flatMap((d) => d.blocks)
  const startH = Math.min(8, ...allBlocks.map((b) => Math.floor(toMin(b.start_time) / 60)))
  const endH = Math.max(18, ...allBlocks.map((b) => Math.ceil(toMin(b.end_time) / 60)))
  const hours = Array.from({ length: endH - startH }, (_, i) => startH + i)

  const weekLabel = `${formatCR(weekStart, "d MMM")} – ${formatCR(addDaysISO(weekStart, 6), "d MMM yyyy")}`

  function openBlock(b: Block) {
    if (b.source.kind === "weekly") {
      const w = weeklyById[b.source.id]
      if (w) onEditWeekly(w)
    } else {
      const o = overrideById[b.source.id]
      if (o) onEditOverride(o)
    }
  }

  /** Contexto extra para lectores de pantalla; el texto visible ya nombra el bloque. */
  const lanes = artists && artists.length > 1 ? artists : null
  const artistName = (id: string) => artists?.find((a) => a.id === id)?.full_name

  function blockContext(date: string, b: Block, count: number) {
    return [
      "",
      lanes ? artistName(b.artist_id) : null,
      capitalize(formatCR(date, "EEEE d 'de' MMMM")),
      b.source.kind === "override" ? "horario especial" : "horario semanal",
      count ? `${count} ${count === 1 ? "cita" : "citas"}` : "sin citas",
      "editar",
    ]
      .filter((x) => x !== null)
      .join(", ")
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDaysISO(weekStart, -7))} aria-label="Semana anterior">
            <ChevronLeft strokeWidth={1.5} />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDaysISO(weekStart, 7))} aria-label="Semana siguiente">
            <ChevronRight strokeWidth={1.5} />
          </Button>
          <p className="ml-3 font-display text-xl capitalize" aria-live="polite">
            {weekLabel}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {weekStart !== mondayOf(today) && (
            <Button variant="ghost" size="sm" onClick={() => setWeekStart(mondayOf(today))}>
              Ir a esta semana
            </Button>
          )}
          <PlaceLegend locations={locations} className="hidden lg:flex" />
        </div>
      </div>
      <PlaceLegend locations={locations} className="lg:hidden" />

      {/* Escritorio: grilla semanal */}
      <div className="hidden overflow-hidden rounded-lg border border-accent/45 bg-card md:block">
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-border">
          <div />
          {days.map((d) => {
            const isToday = d.date === today
            const dayName = capitalize(formatCR(d.date, "EEEE d 'de' MMMM"))
            return (
              <div key={d.date} className="flex items-start justify-between gap-1 border-l border-border px-2 py-2">
                <div className="flex flex-col leading-none">
                  <span className="text-[0.6875rem] tracking-[0.15em] text-muted-foreground uppercase">
                    {formatCR(d.date, "EEE")}
                  </span>
                  <span
                    className={cn(
                      "tabular mt-1 font-display text-2xl",
                      isToday && "text-primary underline decoration-accent underline-offset-4",
                    )}
                  >
                    {formatCR(d.date, "d")}
                    {isToday && <span className="sr-only"> (hoy)</span>}
                  </span>
                  {d.override?.is_day_off && <span className="mt-1.5 text-[0.6875rem] text-muted-foreground">Día libre</span>}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => (d.override ? onEditOverride(d.override) : onAddOverride(d.date))}
                  aria-label={d.override ? `Editar excepción del ${dayName}` : `Agregar excepción el ${dayName}`}
                  className="-mr-1 text-muted-foreground"
                >
                  <Plus strokeWidth={1.5} />
                </Button>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
          <div aria-hidden className="relative" style={{ height: hours.length * HOUR_PX }}>
            {hours.map((h, i) => (
              <span key={h} className="tabular absolute right-2 -translate-y-1/2 text-[0.6875rem] text-muted-foreground" style={{ top: i * HOUR_PX }}>
                {i === 0 ? "" : `${h % 12 || 12} ${h < 12 ? "am" : "pm"}`}
              </span>
            ))}
          </div>
          {days.map((d) => (
            <ul
              key={d.date}
              aria-label={capitalize(formatCR(d.date, "EEEE d 'de' MMMM"))}
              className={cn(
                "relative border-l border-border",
                d.override?.is_day_off && "bg-[repeating-linear-gradient(135deg,var(--muted)_0_6px,transparent_6px_12px)]",
              )}
              style={{
                height: hours.length * HOUR_PX,
                backgroundImage: d.override?.is_day_off
                  ? undefined
                  : `repeating-linear-gradient(to bottom, transparent 0 ${HOUR_PX - 1}px, var(--border) ${HOUR_PX - 1}px ${HOUR_PX}px)`,
              }}
            >
              {d.blocks.map((b) => {
                const top = ((toMin(b.start_time) - startH * 60) / 60) * HOUR_PX
                const height = ((toMin(b.end_time) - toMin(b.start_time)) / 60) * HOUR_PX
                const inBlock = d.bookings.filter((bk) => {
                  const t = timeOfCR(bk.starts_at)
                  return bk.artist_id === b.artist_id && bk.location_id === b.location_id && t >= b.start_time && t < b.end_time
                })
                // Carriles solo en los días donde coinciden varias artistas.
                const dayArtists = lanes ? lanes.filter((a) => d.blocks.some((x) => x.artist_id === a.id)) : []
                const lane = dayArtists.length > 1 ? Math.max(0, dayArtists.findIndex((a) => a.id === b.artist_id)) : 0
                const laneW = dayArtists.length > 1 ? 100 / dayArtists.length : 100
                return (
                  <li
                    key={`${b.source.id}-${b.start_time}`}
                    className="absolute"
                    style={{ top: top + 2, height: height - 4, left: `calc(${lane * laneW}% + 4px)`, width: `calc(${laneW}% - 8px)` }}
                  >
                    <button
                      type="button"
                      onClick={() => openBlock(b)}
                      className={cn(
                        "flex size-full flex-col items-start gap-0.5 overflow-hidden rounded-md border px-2 py-1.5 text-left transition-[filter] hover:brightness-[0.97]",
                        placeClass(locations, b.location_id),
                        b.source.kind === "override" && "border-dashed border-current",
                      )}
                    >
                      <span className="text-[0.8125rem] font-medium leading-tight">
                        {lanes && <span className="mr-1">{initials(artistName(b.artist_id) ?? "")}</span>}
                        {loc[b.location_id]?.name}
                      </span>
                      <span className="tabular text-[0.75rem] leading-tight">
                        {b.start_time}–{b.end_time}
                      </span>
                      <span className="sr-only">{blockContext(d.date, b, inBlock.length)}</span>
                      {inBlock.length > 0 && height > 70 && (
                        <span className="mt-auto flex flex-wrap gap-1">
                          {inBlock.map((bk) => (
                            <span key={bk.id} className="tabular rounded-sm bg-card/70 px-1 text-[0.6875rem] text-foreground">
                              {timeOfCR(bk.starts_at)}
                            </span>
                          ))}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          ))}
        </div>
      </div>

      {/* Celular: agenda */}
      <ol className="flex flex-col gap-3 md:hidden">
        {days.map((d) => {
          const isToday = d.date === today
          const dayName = capitalize(formatCR(d.date, "EEEE d 'de' MMMM"))
          return (
            <li key={d.date} className="rounded-lg border border-accent/45 bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className={cn("font-display text-xl", isToday && "text-primary")}>
                  {dayName}
                  {isToday && <span className="ml-2 font-sans text-xs tracking-[0.15em] uppercase">Hoy</span>}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => (d.override ? onEditOverride(d.override) : onAddOverride(d.date))}
                  aria-label={d.override ? `Editar excepción del ${dayName}` : `Agregar excepción el ${dayName}`}
                >
                  <Plus strokeWidth={1.5} />
                </Button>
              </div>
              {d.blocks.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">{d.override?.is_day_off ? "Día libre" : "Sin horario"}</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {d.blocks.map((b) => {
                    const count = d.bookings.filter((bk) => bk.artist_id === b.artist_id && bk.location_id === b.location_id).length
                    return (
                      <li key={`${b.source.id}-${b.start_time}`}>
                        <button
                          type="button"
                          onClick={() => openBlock(b)}
                          className={cn(
                            "flex min-h-11 w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left",
                            placeClass(locations, b.location_id),
                            b.source.kind === "override" && "border-dashed border-current",
                          )}
                        >
                          <span className="tabular text-sm">
                            {formatTimeOfDay(b.start_time)} – {formatTimeOfDay(b.end_time)}
                          </span>
                          <span className="text-sm font-medium">
                            {loc[b.location_id]?.name}
                            {lanes && ` · ${artistName(b.artist_id)?.split(" ")[0]}`}
                          </span>
                          <span className="sr-only">{blockContext(d.date, b, count)}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
