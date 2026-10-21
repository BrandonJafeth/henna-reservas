"use client"

import { Controller, useFormContext, useWatch } from "react-hook-form"
import { MapPin } from "lucide-react"
import type { Location, Profile, UUID } from "@/types/database"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { EmptyState } from "@/components/brand/states"
import { initials } from "@/lib/domain"
import { cn } from "@/lib/utils"
import { FieldError } from "./field-message"
import { fieldId, type WizardInput } from "./wizard-model"

const cardBase =
  "group relative flex cursor-pointer items-center gap-4 rounded-lg border border-input bg-card p-4 transition-colors hover:border-primary has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-muted/60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"

export function StepPlace({
  locations,
  artists,
  artistsByLocation,
}: {
  locations: Location[]
  artists: Pick<Profile, "id" | "full_name">[]
  artistsByLocation: Record<UUID, UUID[]>
}) {
  const { control, formState, setValue } = useFormContext<WizardInput>()
  const locationId = useWatch<WizardInput, "location_id">({ name: "location_id" })
  const available = artists.filter((a) => artistsByLocation[locationId]?.includes(a.id))

  if (locations.length === 0) {
    return (
      <EmptyState
        illustration="branch"
        title="No hay lugares abiertos ahora"
        description="Pronto abriremos nuevas fechas. Escribinos por WhatsApp para avisarte."
      />
    )
  }

  return (
    <div className="flex flex-col gap-9">
      <Controller
        control={control}
        name="location_id"
        render={({ field }) => (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-[0.9375rem] font-medium">¿Dónde querés tu cita?</legend>
            <RadioGroup
              value={field.value}
              onValueChange={(v) => {
                field.onChange(v)
                const next = artists.filter((a) => artistsByLocation[v]?.includes(a.id))
                // Si solo hay una artista en ese lugar, se elige sola.
                setValue("artist_id", next.length === 1 ? next[0]!.id : "", { shouldValidate: false })
                setValue("date", "")
                setValue("starts_at", "")
              }}
              aria-invalid={!!formState.errors.location_id || undefined}
              aria-describedby={formState.errors.location_id ? "lugar-error" : undefined}
              className="grid gap-3 sm:grid-cols-2"
            >
              {locations.map((l, i) => (
                <label key={l.id} className={cardBase}>
                  <RadioGroupItem value={l.id} id={i === 0 ? fieldId("location_id") : undefined} />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-display text-2xl leading-tight">{l.name}</span>
                    {l.address && (
                      <span className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin aria-hidden className="size-3.5 shrink-0" strokeWidth={1.5} />
                        <span className="truncate">{l.address}</span>
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </RadioGroup>
            <FieldError id="lugar" message={formState.errors.location_id?.message} />
          </fieldset>
        )}
      />

      {locationId && (
        <Controller
          control={control}
          name="artist_id"
          render={({ field }) => (
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-[0.9375rem] font-medium">Artista disponible</legend>
              {available.length === 0 ? (
                <EmptyState
                  className="rounded-lg border border-dashed border-input py-8"
                  illustration="calendar"
                  title="Sin artistas por ahora"
                  description="En este lugar no hay horarios abiertos. Probá con el otro lugar."
                />
              ) : (
                <RadioGroup
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v)
                    setValue("date", "")
                    setValue("starts_at", "")
                  }}
                  aria-invalid={!!formState.errors.artist_id || undefined}
                  aria-describedby={formState.errors.artist_id ? "artista-error" : undefined}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  {available.map((a, i) => (
                    <label key={a.id} className={cardBase}>
                      <RadioGroupItem value={a.id} id={i === 0 ? fieldId("artist_id") : undefined} className="sr-only" />
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-11 shrink-0 items-center justify-center rounded-full border border-accent/60 font-display text-lg text-primary transition-colors",
                          "group-has-[[data-state=checked]]:border-foreground/60 group-has-[[data-state=checked]]:bg-button group-has-[[data-state=checked]]:text-button-foreground",
                        )}
                      >
                        {initials(a.full_name)}
                      </span>
                      <span className="text-[1.0625rem]">{a.full_name}</span>
                    </label>
                  ))}
                </RadioGroup>
              )}
              <FieldError id="artista" message={formState.errors.artist_id?.message} />
            </fieldset>
          )}
        />
      )}
    </div>
  )
}
