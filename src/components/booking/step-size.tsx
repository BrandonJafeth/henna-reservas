"use client"

import { Slider as SliderPrimitive } from "radix-ui"
import { Controller, useFormContext } from "react-hook-form"
import { Clock } from "lucide-react"
import type { SizeOption } from "@/types/database"
import { BrandLabel } from "@/components/brand/brand-label"
import { EmptyState } from "@/components/brand/states"
import { AnimatedCRCRange } from "@/components/shared/animated-money"
import { measuredSizes, namedSizes, sizeTick, sizeValueText } from "@/lib/domain"
import { formatDuration } from "@/lib/format"
import { cn } from "@/lib/utils"
import { FieldError } from "./field-message"
import { fieldId, type WizardInput } from "./wizard-model"

export function StepSize({ sizes }: { sizes: SizeOption[] }) {
  const { control, formState } = useFormContext<WizardInput>()
  const measured = measuredSizes(sizes)
  const named = namedSizes(sizes)
  const error = formState.errors.size_option_id?.message

  if (sizes.length === 0) {
    return (
      <EmptyState
        illustration="hand"
        title="Todavía no hay tamaños disponibles"
        description="Estamos actualizando la lista de precios. Escribinos por WhatsApp y te ayudamos."
      />
    )
  }

  return (
    <Controller
      control={control}
      name="size_option_id"
      render={({ field }) => {
        const selected = sizes.find((s) => s.id === field.value)
        const measuredIndex = measured.findIndex((s) => s.id === field.value)
        const sliderActive = measuredIndex >= 0
        const sliderIndex = sliderActive ? measuredIndex : 0

        return (
          <div className="flex flex-col gap-8">
            {/* Precio de referencia */}
            <div className="flex flex-col items-center gap-2 rounded-lg border border-accent/45 bg-card px-5 py-7 text-center">
              <BrandLabel as="span">Precio de referencia</BrandLabel>
              {selected ? (
                <AnimatedCRCRange
                  live
                  min={selected.price_min}
                  max={selected.price_max}
                  className="justify-center font-display text-[2.5rem] leading-none font-medium sm:text-5xl"
                />
              ) : (
                <span className="font-display text-[2.5rem] leading-none text-muted-foreground sm:text-5xl">₡ —</span>
              )}
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-live="polite">
                <Clock aria-hidden className="size-4" strokeWidth={1.5} />
                {selected
                  ? `${selected.label} · duración estimada ${formatDuration(selected.duration_minutes)}`
                  : "Elegí un tamaño para ver el precio"}
              </p>
            </div>

            {measured.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-baseline justify-between gap-4">
                  <span id="slider-label" className="text-[0.9375rem] font-medium">
                    Medida aproximada
                  </span>
                  <span className={cn("text-sm", sliderActive ? "text-foreground" : "text-muted-foreground")}>
                    {sliderActive ? measured[sliderIndex]!.label : "Mové el control"}
                  </span>
                </div>
                <SliderPrimitive.Root
                  min={0}
                  max={Math.max(measured.length - 1, 0)}
                  step={1}
                  value={[sliderIndex]}
                  onValueChange={([i]) => field.onChange(measured[i!]!.id)}
                  className="relative flex h-11 w-full touch-none items-center select-none"
                  data-inactive={!sliderActive || undefined}
                >
                  <SliderPrimitive.Track className="relative h-1.5 grow rounded-full bg-border">
                    <SliderPrimitive.Range
                      className={cn("absolute h-full rounded-full", sliderActive ? "bg-primary" : "bg-transparent")}
                    />
                  </SliderPrimitive.Track>
                  <SliderPrimitive.Thumb
                    id={fieldId("size_option_id")}
                    aria-labelledby="slider-label"
                    aria-valuetext={sliderActive ? sizeValueText(measured[sliderIndex]!) : "Sin elegir"}
                    aria-invalid={!!error || undefined}
                    aria-describedby={error ? "tamano-error" : undefined}
                    onKeyDown={(e) => {
                      // Sin tamaño elegido, la primera tecla activa el primer (o último) rango.
                      if (sliderActive) return
                      const keys = ["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown", "Home", "End", "PageUp", "PageDown"]
                      if (!keys.includes(e.key)) return
                      e.preventDefault()
                      field.onChange(measured[e.key === "End" ? measured.length - 1 : 0]!.id)
                    }}
                    onPointerDown={() => {
                      if (!sliderActive) field.onChange(measured[sliderIndex]!.id)
                    }}
                    className={cn(
                      "relative block size-7 rounded-full border-2 bg-card transition-[box-shadow,border-color] duration-200",
                      "after:absolute after:-inset-2 after:content-['']",
                      "hover:ring-4 hover:ring-ring/15 focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      sliderActive ? "border-primary" : "border-input",
                    )}
                  />
                </SliderPrimitive.Root>
                <ol aria-hidden className="grid text-center text-xs text-muted-foreground" style={{ gridTemplateColumns: `repeat(${measured.length}, minmax(0, 1fr))` }}>
                  {measured.map((s, i) => (
                    <li
                      key={s.id}
                      className={cn(
                        "px-0.5 leading-tight first:text-left last:text-right",
                        sliderActive && i === sliderIndex && "font-medium text-foreground",
                      )}
                    >
                      {sizeTick(s)}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {named.length > 0 && (
              <div className="flex flex-col gap-3">
                {measured.length > 0 && (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />o también
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Otras opciones">
                  {named.map((s) => {
                    const on = field.value === s.id
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => field.onChange(on ? "" : s.id)}
                        className={cn(
                          "inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-[0.9375rem] transition-colors",
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-card hover:border-primary hover:text-primary",
                        )}
                      >
                        {s.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <p className="text-center text-sm text-muted-foreground">
              Precio de referencia. El precio final depende del detalle del diseño.
            </p>
            <FieldError id="tamano" message={error} className="justify-center" />
          </div>
        )
      }}
    />
  )
}
