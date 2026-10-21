"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { sileo } from "sileo"
import type { Location } from "@/types/database"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ActionButton, type ActionState } from "@/components/shared/action-button"
import { FieldError } from "@/components/booking/field-message"
import { deleteOccurrence, updateOccurrence } from "@/lib/data/actions"
import { weekdayOf, type Block } from "@/lib/availability"
import { capitalize, formatCR } from "@/lib/format"
import { cn } from "@/lib/utils"
import { LocationRadios } from "./shared"

export interface Occurrence {
  block: Block
  date: string
}

const WEEKDAY_PLURAL = ["domingos", "lunes", "martes", "miércoles", "jueves", "viernes", "sábados"]

/** Editar o quitar un horario de un día, con alcance "solo este día" o "todas las semanas". */
export function OccurrenceDialog({
  occurrence,
  artistName,
  locations,
  onClose,
}: {
  occurrence: Occurrence | null
  artistName: string
  locations: Location[]
  onClose: () => void
}) {
  return (
    <Dialog open={!!occurrence} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {occurrence && (
          <OccurrenceForm
            key={`${occurrence.block.source.id}-${occurrence.date}`}
            occurrence={occurrence}
            artistName={artistName}
            locations={locations}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function OccurrenceForm({
  occurrence,
  artistName,
  locations,
  onClose,
}: {
  occurrence: Occurrence
  artistName: string
  locations: Location[]
  onClose: () => void
}) {
  const { block, date } = occurrence
  const recurring = block.source.kind === "weekly"
  const [start, setStart] = useState(block.start_time)
  const [end, setEnd] = useState(block.end_time)
  const [locationId, setLocationId] = useState(block.location_id)
  const [scope, setScope] = useState<"day" | "weekly">(recurring ? "weekly" : "day")
  const [error, setError] = useState<string>()
  const [state, setState] = useState<ActionState>("idle")
  const [deleting, setDeleting] = useState(false)
  const dayLabel = capitalize(formatCR(date, "EEEE d 'de' MMMM"))
  const ref = { artist_id: block.artist_id, date, source: block.source, scope }

  async function save() {
    if (end <= start) {
      setError("La hora de fin debe ser después del inicio")
      return
    }
    setError(undefined)
    setState("loading")
    const res = await updateOccurrence({ ...ref, start_time: start, end_time: end, location_id: locationId })
    if (!res.ok) {
      setState("idle")
      sileo.error({ title: "No se guardó", description: res.message })
      return
    }
    setState("success")
    sileo.success({ title: scope === "weekly" ? "Horario semanal actualizado" : `Horario del ${dayLabel.toLowerCase()} actualizado` })
    setTimeout(onClose, 500)
  }

  async function remove() {
    setDeleting(true)
    const res = await deleteOccurrence(ref)
    setDeleting(false)
    if (!res.ok) return sileo.error({ title: "No se pudo quitar", description: res.message })
    sileo.success({ title: scope === "weekly" ? "Horario semanal quitado" : `Horario quitado del ${dayLabel.toLowerCase()}` })
    onClose()
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
      className="flex flex-col gap-5"
    >
      <DialogHeader>
        <DialogTitle className="font-display text-2xl font-medium">Editar horario</DialogTitle>
        <DialogDescription>
          {artistName} · {dayLabel}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="occ-inicio">Desde</Label>
          <Input id="occ-inicio" type="time" step={900} value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="occ-fin">Hasta</Label>
          <Input
            id="occ-fin"
            type="time"
            step={900}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? "occ-fin-error" : undefined}
          />
        </div>
        <FieldError id="occ-fin" message={error} className="col-span-2" />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Lugar</legend>
        <LocationRadios name="occ-lugar" locations={locations} value={locationId} onChange={setLocationId} />
      </fieldset>

      {recurring && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Aplicar a</legend>
          {(
            [
              { v: "day", label: `Solo el ${dayLabel.toLowerCase()}` },
              { v: "weekly", label: `Todos los ${WEEKDAY_PLURAL[weekdayOf(date)]}` },
            ] as const
          ).map((o) => (
            <label
              key={o.v}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border px-3 text-[0.9375rem] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                scope === o.v ? "border-foreground/60 bg-button" : "border-input bg-card hover:border-foreground/60",
              )}
            >
              <input
                type="radio"
                name="occ-alcance"
                value={o.v}
                checked={scope === o.v}
                onChange={() => setScope(o.v)}
                className="size-4 accent-primary"
              />
              {o.label}
            </label>
          ))}
        </fieldset>
      )}

      <DialogFooter className="gap-2 sm:justify-between">
        <Button type="button" variant="destructive" onClick={() => void remove()} disabled={deleting}>
          <Trash2 strokeWidth={1.5} />
          Quitar horario
        </Button>
        <ActionButton type="submit" state={state} successLabel="Guardado" className="min-w-32">
          Guardar
        </ActionButton>
      </DialogFooter>
    </form>
  )
}
