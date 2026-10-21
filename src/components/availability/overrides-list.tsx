"use client"

import { Pencil, Trash2 } from "lucide-react"
import type { AvailabilityOverride, Location } from "@/types/database"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/brand/states"
import { byId } from "@/lib/domain"
import { capitalize, formatCR, formatTimeOfDay, todayCR } from "@/lib/format"
import { cn } from "@/lib/utils"
import { placeClass } from "./shared"

export function OverridesList({
  overrides,
  locations,
  onEdit,
  onDelete,
  actions,
}: {
  overrides: AvailabilityOverride[]
  locations: Location[]
  onEdit: (o: AvailabilityOverride) => void
  onDelete: (o: AvailabilityOverride) => void
  actions: React.ReactNode
}) {
  const loc = byId(locations)
  const today = todayCR()
  const upcoming = overrides.filter((o) => o.date >= today)
  const past = overrides.filter((o) => o.date < today).slice(-5).reverse()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-lg text-sm text-muted-foreground">
          Días libres u horarios especiales que reemplazan el horario semanal solo en esa fecha.
        </p>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>

      {upcoming.length === 0 ? (
        <EmptyState
          illustration="calendar"
          className="rounded-lg border border-dashed border-input"
          title="Sin excepciones próximas"
          description="Todo sigue el horario semanal. Agregá un día libre o un horario especial cuando lo necesités."
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-accent/45 bg-card">
          {upcoming.map((o) => (
            <OverrideRow key={o.id} o={o} where={o.location_id ? loc[o.location_id]?.name : undefined} locations={locations} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </ul>
      )}

      {past.length > 0 && (
        <details className="group">
          <summary className="min-h-6 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            Ver excepciones pasadas ({past.length})
          </summary>
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border opacity-80">
            {past.map((o) => (
              <OverrideRow key={o.id} o={o} where={o.location_id ? loc[o.location_id]?.name : undefined} locations={locations} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function OverrideRow({
  o,
  where,
  locations,
  onEdit,
  onDelete,
}: {
  o: AvailabilityOverride
  where?: string
  locations: Location[]
  onEdit: (o: AvailabilityOverride) => void
  onDelete: (o: AvailabilityOverride) => void
}) {
  const dateLabel = capitalize(formatCR(o.date, "EEEE d 'de' MMMM"))
  return (
    <li className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5 sm:px-5">
      <div className="flex w-14 shrink-0 flex-col items-center rounded-md border border-accent/45 py-1.5 leading-none">
        <span className="text-[0.6875rem] tracking-[0.15em] text-muted-foreground uppercase">{formatCR(o.date, "MMM")}</span>
        <span className="tabular font-display text-2xl">{formatCR(o.date, "d")}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="font-medium">{dateLabel}</p>
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {o.is_day_off ? (
            <span className="inline-flex h-6 items-center rounded-sm border border-input/70 px-2 text-xs font-medium text-foreground">
              Día libre
            </span>
          ) : (
            <span
              className={cn(
                "inline-flex h-6 items-center rounded-sm border border-dashed px-2 text-xs font-medium",
                placeClass(locations, o.location_id),
              )}
            >
              Horario especial · {where}
            </span>
          )}
          {!o.is_day_off && o.start_time && o.end_time && (
            <span className="tabular">
              {formatTimeOfDay(o.start_time)} – {formatTimeOfDay(o.end_time)}
            </span>
          )}
          {o.note && <span>· {o.note}</span>}
        </p>
      </div>
      <div className="flex gap-1">
        <Button type="button" variant="ghost" size="icon" onClick={() => onEdit(o)} aria-label={`Editar excepción del ${dateLabel}`}>
          <Pencil strokeWidth={1.5} />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => onDelete(o)} aria-label={`Eliminar excepción del ${dateLabel}`}>
          <Trash2 strokeWidth={1.5} />
        </Button>
      </div>
    </li>
  )
}
