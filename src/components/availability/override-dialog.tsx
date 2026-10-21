"use client"

import { useEffect, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { sileo } from "sileo"
import type { AvailabilityOverride, Location } from "@/types/database"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ActionButton, type ActionState } from "@/components/shared/action-button"
import { FieldError } from "@/components/booking/field-message"
import { saveOverride } from "@/lib/data/actions"
import { overrideSchema, type OverrideInput } from "@/lib/schemas"
import { toISODateCR } from "@/lib/format"
import { LocationRadios } from "./shared"

export function OverrideDialog({
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
  initial: Partial<AvailabilityOverride> | null
}) {
  const editing = !!initial?.id
  const [state, setState] = useState<ActionState>("idle")
  const form = useForm<OverrideInput>({ resolver: zodResolver(overrideSchema), defaultValues: blank() })
  const isDayOff = useWatch({ control: form.control, name: "is_day_off" })

  function blank(): OverrideInput {
    return {
      id: initial?.id,
      artist_id: artistId,
      date: initial?.date ?? toISODateCR(new Date()),
      is_day_off: initial?.is_day_off ?? true,
      location_id: initial?.location_id ?? locations[0]?.id ?? null,
      start_time: initial?.start_time ?? "09:00",
      end_time: initial?.end_time ?? "13:00",
      note: initial?.note ?? "",
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

  async function onSubmit(values: OverrideInput) {
    setState("loading")
    const res = await saveOverride({ ...values, note: values.note || null })
    if (!res.ok) {
      setState("idle")
      sileo.error({ title: "No se guardó la excepción", description: res.message })
      return
    }
    setState("success")
    sileo.success({ title: editing ? "Excepción actualizada" : "Excepción agregada" })
    setTimeout(() => onOpenChange(false), 500)
  }

  const e = form.formState.errors
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-medium">
              {editing ? "Editar excepción" : "Nueva excepción"}
            </DialogTitle>
            <DialogDescription>Reemplaza el horario semanal solo en esa fecha.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="exc-fecha">Fecha</Label>
            <Input
              id="exc-fecha"
              type="date"
              {...form.register("date")}
              aria-invalid={!!e.date || undefined}
              aria-describedby={e.date ? "exc-fecha-error" : undefined}
            />
            <FieldError id="exc-fecha" message={e.date?.message} />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Tipo</legend>
            <Controller
              control={form.control}
              name="is_day_off"
              render={({ field }) => (
                <RadioGroup
                  value={field.value ? "libre" : "especial"}
                  onValueChange={(v) => field.onChange(v === "libre")}
                  className="grid grid-cols-2 gap-2"
                >
                  {[
                    { v: "libre", label: "Día libre" },
                    { v: "especial", label: "Horario especial" },
                  ].map((o) => (
                    <label
                      key={o.v}
                      className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border border-input bg-card px-3 text-[0.9375rem] has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-muted/60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
                    >
                      <RadioGroupItem value={o.v} />
                      {o.label}
                    </label>
                  ))}
                </RadioGroup>
              )}
            />
          </fieldset>

          {!isDayOff && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="exc-inicio">Desde</Label>
                  <Input id="exc-inicio" type="time" step={900} {...form.register("start_time")} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="exc-fin">Hasta</Label>
                  <Input
                    id="exc-fin"
                    type="time"
                    step={900}
                    {...form.register("end_time")}
                    aria-invalid={!!e.end_time || undefined}
                    aria-describedby={e.end_time ? "exc-fin-error" : undefined}
                  />
                </div>
                <FieldError id="exc-fin" message={e.end_time?.message} className="col-span-2" />
              </div>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">Lugar</legend>
                <Controller
                  control={form.control}
                  name="location_id"
                  render={({ field }) => (
                    <LocationRadios
                      name="exc-lugar"
                      locations={locations}
                      value={field.value}
                      onChange={field.onChange}
                      describedBy={e.location_id ? "exc-lugar-error" : undefined}
                    />
                  )}
                />
                <FieldError id="exc-lugar" message={e.location_id?.message} />
              </fieldset>
            </>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="exc-nota">
              Nota <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input id="exc-nota" placeholder="Feria, vacaciones, evento…" {...form.register("note")} />
          </div>

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
