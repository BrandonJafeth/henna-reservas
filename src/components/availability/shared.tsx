"use client"

import type { Location, UUID } from "@/types/database"
import { placeTone } from "@/lib/domain"
import { cn } from "@/lib/utils"

/** Clases de tono por lugar (fondo + tinta). Se asignan por orden, nunca por nombre. */
export const PLACE_CLASSES = {
  1: "bg-place-1 text-place-1-ink border-place-1-ink/25",
  2: "bg-place-2 text-place-2-ink border-place-2-ink/25",
  3: "bg-place-3 text-place-3-ink border-place-3-ink/25",
} as const

export function placeClass(locations: Location[], id: UUID | null | undefined) {
  return PLACE_CLASSES[placeTone(locations, id)]
}

export function PlaceLegend({ locations, className }: { locations: Location[]; className?: string }) {
  return (
    <ul aria-label="Leyenda de lugares" className={cn("flex flex-wrap items-center gap-x-5 gap-y-2 text-sm", className)}>
      {locations.map((l) => (
        <li key={l.id} className="flex items-center gap-2">
          <span aria-hidden className={cn("size-3.5 rounded-sm border", placeClass(locations, l.id))} />
          {l.name}
        </li>
      ))}
      <li className="flex items-center gap-2 text-muted-foreground">
        <span aria-hidden className="size-3.5 rounded-sm border border-dashed border-current" />
        Horario especial
      </li>
    </ul>
  )
}

/** Radio de lugar en formularios del panel. */
export function LocationRadios({
  locations,
  value,
  onChange,
  name,
  describedBy,
  firstId,
}: {
  locations: Location[]
  value: string | null | undefined
  onChange: (id: string) => void
  name: string
  describedBy?: string
  firstId?: string
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {locations.map((l, i) => {
        const on = value === l.id
        return (
          <label
            key={l.id}
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border px-3 text-[0.9375rem] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
              on ? "border-primary bg-muted/60" : "border-input bg-card hover:border-primary",
            )}
          >
            <input
              id={i === 0 ? firstId : undefined}
              type="radio"
              name={name}
              value={l.id}
              checked={on}
              onChange={() => onChange(l.id)}
              aria-describedby={describedBy}
              className="size-4 accent-primary"
            />
            <span aria-hidden className={cn("size-3 rounded-sm border", placeClass(locations, l.id))} />
            {l.name}
          </label>
        )
      })}
    </div>
  )
}
