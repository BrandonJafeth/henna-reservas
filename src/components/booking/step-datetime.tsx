"use client"

import { useCallback, useEffect, useState } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { es } from "react-day-picker/locale"
import { format } from "date-fns"
import { es as esDateFns } from "date-fns/locale"
import type { AvailableSlot, SizeOption } from "@/types/database"
import { fetchAvailableDays, fetchAvailableSlots } from "@/lib/data/actions"
import { Calendar } from "@/components/ui/calendar"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, ErrorState } from "@/components/brand/states"
import { formatCR, formatTimeCR, parseISODateCR, TIME_ZONE, toISODateCR } from "@/lib/format"
import { cn } from "@/lib/utils"
import { FieldError } from "./field-message"
import { fieldId, type WizardInput } from "./wizard-model"

type Load<T> = { status: "idle" | "loading" } | { status: "error" } | { status: "ready"; data: T }

export function StepDateTime({ sizes, refreshKey }: { sizes: SizeOption[]; refreshKey: number }) {
  const { setValue, formState, clearErrors } = useFormContext<WizardInput>()
  const [locationId, artistId, sizeId, date, startsAt] = useWatch<WizardInput, ["location_id", "artist_id", "size_option_id", "date", "starts_at"]>({
    name: ["location_id", "artist_id", "size_option_id", "date", "starts_at"],
  })
  const duration = sizes.find((s) => s.id === sizeId)?.duration_minutes ?? 30

  const [days, setDays] = useState<Load<Set<string>>>({ status: "idle" })
  const [slots, setSlots] = useState<Load<AvailableSlot[]>>({ status: "idle" })

  const loadDays = useCallback(async () => {
    setDays({ status: "loading" })
    try {
      const res = await fetchAvailableDays({ location_id: locationId, artist_id: artistId || null, duration_minutes: duration })
      if (!res.ok) throw new Error(res.message)
      setDays({ status: "ready", data: new Set(res.data.filter((d) => d.has_slots).map((d) => d.date)) })
    } catch {
      setDays({ status: "error" })
    }
  }, [locationId, artistId, duration])

  const loadSlots = useCallback(async () => {
    if (!date) return
    setSlots({ status: "loading" })
    try {
      const res = await fetchAvailableSlots({ date, location_id: locationId, artist_id: artistId || null, duration_minutes: duration })
      if (!res.ok) throw new Error(res.message)
      setSlots({ status: "ready", data: res.data })
    } catch {
      setSlots({ status: "error" })
    }
  }, [date, locationId, artistId, duration])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial al entrar al paso
    void loadDays()
  }, [loadDays, refreshKey])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recarga al cambiar de día
    void loadSlots()
  }, [loadSlots, refreshKey])

  const available = days.status === "ready" ? days.data : null
  const today = new Date()
  const lastDay = available && available.size ? [...available].sort().at(-1)! : null
  const selectedDate = date ? parseISODateCR(date) : undefined

  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start lg:gap-10">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-[0.9375rem] font-medium">Elegí un día</legend>
        {days.status === "error" ? (
          <ErrorState title="No pudimos ver los días libres" onRetry={loadDays} />
        ) : days.status !== "ready" ? (
          <div aria-busy className="flex flex-col gap-2" aria-label="Cargando días disponibles">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-72 w-full max-w-80" />
          </div>
        ) : available!.size === 0 ? (
          <EmptyState
            illustration="calendar"
            className="rounded-lg border border-dashed border-input"
            title="No quedan espacios"
            description="Por ahora no hay horarios en este lugar. Probá con otra artista u otro lugar."
          />
        ) : (
          <div
            id={fieldId("date")}
            tabIndex={-1}
            className="w-fit rounded-lg border border-accent/45 bg-card p-3 outline-none"
            aria-describedby={formState.errors.date ? "dia-error" : "dia-hint"}
          >
            <Calendar
              mode="single"
              locale={es}
              timeZone={TIME_ZONE}
              weekStartsOn={1}
              selected={selectedDate}
              defaultMonth={selectedDate ?? today}
              startMonth={today}
              endMonth={lastDay ? parseISODateCR(lastDay) : today}
              disabled={(d) => !available!.has(toISODateCR(d))}
              onSelect={(d) => {
                setValue("date", d ? toISODateCR(d) : "")
                setValue("starts_at", "")
                clearErrors("date")
              }}
              labels={{
                labelDayButton: (d, m) =>
                  [
                    format(d, "EEEE d 'de' MMMM", { locale: esDateFns }),
                    m.today && "hoy",
                    m.disabled ? "sin disponibilidad" : "disponible",
                    m.selected && "seleccionado",
                  ]
                    .filter(Boolean)
                    .join(", "),
              }}
              showOutsideDays={false}
              classNames={{
                caption_label: "font-display text-xl font-medium capitalize select-none",
                disabled: "text-muted-foreground opacity-60 [&_button]:line-through [&_button]:decoration-accent",
              }}
            />
            <p id="dia-hint" className="mt-2 px-1 text-xs text-muted-foreground">
              Los días tachados no tienen espacios libres.
            </p>
          </div>
        )}
        <FieldError id="dia" message={formState.errors.date?.message} />
      </fieldset>

      <fieldset className="flex min-w-0 flex-col gap-3" aria-describedby={formState.errors.starts_at ? "hora-error" : undefined}>
        <legend className="mb-3 text-[0.9375rem] font-medium">
          {date ? `Horas libres el ${formatCR(date, "EEEE d 'de' MMMM")}` : "Horas libres"}
        </legend>
        {!date ? (
          <p className="rounded-lg border border-dashed border-input px-4 py-6 text-center text-sm text-muted-foreground">
            Primero elegí un día en el calendario.
          </p>
        ) : slots.status === "error" ? (
          <ErrorState title="No pudimos ver las horas" onRetry={loadSlots} />
        ) : slots.status !== "ready" ? (
          <div aria-busy aria-label="Cargando horas" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : slots.data.length === 0 ? (
          <EmptyState
            illustration="calendar"
            className="rounded-lg border border-dashed border-input py-8"
            title="Ese día se llenó"
            description="Elegí otro día del calendario."
          />
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.data.map((s, i) => {
              const on = startsAt === s.starts_at
              return (
                <button
                  key={s.starts_at + s.artist_id}
                  id={i === 0 ? fieldId("starts_at") : undefined}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setValue("starts_at", s.starts_at)
                    if (!artistId) setValue("artist_id", s.artist_id)
                    clearErrors("starts_at")
                  }}
                  className={cn(
                    "tabular h-11 rounded-md border text-[0.9375rem] transition-colors",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-card hover:border-primary hover:text-primary",
                  )}
                >
                  {formatTimeCR(s.starts_at)}
                </button>
              )
            })}
          </div>
        )}
        <FieldError id="hora" message={formState.errors.starts_at?.message} />
      </fieldset>
    </div>
  )
}
