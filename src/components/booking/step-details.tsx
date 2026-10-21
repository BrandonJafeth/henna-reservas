"use client"

import { Controller, useFormContext } from "react-hook-form"
import { ShieldCheck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { Settings } from "@/types/database"
import { formatDurationRange } from "@/lib/format"
import { cn } from "@/lib/utils"
import { describedBy, FieldError, FieldHint } from "./field-message"
import { fieldId, type WizardField, type WizardInput } from "./wizard-model"

function TextField({
  name,
  label,
  optional,
  hint,
  className,
  ...input
}: {
  name: Extract<WizardField, "first_name" | "last_name" | "email">
  label: string
  optional?: boolean
  hint?: string
  className?: string
} & React.ComponentProps<typeof Input>) {
  const { register, formState } = useFormContext<WizardInput>()
  const id = fieldId(name)
  const error = formState.errors[name]?.message
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id} className="text-[0.9375rem]">
        {label} {optional && <span className="font-normal text-muted-foreground">(opcional)</span>}
      </Label>
      <Input
        id={id}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy(id, { hint: !!hint, error: !!error })}
        {...input}
        {...register(name)}
      />
      {hint && <FieldHint id={id}>{hint}</FieldHint>}
      <FieldError id={id} message={error} />
    </div>
  )
}

export function StepDetails({ settings }: { settings: Settings }) {
  const drying = formatDurationRange(settings.drying_minutes_min, settings.drying_minutes_max)
  const { register, control, formState } = useFormContext<WizardInput>()
  const waId = fieldId("whatsapp")
  const waError = formState.errors.whatsapp?.message
  const allergyId = fieldId("allergies")

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField name="first_name" label="Nombre" autoComplete="given-name" />
        <TextField name="last_name" label="Apellido" autoComplete="family-name" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={waId} className="text-[0.9375rem]">
          WhatsApp
        </Label>
        <div
          className={cn(
            "flex h-11 items-stretch overflow-hidden rounded-lg border border-input bg-card focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30",
            waError && "border-destructive",
          )}
        >
          <span aria-hidden className="flex items-center border-r border-border bg-muted/60 px-3 text-base text-muted-foreground">
            +506
          </span>
          <input
            id={waId}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="8888 8888"
            aria-invalid={!!waError || undefined}
            aria-describedby={describedBy(waId, { hint: true, error: !!waError })}
            className="tabular min-w-0 flex-1 bg-transparent px-3.5 text-base outline-none placeholder:text-muted-foreground"
            {...register("whatsapp")}
          />
        </div>
        <FieldHint id={waId}>Número de Costa Rica (+506). Por aquí te confirmamos la cita.</FieldHint>
        <FieldError id={waId} message={waError} />
      </div>

      <TextField
        name="email"
        label="Correo"
        optional
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="nombre@correo.com"
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor={allergyId} className="text-[0.9375rem]">
          Alergias o sensibilidad en la piel <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          id={allergyId}
          rows={2}
          placeholder="Por ejemplo: piel sensible, alergia a algún aceite…"
          aria-invalid={!!formState.errors.allergies || undefined}
          aria-describedby={describedBy(allergyId, { error: !!formState.errors.allergies })}
          {...register("allergies")}
        />
        <FieldError id={allergyId} message={formState.errors.allergies?.message} />
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-6">
        <Consent
          name="skin_care_consent"
          control={control}
          label="Acepto los cuidados de la piel con jagua"
          linkLabel="Leer cuidados"
          title="Cuidados con tinta de jagua"
          description="Lo que conviene saber antes y después de tu cita."
          body={
            <ul className="list-disc space-y-2 pl-5">
              <li>La jagua es un tinte natural del fruto del guaitil. No es tinta permanente.</li>
              <li>Después de aplicarlo, el gel necesita {drying} para secar. Planificá tu día para no mojarlo ni rozarlo.</li>
              <li>El diseño se ve claro al inicio y oscurece en las primeras 24–48 h.</li>
              <li>Dura de 1 a 2 semanas, según tu piel y la zona.</li>
              <li>Evitá el agua y las cremas en la zona durante las primeras horas.</li>
              <li>Si tenés alergias o piel sensible, avisanos antes de la cita.</li>
            </ul>
          }
        />
        <Consent
          name="privacy_consent"
          control={control}
          label="Acepto el aviso de privacidad (Ley 8968)"
          linkLabel="Leer aviso"
          title="Aviso de privacidad"
          description="Protección de la persona frente al tratamiento de sus datos personales, Ley N.º 8968."
          body={
            <div className="space-y-3">
              <p>
                Usamos tu nombre, WhatsApp, correo y la foto de tu diseño solo para coordinar y atender tu cita.
                No compartimos tus datos con terceros.
              </p>
              <p>
                Podés pedirnos ver, corregir o eliminar tus datos en cualquier momento escribiéndonos por WhatsApp.
              </p>
            </div>
          }
        />
      </div>

      <div
        data-turnstile-slot
        role="group"
        aria-label="Verificación de seguridad"
        className="flex min-h-[65px] items-center gap-3 rounded-md border border-dashed border-input px-4 text-sm text-muted-foreground"
      >
        <ShieldCheck aria-hidden className="size-5 text-accent" strokeWidth={1.5} />
        Aquí aparecerá la verificación de seguridad.
      </div>
    </div>
  )
}

function Consent({
  name,
  control,
  label,
  linkLabel,
  title,
  description,
  body,
}: {
  name: "skin_care_consent" | "privacy_consent"
  control: ReturnType<typeof useFormContext<WizardInput>>["control"]
  label: string
  linkLabel: string
  title: string
  description: string
  body: React.ReactNode
}) {
  const id = fieldId(name)
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start gap-3">
            <Checkbox
              id={id}
              checked={field.value}
              onCheckedChange={(v) => field.onChange(v === true)}
              onBlur={field.onBlur}
              aria-invalid={!!fieldState.error || undefined}
              aria-describedby={describedBy(id, { error: !!fieldState.error })}
              className="mt-0.5"
            />
            <div className="flex flex-wrap items-baseline gap-x-2">
              <Label htmlFor={id} className="text-[0.9375rem] leading-snug font-normal">
                {label}
              </Label>
              <Dialog>
                <DialogTrigger className="text-sm text-primary underline underline-offset-4 hover:no-underline">
                  {linkLabel}
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-medium">{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                  </DialogHeader>
                  <div className="text-[0.9375rem] leading-relaxed">{body}</div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <FieldError id={id} message={fieldState.error?.message} className="pl-8" />
        </div>
      )}
    />
  )
}
