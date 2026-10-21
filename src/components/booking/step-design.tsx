"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Controller, useFormContext } from "react-hook-form"
import { ImageUp, RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/schemas"
import { cn } from "@/lib/utils"
import { describedBy, FieldError, FieldHint } from "./field-message"
import { fieldId, type WizardInput } from "./wizard-model"

function formatBytes(n: number) {
  return n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function StepDesign() {
  const { control, register, formState, setError, clearErrors } = useFormContext<WizardInput>()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const notesId = useId()
  const imageError = formState.errors.reference_image?.message

  return (
    <div className="flex flex-col gap-8">
      <p className="rounded-md border border-accent/45 bg-muted/50 px-4 py-3 text-[0.9375rem] text-foreground">
        Para todo servicio es necesario enviar el diseño previamente.
      </p>

      <Controller
        control={control}
        name="reference_image"
        render={({ field }) => {
          const file = field.value
          const accept = (f: File | undefined) => {
            if (!f) return
            if (!(IMAGE_TYPES as readonly string[]).includes(f.type)) {
              setError("reference_image", { message: "La foto debe ser JPG, PNG o WEBP" })
              return
            }
            if (f.size > MAX_IMAGE_BYTES) {
              setError("reference_image", { message: "La foto pesa más de 5 MB. Probá con una más liviana" })
              return
            }
            clearErrors("reference_image")
            field.onChange(f)
          }
          return (
            <div className="flex flex-col gap-2">
              <span id="foto-label" className="text-[0.9375rem] font-medium">
                Foto de referencia <span className="text-muted-foreground">(obligatoria)</span>
              </span>
              <input
                ref={inputRef}
                type="file"
                accept={IMAGE_TYPES.join(",")}
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  accept(e.target.files?.[0])
                  e.target.value = ""
                }}
              />
              {file ? (
                <Preview
                  file={file}
                  onReplace={() => inputRef.current?.click()}
                  onRemove={() => field.onChange(null)}
                />
              ) : (
                // Arrastrar es una mejora: el botón "Elegir foto" es la alternativa nativa.
                // eslint-disable-next-line jsx-a11y/no-static-element-interactions
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragging(false)
                    accept(e.dataTransfer.files?.[0])
                  }}
                  className={cn(
                    "flex flex-col items-center gap-4 rounded-lg border border-dashed border-input bg-card px-6 py-10 text-center transition-colors",
                    dragging && "border-primary bg-muted",
                    imageError && "border-destructive",
                  )}
                >
                  <ImageUp aria-hidden className="size-8 text-accent" strokeWidth={1.25} />
                  <div>
                    <p className="font-display text-xl">Arrastrá tu foto aquí</p>
                    <p className="mt-1 text-sm text-muted-foreground">o elegila desde tu teléfono</p>
                  </div>
                  <Button
                    id={fieldId("reference_image")}
                    type="button"
                    variant="outline"
                    onClick={() => inputRef.current?.click()}
                    aria-describedby={describedBy("foto", { hint: true, error: !!imageError })}
                    aria-invalid={!!imageError || undefined}
                    aria-labelledby={`foto-label ${fieldId("reference_image")}-txt`}
                  >
                    <span id={`${fieldId("reference_image")}-txt`}>Elegir foto</span>
                  </Button>
                </div>
              )}
              <FieldHint id="foto">JPG, PNG o WEBP · hasta 5 MB</FieldHint>
              <FieldError id="foto" message={imageError} />
            </div>
          )
        }}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor={fieldId("notes")} className="text-[0.9375rem]">
          Notas <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          id={fieldId("notes")}
          rows={3}
          placeholder="Dónde lo querés, colores de referencia, ocasión…"
          aria-describedby={describedBy(notesId, { error: !!formState.errors.notes })}
          aria-invalid={!!formState.errors.notes || undefined}
          {...register("notes")}
        />
        <FieldError id={notesId} message={formState.errors.notes?.message} />
      </div>
    </div>
  )
}

function Preview({ file, onReplace, onRemove }: { file: File; onReplace: () => void; onRemove: () => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(url), [url])

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-accent/45 bg-card p-3 sm:flex-row sm:items-center">
      <div className="aspect-square w-full overflow-hidden rounded-md bg-muted sm:w-36">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:)
          <img src={url} alt="Vista previa de tu diseño" className="size-full object-cover" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 px-1 pb-1">
        <div className="min-w-0">
          <p className="truncate font-medium">{file.name}</p>
          <p className="text-sm text-muted-foreground">{formatBytes(file.size)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onReplace}>
            <RefreshCw strokeWidth={1.5} />
            Cambiar foto
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 strokeWidth={1.5} />
            Quitar
          </Button>
        </div>
      </div>
    </div>
  )
}
