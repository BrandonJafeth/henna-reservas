"use client"

import { Pencil, Plus, Trash2 } from "lucide-react"
import type { Location, WeeklyAvailability } from "@/types/database"
import { Button } from "@/components/ui/button"
import { WEEKDAYS, byId } from "@/lib/domain"
import { formatDuration, formatTimeOfDay, minutesBetween } from "@/lib/format"
import { cn } from "@/lib/utils"
import { placeClass } from "./shared"

export function WeeklySchedule({
  weekly,
  locations,
  onAdd,
  onEdit,
  onDelete,
}: {
  weekly: WeeklyAvailability[]
  locations: Location[]
  onAdd: (weekday: WeeklyAvailability["weekday"]) => void
  onEdit: (block: WeeklyAvailability) => void
  onDelete: (block: WeeklyAvailability) => void
}) {
  const loc = byId(locations)
  return (
    <ul className="divide-y divide-border rounded-lg border border-accent/45 bg-card">
      {WEEKDAYS.map((day) => {
        const blocks = weekly.filter((w) => w.weekday === day.value)
        const total = blocks.reduce((s, b) => s + minutesBetween(b.start_time, b.end_time), 0)
        return (
          <li key={day.value} className="grid gap-3 px-4 py-4 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:px-5">
            <div className="flex items-baseline justify-between gap-3 sm:flex-col sm:items-start sm:gap-0">
              <h3 className="font-display text-xl leading-tight">{day.label}</h3>
              <p className="text-xs text-muted-foreground">{blocks.length ? formatDuration(total) : "Libre"}</p>
            </div>

            {blocks.length ? (
              <ul className="flex flex-wrap gap-2" aria-label={`Bloques del ${day.label.toLowerCase()}`}>
                {blocks.map((b) => {
                  const where = loc[b.location_id]?.name ?? "Lugar"
                  const range = `${formatTimeOfDay(b.start_time)} – ${formatTimeOfDay(b.end_time)}`
                  return (
                    <li
                      key={b.id}
                      className={cn("flex items-center gap-1 rounded-md border py-1 pr-1 pl-3", placeClass(locations, b.location_id))}
                    >
                      <span className="tabular text-sm">
                        {range}
                        <span className="mx-1.5 opacity-60" aria-hidden>·</span>
                        <span className="font-medium">{where}</span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-current hover:bg-foreground/5"
                        onClick={() => onEdit(b)}
                        aria-label={`Editar bloque del ${day.label.toLowerCase()}, ${range}, ${where}`}
                      >
                        <Pencil strokeWidth={1.5} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-current hover:bg-foreground/5"
                        onClick={() => onDelete(b)}
                        aria-label={`Eliminar bloque del ${day.label.toLowerCase()}, ${range}, ${where}`}
                      >
                        <Trash2 strokeWidth={1.5} />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Sin bloques. Nadie reserva este día.</p>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAdd(day.value)}
              className="justify-self-start sm:justify-self-end"
              aria-label={`Agregar bloque el ${day.label.toLowerCase()}`}
            >
              <Plus strokeWidth={1.5} />
              Agregar
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
