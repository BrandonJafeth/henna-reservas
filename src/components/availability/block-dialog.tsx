"use client"

import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { sileo } from "sileo"
import type { Location, WeeklyAvailability } from "@/types/database"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ActionButton, type ActionState } from "@/components/shared/action-button"
import { FieldError } from "@/components/booking/field-message"
import { saveWeeklyBlock } from "@/lib/data/actions"
import { WEEKDAYS } from "@/lib/domain"
import { weeklyBlockSchema, type WeeklyBlockInput } from "@/lib/schemas"
import { LocationRadios } from "./shared"

export function BlockDialog({
  open,
  onOpenChange,
  artistId,
  locations,
  initial,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  artistId: string
  locations: Location[]
  /** Bloque a editar, o datos parciales para crear (p. ej. el día). */
  initial: Partial<WeeklyAvailability> | null
}) {
  const editing = !!initial?.id
  const [state, setState] = useState<ActionState>("idle")
  const form = useForm<WeeklyBlockInput>({
    resolver: zodResolver(weeklyBlockSchema),
    defaultValues: blank(),
  })

  function blank(): WeeklyBlockInput {
    return {
      id: initial?.id,
      artist_id: initial?.artist_id ?? artistId,
      weekday: initial?.weekday ?? 1,
      start_time: initial?.start_time ?? "09:00",
      end_time: initial?.end_time ?? "13:00",
      location_id: initial?.location_id ?? locations[0]?.id ?? "",
    }
  }

  // Reiniciar al abrir: el estado del botón se ajusta en render, el formulario en efecto.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setState("idle")
  }
  useEffect(() => {
    if (open) form.reset(blank())
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reiniciar solo al abrir
  }, [open])

  async function onSubmit(values: WeeklyBlockInput) {
    setState("loading")
    const res = await saveWeeklyBlock(values)
    if (!res.ok) {
      setState("idle")
      sileo.error({ title: "No se guardó el bloque", description: res.message })
      return
    }
    setState("success")
    sileo.success({ title: editing ? "Bloque actualizado" : "Bloque agregado" })
    setTimeout(() => onOpenChange(false), 500)
  }

  const e = form.formState.errors
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-medium">
              {editing ? "Editar bloque" : "Nuevo bloque de horario"}
            </DialogTitle>
            <DialogDescription>Se repite todas las semanas en ese día.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="bloque-dia">Día</Label>
            <Controller
              control={form.control}
              name="weekday"
              render={({ field }) => (
                <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                  <SelectTrigger id="bloque-dia" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="bloque-inicio">Desde</Label>
              <Input id="bloque-inicio" type="time" step={900} {...form.register("start_time")} aria-invalid={!!e.start_time || undefined} />
              <FieldError id="bloque-inicio" message={e.start_time?.message} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bloque-fin">Hasta</Label>
              <Input
                id="bloque-fin"
                type="time"
                step={900}
                {...form.register("end_time")}
                aria-invalid={!!e.end_time || undefined}
                aria-describedby={e.end_time ? "bloque-fin-error" : undefined}
              />
              <FieldError id="bloque-fin" message={e.end_time?.message} />
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Lugar</legend>
            <Controller
              control={form.control}
              name="location_id"
              render={({ field }) => (
                <LocationRadios
                  name="bloque-lugar"
                  locations={locations}
                  value={field.value}
                  onChange={field.onChange}
                  describedBy={e.location_id ? "bloque-lugar-error" : undefined}
                />
              )}
            />
            <FieldError id="bloque-lugar" message={e.location_id?.message} />
          </fieldset>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </DialogClose>
            <ActionButton type="submit" state={state} successLabel="Guardado" className="min-w-32">
              Guardar
            </ActionButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
